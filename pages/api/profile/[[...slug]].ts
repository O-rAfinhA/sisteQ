import type { NextApiRequest, NextApiResponse } from 'next'
import {
  AuthError,
  changePassword,
  createUserAsAdmin,
  createSupportTicket,
  getMe,
  getNotificationSettings,
  getPreferences,
  getPrivacy,
  listUsersAsAdmin,
  listActivity,
  listNotifications,
  listSupportTickets,
  markNotificationRead,
  requireAuthFromRequest,
  purgeAllUsersAsAdmin,
  runUserCleanupAsAdmin,
  updateUserAsAdmin,
  updateMe,
  updateNotificationSettings,
  updatePreferences,
  updatePrivacy,
} from '@/server/profile'
import {
  deleteTenantKvValue,
  deleteTenantKvValues,
  getTenantKvValue,
  getTenantKvValues,
  listTenantKvKeys,
  setTenantKvValue,
  setTenantKvValues,
} from '@/server/tenant-kv'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
}

function accessLog(event: string, fields: Record<string, unknown>) {
  if (process.env.SISTEQ_ACCESS_LOGS !== '1') return
  console.info(JSON.stringify({ ts: new Date().toISOString(), level: 'info', event, ...fields }))
}

function getSlug(req: NextApiRequest) {
  const raw = req.query.slug
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  return [raw]
}

