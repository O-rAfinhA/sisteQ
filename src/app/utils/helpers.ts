/**
 * Utilities e Helpers Consolidados
 * Centraliza funções utilitárias comuns para evitar duplicação
 */

import { STORAGE_KEYS } from '../config/constants';

// ============ ARRAY HELPERS ============

/**
 * Remove item de array por ID
 */
export function removeById<T extends { id: string }>(array: T[], id: string): T[] {
  return array.filter(item => item.id !== id);
}

/**
 * Atualiza item de array por ID
 */
export function updateById<T extends { id: string }>(
  array: T[],
  id: string,
  updates: Partial<T>
): T[] {
  return array.map(item => (item.id === id ? { ...item, ...updates } : item));
}

/**
 * Encontra item por ID
 */
export function findById<T extends { id: string }>(array: T[], id: string): T | undefined {
  return array.find(item => item.id === id);
}

/**
 * Ordena array por campo
 */
export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

// ============ STRING HELPERS ============

/**
 * Trunca string com reticências
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Converte para slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ============ DATE HELPERS ============

/**
 * Verifica se data está vencida
 */
export function isOverdue(date: string | Date): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return targetDate < new Date();
}

/**
 * Verifica se data vence em N dias
 */
export function isDueSoon(date: string | Date, days: number): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

/**
 * Calcula diferença em dias entre duas datas
 */
export function daysBetween(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============ NUMBER HELPERS ============

/**
 * Formata porcentagem
 */
export function formatPercentage(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calcula porcentagem
 */
export function calculatePercentage(partial: number, total: number): number {
  if (total === 0) return 0;
  return (partial / total) * 100;
}

/**
 * Arredonda para N casas decimais
 */
export function roundTo(num: number, decimals: number): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// ============ OBJECT HELPERS ============

/**
 * Remove propriedades undefined/null de objeto
 */
export function cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key as keyof T] = value;
    }
    return acc;
  }, {} as Partial<T>);
}

/**
 * Deep clone de objeto
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Compara dois objetos (shallow)
 */
export function shallowEqual(obj1: any, obj2: any): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
}

// ============ VALIDATION HELPERS ============

/**
 * Valida email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida CNPJ
 */
export function isValidCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
}

/**
 * Valida CPF
 */
export function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let result = 11 - (sum % 11);
  if (result === 10 || result === 11) result = 0;
  if (result !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  result = 11 - (sum % 11);
  if (result === 10 || result === 11) result = 0;
  return result === parseInt(cpf.charAt(10));
}

// ============ STORAGE HELPERS ============

/**
 * Safe localStorage get
 */
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return defaultValue;
  if (typeof localStorage.getItem !== 'function') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
}

/**
 * Safe localStorage set
 */
export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;
  if (typeof localStorage.setItem !== 'function') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
  }
}

/**
 * Safe localStorage remove
 */
export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;
  if (typeof localStorage.removeItem !== 'function') return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
  }
}

const TENANT_ID_SESSION_KEY = 'sisteq:tenantId';
const TENANT_SHIM_KEY = '__SISTEQ_TENANT_SHIM__';
const LEGACY_OWNER_TENANT_KEY = '__SISTEQ_LEGACY_OWNER_TENANT__';
const FETCH_SHIM_KEY = '__SISTEQ_FETCH_SHIM__';
const KV_SYNC_STATE_KEY = '__SISTEQ_KV_SYNC__';

function getKvSyncState() {
  const state: any = (globalThis as any)[KV_SYNC_STATE_KEY];
  if (state && typeof state === 'object') return state;
  const next: any = {
    timers: new Map<string, any>(),
    pendingWrites: new Map<string, string>(),
    hydrationPromises: new Map<string, Promise<void>>(),
    hydratedTenants: new Set<string>(),
  };
  (globalThis as any)[KV_SYNC_STATE_KEY] = next;
  return next;
}

