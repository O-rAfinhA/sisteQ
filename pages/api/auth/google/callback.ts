import type { NextApiRequest, NextApiResponse } from 'next'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import {
  AuthError,
  createAuthCookiesForUser,
  requireTenantFromRequest,
  upsertGoogleUser,
} from '@/server/profile'

function isProd() {
  return process.env.NODE_ENV === 'production'
}

function parseCookies(header: string | undefined) {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (!k) continue
    out[k] = decodeURIComponent(rest.join('=') || '')
  }
  return out
}

function clearCookie(name: string) {
  const parts = [
    `${name}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    isProd() ? 'Secure' : '',
  ].filter(Boolean)
  return parts.join('; ')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const clientId = process.env.SISTEQ_GOOGLE_CLIENT_ID
    const clientSecret = process.env.SISTEQ_GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) throw new AuthError('Google OAuth não configurado')

    const redirectUri =
      process.env.SISTEQ_GOOGLE_REDIRECT_URI ||
      `${isProd() ? 'https' : 'http'}://${req.headers.host}/api/auth/google/callback`

    const cookies = parseCookies(req.headers.cookie)
    const expectedState = cookies.sisteq_oauth_state
    const verifier = cookies.sisteq_oauth_verifier
    const next = cookies.sisteq_oauth_next
    const state = typeof req.query.state === 'string' ? req.query.state : ''
    const code = typeof req.query.code === 'string' ? req.query.code : ''

    if (!expectedState || !verifier || !state || state !== expectedState) throw new AuthError('State inválido')
    if (!code) throw new AuthError('Código ausente')

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: verifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })
    const tokenJson = (await tokenRes.json()) as any
    if (!tokenRes.ok) throw new AuthError('Falha no OAuth Google')

    const idToken = typeof tokenJson.id_token === 'string' ? tokenJson.id_token : ''
    if (!idToken) throw new AuthError('id_token ausente')

    const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))
    const { payload } = await jwtVerify(idToken, jwks, {
      audience: clientId,
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    })

    const sub = typeof payload.sub === 'string' ? payload.sub : ''
    const email = typeof payload.email === 'string' ? payload.email : ''
    const emailVerified = payload.email_verified === true
    const name = typeof payload.name === 'string' ? payload.name : undefined
    const picture = typeof payload.picture === 'string' ? payload.picture : undefined

    if (!sub || !email) throw new AuthError('Perfil Google inválido')
    if (!emailVerified) throw new AuthError('E-mail Google não verificado')

    const tenant = await requireTenantFromRequest(req)
    const user = await upsertGoogleUser(tenant.id, { sub, email, name, picture })
    const authCookies = await createAuthCookiesForUser(user)

    const cleanedNext = typeof next === 'string' && next.startsWith('/') ? next : '/perfil'
    res.setHeader('Set-Cookie', [
      ...authCookies,
      clearCookie('sisteq_oauth_state'),
      clearCookie('sisteq_oauth_verifier'),
      clearCookie('sisteq_oauth_next'),
    ])
    res.redirect(302, cleanedNext)
  } catch (e: any) {
    const status = e instanceof AuthError ? 400 : typeof e?.status === 'number' ? e.status : 500
    res.setHeader('Set-Cookie', [
      clearCookie('sisteq_oauth_state'),
      clearCookie('sisteq_oauth_verifier'),
      clearCookie('sisteq_oauth_next'),
    ])
    res.status(status).json({ error: e?.message || 'Erro interno' })
  }
}
