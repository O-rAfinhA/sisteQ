import crypto from 'crypto'
import path from 'path'
import { promises as fs } from 'fs'
import { TextEncoder } from 'util'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { isPostgresConfigured, withPgClient, withPgTransaction } from '@/server/pg'

export type ProfilePreferences = {
  theme: 'system' | 'light' | 'dark'
  language: 'pt-BR' | 'en-US'
  compactMode: boolean
  analyticsOptIn: boolean
}

export type ProfileNotificationSettings = {
  email: boolean
  inApp: boolean
  marketing: boolean
}

export type ProfilePrivacySettings = {
  showEmail: boolean
  showActivity: boolean
}

export type ProfileActivityEvent = {
  id: string
  type:
    | 'profile.updated'
    | 'password.changed'
    | 'preferences.updated'
    | 'notifications.updated'
    | 'privacy.updated'
    | 'support.ticket.created'
    | 'notification.read'
  createdAt: string
  metadata?: Record<string, string | number | boolean | null>
}

export type ProfileNotification = {
  id: string
  title: string
  body: string
  createdAt: string
  readAt: string | null
}

export type SupportTicket = {
  id: string
  subject: string
  message: string
  createdAt: string
  status: 'open' | 'closed'
}

export type UserProfile = {
  id: string
  tenantId: string
  name: string
  email: string
  role: string
  avatarUrl: string
  phone?: string
  department?: string
  disabledAt?: string | null
  createdAt: string
  updatedAt: string
  passwordHash: string | null
  emailVerifiedAt: string | null
  googleSub?: string
  preferences: ProfilePreferences
  notificationSettings: ProfileNotificationSettings
  privacy: ProfilePrivacySettings
  notifications: ProfileNotification[]
  activity: ProfileActivityEvent[]
  supportTickets: SupportTicket[]
}

export type Tenant = {
  id: string
  slug: string
  name: string
  createdAt: string
  updatedAt: string
}

type RefreshTokenRecord = {
  id: string
  tokenHash: string
  userId: string
  tenantId: string
  createdAt: string
  expiresAt: string
  revokedAt: string | null
  rotatedAt: string | null
  lastUsedAt: string | null
}

type OneTimeTokenRecord = {
  id: string
  tokenHash: string
  userId: string
  tenantId: string
  createdAt: string
  expiresAt: string
  usedAt: string | null
}

type AuditLogEvent = {
  id: string
  createdAt: string
  event: string
  fields: Record<string, any>
}

type DbShape = {
  tenants: Record<string, Tenant>
  users: Record<string, UserProfile>
  audits: Record<string, AuditLogEvent>
  refreshTokens: Record<string, RefreshTokenRecord>
  emailVerificationTokens: Record<string, OneTimeTokenRecord>
  passwordResetTokens: Record<string, OneTimeTokenRecord>
  tenantBySlug: Record<string, string>
  userByTenantEmail: Record<string, string>
}

const DEFAULT_PREFERENCES: ProfilePreferences = {
  theme: 'system',
  language: 'pt-BR',
  compactMode: false,
  analyticsOptIn: false,
}

const DEFAULT_NOTIFICATION_SETTINGS: ProfileNotificationSettings = {
  email: true,
  inApp: true,
  marketing: false,
}

const DEFAULT_PRIVACY: ProfilePrivacySettings = {
  showEmail: false,
  showActivity: true,
}

const SESSION_COOKIE_NAME = 'sisteq_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

let writeQueue = Promise.resolve()
let profilePgSchemaReady = false
let profilePgSchemaPromise: Promise<void> | null = null

const PROFILE_DB_MAIN_ID = 'main'
const PROFILE_DB_LOCK_KEY = 718203401

function nowIso() {
  return new Date().toISOString()
}

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`
}

function profileStoreKind(): 'file' | 'pg' {
  const raw = typeof process.env.SISTEQ_PROFILE_STORE === 'string' ? process.env.SISTEQ_PROFILE_STORE.trim().toLowerCase() : ''
  if (raw === 'file') return 'file'
  if (raw === 'pg') return 'pg'
  if (isPostgresConfigured()) return 'pg'
  return 'file'
}

function dbFilePath() {
  if (process.env.SISTEQ_PROFILE_DB_PATH) return process.env.SISTEQ_PROFILE_DB_PATH
  return path.join(process.cwd(), '.sisteq-db', 'profile.json')
}

async function ensureDbDir() {
  await fs.mkdir(path.dirname(dbFilePath()), { recursive: true })
}

function emptyDb(): DbShape {
  return {
    tenants: {},
    users: {},
    audits: {},
    refreshTokens: {},
    emailVerificationTokens: {},
    passwordResetTokens: {},
    tenantBySlug: {},
    userByTenantEmail: {},
  }
}

async function ensureProfilePgSchema() {
  if (profilePgSchemaReady) return
  if (profilePgSchemaPromise) return await profilePgSchemaPromise
  profilePgSchemaPromise = (async () => {
    await withPgClient(async client => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS sisteq_profile_db (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `)
      await client.query(`
        CREATE TABLE IF NOT EXISTS sisteq_profile_db_backups (
          id TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          data JSONB NOT NULL
        )
      `)
      await client.query(`CREATE INDEX IF NOT EXISTS sisteq_profile_db_backups_created_at_idx ON sisteq_profile_db_backups (created_at)`)
    })
    profilePgSchemaReady = true
    profilePgSchemaPromise = null
  })()
  return await profilePgSchemaPromise
}

async function readDbPg(): Promise<DbShape> {
  if (!isPostgresConfigured()) {
    const err: any = new Error('PostgreSQL não configurado (DATABASE_URL ou PGHOST)')
    err.status = 501
    throw err
  }
  await ensureProfilePgSchema()
  return await withPgClient(async client => {
    const res = await client.query<{ data: any }>(`SELECT data FROM sisteq_profile_db WHERE id = $1`, [PROFILE_DB_MAIN_ID])
    const row = res.rows[0]
    if (!row) return emptyDb()
    const parsed = (row.data ?? {}) as Partial<DbShape>
    const base = emptyDb()
    return {
      ...base,
      ...parsed,
      tenants: parsed.tenants ?? base.tenants,
      users: parsed.users ?? base.users,
      audits: parsed.audits ?? base.audits,
      refreshTokens: parsed.refreshTokens ?? base.refreshTokens,
      emailVerificationTokens: parsed.emailVerificationTokens ?? base.emailVerificationTokens,
      passwordResetTokens: parsed.passwordResetTokens ?? base.passwordResetTokens,
      tenantBySlug: parsed.tenantBySlug ?? base.tenantBySlug,
      userByTenantEmail: parsed.userByTenantEmail ?? base.userByTenantEmail,
    }
  })
}

async function writeDbPg(next: DbShape) {
  if (!isPostgresConfigured()) {
    const err: any = new Error('PostgreSQL não configurado (DATABASE_URL ou PGHOST)')
    err.status = 501
    throw err
  }
  await ensureProfilePgSchema()
  await withPgTransaction(async client => {
    await client.query(`SELECT pg_advisory_xact_lock($1::bigint)`, [PROFILE_DB_LOCK_KEY])
    await client.query(
      `
        INSERT INTO sisteq_profile_db (id, data, updated_at)
        VALUES ($1, $2, now())
        ON CONFLICT (id) DO UPDATE
          SET data = EXCLUDED.data,
              updated_at = now()
      `,
      [PROFILE_DB_MAIN_ID, next as any],
    )
  })
}

async function readDb(): Promise<DbShape> {
  if (profileStoreKind() === 'pg') return await readDbPg()
  await ensureDbDir()
  try {
    const raw = await fs.readFile(dbFilePath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<DbShape>
    const base = emptyDb()
    return {
      ...base,
      ...parsed,
      tenants: parsed.tenants ?? base.tenants,
      users: parsed.users ?? base.users,
      audits: parsed.audits ?? base.audits,
      refreshTokens: parsed.refreshTokens ?? base.refreshTokens,
      emailVerificationTokens: parsed.emailVerificationTokens ?? base.emailVerificationTokens,
      passwordResetTokens: parsed.passwordResetTokens ?? base.passwordResetTokens,
      tenantBySlug: parsed.tenantBySlug ?? base.tenantBySlug,
      userByTenantEmail: parsed.userByTenantEmail ?? base.userByTenantEmail,
    }
  } catch (e: any) {
    if (e?.code === 'ENOENT') return emptyDb()
    throw e
  }
}

async function writeDb(next: DbShape) {
  if (profileStoreKind() === 'pg') {
    await writeDbPg(next)
    return
  }
  await ensureDbDir()
  const data = JSON.stringify(next, null, 2)
  writeQueue = writeQueue.then(() => fs.writeFile(dbFilePath(), data, 'utf8'))
  await writeQueue
}

function assertNonEmptyString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} é obrigatório`)
  }
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function assertValidEmail(value: unknown, field: string) {
  assertNonEmptyString(value, field)
  if (!isEmail(value as string)) throw new ValidationError(`${field} inválido`)
}

function assertBoolean(value: unknown, field: string) {
  if (typeof value !== 'boolean') throw new ValidationError(`${field} deve ser booleano`)
}

function safeString(value: unknown) {
  if (typeof value !== 'string') return undefined
  const s = value.trim()
  return s.length ? s : undefined
}

export class ValidationError extends Error {
  status = 400
}

export class AuthError extends Error {
  status = 401
}

export class NotFoundError extends Error {
  status = 404
}

export class ConflictError extends Error {
  status = 409
}

export class ForbiddenError extends Error {
  status = 403
}

const ROLE_ADMIN = 'Admin'
const ROLE_USER = 'User'

async function hashPassword(password: string) {
  const hash = await bcrypt.hash(password, 12)
  return `bcrypt:${hash}`
}

async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false
  if (stored.startsWith('bcrypt:')) {
    const hash = stored.slice('bcrypt:'.length)
    return bcrypt.compare(password, hash)
  }
  if (stored.startsWith('scrypt:')) {
    const [, saltHex, keyHex] = stored.split(':')
    if (!saltHex || !keyHex) return false
    const salt = Buffer.from(saltHex, 'hex')
    const key = Buffer.from(keyHex, 'hex')
    const derived = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(password, salt, key.length, (err, derivedKey) => {
        if (err) reject(err)
        else resolve(derivedKey as Buffer)
      })
    })
    if (derived.length !== key.length) return false
    return crypto.timingSafeEqual(derived, key)
  }
  return false
}

export function parseCookies(cookieHeader: string | undefined) {
  const out: Record<string, string> = {}
  if (!cookieHeader) return out
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (!k) continue
    out[k] = decodeURIComponent(v)
  }
  return out
}

function sessionSecret() {
  return process.env.SISTEQ_SESSION_SECRET || 'dev-secret'
}

function signSession(payload: string) {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex')
}

export function createSessionCookie(userId: string) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = `${userId}.${issuedAt}`
  const sig = signSession(payload)
  const value = `${payload}.${sig}`
  const secure = process.env.NODE_ENV === 'production'
  const cookie = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : '',
  ].join('; ')
  return cookie
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production'
  const cookie = [
    `${SESSION_COOKIE_NAME}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : '',
  ].join('; ')
  return cookie
}

