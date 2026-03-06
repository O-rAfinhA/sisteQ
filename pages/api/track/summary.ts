import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs/promises'
import path from 'path'
import { AuthError, requireAuthFromRequest } from '@/server/profile'

type TrackDb = {
  version: 1
  byDay: Record<string, Record<string, number>>
  lastEventAt?: string
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function dbPath() {
  const p = String(process.env.SISTEQ_TRACK_DB_PATH || '').trim()
  if (p) return p
  return path.join(process.cwd(), '.sisteq-track.json')
}

async function readDb(): Promise<TrackDb> {
  const fp = dbPath()
  const raw = await fs.readFile(fp, 'utf8').catch(() => '')
  const parsed = raw ? safeJsonParse<TrackDb>(raw) : null
  if (parsed && parsed.version === 1 && parsed.byDay && typeof parsed.byDay === 'object') return parsed
  return { version: 1, byDay: {} }
}

function toDayKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    await requireAuthFromRequest(req as any)
  } catch (e: any) {
    if (e instanceof AuthError) {
      res.status(401).json({ error: 'Não autenticado' })
      return
    }
    res.status(500).json({ error: 'Erro interno' })
    return
  }

  const daysRaw = typeof req.query.days === 'string' ? req.query.days : Array.isArray(req.query.days) ? req.query.days[0] : '14'
  const days = Math.max(1, Math.min(90, Number(daysRaw) || 14))

  const db = await readDb()
  const now = new Date()
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    keys.push(toDayKey(d))
  }

  const totals: Record<string, number> = {}
  for (const k of keys) {
    const day = db.byDay[k] || {}
    for (const [evt, count] of Object.entries(day)) {
      totals[evt] = (totals[evt] || 0) + (Number(count) || 0)
    }
  }

  const landingViews = totals.landing_view || 0
  const signupViews = totals.signup_view || 0
  const signupSubmits = totals.signup_submit || 0
  const signupSuccess = totals.signup_success || 0

  const rate = landingViews > 0 ? signupSuccess / landingViews : 0

  res.status(200).json({
    windowDays: days,
    lastEventAt: db.lastEventAt || null,
    totals,
    funnel: {
      landingViews,
      signupViews,
      signupSubmits,
      signupSuccess,
      conversionRate: rate,
    },
  })
}

