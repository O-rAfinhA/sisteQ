import type { PoolClient } from 'pg'
import type { DadosEstrategicos } from '@/app/types/strategic'
import { isPostgresConfigured, withPgClient, withPgTransaction } from '@/server/pg'

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

let schemaReady = false
let schemaPromise: Promise<void> | null = null

async function ensureSchemaWithClient(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS strategic_planning_state (
      tenant_id TEXT PRIMARY KEY,
      current_year TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by TEXT NOT NULL
    )
  `)
  await client.query(`
    CREATE TABLE IF NOT EXISTS strategic_planning_years (
      tenant_id TEXT NOT NULL,
      year TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by TEXT NOT NULL,
      PRIMARY KEY (tenant_id, year)
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS strategic_planning_years_tenant_idx ON strategic_planning_years (tenant_id)`)
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'strategic_planning_years_year_format_ck'
      ) THEN
        ALTER TABLE strategic_planning_years
          ADD CONSTRAINT strategic_planning_years_year_format_ck
          CHECK (year ~ '^[0-9]{4}$') NOT VALID;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'strategic_planning_state_current_year_format_ck'
      ) THEN
        ALTER TABLE strategic_planning_state
          ADD CONSTRAINT strategic_planning_state_current_year_format_ck
          CHECK (current_year ~ '^[0-9]{4}$') NOT VALID;
      END IF;
    END $$;
  `)
}

async function ensureSchema() {
  if (schemaReady) return
  if (schemaPromise) return await schemaPromise
  schemaPromise = (async () => {
    await withPgClient(async client => {
      await ensureSchemaWithClient(client)
    })
    schemaReady = true
    schemaPromise = null
  })()
  return await schemaPromise
}

export async function getStrategicYears(tenantId: string): Promise<StrategicYearsPayload | null> {
  if (!isPostgresConfigured()) return null
  await ensureSchema()

  return await withPgClient(async client => {
    const stateRes = await client.query<{ current_year: string }>(
      `SELECT current_year FROM strategic_planning_state WHERE tenant_id = $1`,
      [tenantId],
    )
    if (!stateRes.rows[0]) return null

    const yearsRes = await client.query<{ year: string; data: any }>(
      `SELECT year, data FROM strategic_planning_years WHERE tenant_id = $1`,
      [tenantId],
    )
    const anos: Record<string, DadosEstrategicos> = {}
    for (const row of yearsRes.rows) {
      if (typeof row.year === 'string' && row.year) anos[row.year] = row.data as DadosEstrategicos
    }

    const payload: StrategicYearsPayload = {
      anoAtual: stateRes.rows[0].current_year,
      anos,
    }
    log('read.ok', { tenantId, years: Object.keys(anos).length })
    return payload
  })
}

export async function saveStrategicYears(tenantId: string, userId: string, input: any): Promise<{ ok: true }> {
  if (!isPostgresConfigured()) {
    const err: any = new Error('PostgreSQL não configurado')
    err.status = 501
    throw err
  }
  assertValidPayload(input)
  await ensureSchema()

  const yearKeys = Object.keys(input.anos || {})
  return await withPgTransaction(async client => {
    await ensureSchemaWithClient(client)

    await client.query(
      `
        INSERT INTO strategic_planning_state (tenant_id, current_year, updated_at, updated_by)
        VALUES ($1, $2, now(), $3)
        ON CONFLICT (tenant_id) DO UPDATE
          SET current_year = EXCLUDED.current_year,
              updated_at = now(),
              updated_by = EXCLUDED.updated_by
      `,
      [tenantId, input.anoAtual, userId],
    )

    for (const year of yearKeys) {
      await client.query(
        `
          INSERT INTO strategic_planning_years (tenant_id, year, data, updated_at, updated_by)
          VALUES ($1, $2, $3, now(), $4)
          ON CONFLICT (tenant_id, year) DO UPDATE
            SET data = EXCLUDED.data,
                updated_at = now(),
                updated_by = EXCLUDED.updated_by
        `,
        [tenantId, year, input.anos[year], userId],
      )
    }

    if (yearKeys.length === 0) {
      await client.query(`DELETE FROM strategic_planning_years WHERE tenant_id = $1`, [tenantId])
    } else {
      await client.query(`DELETE FROM strategic_planning_years WHERE tenant_id = $1 AND year <> ALL($2::text[])`, [
        tenantId,
        yearKeys,
      ])
    }

    log('write.ok', { tenantId, years: yearKeys.length })
    return { ok: true }
  })
}