export function getUserIdFromSessionCookie(cookieHeader: string | undefined) {
  const cookies = parseCookies(cookieHeader)
  const raw = cookies[SESSION_COOKIE_NAME]
  if (!raw) throw new AuthError('Não autenticado')
  const parts = raw.split('.')
  if (parts.length !== 3) throw new AuthError('Sessão inválida')
  const [userId, issuedAtStr, sig] = parts
  if (!userId || !issuedAtStr || !sig) throw new AuthError('Sessão inválida')
  const issuedAt = Number(issuedAtStr)
  if (!Number.isFinite(issuedAt)) throw new AuthError('Sessão inválida')
  const age = Math.floor(Date.now() / 1000) - issuedAt
  if (age < 0 || age > SESSION_MAX_AGE_SECONDS) throw new AuthError('Sessão expirada')
  const expected = signSession(`${userId}.${issuedAt}`)
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) throw new AuthError('Sessão inválida')
  return userId
}

const ACCESS_COOKIE_NAME = 'sisteq_access'
const REFRESH_COOKIE_NAME = 'sisteq_refresh'

const ACCESS_TOKEN_TTL_SECONDS = 60 * 15
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30

type AuthContext = {
  userId: string
  tenantId: string
  role: string
}

function isProd() {
  return process.env.NODE_ENV === 'production'
}

function baseUrlFromRequestHost(host: string) {
  const proto = isProd() ? 'https' : 'http'
  return `${proto}://${host}`
}

function accessTokenSecret() {
  return process.env.SISTEQ_JWT_SECRET || sessionSecret()
}

async function signAccessToken(ctx: AuthContext) {
  const enc = new TextEncoder()
  return new SignJWT({ uid: ctx.userId, tid: ctx.tenantId, role: ctx.role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer('sisteq')
    .setAudience('sisteq-web')
    .setExpirationTime(Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS)
    .sign(enc.encode(accessTokenSecret()))
}

async function verifyAccessToken(token: string) {
  const enc = new TextEncoder()
  const { payload } = await jwtVerify(token, enc.encode(accessTokenSecret()), {
    issuer: 'sisteq',
    audience: 'sisteq-web',
  })
  const userId = typeof payload.uid === 'string' ? payload.uid : null
  const tenantId = typeof payload.tid === 'string' ? payload.tid : null
  const role = typeof payload.role === 'string' ? payload.role : null
  if (!userId || !tenantId || !role) throw new AuthError('Token inválido')
  return { userId, tenantId, role } satisfies AuthContext
}

function cookieAttrSameSite() {
  return 'SameSite=Lax'
}

function createCookie(name: string, value: string, opts: { maxAgeSeconds: number; httpOnly: boolean }) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${opts.maxAgeSeconds}`,
    'Path=/',
    opts.httpOnly ? 'HttpOnly' : '',
    cookieAttrSameSite(),
    isProd() ? 'Secure' : '',
  ].filter(Boolean)
  return parts.join('; ')
}

function clearCookie(name: string) {
  const parts = [
    `${name}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    cookieAttrSameSite(),
    isProd() ? 'Secure' : '',
  ].filter(Boolean)
  return parts.join('; ')
}

function assertSameOrigin(req: { headers: Record<string, any> }) {
  const host = String(req.headers.host || '')
  if (!host) return
  const expected = baseUrlFromRequestHost(host)
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : ''
  const referer = typeof req.headers.referer === 'string' ? req.headers.referer : ''
  if (origin) {
    if (origin !== expected) throw new AuthError('CSRF bloqueado')
    return
  }
  if (referer) {
    if (!referer.startsWith(expected)) throw new AuthError('CSRF bloqueado')
  }
}

type RateState = { count: number; resetAt: number }
const authRate = new Map<string, RateState>()
const AUTH_RATE_WINDOW_MS = 60_000
const AUTH_RATE_MAX = 10

function getClientIp(req: { headers: Record<string, any>; socket?: any }) {
  const xf = req.headers['x-forwarded-for']
  const ip = Array.isArray(xf) ? xf[0] : typeof xf === 'string' ? xf.split(',')[0]?.trim() : ''
  return ip || req.socket?.remoteAddress || 'unknown'
}

function checkAuthRateLimit(key: string) {
  const now = Date.now()
  const current = authRate.get(key)
  if (!current || now >= current.resetAt) {
    authRate.set(key, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS })
    return
  }
  if (current.count >= AUTH_RATE_MAX) throw new AuthError('Muitas tentativas. Aguarde e tente novamente.')
  current.count += 1
  authRate.set(key, current)
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function audit(event: string, fields: Record<string, any>) {
  const safe: Record<string, any> = {}
  for (const [k, v] of Object.entries(fields)) {
    if (k.toLowerCase().includes('token') || k.toLowerCase().includes('password')) continue
    safe[k] = v
  }
  console.info(JSON.stringify({ ts: nowIso(), event, ...safe }))
}

