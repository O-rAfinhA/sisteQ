import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { StrategicProvider, useStrategic } from './StrategicContext'

function createStorage() {
  const data = new Map<string, string>()
  return {
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

function MissionProbe() {
  const { dados } = useStrategic()
  return <div data-testid="mission">{dados.direcionamento.missao}</div>
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.useFakeTimers()
  Object.defineProperty(window, 'localStorage', { value: createStorage(), configurable: true })
  Object.defineProperty(window, 'sessionStorage', { value: createStorage(), configurable: true })
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) }) as any))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('StrategicContext reset', () => {
  it('não sobrescreve localStorage quando reset é não-persistente', async () => {
    const YEARS_STORAGE_KEY = 'strategic-planning-years'
    const saved = {
      anoAtual: '2026',
      anos: {
        '2026': {
          direcionamento: {
            missao: 'Missão Persistida',
            visao: '',
            valores: [],
            politicaQualidade: '',
            politicaBsc: [],
            escopoCertificacao: '',
            exclusaoRequisito: '',
            objetivosBsc: [],
          },
          cenario: {
            historicoEmpresa: '',
            produtosServicos: '',
            regiaoAtuacao: '',
            canaisVenda: '',
            principaisClientes: [],
            principaisFornecedores: [],
            principaisConcorrentes: [],
          },
          swotItems: [],
          partesInteressadas: [],
          planosAcao: [],
          planosAcoes: [],
          riscos: [],
          processos: [],
        },
      },
    }

    window.localStorage.setItem(YEARS_STORAGE_KEY, JSON.stringify(saved))

    render(
      <StrategicProvider>
        <MissionProbe />
      </StrategicProvider>,
    )

    expect(screen.getByTestId('mission').textContent).toBe('Missão Persistida')

    act(() => {
      window.dispatchEvent(new CustomEvent('sisteq:reset', { detail: { persist: false } }))
    })

    expect(screen.getByTestId('mission').textContent).toBe('')

    await act(async () => {
      vi.advanceTimersByTime(1500)
    })

    const storedRaw = window.localStorage.getItem(YEARS_STORAGE_KEY)
    expect(storedRaw).not.toBeNull()
    const stored = JSON.parse(storedRaw as string)
    expect(stored.anos['2026'].direcionamento.missao).toBe('Missão Persistida')
  })
})
