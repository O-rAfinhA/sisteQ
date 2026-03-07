import crypto from 'crypto'
import nodemailer from 'nodemailer'

type SendEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
}

type SendEmailResult = {
  ok: true
  provider: 'smtp' | 'skip'
  id?: string
}

function isProd() {
  return process.env.NODE_ENV === 'production'
}

function emailLogsEnabled() {
  return process.env.SISTEQ_EMAIL_LOGS === '1'
}

function envText(key: string) {
  const raw = process.env[key]
  if (typeof raw !== 'string') return ''
  const v = raw.trim()
  return v.length > 0 ? v : ''
}

function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function safeEmailDomain(email: string) {
  const v = String(email || '').trim().toLowerCase()
  const at = v.lastIndexOf('@')
  if (at <= 0) return ''
  const domain = v.slice(at + 1).trim()
  return domain.length > 0 ? domain : ''
}

function emailLog(level: 'info' | 'error', event: string, fields: Record<string, unknown>) {
  if (level === 'info' && !emailLogsEnabled()) return
  const payload = {
    ts: new Date().toISOString(),
    level,
    scope: 'email',
    event,
    ...fields,
  }
  if (level === 'error') {
    console.error(JSON.stringify(payload))
    return
  }
  console.info(JSON.stringify(payload))
}

type EmailRuntimeStats = {
  okCount: number
  failCount: number
  lastFailAt: string | null
  lastFailStatus?: number
  lastFailReason?: string
}

const emailRuntimeStats: EmailRuntimeStats = {
  okCount: 0,
  failCount: 0,
  lastFailAt: null,
}

function markEmailFail(status?: number, reason?: unknown) {
  emailRuntimeStats.failCount += 1
  emailRuntimeStats.lastFailAt = new Date().toISOString()
  emailRuntimeStats.lastFailStatus = status
  const msg = typeof reason === 'string' ? reason : reason ? String(reason) : ''
  emailRuntimeStats.lastFailReason = msg ? msg.slice(0, 300) : undefined
}

function markEmailOk() {
  emailRuntimeStats.okCount += 1
}

export function getEmailServiceRuntimeStats() {
  return { ...emailRuntimeStats }
}

function envInt(key: string) {
  const raw = envText(key)
  const n = Number(raw)
  if (!Number.isFinite(n)) return undefined
  return Math.floor(n)
}

function envBool(key: string) {
  const v = envText(key).toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  return undefined
}

function smtpConfig() {
  const host = envText('SISTEQ_SMTP_HOST')
  const port = envInt('SISTEQ_SMTP_PORT')
  const secureRaw = envBool('SISTEQ_SMTP_SECURE')
  const secure = typeof secureRaw === 'boolean' ? secureRaw : port === 465
  const user = envText('SISTEQ_SMTP_USER')
  const pass = envText('SISTEQ_SMTP_PASS')
  const requireTls = envBool('SISTEQ_SMTP_REQUIRE_TLS')
  const rejectUnauthorizedRaw = envBool('SISTEQ_SMTP_TLS_REJECT_UNAUTHORIZED')
  const rejectUnauthorized = typeof rejectUnauthorizedRaw === 'boolean' ? rejectUnauthorizedRaw : true
  const connectionTimeout = envInt('SISTEQ_SMTP_CONN_TIMEOUT_MS')
  const greetingTimeout = envInt('SISTEQ_SMTP_GREETING_TIMEOUT_MS')
  const socketTimeout = envInt('SISTEQ_SMTP_SOCKET_TIMEOUT_MS')
  return {
    host,
    port: typeof port === 'number' && port > 0 ? port : 587,
    secure,
    authConfigured: Boolean(user && pass),
    user,
    pass,
    requireTls: typeof requireTls === 'boolean' ? requireTls : undefined,
    tls: { rejectUnauthorized },
    timeouts: {
      connectionTimeout: typeof connectionTimeout === 'number' && connectionTimeout > 0 ? connectionTimeout : 10_000,
      greetingTimeout: typeof greetingTimeout === 'number' && greetingTimeout > 0 ? greetingTimeout : 10_000,
      socketTimeout: typeof socketTimeout === 'number' && socketTimeout > 0 ? socketTimeout : 10_000,
    },
  }
}

let cachedTransport: any = null
function getTransport() {
  if (cachedTransport) return cachedTransport
  const cfg = smtpConfig()
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.authConfigured ? { user: cfg.user, pass: cfg.pass } : undefined,
    requireTLS: cfg.requireTls,
    tls: cfg.tls,
    connectionTimeout: cfg.timeouts.connectionTimeout,
    greetingTimeout: cfg.timeouts.greetingTimeout,
    socketTimeout: cfg.timeouts.socketTimeout,
  } as any)
  cachedTransport = transport
  return transport
}

export function getEmailServiceConfigSummary() {
  const from = envText('SISTEQ_EMAIL_FROM')
  const cfg = smtpConfig()
  return {
    provider: 'smtp' as const,
    configured: Boolean(cfg.host) && Boolean(from),
    hostConfigured: Boolean(cfg.host),
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    authConfigured: cfg.authConfigured,
    user: cfg.user ? '[configured]' : '',
    fromConfigured: Boolean(from),
    from,
  }
}