export async function flushTenantKvWrites(): Promise<void> {
  if (typeof fetch !== 'function') return;
  const state = getKvSyncState();
  const entries = Array.from(state.pendingWrites.entries()) as Array<[string, string]>;
  if (entries.length === 0) return;

  for (const [k] of entries) {
    const timer = state.timers.get(k);
    if (timer) {
      try {
        clearTimeout(timer);
      } catch {
      }
    }
    state.timers.delete(k);
  }

  const parseForServer = (rawValue: string) => {
    const s = String(rawValue ?? '');
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  };

  await Promise.all(
    entries.map(async ([key, rawValue]) => {
      try {
        await fetch('/api/profile/kv', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key, value: parseForServer(rawValue) }),
        });
      } catch {
      } finally {
        state.pendingWrites.delete(key);
      }
    }),
  );
}

export async function waitForTenantKvHydration(tenantId: string): Promise<void> {
  const tid = String(tenantId ?? '').trim();
  if (!tid) return Promise.resolve();
  const state = getKvSyncState();
  if (state.hydratedTenants.has(tid)) return Promise.resolve();
  const existing = state.hydrationPromises.get(tid);
  if (existing) return existing;

  await new Promise<void>(resolve => setTimeout(resolve, 0));
  if (state.hydratedTenants.has(tid)) return;
  const afterTick = state.hydrationPromises.get(tid);
  if (afterTick) return afterTick;

  if (typeof window === 'undefined') return Promise.resolve();
  return new Promise(resolve => {
    const handler = (evt: Event) => {
      const detail = (evt as any)?.detail;
      const hydratedTid = String(detail?.tenantId ?? '').trim();
      if (hydratedTid !== tid) return;
      try {
        window.removeEventListener('sisteq:kv-hydrated', handler as any);
      } catch {
      }
      resolve();
    };
    try {
      window.addEventListener('sisteq:kv-hydrated', handler as any, { once: false } as any);
    } catch {
      resolve();
      return;
    }
    setTimeout(() => {
      try {
        window.removeEventListener('sisteq:kv-hydrated', handler as any);
      } catch {
      }
      resolve();
    }, 8000);
  });
}

function storageSafeGet(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function storageSafeSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
  }
}

function storageSafeRemove(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
  }
}

export function getTenantIdFromSession(): string | null {
  if (typeof window === 'undefined') return null;
  const ss: any = (window as any).sessionStorage;
  if (!ss || typeof ss.getItem !== 'function') return null;
  const raw = storageSafeGet(ss, TENANT_ID_SESSION_KEY);
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return raw.trim();
}

export function setTenantIdToSession(tenantId: string | null) {
  if (typeof window === 'undefined') return;
  const ss: any = (window as any).sessionStorage;
  if (!ss) return;
  if (!tenantId) {
    storageSafeRemove(ss, TENANT_ID_SESSION_KEY);
    return;
  }
  storageSafeSet(ss, TENANT_ID_SESSION_KEY, tenantId);
}

export function clearTenantSession() {
  if (typeof window === 'undefined') return;
  const ss: any = (window as any).sessionStorage;
  if (!ss || typeof ss.clear !== 'function') return;
  try {
    ss.clear();
  } catch {
  }
}

export function clearTenantLocalCache(tenantId: string) {
  if (typeof window === 'undefined') return;
  const ls: any = (window as any).localStorage;
  if (!ls || typeof ls.length !== 'number' || typeof ls.key !== 'function') return;
  const prefix = `${tenantId}::`;
  const toRemove: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (typeof k !== 'string') continue;
    if (k.startsWith(prefix)) toRemove.push(k);
  }
  for (const k of toRemove) {
    try {
      ls.removeItem(k);
    } catch {
    }
  }
}

