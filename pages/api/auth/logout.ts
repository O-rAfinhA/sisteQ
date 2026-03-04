import type { NextApiRequest, NextApiResponse } from 'next'
import { logoutFromRequest } from '@/server/profile'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const cookies = await logoutFromRequest(req)
    res.setHeader('Set-Cookie', cookies)
    res.status(200).json({ ok: true })
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : 500
    res.status(status).json({ error: e?.message || 'Erro interno' })
  }
}
