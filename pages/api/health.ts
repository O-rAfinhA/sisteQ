import type { NextApiRequest, NextApiResponse } from 'next'
import { isPostgresConfigured, withPgClient } from '@/server/pg'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const dbConfigured = isPostgresConfigured()
  if (!dbConfigured) {
    res.status(200).json({ ok: true, db: 'not_configured' })
    return
  }

  try {
    await withPgClient(async client => {
      await client.query('SELECT 1')
    })
    res.status(200).json({ ok: true, db: 'ok' })
  } catch {
    res.status(503).json({ ok: false, db: 'error' })
  }
}
