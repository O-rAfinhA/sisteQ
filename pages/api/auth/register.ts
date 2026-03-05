import type { NextApiRequest, NextApiResponse } from 'next'
import {
  AuthError,
  ConflictError,
  createEmailVerificationToken,
  registerTenantAndUser,
  verifyEmailByToken,
} from '@/server/profile'
import { sendVerificationEmail } from '@/server/email'

function emailVerificationMode() {
  const raw = (process.env.SISTEQ_EMAIL_VERIFICATION_MODE || '').trim().toLowerCase()
  if (raw === 'disabled' || raw === 'token' || raw === 'required') return raw as 'disabled' | 'token' | 'required'
  return 'required' as const
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
    const { tenant, user } = await registerTenantAndUser((req.body ?? {}) as any)
    const token = await createEmailVerificationToken(tenant.id, user.id)
    const mode = emailVerificationMode()

    if (mode === 'disabled') {
      await verifyEmailByToken(token)
      res.status(201).json({ ok: true, emailVerified: true })
      return
    }

    if (process.env.NODE_ENV !== 'production') {
      res.status(201).json({ ok: true, dev: { verificationToken: token } })
      return
    }
    const proto = getProto(req)
    const host = getHost(req)
    const verificationUrl = `${proto}://${host}/api/auth/verify-email?token=${encodeURIComponent(token)}&tenant=${encodeURIComponent(
      tenant.slug,
    )}`

    if (mode === 'token') {
      res.status(201).json({ ok: true, emailSent: false, verificationUrl })
      return
    }

    let emailSent = false
    try {
      await sendVerificationEmail({ to: user.email, verificationUrl })
      emailSent = true
    } catch {
      emailSent = false
    }

    res.status(201).json({ ok: true, emailSent })
  } catch (e: any) {
    if (e instanceof AuthError) {
      res.status(401).json({ error: e.message })
      return
    }
    if (e instanceof ConflictError) {
      res.status(409).json({ error: e.message })
      return
    }
    const status = typeof e?.status === 'number' ? e.status : 500
    res.status(status).json({ error: e?.message || 'Erro interno' })
  }
}
