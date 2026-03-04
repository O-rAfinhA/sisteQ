type SendEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
}

type SendEmailResult = {
  ok: true
  provider: 'resend' | 'skip'
  id?: string
}

function isProd() {
  return process.env.NODE_ENV === 'production'
}

function envText(key: string) {
  const raw = process.env[key]
  if (typeof raw !== 'string') return ''
  const v = raw.trim()
  return v.length > 0 ? v : ''
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = envText('RESEND_API_KEY')
  if (!apiKey) {
    if (!isProd()) return { ok: true, provider: 'skip' }
    throw new Error('Serviço de e-mail não configurado')
  }

  const from = envText('SISTEQ_EMAIL_FROM')
  if (!from) throw new Error('SISTEQ_EMAIL_FROM ausente')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  })

  const data: any = await res.json().catch(() => null)
  if (!res.ok) {
    if (isProd()) throw new Error('Falha ao enviar e-mail')
    throw new Error(data?.message || data?.error || `Falha ao enviar e-mail (HTTP ${res.status})`)
  }

  return { ok: true, provider: 'resend', id: typeof data?.id === 'string' ? data.id : undefined }
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

