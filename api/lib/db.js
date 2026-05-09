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
}

export { sql };
