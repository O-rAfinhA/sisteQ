import path from 'path'
import os from 'os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getServerSideProps } from '../../pages/[[...path]]'
import { createAuthCookiesForUser, registerTenantAndUser } from './profile'

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

describe('SSR auth guard (catch-all)', () => {
  const prevDbPath = process.env.SISTEQ_PROFILE_DB_PATH
  const prevSecret = process.env.SISTEQ_SESSION_SECRET
  const tmpDir = path.join(os.tmpdir(), 'sisteq-ssr-auth-guard-tests')
  let dbPath = path.join(tmpDir, `profile_${Date.now()}.json`)

  beforeEach(() => {
    dbPath = path.join(tmpDir, `profile_${Date.now()}_${Math.random().toString(16).slice(2)}.json`)
    process.env.SISTEQ_PROFILE_DB_PATH = dbPath
    process.env.SISTEQ_SESSION_SECRET = 'test-secret'
  })

  afterEach(() => {
    process.env.SISTEQ_PROFILE_DB_PATH = prevDbPath
    process.env.SISTEQ_SESSION_SECRET = prevSecret
  })

  it('redireciona para /login quando não autenticado', async () => {
    const ctx: any = {
      resolvedUrl: '/gestao-estrategica',
      query: {},
      req: { headers: {} },
    }
    const result: any = await getServerSideProps(ctx)
    expect(result.redirect).toBeTruthy()
    expect(result.redirect.destination).toBe('/login?next=%2Fgestao-estrategica')
  })

  it('retorna props quando autenticado', async () => {
    const { user } = await registerTenantAndUser({
      tenantSlug: 'acme',
      companyName: 'ACME',
      name: 'Test User',
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(user))

    const ctx: any = {
      resolvedUrl: '/gestao-estrategica',
      query: {},
      req: { headers: { cookie } },
    }
    const result: any = await getServerSideProps(ctx)
    expect(result.props).toBeTruthy()
    expect(result.props.routeKey).toBe('DirecionamentoEstrategico')
  })

  it('redireciona para next quando acessa /login autenticado', async () => {
    const { user } = await registerTenantAndUser({
      tenantSlug: 'acme',
      companyName: 'ACME',
      name: 'Test User',
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(user))

    const ctx: any = {
      resolvedUrl: '/login?next=/perfil',
      query: { next: '/perfil' },
      req: { headers: { cookie } },
    }
    const result: any = await getServerSideProps(ctx)
    expect(result.redirect).toBeTruthy()
    expect(result.redirect.destination).toBe('/perfil')
  })
})