export async function requireAuthFromRequest(req: { headers: Record<string, any>; method?: string }) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    const hasAuthCookie = Boolean(parseCookies(req.headers.cookie)[ACCESS_COOKIE_NAME] || parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME])
    if (hasAuthCookie) assertSameOrigin(req)
  }

  const cookies = parseCookies(req.headers.cookie)
  const rawAccess = cookies[ACCESS_COOKIE_NAME]
  if (!rawAccess) throw new AuthError('Não autenticado')
  try {
    const ctx = await verifyAccessToken(rawAccess)
    const user = await getUserById(ctx.tenantId, ctx.userId)
    if (user.disabledAt) throw new AuthError('Usuário desativado')
    return { userId: ctx.userId, tenantId: ctx.tenantId, role: user.role }
  } catch {
    throw new AuthError('Sessão expirada')
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function normalizeTenantSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function getTenantSlugFromRequest(req: { headers: Record<string, any> }) {
  const explicit = req.headers['x-tenant']
  if (typeof explicit === 'string' && explicit.trim()) return normalizeTenantSlug(explicit)
  if (Array.isArray(explicit) && explicit[0]?.trim()) return normalizeTenantSlug(explicit[0])

  const hostRaw = typeof req.headers.host === 'string' ? req.headers.host : ''
  const host = hostRaw.split(':')[0] || ''
  const parts = host.split('.').filter(Boolean)
  if (parts.length >= 3) return normalizeTenantSlug(parts[0]!)

  return ''
}

export async function requireTenantFromRequest(req: { headers: Record<string, any> }) {
  const slug = getTenantSlugFromRequest(req)
  if (!slug) throw new ValidationError('Tenant ausente')
  const tenant = await findTenantBySlug(slug)
  if (!tenant) throw new NotFoundError('Tenant não encontrado')
  return tenant
}

function userDbKey(tenantId: string, userId: string) {
  return `${tenantId}:${userId}`
}

function userEmailKey(tenantId: string, email: string) {
  return `${tenantId}:${normalizeEmail(email)}`
}

async function getOrCreateTenantBySlug(slugRaw: string, name?: string) {
  const slug = normalizeTenantSlug(slugRaw)
  if (!slug) throw new ValidationError('Tenant inválido')

  const existing = await findTenantBySlug(slug)
  if (existing) return existing

  const db = await readDb()
  const id = randomId('t')
  const createdAt = nowIso()
  const tenant: Tenant = {
    id,
    slug,
    name: name?.trim() || slug.toUpperCase(),
    createdAt,
    updatedAt: createdAt,
  }
  db.tenants[id] = tenant
  db.tenantBySlug[slug] = id
  await writeDb(db)
  return tenant
}

async function findTenantBySlug(slugRaw: string) {
  const slug = normalizeTenantSlug(slugRaw)
  if (!slug) return null
  const db = await readDb()
  const existingId = db.tenantBySlug[slug]
  if (!existingId) return null
  return db.tenants[existingId] ?? null
}

async function getUserById(tenantId: string, userId: string) {
  const db = await readDb()
  const user = db.users[userDbKey(tenantId, userId)]
  if (!user) throw new NotFoundError('Usuário não encontrado')
  return user
}

async function assertAdmin(tenantId: string, userId: string) {
  const user = await getUserById(tenantId, userId)
  if (user.disabledAt) throw new ForbiddenError('Usuário desativado')
  if (user.role !== ROLE_ADMIN) throw new ForbiddenError('Acesso restrito ao Administrador')
  return user
}

function listTenantUsers(db: DbShape, tenantId: string) {
  const prefix = `${tenantId}:`
  const users: UserProfile[] = []
  for (const [key, user] of Object.entries(db.users)) {
    if (!key.startsWith(prefix)) continue
    users.push(user)
  }
  return users
}

function findTenantAdminUsers(db: DbShape, tenantId: string) {
  return listTenantUsers(db, tenantId).filter(u => u.role === ROLE_ADMIN && !u.disabledAt)
}

function addSecondsIso(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString()
}

function assertStrongPassword(password: string) {
  if (password.length < 10) throw new ValidationError('Senha deve ter pelo menos 10 caracteres')
  if (!/[a-z]/.test(password)) throw new ValidationError('Senha deve conter letra minúscula')
  if (!/[A-Z]/.test(password)) throw new ValidationError('Senha deve conter letra maiúscula')
  if (!/[0-9]/.test(password)) throw new ValidationError('Senha deve conter número')
  if (!/[^A-Za-z0-9]/.test(password)) throw new ValidationError('Senha deve conter caractere especial')
}

async function findUserByEmail(tenantId: string, email: string) {
  const db = await readDb()
  const key = db.userByTenantEmail[userEmailKey(tenantId, email)]
  if (!key) return null
  return db.users[key] ?? null
}

async function findUserByGoogleSub(tenantId: string, sub: string) {
  const db = await readDb()
  const prefix = `${tenantId}:`
  for (const [key, user] of Object.entries(db.users)) {
    if (!key.startsWith(prefix)) continue
    if (user.googleSub === sub) return user
  }
  return null
}

export async function upsertGoogleUser(
  tenantId: string,
  payload: { sub: string; email: string; name?: string; picture?: string }
) {
  const sub = String(payload.sub)
  const email = normalizeEmail(payload.email)
  if (!sub) throw new ValidationError('Google sub inválido')

  const existingBySub = await findUserByGoogleSub(tenantId, sub)
  if (existingBySub) {
    if (existingBySub.disabledAt) throw new AuthError('Usuário desativado')
    return existingBySub
  }

  const db = await readDb()
  const existingKey = db.userByTenantEmail[userEmailKey(tenantId, email)]
  if (existingKey) {
    const user = db.users[existingKey]
    if (!user) throw new AuthError('Usuário inválido')
    if (user.disabledAt) throw new AuthError('Usuário desativado')
    if (user.googleSub && user.googleSub !== sub) throw new AuthError('Conta Google já vinculada')
    user.googleSub = sub
    if (!user.emailVerifiedAt) user.emailVerifiedAt = nowIso()
    if (payload.picture && typeof payload.picture === 'string') user.avatarUrl = payload.picture
    user.updatedAt = nowIso()
    db.users[existingKey] = user
    await writeDb(db)
    return user
  }

  const userId = randomId('u')
  const createdAt = nowIso()
  const hasAnyUser = listTenantUsers(db, tenantId).length > 0
  if (hasAnyUser) {
    const activeAdmins = findTenantAdminUsers(db, tenantId)
    if (activeAdmins.length !== 1) throw new ConflictError('Tenant inválido: Administrador inconsistente')
  }
  const user: UserProfile = {
    id: userId,
    tenantId,
    name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : email.split('@')[0] || 'Usuário',
    email,
    role: hasAnyUser ? ROLE_USER : ROLE_ADMIN,
    avatarUrl:
      typeof payload.picture === 'string' && payload.picture.trim()
        ? payload.picture.trim()
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userId)}`,
    disabledAt: null,
    createdAt,
    updatedAt: createdAt,
    passwordHash: null,
    emailVerifiedAt: nowIso(),
    googleSub: sub,
    preferences: { ...DEFAULT_PREFERENCES },
    notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
    privacy: { ...DEFAULT_PRIVACY },
    notifications: [],
    activity: [],
    supportTickets: [],
  }

  const key = userDbKey(tenantId, userId)
  db.users[key] = user
  db.userByTenantEmail[userEmailKey(tenantId, email)] = key
  await writeDb(db)
  return user
}

async function issueRefreshToken(user: UserProfile) {
  const raw = crypto.randomBytes(32).toString('base64url')
  const tokenHash = hashToken(raw)
  const rec: RefreshTokenRecord = {
    id: randomId('rt'),
    tokenHash,
    userId: user.id,
    tenantId: user.tenantId,
    createdAt: nowIso(),
    expiresAt: addSecondsIso(REFRESH_TOKEN_TTL_SECONDS),
    revokedAt: null,
    rotatedAt: null,
    lastUsedAt: null,
  }
  const db = await readDb()
  db.refreshTokens[rec.id] = rec
  await writeDb(db)
  return raw
}

async function revokeRefreshTokenByHash(tokenHash: string) {
  const db = await readDb()
  const now = nowIso()
  for (const rec of Object.values(db.refreshTokens)) {
    if (rec.tokenHash !== tokenHash) continue
    if (!rec.revokedAt) rec.revokedAt = now
  }
  await writeDb(db)
}

async function revokeAllRefreshTokensForUser(tenantId: string, userId: string) {
  const db = await readDb()
  const now = nowIso()
  for (const rec of Object.values(db.refreshTokens)) {
    if (rec.tenantId !== tenantId || rec.userId !== userId) continue
    if (!rec.revokedAt) rec.revokedAt = now
  }
  await writeDb(db)
}

async function rotateRefreshToken(raw: string) {
  const tokenHash = hashToken(raw)
  const db = await readDb()
  const rec = Object.values(db.refreshTokens).find(r => r.tokenHash === tokenHash)
  if (!rec) throw new AuthError('Refresh inválido')
  if (rec.revokedAt) throw new AuthError('Refresh revogado')
  if (new Date(rec.expiresAt).getTime() <= Date.now()) throw new AuthError('Refresh expirado')

  if (rec.rotatedAt) {
    await revokeAllRefreshTokensForUser(rec.tenantId, rec.userId)
    audit('auth.refresh.reuse_detected', { tenantId: rec.tenantId, userId: rec.userId })
    throw new AuthError('Sessão inválida')
  }

  rec.rotatedAt = nowIso()
  rec.lastUsedAt = nowIso()

  const user = db.users[userDbKey(rec.tenantId, rec.userId)]
  if (!user) throw new AuthError('Usuário inválido')
  if (user.disabledAt) throw new AuthError('Usuário desativado')

  const nextRaw = crypto.randomBytes(32).toString('base64url')
  const nextHash = hashToken(nextRaw)
  const next: RefreshTokenRecord = {
    id: randomId('rt'),
    tokenHash: nextHash,
    userId: rec.userId,
    tenantId: rec.tenantId,
    createdAt: nowIso(),
    expiresAt: addSecondsIso(REFRESH_TOKEN_TTL_SECONDS),
    revokedAt: null,
    rotatedAt: null,
    lastUsedAt: null,
  }

  db.refreshTokens[next.id] = next
  await writeDb(db)
  return { user, refresh: nextRaw }
}

export async function createAuthCookiesForUser(user: UserProfile) {
  const access = await signAccessToken({ userId: user.id, tenantId: user.tenantId, role: user.role })
  const refresh = await issueRefreshToken(user)
  return [
    createCookie(ACCESS_COOKIE_NAME, access, { maxAgeSeconds: ACCESS_TOKEN_TTL_SECONDS, httpOnly: true }),
    createCookie(REFRESH_COOKIE_NAME, refresh, { maxAgeSeconds: REFRESH_TOKEN_TTL_SECONDS, httpOnly: true }),
  ]
}

export function clearAuthCookies() {
  return [clearCookie(ACCESS_COOKIE_NAME), clearCookie(REFRESH_COOKIE_NAME)]
}

export async function loginWithEmailPassword(opts: {
  tenantId: string
  email: unknown
  password: unknown
  rateKey: string
}) {
  assertValidEmail(opts.email, 'E-mail')
  assertNonEmptyString(opts.password, 'Senha')
  const email = normalizeEmail(String(opts.email))
  const password = String(opts.password)

  checkAuthRateLimit(opts.rateKey)

  const user = await findUserByEmail(opts.tenantId, email)
  if (!user || user.tenantId !== opts.tenantId) throw new AuthError('Credenciais inválidas')
  if (user.disabledAt) throw new AuthError('Usuário desativado')
  if (!user.passwordHash) throw new AuthError('Use login com Google')
  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) throw new AuthError('Credenciais inválidas')
  if (!user.emailVerifiedAt) throw new AuthError('E-mail não verificado')

  audit('auth.login.password.success', { tenantId: opts.tenantId, userId: user.id })
  return user
}

export async function refreshSessionFromRequest(req: { headers: Record<string, any>; method?: string }) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') assertSameOrigin(req)
  const cookies = parseCookies(req.headers.cookie)
  const raw = cookies[REFRESH_COOKIE_NAME]
  if (!raw) throw new AuthError('Não autenticado')
  const { user, refresh } = await rotateRefreshToken(raw)
  const access = await signAccessToken({ userId: user.id, tenantId: user.tenantId, role: user.role })
  return {
    user,
    cookies: [
      createCookie(ACCESS_COOKIE_NAME, access, { maxAgeSeconds: ACCESS_TOKEN_TTL_SECONDS, httpOnly: true }),
      createCookie(REFRESH_COOKIE_NAME, refresh, { maxAgeSeconds: REFRESH_TOKEN_TTL_SECONDS, httpOnly: true }),
    ],
  }
}

export async function logoutFromRequest(req: { headers: Record<string, any>; method?: string }) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') assertSameOrigin(req)
  const cookies = parseCookies(req.headers.cookie)
  const raw = cookies[REFRESH_COOKIE_NAME]
  if (raw) await revokeRefreshTokenByHash(hashToken(raw))
  return clearAuthCookies()
}

export async function registerTenantAndUser(payload: {
  tenantSlug?: unknown
  companyName?: unknown
  name?: unknown
  email?: unknown
  password?: unknown
}) {
  assertNonEmptyString(payload.tenantSlug, 'Tenant')
  assertNonEmptyString(payload.name, 'Nome')
  assertValidEmail(payload.email, 'E-mail')
  assertNonEmptyString(payload.password, 'Senha')

  const tenantSlug = normalizeTenantSlug(String(payload.tenantSlug))
  if (!tenantSlug) throw new ValidationError('Tenant inválido')

  const tenant = await getOrCreateTenantBySlug(tenantSlug, typeof payload.companyName === 'string' ? payload.companyName : undefined)
  const email = normalizeEmail(String(payload.email))
  const password = String(payload.password)
  assertStrongPassword(password)

  const db = await readDb()
  if (db.userByTenantEmail[userEmailKey(tenant.id, email)]) throw new ConflictError('E-mail já cadastrado')
  if (listTenantUsers(db, tenant.id).length > 0) {
    throw new ForbiddenError('Cadastro indisponível. Solicite ao Administrador a criação do usuário.')
  }

  const userId = randomId('u')
  const createdAt = nowIso()
  const user: UserProfile = {
    id: userId,
    tenantId: tenant.id,
    name: String(payload.name).trim(),
    email,
    role: ROLE_ADMIN,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userId)}`,
    disabledAt: null,
    createdAt,
    updatedAt: createdAt,
    passwordHash: await hashPassword(password),
    emailVerifiedAt: null,
    preferences: { ...DEFAULT_PREFERENCES },
    notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
    privacy: { ...DEFAULT_PRIVACY },
    notifications: [],
    activity: [],
    supportTickets: [],
  }

  const key = userDbKey(tenant.id, userId)
  db.users[key] = user
  db.userByTenantEmail[userEmailKey(tenant.id, email)] = key
  await writeDb(db)

  audit('auth.register', { tenantId: tenant.id, userId })
  return { tenant, user }
}