export function installTenantLocalStorageShim(tenantId: string) {
  if (typeof window === 'undefined') return;
  const ls: any = (window as any).localStorage;
  if (!ls || typeof ls.getItem !== 'function' || typeof ls.setItem !== 'function') return;

  const scopedKeys = new Set<string>(Object.values(STORAGE_KEYS));
  const shouldScope = (key: string) => {
    const k = String(key ?? '');
    if (!k) return false;
    if (k.includes('::')) return false;
    if (k.startsWith('__SISTEQ_')) return false;
    return true;
  };

  const shouldSyncKv = (key: string) => {
    const k = String(key ?? '');
    if (!k) return false;
    if (scopedKeys.has(k)) return true;
    if (k === 'planos-qualificacao') return true;
    if (k.startsWith('sisteq-requisitos-')) return true;
    return false;
  };

  const parseForServer = (rawValue: string) => {
    const s = String(rawValue ?? '');
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  };

  const stringifyForStorage = (value: any) => {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  };

  const scheduleKvWrite = (k: string, rawValue: string) => {
    if (typeof fetch !== 'function') return;
    const syncState = getKvSyncState();
    const shimState: any = (globalThis as any)[TENANT_SHIM_KEY];
    const canSync = typeof shimState?.shouldSyncKv === 'function' ? Boolean(shimState.shouldSyncKv(k)) : false;
    if (!canSync) return;
    syncState.pendingWrites.set(k, rawValue);
    const timer = syncState.timers.get(k);
    if (timer) clearTimeout(timer);
    syncState.timers.set(
      k,
      setTimeout(() => {
        syncState.timers.delete(k);
        const latestRaw = syncState.pendingWrites.get(k) ?? rawValue;
        fetch('/api/profile/kv', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key: k, value: parseForServer(latestRaw) }),
        })
          .catch(() => {})
          .finally(() => {
            syncState.pendingWrites.delete(k);
          });
      }, 900),
    );
  };

  const hydrateKvToLocalStorage = (io: { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void }) => {
    if (typeof fetch !== 'function') return;
    const state = getKvSyncState();
    if (state.hydratedTenants.has(tenantId)) return;
    if (state.hydrationPromises.has(tenantId)) return;

    const keys = Array.from(new Set<string>([...Object.values(STORAGE_KEYS), 'planos-qualificacao']));
    const fetchBatch = (allKeys: string[]) =>
      fetch('/api/profile/kv/batch', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ keys: allKeys }),
      })
        .then(async res => {
          const json = await res.json().catch(() => null);
          if (!res.ok) return;
          const values = (json?.values ?? {}) as Record<string, any>;
          for (const key of allKeys) {
            if (!(key in values)) continue;
            const v = values[key];
            const raw = stringifyForStorage(v);
            if (raw == null) continue;
            try {
              const scoped = `${tenantId}::${key}`;
              if (io.getItem(scoped) != null) continue;
              io.setItem(scoped, raw);
            } catch {
            }
          }
        })
        .catch(() => {});

    const hydrationPromise = (async () => {
      await fetchBatch(keys);
      await fetch(`/api/profile/kv/list?prefix=${encodeURIComponent('sisteq-requisitos-')}&limit=500`, {
        method: 'GET',
        credentials: 'same-origin',
      })
        .then(async res => {
          const json = await res.json().catch(() => null);
          if (!res.ok) return;
          const extraKeys = Array.isArray(json?.keys) ? (json.keys as any[]).map(k => String(k)).filter(Boolean) : [];
          if (extraKeys.length === 0) return;
          await fetchBatch(extraKeys);
        })
        .catch(() => {});
    })()
      .catch(() => {})
      .finally(() => {
        state.hydrationPromises.delete(tenantId);
        state.hydratedTenants.add(tenantId);
        try {
          window.dispatchEvent(new CustomEvent('sisteq:kv-hydrated', { detail: { tenantId } }));
        } catch {
          try {
            window.dispatchEvent(new Event('sisteq:kv-hydrated'));
          } catch {
          }
        }
      });

    state.hydrationPromises.set(tenantId, hydrationPromise);
  };

  const existing: any = (globalThis as any)[TENANT_SHIM_KEY];
  if (existing && existing.installed) {
    existing.tenantId = tenantId;
    existing.shouldScope = shouldScope;
    existing.shouldSyncKv = shouldSyncKv;
    try {
      const getItem = typeof existing.originalGetItem === 'function' ? existing.originalGetItem : ls.getItem.bind(ls);
      const setItem = typeof existing.originalSetItem === 'function' ? existing.originalSetItem : ls.setItem.bind(ls);
      setTimeout(() => hydrateKvToLocalStorage({ getItem, setItem }), 0);
    } catch {
    }
    return;
  }

  const originalGetItem = ls.getItem.bind(ls);
  const originalSetItem = ls.setItem.bind(ls);
  const originalRemoveItem = typeof ls.removeItem === 'function' ? ls.removeItem.bind(ls) : null;

  const buildKey = (key: string) => `${tenantId}::${key}`;

  const shimState: any = {
    installed: true,
    tenantId,
    shouldScope,
    shouldSyncKv,
    originalGetItem,
    originalSetItem,
    originalRemoveItem,
  };
  (globalThis as any)[TENANT_SHIM_KEY] = shimState;

  ls.getItem = (key: string) => {
    const state: any = (globalThis as any)[TENANT_SHIM_KEY];
    const tid = typeof state?.tenantId === 'string' ? state.tenantId : tenantId;
    const k = String(key ?? '');
    if (!k) return originalGetItem(k);
    if (!state?.shouldScope?.(k)) return originalGetItem(k);

    const scoped = `${tid}::${k}`;
    const v = originalGetItem(scoped);
    if (v != null) return v;

    const legacy = originalGetItem(k);
    if (legacy != null) {
      const owner = originalGetItem(LEGACY_OWNER_TENANT_KEY);
      const canMigrate = !owner || owner === tid;
      if (!canMigrate) return null;
      try {
        originalSetItem(scoped, legacy);
        if (!owner) originalSetItem(LEGACY_OWNER_TENANT_KEY, tid);
        if (originalRemoveItem) originalRemoveItem(k);
      } catch {
      }
      return legacy;
    }
    return null;
  };

  ls.setItem = (key: string, value: string) => {
    const state: any = (globalThis as any)[TENANT_SHIM_KEY];
    const tid = typeof state?.tenantId === 'string' ? state.tenantId : tenantId;
    const k = String(key ?? '');
    if (!k) return originalSetItem(k, value);
    if (!state?.shouldScope?.(k)) return originalSetItem(k, value);
    const out = originalSetItem(`${tid}::${k}`, value);
    scheduleKvWrite(k, value);
    return out;
  };

  if (originalRemoveItem) {
    ls.removeItem = (key: string) => {
      const state: any = (globalThis as any)[TENANT_SHIM_KEY];
      const tid = typeof state?.tenantId === 'string' ? state.tenantId : tenantId;
      const k = String(key ?? '');
      if (!k) return originalRemoveItem(k);
      if (!state?.shouldScope?.(k)) return originalRemoveItem(k);
      return originalRemoveItem(`${tid}::${k}`);
    };
  }

  try {
    const owner = originalGetItem(LEGACY_OWNER_TENANT_KEY);
    const canMigrate = !owner || owner === tenantId;
    let claimedOwner = Boolean(owner);
    if (!canMigrate) return;
    for (const k of scopedKeys) {
      const legacy = originalGetItem(k);
      if (legacy == null) continue;
      try {
        originalSetItem(buildKey(k), legacy);
        if (!claimedOwner) {
          originalSetItem(LEGACY_OWNER_TENANT_KEY, tenantId);
          claimedOwner = true;
        }
        if (originalRemoveItem) originalRemoveItem(k);
      } catch {
      }
    }
  } catch {
  }

  try {
    setTimeout(() => hydrateKvToLocalStorage({ getItem: originalGetItem, setItem: originalSetItem }), 0);
  } catch {
  }
}

