import type { NextApiRequest, NextApiResponse } from 'next'
import {
  AuthError,
  ConflictError,
  createEmailVerificationCode,
  createEmailVerificationToken,
  registerTenantAndUser,
  verifyEmailByToken,
} from '@/server/profile'
import { getEmailServiceConfigSummary, sendVerificationCodeEmail, sendVerificationEmail } from '@/server/email'

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
    const emailServiceConfigured = getEmailServiceConfigSummary().configured

    if (mode === 'disabled') {
      const token = await createEmailVerificationToken(tenant.id, user.id)
      await verifyEmailByToken(token)
      console.info(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: 'info',
          scope: 'auth',
          event: 'auth.register.completed',
          mode,
          tenantId: tenant.id,
          userId: user.id,
          emailVerified: true,
        }),
      )
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

      let emailSent = false
      if (process.env.NODE_ENV === 'production') {
        try {
          await sendVerificationEmail({ to: String(user.email || '').trim().toLowerCase(), verificationUrl })
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
      }

      console.info(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: 'info',
          scope: 'auth',
          event: 'auth.register.verification_required',
          mode,
          tenantId: tenant.id,
          userId: user.id,
          verificationMethod: 'token',
          emailSent,
        }),
      )
      if (process.env.NODE_ENV !== 'production') {
        res.status(201).json({
          ok: true,
          emailServiceConfigured,
          emailSent: false,
          verificationUrl,
          verificationRequired: true,
          verificationMethod: 'token',
          dev: { verificationToken: token },
        })
        return
      }
      res.status(201).json({ ok: true, emailServiceConfigured, emailSent, verificationRequired: true, verificationMethod: 'token' })
      return
    }

    const issued = await createEmailVerificationCode(tenant.id, user.id)
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: 'info',
          scope: 'auth',
          event: 'auth.register.verification_required',
          mode,
          tenantId: tenant.id,
          userId: user.id,
          verificationMethod: 'code',
          emailSent: false,
          env: process.env.NODE_ENV || '',
        }),
      )
      res
        .status(201)
        .json({
          ok: true,
          emailServiceConfigured,
          emailSent: false,
          verificationRequired: true,
          verificationMethod: 'code',
          dev: { verificationCode: issued.code },
        })
      return
    }

    let emailSent = false
    try {
      await sendVerificationCodeEmail({ to: String(user.email || '').trim().toLowerCase(), code: issued.code, expiresMinutes: 15 })
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

    console.info(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'info',
        scope: 'auth',
        event: 'auth.register.verification_required',
        mode,
        tenantId: tenant.id,
        userId: user.id,
        verificationMethod: 'code',
        emailSent,
      }),
    )
    res.status(201).json({ ok: true, emailServiceConfigured, emailSent, verificationRequired: true, verificationMethod: 'code' })
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
