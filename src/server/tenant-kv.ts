import fs from 'fs/promises'
import path from 'path'
import { Prisma } from '@prisma/client'
import { isDatabaseConfigured, prisma } from '@/server/prisma'

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

function fileFallbackAllowed() {
  if (process.env.SISTEQ_ALLOW_FILE_FALLBACK === '1') return true
  return process.env.NODE_ENV !== 'production'
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

export async function getTenantKvValue<T = any>(tenantId: string, key: string): Promise<T | null> {
  assertKey(key)
  if (!isDatabaseConfigured()) {
    if (!fileFallbackAllowed()) {
      const err: any = new Error('PostgreSQL não configurado (DATABASE_URL)')
      err.status = 501
      throw err
    }
    const db = await readFileDb()
    const row = db.tenants[tenantId]?.[key]
    if (!row) return null
    log('read.ok', { tenantId, key, store: 'file' })
    return row.value as T
  }
  const row = await prisma.sisteqTenantKv.findUnique({
    where: { tenantId_key: { tenantId, key } },
    select: { value: true },
  })
  if (!row) return null
  log('read.ok', { tenantId, key, store: 'prisma' })
  return row.value as T
}

export async function getTenantKvValues(tenantId: string, keys: string[]): Promise<Record<string, any>> {
  assertKeys(keys)
  if (keys.length === 0) return {}
  if (!isDatabaseConfigured()) {
    if (!fileFallbackAllowed()) {
      const err: any = new Error('PostgreSQL não configurado (DATABASE_URL)')
      err.status = 501
      throw err
    }
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
  const rows = await prisma.sisteqTenantKv.findMany({
    where: { tenantId, key: { in: keys } },
    select: { key: true, value: true },
  })
  const out: Record<string, any> = {}
  for (const row of rows) out[row.key] = row.value
  log('read.batch.ok', { tenantId, keys: keys.length, found: rows.length, store: 'prisma' })
  return out
}

export async function listTenantKvKeys(
  tenantId: string,
  opts: { prefix?: string; limit?: number } = {},
): Promise<{ keys: string[] }> {
  const prefix = typeof opts.prefix === 'string' ? opts.prefix : ''
  const rawLimit = typeof opts.limit === 'number' ? opts.limit : undefined
  const limit = rawLimit && Number.isFinite(rawLimit) ? Math.max(1, Math.min(1000, Math.floor(rawLimit))) : 200
  if (!isDatabaseConfigured()) {
    if (!fileFallbackAllowed()) {
      const err: any = new Error('PostgreSQL não configurado (DATABASE_URL)')
      err.status = 501
      throw err
    }
    const db = await readFileDb()
    const allKeys = Object.keys(db.tenants[tenantId] ?? {}).filter(k => typeof k === 'string' && k)
    const filtered = prefix.trim().length > 0 ? allKeys.filter(k => k.startsWith(prefix)) : allKeys
    filtered.sort((a, b) => a.localeCompare(b))
    const keys = filtered.slice(0, limit)
    log('list.keys.ok', { tenantId, prefix: prefix || null, limit, count: keys.length, store: 'file' })
    return { keys }
  }
  const rows = await prisma.sisteqTenantKv.findMany({
    where: { tenantId, ...(prefix.trim().length > 0 ? { key: { startsWith: prefix } } : {}) },
    select: { key: true },
    orderBy: { key: 'asc' },
    take: limit,
  })
  const keys = rows.map(r => r.key)
  log('list.keys.ok', { tenantId, prefix: prefix || null, limit, count: keys.length, store: 'prisma' })
  return { keys }
}

export async function setTenantKvValue(tenantId: string, userId: string, key: string, value: any): Promise<{ ok: true }> {
  assertKey(key)
  assertPayloadSize(value)
  if (!isDatabaseConfigured()) {
    if (!fileFallbackAllowed()) {
      const err: any = new Error('PostgreSQL não configurado (DATABASE_URL)')
      err.status = 501
      throw err
    }
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
  await prisma.sisteqTenantKv.upsert({
    where: { tenantId_key: { tenantId, key } },
    create: {
      tenantId,
      key,
      value: (value ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      updatedBy: userId,
    },
    update: {
      value: (value ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      updatedAt: new Date(),
      updatedBy: userId,
    },
  })
  log('write.ok', { tenantId, key, userId, bytes: payloadBytes(value), store: 'prisma' })
  return { ok: true }
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

  if (!isDatabaseConfigured()) {
    if (!fileFallbackAllowed()) {
      const err: any = new Error('PostgreSQL não configurado (DATABASE_URL)')
      err.status = 501
      throw err
    }
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
  let bytes = 0
  await prisma.$transaction(
    items.map(item => {
      bytes += payloadBytes(item.value)
      return prisma.sisteqTenantKv.upsert({
        where: { tenantId_key: { tenantId, key: item.key } },
        create: {
          tenantId,
          key: item.key,
          value: (item.value ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          updatedBy: userId,
        },
        update: {
          value: (item.value ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          updatedAt: new Date(),
          updatedBy: userId,
        },
      })
    }),
  )
  log('write.batch.ok', { tenantId, items: items.length, userId, bytes, store: 'prisma' })
  return { ok: true }
}

export async function deleteTenantKvValue(tenantId: string, userId: string, key: string): Promise<{ ok: true }> {
  assertKey(key)
  if (!isDatabaseConfigured()) {
    if (!fileFallbackAllowed()) {
      const err: any = new Error('PostgreSQL não configurado (DATABASE_URL)')
      err.status = 501
      throw err
    }
    const db = await readFileDb()
    const t = db.tenants[tenantId]
    if (t && t[key]) delete t[key]
    await writeFileDb(db)
    log('delete.ok', { tenantId, key, userId, store: 'file' })
    return { ok: true }
  }
  await prisma.sisteqTenantKv.deleteMany({ where: { tenantId, key } })
  log('delete.ok', { tenantId, key, userId, store: 'prisma' })
  return { ok: true }
}

export async function deleteTenantKvValues(tenantId: string, userId: string, keys: string[]): Promise<{ ok: true }> {
  assertKeys(keys)
  if (!isDatabaseConfigured()) {
    if (!fileFallbackAllowed()) {
      const err: any = new Error('PostgreSQL não configurado (DATABASE_URL)')
      err.status = 501
      throw err
    }
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
  if (keys.length > 0) {
    await prisma.sisteqTenantKv.deleteMany({ where: { tenantId, key: { in: keys } } })
  }
  log('delete.batch.ok', { tenantId, keys: keys.length, userId, store: 'prisma' })
  return { ok: true }
}
