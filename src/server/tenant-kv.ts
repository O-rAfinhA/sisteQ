import type { PoolClient } from 'pg'
import fs from 'fs/promises'
import path from 'path'
import { isPostgresConfigured, withPgClient, withPgTransaction } from '@/server/pg'

function log(event: string, fields: Record<string, unknown> = {}) {
  if (process.env.SISTEQ_DB_LOGS !== '1') return
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      scope: 'tenant_kv',
      event,
      ...fields,
    }),
  )
}

type FileKvRow = { value: any; createdAt: string; updatedAt: string; updatedBy: string }
type FileKvDb = { tenants: Record<string, Record<string, FileKvRow>> }

function kvDbFilePath() {
  const raw = typeof process.env.SISTEQ_TENANT_KV_DB_PATH === 'string' ? process.env.SISTEQ_TENANT_KV_DB_PATH.trim() : ''
  if (raw) return raw
  return path.join(process.cwd(), '.sisteq-db', 'tenant-kv.json')
}

async function ensureKvDir() {
  await fs.mkdir(path.dirname(kvDbFilePath()), { recursive: true })
}

function emptyFileDb(): FileKvDb {
  return { tenants: {} }
}

async function readFileDb(): Promise<FileKvDb> {
  await ensureKvDir()
  try {
    const raw = await fs.readFile(kvDbFilePath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<FileKvDb>
    return { tenants: parsed.tenants ?? {} }
  } catch (e: any) {
    if (e?.code === 'ENOENT') return emptyFileDb()
    throw e
  }
}

async function writeFileDb(db: FileKvDb) {
  await ensureKvDir()
  const file = kvDbFilePath()
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`
  await fs.writeFile(tmp, JSON.stringify(db), 'utf8')
  try {
    await fs.rename(tmp, file)
  } catch (e: any) {
    const code = typeof e?.code === 'string' ? e.code : ''
    if (code === 'EPERM' || code === 'EEXIST') {
      try {
        await fs.unlink(file)
      } catch {}
      await fs.rename(tmp, file)
      return
    }
    throw e
  }
}

function nowIso() {
  return new Date().toISOString()
}

function assertKey(key: unknown): asserts key is string {
  if (typeof key !== 'string') {
    const err: any = new Error('key inválida')
    err.status = 400
    throw err
  }
  const s = key.trim()
  if (!s) {
    const err: any = new Error('key inválida')
    err.status = 400
    throw err
  }
  if (s.length > 200) {
    const err: any = new Error('key muito longa')
    err.status = 400
    throw err
  }
}

function assertPayloadSize(value: unknown) {
  const maxBytes = process.env.SISTEQ_KV_MAX_BYTES ? Number(process.env.SISTEQ_KV_MAX_BYTES) : 5_000_000
  const safeMax = Number.isFinite(maxBytes) && maxBytes > 0 ? Math.min(maxBytes, 5_000_000) : 5_000_000
  const bytes = Buffer.byteLength(JSON.stringify(value ?? null), 'utf8')
  if (bytes > safeMax) {
    const err: any = new Error(`payload grande demais (${bytes} > ${safeMax} bytes)`)
    err.status = 413
    throw err
  }
}

function payloadBytes(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8')
}

function assertKeys(keys: unknown): asserts keys is string[] {
  if (!Array.isArray(keys)) {
    const err: any = new Error('keys inválidas')
    err.status = 400
    throw err
  }
  if (keys.length > 200) {
    const err: any = new Error('keys demais')
    err.status = 400
    throw err
  }
  for (const k of keys) assertKey(k)
}

let schemaReady = false
let schemaPromise: Promise<void> | null = null

async function ensureSchemaWithClient(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS sisteq_tenant_kv (
      tenant_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by TEXT NOT NULL,
      PRIMARY KEY (tenant_id, key)
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS sisteq_tenant_kv_tenant_idx ON sisteq_tenant_kv (tenant_id)`)
}

async function ensureSchema() {
  if (schemaReady) return
  if (schemaPromise) return await schemaPromise
  schemaPromise = (async () => {
    await withPgClient(async client => {
      await ensureSchemaWithClient(client)
    })
    schemaReady = true
    schemaPromise = null
  })()
  return await schemaPromise
}

