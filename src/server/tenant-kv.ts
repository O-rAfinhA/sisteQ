import type { PoolClient } from 'pg'
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
  const maxBytes = process.env.SISTEQ_KV_MAX_BYTES ? Number(process.env.SISTEQ_KV_MAX_BYTES) : 1_500_000
  const safeMax = Number.isFinite(maxBytes) && maxBytes > 0 ? Math.min(maxBytes, 5_000_000) : 1_500_000
  const bytes = Buffer.byteLength(JSON.stringify(value ?? null), 'utf8')
  if (bytes > safeMax) {
    const err: any = new Error('payload grande demais')
    err.status = 413
    throw err
  }
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
  if (!isPostgresConfigured()) return null
  assertKey(key)
  await ensureSchema()
  return await withPgClient(async client => {
    const res = await client.query<{ value: any }>(`SELECT value FROM sisteq_tenant_kv WHERE tenant_id = $1 AND key = $2`, [
      tenantId,
      key,
    ])
    const row = res.rows[0]
    if (!row) return null
    log('read.ok', { tenantId, key })
    return row.value as T
  })
}

export async function getTenantKvValues(tenantId: string, keys: string[]): Promise<Record<string, any>> {
  if (!isPostgresConfigured()) return {}
  assertKeys(keys)
  if (keys.length === 0) return {}
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
    log('read.batch.ok', { tenantId, keys: keys.length, found: res.rows.length })
    return out
  })
}

export async function listTenantKvKeys(
  tenantId: string,
  opts: { prefix?: string; limit?: number } = {},
): Promise<{ keys: string[] }> {
  if (!isPostgresConfigured()) return { keys: [] }
  await ensureSchema()
  const prefix = typeof opts.prefix === 'string' ? opts.prefix : ''
  const rawLimit = typeof opts.limit === 'number' ? opts.limit : undefined
  const limit = rawLimit && Number.isFinite(rawLimit) ? Math.max(1, Math.min(1000, Math.floor(rawLimit))) : 200
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
    log('list.keys.ok', { tenantId, prefix: prefix || null, limit, count: keys.length })
    return { keys }
  })
}

export async function setTenantKvValue(tenantId: string, userId: string, key: string, value: any): Promise<{ ok: true }> {
  if (!isPostgresConfigured()) {
    const err: any = new Error('PostgreSQL não configurado')
    err.status = 501
    throw err
  }
  assertKey(key)
  assertPayloadSize(value)
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
    log('write.ok', { tenantId, key })
    return { ok: true }
  })
}

export async function setTenantKvValues(
  tenantId: string,
  userId: string,
  items: Array<{ key: string; value: any }>,
): Promise<{ ok: true }> {
  if (!isPostgresConfigured()) {
    const err: any = new Error('PostgreSQL não configurado')
    err.status = 501
    throw err
  }
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

  await ensureSchema()
  return await withPgTransaction(async client => {
    await ensureSchemaWithClient(client)
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
    }
    log('write.batch.ok', { tenantId, items: items.length })
    return { ok: true }
  })
}

export async function deleteTenantKvValue(tenantId: string, userId: string, key: string): Promise<{ ok: true }> {
  if (!isPostgresConfigured()) {
    const err: any = new Error('PostgreSQL não configurado')
    err.status = 501
    throw err
  }
  assertKey(key)
  await ensureSchema()
  return await withPgTransaction(async client => {
    await ensureSchemaWithClient(client)
    await client.query(`DELETE FROM sisteq_tenant_kv WHERE tenant_id = $1 AND key = $2`, [tenantId, key])
    log('delete.ok', { tenantId, key, userId })
    return { ok: true }
  })
}

export async function deleteTenantKvValues(tenantId: string, userId: string, keys: string[]): Promise<{ ok: true }> {
  if (!isPostgresConfigured()) {
    const err: any = new Error('PostgreSQL não configurado')
    err.status = 501
    throw err
  }
  assertKeys(keys)
  await ensureSchema()
  return await withPgTransaction(async client => {
    await ensureSchemaWithClient(client)
    if (keys.length > 0) {
      await client.query(`DELETE FROM sisteq_tenant_kv WHERE tenant_id = $1 AND key = ANY($2::text[])`, [tenantId, keys])
    }
    log('delete.batch.ok', { tenantId, keys: keys.length, userId })
    return { ok: true }
  })
}
