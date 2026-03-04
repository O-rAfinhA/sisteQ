import type { NextApiRequest, NextApiResponse } from 'next'
import { AuthError, resetPasswordWithToken } from '@/server/profile'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const body = (req.body ?? {}) as any
    await resetPasswordWithToken(body.token, body.newPassword)
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
