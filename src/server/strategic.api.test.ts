import path from 'path'
import os from 'os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import strategicHandler from '../../pages/api/strategic/years'
import loginHandler from '../../pages/api/auth/login'
import logoutHandler from '../../pages/api/auth/logout'
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

describe('Strategic persistence API', () => {
  const prevDbPath = process.env.SISTEQ_PROFILE_DB_PATH
  const prevSecret = process.env.SISTEQ_SESSION_SECRET
  const prevDbUrl = process.env.DATABASE_URL
  const tmpDir = path.join(os.tmpdir(), 'sisteq-strategic-tests')
  let profileDbPath = path.join(tmpDir, `profile_${Date.now()}.json`)

  const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
  const canRun = typeof dbUrl === 'string' && dbUrl.trim().length > 0

  beforeEach(() => {
    profileDbPath = path.join(tmpDir, `profile_${Date.now()}_${Math.random().toString(16).slice(2)}.json`)
    process.env.SISTEQ_PROFILE_DB_PATH = profileDbPath
    process.env.SISTEQ_SESSION_SECRET = 'test-secret'
    if (canRun) process.env.DATABASE_URL = dbUrl
  })

  afterEach(() => {
    process.env.SISTEQ_PROFILE_DB_PATH = prevDbPath
    process.env.SISTEQ_SESSION_SECRET = prevSecret
    process.env.DATABASE_URL = prevDbUrl
  })

  it.runIf(canRun)('dados persistem após logout e novo login', async () => {
    await withPgClient(async client => {
      await client.query(`CREATE TABLE IF NOT EXISTS strategic_planning_state (tenant_id TEXT PRIMARY KEY, current_year TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT NOT NULL)`)
      await client.query(`CREATE TABLE IF NOT EXISTS strategic_planning_years (tenant_id TEXT NOT NULL, year TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT NOT NULL, PRIMARY KEY (tenant_id, year))`)
    })

    const tenantSlug = `tenant-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const email = `admin-${Date.now()}-${Math.random()}@example.com`
    const password = 'Senha@12345'

    const { user } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'Empresa',
      name: 'Admin',
      email,
      password,
    })

    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(user))

    const payload = {
      anoAtual: '2026',
      anos: {
        '2026': {
          direcionamento: {
            missao: 'Missão X',
            visao: '',
            valores: [],
            politicaQualidade: '',
            politicaBsc: [],
            escopoCertificacao: '',
            exclusaoRequisito: '',
            objetivosBsc: [],
          },
          cenario: {
            historicoEmpresa: '',
            produtosServicos: '',
            regiaoAtuacao: '',
            canaisVenda: '',
            principaisClientes: [],
            principaisFornecedores: [],
            principaisConcorrentes: [],
          },
          swotItems: [],
          partesInteressadas: [],
          planosAcao: [],
          planosAcoes: [],
          riscos: [],
          processos: [],
        },
      },
    }

    const putReq: any = { method: 'PUT', headers: { cookie }, body: payload }
    const putRes = createMockRes()
    await strategicHandler(putReq, putRes as any)
    expect(putRes.getState().status).toBe(200)

    const logoutReq: any = { method: 'POST', headers: { cookie } }
    const logoutRes = createMockRes()
    await logoutHandler(logoutReq, logoutRes as any)
    expect(logoutRes.getState().status).toBe(200)

    const loginReq: any = {
      method: 'POST',
      headers: { 'x-tenant': tenantSlug },
      body: { email, password },
      socket: { remoteAddress: '127.0.0.1' },
    }
    const loginRes = createMockRes()
    await loginHandler(loginReq, loginRes as any)
    expect(loginRes.getState().status).toBe(200)
    const newCookie = cookieHeaderFromSetCookie(loginRes.getState().headers['Set-Cookie'])

    const getReq: any = { method: 'GET', headers: { cookie: newCookie } }
    const getRes = createMockRes()
    await strategicHandler(getReq, getRes as any)
    const getState = getRes.getState()
    expect(getState.status).toBe(200)
    expect(getState.json.data.anoAtual).toBe('2026')
    expect(getState.json.data.anos['2026'].direcionamento.missao).toBe('Missão X')

    await withPgClient(async client => {
      await client.query(`DELETE FROM strategic_planning_years WHERE tenant_id = $1`, [user.tenantId])
      await client.query(`DELETE FROM strategic_planning_state WHERE tenant_id = $1`, [user.tenantId])
    })
  })

  it.runIf(canRun)('isola dados entre tenants', async () => {
    await withPgClient(async client => {
      await client.query(
        `CREATE TABLE IF NOT EXISTS strategic_planning_state (tenant_id TEXT PRIMARY KEY, current_year TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT NOT NULL)`,
      )
      await client.query(
        `CREATE TABLE IF NOT EXISTS strategic_planning_years (tenant_id TEXT NOT NULL, year TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT NOT NULL, PRIMARY KEY (tenant_id, year))`,
      )
    })

    const tenantSlugA = `tenant-a-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const tenantSlugB = `tenant-b-${Date.now()}-${Math.random().toString(16).slice(2)}`

    const emailA = `admin-a-${Date.now()}-${Math.random()}@example.com`
    const emailB = `admin-b-${Date.now()}-${Math.random()}@example.com`
    const password = 'Senha@12345'

    const { user: userA } = await registerTenantAndUser({
      tenantSlug: tenantSlugA,
      companyName: 'Empresa A',
      name: 'Admin A',
      email: emailA,
      password,
    })
    const { user: userB } = await registerTenantAndUser({
      tenantSlug: tenantSlugB,
      companyName: 'Empresa B',
      name: 'Admin B',
      email: emailB,
      password,
    })

    const cookieA = cookieHeaderFromSetCookie(await createAuthCookiesForUser(userA))
    const cookieB = cookieHeaderFromSetCookie(await createAuthCookiesForUser(userB))

    const payloadA = {
      anoAtual: '2026',
      anos: {
        '2026': {
          direcionamento: {
            missao: 'Missão A',
            visao: '',
            valores: [],
            politicaQualidade: '',
            politicaBsc: [],
            escopoCertificacao: '',
            exclusaoRequisito: '',
            objetivosBsc: [],
          },
          cenario: {
            historicoEmpresa: '',
            produtosServicos: '',
            regiaoAtuacao: '',
            canaisVenda: '',
            principaisClientes: [],
            principaisFornecedores: [],
            principaisConcorrentes: [],
          },
          swotItems: [],
          partesInteressadas: [],
          planosAcao: [],
          planosAcoes: [],
          riscos: [],
          processos: [],
        },
      },
    }

    const payloadB = {
      anoAtual: '2027',
      anos: {
        '2027': {
          direcionamento: {
            missao: 'Missão B',
            visao: '',
            valores: [],
            politicaQualidade: '',
            politicaBsc: [],
            escopoCertificacao: '',
            exclusaoRequisito: '',
            objetivosBsc: [],
          },
          cenario: {
            historicoEmpresa: '',
            produtosServicos: '',
            regiaoAtuacao: '',
            canaisVenda: '',
            principaisClientes: [],
            principaisFornecedores: [],
            principaisConcorrentes: [],
          },
          swotItems: [],
          partesInteressadas: [],
          planosAcao: [],
          planosAcoes: [],
          riscos: [],
          processos: [],
        },
      },
    }

    const putReqA: any = { method: 'PUT', headers: { cookie: cookieA }, body: payloadA }
    const putResA = createMockRes()
    await strategicHandler(putReqA, putResA as any)
    expect(putResA.getState().status).toBe(200)

    const putReqB: any = { method: 'PUT', headers: { cookie: cookieB }, body: payloadB }
    const putResB = createMockRes()
    await strategicHandler(putReqB, putResB as any)
    expect(putResB.getState().status).toBe(200)

    const getReqA: any = { method: 'GET', headers: { cookie: cookieA } }
    const getResA = createMockRes()
    await strategicHandler(getReqA, getResA as any)
    expect(getResA.getState().status).toBe(200)
    expect(getResA.getState().json.data.anoAtual).toBe('2026')
    expect(getResA.getState().json.data.anos['2026'].direcionamento.missao).toBe('Missão A')
    expect(getResA.getState().json.data.anos['2027']).toBeUndefined()

    const getReqB: any = { method: 'GET', headers: { cookie: cookieB } }
    const getResB = createMockRes()
    await strategicHandler(getReqB, getResB as any)
    expect(getResB.getState().status).toBe(200)
    expect(getResB.getState().json.data.anoAtual).toBe('2027')
    expect(getResB.getState().json.data.anos['2027'].direcionamento.missao).toBe('Missão B')
    expect(getResB.getState().json.data.anos['2026']).toBeUndefined()

    const loginReqA: any = {
      method: 'POST',
      headers: { 'x-tenant': tenantSlugA },
      body: { email: emailA, password },
      socket: { remoteAddress: '127.0.0.1' },
    }
    const loginResA = createMockRes()
    await loginHandler(loginReqA, loginResA as any)
    expect(loginResA.getState().status).toBe(200)

    const loginReqB: any = {
      method: 'POST',
      headers: { 'x-tenant': tenantSlugB },
      body: { email: emailB, password },
      socket: { remoteAddress: '127.0.0.1' },
    }
    const loginResB = createMockRes()
    await loginHandler(loginReqB, loginResB as any)
    expect(loginResB.getState().status).toBe(200)

    await withPgClient(async client => {
      await client.query(`DELETE FROM strategic_planning_years WHERE tenant_id = $1`, [userA.tenantId])
      await client.query(`DELETE FROM strategic_planning_state WHERE tenant_id = $1`, [userA.tenantId])
      await client.query(`DELETE FROM strategic_planning_years WHERE tenant_id = $1`, [userB.tenantId])
      await client.query(`DELETE FROM strategic_planning_state WHERE tenant_id = $1`, [userB.tenantId])
    })
  })
})

