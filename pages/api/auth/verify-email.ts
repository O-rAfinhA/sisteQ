import type { NextApiRequest, NextApiResponse } from 'next'
import { AuthError, verifyEmailByToken } from '@/server/profile'

function safeNext(value: unknown) {
  if (typeof value !== 'string') return ''
  const v = value.trim()
  if (!v) return ''
  return v.startsWith('/') ? v : ''
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET'
  if (method !== 'GET' && method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const token =
      method === 'GET'
        ? typeof req.query.token === 'string'
          ? req.query.token
          : ''
        : typeof (req.body as any)?.token === 'string'
          ? String((req.body as any).token)
          : ''

    if (!token) {
      res.status(400).json({ error: 'Token ausente' })
      return
    }

    await verifyEmailByToken(token)

    if (method === 'GET') {
      const tenant = typeof req.query.tenant === 'string' ? req.query.tenant.trim() : ''
      const next = safeNext(req.query.next)
      const sp = new URLSearchParams()
      sp.set('verified', '1')
      if (tenant) sp.set('tenant', tenant)
      if (next) sp.set('next', next)
      res.redirect(302, `/login?${sp.toString()}`)
      return
    }
    res.status(200).json({ ok: true })
  } catch (e: any) {
    if (e instanceof AuthError) {
      res.status(400).json({ error: e.message })
      return
    }
    const status = typeof e?.status === 'number' ? e.status : 500
    res.status(status).json({ error: e?.message || 'Erro interno' })
  }
}