export function uninstallTenantLocalStorageShim() {
  if (typeof window === 'undefined') return;
  const ls: any = (window as any).localStorage;
  if (!ls) return;
  const state: any = (globalThis as any)[TENANT_SHIM_KEY];
  if (!state || !state.installed) return;
  try {
    if (typeof state.originalGetItem === 'function') ls.getItem = state.originalGetItem;
    if (typeof state.originalSetItem === 'function') ls.setItem = state.originalSetItem;
    if (state.originalRemoveItem && typeof state.originalRemoveItem === 'function') ls.removeItem = state.originalRemoveItem;
  } catch {
  }
  try {
    delete (globalThis as any)[TENANT_SHIM_KEY];
  } catch {
    try {
      (globalThis as any)[TENANT_SHIM_KEY] = undefined;
    } catch {
    }
  }
}

export function installTenantFetchShim(tenantId: string) {
  if (typeof window === 'undefined') return;
  const wf: any = (window as any).fetch;
  if (typeof wf !== 'function') return;

  const existing: any = (globalThis as any)[FETCH_SHIM_KEY];
  if (existing && existing.installed) {
    existing.tenantId = tenantId;
    return;
  }

  const originalFetch = wf.bind(window);
  const shimState: any = { installed: true, tenantId, originalFetch };
  (globalThis as any)[FETCH_SHIM_KEY] = shimState;

  const shouldDecorate = (urlValue: string) => {
    const url = String(urlValue || '');
    if (!url) return false;
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin !== window.location.origin) return false;
      return parsed.pathname === '/api' || parsed.pathname.startsWith('/api/');
    } catch {
      return url === '/api' || url.startsWith('/api/');
    }
  };

  window.fetch = (input: any, init?: RequestInit) => {
    const state: any = (globalThis as any)[FETCH_SHIM_KEY];
    const tid = typeof state?.tenantId === 'string' ? state.tenantId : tenantId;
    const baseFetch: any = typeof state?.originalFetch === 'function' ? state.originalFetch : originalFetch;

    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input || '');
    if (!tid || !shouldDecorate(url)) return baseFetch(input, init);

    const headerKey = 'x-company-id';
    const extra: Record<string, string> = { [headerKey]: tid };

    try {
      if (input instanceof Request) {
        const headers = new Headers(input.headers);
        if (!headers.has(headerKey)) headers.set(headerKey, tid);
        if (init?.headers) {
          const extraHeaders = new Headers(init.headers as any);
          extraHeaders.forEach((v, k) => {
            if (!headers.has(k)) headers.set(k, v);
          });
        }
        const nextReq = new Request(input, { headers });
        const { headers: _h, ...rest } = init ?? {};
        return baseFetch(nextReq, rest as any);
      }

      const headers = new Headers((init?.headers as any) ?? undefined);
      if (!headers.has(headerKey)) headers.set(headerKey, tid);
      return baseFetch(input, { ...(init ?? {}), headers });
    } catch {
      const nextHeaders = { ...(init?.headers as any), ...extra };
      return baseFetch(input, { ...(init ?? {}), headers: nextHeaders });
    }
  };
}