async function createOneTimeToken(
  kind: 'emailVerificationTokens' | 'passwordResetTokens',
  tenantId: string,
  userId: string,
  ttlSeconds: number
) {
  const raw = crypto.randomBytes(24).toString('base64url')
  const tokenHash = hashToken(raw)
  const rec: OneTimeTokenRecord = {
    id: randomId('ott'),
    tokenHash,
    userId,
    tenantId,
    createdAt: nowIso(),
    expiresAt: addSecondsIso(ttlSeconds),
    usedAt: null,
  }
  const db = await readDb()
  db[kind][rec.id] = rec
  await writeDb(db)
  return raw
}

async function consumeOneTimeToken(
  kind: 'emailVerificationTokens' | 'passwordResetTokens',
  tokenRaw: string
) {
  const tokenHash = hashToken(tokenRaw)
  const db = await readDb()
  const rec = Object.values(db[kind]).find(r => r.tokenHash === tokenHash)
  if (!rec) throw new AuthError('Token inválido')
  if (rec.usedAt) throw new AuthError('Token já utilizado')
  if (new Date(rec.expiresAt).getTime() <= Date.now()) throw new AuthError('Token expirado')
  rec.usedAt = nowIso()
  await writeDb(db)
  return rec
}

export async function createEmailVerificationToken(tenantId: string, userId: string) {
  return createOneTimeToken('emailVerificationTokens', tenantId, userId, 60 * 60 * 24)
}

export async function verifyEmailByToken(tokenRaw: string) {
  const rec = await consumeOneTimeToken('emailVerificationTokens', tokenRaw)
  await mutateUser(rec.tenantId, rec.userId, u => {
    u.emailVerifiedAt = u.emailVerifiedAt || nowIso()
    u.activity.unshift({
      id: randomId('act'),
      type: 'profile.updated',
      createdAt: nowIso(),
      metadata: { emailVerified: true },
    })
  })
  audit('auth.email.verified', { tenantId: rec.tenantId, userId: rec.userId })
  return { ok: true }
}

export async function requestPasswordReset(tenantId: string, emailRaw: unknown) {
  assertValidEmail(emailRaw, 'E-mail')
  const email = normalizeEmail(String(emailRaw))
  const user = await findUserByEmail(tenantId, email)
  if (!user || !user.emailVerifiedAt) return { ok: true, token: null }
  const token = await createOneTimeToken('passwordResetTokens', tenantId, user.id, 60 * 30)
  audit('auth.password.reset.requested', { tenantId, userId: user.id })
  return { ok: true, token }
}

export async function resetPasswordWithToken(tokenRaw: unknown, newPasswordRaw: unknown) {
  assertNonEmptyString(tokenRaw, 'Token')
  assertNonEmptyString(newPasswordRaw, 'Nova senha')
  const newPassword = String(newPasswordRaw)
  assertStrongPassword(newPassword)

  const rec = await consumeOneTimeToken('passwordResetTokens', String(tokenRaw))
  const nextHash = await hashPassword(newPassword)
  await mutateUser(rec.tenantId, rec.userId, u => {
    u.passwordHash = nextHash
    u.activity.unshift({
      id: randomId('act'),
      type: 'password.changed',
      createdAt: nowIso(),
      metadata: { via: 'reset' },
    })
  })
  await revokeAllRefreshTokensForUser(rec.tenantId, rec.userId)
  audit('auth.password.reset.completed', { tenantId: rec.tenantId, userId: rec.userId })
  return { ok: true }
}

function publicUser(u: UserProfile) {
  return {
    id: u.id,
    tenantId: u.tenantId,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl,
    phone: u.phone,
    department: u.department,
    disabledAt: u.disabledAt ?? null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    emailVerifiedAt: u.emailVerifiedAt,
    preferences: u.preferences,
    notificationSettings: u.notificationSettings,
    privacy: u.privacy,
  }
}

