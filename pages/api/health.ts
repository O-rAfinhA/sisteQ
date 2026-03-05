import type { NextApiRequest, NextApiResponse } from 'next'
import { isDatabaseConfigured, prisma } from '@/server/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const dbConfigured = isDatabaseConfigured()
  if (!dbConfigured) {
    res.status(200).json({ ok: true, db: 'not_configured' })
    return
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({ ok: true, db: 'ok' })
  } catch {
    res.status(503).json({ ok: false, db: 'error' })
  }
}