export async function probeEmailService(opts?: { timeoutMs?: number }) {
  const startedAt = Date.now()
  const timeoutMs = typeof opts?.timeoutMs === 'number' ? opts!.timeoutMs! : 5_000
  const cfg = smtpConfig()

  if (!cfg.host) {
    return {
      ok: false as const,
      provider: 'smtp' as const,
      configured: false as const,
      reachable: false as const,
      latencyMs: Date.now() - startedAt,
      error: 'SISTEQ_SMTP_HOST ausente',
    }
  }

  const transport = getTransport()
  try {
    const verifyPromise = transport.verify()
    await Promise.race([
      verifyPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), Math.max(1, timeoutMs))),
    ])
    return {
      ok: true as const,
      provider: 'smtp' as const,
      configured: true as const,
      reachable: true as const,
      latencyMs: Date.now() - startedAt,
    }
  } catch (e: any) {
    return {
      ok: false as const,
      provider: 'smtp' as const,
      configured: true as const,
      reachable: false as const,
      latencyMs: Date.now() - startedAt,
      error: String(e?.message || 'Falha de conectividade'),
    }
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = envText('SISTEQ_EMAIL_FROM')
  const cfg = smtpConfig()

  const startedAt = Date.now()
  const to = String(input.to || '').trim()
  const toDomain = safeEmailDomain(to)
  const toHash = to ? sha256Hex(to.toLowerCase()) : ''

  if (!cfg.host) {
    if (!isProd()) return { ok: true, provider: 'skip' }
    markEmailFail(undefined, 'SISTEQ_SMTP_HOST ausente')
    emailLog('error', 'email.config.missing_smtp_host', {})
    throw new Error('Serviço de e-mail não configurado')
  }

  if (!from) {
    markEmailFail(undefined, 'SISTEQ_EMAIL_FROM ausente')
    emailLog('error', 'email.config.missing_from', {})
    throw new Error('SISTEQ_EMAIL_FROM ausente')
  }

  const transport = getTransport()
  try {
    const info = await transport.sendMail({
      from,
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    })
    const id = typeof info?.messageId === 'string' ? info.messageId : undefined
    markEmailOk()
    emailLog('info', 'email.send.ok', { provider: 'smtp', toDomain, toHash, latencyMs: Date.now() - startedAt, id })
    return { ok: true, provider: 'smtp', id }
  } catch (e: any) {
    const status = typeof e?.responseCode === 'number' ? e.responseCode : undefined
    markEmailFail(status, e?.message || 'Falha ao enviar')
    emailLog('error', 'email.send.failed', {
      provider: 'smtp',
      toDomain,
      toHash,
      latencyMs: Date.now() - startedAt,
      error: String(e?.message || 'Falha de rede'),
      code: typeof e?.code === 'string' ? e.code : '',
      command: typeof e?.command === 'string' ? e.command : '',
      responseCode: status,
    })
    if (isProd()) throw new Error('Falha ao enviar e-mail')
    throw new Error(String(e?.message || 'Falha de rede ao enviar e-mail'))
  }
}

export async function sendVerificationEmail(opts: { to: string; verificationUrl: string }) {
  const subject = 'Confirme seu e-mail'
  const safeUrl = opts.verificationUrl
  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.4;">
      <h2 style="margin: 0 0 12px;">Confirme seu e-mail</h2>
      <p style="margin: 0 0 12px;">Para ativar seu acesso, confirme seu e-mail clicando no link abaixo:</p>
      <p style="margin: 0 0 12px;"><a href="${safeUrl}">Confirmar e-mail</a></p>
      <p style="margin: 0; color: #555;">Se você não solicitou esta conta, ignore este e-mail.</p>
    </div>
  `.trim()
  const text = `Confirme seu e-mail: ${safeUrl}`
  return await sendEmail({ to: opts.to, subject, html, text })
}

export async function sendVerificationCodeEmail(opts: { to: string; code: string; expiresMinutes: number }) {
  const subject = 'Seu código de verificação'
  const code = String(opts.code || '').trim()
  const minutes = Number.isFinite(opts.expiresMinutes) ? opts.expiresMinutes : 15
  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.4;">
      <h2 style="margin: 0 0 12px;">Verificação de e-mail</h2>
      <p style="margin: 0 0 12px;">Use o código abaixo para confirmar seu e-mail:</p>
      <div style="margin: 0 0 12px; padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 10px; display: inline-block; letter-spacing: 4px; font-size: 20px; font-weight: 700;">
        ${code}
      </div>
      <p style="margin: 0 0 12px; color: #555;">Este código expira em ${minutes} minutos.</p>
      <p style="margin: 0; color: #555;">Se você não solicitou esta conta, ignore este e-mail.</p>
    </div>
  `.trim()
  const text = `Código de verificação: ${code}\nExpira em ${minutes} minutos.`
  return await sendEmail({ to: opts.to, subject, html, text })
}

export async function sendWelcomeEmail(opts: {
  to: string
  name: string
  tenantSlug: string
  loginUrl: string
  temporaryPassword: string
}) {
  const subject = 'Bem-vindo(a)! Seu acesso foi criado'
  const safeUrl = opts.loginUrl
  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.4;">
      <h2 style="margin: 0 0 12px;">Bem-vindo(a), ${opts.name}</h2>
      <p style="margin: 0 0 12px;">Seu acesso ao sistema foi criado para a organização <strong>${opts.tenantSlug}</strong>.</p>
      <p style="margin: 0 0 12px;">Senha temporária: <strong>${opts.temporaryPassword}</strong></p>
      <p style="margin: 0 0 12px;"><a href="${safeUrl}">Acessar página de login</a></p>
      <p style="margin: 0; color: #555;">No primeiro login, você será solicitado(a) a trocar a senha.</p>
    </div>
  `.trim()
  const text = `Bem-vindo(a), ${opts.name}\nOrganização: ${opts.tenantSlug}\nSenha temporária: ${opts.temporaryPassword}\nLogin: ${safeUrl}\nNo primeiro login, você será solicitado(a) a trocar a senha.`
  return await sendEmail({ to: opts.to, subject, html, text })
}