export async function listUsersAsAdmin(tenantId: string, actorUserId: string) {
  await assertAdmin(tenantId, actorUserId)
  const db = await readDb()
  const users = listTenantUsers(db, tenantId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .map(publicUser)
  audit('admin.user.list', { tenantId, actorUserId, count: users.length })
  return users
}

export async function createUserAsAdmin(
  tenantId: string,
  actorUserId: string,
  payload: { name?: unknown; email?: unknown; password?: unknown }
) {
  await assertAdmin(tenantId, actorUserId)
  assertNonEmptyString(payload.name, 'Nome')
  assertValidEmail(payload.email, 'E-mail')
  assertNonEmptyString(payload.password, 'Senha')

  const name = String(payload.name).trim()
  const email = normalizeEmail(String(payload.email))
  const password = String(payload.password)
  assertStrongPassword(password)

  const db = await readDb()
  if (db.userByTenantEmail[userEmailKey(tenantId, email)]) throw new ConflictError('E-mail já cadastrado')

  const activeAdmins = findTenantAdminUsers(db, tenantId)
  if (activeAdmins.length !== 1) throw new ConflictError('Tenant inválido: Administrador inconsistente')

  const userId = randomId('u')
  const createdAt = nowIso()
  const user: UserProfile = {
    id: userId,
    tenantId,
    name,
    email,
    role: ROLE_USER,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userId)}`,
    disabledAt: null,
    createdAt,
    updatedAt: createdAt,
    passwordHash: await hashPassword(password),
    emailVerifiedAt: nowIso(),
    preferences: { ...DEFAULT_PREFERENCES },
    notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
    privacy: { ...DEFAULT_PRIVACY },
    notifications: [],
    activity: [],
    supportTickets: [],
  }

  const key = userDbKey(tenantId, userId)
  db.users[key] = user
  db.userByTenantEmail[userEmailKey(tenantId, email)] = key
  await writeDb(db)

  audit('admin.user.create', { tenantId, actorUserId, userId })
  return publicUser(user)
}

export async function updateUserAsAdmin(
  tenantId: string,
  actorUserId: string,
  targetUserId: string,
  payload: { name?: unknown; email?: unknown; disabled?: unknown }
) {
  await assertAdmin(tenantId, actorUserId)

  const db = await readDb()
  const key = userDbKey(tenantId, targetUserId)
  const user = db.users[key]
  if (!user) throw new NotFoundError('Usuário não encontrado')

  if (typeof payload.name !== 'undefined') assertNonEmptyString(payload.name, 'Nome')
  if (typeof payload.email !== 'undefined') assertValidEmail(payload.email, 'E-mail')
  if (typeof payload.disabled !== 'undefined') assertBoolean(payload.disabled, 'Desativado')

  const activeAdmins = findTenantAdminUsers(db, tenantId)
  if (activeAdmins.length !== 1) throw new ConflictError('Tenant inválido: Administrador inconsistente')
  const adminUser = activeAdmins[0]!

  if (typeof payload.name !== 'undefined') user.name = String(payload.name).trim()

  if (typeof payload.email !== 'undefined') {
    const nextEmail = normalizeEmail(String(payload.email))
    const oldEmailKey = userEmailKey(tenantId, user.email)
    const nextEmailKey = userEmailKey(tenantId, nextEmail)
    const existing = db.userByTenantEmail[nextEmailKey]
    if (existing && existing !== key) throw new ConflictError('E-mail já em uso')
    delete db.userByTenantEmail[oldEmailKey]
    db.userByTenantEmail[nextEmailKey] = key
    user.email = nextEmail
  }

  if (typeof payload.disabled !== 'undefined') {
    const disable = Boolean(payload.disabled)
    if (user.id === adminUser.id && disable) throw new ForbiddenError('Não é permitido desativar o Administrador do tenant')
    user.disabledAt = disable ? nowIso() : null
    if (disable) {
      await revokeAllRefreshTokensForUser(tenantId, user.id)
      audit('admin.user.deactivate', { tenantId, actorUserId, userId: user.id })
    } else {
      audit('admin.user.reactivate', { tenantId, actorUserId, userId: user.id })
    }
  } else {
    audit('admin.user.update', { tenantId, actorUserId, userId: user.id })
  }

  user.updatedAt = nowIso()
  db.users[key] = user
  await writeDb(db)

  return publicUser(user)
}

export type UserCleanupOptions = {
  inactiveMonths?: number
  deleteInactive?: boolean
  anonymizeDisabled?: boolean
  removeIncomplete?: boolean
  dedupeByEmail?: boolean
  normalizeEmail?: boolean
  normalizePhone?: boolean
  validateRequired?: boolean
}

export type UserCleanupOperation =
  | { op: 'delete.user'; tenantId: string; userId: string; emailHash?: string; reason: string }
  | { op: 'anonymize.user'; tenantId: string; userId: string; emailHash?: string; reason: string }
  | { op: 'merge.duplicate'; tenantId: string; winnerUserId: string; loserUserId: string; emailHash?: string; reason: string }
  | { op: 'normalize.email'; tenantId: string; userId: string; fromHash: string; toHash: string }
  | { op: 'normalize.phone'; tenantId: string; userId: string }
  | { op: 'normalize.cpf'; tenantId: string; userId: string }
  | { op: 'fix.userByTenantEmail'; tenantId: string; emailHash: string; userId: string }
  | { op: 'delete.userByTenantEmail.orphan'; tenantId: string; emailHash: string; reason: string }
  | { op: 'delete.refreshToken.orphan'; tenantId: string; refreshTokenId: string; reason: string }
  | { op: 'delete.oneTimeToken.orphan'; tenantId: string; tokenId: string; table: 'emailVerificationTokens' | 'passwordResetTokens'; reason: string }
  | { op: 'delete.user.invalid'; tenantId: string; userKey: string; reason: string }

export type UserCleanupSummary = {
  usersBefore: number
  usersAfter: number
  deletedUsers: number
  anonymizedUsers: number
  duplicateGroups: number
  normalizedEmails: number
  normalizedPhones: number
  normalizedCpfs: number
  removedIncompleteUsers: number
  removedOrphanIndexes: number
  removedOrphanTokens: number
  skippedDeletions: number
}

export type UserCleanupPlan = {
  tenantId: string
  generatedAt: string
  options: Required<UserCleanupOptions>
  summary: UserCleanupSummary
  operations: UserCleanupOperation[]
  planDigest: string
}

type UserCleanupRunPayload = {
  mode?: 'dry-run' | 'apply'
  confirm?: unknown
  confirmToken?: unknown
  options?: UserCleanupOptions
}

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function normalizePhone(value?: string) {
  if (typeof value !== 'string') return undefined
  const digits = value.replace(/\D/g, '')
  if (!digits) return undefined
  return digits
}

function normalizeCpf(value?: unknown) {
  if (typeof value !== 'string') return undefined
  const digits = value.replace(/\D/g, '')
  if (!digits) return undefined
  return digits
}

function emailHash(email: string) {
  return sha256Hex(normalizeEmail(email))
}

function safeParseIsoMs(value: unknown) {
  if (typeof value !== 'string') return undefined
  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) return undefined
  return ms
}

function monthsToMs(months: number) {
  const m = Math.max(1, Math.min(120, Math.floor(months)))
  return m * 30 * 24 * 60 * 60 * 1000
}

function mergeUniqueById<T extends { id: string }>(a: T[], b: T[]) {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of a) {
    if (!item?.id) continue
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  for (const item of b) {
    if (!item?.id) continue
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
  }
  return out
}

function anonymizeUser(u: UserProfile, nowIso: string) {
  const tag = sha256Hex(`${u.tenantId}:${u.id}:${u.createdAt}`).slice(0, 12)
  u.name = 'Usuário Anônimo'
  u.email = `anon+${tag}@example.invalid`
  u.phone = undefined
  u.department = undefined
  u.avatarUrl = ''
  u.passwordHash = null
  u.emailVerifiedAt = null
  delete u.googleSub
  u.notifications = []
  u.activity = []
  u.supportTickets = []
  u.updatedAt = nowIso
  return tag
}

function selectDuplicateWinner(users: UserProfile[]) {
  const sorted = [...users].sort((a, b) => {
    const aAdmin = a.role === ROLE_ADMIN
    const bAdmin = b.role === ROLE_ADMIN
    if (aAdmin !== bAdmin) return aAdmin ? -1 : 1
    const aDisabled = Boolean(a.disabledAt)
    const bDisabled = Boolean(b.disabledAt)
    if (aDisabled !== bDisabled) return aDisabled ? 1 : -1
    const aVerified = Boolean(a.emailVerifiedAt)
    const bVerified = Boolean(b.emailVerifiedAt)
    if (aVerified !== bVerified) return aVerified ? -1 : 1
    const aHasAuth = Boolean(a.passwordHash) || Boolean(a.googleSub)
    const bHasAuth = Boolean(b.passwordHash) || Boolean(b.googleSub)
    if (aHasAuth !== bHasAuth) return aHasAuth ? -1 : 1
    const aUpdated = safeParseIsoMs(a.updatedAt) ?? 0
    const bUpdated = safeParseIsoMs(b.updatedAt) ?? 0
    if (aUpdated !== bUpdated) return aUpdated > bUpdated ? -1 : 1
    return a.id < b.id ? -1 : 1
  })
  return sorted[0]!
}

function rebuildUserByTenantEmail(db: DbShape, ops: UserCleanupOperation[]) {
  const next: Record<string, string> = {}
  for (const key of Object.keys(db.userByTenantEmail)) {
    delete db.userByTenantEmail[key]
  }
  for (const [userKey, u] of Object.entries(db.users)) {
    if (!u) continue
    const tenantId = u.tenantId
    if (typeof tenantId !== 'string' || tenantId.length === 0) continue
    if (typeof u.email !== 'string' || u.email.length === 0) continue
    const email = normalizeEmail(u.email)
    const indexKey = userEmailKey(tenantId, email)
    if (!next[indexKey]) {
      next[indexKey] = userKey
      ops.push({ op: 'fix.userByTenantEmail', tenantId, emailHash: emailHash(email), userId: u.id })
      continue
    }
    const existingUserKey = next[indexKey]!
    const existing = db.users[existingUserKey]
    const winner = existing ? selectDuplicateWinner([existing, u]) : u
    next[indexKey] = userDbKey(tenantId, winner.id)
  }
  db.userByTenantEmail = next
}

function cleanupOrphanTokens(db: DbShape, ops: UserCleanupOperation[]) {
  const existingUsers = new Set(Object.keys(db.users))
  let removed = 0
  for (const [id, rec] of Object.entries(db.refreshTokens)) {
    const userKey = userDbKey(rec.tenantId, rec.userId)
    if (!existingUsers.has(userKey)) {
      delete db.refreshTokens[id]
      ops.push({ op: 'delete.refreshToken.orphan', tenantId: rec.tenantId, refreshTokenId: id, reason: 'user missing' })
      removed++
    }
  }
  for (const [id, rec] of Object.entries(db.emailVerificationTokens)) {
    const userKey = userDbKey(rec.tenantId, rec.userId)
    if (!existingUsers.has(userKey)) {
      delete db.emailVerificationTokens[id]
      ops.push({ op: 'delete.oneTimeToken.orphan', tenantId: rec.tenantId, tokenId: id, table: 'emailVerificationTokens', reason: 'user missing' })
      removed++
    }
  }
  for (const [id, rec] of Object.entries(db.passwordResetTokens)) {
    const userKey = userDbKey(rec.tenantId, rec.userId)
    if (!existingUsers.has(userKey)) {
      delete db.passwordResetTokens[id]
      ops.push({ op: 'delete.oneTimeToken.orphan', tenantId: rec.tenantId, tokenId: id, table: 'passwordResetTokens', reason: 'user missing' })
      removed++
    }
  }
  return removed
}

function deleteUserAndRelated(
  db: DbShape,
  tenantId: string,
  userId: string,
  ops: UserCleanupOperation[],
  reason: string
) {
  const userKey = userDbKey(tenantId, userId)
  const u = db.users[userKey]
  const uEmailHash = u?.email ? emailHash(u.email) : undefined
  delete db.users[userKey]
  ops.push({ op: 'delete.user', tenantId, userId, emailHash: uEmailHash, reason })
  for (const [id, rec] of Object.entries(db.refreshTokens)) {
    if (rec.tenantId === tenantId && rec.userId === userId) delete db.refreshTokens[id]
  }
  for (const [id, rec] of Object.entries(db.emailVerificationTokens)) {
    if (rec.tenantId === tenantId && rec.userId === userId) delete db.emailVerificationTokens[id]
  }
  for (const [id, rec] of Object.entries(db.passwordResetTokens)) {
    if (rec.tenantId === tenantId && rec.userId === userId) delete db.passwordResetTokens[id]
  }
}

function resolveCleanupOptions(input?: UserCleanupOptions): Required<UserCleanupOptions> {
  return {
    inactiveMonths: typeof input?.inactiveMonths === 'number' ? input.inactiveMonths : 24,
    deleteInactive: typeof input?.deleteInactive === 'boolean' ? input.deleteInactive : true,
    anonymizeDisabled: typeof input?.anonymizeDisabled === 'boolean' ? input.anonymizeDisabled : true,
    removeIncomplete: typeof input?.removeIncomplete === 'boolean' ? input.removeIncomplete : true,
    dedupeByEmail: typeof input?.dedupeByEmail === 'boolean' ? input.dedupeByEmail : true,
    normalizeEmail: typeof input?.normalizeEmail === 'boolean' ? input.normalizeEmail : true,
    normalizePhone: typeof input?.normalizePhone === 'boolean' ? input.normalizePhone : true,
    validateRequired: typeof input?.validateRequired === 'boolean' ? input.validateRequired : true,
  }
}

function buildUserCleanupPlan(db: DbShape, tenantId: string, nowMs: number, options: Required<UserCleanupOptions>) {
  const ops: UserCleanupOperation[] = []
  const nextDb = JSON.parse(JSON.stringify(db)) as DbShape
  const nowIsoValue = new Date(nowMs).toISOString()
  const tenantPrefix = `${tenantId}:`

  const tenantUserKeys = Object.keys(nextDb.users).filter(k => k.startsWith(tenantPrefix))
  const usersBefore = tenantUserKeys.length

  let removedIncompleteUsers = 0
  let normalizedEmails = 0
  let normalizedPhones = 0
  let normalizedCpfs = 0
  let anonymizedUsers = 0
  let deletedUsers = 0
  let duplicateGroups = 0
  let skippedDeletions = 0

  for (const userKey of tenantUserKeys) {
    const u = nextDb.users[userKey] as any
    if (!u || typeof u !== 'object') {
      delete nextDb.users[userKey]
      ops.push({ op: 'delete.user.invalid', tenantId, userKey, reason: 'invalid object' })
      removedIncompleteUsers++
      continue
    }
    if (u.tenantId !== tenantId) {
      delete nextDb.users[userKey]
      ops.push({ op: 'delete.user.invalid', tenantId, userKey, reason: 'tenant mismatch' })
      removedIncompleteUsers++
      continue
    }
    if (options.validateRequired) {
      const hasBasics =
        typeof u.id === 'string' &&
        u.id.length > 0 &&
        typeof u.name === 'string' &&
        u.name.trim().length > 0 &&
        typeof u.email === 'string' &&
        u.email.trim().length > 0 &&
        typeof u.role === 'string' &&
        u.role.length > 0 &&
        typeof u.createdAt === 'string' &&
        typeof u.updatedAt === 'string'
      if (!hasBasics) {
        if (options.removeIncomplete) {
          delete nextDb.users[userKey]
          ops.push({ op: 'delete.user.invalid', tenantId, userKey, reason: 'missing required fields' })
          removedIncompleteUsers++
          continue
        }
        const anonKey = anonymizeUser(u as UserProfile, nowIsoValue)
        ops.push({ op: 'anonymize.user', tenantId, userId: String(u.id || anonKey), reason: 'missing required fields' })
        anonymizedUsers++
      }
    }

    if (options.normalizeEmail && typeof u.email === 'string') {
      const from = String(u.email)
      const to = normalizeEmail(from)
      if (from !== to) {
        u.email = to
        normalizedEmails++
        ops.push({ op: 'normalize.email', tenantId, userId: u.id, fromHash: emailHash(from), toHash: emailHash(to) })
      }
    }

    if (options.normalizePhone) {
      const from = u.phone
      const to = normalizePhone(typeof from === 'string' ? from : undefined)
      if ((typeof from === 'string' && from.trim().length > 0) || typeof to !== 'undefined') {
        if (to !== from) {
          u.phone = to
          normalizedPhones++
          ops.push({ op: 'normalize.phone', tenantId, userId: u.id })
        }
      }
    }

    const maybeCpf = normalizeCpf(u.cpf)
    if (typeof maybeCpf !== 'undefined') {
      if (maybeCpf !== u.cpf) {
        u.cpf = maybeCpf
        normalizedCpfs++
        ops.push({ op: 'normalize.cpf', tenantId, userId: u.id })
      }
    }
  }

  const tenantUsers = Object.entries(nextDb.users)
    .filter(([k]) => k.startsWith(tenantPrefix))
    .map(([, u]) => u)
    .filter(Boolean) as UserProfile[]

  if (options.dedupeByEmail) {
    const byEmail = new Map<string, UserProfile[]>()
    for (const u of tenantUsers) {
      const e = normalizeEmail(u.email)
      const list = byEmail.get(e) ?? []
      list.push(u)
      byEmail.set(e, list)
    }
    for (const [email, list] of byEmail.entries()) {
      if (list.length <= 1) continue
      duplicateGroups++
      const winner = selectDuplicateWinner(list)
      const emailDigest = emailHash(email)
      for (const loser of list) {
        if (loser.id === winner.id) continue
        const winnerKey = userDbKey(tenantId, winner.id)
        const loserKey = userDbKey(tenantId, loser.id)
        const w = nextDb.users[winnerKey]
        const l = nextDb.users[loserKey]
        if (w && l) {
          w.notifications = mergeUniqueById(w.notifications, l.notifications)
          w.activity = mergeUniqueById(w.activity, l.activity)
          w.supportTickets = mergeUniqueById(w.supportTickets, l.supportTickets)
          w.updatedAt = nowIsoValue
          nextDb.users[winnerKey] = w
        }
        ops.push({
          op: 'merge.duplicate',
          tenantId,
          winnerUserId: winner.id,
          loserUserId: loser.id,
          emailHash: emailDigest,
          reason: 'duplicate email',
        })
        deleteUserAndRelated(nextDb, tenantId, loser.id, ops, 'duplicate email')
        deletedUsers++
      }
    }
  }

  if (options.anonymizeDisabled) {
    for (const u of Object.values(nextDb.users)) {
      if (!u) continue
      if (u.tenantId !== tenantId) continue
      if (!u.disabledAt) continue
      if (u.role === ROLE_ADMIN) continue
      const anonEmailBefore = u.email
      anonymizeUser(u, nowIsoValue)
      ops.push({ op: 'anonymize.user', tenantId, userId: u.id, emailHash: emailHash(anonEmailBefore), reason: 'disabled user' })
      anonymizedUsers++
    }
  }

  if (options.deleteInactive) {
    const thresholdMs = nowMs - monthsToMs(options.inactiveMonths)
    const refreshLastUsedByUser = new Map<string, number>()
    for (const rec of Object.values(nextDb.refreshTokens)) {
      const ms = safeParseIsoMs(rec.lastUsedAt)
      if (!ms) continue
      const userKey = userDbKey(rec.tenantId, rec.userId)
      const prev = refreshLastUsedByUser.get(userKey) ?? 0
      if (ms > prev) refreshLastUsedByUser.set(userKey, ms)
    }

    for (const userKey of Object.keys(nextDb.users)) {
      if (!userKey.startsWith(tenantPrefix)) continue
      const u = nextDb.users[userKey]
      if (!u) continue
      if (u.role === ROLE_ADMIN) continue
      const updatedMs = safeParseIsoMs(u.updatedAt) ?? 0
      const tokenMs = refreshLastUsedByUser.get(userKey) ?? 0
      const lastActivityMs = Math.max(updatedMs, tokenMs)
      if (lastActivityMs > 0 && lastActivityMs < thresholdMs) {
        deleteUserAndRelated(nextDb, tenantId, u.id, ops, `inactive>${options.inactiveMonths}m`)
        deletedUsers++
      }
    }
  }

  rebuildUserByTenantEmail(nextDb, ops)

  let removedOrphanIndexes = 0
  for (const [indexKey, userKey] of Object.entries(nextDb.userByTenantEmail)) {
    const [indexTenantId, email] = indexKey.split(':', 2)
    if (!indexTenantId || !email) continue
    if (!nextDb.users[userKey]) {
      delete nextDb.userByTenantEmail[indexKey]
      ops.push({
        op: 'delete.userByTenantEmail.orphan',
        tenantId: indexTenantId,
        emailHash: emailHash(email),
        reason: 'user missing',
      })
      removedOrphanIndexes++
    }
  }

  const removedOrphanTokens = cleanupOrphanTokens(nextDb, ops)

  const usersAfter = Object.keys(nextDb.users).filter(k => k.startsWith(tenantPrefix)).length
  const summary: UserCleanupSummary = {
    usersBefore,
    usersAfter,
    deletedUsers,
    anonymizedUsers,
    duplicateGroups,
    normalizedEmails,
    normalizedPhones,
    normalizedCpfs,
    removedIncompleteUsers,
    removedOrphanIndexes,
    removedOrphanTokens,
    skippedDeletions,
  }

  const digest = sha256Hex(JSON.stringify({ tenantId, options, ops }))
  const plan: UserCleanupPlan = {
    tenantId,
    generatedAt: nowIsoValue,
    options,
    summary,
    operations: ops,
    planDigest: digest,
  }
  return { plan, nextDb }
}

function signCleanupToken(payload: string) {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex')
}

function createCleanupConfirmToken(planDigest: string, issuedAtSeconds: number) {
  const payload = `${issuedAtSeconds}.${planDigest}`
  const sig = signCleanupToken(payload)
  return `${payload}.${sig}`
}

function assertCleanupConfirmToken(token: string, expectedDigest: string, nowMs: number) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new ValidationError('Token de confirmação inválido')
  const issuedAtSeconds = Number(parts[0])
  const digest = parts[1]!
  const sig = parts[2]!
  if (!Number.isFinite(issuedAtSeconds)) throw new ValidationError('Token de confirmação inválido')
  if (digest !== expectedDigest) throw new ConflictError('Plano de limpeza mudou. Gere um novo dry-run.')
  const payload = `${issuedAtSeconds}.${digest}`
  const expected = signCleanupToken(payload)
  if (expected !== sig) throw new ValidationError('Token de confirmação inválido')
  const ageMs = nowMs - issuedAtSeconds * 1000
  if (ageMs < 0 || ageMs > 15 * 60 * 1000) throw new ValidationError('Token de confirmação expirado')
}

async function createProfileDbBackup() {
  if (profileStoreKind() === 'pg') {
    if (!isPostgresConfigured()) {
      const err: any = new Error('PostgreSQL não configurado (DATABASE_URL ou PGHOST)')
      err.status = 501
      throw err
    }
    await ensureProfilePgSchema()
    const backupId = randomId('profile_backup')
    await withPgTransaction(async client => {
      await client.query(`SELECT pg_advisory_xact_lock($1::bigint)`, [PROFILE_DB_LOCK_KEY])
      const res = await client.query<{ data: any }>(`SELECT data FROM sisteq_profile_db WHERE id = $1`, [PROFILE_DB_MAIN_ID])
      const snapshot = res.rows[0]?.data ?? emptyDb()
      await client.query(`INSERT INTO sisteq_profile_db_backups (id, data) VALUES ($1, $2)`, [backupId, snapshot])
    })
    return `pg:${backupId}`
  }

  await ensureDbDir()
  const src = dbFilePath()
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const dst = path.join(path.dirname(src), `profile.backup.${ts}.json`)
  try {
    await fs.copyFile(src, dst)
    return dst
  } catch (e: any) {
    if (e?.code !== 'ENOENT') throw e
    const db = await readDb()
    await fs.writeFile(dst, JSON.stringify(db, null, 2), 'utf8')
    return dst
  }
}

async function restoreProfileDbFromBackup(backupPath: string) {
  const raw = typeof backupPath === 'string' ? backupPath : ''
  if (raw.startsWith('pg:')) {
    const backupId = raw.slice('pg:'.length).trim()
    if (!backupId) throw new ValidationError('Backup inválido')
    if (!isPostgresConfigured()) {
      const err: any = new Error('PostgreSQL não configurado (DATABASE_URL ou PGHOST)')
      err.status = 501
      throw err
    }
    await ensureProfilePgSchema()
    await withPgTransaction(async client => {
      await client.query(`SELECT pg_advisory_xact_lock($1::bigint)`, [PROFILE_DB_LOCK_KEY])
      const b = await client.query<{ data: any }>(`SELECT data FROM sisteq_profile_db_backups WHERE id = $1`, [backupId])
      const snapshot = b.rows[0]?.data
      if (!snapshot) throw new NotFoundError('Backup não encontrado')
      await client.query(
        `
          INSERT INTO sisteq_profile_db (id, data, updated_at)
          VALUES ($1, $2, now())
          ON CONFLICT (id) DO UPDATE
            SET data = EXCLUDED.data,
                updated_at = now()
        `,
        [PROFILE_DB_MAIN_ID, snapshot],
      )
    })
    return
  }
  const fileRaw = await fs.readFile(raw, 'utf8')
  const backupDb = JSON.parse(fileRaw) as DbShape
  await writeDb(backupDb)
}

export async function runUserCleanupAsAdmin(tenantId: string, actorUserId: string, payload?: UserCleanupRunPayload) {
  await assertAdmin(tenantId, actorUserId)
  const mode: 'dry-run' | 'apply' = payload?.mode === 'apply' ? 'apply' : 'dry-run'
  const options = resolveCleanupOptions(payload?.options)
  const nowMs = Date.now()
  const { plan, nextDb } = buildUserCleanupPlan(await readDb(), tenantId, nowMs, options)
  if (mode === 'dry-run') {
    const confirmToken = createCleanupConfirmToken(plan.planDigest, Math.floor(nowMs / 1000))
    audit('admin.user.cleanup.dry_run', { tenantId, actorUserId, ...plan.summary })
    return { mode, plan, confirmToken }
  }

  if (payload?.confirm !== true) throw new ValidationError('Confirmação obrigatória para aplicar limpeza')
  if (typeof payload.confirmToken !== 'string') throw new ValidationError('Token de confirmação obrigatório')
  assertCleanupConfirmToken(payload.confirmToken, plan.planDigest, nowMs)
  const backupPath = await createProfileDbBackup()
  await writeDb(nextDb)
  audit('admin.user.cleanup.apply', { tenantId, actorUserId, ...plan.summary, backupPath })
  return { mode, ok: true, backupPath, summary: plan.summary }
}

export type PurgeAllUsersUserItem = {
  tenantId: string
  userId: string
  role: string
  email: string
  disabledAt: string | null
  createdAt: string
  updatedAt: string
}

export type PurgeAllUsersSummary = {
  total: number
  admins: number
  users: number
}

export type PurgeAllUsersPlan = {
  generatedAt: string
  users: PurgeAllUsersUserItem[]
  summary: PurgeAllUsersSummary
  planDigest: string
}

type PurgeAllUsersRunPayload = {
  mode?: 'dry-run' | 'apply'
  confirm?: unknown
  confirmToken?: unknown
  confirmPhrase?: unknown
  superToken?: unknown
}

function timingSafeEqualHex(aHex: string, bHex: string) {
  try {
    const a = Buffer.from(aHex, 'hex')
    const b = Buffer.from(bHex, 'hex')
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function assertSuperAdminToken(value: unknown) {
  const expected = process.env.SISTEQ_SUPER_ADMIN_TOKEN
  if (typeof expected !== 'string' || expected.trim().length < 16) {
    throw new ForbiddenError('Operação desabilitada: SISTEQ_SUPER_ADMIN_TOKEN ausente')
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ForbiddenError('Token de super-admin obrigatório')
  }
  const ok = timingSafeEqualHex(hashToken(value.trim()), hashToken(expected.trim()))
  if (!ok) throw new ForbiddenError('Token de super-admin inválido')
}

function createPurgeConfirmToken(planDigest: string, issuedAtSeconds: number) {
  const payload = `${issuedAtSeconds}.${planDigest}.purge_all_users`
  const sig = signCleanupToken(payload)
  return `${payload}.${sig}`
}

function assertPurgeConfirmToken(token: string, expectedDigest: string, nowMs: number) {
  const parts = token.split('.')
  if (parts.length !== 4) throw new ValidationError('Token de confirmação inválido')
  const issuedAtSeconds = Number(parts[0])
  const digest = parts[1]!
  const scope = parts[2]!
  const sig = parts[3]!
  if (!Number.isFinite(issuedAtSeconds)) throw new ValidationError('Token de confirmação inválido')
  if (scope !== 'purge_all_users') throw new ValidationError('Token de confirmação inválido')
  if (digest !== expectedDigest) throw new ConflictError('Plano de exclusão mudou. Gere um novo dry-run.')
  const payload = `${issuedAtSeconds}.${digest}.${scope}`
  const expected = signCleanupToken(payload)
  if (expected !== sig) throw new ValidationError('Token de confirmação inválido')
  const ageMs = nowMs - issuedAtSeconds * 1000
  if (ageMs < 0 || ageMs > 10 * 60 * 1000) throw new ValidationError('Token de confirmação expirado')
}

function buildPurgeAllUsersPlan(db: DbShape) {
  const users: PurgeAllUsersUserItem[] = Object.values(db.users)
    .filter(Boolean)
    .map(u => ({
      tenantId: u.tenantId,
      userId: u.id,
      role: u.role,
      email: normalizeEmail(u.email),
      disabledAt: u.disabledAt ?? null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }))
    .sort((a, b) => (a.tenantId === b.tenantId ? (a.createdAt < b.createdAt ? -1 : 1) : a.tenantId < b.tenantId ? -1 : 1))

  const admins = users.filter(u => u.role === ROLE_ADMIN).length
  const common = users.filter(u => u.role === ROLE_USER).length
  const summary: PurgeAllUsersSummary = { total: users.length, admins, users: common }
  const planDigest = sha256Hex(JSON.stringify({ users, summary }))
  const plan: PurgeAllUsersPlan = { generatedAt: nowIso(), users, summary, planDigest }
  return plan
}

function buildPurgeAllUsersNextDb(db: DbShape) {
  const next = JSON.parse(JSON.stringify(db)) as DbShape
  next.users = {}
  next.userByTenantEmail = {}
  next.refreshTokens = {}
  next.emailVerificationTokens = {}
  next.passwordResetTokens = {}
  return next
}

export async function purgeAllUsersAsAdmin(actorTenantId: string, actorUserId: string, payload?: PurgeAllUsersRunPayload) {
  await assertAdmin(actorTenantId, actorUserId)
  const mode: 'dry-run' | 'apply' = payload?.mode === 'apply' ? 'apply' : 'dry-run'
  const nowMs = Date.now()
  const db = await readDb()
  const plan = buildPurgeAllUsersPlan(db)

  if (mode === 'dry-run') {
    const confirmToken = createPurgeConfirmToken(plan.planDigest, Math.floor(nowMs / 1000))
    audit('admin.user.purge_all.dry_run', { tenantId: actorTenantId, actorUserId, ...plan.summary })
    return { mode, plan, confirmToken }
  }

  assertSuperAdminToken(payload?.superToken)
  if (payload?.confirm !== true) throw new ValidationError('Confirmação obrigatória para aplicar exclusão em massa')
  if (payload?.confirmPhrase !== 'DELETE ALL USERS') {
    throw new ValidationError('Frase de confirmação inválida')
  }
  if (typeof payload.confirmToken !== 'string') throw new ValidationError('Token de confirmação obrigatório')
  assertPurgeConfirmToken(payload.confirmToken, plan.planDigest, nowMs)

  const backupPath = await createProfileDbBackup()
  const nextDb = buildPurgeAllUsersNextDb(db)

  let rollbackOk: boolean | null = null
  try {
    await writeDb(nextDb)
    const verify = await readDb()
    if (Object.keys(verify.users).length !== 0) {
      throw new Error('Validação falhou: usuários remanescentes após purge')
    }
    rollbackOk = null
  } catch (e: any) {
    try {
      await restoreProfileDbFromBackup(backupPath)
      rollbackOk = true
    } catch {
      rollbackOk = false
    }
    audit('admin.user.purge_all.rollback', { tenantId: actorTenantId, actorUserId, rollbackOk })
    throw e
  }

  audit('admin.user.purge_all.apply', { tenantId: actorTenantId, actorUserId, ...plan.summary, backupPath })
  return { mode, ok: true, backupPath, summary: plan.summary, removedByRole: { admin: plan.summary.admins, user: plan.summary.users } }
}

async function mutateUser(tenantId: string, userId: string, mutator: (u: UserProfile) => void) {
  const db = await readDb()
  const key = userDbKey(tenantId, userId)
  const user = db.users[key]
  if (!user) throw new NotFoundError('Usuário não encontrado')
  mutator(user)
  user.updatedAt = nowIso()
  db.users[key] = user
  await writeDb(db)
  return user
}

export async function getMe(tenantId: string, userId: string) {
  const user = await getUserById(tenantId, userId)
  return publicUser(user)
}

export async function updateMe(
  tenantId: string,
  userId: string,
  payload: { name?: unknown; email?: unknown; phone?: unknown; department?: unknown; avatarUrl?: unknown }
) {
  const name = payload.name
  const email = payload.email
  if (typeof name !== 'undefined') assertNonEmptyString(name, 'Nome')
  if (typeof email !== 'undefined') assertValidEmail(email, 'E-mail')

  const phone = safeString(payload.phone)
  const department = safeString(payload.department)
  const avatarUrl = safeString(payload.avatarUrl)

  const db = await readDb()
  const key = userDbKey(tenantId, userId)
  const user = db.users[key]
  if (!user) throw new NotFoundError('Usuário não encontrado')

  if (typeof name !== 'undefined') user.name = String(name).trim()

  if (typeof email !== 'undefined') {
    const nextEmail = normalizeEmail(String(email))
    const oldEmailKey = userEmailKey(tenantId, user.email)
    const nextEmailKey = userEmailKey(tenantId, nextEmail)
    const existing = db.userByTenantEmail[nextEmailKey]
    if (existing && existing !== key) throw new ConflictError('E-mail já em uso')
    delete db.userByTenantEmail[oldEmailKey]
    db.userByTenantEmail[nextEmailKey] = key
    user.email = nextEmail
  }

  if (typeof payload.phone !== 'undefined') user.phone = phone
  if (typeof payload.department !== 'undefined') user.department = department
  if (typeof payload.avatarUrl !== 'undefined') user.avatarUrl = avatarUrl ?? user.avatarUrl

  user.activity.unshift({
    id: randomId('act'),
    type: 'profile.updated',
    createdAt: nowIso(),
  })

  user.updatedAt = nowIso()
  db.users[key] = user
  await writeDb(db)

  return publicUser(user)
}

export async function changePassword(
  tenantId: string,
  userId: string,
  payload: { currentPassword?: unknown; newPassword?: unknown }
) {
  assertNonEmptyString(payload.currentPassword, 'Senha atual')
  assertNonEmptyString(payload.newPassword, 'Nova senha')
  const currentPassword = String(payload.currentPassword)
  const newPassword = String(payload.newPassword)

  assertStrongPassword(newPassword)
  if (newPassword === currentPassword) throw new ValidationError('Nova senha deve ser diferente da senha atual')

  const user = await getUserById(tenantId, userId)
  const ok = await verifyPassword(currentPassword, user.passwordHash)
  if (!ok) throw new ValidationError('Senha atual incorreta')

  const nextHash = await hashPassword(newPassword)
  await mutateUser(tenantId, userId, u => {
    u.passwordHash = nextHash
    u.activity.unshift({
      id: randomId('act'),
      type: 'password.changed',
      createdAt: nowIso(),
    })
  })

  return { ok: true }
}

export async function getPreferences(tenantId: string, userId: string) {
  const u = await getUserById(tenantId, userId)
  return u.preferences
}

export async function updatePreferences(
  tenantId: string,
  userId: string,
  payload: Partial<Record<keyof ProfilePreferences, unknown>>
) {
  const next: Partial<ProfilePreferences> = {}
  if (typeof payload.theme !== 'undefined') {
    const v = payload.theme
    if (v !== 'system' && v !== 'light' && v !== 'dark') throw new ValidationError('Tema inválido')
    next.theme = v
  }
  if (typeof payload.language !== 'undefined') {
    const v = payload.language
    if (v !== 'pt-BR' && v !== 'en-US') throw new ValidationError('Idioma inválido')
    next.language = v
  }
  if (typeof payload.compactMode !== 'undefined') {
    assertBoolean(payload.compactMode, 'Modo compacto')
    next.compactMode = payload.compactMode as boolean
  }
  if (typeof payload.analyticsOptIn !== 'undefined') {
    assertBoolean(payload.analyticsOptIn, 'Analytics')
    next.analyticsOptIn = payload.analyticsOptIn as boolean
  }

  const user = await mutateUser(tenantId, userId, u => {
    u.preferences = { ...u.preferences, ...next }
    u.activity.unshift({
      id: randomId('act'),
      type: 'preferences.updated',
      createdAt: nowIso(),
    })
  })

  return user.preferences
}

export async function getNotificationSettings(tenantId: string, userId: string) {
  const u = await getUserById(tenantId, userId)
  return u.notificationSettings
}

export async function updateNotificationSettings(
  tenantId: string,
  userId: string,
  payload: Partial<Record<keyof ProfileNotificationSettings, unknown>>
) {
  const next: Partial<ProfileNotificationSettings> = {}
  if (typeof payload.email !== 'undefined') {
    assertBoolean(payload.email, 'Notificações por e-mail')
    next.email = payload.email as boolean
  }
  if (typeof payload.inApp !== 'undefined') {
    assertBoolean(payload.inApp, 'Notificações no app')
    next.inApp = payload.inApp as boolean
  }
  if (typeof payload.marketing !== 'undefined') {
    assertBoolean(payload.marketing, 'Notificações de marketing')
    next.marketing = payload.marketing as boolean
  }

  const user = await mutateUser(tenantId, userId, u => {
    u.notificationSettings = { ...u.notificationSettings, ...next }
    u.activity.unshift({
      id: randomId('act'),
      type: 'notifications.updated',
      createdAt: nowIso(),
    })
  })
  return user.notificationSettings
}

export async function listNotifications(tenantId: string, userId: string) {
  const u = await getUserById(tenantId, userId)
  const unreadCount = u.notifications.filter(n => !n.readAt).length
  return { unreadCount, items: u.notifications }
}

export async function markNotificationRead(tenantId: string, userId: string, payload: { id?: unknown }) {
  assertNonEmptyString(payload.id, 'id')
  const id = String(payload.id)
  const user = await mutateUser(tenantId, userId, u => {
    const n = u.notifications.find(x => x.id === id)
    if (!n) throw new NotFoundError('Notificação não encontrada')
    if (!n.readAt) n.readAt = nowIso()
    u.activity.unshift({
      id: randomId('act'),
      type: 'notification.read',
      createdAt: nowIso(),
      metadata: { notificationId: id },
    })
  })
  const unreadCount = user.notifications.filter(n => !n.readAt).length
  return { unreadCount }
}

export async function getPrivacy(tenantId: string, userId: string) {
  const u = await getUserById(tenantId, userId)
  return u.privacy
}

export async function updatePrivacy(
  tenantId: string,
  userId: string,
  payload: Partial<Record<keyof ProfilePrivacySettings, unknown>>
) {
  const next: Partial<ProfilePrivacySettings> = {}
  if (typeof payload.showEmail !== 'undefined') {
    assertBoolean(payload.showEmail, 'Exibir e-mail')
    next.showEmail = payload.showEmail as boolean
  }
  if (typeof payload.showActivity !== 'undefined') {
    assertBoolean(payload.showActivity, 'Exibir atividades')
    next.showActivity = payload.showActivity as boolean
  }

  const user = await mutateUser(tenantId, userId, u => {
    u.privacy = { ...u.privacy, ...next }
    u.activity.unshift({
      id: randomId('act'),
      type: 'privacy.updated',
      createdAt: nowIso(),
    })
  })
  return user.privacy
}

export async function listActivity(tenantId: string, userId: string, opts?: { limit?: number }) {
  const u = await getUserById(tenantId, userId)
  const limit = Math.max(1, Math.min(200, opts?.limit ?? 50))
  if (!u.privacy.showActivity) return []
  return u.activity.slice(0, limit)
}

export async function createSupportTicket(
  tenantId: string,
  userId: string,
  payload: { subject?: unknown; message?: unknown }
) {
  assertNonEmptyString(payload.subject, 'Assunto')
  assertNonEmptyString(payload.message, 'Mensagem')
  const subject = String(payload.subject).trim()
  const message = String(payload.message).trim()
  if (subject.length > 120) throw new ValidationError('Assunto deve ter no máximo 120 caracteres')
  if (message.length > 5000) throw new ValidationError('Mensagem deve ter no máximo 5000 caracteres')

  const id = randomId('tkt')
  const createdAt = nowIso()
  const ticket: SupportTicket = { id, subject, message, createdAt, status: 'open' }

  await mutateUser(tenantId, userId, u => {
    u.supportTickets.unshift(ticket)
    u.activity.unshift({
      id: randomId('act'),
      type: 'support.ticket.created',
      createdAt: nowIso(),
      metadata: { ticketId: id },
    })
  })

  return ticket
}

export async function listSupportTickets(tenantId: string, userId: string) {
  const u = await getUserById(tenantId, userId)
  return u.supportTickets
}
