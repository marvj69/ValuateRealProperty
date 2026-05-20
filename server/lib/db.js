import { sql } from '@vercel/postgres';

let schemaPromise = null;

export async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = createSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function createSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_idx
    ON app_users (email)
  `;

  await sql`
    ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
    ON password_reset_tokens (user_id, created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS password_reset_tokens_active_idx
    ON password_reset_tokens (token_hash, expires_at)
    WHERE used_at IS NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS report_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      report_count INTEGER NOT NULL DEFAULT 1,
      reports JSONB NOT NULL DEFAULT '[]'::jsonb,
      final_report JSONB,
      progress JSONB NOT NULL DEFAULT '{}'::jsonb,
      error TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS report_jobs_user_updated_idx
    ON report_jobs (user_id, updated_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS report_jobs_status_updated_idx
    ON report_jobs (status, updated_at ASC)
  `;

  await sql`
    ALTER TABLE report_jobs
    ADD COLUMN IF NOT EXISTS input_fingerprint TEXT
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS report_jobs_user_fingerprint_updated_idx
    ON report_jobs (user_id, input_fingerprint, updated_at DESC)
    WHERE input_fingerprint IS NOT NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS report_usage_counters (
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      report_tier TEXT NOT NULL CHECK (report_tier IN ('fast', 'smart', 'experimental')),
      window_start TIMESTAMPTZ NOT NULL,
      window_end TIMESTAMPTZ NOT NULL,
      used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, report_tier, window_start)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS report_usage_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      report_job_id TEXT,
      report_tier TEXT NOT NULL CHECK (report_tier IN ('fast', 'smart', 'experimental')),
      model TEXT NOT NULL,
      event_type TEXT NOT NULL DEFAULT 'created' CHECK (event_type IN ('created', 'retry')),
      window_start TIMESTAMPTZ NOT NULL,
      window_end TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    DO $$
    DECLARE tier_constraint_name TEXT;
    BEGIN
      FOR tier_constraint_name IN
        SELECT constraint_record.conname
        FROM pg_constraint AS constraint_record
        WHERE constraint_record.conrelid = 'report_usage_counters'::regclass
          AND constraint_record.contype = 'c'
          AND pg_get_constraintdef(constraint_record.oid) ILIKE '%report_tier%'
      LOOP
        EXECUTE format('ALTER TABLE report_usage_counters DROP CONSTRAINT %I', tier_constraint_name);
      END LOOP;

      ALTER TABLE report_usage_counters
      ADD CONSTRAINT report_usage_counters_report_tier_check
      CHECK (report_tier IN ('fast', 'smart', 'experimental'));
    END $$;
  `;

  await sql`
    DO $$
    DECLARE tier_constraint_name TEXT;
    BEGIN
      FOR tier_constraint_name IN
        SELECT constraint_record.conname
        FROM pg_constraint AS constraint_record
        WHERE constraint_record.conrelid = 'report_usage_events'::regclass
          AND constraint_record.contype = 'c'
          AND pg_get_constraintdef(constraint_record.oid) ILIKE '%report_tier%'
      LOOP
        EXECUTE format('ALTER TABLE report_usage_events DROP CONSTRAINT %I', tier_constraint_name);
      END LOOP;

      ALTER TABLE report_usage_events
      ADD CONSTRAINT report_usage_events_report_tier_check
      CHECK (report_tier IN ('fast', 'smart', 'experimental'));
    END $$;
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS report_usage_events_user_tier_window_idx
    ON report_usage_events (user_id, report_tier, window_start, created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS report_usage_events_job_idx
    ON report_usage_events (report_job_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS report_artifacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL DEFAULT '',
      report_job_id TEXT,
      input_fingerprint TEXT NOT NULL,
      stage TEXT NOT NULL,
      stage_key TEXT NOT NULL DEFAULT 'default',
      model TEXT NOT NULL,
      prompt_hash TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      content JSONB NOT NULL DEFAULT '{}'::jsonb,
      token_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
      latency_ms INTEGER,
      cache_hits INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, report_job_id, input_fingerprint, stage, stage_key, model, request_hash)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS report_artifacts_report_idx
    ON report_artifacts (report_job_id, stage, stage_key)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS report_artifacts_user_fingerprint_stage_idx
    ON report_artifacts (user_id, input_fingerprint, stage, updated_at DESC)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS api_usage_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL DEFAULT '',
      report_job_id TEXT,
      input_fingerprint TEXT,
      stage TEXT NOT NULL,
      stage_key TEXT NOT NULL DEFAULT 'default',
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      cache_status TEXT NOT NULL CHECK (cache_status IN ('hit', 'miss', 'race_hit')),
      input_tokens INTEGER,
      output_tokens INTEGER,
      total_tokens INTEGER,
      token_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
      latency_ms INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS api_usage_events_user_created_idx
    ON api_usage_events (user_id, created_at DESC)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS api_usage_events_report_stage_idx
    ON api_usage_events (report_job_id, stage, created_at DESC)
  `;
}

export { sql };