function sendError(res: NextApiResponse, e: any) {
  const status = typeof e?.status === 'number' ? e.status : 500
  res.status(status).json({ error: e?.message || 'Erro interno' })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const slug = getSlug(req)
    const auth = await requireAuthFromRequest(req)
    accessLog('api.profile', {
      method: req.method,
      tenantId: auth.tenantId,
      userId: auth.userId,
      slug,
      url: req.url || '',
    })

    if (slug.length === 1 && slug[0] === 'me') {
      if (req.method === 'GET') {
        res.status(200).json({ user: await getMe(auth.tenantId, auth.userId) })
        return
      }
      if (req.method === 'PUT') {
        res.status(200).json({ user: await updateMe(auth.tenantId, auth.userId, req.body ?? {}) })
        return
      }
      res.setHeader('Allow', 'GET, PUT')
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }

    if (slug.length === 1 && slug[0] === 'password') {
      if (req.method !== 'PUT') {
        res.setHeader('Allow', 'PUT')
        res.status(405).json({ error: 'Method Not Allowed' })
        return
      }
      res.status(200).json(await changePassword(auth.tenantId, auth.userId, req.body ?? {}))
      return
    }

    if (slug.length === 1 && slug[0] === 'preferences') {
      if (req.method === 'GET') {
        res.status(200).json({ preferences: await getPreferences(auth.tenantId, auth.userId) })
        return
      }
      if (req.method === 'PUT') {
        res.status(200).json({ preferences: await updatePreferences(auth.tenantId, auth.userId, req.body ?? {}) })
        return
      }
      res.setHeader('Allow', 'GET, PUT')
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }

    if (slug.length === 1 && slug[0] === 'activity') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        res.status(405).json({ error: 'Method Not Allowed' })
        return
      }
      const limitRaw = req.query.limit
      const limit = typeof limitRaw === 'string' ? Number(limitRaw) : undefined
      res.status(200).json({ activity: await listActivity(auth.tenantId, auth.userId, { limit }) })
      return
    }

    if (slug.length === 1 && slug[0] === 'notifications') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        res.status(405).json({ error: 'Method Not Allowed' })
        return
      }
      res.status(200).json(await listNotifications(auth.tenantId, auth.userId))
      return
    }

    if (slug.length === 2 && slug[0] === 'notifications' && slug[1] === 'settings') {
      if (req.method === 'GET') {
        res.status(200).json({ settings: await getNotificationSettings(auth.tenantId, auth.userId) })
        return
      }
      if (req.method === 'PUT') {
        res.status(200).json({ settings: await updateNotificationSettings(auth.tenantId, auth.userId, req.body ?? {}) })
        return
      }
      res.setHeader('Allow', 'GET, PUT')
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }

    if (slug.length === 2 && slug[0] === 'notifications' && slug[1] === 'read') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        res.status(405).json({ error: 'Method Not Allowed' })
        return
      }
      res.status(200).json(await markNotificationRead(auth.tenantId, auth.userId, req.body ?? {}))
      return
    }

    if (slug.length === 1 && slug[0] === 'privacy') {
      if (req.method === 'GET') {
        res.status(200).json({ privacy: await getPrivacy(auth.tenantId, auth.userId) })
        return
      }
      if (req.method === 'PUT') {
        res.status(200).json({ privacy: await updatePrivacy(auth.tenantId, auth.userId, req.body ?? {}) })
        return
      }
      res.setHeader('Allow', 'GET, PUT')
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }

    if (slug.length === 1 && slug[0] === 'kv') {
      if (req.method === 'GET') {
        const key = typeof req.query.key === 'string' ? req.query.key : ''
        if (!key) {
          res.status(400).json({ error: 'key é obrigatória' })
          return
        }
        res.status(200).json({ value: await getTenantKvValue(auth.tenantId, key) })
        return
      }
      if (req.method === 'PUT') {
        const body = (req.body ?? {}) as any
        res.status(200).json(await setTenantKvValue(auth.tenantId, auth.userId, body.key, body.value))
        return
      }
      if (req.method === 'DELETE') {
        const key = typeof req.query.key === 'string' ? req.query.key : typeof (req.body as any)?.key === 'string' ? String((req.body as any)?.key) : ''
        if (!key) {
          res.status(400).json({ error: 'key é obrigatória' })
          return
        }
        res.status(200).json(await deleteTenantKvValue(auth.tenantId, auth.userId, key))
        return
      }
      res.setHeader('Allow', 'GET, PUT, DELETE')
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }

    if (slug.length === 2 && slug[0] === 'kv' && slug[1] === 'batch') {
      if (req.method === 'POST') {
        const body = (req.body ?? {}) as any
        const keys = Array.isArray(body?.keys) ? body.keys : []
        res.status(200).json({ values: await getTenantKvValues(auth.tenantId, keys) })
        return
      }
      if (req.method === 'PUT') {
        const body = (req.body ?? {}) as any
        const items = Array.isArray(body?.items) ? body.items : []
        res.status(200).json(await setTenantKvValues(auth.tenantId, auth.userId, items))
        return
      }
      if (req.method === 'DELETE') {
        const body = (req.body ?? {}) as any
        const keys = Array.isArray(body?.keys) ? body.keys : []
        res.status(200).json(await deleteTenantKvValues(auth.tenantId, auth.userId, keys))
        return
      }
      res.setHeader('Allow', 'POST, PUT, DELETE')
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }

    if (slug.length === 2 && slug[0] === 'kv' && slug[1] === 'list') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        res.status(405).json({ error: 'Method Not Allowed' })
        return
      }
      const prefix = typeof req.query.prefix === 'string' ? req.query.prefix : ''
      const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined
      res.status(200).json(await listTenantKvKeys(auth.tenantId, { prefix, limit: limitRaw }))
      return
    }

    if (slug.length === 2 && slug[0] === 'support' && slug[1] === 'tickets') {
      if (req.method === 'GET') {
        res.status(200).json({ tickets: await listSupportTickets(auth.tenantId, auth.userId) })
        return
      }
      if (req.method === 'POST') {
        res.status(201).json({ ticket: await createSupportTicket(auth.tenantId, auth.userId, req.body ?? {}) })
        return
      }
      res.setHeader('Allow', 'GET, POST')
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }

    if (slug.length === 1 && slug[0] === 'users') {
      if (req.method === 'GET') {
        res.status(200).json({ users: await listUsersAsAdmin(auth.tenantId, auth.userId) })
        return
      }
      if (req.method === 'POST') {
        res.status(201).json({ user: await createUserAsAdmin(auth.tenantId, auth.userId, req.body ?? {}) })
        return
      }
      res.setHeader('Allow', 'GET, POST')
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }

    if (slug.length === 2 && slug[0] === 'users') {
      if (req.method === 'PUT') {
        res.status(200).json({ user: await updateUserAsAdmin(auth.tenantId, auth.userId, slug[1]!, req.body ?? {}) })
        return
      }
      res.setHeader('Allow', 'PUT')
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }

    if (slug.length === 1 && slug[0] === 'cleanup-users') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        res.status(405).json({ error: 'Method Not Allowed' })
        return
      }
      res.status(200).json(await runUserCleanupAsAdmin(auth.tenantId, auth.userId, req.body ?? {}))
      return
    }

    if (slug.length === 1 && slug[0] === 'purge-all-users') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        res.status(405).json({ error: 'Method Not Allowed' })
        return
      }
      res.status(200).json(await purgeAllUsersAsAdmin(auth.tenantId, auth.userId, req.body ?? {}))
      return
    }

    res.status(404).json({ error: 'Not Found' })
  } catch (e: any) {
    if (e instanceof AuthError) {
      res.status(401).json({ error: e.message })
      return
    }
    sendError(res, e)
  }
}
