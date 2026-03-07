import path from 'path'
import os from 'os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getServerSideProps } from '../../pages/[[...path]]'
import { changePassword, createAuthCookiesForUser, createUserAsAdmin, loginWithEmailPassword, registerTenantAndUser } from './profile'

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
  const prevStore = process.env.SISTEQ_PROFILE_STORE
  const tmpDir = path.join(os.tmpdir(), 'sisteq-ssr-auth-guard-tests')
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

  it('permite landing pública quando não autenticado', async () => {
    const ctx: any = {
      resolvedUrl: '/',
      query: {},
      req: { headers: {} },
    }
    const result: any = await getServerSideProps(ctx)
    expect(result.redirect).toBeFalsy()
    expect(result.props).toBeTruthy()
    expect(result.props.routeKey).toBe('Landing')
    expect(result.props.pathname).toBe('/')
  })

  it('redireciona landing para app quando autenticado', async () => {
    const { user } = await registerTenantAndUser({
      tenantSlug: 'acme',
      companyName: 'ACME',
      name: 'Test User',
      email: `test-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(user))

    const ctx: any = {
      resolvedUrl: '/',
      query: {},
      req: { headers: { cookie } },
    }
    const result: any = await getServerSideProps(ctx)
    expect(result.redirect).toBeTruthy()
    expect(result.redirect.destination).toBe(`/empresa/${encodeURIComponent(user.tenantId)}/gestao-estrategica`)
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
      resolvedUrl: `/empresa/${encodeURIComponent(user.tenantId)}/gestao-estrategica`,
      query: {},
      req: { headers: { cookie } },
    }
    const result: any = await getServerSideProps(ctx)
    expect(result.props).toBeTruthy()
    expect(result.props.routeKey).toBe('DirecionamentoEstrategico')
    expect(result.props.pathname).toBe('/gestao-estrategica')
    expect(result.props.params.companyId).toBe(user.tenantId)
  })

  it('força troca de senha no primeiro login', async () => {
    const tenantSlug = `acme-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const { tenant, user: admin } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'ACME',
      name: 'Admin',
      email: `admin-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })

    const email = `user-${Date.now()}-${Math.random()}@example.com`
    const temporaryPassword = 'Senha@12345'
    await createUserAsAdmin(tenant.id, admin.id, { name: 'Usuário', email, password: temporaryPassword })

    const createdUser = await loginWithEmailPassword({
      tenantId: tenant.id,
      email,
      password: temporaryPassword,
      rateKey: `ssr:${tenant.id}:${email}`,
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(createdUser))

    const ctxProtected: any = {
      resolvedUrl: `/empresa/${encodeURIComponent(tenant.id)}/gestao-estrategica`,
      query: {},
      req: { headers: { cookie } },
    }
    const first: any = await getServerSideProps(ctxProtected)
    expect(first.redirect).toBeTruthy()
    expect(first.redirect.destination).toBe(`/empresa/${encodeURIComponent(tenant.id)}/perfil?tab=password`)

    const ctxPassword: any = {
      resolvedUrl: `/empresa/${encodeURIComponent(tenant.id)}/perfil?tab=password`,
      query: { tab: 'password' },
      req: { headers: { cookie } },
    }
    const onPassword: any = await getServerSideProps(ctxPassword)
    expect(onPassword.redirect).toBeFalsy()
    expect(onPassword.props.routeKey).toBe('Perfil')

    await changePassword(tenant.id, createdUser.id, { currentPassword: temporaryPassword, newPassword: 'SenhaNova@123456' })

    const after: any = await getServerSideProps(ctxProtected)
    expect(after.redirect).toBeFalsy()
    expect(after.props).toBeTruthy()
    expect(after.props.routeKey).toBe('DirecionamentoEstrategico')
  })

  it('bloqueia configurações para usuário não-admin', async () => {
    const tenantSlug = `acme-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const { tenant, user: admin } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'ACME',
      name: 'Admin',
      email: `admin-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })

    const email = `user-${Date.now()}-${Math.random()}@example.com`
    const temporaryPassword = 'Senha@12345'
    await createUserAsAdmin(tenant.id, admin.id, { name: 'Usuário', email, password: temporaryPassword })

    const createdUser = await loginWithEmailPassword({
      tenantId: tenant.id,
      email,
      password: temporaryPassword,
      rateKey: `ssr:${tenant.id}:${email}`,
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(createdUser))
    await changePassword(tenant.id, createdUser.id, { currentPassword: temporaryPassword, newPassword: 'SenhaNova@123456' })

    const ctxConfig: any = {
      resolvedUrl: `/empresa/${encodeURIComponent(tenant.id)}/configuracoes/usuarios`,
      query: {},
      req: { headers: { cookie } },
    }
    const result: any = await getServerSideProps(ctxConfig)
    expect(result.redirect).toBeTruthy()
    expect(result.redirect.destination).toBe(`/empresa/${encodeURIComponent(tenant.id)}/gestao-estrategica`)
  }, 15_000)

  it('permite configurações para Administrador', async () => {
    const tenantSlug = `acme-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const { user } = await registerTenantAndUser({
      tenantSlug,
      companyName: 'ACME',
      name: 'Admin',
      email: `admin-${Date.now()}-${Math.random()}@example.com`,
      password: 'Senha@12345',
    })
    const cookie = cookieHeaderFromSetCookie(await createAuthCookiesForUser(user))

    const ctxConfig: any = {
      resolvedUrl: `/empresa/${encodeURIComponent(user.tenantId)}/configuracoes/usuarios`,
      query: {},
      req: { headers: { cookie } },
    }
    const result: any = await getServerSideProps(ctxConfig)
    expect(result.redirect).toBeFalsy()
    expect(result.props).toBeTruthy()
    expect(result.props.routeKey).toBe('Usuarios')
    expect(result.props.pathname).toBe('/configuracoes/usuarios')
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
    expect(result.redirect.destination).toBe(`/empresa/${encodeURIComponent(user.tenantId)}/perfil`)
  })
})
