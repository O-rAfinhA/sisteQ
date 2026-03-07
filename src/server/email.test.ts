import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const prevEnv = { ...process.env }

const sendMail = vi.fn()
const verify = vi.fn()
const createTransport = vi.fn(() => ({ sendMail, verify }))

vi.mock('nodemailer', () => ({
  default: { createTransport },
}))

async function loadEmailModule() {
  return await import('./email')
}

beforeEach(() => {
  vi.resetModules()
  sendMail.mockReset()
  verify.mockReset()
  createTransport.mockClear()
})

afterEach(() => {
  process.env = { ...prevEnv }
  vi.restoreAllMocks()
})

describe('email service (SMTP)', () => {
  it('retorna skip fora de produção quando SISTEQ_SMTP_HOST ausente', async () => {
    ;(process.env as any).NODE_ENV = 'test'
    delete process.env.SISTEQ_SMTP_HOST
    delete process.env.SISTEQ_EMAIL_FROM

    const { sendEmail } = await loadEmailModule()
    const result = await sendEmail({ to: 'user@example.com', subject: 'x', html: '<b>x</b>' })
    expect(result.ok).toBe(true)
    expect(result.provider).toBe('skip')
  })

  it('falha em produção quando SISTEQ_SMTP_HOST ausente e registra log', async () => {
    ;(process.env as any).NODE_ENV = 'production'
    delete process.env.SISTEQ_SMTP_HOST
    process.env.SISTEQ_EMAIL_FROM = 'SisteQ <no-reply@example.com>'

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { sendEmail } = await loadEmailModule()
    await expect(sendEmail({ to: 'user@example.com', subject: 'x', html: '<b>x</b>' })).rejects.toThrow(/não configurado/i)
    const payload = JSON.parse(String(errSpy.mock.calls[0]?.[0] ?? '{}'))
    expect(payload.scope).toBe('email')
    expect(payload.event).toBe('email.config.missing_smtp_host')
  })

  it('envia com sucesso via SMTP quando configurado', async () => {
    ;(process.env as any).NODE_ENV = 'production'
    process.env.SISTEQ_SMTP_HOST = 'smtp.example.com'
    process.env.SISTEQ_SMTP_PORT = '587'
    process.env.SISTEQ_SMTP_SECURE = '0'
    process.env.SISTEQ_SMTP_USER = 'user'
    process.env.SISTEQ_SMTP_PASS = 'pass'
    process.env.SISTEQ_EMAIL_FROM = 'SisteQ <no-reply@example.com>'

    sendMail.mockResolvedValue({ messageId: 'm_1' })
    const { sendEmail } = await loadEmailModule()
    const res = await sendEmail({ to: 'user@example.com', subject: 'x', html: '<b>x</b>' })
    expect(res.provider).toBe('smtp')
    expect(res.id).toBe('m_1')
    expect(createTransport).toHaveBeenCalled()
    expect(sendMail).toHaveBeenCalled()
  })

  it('lança erro genérico em produção quando sendMail falha e registra detalhes', async () => {
    ;(process.env as any).NODE_ENV = 'production'
    process.env.SISTEQ_SMTP_HOST = 'smtp.example.com'
    process.env.SISTEQ_EMAIL_FROM = 'SisteQ <no-reply@example.com>'

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    sendMail.mockRejectedValue(Object.assign(new Error('Auth failed'), { responseCode: 535, code: 'EAUTH', command: 'AUTH' }))

    const { sendEmail } = await loadEmailModule()
    await expect(sendEmail({ to: 'user@example.com', subject: 'x', html: '<b>x</b>' })).rejects.toThrow(/falha ao enviar e-mail/i)
    const payload = JSON.parse(String(errSpy.mock.calls[0]?.[0] ?? '{}'))
    expect(payload.scope).toBe('email')
    expect(payload.event).toBe('email.send.failed')
    expect(payload.responseCode).toBe(535)
  })

  it('expõe mensagem real fora de produção (para diagnóstico)', async () => {
    ;(process.env as any).NODE_ENV = 'test'
    process.env.SISTEQ_SMTP_HOST = 'smtp.example.com'
    process.env.SISTEQ_EMAIL_FROM = 'SisteQ <no-reply@example.com>'

    sendMail.mockRejectedValue(new Error('Mailbox unavailable'))
    const { sendEmail } = await loadEmailModule()
    await expect(sendEmail({ to: 'user@example.com', subject: 'x', html: '<b>x</b>' })).rejects.toThrow(/mailbox unavailable/i)
  })

  it('resume configuração SMTP sem expor senha', async () => {
    process.env.SISTEQ_SMTP_HOST = 'smtp.example.com'
    process.env.SISTEQ_SMTP_USER = 'user'
    process.env.SISTEQ_SMTP_PASS = 'pass'
    process.env.SISTEQ_EMAIL_FROM = 'SisteQ <no-reply@example.com>'

    const { getEmailServiceConfigSummary } = await loadEmailModule()
    const cfg = getEmailServiceConfigSummary()
    expect(cfg.provider).toBe('smtp')
    expect(cfg.hostConfigured).toBe(true)
    expect(cfg.authConfigured).toBe(true)
    expect(cfg.user).toBe('[configured]')
  })

  it('probe indica não configurado quando SISTEQ_SMTP_HOST ausente', async () => {
    delete process.env.SISTEQ_SMTP_HOST
    const { probeEmailService } = await loadEmailModule()
    const probe = await probeEmailService({ timeoutMs: 50 })
    expect(probe.provider).toBe('smtp')
    expect(probe.configured).toBe(false)
    expect(probe.reachable).toBe(false)
  })

  it('probe retorna ok quando verify passa', async () => {
    process.env.SISTEQ_SMTP_HOST = 'smtp.example.com'
    verify.mockResolvedValue(true)
    const { probeEmailService } = await loadEmailModule()
    const probe = await probeEmailService({ timeoutMs: 50 })
    expect(probe.ok).toBe(true)
    expect(probe.reachable).toBe(true)
  })

  it('probe retorna erro quando verify falha', async () => {
    process.env.SISTEQ_SMTP_HOST = 'smtp.example.com'
    verify.mockRejectedValue(new Error('connect ECONNREFUSED'))
    const { probeEmailService } = await loadEmailModule()
    const probe = await probeEmailService({ timeoutMs: 50 })
    expect(probe.ok).toBe(false)
    expect(probe.reachable).toBe(false)
    expect(String((probe as any).error || '')).toMatch(/refused/i)
  })
})
