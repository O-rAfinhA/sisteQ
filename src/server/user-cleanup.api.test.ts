import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import handler from '../../pages/api/profile/[[...slug]]'
import { createAuthCookiesForUser, registerTenantAndUser } from './profile'
import { createUserAsAdmin } from './profile'
import { withPgClient } from './pg'

function cookieHeaderFromSetCookie(setCookie: string | string[]) {
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie]
  return arr
    .map(v => String(v).split(';')[0])
    .filter(Boolean)
    .join('; ')
}

function createMockRes() {
  const state: { status: number; json: any; headers: Record<string, any> } = {
    status: 200,
    json: null,
    headers: {},
  }
  const res: any = {
    status(code: number) {
      state.status = code
      return res
    },
    json(payload: any) {
      state.json = payload
      return res
    },
    setHeader(key: string, value: any) {
      state.headers[key] = value
    },
    getState() {
      return state
    },
  }
  return res
}

async function callProfileApi(opts: { method: string; slug: string[]; cookie: string; body?: any }) {
  const req: any = { method: opts.method, query: { slug: opts.slug }, headers: { cookie: opts.cookie }, body: opts.body }
  const res = createMockRes()
  await handler(req, res as any)
  return res.getState()
}

async function readDb(dbPath: string) {
  const raw = await fs.readFile(dbPath, 'utf8')
  return JSON.parse(raw)
}

async function writeDb(dbPath: string, db: any) {
  await fs.mkdir(path.dirname(dbPath), { recursive: true })
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8')
}

describe('User cleanup API', () => {
  const prevDbPath = process.env.SISTEQ_PROFILE_DB_PATH
  const prevSecret = process.env.SISTEQ_SESSION_SECRET
  const prevStore = process.env.SISTEQ_PROFILE_STORE
  const prevDbUrl = process.env.DATABASE_URL
  const tmpDir = path.join(os.tmpdir(), 'sisteq-user-cleanup-tests')
  let dbPath = path.join(tmpDir, `profile_${Date.now()}.json`)

  beforeEach(() => {
    dbPath = path.join(tmpDir, `profile_${Date.now()}_${Math.random().toString(16).slice(2)}.json`)
    process.env.SISTEQ_PROFILE_DB_PATH = dbPath
    process.env.SISTEQ_SESSION_SECRET = 'test-secret'
    process.env.SISTEQ_PROFILE_STORE = 'file'
  })

  afterEach(() => {
    process.env.SISTEQ_PROFILE_DB_PATH = prevDbPath
    process.env.SISTEQ_SESSION_SECRET = prevSecret
    process.env.SISTEQ_PROFILE_STORE = prevStore
    process.env.DATABASE_URL = prevDbUrl
    vi.useRealTimers()
  })

  it('exige confirmação para ações irreversíveis', async () => {
    const { user: admin } = await registerTenantAndUser({
      tenantSlug: 'acme',
      companyName: 'ACME',
      name: 'Admin',
      email: `admin-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(admin))

    const res = await callProfileApi({ method: 'POST', slug: ['cleanup-users'], cookie, body: { mode: 'apply' } })
    expect(res.status).toBe(400)
    expect(String(res.json.error)).toMatch(/confirma/i)
  })

  it('deduplica por e-mail, normaliza telefone e cria backup ao aplicar', async () => {
    const tenantSlug = `acme-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const { tenant, user: admin } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'ACME',
      name: 'Admin',
      email: `admin-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(admin))

    const u2 = await createUserAsAdmin(tenant.id, admin.id, {
      name: 'Duplicado',
      email: `user-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })

    const db = await readDb(dbPath)
    const adminKey = `${tenant.id}:${admin.id}`
    const u2Key = `${tenant.id}:${u2.id}`
    db.users[adminKey].phone = '(11) 91234-5678'
    db.users[u2Key].email = db.users[adminKey].email
    db.users[u2Key].activity = [{ id: 'act_x', type: 'profile.updated', createdAt: new Date().toISOString() }]
    await writeDb(dbPath, db)

    const dry = await callProfileApi({
      method: 'POST',
      slug: ['cleanup-users'],
      cookie,
      body: { mode: 'dry-run' },
    })
    expect(dry.status).toBe(200)
    expect(dry.json.plan.summary.duplicateGroups).toBeGreaterThan(0)
    expect(dry.json.confirmToken).toMatch(/\./)

    const apply = await callProfileApi({
      method: 'POST',
      slug: ['cleanup-users'],
      cookie,
      body: { mode: 'apply', confirm: true, confirmToken: dry.json.confirmToken },
    })
    expect(apply.status).toBe(200)
    expect(apply.json.ok).toBe(true)
    expect(String(apply.json.backupPath)).toMatch(/profile\.backup\./)

    const after = await readDb(dbPath)
    const users: any[] = Object.values(after.users as any).filter((u: any) => u && u.tenantId === tenant.id)
    const emails = users.map(u => u.email)
    const uniqueEmails = new Set(emails)
    expect(uniqueEmails.size).toBe(emails.length)
    expect(users.find(u => u.id === admin.id)?.phone).toBe('11912345678')
  })

  it('remove usuários inativos há mais de 24 meses e anonimiza desativados', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-03T00:00:00.000Z'))

    const tenantSlug = `acme-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const { tenant, user: admin } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'ACME',
      name: 'Admin',
      email: `admin-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(admin))

    const inactive = await createUserAsAdmin(tenant.id, admin.id, {
      name: 'Inativo',
      email: `inactive-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const disabled = await createUserAsAdmin(tenant.id, admin.id, {
      name: 'Desativado',
      email: `disabled-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })

    const db = await readDb(dbPath)
    const inactiveKey = `${tenant.id}:${inactive.id}`
    const disabledKey = `${tenant.id}:${disabled.id}`
    db.users[inactiveKey].updatedAt = '2023-01-01T00:00:00.000Z'
    db.users[disabledKey].disabledAt = '2026-02-01T00:00:00.000Z'
    db.users[disabledKey].phone = '+55 (11) 99999-8888'
    await writeDb(dbPath, db)

    const dry = await callProfileApi({ method: 'POST', slug: ['cleanup-users'], cookie, body: { mode: 'dry-run' } })
    const apply = await callProfileApi({
      method: 'POST',
      slug: ['cleanup-users'],
      cookie,
      body: { mode: 'apply', confirm: true, confirmToken: dry.json.confirmToken },
    })
    expect(apply.status).toBe(200)

    const after = await readDb(dbPath)
    const afterUsers: any[] = Object.values(after.users as any).filter((u: any) => u && u.tenantId === tenant.id)
    expect(afterUsers.find(u => u.id === inactive.id)).toBeUndefined()
    const disabledAfter: any = afterUsers.find(u => u.id === disabled.id)
    expect(disabledAfter?.email).toMatch(/^anon\+/)
    expect(disabledAfter?.phone).toBeUndefined()
  })
})

