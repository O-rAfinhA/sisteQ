import type { NextApiRequest, NextApiResponse } from 'next'
import { AuthError, requireAuthFromRequest } from '@/server/profile'
import { getStrategicYears, saveStrategicYears } from '@/server/strategic'

function accessLog(event: string, fields: Record<string, unknown>) {
  if (process.env.SISTEQ_ACCESS_LOGS !== '1') return
  console.info(JSON.stringify({ ts: new Date().toISOString(), level: 'info', event, ...fields }))
}

function sendError(res: NextApiResponse, e: any) {
  const status = typeof e?.status === 'number' ? e.status : 500
  res.status(status).json({ error: e?.message || 'Erro interno' })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireAuthFromRequest(req)
    accessLog('api.strategic.years', {
      method: req.method,
      tenantId: auth.tenantId,
      userId: auth.userId,
      url: req.url || '',
    })

    if (req.method === 'GET') {
      const data = await getStrategicYears(auth.tenantId)
      res.status(200).json({ data })
      return
    }

    if (req.method === 'PUT') {
      const result = await saveStrategicYears(auth.tenantId, auth.userId, req.body ?? {})
      res.status(200).json(result)
      return
    }

    res.setHeader('Allow', 'GET, PUT')
    res.status(405).json({ error: 'Method Not Allowed' })
  } catch (e: any) {
    if (e instanceof AuthError) {
      res.status(401).json({ error: e.message })
      return
    }
    sendError(res, e)
  }
}
