import type { NextApiRequest, NextApiResponse } from 'next'
import {
  AuthError,
  ConflictError,
  createEmailVerificationCode,
  createEmailVerificationToken,
  registerTenantAndUser,
  verifyEmailByToken,
} from '@/server/profile'
import { sendVerificationCodeEmail, sendVerificationEmail } from '@/server/email'

function emailVerificationMode() {
  const raw = (process.env.SISTEQ_EMAIL_VERIFICATION_MODE || '').trim().toLowerCase()
  if (raw === 'disabled' || raw === 'token' || raw === 'required' || raw === 'code') {
    return raw as 'disabled' | 'token' | 'required' | 'code'
  }
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
    const mode = emailVerificationMode()

    if (mode === 'disabled') {
      const token = await createEmailVerificationToken(tenant.id, user.id)
      await verifyEmailByToken(token)
      res.status(201).json({ ok: true, emailVerified: true })
      return
    }

    if (mode === 'token') {
      const token = await createEmailVerificationToken(tenant.id, user.id)
      const proto = getProto(req)
      const host = getHost(req)
      const verificationUrl = `${proto}://${host}/api/auth/verify-email?token=${encodeURIComponent(token)}&tenant=${encodeURIComponent(
        tenant.slug,
      )}`
      res.status(201).json({ ok: true, emailSent: false, verificationUrl })
      return
    }

    const issued = await createEmailVerificationCode(tenant.id, user.id)
    if (process.env.NODE_ENV !== 'production') {
      res.status(201).json({ ok: true, dev: { verificationCode: issued.code } })
      return
    }

    let emailSent = false
    try {
      await sendVerificationCodeEmail({ to: user.email, code: issued.code, expiresMinutes: 15 })
      emailSent = true
    } catch (e: any) {
      emailSent = false
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: 'error',
          scope: 'email',
          event: 'auth.email.verification.send_failed',
          provider: 'smtp',
          tenantId: tenant.id,
          userId: user.id,
          error: String(e?.message || 'Falha ao enviar e-mail'),
        }),
      )
    }

    res.status(201).json({ ok: true, emailSent, verificationRequired: true, verificationMethod: 'code' })
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
