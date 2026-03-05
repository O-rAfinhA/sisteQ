import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../config/constants'
import { installTenantLocalStorageShim, resetApplication, uninstallTenantLocalStorageShim, waitForTenantKvHydration } from './helpers'

function createStorage() {
  const data = new Map<string, string>()
  return {
    __data: data,
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null
    },
    key(index: number) {
      return Array.from(data.keys())[index] ?? null
    },
    removeItem(key: string) {
      data.delete(key)
    },
    setItem(key: string, value: string) {
      data.set(key, String(value))
    },
  }
}

function stubLocationReplace() {
  const replaceMock = vi.fn()
  const loc = window.location as any
  try {
    vi.spyOn(window.location, 'replace').mockImplementation(replaceMock as any)
    return replaceMock
  } catch {
    try {
      Object.defineProperty(window, 'location', {
        value: { ...loc, replace: replaceMock },
        writable: true,
      })
      return replaceMock
    } catch {
      loc.replace = replaceMock
      return replaceMock
    }
  }
}

function makeIndexedDbMock() {
  const deleteDatabase = vi.fn((name: string) => {
    const req: any = {}
    queueMicrotask(() => {
      req.onsuccess?.({ target: { result: undefined } })
    })
    return req
  })

  return {
    databases: vi.fn(async () => [{ name: 'db1' }, { name: 'db2' }]),
    deleteDatabase,
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
  uninstallTenantLocalStorageShim()
  Object.defineProperty(window, 'localStorage', { value: createStorage(), configurable: true })
  Object.defineProperty(window, 'sessionStorage', { value: createStorage(), configurable: true })
})

