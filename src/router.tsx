import React, { useContext, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

type RouterContextValue = {
  pathname: string
  search: string
  params: Record<string, string>
}

const RouterContext = React.createContext<RouterContextValue | null>(null)

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

  const pathname = ctx?.pathname ?? router.asPath.split('?')[0] ?? '/'
  const search = ctx?.search ?? (() => {
    const idx = router.asPath.indexOf('?')
    if (idx === -1) return ''
    return router.asPath.slice(idx)
  })()
  return { pathname, search }
}

export function useNavigate() {
  const router = useRouter()
  return (to: string | number, options?: { replace?: boolean; state?: any }) => {
    if (typeof to === 'number') {
      router.back()
      return
    }
    if (options?.replace) {
      router.replace(to)
      return
    }
    router.push(to)
  }
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

  const setSearchParams = (
    nextInit: Record<string, string> | URLSearchParams,
    options?: { replace?: boolean }
  ) => {
    const next = nextInit instanceof URLSearchParams ? nextInit : new URLSearchParams(nextInit)
    const qs = next.toString()
    const basePath = ctx?.pathname ?? router.asPath.split('?')[0] ?? '/'
    const href = qs ? `${basePath}?${qs}` : basePath
    if (options?.replace) {
      router.replace(href)
      return
    }
    router.push(href)
  }

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
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)

  const resolvedClassName =
    typeof className === 'function' ? className({ isActive }) : className ?? undefined

  const resolvedChildren =
    typeof children === 'function' ? children({ isActive }) : (children ?? null)

  return (
    <Link href={to} className={resolvedClassName} title={title}>
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
  return (
    <Link href={to} className={className}>
      {children}
    </Link>
  )
}

export { LinkCompat as Link }
