import { describe, expect, it } from 'vitest'
import registerHandler from '../../pages/api/auth/register'
import loginHandler from '../../pages/api/auth/login'
import verifyEmailHandler from '../../pages/api/auth/verify-email'
import resendHandler from '../../pages/api/auth/resend-verification'

function createMockRes() {
  const state: { status: number; json: any; headers: Record<string, any>; redirect?: { status: number; url: string } } = {
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
    redirect(code: number, url: string) {
      state.redirect = { status: code, url }
      state.status = code
      return res
    },
    getState() {
      return state
    },
  }
  return res
}

async function withEnv<T>(nextEnv: Record<string, string | undefined>, fn: () => Promise<T>) {
  const prev: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(nextEnv)) {
    prev[k] = process.env[k]
    if (typeof v === 'undefined') delete process.env[k]
    else process.env[k] = v
  }
  try {
    return await fn()
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (typeof v === 'undefined') delete process.env[k]
      else process.env[k] = v
    }
  }
}

describe('Auth email verification flow', () => {
  it('bloqueia login até verificar e permite verificar com token', async () => {
    const tenantSlug = `t-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const email = `user-${Date.now()}-${Math.random()}@example.com`
    const password = 'Senha@12345'

    const reqRegister: any = {
      method: 'POST',
      headers: {},
      body: { tenantSlug, companyName: 'Empresa', name: 'Admin', email, password },
    }
    const resRegister = createMockRes()
    await registerHandler(reqRegister, resRegister as any)
    const reg = resRegister.getState()
    expect(reg.status).toBe(201)
    expect(reg.json.ok).toBe(true)
    const token = reg.json?.dev?.verificationToken
    expect(typeof token).toBe('string')

    const reqLoginBefore: any = {
      method: 'POST',
      headers: { 'x-tenant': tenantSlug },
      body: { email, password },
      socket: { remoteAddress: '127.0.0.1' },
    }
    const resLoginBefore = createMockRes()
    await loginHandler(reqLoginBefore, resLoginBefore as any)
    const before = resLoginBefore.getState()
    expect(before.status).toBe(401)
    expect(String(before.json?.error || '')).toMatch(/não verificado/i)

    const reqVerify: any = { method: 'POST', headers: {}, body: { token } }
    const resVerify = createMockRes()
    await verifyEmailHandler(reqVerify, resVerify as any)
    const verified = resVerify.getState()
    expect(verified.status).toBe(200)
    expect(verified.json.ok).toBe(true)

    const reqLoginAfter: any = {
      method: 'POST',
      headers: { 'x-tenant': tenantSlug },
      body: { email, password },
      socket: { remoteAddress: '127.0.0.1' },
    }
    const resLoginAfter = createMockRes()
    await loginHandler(reqLoginAfter, resLoginAfter as any)
    const after = resLoginAfter.getState()
    expect(after.status).toBe(200)
    expect(after.headers['Set-Cookie']).toBeTruthy()
  })

  it('reenvia token em dev e GET redireciona para /login com parâmetros', async () => {
    const tenantSlug = `t-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const email = `user-${Date.now()}-${Math.random()}@example.com`
    const password = 'Senha@12345'

    const reqRegister: any = {
      method: 'POST',
      headers: {},
      body: { tenantSlug, companyName: 'Empresa', name: 'Admin', email, password },
    }
    const resRegister = createMockRes()
    await registerHandler(reqRegister, resRegister as any)
    expect(resRegister.getState().status).toBe(201)

    const reqResend: any = {
      method: 'POST',
      headers: { 'x-tenant': tenantSlug },
      body: { email },
      socket: { remoteAddress: '127.0.0.1' },
    }
    const resResend = createMockRes()
    await resendHandler(reqResend, resResend as any)
    const resend = resResend.getState()
    expect(resend.status).toBe(200)
    expect(resend.json.ok).toBe(true)
    const token = resend.json?.dev?.verificationToken
    expect(typeof token).toBe('string')

    const reqVerifyGet: any = {
      method: 'GET',
      headers: {},
      query: { token, tenant: tenantSlug, next: '/perfil' },
    }
    const resVerifyGet = createMockRes()
    await verifyEmailHandler(reqVerifyGet, resVerifyGet as any)
    const redir = resVerifyGet.getState().redirect
    expect(redir?.status).toBe(302)
    expect(String(redir?.url || '')).toMatch(/^\/login\?/)
    expect(String(redir?.url || '')).toMatch(/verified=1/)
    expect(String(redir?.url || '')).toMatch(/tenant=/)
    expect(String(redir?.url || '')).toMatch(/next=%2Fperfil/)
  })

  it('permite modo token em produção (sem Resend) e verifica via URL', async () => {
    await withEnv({ NODE_ENV: 'production', SISTEQ_EMAIL_VERIFICATION_MODE: 'token' }, async () => {
      const tenantSlug = `t-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const email = `user-${Date.now()}-${Math.random()}@example.com`
      const password = 'Senha@12345'

      const reqRegister: any = {
        method: 'POST',
        headers: {},
        body: { tenantSlug, companyName: 'Empresa', name: 'Admin', email, password },
      }
      const resRegister = createMockRes()
      await registerHandler(reqRegister, resRegister as any)
      const reg = resRegister.getState()
      expect(reg.status).toBe(201)
      expect(reg.json.ok).toBe(true)
      expect(typeof reg.json.verificationUrl).toBe('string')

      const url = new URL(String(reg.json.verificationUrl))
      const token = url.searchParams.get('token')
      expect(typeof token).toBe('string')

      const reqVerify: any = { method: 'POST', headers: {}, body: { token } }
      const resVerify = createMockRes()
      await verifyEmailHandler(reqVerify, resVerify as any)
      expect(resVerify.getState().status).toBe(200)

      const reqLoginAfter: any = {
        method: 'POST',
        headers: { 'x-tenant': tenantSlug },
        body: { email, password },
        socket: { remoteAddress: '127.0.0.1' },
      }
      const resLoginAfter = createMockRes()
      await loginHandler(reqLoginAfter, resLoginAfter as any)
      expect(resLoginAfter.getState().status).toBe(200)
    })
  })

  it('permite modo disabled em produção (auto-verifica no cadastro)', async () => {
    await withEnv({ NODE_ENV: 'production', SISTEQ_EMAIL_VERIFICATION_MODE: 'disabled' }, async () => {
      const tenantSlug = `t-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const email = `user-${Date.now()}-${Math.random()}@example.com`
      const password = 'Senha@12345'

      const reqRegister: any = {
        method: 'POST',
        headers: {},
        body: { tenantSlug, companyName: 'Empresa', name: 'Admin', email, password },
      }
      const resRegister = createMockRes()
      await registerHandler(reqRegister, resRegister as any)
      const reg = resRegister.getState()
      expect(reg.status).toBe(201)
      expect(reg.json.ok).toBe(true)
      expect(reg.json.emailVerified).toBe(true)

      const reqLogin: any = {
        method: 'POST',
        headers: { 'x-tenant': tenantSlug },
        body: { email, password },
        socket: { remoteAddress: '127.0.0.1' },
      }
      const resLogin = createMockRes()
      await loginHandler(reqLogin, resLogin as any)
      expect(resLogin.getState().status).toBe(200)
    })
  })
})
