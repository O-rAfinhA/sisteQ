import type { DadosEstrategicos } from '@/app/types/strategic'
import { Prisma } from '@prisma/client'
import { isDatabaseConfigured, prisma } from '@/server/prisma'

export type StrategicYearsPayload = {
  anoAtual: string
  anos: Record<string, DadosEstrategicos>
}

function log(event: string, fields: Record<string, unknown> = {}) {
  if (process.env.SISTEQ_DB_LOGS !== '1') return
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      scope: 'strategic',
      event,
      ...fields,
    }),
  )
}

function asNonEmptyString(value: unknown) {
  if (typeof value !== 'string') return null
  const s = value.trim()
  if (!s) return null
  return s
}

function assertValidPayload(input: any): asserts input is StrategicYearsPayload {
  const anoAtual = asNonEmptyString(input?.anoAtual)
  if (!anoAtual) {
    const err: any = new Error('anoAtual é obrigatório')
    err.status = 400
    throw err
  }
  const anos = input?.anos
  if (!anos || typeof anos !== 'object') {
    const err: any = new Error('anos é obrigatório')
    err.status = 400
    throw err
  }
}

export async function getStrategicYears(tenantId: string): Promise<StrategicYearsPayload | null> {
  if (!isDatabaseConfigured()) return null

  const state = await prisma.strategicPlanningState.findUnique({
    where: { tenantId },
    select: { currentYear: true },
  })
  if (!state) return null

  const rows = await prisma.strategicPlanningYear.findMany({
    where: { tenantId },
    select: { year: true, data: true },
  })
  const anos: Record<string, DadosEstrategicos> = {}
  for (const row of rows) {
    if (typeof row.year === 'string' && row.year) anos[row.year] = row.data as unknown as DadosEstrategicos
  }

  const payload: StrategicYearsPayload = { anoAtual: state.currentYear, anos }
  log('read.ok', { tenantId, years: Object.keys(anos).length })
  return payload
}

export async function saveStrategicYears(tenantId: string, userId: string, input: any): Promise<{ ok: true }> {
  if (!isDatabaseConfigured()) {
    const err: any = new Error('PostgreSQL não configurado')
    err.status = 501
    throw err
  }
  assertValidPayload(input)

  const yearKeys = Object.keys(input.anos || {})
  await prisma.$transaction(async tx => {
    await tx.strategicPlanningState.upsert({
      where: { tenantId },
      create: { tenantId, currentYear: input.anoAtual, updatedBy: userId },
      update: { currentYear: input.anoAtual, updatedAt: new Date(), updatedBy: userId },
    })

    for (const year of yearKeys) {
      await tx.strategicPlanningYear.upsert({
        where: { tenantId_year: { tenantId, year } },
        create: {
          tenantId,
          year,
          data: input.anos[year] as unknown as Prisma.InputJsonValue,
          updatedBy: userId,
        },
        update: {
          data: input.anos[year] as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
          updatedBy: userId,
        },
      })
    }

    if (yearKeys.length === 0) {
      await tx.strategicPlanningYear.deleteMany({ where: { tenantId } })
    } else {
      await tx.strategicPlanningYear.deleteMany({ where: { tenantId, year: { notIn: yearKeys } } })
    }
  })

  log('write.ok', { tenantId, years: yearKeys.length })
  return { ok: true }
}