describe('Strategic persistence API (perfil em PostgreSQL)', () => {
  const prevDbPath = process.env.SISTEQ_PROFILE_DB_PATH
  const prevStore = process.env.SISTEQ_PROFILE_STORE
  const prevSecret = process.env.SISTEQ_SESSION_SECRET
  const prevDbUrl = process.env.DATABASE_URL

  const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
  const canRun = typeof dbUrl === 'string' && dbUrl.trim().length > 0

  beforeEach(() => {
    process.env.SISTEQ_PROFILE_DB_PATH = ''
    process.env.SISTEQ_PROFILE_STORE = 'pg'
    process.env.SISTEQ_SESSION_SECRET = 'test-secret'
    if (canRun) process.env.DATABASE_URL = dbUrl
  })

  afterEach(() => {
    process.env.SISTEQ_PROFILE_DB_PATH = prevDbPath
    process.env.SISTEQ_PROFILE_STORE = prevStore
    process.env.SISTEQ_SESSION_SECRET = prevSecret
    process.env.DATABASE_URL = prevDbUrl
  })

  it.runIf(canRun)('dados persistem após logout e novo login', async () => {
    await withPgClient(async client => {
      await client.query(`CREATE TABLE IF NOT EXISTS strategic_planning_state (tenant_id TEXT PRIMARY KEY, current_year TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT NOT NULL)`)
      await client.query(`CREATE TABLE IF NOT EXISTS strategic_planning_years (tenant_id TEXT NOT NULL, year TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT NOT NULL, PRIMARY KEY (tenant_id, year))`)
      await client.query(`CREATE TABLE IF NOT EXISTS sisteq_profile_db (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
    })

    const tenantSlug = `tenant-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const email = `admin-${Date.now()}-${Math.random()}@example.com`
    const password = 'Senha@12345'

    const { user } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'Empresa',
      name: 'Admin',
      email,
      password,
    })

    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(user))

    const payload = {
      anoAtual: '2026',
      anos: {
        '2026': {
          direcionamento: {
            missao: 'Missão X',
            visao: '',
            valores: [],
            politicaQualidade: '',
            politicaBsc: [],
            escopoCertificacao: '',
            exclusaoRequisito: '',
            objetivosBsc: [],
          },
          cenario: {
            historicoEmpresa: '',
            produtosServicos: '',
            regiaoAtuacao: '',
            canaisVenda: '',
            principaisClientes: [],
            principaisFornecedores: [],
            principaisConcorrentes: [],
          },
          swotItems: [],
          partesInteressadas: [],
          planosAcao: [],
          planosAcoes: [],
          riscos: [],
          processos: [],
        },
      },
    }

    const putReq: any = { method: 'PUT', headers: { cookie }, body: payload }
    const putRes = createMockRes()
    await strategicHandler(putReq, putRes as any)
    expect(putRes.getState().status).toBe(200)

    const logoutReq: any = { method: 'POST', headers: { cookie } }
    const logoutRes = createMockRes()
    await logoutHandler(logoutReq, logoutRes as any)
    expect(logoutRes.getState().status).toBe(200)

    const loginReq: any = {
      method: 'POST',
      headers: { 'x-tenant': tenantSlug },
      body: { email, password },
      socket: { remoteAddress: '127.0.0.1' },
    }
    const loginRes = createMockRes()
    await loginHandler(loginReq, loginRes as any)
    expect(loginRes.getState().status).toBe(200)
    const newCookie = cookieHeaderFromSetCookie(loginRes.getState().headers['Set-Cookie'])

    const getReq: any = { method: 'GET', headers: { cookie: newCookie } }
    const getRes = createMockRes()
    await strategicHandler(getReq, getRes as any)
    const getState = getRes.getState()
    expect(getState.status).toBe(200)
    expect(getState.json.data.anoAtual).toBe('2026')
    expect(getState.json.data.anos['2026'].direcionamento.missao).toBe('Missão X')

    await withPgClient(async client => {
      await client.query(`DELETE FROM strategic_planning_years WHERE tenant_id = $1`, [user.tenantId])
      await client.query(`DELETE FROM strategic_planning_state WHERE tenant_id = $1`, [user.tenantId])
    })
  })

  it.runIf(canRun)('isola dados entre tenants', async () => {
    await withPgClient(async client => {
      await client.query(
        `CREATE TABLE IF NOT EXISTS strategic_planning_state (tenant_id TEXT PRIMARY KEY, current_year TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT NOT NULL)`,
      )
      await client.query(
        `CREATE TABLE IF NOT EXISTS strategic_planning_years (tenant_id TEXT NOT NULL, year TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_by TEXT NOT NULL, PRIMARY KEY (tenant_id, year))`,
      )
      await client.query(`CREATE TABLE IF NOT EXISTS sisteq_profile_db (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`)
    })

    const tenantSlugA = `tenant-a-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const tenantSlugB = `tenant-b-${Date.now()}-${Math.random().toString(16).slice(2)}`

    const emailA = `admin-a-${Date.now()}-${Math.random()}@example.com`
    const emailB = `admin-b-${Date.now()}-${Math.random()}@example.com`
    const password = 'Senha@12345'

    const { user: userA } = await registerTenantAndUser({
      tenantSlug: tenantSlugA,
      companyName: 'Empresa A',
      name: 'Admin A',
      email: emailA,
      password,
    })
    const { user: userB } = await registerTenantAndUser({
      tenantSlug: tenantSlugB,
      companyName: 'Empresa B',
      name: 'Admin B',
      email: emailB,
      password,
    })

    const cookieA = cookieHeaderFromSetCookie(await createAuthCookiesForUser(userA))
    const cookieB = cookieHeaderFromSetCookie(await createAuthCookiesForUser(userB))

    const payloadA = {
      anoAtual: '2026',
      anos: {
        '2026': {
          direcionamento: {
            missao: 'Missão A',
            visao: '',
            valores: [],
            politicaQualidade: '',
            politicaBsc: [],
            escopoCertificacao: '',
            exclusaoRequisito: '',
            objetivosBsc: [],
          },
          cenario: {
            historicoEmpresa: '',
            produtosServicos: '',
            regiaoAtuacao: '',
            canaisVenda: '',
            principaisClientes: [],
            principaisFornecedores: [],
            principaisConcorrentes: [],
          },
          swotItems: [],
          partesInteressadas: [],
          planosAcao: [],
          planosAcoes: [],
          riscos: [],
          processos: [],
        },
      },
    }

    const payloadB = {
      anoAtual: '2027',
      anos: {
        '2027': {
          direcionamento: {
            missao: 'Missão B',
            visao: '',
            valores: [],
            politicaQualidade: '',
            politicaBsc: [],
            escopoCertificacao: '',
            exclusaoRequisito: '',
            objetivosBsc: [],
          },
          cenario: {
            historicoEmpresa: '',
            produtosServicos: '',
            regiaoAtuacao: '',
            canaisVenda: '',
            principaisClientes: [],
            principaisFornecedores: [],
            principaisConcorrentes: [],
          },
          swotItems: [],
          partesInteressadas: [],
          planosAcao: [],
          planosAcoes: [],
          riscos: [],
          processos: [],
        },
      },
    }

    const putReqA: any = { method: 'PUT', headers: { cookie: cookieA }, body: payloadA }
    const putResA = createMockRes()
    await strategicHandler(putReqA, putResA as any)
    expect(putResA.getState().status).toBe(200)

    const putReqB: any = { method: 'PUT', headers: { cookie: cookieB }, body: payloadB }
    const putResB = createMockRes()
    await strategicHandler(putReqB, putResB as any)
    expect(putResB.getState().status).toBe(200)

    const getReqA: any = { method: 'GET', headers: { cookie: cookieA } }
    const getResA = createMockRes()
    await strategicHandler(getReqA, getResA as any)
    expect(getResA.getState().status).toBe(200)
    expect(getResA.getState().json.data.anoAtual).toBe('2026')
    expect(getResA.getState().json.data.anos['2026'].direcionamento.missao).toBe('Missão A')
    expect(getResA.getState().json.data.anos['2027']).toBeUndefined()

    const getReqB: any = { method: 'GET', headers: { cookie: cookieB } }
    const getResB = createMockRes()
    await strategicHandler(getReqB, getResB as any)
    expect(getResB.getState().status).toBe(200)
    expect(getResB.getState().json.data.anoAtual).toBe('2027')
    expect(getResB.getState().json.data.anos['2027'].direcionamento.missao).toBe('Missão B')
    expect(getResB.getState().json.data.anos['2026']).toBeUndefined()

    const loginReqA: any = {
      method: 'POST',
      headers: { 'x-tenant': tenantSlugA },
      body: { email: emailA, password },
      socket: { remoteAddress: '127.0.0.1' },
    }
    const loginResA = createMockRes()
    await loginHandler(loginReqA, loginResA as any)
    expect(loginResA.getState().status).toBe(200)

    const loginReqB: any = {
      method: 'POST',
      headers: { 'x-tenant': tenantSlugB },
      body: { email: emailB, password },
      socket: { remoteAddress: '127.0.0.1' },
    }
    const loginResB = createMockRes()
    await loginHandler(loginReqB, loginResB as any)
    expect(loginResB.getState().status).toBe(200)

    await withPgClient(async client => {
      await client.query(`DELETE FROM strategic_planning_years WHERE tenant_id = $1`, [userA.tenantId])
      await client.query(`DELETE FROM strategic_planning_state WHERE tenant_id = $1`, [userA.tenantId])
      await client.query(`DELETE FROM strategic_planning_years WHERE tenant_id = $1`, [userB.tenantId])
      await client.query(`DELETE FROM strategic_planning_state WHERE tenant_id = $1`, [userB.tenantId])
    })
  })
})
