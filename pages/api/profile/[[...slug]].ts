import type { NextApiRequest, NextApiResponse } from 'next'
import {
  AuthError,
  assertAdmin,
  assertRbacAccess,
  changePassword,
  createUserAsAdmin,
  createSupportTicket,
  getTenantById,
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
import { sendWelcomeEmail } from '@/server/email'
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

function getProto(req: NextApiRequest) {
  const xfProto = req.headers['x-forwarded-proto']
  const protoRaw = Array.isArray(xfProto) ? xfProto[0] : xfProto
  const proto = typeof protoRaw === 'string' ? protoRaw.split(',')[0]?.trim().toLowerCase() : ''
  if (proto === 'http' || proto === 'https') return proto
  return process.env.NODE_ENV === 'production' ? 'https' : 'http'
}

function baseUrlFromRequest(req: NextApiRequest) {
  const hostRaw = req.headers.host
  const host = Array.isArray(hostRaw) ? hostRaw[0] : hostRaw
  const safeHost = typeof host === 'string' ? host.trim() : ''
  if (!safeHost) return ''
  return `${getProto(req)}://${safeHost}`
}

function sendError(res: NextApiResponse, e: any) {
  const status = typeof e?.status === 'number' ? e.status : 500
  res.status(status).json({ error: e?.message || 'Erro interno' })
}

function safeStringHeader(value: any) {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0].trim() : ''
  return ''
}

function moduleIdForKvKey(keyRaw: string, activeModuleId: string): string | null {
  const key = String(keyRaw ?? '').trim()
  if (!key) return null

  if (key === 'strategic-planning-data') {
    if (activeModuleId === 'gestao-riscos' || activeModuleId === 'acoes-corretivas' || activeModuleId === 'gestao-estrategica') {
      return activeModuleId
    }
    return 'gestao-estrategica'
  }

  if (key === 'strategic-planning-years') return 'gestao-estrategica'
  if (key === 'sisteq-processos-mapeamento' || key === 'sisteq-processos') return 'processos'
  if (key === 'sisteq_kpi_indicadores') return 'indicadores'

  if (
    key === 'sisteq-docs-internos' ||
    key === 'sisteq-docs-clientes' ||
    key === 'sisteq-docs-externos' ||
    key === 'sisteq-docs-licencas' ||
    key === 'sisteq-docs-certidoes' ||
    key === 'sisteq-tipos-docs-internos' ||
    key === 'sisteq-tipos-docs-clientes' ||
    key === 'sisteq-tipos-externos' ||
    key === 'sisteq-tipos-licencas' ||
    key === 'sisteq-tipos-certidoes'
  ) {
    return 'documentos'
  }

  if (
    key === 'sisteq-colaboradores' ||
    key === 'sisteq-integracao-colaboradores' ||
    key === 'sisteq-fichas-integracao' ||
    key === 'sisteq-config-avaliacao-experiencia' ||
    key === 'sisteq-configuracao-experiencia' ||
    key === 'sisteq-configuracao-desempenho' ||
    key === 'sisteq-descricao-funcoes' ||
    key === 'sisteq-matriz-atividades' ||
    key === 'sisteq-matriz-qualificacoes' ||
    key === 'planos-qualificacao'
  ) {
    return 'recursos-humanos'
  }

  if (
    key === 'fornecedores' ||
    key === 'fornecedores_config' ||
    key === 'fornecedores_rofs' ||
    key === 'fornecedores_avaliacoes' ||
    key === 'fornecedores_recebimentos' ||
    key === 'fornecedores_pedidos'
  ) {
    return 'fornecedores'
  }

  if (key === 'sisteq-instrumentos' || key === 'sisteq-padroes-referencia' || key === 'sisteq-tipos-instrumentos') {
    return 'instrumentos-medicao'
  }

  if (
    key === 'sisteq-manutencao-equipamentos' ||
    key === 'sisteq-manutencao-os' ||
    key === 'sisteq-manutencao-planos' ||
    key === 'sisteq-manutencao-tipos-equipamento'
  ) {
    return 'manutencao'
  }

  return null
}

