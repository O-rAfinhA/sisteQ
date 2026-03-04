import type { NextApiRequest, NextApiResponse } from 'next'
import { AuthError, requireAuthFromRequest } from '@/server/profile'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    await requireAuthFromRequest(req)
    res.setHeader('Clear-Site-Data', '"cache", "storage"')
    res.status(200).json({ ok: true })
  } catch (e: any) {
    if (e instanceof AuthError) {
      res.status(401).json({ error: e.message })
      return
    }
    const status = typeof e?.status === 'number' ? e.status : 500
    res.status(status).json({ error: e?.message || 'Erro interno' })
  }
}
