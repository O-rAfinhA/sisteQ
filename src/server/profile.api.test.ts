import path from 'path'
import os from 'os'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import handler from '../../pages/api/profile/[[...slug]]'
import loginHandler from '../../pages/api/auth/login'
import { createAuthCookiesForUser, registerTenantAndUser } from './profile'
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

describe('Profile API', () => {
  const prevDbPath = process.env.SISTEQ_PROFILE_DB_PATH
  const prevSecret = process.env.SISTEQ_SESSION_SECRET
  const prevStore = process.env.SISTEQ_PROFILE_STORE
  const prevDbUrl = process.env.DATABASE_URL
  const tmpDir = path.join(os.tmpdir(), 'sisteq-profile-tests')
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
  })

  async function createAuthCookie() {
    const { user } = await registerTenantAndUser({
      tenantSlug: 'acme',
      companyName: 'ACME',
      name: 'Test User',
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    return cookieHeaderFromSetCookie(await createAuthCookiesForUser(user))
  }

  function uniqueTenantSlug() {
    return `tenant-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  async function callProfileApi(opts: { method: string; slug: string[]; cookie: string; body?: any }) {
    const req: any = { method: opts.method, query: { slug: opts.slug }, headers: { cookie: opts.cookie }, body: opts.body }
    const res = createMockRes()
    await handler(req, res as any)
    return res.getState()
  }

  async function loginAs(opts: { tenantSlug: string; email: string; password: string }) {
    const req: any = {
      method: 'POST',
      headers: { 'x-tenant': opts.tenantSlug },
      body: { email: opts.email, password: opts.password },
      socket: { remoteAddress: '127.0.0.1' },
    }
    const res = createMockRes()
    await loginHandler(req, res as any)
    const state = res.getState()
    const setCookie = state.headers['Set-Cookie']
    const cookie = setCookie ? cookieHeaderFromSetCookie(setCookie) : ''
    return { ...state, cookie }
  }

  it('cria cookies de auth para usuário', async () => {
    const cookie = await createAuthCookie()
    expect(cookie).toMatch(/sisteq_access=/)
  })

  it('GET /profile/me retorna usuário autenticado', async () => {
    const cookie = await createAuthCookie()
    const req: any = { method: 'GET', query: { slug: ['me'] }, headers: { cookie } }
    const res = createMockRes()
    await handler(req, res as any)
    const { status, json } = res.getState()
    expect(status).toBe(200)
    expect(json.user.email).toMatch(/@/)
  }, 20_000)

  it('bloqueia acesso quando x-company-id não bate com o tenant do token', async () => {
    const tenantSlug = uniqueTenantSlug()
    const email = `test-${Date.now()}-${Math.random()}@example.com`
    const password = 'Senha@12345'
    const { tenant, user } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'Empresa',
      name: 'Test User',
      email,
      password,
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(user))

    const req: any = {
      method: 'GET',
      query: { slug: ['me'] },
      headers: { cookie, 'x-company-id': `${tenant.id}-other` },
    }
    const res = createMockRes()
    await handler(req, res as any)
    const { status, json } = res.getState()
    expect(status).toBe(403)
    expect(String(json.error)).toMatch(/empresa/i)
  })

  it('PUT /profile/me atualiza nome e e-mail', async () => {
    const cookie = await createAuthCookie()
    const req: any = {
      method: 'PUT',
      query: { slug: ['me'] },
      headers: { cookie },
      body: { name: 'Novo Nome', email: 'novo@email.com.br' },
    }
    const res = createMockRes()
    await handler(req, res as any)
    const { status, json } = res.getState()
    expect(status).toBe(200)
    expect(json.user.name).toBe('Novo Nome')
    expect(json.user.email).toBe('novo@email.com.br')
  })

  it('permite PUT quando Origin bate com x-forwarded-proto/host', async () => {
    const cookie = await createAuthCookie()
    const req: any = {
      method: 'PUT',
      query: { slug: ['me'] },
      headers: {
        cookie,
        host: 'internal.local:3000',
        origin: 'https://app.example.com',
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'app.example.com',
      },
      body: { name: 'Nome', email: 'nome@exemplo.com' },
    }
    const res = createMockRes()
    await handler(req, res as any)
    const { status, json } = res.getState()
    expect(status).toBe(200)
    expect(json.user.email).toBe('nome@exemplo.com')
  })

  it('PUT /profile/password falha com senha atual incorreta', async () => {
    const cookie = await createAuthCookie()
    const req: any = {
      method: 'PUT',
      query: { slug: ['password'] },
      headers: { cookie },
      body: { currentPassword: 'errada', newPassword: 'Senha@9999' },
    }
    const res = createMockRes()
    await handler(req, res as any)
    const { status, json } = res.getState()
    expect(status).toBe(400)
    expect(String(json.error)).toMatch(/incorreta/i)
  })

  it('PUT /profile/preferences salva preferências', async () => {
    const cookie = await createAuthCookie()
    const req: any = {
      method: 'PUT',
      query: { slug: ['preferences'] },
      headers: { cookie },
      body: { theme: 'dark', language: 'pt-BR', compactMode: true, analyticsOptIn: false },
    }
    const res = createMockRes()
    await handler(req, res as any)
    const { status, json } = res.getState()
    expect(status).toBe(200)
    expect(json.preferences.theme).toBe('dark')
    expect(json.preferences.compactMode).toBe(true)
  })

  it('POST /profile/support/tickets cria chamado e lista', async () => {
    const cookie = await createAuthCookie()

    const reqCreate: any = {
      method: 'POST',
      query: { slug: ['support', 'tickets'] },
      headers: { cookie },
      body: { subject: 'Teste', message: 'Mensagem' },
    }
    const resCreate = createMockRes()
    await handler(reqCreate, resCreate as any)
    const createState = resCreate.getState()
    expect(createState.status).toBe(201)
    expect(createState.json.ticket.id).toMatch(/^tkt_/)

    const reqList: any = {
      method: 'GET',
      query: { slug: ['support', 'tickets'] },
      headers: { cookie },
    }
    const resList = createMockRes()
    await handler(reqList, resList as any)
    const listState = resList.getState()
    expect(listState.status).toBe(200)
    expect(listState.json.tickets.length).toBeGreaterThan(0)
  })

  it('primeiro usuário registrado no tenant vira Administrador', async () => {
    const tenantSlug = uniqueTenantSlug()
    const { user } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'Empresa',
      name: 'Admin',
      email: `admin-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    expect(user.role).toBe('Admin')
  })

  it('apenas Administradores criam usuários; usuário comum não acessa admin', async () => {
    const tenantSlug = uniqueTenantSlug()
    const { user: admin } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'Empresa',
      name: 'Admin',
      email: `admin-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const adminCookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(admin))

    const email = `user-${Date.now()}-${Math.random()}@example.com`
    const password = 'Senha@12345'
    const created = await callProfileApi({
      method: 'POST',
      slug: ['users'],
      cookie: adminCookie,
      body: { name: 'Usuário', email, password },
    })
    expect(created.status).toBe(201)
    expect(created.json.emailSent).toBe(true)
    expect(created.json.user.email).toBe(email.toLowerCase())
    expect(created.json.user.role).toBe('User')
    expect(created.json.user.mustChangePassword).toBe(true)

    const logged = await loginAs({ tenantSlug, email, password })
    expect(logged.status).toBe(200)
    expect(logged.cookie).toMatch(/sisteq_access=/)

    const changed = await callProfileApi({
      method: 'PUT',
      slug: ['password'],
      cookie: logged.cookie,
      body: { newPassword: 'SenhaNova@123456' },
    })
    expect(changed.status).toBe(200)
    expect(changed.json.ok).toBe(true)

    const me = await callProfileApi({ method: 'GET', slug: ['me'], cookie: logged.cookie })
    expect(me.status).toBe(200)
    expect(me.json.user.mustChangePassword).toBe(false)

    const loggedWithNew = await loginAs({ tenantSlug, email, password: 'SenhaNova@123456' })
    expect(loggedWithNew.status).toBe(200)

    const forbiddenCreate = await callProfileApi({
      method: 'POST',
      slug: ['users'],
      cookie: logged.cookie,
      body: {
        name: 'Outro',
        email: `other-${Date.now()}-${Math.random()}@example.com`,
        password: 'Senha@12345',
      },
    })
    expect(forbiddenCreate.status).toBe(403)

    const forbiddenList = await callProfileApi({ method: 'GET', slug: ['users'], cookie: logged.cookie })
    expect(forbiddenList.status).toBe(403)
  }, 15_000)

  it('criação de usuários fica isolada entre tenants', async () => {
    const tenantA = uniqueTenantSlug()
    const tenantB = uniqueTenantSlug()

    const { user: adminA } = await registerTenantAndUser({
      tenantSlug: tenantA,
      companyName: 'Empresa A',
      name: 'Admin A',
      email: `adminA-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const { user: adminB } = await registerTenantAndUser({
      tenantSlug: tenantB,
      companyName: 'Empresa B',
      name: 'Admin B',
      email: `adminB-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })

    const cookieA = cookieHeaderFromSetCookie(await createAuthCookiesForUser(adminA))
    const cookieB = cookieHeaderFromSetCookie(await createAuthCookiesForUser(adminB))

    const sharedEmail = `shared-${Date.now()}@example.com`
    const password = 'Senha@12345'

    const createdA = await callProfileApi({
      method: 'POST',
      slug: ['users'],
      cookie: cookieA,
      body: { name: 'User A', email: sharedEmail, password },
    })
    expect(createdA.status).toBe(201)
    expect(createdA.json.user.tenantId).toBe(adminA.tenantId)

    const createdB = await callProfileApi({
      method: 'POST',
      slug: ['users'],
      cookie: cookieB,
      body: { name: 'User B', email: sharedEmail, password },
    })
    expect(createdB.status).toBe(201)
    expect(createdB.json.user.tenantId).toBe(adminB.tenantId)

    const listA = await callProfileApi({ method: 'GET', slug: ['users'], cookie: cookieA })
    expect(listA.status).toBe(200)
    expect(listA.json.users.length).toBe(2)
    for (const u of listA.json.users) expect(u.tenantId).toBe(adminA.tenantId)

    const listB = await callProfileApi({ method: 'GET', slug: ['users'], cookie: cookieB })
    expect(listB.status).toBe(200)
    expect(listB.json.users.length).toBe(2)
    for (const u of listB.json.users) expect(u.tenantId).toBe(adminB.tenantId)
  }, 20_000)
})

describe('Tenant KV API (PostgreSQL)', () => {
  const prevDbPath = process.env.SISTEQ_PROFILE_DB_PATH
  const prevSecret = process.env.SISTEQ_SESSION_SECRET
  const prevStore = process.env.SISTEQ_PROFILE_STORE
  const prevDbUrl = process.env.DATABASE_URL

  const dbUrl = process.env.TEST_DATABASE_URL
  const canRun = process.env.SISTEQ_RUN_PG_TESTS === '1' && typeof dbUrl === 'string' && dbUrl.trim().length > 0

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
  })

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

  async function callProfileApi(opts: { method: string; slug: string[]; cookie: string; query?: any; body?: any }) {
    const req: any = {
      method: opts.method,
      query: { slug: opts.slug, ...(opts.query ?? {}) },
      headers: { cookie: opts.cookie },
      body: opts.body,
    }
    const res = createMockRes()
    await handler(req, res as any)
    return res.getState()
  }

  async function createTenantCookie() {
    const tenantSlug = `tenant-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const { tenant, user } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'Empresa',
      name: 'Admin',
      email: `admin-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(user))
    return { tenant, user, cookie }
  }

  it.runIf(canRun)('salva e lê um valor por tenant', async () => {
    const { tenant, user, cookie } = await createTenantCookie()
    const key = 'usuarios'
    const value = [{ id: '1', nome: 'A' }]

    const put = await callProfileApi({ method: 'PUT', slug: ['kv'], cookie, body: { key, value } })
    expect(put.status).toBe(200)
    expect(put.json.ok).toBe(true)

    const get = await callProfileApi({ method: 'GET', slug: ['kv'], cookie, query: { key } })
    expect(get.status).toBe(200)
    expect(get.json.value).toEqual(value)

    await withPgClient(async client => {
      await client.query(`DELETE FROM sisteq_tenant_kv WHERE tenant_id = $1`, [tenant.id])
    })
    void user
  })

  it.runIf(canRun)('isola valores entre tenants', async () => {
    const a = await createTenantCookie()
    const b = await createTenantCookie()
    const key = 'sisteq-colaboradores'

    await callProfileApi({ method: 'PUT', slug: ['kv'], cookie: a.cookie, body: { key, value: [{ id: 'a' }] } })
    await callProfileApi({ method: 'PUT', slug: ['kv'], cookie: b.cookie, body: { key, value: [{ id: 'b' }] } })

    const getA = await callProfileApi({ method: 'GET', slug: ['kv'], cookie: a.cookie, query: { key } })
    const getB = await callProfileApi({ method: 'GET', slug: ['kv'], cookie: b.cookie, query: { key } })
    expect(getA.status).toBe(200)
    expect(getB.status).toBe(200)
    expect(getA.json.value).toEqual([{ id: 'a' }])
    expect(getB.json.value).toEqual([{ id: 'b' }])

    await withPgClient(async client => {
      await client.query(`DELETE FROM sisteq_tenant_kv WHERE tenant_id = $1`, [a.tenant.id])
      await client.query(`DELETE FROM sisteq_tenant_kv WHERE tenant_id = $1`, [b.tenant.id])
    })
  })

  it.runIf(canRun)('batch lê e escreve múltiplas chaves', async () => {
    const { tenant, cookie } = await createTenantCookie()
    const items = [
      { key: 'departamentos', value: [{ id: 'd1' }] },
      { key: 'funcoes', value: [{ id: 'f1' }] },
    ]

    const put = await callProfileApi({ method: 'PUT', slug: ['kv', 'batch'], cookie, body: { items } })
    expect(put.status).toBe(200)
    expect(put.json.ok).toBe(true)

    const get = await callProfileApi({ method: 'POST', slug: ['kv', 'batch'], cookie, body: { keys: items.map(i => i.key) } })
    expect(get.status).toBe(200)
    expect(get.json.values.departamentos).toEqual([{ id: 'd1' }])
    expect(get.json.values.funcoes).toEqual([{ id: 'f1' }])

    await withPgClient(async client => {
      await client.query(`DELETE FROM sisteq_tenant_kv WHERE tenant_id = $1`, [tenant.id])
    })
  })

  it.runIf(canRun)('lista chaves por prefixo', async () => {
    const { tenant, cookie } = await createTenantCookie()
    await callProfileApi({ method: 'PUT', slug: ['kv'], cookie, body: { key: 'sisteq-requisitos-x', value: { ok: true } } })

    const list = await callProfileApi({ method: 'GET', slug: ['kv', 'list'], cookie, query: { prefix: 'sisteq-requisitos-', limit: '10' } })
    expect(list.status).toBe(200)
    expect(Array.isArray(list.json.keys)).toBe(true)
    expect(list.json.keys).toContain('sisteq-requisitos-x')

    await withPgClient(async client => {
      await client.query(`DELETE FROM sisteq_tenant_kv WHERE tenant_id = $1`, [tenant.id])
    })
  })
})

describe('Tenant KV API (Arquivo)', () => {
  const prevProfileDbPath = process.env.SISTEQ_PROFILE_DB_PATH
  const prevKvDbPath = process.env.SISTEQ_TENANT_KV_DB_PATH
  const prevSecret = process.env.SISTEQ_SESSION_SECRET
  const prevStore = process.env.SISTEQ_PROFILE_STORE
  const prevDbUrl = process.env.DATABASE_URL
  const prevPgHost = process.env.PGHOST
  const prevPostgresHost = process.env.POSTGRES_HOST

  const tmpDir = path.join(os.tmpdir(), 'sisteq-tenant-kv-file-tests')
  let profileDbPath = path.join(tmpDir, `profile_${Date.now()}.json`)
  let kvDbPath = path.join(tmpDir, `kv_${Date.now()}.json`)

  beforeEach(() => {
    profileDbPath = path.join(tmpDir, `profile_${Date.now()}_${Math.random().toString(16).slice(2)}.json`)
    kvDbPath = path.join(tmpDir, `kv_${Date.now()}_${Math.random().toString(16).slice(2)}.json`)
    process.env.SISTEQ_PROFILE_DB_PATH = profileDbPath
    process.env.SISTEQ_TENANT_KV_DB_PATH = kvDbPath
    process.env.SISTEQ_SESSION_SECRET = 'test-secret'
    process.env.SISTEQ_PROFILE_STORE = 'file'
    process.env.DATABASE_URL = ''
    process.env.PGHOST = ''
    process.env.POSTGRES_HOST = ''
  })

  afterEach(() => {
    process.env.SISTEQ_PROFILE_DB_PATH = prevProfileDbPath
    process.env.SISTEQ_TENANT_KV_DB_PATH = prevKvDbPath
    process.env.SISTEQ_SESSION_SECRET = prevSecret
    process.env.SISTEQ_PROFILE_STORE = prevStore
    process.env.DATABASE_URL = prevDbUrl
    process.env.PGHOST = prevPgHost
    process.env.POSTGRES_HOST = prevPostgresHost
  })

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

  async function callProfileApi(opts: { method: string; slug: string[]; cookie: string; query?: any; body?: any }) {
    const req: any = {
      method: opts.method,
      query: { slug: opts.slug, ...(opts.query ?? {}) },
      headers: { cookie: opts.cookie },
      body: opts.body,
    }
    const res = createMockRes()
    await handler(req, res as any)
    return res.getState()
  }

  async function createTenantCookie() {
    const tenantSlug = `tenant-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const { tenant, user } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'Empresa',
      name: 'Admin',
      email: `admin-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(user))
    return { tenant, user, cookie }
  }

  it('salva e lê um valor por tenant (fallback)', async () => {
    const { tenant, cookie } = await createTenantCookie()
    const key = 'sisteq-docs-clientes'
    const value = [{ id: 'd1', nome: 'arquivo.pdf' }]

    const put = await callProfileApi({ method: 'PUT', slug: ['kv'], cookie, body: { key, value } })
    expect(put.status).toBe(200)
    expect(put.json.ok).toBe(true)

    const get = await callProfileApi({ method: 'GET', slug: ['kv'], cookie, query: { key } })
    expect(get.status).toBe(200)
    expect(get.json.value).toEqual(value)

    const list = await callProfileApi({ method: 'GET', slug: ['kv', 'list'], cookie, query: { prefix: 'sisteq-docs-', limit: '10' } })
    expect(list.status).toBe(200)
    expect(list.json.keys).toContain(key)

    void tenant
  })
})
