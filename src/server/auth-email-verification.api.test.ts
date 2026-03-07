import { describe, expect, it, vi } from 'vitest'
import path from 'path'
import os from 'os'

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

function tmpTenantKvDbPath(prefix: string) {
  return path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`)
}

async function loadHandlers() {
  const [register, login, verifyEmail, resend] = await Promise.all([
    import('../../pages/api/auth/register'),
    import('../../pages/api/auth/login'),
    import('../../pages/api/auth/verify-email'),
    import('../../pages/api/auth/resend-verification'),
  ])
  return {
    registerHandler: register.default,
    loginHandler: login.default,
    verifyEmailHandler: verifyEmail.default,
    resendHandler: resend.default,
  }
}

describe('Auth email verification flow', () => {
  it('bloqueia login até verificar e permite verificar com código', async () => {
    await withEnv(
      {
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpProfileDbPath('sisteq-auth-email-dev'),
        SISTEQ_TENANT_KV_DB_PATH: tmpTenantKvDbPath('sisteq-auth-email-dev-kv'),
        SISTEQ_SESSION_SECRET: 'test-secret',
        SISTEQ_EMAIL_DOMAIN_CHECK: '0',
        DATABASE_URL: undefined,
      },
      async () => {
        vi.resetModules()
        const { registerHandler, loginHandler, verifyEmailHandler } = await loadHandlers()
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
        expect(reg.json.verificationRequired).toBe(true)
        expect(reg.json.verificationMethod).toBe('code')
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

  it('permite login quando modo disabled mesmo se usuário ainda não verificou', async () => {
    await withEnv(
      {
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpProfileDbPath('sisteq-auth-email-disabled-login'),
        SISTEQ_TENANT_KV_DB_PATH: tmpTenantKvDbPath('sisteq-auth-email-disabled-login-kv'),
        SISTEQ_SESSION_SECRET: 'test-secret',
        SISTEQ_EMAIL_VERIFICATION_MODE: 'required',
        SISTEQ_EMAIL_DOMAIN_CHECK: '0',
        DATABASE_URL: undefined,
      },
      async () => {
        vi.resetModules()
        const { registerHandler, loginHandler } = await loadHandlers()
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

        const reqLoginBefore: any = {
          method: 'POST',
          headers: { 'x-tenant': tenantSlug },
          body: { email, password },
          socket: { remoteAddress: '127.0.0.1' },
        }
        const resLoginBefore = createMockRes()
        await loginHandler(reqLoginBefore, resLoginBefore as any)
        expect(resLoginBefore.getState().status).toBe(401)
        expect(String(resLoginBefore.getState().json?.error || '')).toMatch(/não verificado/i)

        process.env.SISTEQ_EMAIL_VERIFICATION_MODE = 'disabled'

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
  }, 20_000)

  it('reenvia código em dev e permite confirmar', async () => {
    await withEnv(
      {
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpProfileDbPath('sisteq-auth-email-dev-resend'),
        SISTEQ_TENANT_KV_DB_PATH: tmpTenantKvDbPath('sisteq-auth-email-dev-resend-kv'),
        SISTEQ_SESSION_SECRET: 'test-secret',
        SISTEQ_EMAIL_DOMAIN_CHECK: '0',
        DATABASE_URL: undefined,
      },
      async () => {
        vi.resetModules()
        const { registerHandler, resendHandler, verifyEmailHandler } = await loadHandlers()
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
        SISTEQ_TENANT_KV_DB_PATH: tmpTenantKvDbPath('sisteq-auth-email-code-errors-kv'),
        SISTEQ_SESSION_SECRET: 'test-secret',
        SISTEQ_EMAIL_DOMAIN_CHECK: '0',
        DATABASE_URL: undefined,
      },
      async () => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
        vi.resetModules()
        const { registerHandler, verifyEmailHandler } = await loadHandlers()
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
        SISTEQ_TENANT_KV_DB_PATH: tmpTenantKvDbPath('sisteq-auth-email-code-perf-kv'),
        SISTEQ_SESSION_SECRET: 'test-secret',
        SISTEQ_EMAIL_DOMAIN_CHECK: '0',
        DATABASE_URL: undefined,
      },
      async () => {
        const start = Date.now()
        vi.resetModules()
        const { registerHandler, verifyEmailHandler } = await loadHandlers()
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

  it('permite modo token em produção e verifica via token do e-mail enviado', async () => {
    const tmpDbPath = path.join(os.tmpdir(), `sisteq-auth-email-prod-token-${Date.now()}-${Math.random().toString(16).slice(2)}.json`)
    await withEnv(
      {
        NODE_ENV: 'production',
        SISTEQ_EMAIL_VERIFICATION_MODE: 'token',
        SISTEQ_EMAIL_FROM: 'no-reply@example.com',
        SISTEQ_SMTP_HOST: 'smtp.example.com',
        SISTEQ_ALLOW_FILE_FALLBACK: '1',
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpDbPath,
        SISTEQ_TENANT_KV_DB_PATH: tmpTenantKvDbPath('sisteq-auth-email-prod-token-kv'),
        SISTEQ_EMAIL_DOMAIN_CHECK: '0',
        DATABASE_URL: undefined,
      },
      async () => {
      const capturedUrls: string[] = []
      vi.resetModules()
      vi.doMock('@/server/email', async () => {
        const actual = await vi.importActual<any>('@/server/email')
        return {
          ...actual,
          sendVerificationEmail: vi.fn(async (opts: any) => {
            capturedUrls.push(String(opts?.verificationUrl || ''))
            return { ok: true, provider: 'smtp', id: 'test' }
          }),
        }
      })
      const { registerHandler, loginHandler, verifyEmailHandler } = await loadHandlers()
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
      expect(reg.json.verificationRequired).toBe(true)
      expect(reg.json.verificationMethod).toBe('token')
      expect(reg.json.emailSent).toBe(true)

      expect(capturedUrls.length).toBe(1)
      const url = new URL(String(capturedUrls[0]))
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
        SISTEQ_ALLOW_FILE_FALLBACK: '1',
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpDbPath,
        SISTEQ_TENANT_KV_DB_PATH: tmpTenantKvDbPath('sisteq-auth-email-prod-disabled-kv'),
        SISTEQ_EMAIL_DOMAIN_CHECK: '0',
        DATABASE_URL: undefined,
      },
      async () => {
      vi.resetModules()
      const { registerHandler, loginHandler } = await loadHandlers()
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

  it('troca token no reenvio e invalida o token anterior', async () => {
    const tmpDbPath = path.join(os.tmpdir(), `sisteq-auth-email-prod-token-rotate-${Date.now()}-${Math.random().toString(16).slice(2)}.json`)
    await withEnv(
      {
        NODE_ENV: 'production',
        SISTEQ_EMAIL_VERIFICATION_MODE: 'token',
        SISTEQ_EMAIL_FROM: 'no-reply@example.com',
        SISTEQ_SMTP_HOST: 'smtp.example.com',
        SISTEQ_ALLOW_FILE_FALLBACK: '1',
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpDbPath,
        SISTEQ_TENANT_KV_DB_PATH: tmpTenantKvDbPath('sisteq-auth-email-prod-token-rotate-kv'),
        SISTEQ_EMAIL_DOMAIN_CHECK: '0',
        DATABASE_URL: undefined,
      },
      async () => {
        const capturedUrls: string[] = []
        vi.resetModules()
        vi.doMock('@/server/email', async () => {
          const actual = await vi.importActual<any>('@/server/email')
          return {
            ...actual,
            sendVerificationEmail: vi.fn(async (opts: any) => {
              capturedUrls.push(String(opts?.verificationUrl || ''))
              return { ok: true, provider: 'smtp', id: 'test' }
            }),
          }
        })
        const { registerHandler, resendHandler, verifyEmailHandler } = await loadHandlers()
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
        expect(capturedUrls.length).toBe(1)
        const url1 = new URL(String(capturedUrls[0]))
        const token1 = url1.searchParams.get('token')
        expect(typeof token1).toBe('string')

        const reqResend: any = {
          method: 'POST',
          headers: { 'x-tenant': tenantSlug },
          body: { email },
          socket: { remoteAddress: '127.0.0.1' },
        }
        const resResend = createMockRes()
        await resendHandler(reqResend, resResend as any)
        expect(resResend.getState().status).toBe(200)
        expect(capturedUrls.length).toBe(2)
        const url2 = new URL(String(capturedUrls[1]))
        const token2 = url2.searchParams.get('token')
        expect(typeof token2).toBe('string')
        expect(token2).not.toBe(token1)

        const reqVerifyOld: any = { method: 'POST', headers: {}, body: { token: token1 } }
        const resVerifyOld = createMockRes()
        await verifyEmailHandler(reqVerifyOld, resVerifyOld as any)
        expect(resVerifyOld.getState().status).toBe(400)
        expect(String(resVerifyOld.getState().json?.error || '')).toMatch(/token inválido|token expirado|token já utilizado/i)

        const reqVerifyNew: any = { method: 'POST', headers: {}, body: { token: token2 } }
        const resVerifyNew = createMockRes()
        await verifyEmailHandler(reqVerifyNew, resVerifyNew as any)
        expect(resVerifyNew.getState().status).toBe(200)
      },
    )
  })

  it('bloqueia reenvio quando excede limite por hora', async () => {
    await withEnv(
      {
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpProfileDbPath('sisteq-auth-email-resend-limit'),
        SISTEQ_TENANT_KV_DB_PATH: tmpTenantKvDbPath('sisteq-auth-email-resend-limit-kv'),
        SISTEQ_SESSION_SECRET: 'test-secret',
        SISTEQ_EMAIL_RESEND_MAX_PER_HOUR: '2',
        SISTEQ_EMAIL_DOMAIN_CHECK: '0',
        DATABASE_URL: undefined,
      },
      async () => {
        vi.resetModules()
        const { registerHandler, resendHandler } = await loadHandlers()
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

        const makeReq = () =>
          ({
            method: 'POST',
            headers: { 'x-tenant': tenantSlug },
            body: { email },
            socket: { remoteAddress: '127.0.0.1' },
          }) as any

        const r1 = createMockRes()
        await resendHandler(makeReq(), r1 as any)
        expect(r1.getState().status).toBe(200)

        const r2 = createMockRes()
        await resendHandler(makeReq(), r2 as any)
        expect(r2.getState().status).toBe(200)

        const r3 = createMockRes()
        await resendHandler(makeReq(), r3 as any)
        expect(r3.getState().status).toBe(400)
        expect(String(r3.getState().json?.error || '')).toMatch(/limite de reenvio excedido/i)
      },
    )
  })

  it('valida domínio do e-mail quando habilitado (domínio inexistente)', async () => {
    await withEnv(
      {
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpProfileDbPath('sisteq-auth-email-domain-invalid'),
        SISTEQ_TENANT_KV_DB_PATH: tmpTenantKvDbPath('sisteq-auth-email-domain-invalid-kv'),
        SISTEQ_SESSION_SECRET: 'test-secret',
        SISTEQ_EMAIL_DOMAIN_CHECK: '1',
        DATABASE_URL: undefined,
      },
      async () => {
        vi.resetModules()
        vi.doMock('dns/promises', () => ({
          default: {
            resolveMx: vi.fn().mockResolvedValue([]),
            resolve4: vi.fn().mockRejectedValue(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })),
            resolve6: vi.fn().mockRejectedValue(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' })),
          },
        }))
        const { registerHandler } = await loadHandlers()

        const tenantSlug = `t-${Date.now()}-${Math.random().toString(16).slice(2)}`
        const email = `user-${Date.now()}@inexistente.tld`
        const password = 'Senha@12345'

        const reqRegister: any = {
          method: 'POST',
          headers: {},
          body: { tenantSlug, companyName: 'Empresa', name: 'Admin', email, password },
        }
        const resRegister = createMockRes()
        await registerHandler(reqRegister, resRegister as any)
        expect(resRegister.getState().status).toBe(400)
        expect(String(resRegister.getState().json?.error || '')).toMatch(/e-mail inválido/i)
      },
    )
  })

  it('retorna erro amigável quando validação DNS falha transitoriamente', async () => {
    await withEnv(
      {
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpProfileDbPath('sisteq-auth-email-domain-transient'),
        SISTEQ_TENANT_KV_DB_PATH: tmpTenantKvDbPath('sisteq-auth-email-domain-transient-kv'),
        SISTEQ_SESSION_SECRET: 'test-secret',
        SISTEQ_EMAIL_DOMAIN_CHECK: '1',
        DATABASE_URL: undefined,
      },
      async () => {
        vi.resetModules()
        vi.doMock('dns/promises', () => ({
          default: {
            resolveMx: vi.fn().mockRejectedValue(Object.assign(new Error('EAI_AGAIN'), { code: 'EAI_AGAIN' })),
            resolve4: vi.fn(),
            resolve6: vi.fn(),
          },
        }))
        const { registerHandler } = await loadHandlers()

        const tenantSlug = `t-${Date.now()}-${Math.random().toString(16).slice(2)}`
        const email = `user-${Date.now()}@example.com`
        const password = 'Senha@12345'

        const reqRegister: any = {
          method: 'POST',
          headers: {},
          body: { tenantSlug, companyName: 'Empresa', name: 'Admin', email, password },
        }
        const resRegister = createMockRes()
        await registerHandler(reqRegister, resRegister as any)
        expect(resRegister.getState().status).toBe(400)
        expect(String(resRegister.getState().json?.error || '')).toMatch(/não foi possível validar o domínio/i)
      },
    )
  })

  it('em produção, expõe emailServiceConfigured=false quando SMTP não está configurado', async () => {
    await withEnv(
      {
        NODE_ENV: 'production',
        SISTEQ_EMAIL_VERIFICATION_MODE: 'code',
        SISTEQ_ALLOW_FILE_FALLBACK: '1',
        SISTEQ_PROFILE_STORE: 'file',
        SISTEQ_PROFILE_DB_PATH: tmpProfileDbPath('sisteq-auth-email-prod-smtp-missing'),
        SISTEQ_TENANT_KV_DB_PATH: tmpTenantKvDbPath('sisteq-auth-email-prod-smtp-missing-kv'),
        SISTEQ_EMAIL_DOMAIN_CHECK: '0',
        DATABASE_URL: undefined,
      },
      async () => {
        vi.resetModules()
        const { registerHandler, resendHandler } = await loadHandlers()
        const healthHandler = (await import('../../pages/api/health')).default

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
        expect(resend.json.emailServiceConfigured).toBe(false)

        const reqHealth: any = { method: 'GET', headers: {} }
        const resHealth = createMockRes()
        await healthHandler(reqHealth, resHealth as any)
        const health = resHealth.getState()
        expect(health.status).toBe(200)
        expect(health.json.ok).toBe(true)
        expect(health.json.email?.configured).toBe(false)
      },
    )
  }, 20_000)
})
