import type { NextApiRequest, NextApiResponse } from 'next'
import { isDatabaseConfigured, prisma } from '@/server/prisma'
import { getEmailServiceConfigSummary, getEmailServiceRuntimeStats } from '@/server/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const emailConfig = getEmailServiceConfigSummary()
  const emailStats = getEmailServiceRuntimeStats()

  const dbConfigured = isDatabaseConfigured()
  if (!dbConfigured) {
    res.status(200).json({
      ok: true,
      db: 'not_configured',
      email: {
        provider: emailConfig.provider,
        configured: emailConfig.configured,
        stats: emailStats,
      },
    })
    return
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({
      ok: true,
      db: 'ok',
      email: {
        provider: emailConfig.provider,
        configured: emailConfig.configured,
        stats: emailStats,
      },
    })
  } catch {
    res.status(503).json({
      ok: false,
      db: 'error',
      email: {
        provider: emailConfig.provider,
        configured: emailConfig.configured,
        stats: emailStats,
      },
    })
  }
}
