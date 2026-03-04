import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../config/constants'
import { installTenantLocalStorageShim, uninstallTenantLocalStorageShim } from './helpers'

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

beforeEach(() => {
  vi.restoreAllMocks()
  uninstallTenantLocalStorageShim()
  Object.defineProperty(window, 'localStorage', { value: createStorage(), configurable: true })
})

describe('tenant localStorage shim', () => {
  it('isola chaves entre tenants', () => {
    installTenantLocalStorageShim('tenantA')
    window.localStorage.setItem(STORAGE_KEYS.KPI_DATA, 'A')
    window.localStorage.setItem('sisteq-processos', 'PA')
    window.localStorage.setItem('planos-qualificacao', JSON.stringify([{ id: 1 }]))

    installTenantLocalStorageShim('tenantB')
    window.localStorage.setItem(STORAGE_KEYS.KPI_DATA, 'B')
    window.localStorage.setItem('sisteq-processos', 'PB')
    window.localStorage.setItem('planos-qualificacao', JSON.stringify([{ id: 2 }]))

    installTenantLocalStorageShim('tenantA')
    expect(window.localStorage.getItem(STORAGE_KEYS.KPI_DATA)).toBe('A')
    expect(window.localStorage.getItem('sisteq-processos')).toBe('PA')
    expect(window.localStorage.getItem('planos-qualificacao')).toBe(JSON.stringify([{ id: 1 }]))

    installTenantLocalStorageShim('tenantB')
    expect(window.localStorage.getItem(STORAGE_KEYS.KPI_DATA)).toBe('B')
    expect(window.localStorage.getItem('sisteq-processos')).toBe('PB')
    expect(window.localStorage.getItem('planos-qualificacao')).toBe(JSON.stringify([{ id: 2 }]))

    const raw = window.localStorage as any
    expect(raw.__data.has(`tenantA::${STORAGE_KEYS.KPI_DATA}`)).toBe(true)
    expect(raw.__data.has(`tenantB::${STORAGE_KEYS.KPI_DATA}`)).toBe(true)
    expect(raw.__data.has(`tenantA::planos-qualificacao`)).toBe(true)
    expect(raw.__data.has(`tenantB::planos-qualificacao`)).toBe(true)
  })

  it('migra chave legada para escopo do tenant na primeira leitura', () => {
    const raw = window.localStorage as any
    raw.setItem(STORAGE_KEYS.CONFIG_USUARIOS, JSON.stringify([{ id: 1 }]))
    expect(raw.__data.has(STORAGE_KEYS.CONFIG_USUARIOS)).toBe(true)

    installTenantLocalStorageShim('tenantA')
    expect(window.localStorage.getItem(STORAGE_KEYS.CONFIG_USUARIOS)).toBe(JSON.stringify([{ id: 1 }]))
    expect(raw.__data.has(STORAGE_KEYS.CONFIG_USUARIOS)).toBe(false)
    expect(raw.__data.has(`tenantA::${STORAGE_KEYS.CONFIG_USUARIOS}`)).toBe(true)
  })

  it('não migra nem lê chave legada quando pertence a outro tenant', () => {
    const raw = window.localStorage as any
    raw.setItem('__SISTEQ_LEGACY_OWNER_TENANT__', 'tenantA')
    raw.setItem(STORAGE_KEYS.CONFIG_USUARIOS, JSON.stringify([{ id: 1 }]))

    installTenantLocalStorageShim('tenantB')
    expect(window.localStorage.getItem(STORAGE_KEYS.CONFIG_USUARIOS)).toBeNull()
    expect(raw.__data.has(STORAGE_KEYS.CONFIG_USUARIOS)).toBe(true)
    expect(raw.__data.has(`tenantB::${STORAGE_KEYS.CONFIG_USUARIOS}`)).toBe(false)

    installTenantLocalStorageShim('tenantA')
    expect(window.localStorage.getItem(STORAGE_KEYS.CONFIG_USUARIOS)).toBe(JSON.stringify([{ id: 1 }]))
    expect(raw.__data.has(STORAGE_KEYS.CONFIG_USUARIOS)).toBe(false)
    expect(raw.__data.has(`tenantA::${STORAGE_KEYS.CONFIG_USUARIOS}`)).toBe(true)
  })
})
