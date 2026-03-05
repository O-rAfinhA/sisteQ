import React, { useCallback, useContext, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

type RouterContextValue = {
  pathname: string
  search: string
  params: Record<string, string>
}

const RouterContext = React.createContext<RouterContextValue | null>(null)

function parseCompanyFromPathname(pathname: string): { companyId: string | null; innerPathname: string } {
  const m = /^\/empresa\/([^/]+)(\/.*)?$/.exec(pathname)
  if (!m) return { companyId: null, innerPathname: pathname }
  const companyId = decodeURIComponent(m[1] || '').trim()
  const innerPathname = m[2] ? String(m[2]) : '/'
  return { companyId: companyId || null, innerPathname }
}

function buildCompanyHref(companyId: string | null, to: string) {
  if (!companyId) return to
  if (!to.startsWith('/')) return to
  if (to === '/login' || to.startsWith('/login?')) return to
  if (to.startsWith('/empresa/')) return to
  const base = `/empresa/${encodeURIComponent(companyId)}`
  return to === '/' ? base : `${base}${to}`
}

export function RouterCompatProvider({
  pathname,
  search,
  params,
  children,
}: RouterContextValue & { children: React.ReactNode }) {
  const value = useMemo(() => ({ pathname, search, params }), [pathname, search, params])
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useLocation() {
  const router = useRouter()
  const ctx = useContext(RouterContext)

  const rawPathname = router.asPath.split('?')[0] ?? '/'
  const pathname = ctx?.pathname ?? parseCompanyFromPathname(rawPathname).innerPathname
  const search = ctx?.search ?? (() => {
    const idx = router.asPath.indexOf('?')
    if (idx === -1) return ''
    return router.asPath.slice(idx)
  })()
  return { pathname, search }
}

export function useNavigate() {
  const router = useRouter()
  const ctx = useContext(RouterContext)
  return useCallback((to: string | number, options?: { replace?: boolean; state?: any }) => {
    if (typeof to === 'number') {
      router.back()
      return
    }
    const rawPathname = router.asPath.split('?')[0] ?? '/'
    const companyId =
      (ctx?.params?.companyId ? String(ctx.params.companyId) : null) ?? parseCompanyFromPathname(rawPathname).companyId
    const href = buildCompanyHref(companyId, to)
    if (options?.replace) {
      router.replace(href)
      return
    }
    router.push(href)
  }, [ctx?.params?.companyId, router])
}

export function useParams<TParams extends Record<string, string> = Record<string, string>>() {
  const ctx = useContext(RouterContext)
  return (ctx?.params ?? {}) as TParams
}

export function useSearchParams(): [
  URLSearchParams,
  (nextInit: Record<string, string> | URLSearchParams, options?: { replace?: boolean }) => void,
] {
  const router = useRouter()
  const ctx = useContext(RouterContext)

  const search = ctx?.search ?? (() => {
    const idx = router.asPath.indexOf('?')
    if (idx === -1) return ''
    return router.asPath.slice(idx)
  })()

  const sp = useMemo(() => new URLSearchParams(search.startsWith('?') ? search.slice(1) : search), [search])

  const setSearchParams = useCallback((
    nextInit: Record<string, string> | URLSearchParams,
    options?: { replace?: boolean }
  ) => {
    const next = nextInit instanceof URLSearchParams ? nextInit : new URLSearchParams(nextInit)
    const qs = next.toString()
    const rawPathname = router.asPath.split('?')[0] ?? '/'
    const companyId =
      (ctx?.params?.companyId ? String(ctx.params.companyId) : null) ?? parseCompanyFromPathname(rawPathname).companyId
    const baseInnerPath = ctx?.pathname ?? parseCompanyFromPathname(rawPathname).innerPathname
    const basePath = buildCompanyHref(companyId, baseInnerPath)
    const href = qs ? `${basePath}?${qs}` : basePath
    if (options?.replace) {
      router.replace(href)
      return
    }
    router.push(href)
  }, [ctx?.params?.companyId, ctx?.pathname, router])

  return [sp, setSearchParams]
}

type NavLinkProps = {
  to: string
  end?: boolean
  className?: string | ((args: { isActive: boolean }) => string)
  title?: string
  children?: React.ReactNode | ((args: { isActive: boolean }) => React.ReactNode)
}

export function NavLink({ to, end, className, title, children }: NavLinkProps) {
  const { pathname } = useLocation()
  const params = useParams()
  const companyId = params?.companyId ? String((params as any).companyId) : null
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)

  const resolvedClassName =
    typeof className === 'function' ? className({ isActive }) : className ?? undefined

  const resolvedChildren =
    typeof children === 'function' ? children({ isActive }) : (children ?? null)

  return (
    <Link href={buildCompanyHref(companyId, to)} className={resolvedClassName} title={title}>
      {resolvedChildren}
    </Link>
  )
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const navigate = useNavigate()
  React.useEffect(() => {
    navigate(to, { replace: !!replace })
  }, [navigate, replace, to])
  return null
}

type LinkCompatProps = {
  to: string
  className?: string
  children: React.ReactNode
}

export function LinkCompat({ to, className, children }: LinkCompatProps) {
  const params = useParams()
  const companyId = params?.companyId ? String((params as any).companyId) : null
  return (
    <Link href={buildCompanyHref(companyId, to)} className={className}>
      {children}
    </Link>
  )
}

export { LinkCompat as Link }