export async function getTenantKvValue<T = any>(tenantId: string, key: string): Promise<T | null> {
  assertKey(key)
  if (!isPostgresConfigured()) {
    const db = await readFileDb()
    const row = db.tenants[tenantId]?.[key]
    if (!row) return null
    log('read.ok', { tenantId, key, store: 'file' })
    return row.value as T
  }
  await ensureSchema()
  return await withPgClient(async client => {
    const res = await client.query<{ value: any }>(`SELECT value FROM sisteq_tenant_kv WHERE tenant_id = $1 AND key = $2`, [
      tenantId,
      key,
    ])
    const row = res.rows[0]
    if (!row) return null
    log('read.ok', { tenantId, key, store: 'pg' })
    return row.value as T
  })
}

export async function getTenantKvValues(tenantId: string, keys: string[]): Promise<Record<string, any>> {
  assertKeys(keys)
  if (keys.length === 0) return {}
  if (!isPostgresConfigured()) {
    const db = await readFileDb()
    const tenant = db.tenants[tenantId] ?? {}
    const out: Record<string, any> = {}
    for (const k of keys) {
      const row = tenant[k]
      if (row) out[k] = row.value
    }
    log('read.batch.ok', { tenantId, keys: keys.length, found: Object.keys(out).length, store: 'file' })
    return out
  }
  await ensureSchema()
  return await withPgClient(async client => {
    const res = await client.query<{ key: string; value: any }>(
      `SELECT key, value FROM sisteq_tenant_kv WHERE tenant_id = $1 AND key = ANY($2::text[])`,
      [tenantId, keys],
    )
    const out: Record<string, any> = {}
    for (const row of res.rows) {
      if (typeof row.key === 'string' && row.key) out[row.key] = row.value
    }
    log('read.batch.ok', { tenantId, keys: keys.length, found: res.rows.length, store: 'pg' })
    return out
  })
}

export async function listTenantKvKeys(
  tenantId: string,
  opts: { prefix?: string; limit?: number } = {},
): Promise<{ keys: string[] }> {
  const prefix = typeof opts.prefix === 'string' ? opts.prefix : ''
  const rawLimit = typeof opts.limit === 'number' ? opts.limit : undefined
  const limit = rawLimit && Number.isFinite(rawLimit) ? Math.max(1, Math.min(1000, Math.floor(rawLimit))) : 200
  if (!isPostgresConfigured()) {
    const db = await readFileDb()
    const allKeys = Object.keys(db.tenants[tenantId] ?? {}).filter(k => typeof k === 'string' && k)
    const filtered = prefix.trim().length > 0 ? allKeys.filter(k => k.startsWith(prefix)) : allKeys
    filtered.sort((a, b) => a.localeCompare(b))
    const keys = filtered.slice(0, limit)
    log('list.keys.ok', { tenantId, prefix: prefix || null, limit, count: keys.length, store: 'file' })
    return { keys }
  }
  await ensureSchema()
  return await withPgClient(async client => {
    const res =
      prefix.trim().length > 0
        ? await client.query<{ key: string }>(
            `SELECT key FROM sisteq_tenant_kv WHERE tenant_id = $1 AND key LIKE $2 ORDER BY key ASC LIMIT $3`,
            [tenantId, `${prefix}%`, limit],
          )
        : await client.query<{ key: string }>(
            `SELECT key FROM sisteq_tenant_kv WHERE tenant_id = $1 ORDER BY key ASC LIMIT $2`,
            [tenantId, limit],
          )
    const keys = res.rows.map(r => r.key).filter(k => typeof k === 'string' && k)
    log('list.keys.ok', { tenantId, prefix: prefix || null, limit, count: keys.length, store: 'pg' })
    return { keys }
  })
}

