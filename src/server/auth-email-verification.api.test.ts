import { describe, expect, it, vi } from 'vitest'
import path from 'path'
import os from 'os'
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

function tmpProfileDbPath(prefix: string) {
  return path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`)
}

describe('Auth email verification flow', () => {
  it('bloqueia login até verificar e permite verificar com código', async () => {
    await withEnv(
      {
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpProfileDbPath('sisteq-auth-email-dev'),
        SISTEQ_SESSION_SECRET: 'test-secret',
        DATABASE_URL: undefined,
      },
      async () => {
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
        const code = reg.json?.dev?.verificationCode
        expect(typeof code).toBe('string')

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

        const reqVerify: any = { method: 'POST', headers: { 'x-tenant': tenantSlug }, body: { email, code } }
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
      },
    )
  }, 20_000)

  it('reenvia código em dev e permite confirmar', async () => {
    await withEnv(
      {
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpProfileDbPath('sisteq-auth-email-dev-resend'),
        SISTEQ_SESSION_SECRET: 'test-secret',
        DATABASE_URL: undefined,
      },
      async () => {
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
        const code = resend.json?.dev?.verificationCode
        expect(typeof code).toBe('string')

        const reqVerify: any = { method: 'POST', headers: { 'x-tenant': tenantSlug }, body: { email, code } }
        const resVerify = createMockRes()
        await verifyEmailHandler(reqVerify, resVerify as any)
        expect(resVerify.getState().status).toBe(200)
      },
    )
  }, 20_000)

  it('retorna erro específico para código inválido, expirado e limite excedido', async () => {
    await withEnv(
      {
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpProfileDbPath('sisteq-auth-email-code-errors'),
        SISTEQ_SESSION_SECRET: 'test-secret',
        DATABASE_URL: undefined,
      },
      async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
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
        const code = reg.json?.dev?.verificationCode
        expect(typeof code).toBe('string')

        const wrongCode = 'AAAAAA'
        for (let i = 0; i < 4; i++) {
          const reqBad: any = { method: 'POST', headers: { 'x-tenant': tenantSlug }, body: { email, code: wrongCode } }
          const resBad = createMockRes()
          await verifyEmailHandler(reqBad, resBad as any)
          expect(resBad.getState().status).toBe(400)
          expect(String(resBad.getState().json?.error || '')).toMatch(/código inválido/i)
        }
        const reqLock: any = { method: 'POST', headers: { 'x-tenant': tenantSlug }, body: { email, code: wrongCode } }
        const resLock = createMockRes()
        await verifyEmailHandler(reqLock, resLock as any)
        expect(resLock.getState().status).toBe(400)
        expect(String(resLock.getState().json?.error || '')).toMatch(/limite de tentativas excedido/i)

        const tenantSlug2 = `t2-${Date.now()}-${Math.random().toString(16).slice(2)}`
        const email2 = `user2-${Date.now()}-${Math.random()}@example.com`
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
        const reqRegister2: any = {
          method: 'POST',
          headers: {},
          body: { tenantSlug: tenantSlug2, companyName: 'Empresa', name: 'Admin', email: email2, password },
        }
        const resRegister2 = createMockRes()
        await registerHandler(reqRegister2, resRegister2 as any)
        const code2 = resRegister2.getState().json?.dev?.verificationCode
        expect(typeof code2).toBe('string')

        vi.setSystemTime(new Date('2026-01-01T00:16:00.000Z'))
        const reqExpired: any = { method: 'POST', headers: { 'x-tenant': tenantSlug2 }, body: { email: email2, code: code2 } }
        const resExpired = createMockRes()
        await verifyEmailHandler(reqExpired, resExpired as any)
        expect(resExpired.getState().status).toBe(400)
        expect(String(resExpired.getState().json?.error || '')).toMatch(/código expirado/i)
        vi.useRealTimers()
      },
    )
  }, 20_000)

  it('responde em menos de 2 segundos para cadastro + verificação por código', async () => {
    await withEnv(
      {
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpProfileDbPath('sisteq-auth-email-code-perf'),
        SISTEQ_SESSION_SECRET: 'test-secret',
        DATABASE_URL: undefined,
      },
      async () => {
        const start = Date.now()
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
        const code = resRegister.getState().json?.dev?.verificationCode
        expect(typeof code).toBe('string')

        const reqVerify: any = { method: 'POST', headers: { 'x-tenant': tenantSlug }, body: { email, code } }
        const resVerify = createMockRes()
        await verifyEmailHandler(reqVerify, resVerify as any)
        expect(resVerify.getState().status).toBe(200)

        expect(Date.now() - start).toBeLessThan(2_000)
      },
    )
  }, 20_000)

  it('permite modo token em produção (sem Resend) e verifica via URL', async () => {
    const tmpDbPath = path.join(os.tmpdir(), `sisteq-auth-email-prod-token-${Date.now()}-${Math.random().toString(16).slice(2)}.json`)
    await withEnv(
      {
        NODE_ENV: 'production',
        SISTEQ_EMAIL_VERIFICATION_MODE: 'token',
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpDbPath,
        DATABASE_URL: undefined,
      },
      async () => {
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
      },
    )
  })

  it('permite modo disabled em produção (auto-verifica no cadastro)', async () => {
    const tmpDbPath = path.join(os.tmpdir(), `sisteq-auth-email-prod-disabled-${Date.now()}-${Math.random().toString(16).slice(2)}.json`)
    await withEnv(
      {
        NODE_ENV: 'production',
        SISTEQ_EMAIL_VERIFICATION_MODE: 'disabled',
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpDbPath,
        DATABASE_URL: undefined,
      },
      async () => {
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
      },
    )
  }, 15_000)
})