function safeParseJson(raw: any) {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function inferActionFromKv(oldValue: any, newValue: any): 'criar' | 'editar' | 'excluir' {
  const oldParsed = safeParseJson(oldValue)
  const newParsed = safeParseJson(newValue)
  if (Array.isArray(oldParsed) && Array.isArray(newParsed)) {
    if (newParsed.length > oldParsed.length) return 'criar'
    if (newParsed.length < oldParsed.length) return 'excluir'
    return 'editar'
  }
  return 'editar'
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
      await assertAdmin(auth.tenantId, auth.userId)
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
      await assertAdmin(auth.tenantId, auth.userId)
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        res.status(405).json({ error: 'Method Not Allowed' })
        return
      }
      res.status(200).json(await listNotifications(auth.tenantId, auth.userId))
      return
    }

    if (slug.length === 2 && slug[0] === 'notifications' && slug[1] === 'settings') {
      await assertAdmin(auth.tenantId, auth.userId)
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
      await assertAdmin(auth.tenantId, auth.userId)
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST')
        res.status(405).json({ error: 'Method Not Allowed' })
        return
      }
      res.status(200).json(await markNotificationRead(auth.tenantId, auth.userId, req.body ?? {}))
      return
    }

    if (slug.length === 1 && slug[0] === 'privacy') {
      await assertAdmin(auth.tenantId, auth.userId)
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
      const activeModuleId = safeStringHeader(req.headers['x-sisteq-module-id'])
      if (req.method === 'GET') {
        const key = typeof req.query.key === 'string' ? req.query.key : ''
        if (!key) {
          res.status(400).json({ error: 'key é obrigatória' })
          return
        }
        if (key === 'sisteq-rbac') await assertAdmin(auth.tenantId, auth.userId)
        const moduleId = moduleIdForKvKey(key, activeModuleId)
        if (moduleId) await assertRbacAccess(auth.tenantId, auth.userId, moduleId, 'ver')
        res.status(200).json({ value: await getTenantKvValue(auth.tenantId, key) })
        return
      }
      if (req.method === 'PUT') {
        const body = (req.body ?? {}) as any
        const key = String(body.key ?? '').trim()
        if (key === 'sisteq-rbac') await assertAdmin(auth.tenantId, auth.userId)
        const moduleId = moduleIdForKvKey(key, activeModuleId)
        if (moduleId) {
          const prevValue = await getTenantKvValue(auth.tenantId, key)
          const action = inferActionFromKv(prevValue, body.value)
          await assertRbacAccess(auth.tenantId, auth.userId, moduleId, action)
        }
        res.status(200).json(await setTenantKvValue(auth.tenantId, auth.userId, body.key, body.value))
        return
      }
      if (req.method === 'DELETE') {
        const key = typeof req.query.key === 'string' ? req.query.key : typeof (req.body as any)?.key === 'string' ? String((req.body as any)?.key) : ''
        if (!key) {
          res.status(400).json({ error: 'key é obrigatória' })
          return
        }
        if (key === 'sisteq-rbac') await assertAdmin(auth.tenantId, auth.userId)
        const moduleId = moduleIdForKvKey(key, activeModuleId)
        if (moduleId) await assertRbacAccess(auth.tenantId, auth.userId, moduleId, 'excluir')
        res.status(200).json(await deleteTenantKvValue(auth.tenantId, auth.userId, key))
        return
      }
      res.setHeader('Allow', 'GET, PUT, DELETE')
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }

    if (slug.length === 2 && slug[0] === 'kv' && slug[1] === 'batch') {
      const activeModuleId = safeStringHeader(req.headers['x-sisteq-module-id'])
      if (req.method === 'POST') {
        const body = (req.body ?? {}) as any
        const keys = Array.isArray(body?.keys) ? body.keys : []
        const allowedKeys: string[] = []
        for (const k of keys) {
          const key = String(k ?? '').trim()
          if (!key) continue
          if (key === 'sisteq-rbac') {
            try {
              await assertAdmin(auth.tenantId, auth.userId)
              allowedKeys.push(key)
            } catch {
            }
            continue
          }
          const moduleId = moduleIdForKvKey(key, activeModuleId)
          if (!moduleId) {
            allowedKeys.push(key)
            continue
          }
          try {
            await assertRbacAccess(auth.tenantId, auth.userId, moduleId, 'ver')
            allowedKeys.push(key)
          } catch {
          }
        }
        res.status(200).json({ values: await getTenantKvValues(auth.tenantId, allowedKeys) })
        return
      }
      if (req.method === 'PUT') {
        const body = (req.body ?? {}) as any
        const items = Array.isArray(body?.items) ? body.items : []
        for (const item of items) {
          const key = String(item?.key ?? '').trim()
          if (!key) continue
          if (key === 'sisteq-rbac') {
            await assertAdmin(auth.tenantId, auth.userId)
            continue
          }
          const moduleId = moduleIdForKvKey(key, activeModuleId)
          if (!moduleId) continue
          const prevValue = await getTenantKvValue(auth.tenantId, key)
          const action = inferActionFromKv(prevValue, item?.value)
          await assertRbacAccess(auth.tenantId, auth.userId, moduleId, action)
        }
        res.status(200).json(await setTenantKvValues(auth.tenantId, auth.userId, items))
        return
      }
      if (req.method === 'DELETE') {
        const body = (req.body ?? {}) as any
        const keys = Array.isArray(body?.keys) ? body.keys : []
        for (const k of keys) {
          const key = String(k ?? '').trim()
          if (!key) continue
          if (key === 'sisteq-rbac') {
            await assertAdmin(auth.tenantId, auth.userId)
            continue
          }
          const moduleId = moduleIdForKvKey(key, activeModuleId)
          if (!moduleId) continue
          await assertRbacAccess(auth.tenantId, auth.userId, moduleId, 'excluir')
        }
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
      const result = await listTenantKvKeys(auth.tenantId, { prefix, limit: limitRaw })
      const activeModuleId = safeStringHeader(req.headers['x-sisteq-module-id'])
      const keys = Array.isArray((result as any)?.keys) ? ((result as any).keys as any[]).map(k => String(k)) : []
      const filtered: string[] = []
      for (const key of keys) {
        if (!key) continue
        if (key === 'sisteq-rbac') {
          try {
            await assertAdmin(auth.tenantId, auth.userId)
            filtered.push(key)
          } catch {
          }
          continue
        }
        const moduleId = moduleIdForKvKey(key, activeModuleId)
        if (!moduleId) {
          filtered.push(key)
          continue
        }
        try {
          await assertRbacAccess(auth.tenantId, auth.userId, moduleId, 'ver')
          filtered.push(key)
        } catch {
        }
      }
      res.status(200).json({ ...(result as any), keys: filtered })
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
        const body = (req.body ?? {}) as any
        const temporaryPassword = typeof body?.password === 'string' ? body.password : ''

        const user = await createUserAsAdmin(auth.tenantId, auth.userId, body)

        let emailSent: boolean | undefined = undefined
        if (temporaryPassword) {
          try {
            const tenant = await getTenantById(auth.tenantId)
            const tenantSlug = tenant?.slug ? String(tenant.slug) : auth.tenantId
            const baseUrl = baseUrlFromRequest(req)
            const loginUrl = baseUrl
              ? `${baseUrl}/login?tenant=${encodeURIComponent(tenantSlug)}`
              : `/login?tenant=${encodeURIComponent(tenantSlug)}`
            await sendWelcomeEmail({
              to: user.email,
              name: user.name,
              tenantSlug,
              loginUrl,
              temporaryPassword,
            })
            emailSent = true
          } catch {
            emailSent = false
          }
        }

        res.status(201).json({ user, emailSent })
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
