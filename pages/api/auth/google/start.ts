import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

function isProd() {
  return process.env.NODE_ENV === 'production'
}

function baseUrlFromReq(req: NextApiRequest) {
  const host = typeof req.headers.host === 'string' ? req.headers.host : ''
  const proto = isProd() ? 'https' : 'http'
  return `${proto}://${host}`
}

function createCookie(name: string, value: string, maxAgeSeconds: number) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${maxAgeSeconds}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    isProd() ? 'Secure' : '',
  ].filter(Boolean)
  return parts.join('; ')
}

function base64UrlSha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('base64url')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const clientId = process.env.SISTEQ_GOOGLE_CLIENT_ID
  if (!clientId) {
    res.status(500).json({ error: 'SISTEQ_GOOGLE_CLIENT_ID não configurado' })
    return
  }

  const redirectUri =
    process.env.SISTEQ_GOOGLE_REDIRECT_URI || `${baseUrlFromReq(req)}/api/auth/google/callback`

  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = base64UrlSha256(verifier)
  const state = crypto.randomBytes(16).toString('base64url')
  const next = typeof req.query.next === 'string' ? req.query.next : '/perfil'

  res.setHeader('Set-Cookie', [
    createCookie('sisteq_oauth_state', state, 60 * 10),
    createCookie('sisteq_oauth_verifier', verifier, 60 * 10),
    createCookie('sisteq_oauth_next', next, 60 * 10),
  ])

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  })
  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
}
