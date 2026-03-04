import type { NextApiRequest, NextApiResponse } from 'next'
import {
  AuthError,
  ConflictError,
  createEmailVerificationToken,
  registerTenantAndUser,
} from '@/server/profile'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const { tenant, user } = await registerTenantAndUser((req.body ?? {}) as any)
    const token = await createEmailVerificationToken(tenant.id, user.id)
    if (process.env.NODE_ENV !== 'production') {
      res.status(201).json({ ok: true, dev: { verificationToken: token } })
      return
    }
    res.status(201).json({ ok: true })
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