export function uninstallTenantFetchShim() {
  if (typeof window === 'undefined') return;
  const state: any = (globalThis as any)[FETCH_SHIM_KEY];
  if (!state || !state.installed) return;
  try {
    if (typeof state.originalFetch === 'function') (window as any).fetch = state.originalFetch;
  } catch {
  }
  try {
    delete (globalThis as any)[FETCH_SHIM_KEY];
  } catch {
    try {
      (globalThis as any)[FETCH_SHIM_KEY] = undefined;
    } catch {
    }
  }
}

// ============ ID GENERATION ============

/**
 * Gera ID único otimizado
 * @param prefix - Prefixo opcional (ex: 'log-', 'proc-', 'ativ-')
 */
export function generateId(prefix?: string): string {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return prefix ? `${prefix}${id}` : id;
}

/**
 * Gera código sequencial
 */
export function generateSequentialCode(prefix: string, number: number, digits = 3): string {
  return `${prefix}${number.toString().padStart(digits, '0')}`;
}

// ============ DEBOUNCE/THROTTLE ============

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export type ResetApplicationOptions = {
  redirectTo?: string;
  logout?: boolean;
  clearStorage?: boolean;
  clearIndexedDb?: boolean;
  clearCacheStorage?: boolean;
  unregisterServiceWorkers?: boolean;
  clearHistory?: boolean;
};

function safeCall<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

