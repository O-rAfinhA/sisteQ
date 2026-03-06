import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'

type TrackDb = {
  version: 1
  byDay: Record<string, Record<string, number>>
  lastEventAt?: string
}

function isProd() {
  return process.env.NODE_ENV === 'production'
}

function parseCookies(cookieHeader: string | undefined) {
  const out: Record<string, string> = {}
  const raw = String(cookieHeader || '')
  if (!raw) return out
  raw.split(';').forEach(part => {
    const idx = part.indexOf('=')
    if (idx === -1) return
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (!k) return
    out[k] = decodeURIComponent(v || '')
  })
  return out
}

function createCookie(name: string, value: string, opts: { maxAgeSeconds: number }) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${opts.maxAgeSeconds}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    isProd() ? 'Secure' : '',
  ].filter(Boolean)
  return parts.join('; ')
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function sanitizeProps(input: unknown) {
  const obj = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    const lk = k.toLowerCase()
    if (lk.includes('token') || lk.includes('password') || lk.includes('secret')) continue
    if (typeof v === 'string' && v.length > 500) {
      out[k] = v.slice(0, 500)
      continue
    }
    out[k] = v
  }
  return out
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

async function writeDb(next: TrackDb): Promise<void> {
  const fp = dbPath()
  const tmp = `${fp}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  const body = JSON.stringify(next)
  await fs.writeFile(tmp, body, 'utf8')
  await fs.rename(tmp, fp)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const cookies = parseCookies(req.headers.cookie)
  let visitorId = String(cookies.sisteq_vid || '').trim()
  if (!visitorId) {
    visitorId = crypto.randomUUID()
    res.setHeader('Set-Cookie', createCookie('sisteq_vid', visitorId, { maxAgeSeconds: 60 * 60 * 24 * 365 }))
  }

  const eventRaw = (req.body as any)?.event
  const event = String(eventRaw || '').trim()
  if (!event || event.length > 80) {
    res.status(400).json({ error: 'Evento inválido' })
    return
  }

  const props = sanitizeProps((req.body as any)?.props)

  const day = new Date().toISOString().slice(0, 10)
  const db = await readDb()
  if (!db.byDay[day]) db.byDay[day] = {}
  db.byDay[day][event] = (db.byDay[day][event] || 0) + 1
  db.lastEventAt = new Date().toISOString()

  try {
    await writeDb(db)
  } catch {
  }

  try {
    const xfwd = req.headers['x-forwarded-for']
    const ip = typeof xfwd === 'string' ? xfwd.split(',')[0].trim() : req.socket.remoteAddress || ''
    const ua = String(req.headers['user-agent'] || '')
    const ref = String(req.headers.referer || '')
    const payload = { ts: new Date().toISOString(), event, visitorId, ip, ua, ref, props }
    if (process.env.SISTEQ_ACCESS_LOGS === '1') console.info(JSON.stringify(payload))
  } catch {
  }

  res.status(200).json({ ok: true })
}
