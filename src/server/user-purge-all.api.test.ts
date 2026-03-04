import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import handler from '../../pages/api/profile/[[...slug]]'
import { createAuthCookiesForUser, registerTenantAndUser } from './profile'
import { createUserAsAdmin } from './profile'

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

describe('User purge all API', () => {
  const prevDbPath = process.env.SISTEQ_PROFILE_DB_PATH
  const prevSecret = process.env.SISTEQ_SESSION_SECRET
  const prevStore = process.env.SISTEQ_PROFILE_STORE
  const prevSuper = process.env.SISTEQ_SUPER_ADMIN_TOKEN
  const tmpDir = path.join(os.tmpdir(), 'sisteq-user-purge-tests')
  let dbPath = path.join(tmpDir, `profile_${Date.now()}.json`)

  beforeEach(() => {
    dbPath = path.join(tmpDir, `profile_${Date.now()}_${Math.random().toString(16).slice(2)}.json`)
    process.env.SISTEQ_PROFILE_DB_PATH = dbPath
    process.env.SISTEQ_SESSION_SECRET = 'test-secret'
    process.env.SISTEQ_PROFILE_STORE = 'file'
    process.env.SISTEQ_SUPER_ADMIN_TOKEN = 'super-admin-token-1234567890'
  })

  afterEach(() => {
    process.env.SISTEQ_PROFILE_DB_PATH = prevDbPath
    process.env.SISTEQ_SESSION_SECRET = prevSecret
    process.env.SISTEQ_PROFILE_STORE = prevStore
    process.env.SISTEQ_SUPER_ADMIN_TOKEN = prevSuper
  })

  it('lista usuários no dry-run e exige confirmação + token no apply', async () => {
    const { tenant: t1, user: a1 } = await registerTenantAndUser({
      tenantSlug: `t1-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      companyName: 'T1',
      name: 'Admin 1',
      email: `a1-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(a1))
    await createUserAsAdmin(t1.id, a1.id, { name: 'User 1', email: `u1-${Date.now()}@example.com`, password: 'Senha@12345' })

    const { tenant: t2, user: a2 } = await registerTenantAndUser({
      tenantSlug: `t2-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      companyName: 'T2',
      name: 'Admin 2',
      email: `a2-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    await createUserAsAdmin(t2.id, a2.id, { name: 'User 2', email: `u2-${Date.now()}@example.com`, password: 'Senha@12345' })

    const dry = await callProfileApi({ method: 'POST', slug: ['purge-all-users'], cookie, body: { mode: 'dry-run' } })
    expect(dry.status).toBe(200)
    expect(dry.json.plan.summary.total).toBe(4)
    expect(dry.json.plan.summary.admins).toBe(2)
    expect(dry.json.plan.summary.users).toBe(2)
    expect(Array.isArray(dry.json.plan.users)).toBe(true)
    expect(dry.json.plan.users.length).toBe(4)
    expect(dry.json.confirmToken).toMatch(/\./)

    const noConfirm = await callProfileApi({ method: 'POST', slug: ['purge-all-users'], cookie, body: { mode: 'apply' } })
    expect(noConfirm.status).toBe(403)

    const wrongPhrase = await callProfileApi({
      method: 'POST',
      slug: ['purge-all-users'],
      cookie,
      body: { mode: 'apply', superToken: process.env.SISTEQ_SUPER_ADMIN_TOKEN, confirm: true, confirmToken: dry.json.confirmToken, confirmPhrase: 'NO' },
    })
    expect(wrongPhrase.status).toBe(400)
  })

  it('remove permanentemente todos os usuários e zera índices/tokens', async () => {
    const { tenant: t1, user: a1 } = await registerTenantAndUser({
      tenantSlug: `t1-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      companyName: 'T1',
      name: 'Admin 1',
      email: `a1-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(a1))
    await createUserAsAdmin(t1.id, a1.id, { name: 'User 1', email: `u1-${Date.now()}@example.com`, password: 'Senha@12345' })

    const { tenant: t2, user: a2 } = await registerTenantAndUser({
      tenantSlug: `t2-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      companyName: 'T2',
      name: 'Admin 2',
      email: `a2-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    await createUserAsAdmin(t2.id, a2.id, { name: 'User 2', email: `u2-${Date.now()}@example.com`, password: 'Senha@12345' })

    const dry = await callProfileApi({ method: 'POST', slug: ['purge-all-users'], cookie, body: { mode: 'dry-run' } })
    const apply = await callProfileApi({
      method: 'POST',
      slug: ['purge-all-users'],
      cookie,
      body: {
        mode: 'apply',
        superToken: process.env.SISTEQ_SUPER_ADMIN_TOKEN,
        confirm: true,
        confirmToken: dry.json.confirmToken,
        confirmPhrase: 'DELETE ALL USERS',
      },
    })
    expect(apply.status).toBe(200)
    expect(apply.json.ok).toBe(true)
    expect(apply.json.summary.total).toBe(4)
    expect(apply.json.removedByRole.admin).toBe(2)
    expect(apply.json.removedByRole.user).toBe(2)

    const db = await readDb(dbPath)
    expect(Object.keys(db.users).length).toBe(0)
    expect(Object.keys(db.userByTenantEmail).length).toBe(0)
    expect(Object.keys(db.refreshTokens).length).toBe(0)
    expect(Object.keys(db.emailVerificationTokens).length).toBe(0)
    expect(Object.keys(db.passwordResetTokens).length).toBe(0)
  }, 20_000)
})
