import { Pool, type PoolClient } from 'pg'

type DbLogLevel = 'info' | 'error'

function dbLog(level: DbLogLevel, event: string, fields: Record<string, unknown> = {}) {
  if (process.env.SISTEQ_DB_LOGS !== '1') return
  const payload = {
    ts: new Date().toISOString(),
    level,
    scope: 'db',
    event,
    ...fields,
  }
  if (level === 'error') {
    console.error(JSON.stringify(payload))
    return
  }
  console.info(JSON.stringify(payload))
}

let pool: Pool | null = null

function getConnectionString() {
  const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
  const candidates = [
    isTestEnv ? process.env.TEST_DATABASE_URL : undefined,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_PRISMA_URL,
  ]
  for (const raw of candidates) {
    if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim()
  }
  return ''
}

function getEnvText(key: string) {
  const raw = process.env[key]
  if (typeof raw !== 'string') return ''
  const v = raw.trim()
  return v.length > 0 ? v : ''
}

function getDbHost() {
  return getEnvText('PGHOST') || getEnvText('POSTGRES_HOST')
}

function getDbUser() {
  return getEnvText('PGUSER') || getEnvText('POSTGRES_USER')
}

function getDbPassword() {
  return getEnvText('PGPASSWORD') || getEnvText('POSTGRES_PASSWORD')
}

function getDbName() {
  return getEnvText('PGDATABASE') || getEnvText('POSTGRES_DATABASE')
}

function getDbPort() {
  const raw = getEnvText('PGPORT')
  const n = raw ? Number(raw) : undefined
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined
}

export function isPostgresConfigured() {
  const hasUrl = getConnectionString().length > 0
  const hasHost = getDbHost().length > 0
  return hasUrl || hasHost
}

function shouldUseSsl() {
  const rawMode = typeof process.env.PGSSLMODE === 'string' ? process.env.PGSSLMODE.trim().toLowerCase() : ''
  if (rawMode === 'require' || rawMode === 'verify-full' || rawMode === 'verify-ca') return true
  const url = getConnectionString()
  if (url) {
    if (/sslmode=require/i.test(url) || /ssl=true/i.test(url)) return true
    if (/supabase\.co/i.test(url)) return true
  }
  const host = getDbHost()
  if (host && /supabase\.co/i.test(host)) return true
  return false
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function pgErrorCode(e: any) {
  const code = e?.code
  return typeof code === 'string' && code.length > 0 ? code : null
}

function isRetryableTxError(e: any) {
  const code = pgErrorCode(e)
  return (
    code === '40P01' ||
    code === '40001' ||
    code === '55P03' ||
    code === '57014' ||
    code === '53300' ||
    code === '57P01' ||
    code === '57P02' ||
    code === '57P03' ||
    code === '08006' ||
    code === '08000'
  )
}

function getPool() {
  if (!isPostgresConfigured()) {
    const err: any = new Error('PostgreSQL não configurado (DATABASE_URL ou PGHOST)')
    err.status = 501
    throw err
  }
  if (pool) return pool
  const connectionString = getConnectionString()
  pool = new Pool({
    connectionString: connectionString || undefined,
    host: getDbHost() || undefined,
    port: getDbPort(),
    user: getDbUser() || undefined,
    password: getDbPassword() || undefined,
    database: getDbName() || undefined,
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
    max: process.env.PGPOOL_MAX ? Number(process.env.PGPOOL_MAX) : 10,
    idleTimeoutMillis: process.env.PGPOOL_IDLE_MS ? Number(process.env.PGPOOL_IDLE_MS) : 30_000,
    connectionTimeoutMillis: process.env.PGPOOL_CONN_TIMEOUT_MS ? Number(process.env.PGPOOL_CONN_TIMEOUT_MS) : 5_000,
  })
  pool.on('error', err => {
    dbLog('error', 'pool.error', { message: (err as any)?.message || String(err) })
  })
  dbLog('info', 'pool.ready', {})
  return pool
}

export async function withPgClient<T>(fn: (client: PoolClient) => Promise<T>) {
  const p = getPool()
  let client: PoolClient
  try {
    client = await p.connect()
  } catch (e: any) {
    const code = typeof e?.code === 'string' ? e.code : ''
    const retryable =
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ENETUNREACH' ||
      code === 'ECONNRESET'
    if (retryable) {
      const err: any = new Error(process.env.NODE_ENV === 'production' ? 'Banco de dados indisponível' : e?.message || String(e))
      err.status = 503
      throw err
    }
    throw e
  }
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}

export async function withPgTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const maxAttempts = process.env.PG_TX_RETRIES ? Math.max(0, Math.min(10, Number(process.env.PG_TX_RETRIES))) : 2
  let attempt = 0
  while (true) {
    attempt++
    try {
      return await withPgClient(async client => {
        dbLog('info', 'tx.begin', { attempt })
        await client.query('BEGIN')
        try {
          const result = await fn(client)
          await client.query('COMMIT')
          dbLog('info', 'tx.commit', { attempt })
          return result
        } catch (e) {
          try {
            await client.query('ROLLBACK')
            dbLog('info', 'tx.rollback', { attempt, code: pgErrorCode(e) })
          } catch (rollbackErr) {
            dbLog('error', 'tx.rollback_failed', {
              attempt,
              message: (rollbackErr as any)?.message || String(rollbackErr),
              code: pgErrorCode(rollbackErr),
            })
          }
          throw e
        }
      })
    } catch (e: any) {
      const code = pgErrorCode(e)
      dbLog('error', 'tx.failed', { attempt, code, message: e?.message || String(e) })
      if (attempt <= maxAttempts && isRetryableTxError(e)) {
        await sleep(50 * attempt + Math.floor(Math.random() * 50))
        continue
      }
      throw e
    }
  }
}

export async function pgQuery<T = any>(text: string, params: any[] = []) {
  const startedAt = Date.now()
  try {
    const result: any = await withPgClient(client => client.query(text, params))
    const rowCount = typeof result?.rowCount === 'number' ? result.rowCount : null
    dbLog('info', 'query', { ms: Date.now() - startedAt, rowCount })
    return result as T
  } catch (e: any) {
    dbLog('error', 'query.failed', { ms: Date.now() - startedAt, code: pgErrorCode(e), message: e?.message || String(e) })
    throw e
  }
}

