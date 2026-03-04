CREATE TABLE IF NOT EXISTS strategic_planning_state (
  tenant_id TEXT PRIMARY KEY,
  current_year TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS strategic_planning_years (
  tenant_id TEXT NOT NULL,
  year TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL,
  PRIMARY KEY (tenant_id, year)
);

CREATE INDEX IF NOT EXISTS strategic_planning_years_tenant_idx
  ON strategic_planning_years (tenant_id);

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

CREATE TABLE IF NOT EXISTS sisteq_profile_db (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sisteq_profile_db_backups (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS sisteq_profile_db_backups_created_at_idx
  ON sisteq_profile_db_backups (created_at);

CREATE TABLE IF NOT EXISTS sisteq_tenant_kv (
  tenant_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL,
  PRIMARY KEY (tenant_id, key)
);

CREATE INDEX IF NOT EXISTS sisteq_tenant_kv_tenant_idx
  ON sisteq_tenant_kv (tenant_id);
