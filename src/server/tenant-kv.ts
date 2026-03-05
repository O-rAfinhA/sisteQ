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

function isTransientDbFailure(e: any) {
  const code = typeof e?.code === 'string' ? e.code : typeof e?.errorCode === 'string' ? e.errorCode : ''
  const msg = String(e?.message || '')
  if (code === 'P1000' || code === 'P1001' || code === 'P1002' || code === 'P1003' || code === 'P1017') return true
  if (code === 'P2021') return true
  if (/can't reach database server/i.test(msg)) return true
  if (/connection terminated due to connection timeout/i.test(msg)) return true
  if (/the table .* does not exist/i.test(msg)) return true
  if (/(ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET)/i.test(msg)) return true
  return false
}

async function prismaOrFile<T>(
  tenantId: string,
  op: string,
  prismaFn: () => Promise<T>,
  fileFn: () => Promise<T>,
  meta: Record<string, unknown> = {},
): Promise<T> {
  if (!isDatabaseConfigured()) {
    if (!fileFallbackAllowed()) {
      const err: any = new Error('PostgreSQL não configurado (DATABASE_URL)')
      err.status = 501
      throw err
    }
    return await fileFn()
  }

  try {
    return await prismaFn()
  } catch (e: any) {
    if (!fileFallbackAllowed() || !isTransientDbFailure(e)) throw e
    log('db.fallback', { tenantId, op, reason: 'db_unavailable', error: String(e?.message || e), ...meta })
    return await fileFn()
  }
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

function stripBomAndTrailingNuls(raw: string) {
  let s = raw
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)
  s = s.replace(/\u0000+$/g, '')
  return s
}

function firstJsonValueSubstring(raw: string) {
  const s = raw.trimStart()
  let i = 0
  let inString = false
  let escaping = false
  let depth = 0
  let started = false
  for (; i < s.length; i++) {
    const ch = s[i]!
    if (!started) {
      if (ch === '{' || ch === '[') {
        started = true
        depth = 1
        continue
      }
      if (ch === '"' || (ch >= '0' && ch <= '9') || ch === '-' || ch === 't' || ch === 'f' || ch === 'n') {
        started = true
        depth = 0
      } else {
        continue
      }
    }

    if (inString) {
      if (escaping) {
        escaping = false
        continue
      }
      if (ch === '\\') {
        escaping = true
        continue
      }
      if (ch === '"') {
        inString = false
        if (depth === 0) return s.slice(0, i + 1)
      }
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }

    if (ch === '{' || ch === '[') depth++
    else if (ch === '}' || ch === ']') {
      depth--
      if (depth === 0) return s.slice(0, i + 1)
    } else if (depth === 0 && (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t')) {
      return s.slice(0, i)
    }
  }
  return null
}

async function readFileDb(): Promise<FileKvDb> {
  await ensureKvDir()
  try {
    const raw = stripBomAndTrailingNuls(await fs.readFile(kvDbFilePath(), 'utf8'))
    try {
      const parsed = JSON.parse(raw) as Partial<FileKvDb>
      return { tenants: parsed.tenants ?? {} }
    } catch (e: any) {
      const maybeFirst = firstJsonValueSubstring(raw)
      if (!maybeFirst) throw e
      const parsed = JSON.parse(maybeFirst) as Partial<FileKvDb>
      const remainder = raw.slice(maybeFirst.length).replace(/\u0000/g, '').trim()
      if (remainder.length > 0) {
        const file = kvDbFilePath()
        const backup = `${file}.corrupt.${process.pid}.${Date.now()}.bak`
        await fs.copyFile(file, backup).catch(() => null)
        await writeFileDb({ tenants: parsed.tenants ?? {} })
      }
      return { tenants: parsed.tenants ?? {} }
    }
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
  return await prismaOrFile(
    tenantId,
    'get',
    async () => {
      const row = await prisma.sisteqTenantKv.findUnique({
        where: { tenantId_key: { tenantId, key } },
        select: { value: true },
      })
      if (!row) return null
      log('read.ok', { tenantId, key, store: 'prisma' })
      return row.value as T
    },
    async () => {
      const db = await readFileDb()
      const row = db.tenants[tenantId]?.[key]
      if (!row) return null
      log('read.ok', { tenantId, key, store: 'file' })
      return row.value as T
    },
    { key },
  )
}

export async function getTenantKvValues(tenantId: string, keys: string[]): Promise<Record<string, any>> {
  assertKeys(keys)
  if (keys.length === 0) return {}
  return await prismaOrFile(
    tenantId,
    'get_many',
    async () => {
      const rows = await prisma.sisteqTenantKv.findMany({
        where: { tenantId, key: { in: keys } },
        select: { key: true, value: true },
      })
      const out: Record<string, any> = {}
      for (const row of rows) out[row.key] = row.value
      log('read.batch.ok', { tenantId, keys: keys.length, found: rows.length, store: 'prisma' })
      return out
    },
    async () => {
      const db = await readFileDb()
      const tenant = db.tenants[tenantId] ?? {}
      const out: Record<string, any> = {}
      for (const k of keys) {
        const row = tenant[k]
        if (row) out[k] = row.value
      }
      log('read.batch.ok', { tenantId, keys: keys.length, found: Object.keys(out).length, store: 'file' })
      return out
    },
    { keys: keys.length },
  )
}

export async function listTenantKvKeys(
  tenantId: string,
  opts: { prefix?: string; limit?: number } = {},
): Promise<{ keys: string[] }> {
  const prefix = typeof opts.prefix === 'string' ? opts.prefix : ''
  const rawLimit = typeof opts.limit === 'number' ? opts.limit : undefined
  const limit = rawLimit && Number.isFinite(rawLimit) ? Math.max(1, Math.min(1000, Math.floor(rawLimit))) : 200
  return await prismaOrFile(
    tenantId,
    'list_keys',
    async () => {
      const rows = await prisma.sisteqTenantKv.findMany({
        where: { tenantId, ...(prefix.trim().length > 0 ? { key: { startsWith: prefix } } : {}) },
        select: { key: true },
        orderBy: { key: 'asc' },
        take: limit,
      })
      const keys = rows.map(r => r.key)
      log('list.keys.ok', { tenantId, prefix: prefix || null, limit, count: keys.length, store: 'prisma' })
      return { keys }
    },
    async () => {
      const db = await readFileDb()
      const allKeys = Object.keys(db.tenants[tenantId] ?? {}).filter(k => typeof k === 'string' && k)
      const filtered = prefix.trim().length > 0 ? allKeys.filter(k => k.startsWith(prefix)) : allKeys
      filtered.sort((a, b) => a.localeCompare(b))
      const keys = filtered.slice(0, limit)
      log('list.keys.ok', { tenantId, prefix: prefix || null, limit, count: keys.length, store: 'file' })
      return { keys }
    },
    { prefix: prefix || null, limit },
  )
}

export async function setTenantKvValue(tenantId: string, userId: string, key: string, value: any): Promise<{ ok: true }> {
  assertKey(key)
  assertPayloadSize(value)
  return await prismaOrFile(
    tenantId,
    'set',
    async () => {
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
    },
    async () => {
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
    },
    { key, bytes: payloadBytes(value) },
  )
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

  return await prismaOrFile(
    tenantId,
    'set_many',
    async () => {
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
    },
    async () => {
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
    },
    { items: items.length },
  )
}

export async function deleteTenantKvValue(tenantId: string, userId: string, key: string): Promise<{ ok: true }> {
  assertKey(key)
  return await prismaOrFile(
    tenantId,
    'delete',
    async () => {
      await prisma.sisteqTenantKv.deleteMany({ where: { tenantId, key } })
      log('delete.ok', { tenantId, key, userId, store: 'prisma' })
      return { ok: true }
    },
    async () => {
      const db = await readFileDb()
      const t = db.tenants[tenantId]
      if (t && t[key]) delete t[key]
      await writeFileDb(db)
      log('delete.ok', { tenantId, key, userId, store: 'file' })
      return { ok: true }
    },
    { key },
  )
}

export async function deleteTenantKvValues(tenantId: string, userId: string, keys: string[]): Promise<{ ok: true }> {
  assertKeys(keys)
  return await prismaOrFile(
    tenantId,
    'delete_many',
    async () => {
      if (keys.length > 0) {
        await prisma.sisteqTenantKv.deleteMany({ where: { tenantId, key: { in: keys } } })
      }
      log('delete.batch.ok', { tenantId, keys: keys.length, userId, store: 'prisma' })
      return { ok: true }
    },
    async () => {
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
    },
    { keys: keys.length },
  )
}
