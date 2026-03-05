import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as any

function isDbLogsEnabled() {
  return process.env.SISTEQ_DB_LOGS === '1'
}

function getEnv(key: string) {
  const v = process.env[key]
  return typeof v === 'string' ? v.trim() : ''
}

function maybeSetDatabaseUrlFromPgEnv() {
  if (getEnv('DATABASE_URL')) return

  const host = getEnv('PGHOST')
  const user = getEnv('PGUSER')
  const password = getEnv('PGPASSWORD')
  const database = getEnv('PGDATABASE')
  const port = getEnv('PGPORT') || '5432'
  if (!host || !user || !password || !database) return

  const sslmode = getEnv('PGSSLMODE')
  const params = new URLSearchParams()
  if (sslmode) params.set('sslmode', sslmode)
  const qs = params.toString()

  const url = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}${qs ? `?${qs}` : ''}`
  process.env.DATABASE_URL = url
}

function buildClient() {
  maybeSetDatabaseUrlFromPgEnv()
  const client = new PrismaClient({
    log: isDbLogsEnabled()
      ? [
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [],
  })

  if (isDbLogsEnabled()) {
    client.$on('warn', e => {
      console.info(JSON.stringify({ ts: new Date().toISOString(), level: 'warn', scope: 'db', event: 'prisma.warn', message: e.message }))
    })
    client.$on('error', e => {
      console.error(
        JSON.stringify({ ts: new Date().toISOString(), level: 'error', scope: 'db', event: 'prisma.error', message: e.message }),
      )
    })
  }

  return client
}

export function isDatabaseConfigured() {
  maybeSetDatabaseUrlFromPgEnv()
  return getEnv('DATABASE_URL').length > 0
}

export const prisma: PrismaClient = globalForPrisma.__sisteq_prisma ?? buildClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.__sisteq_prisma = prisma
