import type { NextApiRequest, NextApiResponse } from 'next'
import {
  AuthError,
  createAuthCookiesForUser,
  getMe,
  loginWithEmailPassword,
  requireTenantFromRequest,
} from '@/server/profile'

function getClientIp(req: NextApiRequest) {
  const xf = req.headers['x-forwarded-for']
  const ip = Array.isArray(xf) ? xf[0] : typeof xf === 'string' ? xf.split(',')[0]?.trim() : ''
  return ip || (req.socket as any)?.remoteAddress || 'unknown'
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
    const rateKey = `${getClientIp(req)}:${tenant.id}:${email.trim().toLowerCase()}`
    const user = await loginWithEmailPassword({
      tenantId: tenant.id,
      email: body.email,
      password: body.password,
      rateKey,
    })
    const cookies = await createAuthCookiesForUser(user)
    res.setHeader('Set-Cookie', cookies)
    res.status(200).json({ user: await getMe(user.tenantId, user.id) })
  } catch (e: any) {
    if (e instanceof AuthError) {
      res.status(401).json({ error: e.message })
      return
    }
    const status = typeof e?.status === 'number' ? e.status : 500
    res.status(status).json({ error: e?.message || 'Erro interno' })
  }
}