async function clearAllIndexedDbDatabases(): Promise<void> {
  if (typeof window === 'undefined') return;
  const idb: any = (globalThis as any).indexedDB;
  if (!idb || typeof idb.deleteDatabase !== 'function') return;

  const dbs: Array<{ name?: string | null }> | undefined = await (async () => {
    if (typeof idb.databases === 'function') {
      try {
        return await idb.databases();
      } catch {
        return undefined;
      }
    }
    return undefined;
  })();

  const names = (dbs || []).map(d => d?.name).filter((v): v is string => typeof v === 'string' && v.length > 0);
  await Promise.all(
    names.map(
      name =>
        new Promise<void>(resolve => {
          try {
            const req: any = idb.deleteDatabase(name);
            if (!req || (typeof req !== 'object' && typeof req !== 'function')) return resolve();
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          } catch {
            resolve();
          }
        }),
    ),
  );
}

async function clearCacheStorage(): Promise<void> {
  if (typeof window === 'undefined') return;
  const cacheApi: any = (globalThis as any).caches;
  if (!cacheApi || typeof cacheApi.keys !== 'function' || typeof cacheApi.delete !== 'function') return;
  try {
    const keys: string[] = await cacheApi.keys();
    await Promise.all(keys.map(k => cacheApi.delete(k)));
  } catch {
    return;
  }
}

async function unregisterAllServiceWorkers(): Promise<void> {
  if (typeof window === 'undefined') return;
  const sw: any = (globalThis as any).navigator?.serviceWorker;
  if (!sw || typeof sw.getRegistrations !== 'function') return;
  try {
    const regs: any[] = await sw.getRegistrations();
    await Promise.all(regs.map(r => (typeof r?.unregister === 'function' ? r.unregister() : undefined)));
  } catch {
    return;
  }
}

function clearWebStorage(storage: any) {
  if (!storage) return;
  if (typeof storage.clear === 'function') {
    storage.clear();
    return;
  }
  if (typeof storage.removeItem !== 'function' || typeof storage.key !== 'function') return;
  const len = typeof storage.length === 'number' ? storage.length : 0;
  const keys: string[] = [];
  for (let i = 0; i < len; i++) {
    const k = storage.key(i);
    if (typeof k === 'string') keys.push(k);
  }
  keys.forEach(k => {
    try {
      storage.removeItem(k);
    } catch {
      return;
    }
  });
}

export async function resetApplication(options: ResetApplicationOptions = {}): Promise<void> {
  if (typeof window === 'undefined') return;

  const redirectTo = options.redirectTo ?? '/login?reset=1';
  const logout = options.logout ?? true;
  const clearStorage = options.clearStorage ?? true;
  const clearIndexedDb = options.clearIndexedDb ?? true;
  const clearCache = options.clearCacheStorage ?? true;
  const unregisterSw = options.unregisterServiceWorkers ?? true;
  const clearHistory = options.clearHistory ?? true;

  try {
    const flush = (globalThis as any).__SISTEQ_FLUSH_WRITES__;
    if (typeof flush === 'function') await flush();
  } catch {
  }
  try {
    await flushTenantKvWrites();
  } catch {
  }

  safeCall(() => window.dispatchEvent(new Event('sisteq:reset')));
  safeCall(() => {
    document.querySelectorAll('form').forEach(f => {
      try {
        (f as HTMLFormElement).reset();
      } catch {
        return;
      }
    });
  });

  if (logout) {
    try {
      await fetch('/api/auth/cleanup', { method: 'POST', credentials: 'same-origin' });
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
    }
  }

  if (clearStorage) {
    safeCall(() => clearWebStorage(window.sessionStorage));
    safeCall(() => clearWebStorage(window.localStorage));
  }

  safeCall(() => uninstallTenantFetchShim());
  safeCall(() => uninstallTenantLocalStorageShim());

  if (clearIndexedDb) await clearAllIndexedDbDatabases();
  if (clearCache) await clearCacheStorage();
  if (unregisterSw) await unregisterAllServiceWorkers();

  if (clearHistory) {
    safeCall(() => window.history.replaceState(null, '', redirectTo));
  }

  safeCall(() => window.location.replace(redirectTo));
}