export async function setTenantKvValue(tenantId: string, userId: string, key: string, value: any): Promise<{ ok: true }> {
  assertKey(key)
  assertPayloadSize(value)
  if (!isPostgresConfigured()) {
    const db = await readFileDb()
    const t = (db.tenants[tenantId] ??= {})
    const existing = t[key]
    const now = nowIso()
    t[key] = {
      value: value ?? null,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      updatedBy: userId,
    }
    await writeFileDb(db)
    log('write.ok', { tenantId, key, userId, bytes: payloadBytes(value), store: 'file' })
    return { ok: true }
  }
  await ensureSchema()
  return await withPgTransaction(async client => {
    await ensureSchemaWithClient(client)
    await client.query(
      `
        INSERT INTO sisteq_tenant_kv (tenant_id, key, value, updated_at, updated_by)
        VALUES ($1, $2, $3, now(), $4)
        ON CONFLICT (tenant_id, key) DO UPDATE
          SET value = EXCLUDED.value,
              updated_at = now(),
              updated_by = EXCLUDED.updated_by
      `,
      [tenantId, key, value ?? null, userId],
    )
    log('write.ok', { tenantId, key, userId, bytes: payloadBytes(value), store: 'pg' })
    return { ok: true }
  })
}

export async function setTenantKvValues(
  tenantId: string,
  userId: string,
  items: Array<{ key: string; value: any }>,
): Promise<{ ok: true }> {
  if (!Array.isArray(items)) {
    const err: any = new Error('items inválidos')
    err.status = 400
    throw err
  }
  if (items.length > 200) {
    const err: any = new Error('items demais')
    err.status = 400
    throw err
  }
  for (const item of items) {
    assertKey(item?.key)
    assertPayloadSize(item?.value)
  }

  if (!isPostgresConfigured()) {
    const db = await readFileDb()
    const t = (db.tenants[tenantId] ??= {})
    const now = nowIso()
    let bytes = 0
    for (const item of items) {
      const existing = t[item.key]
      t[item.key] = {
        value: item.value ?? null,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        updatedBy: userId,
      }
      bytes += payloadBytes(item.value)
    }
    await writeFileDb(db)
    log('write.batch.ok', { tenantId, items: items.length, userId, bytes, store: 'file' })
    return { ok: true }
  }
  await ensureSchema()
  return await withPgTransaction(async client => {
    await ensureSchemaWithClient(client)
    let bytes = 0
    for (const item of items) {
      await client.query(
        `
          INSERT INTO sisteq_tenant_kv (tenant_id, key, value, updated_at, updated_by)
          VALUES ($1, $2, $3, now(), $4)
          ON CONFLICT (tenant_id, key) DO UPDATE
            SET value = EXCLUDED.value,
                updated_at = now(),
                updated_by = EXCLUDED.updated_by
        `,
        [tenantId, item.key, item.value ?? null, userId],
      )
      bytes += payloadBytes(item.value)
    }
    log('write.batch.ok', { tenantId, items: items.length, userId, bytes, store: 'pg' })
    return { ok: true }
  })
}

export async function deleteTenantKvValue(tenantId: string, userId: string, key: string): Promise<{ ok: true }> {
  assertKey(key)
  if (!isPostgresConfigured()) {
    const db = await readFileDb()
    const t = db.tenants[tenantId]
    if (t && t[key]) delete t[key]
    await writeFileDb(db)
    log('delete.ok', { tenantId, key, userId, store: 'file' })
    return { ok: true }
  }
  await ensureSchema()
  return await withPgTransaction(async client => {
    await ensureSchemaWithClient(client)
    await client.query(`DELETE FROM sisteq_tenant_kv WHERE tenant_id = $1 AND key = $2`, [tenantId, key])
    log('delete.ok', { tenantId, key, userId, store: 'pg' })
    return { ok: true }
  })
}

export async function deleteTenantKvValues(tenantId: string, userId: string, keys: string[]): Promise<{ ok: true }> {
  assertKeys(keys)
  if (!isPostgresConfigured()) {
    const db = await readFileDb()
    const t = db.tenants[tenantId]
    if (t) {
      for (const k of keys) {
        if (t[k]) delete t[k]
      }
    }
    await writeFileDb(db)
    log('delete.batch.ok', { tenantId, keys: keys.length, userId, store: 'file' })
    return { ok: true }
  }
  await ensureSchema()
  return await withPgTransaction(async client => {
    await ensureSchemaWithClient(client)
    if (keys.length > 0) {
      await client.query(`DELETE FROM sisteq_tenant_kv WHERE tenant_id = $1 AND key = ANY($2::text[])`, [tenantId, keys])
    }
    log('delete.batch.ok', { tenantId, keys: keys.length, userId, store: 'pg' })
    return { ok: true }
  })
}