describe('User cleanup API (PostgreSQL)', () => {
  const prevDbPath = process.env.SISTEQ_PROFILE_DB_PATH
  const prevSecret = process.env.SISTEQ_SESSION_SECRET
  const prevStore = process.env.SISTEQ_PROFILE_STORE
  const prevDbUrl = process.env.DATABASE_URL

  const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
  const canRun = typeof dbUrl === 'string' && dbUrl.trim().length > 0

  async function readDbPg() {
    await withPgClient(async client => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS sisteq_profile_db (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `)
    })
    return await withPgClient(async client => {
      const res = await client.query<{ data: any }>(`SELECT data FROM sisteq_profile_db WHERE id = 'main'`)
      return (res.rows[0]?.data ?? {}) as any
    })
  }

  async function writeDbPg(db: any) {
    await withPgClient(async client => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS sisteq_profile_db (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `)
      await client.query(
        `
          INSERT INTO sisteq_profile_db (id, data, updated_at)
          VALUES ('main', $1, now())
          ON CONFLICT (id) DO UPDATE
            SET data = EXCLUDED.data,
                updated_at = now()
        `,
        [db],
      )
    })
  }

  beforeEach(() => {
    process.env.SISTEQ_PROFILE_DB_PATH = ''
    process.env.SISTEQ_SESSION_SECRET = 'test-secret'
    process.env.SISTEQ_PROFILE_STORE = 'pg'
    if (canRun) process.env.DATABASE_URL = dbUrl
  })

  afterEach(() => {
    process.env.SISTEQ_PROFILE_DB_PATH = prevDbPath
    process.env.SISTEQ_SESSION_SECRET = prevSecret
    process.env.SISTEQ_PROFILE_STORE = prevStore
    process.env.DATABASE_URL = prevDbUrl
    vi.useRealTimers()
  })

  it.runIf(canRun)('exige confirmação para ações irreversíveis', async () => {
    const { user: admin } = await registerTenantAndUser({
      tenantSlug: `acme-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      companyName: 'ACME',
      name: 'Admin',
      email: `admin-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(admin))

    const res = await callProfileApi({ method: 'POST', slug: ['cleanup-users'], cookie, body: { mode: 'apply' } })
    expect(res.status).toBe(400)
    expect(String(res.json.error)).toMatch(/confirma/i)
  })

  it.runIf(canRun)('deduplica por e-mail, normaliza telefone e cria backup ao aplicar', async () => {
    const tenantSlug = `acme-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const { tenant, user: admin } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'ACME',
      name: 'Admin',
      email: `admin-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(admin))

    const u2 = await createUserAsAdmin(tenant.id, admin.id, {
      name: 'Duplicado',
      email: `user-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })

    const db = await readDbPg()
    const adminKey = `${tenant.id}:${admin.id}`
    const u2Key = `${tenant.id}:${u2.id}`
    db.users[adminKey].phone = '(11) 91234-5678'
    db.users[u2Key].email = db.users[adminKey].email
    db.users[u2Key].activity = [{ id: 'act_x', type: 'profile.updated', createdAt: new Date().toISOString() }]
    await writeDbPg(db)

    const dry = await callProfileApi({
      method: 'POST',
      slug: ['cleanup-users'],
      cookie,
      body: { mode: 'dry-run' },
    })
    expect(dry.status).toBe(200)
    expect(dry.json.plan.summary.duplicateGroups).toBeGreaterThan(0)
    expect(dry.json.confirmToken).toMatch(/\./)

    const apply = await callProfileApi({
      method: 'POST',
      slug: ['cleanup-users'],
      cookie,
      body: { mode: 'apply', confirm: true, confirmToken: dry.json.confirmToken },
    })
    expect(apply.status).toBe(200)
    expect(apply.json.ok).toBe(true)
    expect(String(apply.json.backupPath)).toMatch(/^pg:/)

    const after = await readDbPg()
    const users: any[] = Object.values(after.users as any).filter((u: any) => u && u.tenantId === tenant.id)
    const emails = users.map(u => u.email)
    const uniqueEmails = new Set(emails)
    expect(uniqueEmails.size).toBe(emails.length)
    expect(users.find(u => u.id === admin.id)?.phone).toBe('11912345678')
  })

  it.runIf(canRun)('remove usuários inativos há mais de 24 meses e anonimiza desativados', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-03T00:00:00.000Z'))

    const tenantSlug = `acme-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const { tenant, user: admin } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'ACME',
      name: 'Admin',
      email: `admin-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(admin))

    const inactive = await createUserAsAdmin(tenant.id, admin.id, {
      name: 'Inativo',
      email: `inactive-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const disabled = await createUserAsAdmin(tenant.id, admin.id, {
      name: 'Desativado',
      email: `disabled-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })

    const db = await readDbPg()
    const inactiveKey = `${tenant.id}:${inactive.id}`
    const disabledKey = `${tenant.id}:${disabled.id}`
    db.users[inactiveKey].updatedAt = '2023-01-01T00:00:00.000Z'
    db.users[disabledKey].disabledAt = '2026-02-01T00:00:00.000Z'
    db.users[disabledKey].phone = '+55 (11) 99999-8888'
    await writeDbPg(db)

    const dry = await callProfileApi({ method: 'POST', slug: ['cleanup-users'], cookie, body: { mode: 'dry-run' } })
    const apply = await callProfileApi({
      method: 'POST',
      slug: ['cleanup-users'],
      cookie,
      body: { mode: 'apply', confirm: true, confirmToken: dry.json.confirmToken },
    })
    expect(apply.status).toBe(200)

    const after = await readDbPg()
    const afterUsers: any[] = Object.values(after.users as any).filter((u: any) => u && u.tenantId === tenant.id)
    expect(afterUsers.find(u => u.id === inactive.id)).toBeUndefined()
    const disabledAfter: any = afterUsers.find(u => u.id === disabled.id)
    expect(disabledAfter?.email).toMatch(/^anon\+/)
    expect(disabledAfter?.phone).toBeUndefined()
  })
})
