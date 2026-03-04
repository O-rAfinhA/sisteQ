import type { NextApiRequest, NextApiResponse } from 'next'
import { AuthError, requestEmailVerification, requireTenantFromRequest } from '@/server/profile'
import { sendVerificationEmail } from '@/server/email'

function emailVerificationMode() {
  const raw = (process.env.SISTEQ_EMAIL_VERIFICATION_MODE || '').trim().toLowerCase()
  if (raw === 'disabled' || raw === 'token' || raw === 'required') return raw as 'disabled' | 'token' | 'required'
  return 'required' as const
}

function getClientIp(req: NextApiRequest) {
  const xf = req.headers['x-forwarded-for']
  const ip = Array.isArray(xf) ? xf[0] : typeof xf === 'string' ? xf.split(',')[0]?.trim() : ''
  return ip || (req.socket as any)?.remoteAddress || 'unknown'
}

function getProto(req: NextApiRequest) {
  const xfProto = req.headers['x-forwarded-proto']
  const protoRaw = Array.isArray(xfProto) ? xfProto[0] : xfProto
  const proto = typeof protoRaw === 'string' ? protoRaw.split(',')[0]?.trim().toLowerCase() : ''
  if (proto === 'http' || proto === 'https') return proto
  return process.env.NODE_ENV === 'production' ? 'https' : 'http'
}

function getHost(req: NextApiRequest) {
  const hostRaw = req.headers.host
  return typeof hostRaw === 'string' && hostRaw.trim() ? hostRaw.trim() : 'localhost:3000'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const tenant = await requireTenantFromRequest(req)
    const body = (req.body ?? {}) as any
    const email = typeof body.email === 'string' ? body.email : ''
    const rateKey = `${getClientIp(req)}:${tenant.id}:${email.trim().toLowerCase()}:resend`
    const result = await requestEmailVerification({ tenantId: tenant.id, email: body.email, rateKey })

    if (process.env.NODE_ENV !== 'production') {
      res.status(200).json({ ok: true, dev: { verificationToken: result.token } })
      return
    }

    if (!result.token) {
      res.status(200).json({ ok: true, emailSent: false })
      return
    }

    const proto = getProto(req)
    const host = getHost(req)
    const verificationUrl = `${proto}://${host}/api/auth/verify-email?token=${encodeURIComponent(result.token)}&tenant=${encodeURIComponent(
      tenant.slug,
    )}`

    const mode = emailVerificationMode()
    if (mode === 'disabled') {
      res.status(200).json({ ok: true, emailSent: false })
      return
    }

    if (mode === 'token') {
      res.status(200).json({ ok: true, emailSent: false, verificationUrl })
      return
    }

    let emailSent = false
    try {
      await sendVerificationEmail({ to: email.trim().toLowerCase(), verificationUrl })
      emailSent = true
    } catch {
      emailSent = false
    }

    res.status(200).json({ ok: true, emailSent })
  } catch (e: any) {
    if (e instanceof AuthError) {
      res.status(400).json({ error: e.message })
      return
    }
    const status = typeof e?.status === 'number' ? e.status : 500
    res.status(status).json({ error: e?.message || 'Erro interno' })
  }
}