describe('resetApplication', () => {
  it('limpa armazenamento, IndexedDB, caches, service workers e redireciona', async () => {
    window.localStorage.setItem('k1', 'v1')
    window.sessionStorage.setItem('k2', 'v2')

    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }) as any)
    vi.stubGlobal('fetch', fetchMock as any)

    const cachesMock = {
      keys: vi.fn(async () => ['c1', 'c2']),
      delete: vi.fn(async () => true),
    }
    vi.stubGlobal('caches', cachesMock as any)

    const indexedDbMock = makeIndexedDbMock()
    vi.stubGlobal('indexedDB', indexedDbMock as any)

    const unregisterMock = vi.fn(async () => true)
    const getRegistrationsMock = vi.fn(async () => [{ unregister: unregisterMock }])
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistrations: getRegistrationsMock },
      configurable: true,
    })

    const historySpy = vi.spyOn(window.history, 'replaceState')
    const replaceMock = stubLocationReplace()

    const onReset = vi.fn()
    window.addEventListener('sisteq:reset', onReset)

    await resetApplication({ redirectTo: '/login?reset=1' })

    expect(onReset).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/cleanup', { method: 'POST', credentials: 'same-origin' })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
    expect(indexedDbMock.databases).toHaveBeenCalled()
    expect(indexedDbMock.deleteDatabase).toHaveBeenCalledWith('db1')
    expect(indexedDbMock.deleteDatabase).toHaveBeenCalledWith('db2')
    expect(cachesMock.keys).toHaveBeenCalled()
    expect(cachesMock.delete).toHaveBeenCalledWith('c1')
    expect(cachesMock.delete).toHaveBeenCalledWith('c2')
    expect(getRegistrationsMock).toHaveBeenCalled()
    expect(unregisterMock).toHaveBeenCalled()
    expect(historySpy).toHaveBeenCalledWith(null, '', '/login?reset=1')
    expect(replaceMock).toHaveBeenCalledWith('/login?reset=1')
  })

  it('respeita flags para não limpar determinadas áreas', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }) as any)
    vi.stubGlobal('fetch', fetchMock as any)

    const cachesMock = {
      keys: vi.fn(async () => ['c1']),
      delete: vi.fn(async () => true),
    }
    vi.stubGlobal('caches', cachesMock as any)

    const indexedDbMock = makeIndexedDbMock()
    vi.stubGlobal('indexedDB', indexedDbMock as any)

    const getRegistrationsMock = vi.fn(async () => [{ unregister: vi.fn(async () => true) }])
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistrations: getRegistrationsMock },
      configurable: true,
    })

    const historySpy = vi.spyOn(window.history, 'replaceState')
    const replaceMock = stubLocationReplace()

    await resetApplication({
      redirectTo: '/x',
      logout: false,
      clearIndexedDb: false,
      clearCacheStorage: false,
      unregisterServiceWorkers: false,
      clearHistory: false,
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(indexedDbMock.databases).not.toHaveBeenCalled()
    expect(cachesMock.keys).not.toHaveBeenCalled()
    expect(getRegistrationsMock).not.toHaveBeenCalled()
    expect(historySpy).not.toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledWith('/x')
  })

  it('flusha writes pendentes do KV antes de efetivar logout', async () => {
    vi.useFakeTimers()
    const calls: string[] = []
    const fetchMock = vi.fn(async (input: any) => {
      const url = typeof input === 'string' ? input : input?.url
      calls.push(String(url))
      if (url === '/api/profile/kv') return { ok: true, json: async () => ({}) } as any
      if (url === '/api/auth/cleanup') return { ok: true, json: async () => ({}) } as any
      if (url === '/api/auth/logout') return { ok: true, json: async () => ({}) } as any
      if (url === '/api/profile/kv/batch') return { ok: true, json: async () => ({ values: {} }) } as any
      if (String(url).startsWith('/api/profile/kv/list')) return { ok: true, json: async () => ({ keys: [] }) } as any
      return { ok: true, json: async () => ({}) } as any
    })
    vi.stubGlobal('fetch', fetchMock as any)

    const replaceMock = stubLocationReplace()

    installTenantLocalStorageShim('tenantA')
    window.localStorage.setItem('sisteq-docs-clientes', JSON.stringify([{ id: 'd1' }]))

    await resetApplication({
      redirectTo: '/login?logout=1',
      clearIndexedDb: false,
      clearCacheStorage: false,
      unregisterServiceWorkers: false,
      clearHistory: false,
    })

    expect(calls[0]).toBe('/api/profile/kv')
    expect(calls).toContain('/api/auth/cleanup')
    expect(calls).toContain('/api/auth/logout')
    expect(replaceMock).toHaveBeenCalledWith('/login?logout=1')

    await vi.runAllTimersAsync()
    expect(calls.filter(c => c === '/api/profile/kv').length).toBe(1)
    vi.useRealTimers()
  })

  it('mantém documentos após logout/login via KV', async () => {
    vi.useFakeTimers()
    const serverKv = new Map<string, any>()
    let lastBatchKeys: string[] = []
    let lastBatchValues: Record<string, any> = {}

    const fetchMock = vi.fn(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input?.url

      if (url === '/api/profile/kv') {
        const body = JSON.parse(String(init?.body ?? '{}'))
        serverKv.set(String(body?.key ?? ''), body?.value)
        return { ok: true, json: async () => ({ ok: true }) } as any
      }

      if (url === '/api/profile/kv/batch') {
        const body = JSON.parse(String(init?.body ?? '{}'))
        const keys = Array.isArray(body?.keys) ? body.keys.map((k: any) => String(k)) : []
        const values: Record<string, any> = {}
        for (const k of keys) {
          if (serverKv.has(k)) values[k] = serverKv.get(k)
        }
        lastBatchKeys = keys
        lastBatchValues = values
        return { ok: true, json: async () => ({ values }) } as any
      }

      if (String(url).startsWith('/api/profile/kv/list')) {
        return { ok: true, json: async () => ({ keys: [] }) } as any
      }

      if (url === '/api/auth/cleanup') return { ok: true, json: async () => ({}) } as any
      if (url === '/api/auth/logout') return { ok: true, json: async () => ({}) } as any

      return { ok: true, json: async () => ({}) } as any
    })
    vi.stubGlobal('fetch', fetchMock as any)

    stubLocationReplace()

    const payloads: Array<{ key: string; value: any }> = [
      {
        key: STORAGE_KEYS.DOCS_CLIENTES,
        value: [{ id: 'd1', nomeDocumento: 'Doc cliente', arquivoBase64: 'data:application/pdf;base64,AAAA' }],
      },
      {
        key: STORAGE_KEYS.DOCS_INTERNOS,
        value: [{ id: 'd2', nome: 'Doc interno', conteudoHtml: '<p>ok</p>' }],
      },
      {
        key: STORAGE_KEYS.DOCS_EXTERNOS,
        value: [{ id: 'd3', nome: 'Doc externo', arquivoBase64: 'data:application/pdf;base64,BBBB' }],
      },
      {
        key: STORAGE_KEYS.DOCS_LICENCAS,
        value: [{ id: 'd4', nome: 'Licença', arquivoBase64: 'data:application/pdf;base64,CCCC' }],
      },
      {
        key: STORAGE_KEYS.DOCS_CERTIDOES,
        value: [{ id: 'd5', nome: 'Certidão', arquivoBase64: 'data:application/pdf;base64,DDDD' }],
      },
    ]

    installTenantLocalStorageShim('tenantA')
    for (const p of payloads) {
      window.localStorage.setItem(p.key, JSON.stringify(p.value))
    }

    await resetApplication({
      redirectTo: '/login?logout=1',
      clearIndexedDb: false,
      clearCacheStorage: false,
      unregisterServiceWorkers: false,
      clearHistory: false,
    })

    for (const p of payloads) {
      expect(serverKv.get(p.key)).toEqual(p.value)
    }

    uninstallTenantLocalStorageShim()
    Object.defineProperty(window, 'localStorage', { value: createStorage(), configurable: true })
    Object.defineProperty(window, 'sessionStorage', { value: createStorage(), configurable: true })

    installTenantLocalStorageShim('tenantA')
    await vi.runAllTimersAsync()
    await waitForTenantKvHydration('tenantA')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile/kv/batch',
      expect.objectContaining({ method: 'POST' }),
    )
    for (const p of payloads) {
      expect(lastBatchKeys).toContain(p.key)
      expect(Object.prototype.hasOwnProperty.call(lastBatchValues, p.key)).toBe(true)
    }
    const raw = window.localStorage as any
    for (const p of payloads) {
      expect(raw.__data.has(`tenantA::${p.key}`)).toBe(true)
      expect(window.localStorage.getItem(p.key)).toBe(JSON.stringify(p.value))
    }
    vi.useRealTimers()
  })

  it('perde documentos após logout quando KV falha no servidor', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input?.url

      if (url === '/api/profile/kv') {
        return { ok: false, status: 500, json: async () => ({ error: 'db down' }) } as any
      }

      if (url === '/api/profile/kv/batch') {
        return { ok: true, json: async () => ({ values: {} }) } as any
      }

      if (String(url).startsWith('/api/profile/kv/list')) {
        return { ok: true, json: async () => ({ keys: [] }) } as any
      }

      if (url === '/api/auth/cleanup') return { ok: true, json: async () => ({}) } as any
      if (url === '/api/auth/logout') return { ok: true, json: async () => ({}) } as any

      return { ok: true, json: async () => ({}) } as any
    })
    vi.stubGlobal('fetch', fetchMock as any)

    stubLocationReplace()

    const docs = [{ id: 'd1', nomeDocumento: 'Doc', arquivoBase64: 'data:application/pdf;base64,AAAA' }]

    installTenantLocalStorageShim('tenantA')
    window.localStorage.setItem(STORAGE_KEYS.DOCS_CLIENTES, JSON.stringify(docs))

    await resetApplication({
      redirectTo: '/login?logout=1',
      clearIndexedDb: false,
      clearCacheStorage: false,
      unregisterServiceWorkers: false,
      clearHistory: false,
    })

    uninstallTenantLocalStorageShim()
    Object.defineProperty(window, 'localStorage', { value: createStorage(), configurable: true })
    Object.defineProperty(window, 'sessionStorage', { value: createStorage(), configurable: true })

    installTenantLocalStorageShim('tenantA')
    await vi.runAllTimersAsync()
    await waitForTenantKvHydration('tenantA')

    expect(window.localStorage.getItem(STORAGE_KEYS.DOCS_CLIENTES)).toBe(null)
    vi.useRealTimers()
  })
})
