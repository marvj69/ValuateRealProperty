import crypto from 'node:crypto';
import { ensureSchema, sql } from './db.js';
import { HttpError } from './http.js';
import { buildReportPrompt } from './prompts.js';
import { callGemini, withRetries } from './gemini.js';
import {
  DEFAULT_REPORT_MODEL,
  REPORT_MODEL_OPTIONS,
  getAllowedReportModels,
  getReportModelSelection
} from './report-models.js';
import { extractValuations, generateMergedReport } from './valuation.js';

const MAX_REPORT_COUNT = 16;
const DEFAULT_REPORT_COUNT = 16;
const MAX_ATTACHMENTS = 8;
const MAX_ATTACHMENT_BASE64_CHARS = 4_000_000;
const PROCESSING_STALE_MINUTES = 10;
const WORKER_CONCURRENCY = 8;
const REPORT_DRAFT_TIMEOUT_MS = 90_000;
const MAX_STALE_PROCESSING_ATTEMPTS = 2;
const DEFAULT_WEEKLY_REPORT_LIMIT = 5;
const MAX_CONFIGURED_WEEKLY_REPORT_LIMIT = 1000;
const DEFAULT_USAGE_LIMIT_TIME_ZONE = 'America/Detroit';
const DEFAULT_UNLIMITED_REPORT_LIMIT_EMAILS = Object.freeze([
  'heinonenmh@gmail.com'
]);

const WEEKLY_LIMIT_ENV_KEYS = Object.freeze({
  fast: 'FAST_REPORT_WEEKLY_LIMIT',
  smart: 'SMART_REPORT_WEEKLY_LIMIT',
  experimental: 'EXPERIMENTAL_REPORT_WEEKLY_LIMIT'
});

function asString(value, maxLength = 20000) {
  return String(value || '').trim().slice(0, maxLength);
}

function asBoolean(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

function asReportCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_REPORT_COUNT;
  return Math.min(MAX_REPORT_COUNT, Math.max(1, parsed));
}

function asReportId(value) {
  const id = asString(value, 100);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new HttpError(400, 'A valid report ID is required.');
  }
  return id;
}

function getUsageLimitTimeZone() {
  return process.env.REPORT_USAGE_TIME_ZONE || DEFAULT_USAGE_LIMIT_TIME_ZONE;
}

function getWeeklyReportLimit(tier) {
  const configured = process.env[WEEKLY_LIMIT_ENV_KEYS[tier]] || process.env.REPORT_WEEKLY_LIMIT;
  const parsed = Number.parseInt(configured || String(DEFAULT_WEEKLY_REPORT_LIMIT), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_WEEKLY_REPORT_LIMIT;
  }
  return Math.min(MAX_CONFIGURED_WEEKLY_REPORT_LIMIT, parsed);
}

function normalizeLimitEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getUnlimitedReportLimitEmails() {
  const configured = String(process.env.UNLIMITED_REPORT_LIMIT_EMAILS || '')
    .split(',')
    .map(normalizeLimitEmail)
    .filter(Boolean);
  return new Set([
    ...DEFAULT_UNLIMITED_REPORT_LIMIT_EMAILS,
    ...configured
  ]);
}

function hasUnlimitedReportLimits(user) {
  return getUnlimitedReportLimitEmails().has(normalizeLimitEmail(user?.email));
}

function resolveReportModel(model) {
  const selection = getReportModelSelection(model || process.env.REPORT_MODEL || DEFAULT_REPORT_MODEL);
  if (!selection) {
    throw new HttpError(400, 'Unsupported AI model. Choose Fast, Smart, or Experimental.', {
      field: 'model',
      allowedValues: getAllowedReportModels()
    });
  }
  return selection;
}

function secondsUntil(value) {
  const timestamp = new Date(normalizeDate(value)).getTime();
  if (!Number.isFinite(timestamp)) return 60;
  return Math.max(1, Math.ceil((timestamp - Date.now()) / 1000));
}

function weeklyLimitExceededError({ tier, label, used, limit, resetAt }) {
  const safeUsed = Number.isFinite(Number(used)) ? Number(used) : limit;
  const resetIso = normalizeDate(resetAt);
  return new HttpError(
    429,
    `Weekly ${label} report limit reached (${safeUsed}/${limit}). Try again after ${resetIso}.`,
    {
      code: 'weekly_report_limit_exceeded',
      tier,
      label,
      used: safeUsed,
      limit,
      remaining: 0,
      resetAt: resetIso
    },
    {
      'Retry-After': String(secondsUntil(resetIso))
    }
  );
}

function sanitizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  if (attachments.length > MAX_ATTACHMENTS) {
    throw new HttpError(400, `At most ${MAX_ATTACHMENTS} attachments are supported.`);
  }

  let totalSize = 0;
  return attachments.map((attachment) => {
    const mimeType = asString(attachment.mimeType || attachment.mime_type, 200);
    const data = String(attachment.data || '').replace(/^data:[^,]+,/, '');
    if (!mimeType || !data) {
      throw new HttpError(400, 'Each attachment must include mimeType and base64 data.');
    }
    if (mimeType !== 'application/pdf' && !mimeType.startsWith('image/')) {
      throw new HttpError(400, 'Only PDF and image attachments are supported.');
    }
    totalSize += data.length;
    if (totalSize > MAX_ATTACHMENT_BASE64_CHARS) {
      throw new HttpError(413, 'Attachments are too large for this endpoint.');
    }
    return {
      name: asString(attachment.name || 'attachment', 500),
      mimeType,
      size: Number.isFinite(attachment.size) ? attachment.size : null,
      data
    };
  });
}

export function sanitizeReportInput(input = {}) {
  const attachments = sanitizeAttachments(input.attachments);
  const propertyAddress = asString(input.propertyAddress, 1000);
  const additionalDetails = asString(input.additionalDetails);

  if (!propertyAddress && attachments.length === 0) {
    throw new HttpError(400, 'Provide a propertyAddress or at least one attachment.');
  }

  const promptKey = input.promptKey === 'standard' ? 'standard' : 'experimental';
  const reportAudience = ['buyer', 'seller', 'investor'].includes(input.reportAudience)
    ? input.reportAudience
    : 'seller';
  const modelSelection = resolveReportModel(input.model);
  const reportCount = modelSelection.reportCount || asReportCount(input.reportCount);
  const draftModels = Array.isArray(modelSelection.draftModels)
    ? modelSelection.draftModels.slice(0, reportCount)
    : [];

  return {
    propertyAddress,
    additionalDetails,
    specialInstructions: asString(input.specialInstructions),
    reportAudience,
    promptKey,
    reportCount,
    enableSearch: asBoolean(input.enableSearch, true),
    model: modelSelection.model,
    modelTier: modelSelection.tier,
    modelLabel: modelSelection.label,
    modelProvider: modelSelection.provider || null,
    supportModel: modelSelection.supportModel || modelSelection.model,
    reasoningEffort: modelSelection.reasoningEffort || null,
    draftConcurrency: modelSelection.draftConcurrency || null,
    draftModels,
    attachments
  };
}

function jsonParam(value) {
  return JSON.stringify(value);
}

function normalizeDate(value) {
  return value?.toISOString?.() || value || null;
}

function normalizeUsageLimitMetadata(row, payload) {
  if (row.quota_limit === undefined || row.quota_limit === null) return null;
  const usedBeforeRequest = Number(row.quota_used) || 0;
  const limit = Number(row.quota_limit) || 0;
  const reserved = Number(row.quota_reserved) || 0;
  const used = Math.min(limit, usedBeforeRequest + reserved);
  return {
    tier: payload.modelTier || row.quota_tier || null,
    label: payload.modelLabel || null,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt: normalizeDate(row.quota_window_end)
  };
}

export async function getReportUsageForUser(user) {
  const timeZone = getUsageLimitTimeZone();
  const generatedAt = new Date().toISOString();

  if (hasUnlimitedReportLimits(user)) {
    return {
      timeZone,
      generatedAt,
      unlimited: true,
      limits: REPORT_MODEL_OPTIONS.map((option) => ({
        tier: option.tier,
        label: option.label,
        model: option.model,
        limit: null,
        used: null,
        remaining: null,
        unlimited: true,
        windowStart: null,
        resetAt: null
      }))
    };
  }

  await ensureSchema();

  const limits = await Promise.all(REPORT_MODEL_OPTIONS.map(async (option) => {
    const weeklyLimit = getWeeklyReportLimit(option.tier);
    const { rows } = await sql`
      WITH report_window AS (
        SELECT
          (date_trunc('week', now() AT TIME ZONE ${timeZone}) AT TIME ZONE ${timeZone}) AS window_start,
          ((date_trunc('week', now() AT TIME ZONE ${timeZone}) + interval '1 week') AT TIME ZONE ${timeZone}) AS window_end
      ),
      ledger_usage AS (
        SELECT COUNT(*)::int AS used
        FROM (
          SELECT event.id
          FROM report_usage_events AS event
          CROSS JOIN report_window AS quota_window
          WHERE event.user_id = ${user.userId}
            AND event.report_tier = ${option.tier}
            AND event.window_start = quota_window.window_start

          UNION ALL

          SELECT job.id
          FROM report_jobs AS job
          CROSS JOIN report_window AS quota_window
          WHERE job.user_id = ${user.userId}
            AND job.created_at >= quota_window.window_start
            AND job.created_at < quota_window.window_end
            AND (
              COALESCE(job.payload->>'modelTier', '') = ${option.tier}
              OR regexp_replace(COALESCE(job.payload->>'model', ''), '^models/', '', 'i') = ${option.model}
            )
            AND NOT EXISTS (
              SELECT 1
              FROM report_usage_events AS existing_event
              WHERE existing_event.report_job_id = job.id
            )
        ) AS usage_rows
      ),
      counter_usage AS (
        SELECT counter.used
        FROM report_usage_counters AS counter
        CROSS JOIN report_window AS quota_window
        WHERE counter.user_id = ${user.userId}
          AND counter.report_tier = ${option.tier}
          AND counter.window_start = quota_window.window_start
        LIMIT 1
      )
      SELECT
        GREATEST(COALESCE((SELECT used FROM counter_usage), 0), ledger_usage.used)::int AS used,
        report_window.window_start,
        report_window.window_end
      FROM report_window
      CROSS JOIN ledger_usage
    `;
    const row = rows[0] || {};
    const used = Number(row.used) || 0;
    return {
      tier: option.tier,
      label: option.label,
      model: option.model,
      limit: weeklyLimit,
      used,
      remaining: Math.max(0, weeklyLimit - used),
      windowStart: normalizeDate(row.window_start),
      resetAt: normalizeDate(row.window_end)
    };
  }));

  return {
    timeZone,
    generatedAt,
    limits
  };
}

export function normalizeReportRow(row, { includePayload = false, includeReports = false } = {}) {
  if (!row) return null;
  const payload = row.payload || {};
  const inputMetadata = {
    ...payload,
    attachments: Array.isArray(payload.attachments)
      ? payload.attachments.map((attachment) => ({
          name: attachment.name || 'attachment',
          mimeType: attachment.mimeType,
          size: attachment.size || null
        }))
      : []
  };
  const individualReports = includeReports ? row.reports || [] : undefined;
  const output = {
    finalReport: row.final_report || null,
    individualReports
  };
  const metadata = {
    reportCount: row.report_count,
    progress: row.progress || {},
    attempts: row.attempts,
    model: payload.model || null,
    modelTier: payload.modelTier || null,
    modelLabel: payload.modelLabel || null,
    modelProvider: payload.modelProvider || null,
    supportModel: payload.supportModel || null,
    reasoningEffort: payload.reasoningEffort || null,
    draftConcurrency: payload.draftConcurrency || null,
    draftModels: Array.isArray(payload.draftModels) ? payload.draftModels : [],
    usageLimit: normalizeUsageLimitMetadata(row, payload)
  };

  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    status: row.status,
    reportCount: row.report_count,
    progress: row.progress || {},
    error: row.error || null,
    attempts: row.attempts,
    createdAt: normalizeDate(row.created_at),
    updatedAt: normalizeDate(row.updated_at),
    startedAt: normalizeDate(row.started_at),
    completedAt: normalizeDate(row.completed_at),
    finalReport: row.final_report || null,
    reports: includeReports ? row.reports || [] : undefined,
    inputs: inputMetadata,
    output,
    metadata,
    payload: includePayload ? inputMetadata : undefined
  };
}

export async function createReportJob(user, input) {
  await ensureSchema();
  const payload = sanitizeReportInput(input);
  const id = crypto.randomUUID();
  const progress = { total: payload.reportCount, completed: 0, phase: 'queued' };

  if (hasUnlimitedReportLimits(user)) {
    const { rows } = await sql`
      INSERT INTO report_jobs (
        id,
        user_id,
        user_email,
        status,
        payload,
        report_count,
        reports,
        progress
      )
      VALUES (
        ${id},
        ${user.userId},
        ${user.email},
        'queued',
        ${jsonParam(payload)}::jsonb,
        ${payload.reportCount},
        '[]'::jsonb,
        ${jsonParam(progress)}::jsonb
      )
      RETURNING *
    `;

    return normalizeReportRow(rows[0], { includePayload: true, includeReports: true });
  }

  const usageEventId = crypto.randomUUID();
  const weeklyLimit = getWeeklyReportLimit(payload.modelTier);
  const timeZone = getUsageLimitTimeZone();

  const { rows } = await sql`
    WITH report_window AS (
      SELECT
        (date_trunc('week', now() AT TIME ZONE ${timeZone}) AT TIME ZONE ${timeZone}) AS window_start,
        ((date_trunc('week', now() AT TIME ZONE ${timeZone}) + interval '1 week') AT TIME ZONE ${timeZone}) AS window_end
    ),
    existing_usage AS (
      SELECT COUNT(*)::int AS used
      FROM (
        SELECT event.id
        FROM report_usage_events AS event
        CROSS JOIN report_window AS quota_window
        WHERE event.user_id = ${user.userId}
          AND event.report_tier = ${payload.modelTier}
          AND event.window_start = quota_window.window_start

        UNION ALL

        SELECT job.id
        FROM report_jobs AS job
        CROSS JOIN report_window AS quota_window
        WHERE job.user_id = ${user.userId}
          AND job.created_at >= quota_window.window_start
          AND job.created_at < quota_window.window_end
          AND (
            COALESCE(job.payload->>'modelTier', '') = ${payload.modelTier}
            OR regexp_replace(COALESCE(job.payload->>'model', ''), '^models/', '', 'i') = ${payload.model}
          )
          AND NOT EXISTS (
            SELECT 1
            FROM report_usage_events AS existing_event
            WHERE existing_event.report_job_id = job.id
          )
      ) AS usage_rows
    ),
    quota_counter AS (
      INSERT INTO report_usage_counters (
        user_id,
        user_email,
        report_tier,
        window_start,
        window_end,
        used
      )
      SELECT
        ${user.userId},
        ${user.email},
        ${payload.modelTier},
        quota_window.window_start,
        quota_window.window_end,
        existing_usage.used + 1
      FROM report_window AS quota_window
      CROSS JOIN existing_usage
      WHERE existing_usage.used < ${weeklyLimit}
        AND ${weeklyLimit} > 0
      ON CONFLICT (user_id, report_tier, window_start)
      DO UPDATE SET
        user_email = EXCLUDED.user_email,
        window_end = EXCLUDED.window_end,
        used = GREATEST(report_usage_counters.used, EXCLUDED.used - 1) + 1,
        updated_at = now()
      WHERE GREATEST(report_usage_counters.used, EXCLUDED.used - 1) < ${weeklyLimit}
      RETURNING used, window_start, window_end
    ),
    inserted_report AS (
      INSERT INTO report_jobs (
        id,
        user_id,
        user_email,
        status,
        payload,
        report_count,
        reports,
        progress
      )
      SELECT
        ${id},
        ${user.userId},
        ${user.email},
        'queued',
        ${jsonParam(payload)}::jsonb,
        ${payload.reportCount},
        '[]'::jsonb,
        ${jsonParam(progress)}::jsonb
      FROM quota_counter
      RETURNING *
    ),
    inserted_usage AS (
      INSERT INTO report_usage_events (
        id,
        user_id,
        user_email,
        report_job_id,
        report_tier,
        model,
        event_type,
        window_start,
        window_end
      )
      SELECT
        ${usageEventId},
        ${user.userId},
        ${user.email},
        inserted_report.id,
        ${payload.modelTier},
        ${payload.model},
        'created',
        quota_window.window_start,
        quota_window.window_end
      FROM inserted_report
      CROSS JOIN report_window AS quota_window
      RETURNING id
    )
    SELECT
      inserted_report.*,
      COALESCE(quota_counter.used - 1, ${weeklyLimit})::int AS quota_used,
      ${weeklyLimit}::int AS quota_limit,
      ${payload.modelTier} AS quota_tier,
      quota_window.window_start AS quota_window_start,
      quota_window.window_end AS quota_window_end,
      (SELECT COUNT(*)::int FROM inserted_usage) AS quota_reserved
    FROM report_window AS quota_window
    LEFT JOIN quota_counter ON TRUE
    LEFT JOIN inserted_report ON TRUE
  `;

  const row = rows[0];
  if (!row?.id) {
    throw weeklyLimitExceededError({
      tier: payload.modelTier,
      label: payload.modelLabel,
      used: row?.quota_used || weeklyLimit,
      limit: weeklyLimit,
      resetAt: row?.quota_window_end
    });
  }

  return normalizeReportRow(row, { includePayload: true, includeReports: true });
}

export async function listReportsForUser(user) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT *
    FROM report_jobs
    WHERE user_id = ${user.userId}
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return rows.map((row) => normalizeReportRow(row, { includePayload: true }));
}

export async function getReportForUser(user, id) {
  await ensureSchema();
  const reportId = asReportId(id);
  const { rows } = await sql`
    SELECT *
    FROM report_jobs
    WHERE id = ${reportId} AND user_id = ${user.userId}
    LIMIT 1
  `;
  if (!rows[0]) {
    throw new HttpError(404, 'Report not found.');
  }
  return normalizeReportRow(rows[0], { includePayload: true, includeReports: true });
}

export async function recoverStaleReportForUser(user, id) {
  await ensureSchema();
  const reportId = asReportId(id);
  const retryMessage = 'Previous processing attempt timed out before finishing. Restarting automatically with the shorter validation path.';
  const failedMessage = 'Report processing timed out before finishing. Please retry the report.';
  const { rows } = await sql`
    WITH target AS (
      SELECT id, attempts
      FROM report_jobs
      WHERE id = ${reportId}
        AND user_id = ${user.userId}
        AND status = 'processing'
        AND updated_at < now() - (${PROCESSING_STALE_MINUTES} || ' minutes')::interval
      LIMIT 1
      FOR UPDATE
    )
    UPDATE report_jobs
    SET
      status = CASE
        WHEN target.attempts >= ${MAX_STALE_PROCESSING_ATTEMPTS} THEN 'failed'
        ELSE 'queued'
      END,
      progress = jsonb_set(
        progress,
        '{phase}',
        to_jsonb(CASE
          WHEN target.attempts >= ${MAX_STALE_PROCESSING_ATTEMPTS} THEN 'failed'
          ELSE 'queued'
        END::text),
        true
      ),
      error = CASE
        WHEN target.attempts >= ${MAX_STALE_PROCESSING_ATTEMPTS} THEN ${failedMessage}
        ELSE ${retryMessage}
      END,
      updated_at = now(),
      completed_at = CASE
        WHEN target.attempts >= ${MAX_STALE_PROCESSING_ATTEMPTS} THEN now()
        ELSE completed_at
      END
    FROM target
    WHERE report_jobs.id = target.id
    RETURNING report_jobs.*
  `;
  return rows[0]
    ? normalizeReportRow(rows[0], { includePayload: true, includeReports: true })
    : null;
}

export async function deleteReportForUser(user, id) {
  await ensureSchema();
  const reportId = asReportId(id);
  const { rows } = await sql`
    DELETE FROM report_jobs
    WHERE id = ${reportId} AND user_id = ${user.userId}
    RETURNING id
  `;
  if (!rows[0]) {
    throw new HttpError(404, 'Report not found.');
  }
  return { id: rows[0].id, deleted: true };
}

export async function retryReportForUser(user, id) {
  await ensureSchema();
  const reportId = asReportId(id);
  const { rows: existingRows } = await sql`
    SELECT *
    FROM report_jobs
    WHERE id = ${reportId}
      AND user_id = ${user.userId}
    LIMIT 1
  `;
  const existing = existingRows[0];
  if (!existing) {
    throw new HttpError(404, 'Report not found.');
  }
  if (existing.status === 'processing') {
    throw new HttpError(409, 'Report is already processing.');
  }

  const payload = sanitizeReportInput(existing.payload || {});
  const progress = { total: payload.reportCount, completed: 0, phase: 'queued' };

  if (hasUnlimitedReportLimits(user)) {
    const { rows } = await sql`
      WITH report_state AS (
        SELECT status
        FROM report_jobs
        WHERE id = ${reportId}
          AND user_id = ${user.userId}
        LIMIT 1
        FOR UPDATE
      ),
      updated_report AS (
        UPDATE report_jobs
        SET
          status = 'queued',
          payload = ${jsonParam(payload)}::jsonb,
          report_count = ${payload.reportCount},
          reports = '[]'::jsonb,
          final_report = NULL,
          progress = ${jsonParam(progress)}::jsonb,
          error = NULL,
          started_at = NULL,
          completed_at = NULL,
          updated_at = now()
        WHERE id = ${reportId}
          AND user_id = ${user.userId}
          AND status <> 'processing'
        RETURNING *
      )
      SELECT
        updated_report.*,
        (SELECT status FROM report_state) AS existing_status
      FROM report_state
      LEFT JOIN updated_report ON TRUE
    `;

    const row = rows[0];
    if (!row?.id) {
      if (!row?.existing_status) {
        throw new HttpError(404, 'Report not found.');
      }
      if (row.existing_status === 'processing') {
        throw new HttpError(409, 'Report is already processing.');
      }
      throw new HttpError(409, 'Report could not be retried.');
    }

    return normalizeReportRow(row, { includePayload: true, includeReports: true });
  }

  const weeklyLimit = getWeeklyReportLimit(payload.modelTier);
  const timeZone = getUsageLimitTimeZone();
  const usageEventId = crypto.randomUUID();

  const { rows } = await sql`
    WITH report_window AS (
      SELECT
        (date_trunc('week', now() AT TIME ZONE ${timeZone}) AT TIME ZONE ${timeZone}) AS window_start,
        ((date_trunc('week', now() AT TIME ZONE ${timeZone}) + interval '1 week') AT TIME ZONE ${timeZone}) AS window_end
    ),
    report_state AS (
      SELECT status
      FROM report_jobs
      WHERE id = ${reportId}
        AND user_id = ${user.userId}
      LIMIT 1
      FOR UPDATE
    ),
    existing_usage AS (
      SELECT COUNT(*)::int AS used
      FROM (
        SELECT event.id
        FROM report_usage_events AS event
        CROSS JOIN report_window AS quota_window
        WHERE event.user_id = ${user.userId}
          AND event.report_tier = ${payload.modelTier}
          AND event.window_start = quota_window.window_start

        UNION ALL

        SELECT job.id
        FROM report_jobs AS job
        CROSS JOIN report_window AS quota_window
        WHERE job.user_id = ${user.userId}
          AND job.created_at >= quota_window.window_start
          AND job.created_at < quota_window.window_end
          AND (
            COALESCE(job.payload->>'modelTier', '') = ${payload.modelTier}
            OR regexp_replace(COALESCE(job.payload->>'model', ''), '^models/', '', 'i') = ${payload.model}
          )
          AND NOT EXISTS (
            SELECT 1
            FROM report_usage_events AS existing_event
            WHERE existing_event.report_job_id = job.id
          )
      ) AS usage_rows
    ),
    quota_counter AS (
      INSERT INTO report_usage_counters (
        user_id,
        user_email,
        report_tier,
        window_start,
        window_end,
        used
      )
      SELECT
        ${user.userId},
        ${user.email},
        ${payload.modelTier},
        quota_window.window_start,
        quota_window.window_end,
        existing_usage.used + 1
      FROM report_window AS quota_window
      CROSS JOIN existing_usage
      WHERE existing_usage.used < ${weeklyLimit}
        AND ${weeklyLimit} > 0
        AND EXISTS (
          SELECT 1
          FROM report_state
          WHERE status <> 'processing'
        )
      ON CONFLICT (user_id, report_tier, window_start)
      DO UPDATE SET
        user_email = EXCLUDED.user_email,
        window_end = EXCLUDED.window_end,
        used = GREATEST(report_usage_counters.used, EXCLUDED.used - 1) + 1,
        updated_at = now()
      WHERE GREATEST(report_usage_counters.used, EXCLUDED.used - 1) < ${weeklyLimit}
      RETURNING used, window_start, window_end
    ),
    updated_report AS (
      UPDATE report_jobs
      SET
        status = 'queued',
        payload = ${jsonParam(payload)}::jsonb,
        report_count = ${payload.reportCount},
        reports = '[]'::jsonb,
        final_report = NULL,
        progress = ${jsonParam(progress)}::jsonb,
        error = NULL,
        started_at = NULL,
        completed_at = NULL,
        updated_at = now()
      WHERE id = ${reportId}
        AND user_id = ${user.userId}
        AND status <> 'processing'
        AND EXISTS (SELECT 1 FROM quota_counter)
      RETURNING *
    ),
    inserted_usage AS (
      INSERT INTO report_usage_events (
        id,
        user_id,
        user_email,
        report_job_id,
        report_tier,
        model,
        event_type,
        window_start,
        window_end
      )
      SELECT
        ${usageEventId},
        ${user.userId},
        ${user.email},
        updated_report.id,
        ${payload.modelTier},
        ${payload.model},
        'retry',
        quota_window.window_start,
        quota_window.window_end
      FROM updated_report
      CROSS JOIN report_window AS quota_window
      RETURNING id
    )
    SELECT
      updated_report.*,
      COALESCE(quota_counter.used - 1, ${weeklyLimit})::int AS quota_used,
      ${weeklyLimit}::int AS quota_limit,
      ${payload.modelTier} AS quota_tier,
      quota_window.window_start AS quota_window_start,
      quota_window.window_end AS quota_window_end,
      (SELECT COUNT(*)::int FROM inserted_usage) AS quota_reserved,
      (SELECT status FROM report_state) AS existing_status
    FROM report_window AS quota_window
    LEFT JOIN quota_counter ON TRUE
    LEFT JOIN updated_report ON TRUE
  `;

  const row = rows[0];
  if (!row?.id) {
    if (!row?.existing_status) {
      throw new HttpError(404, 'Report not found.');
    }
    if (row.existing_status === 'processing') {
      throw new HttpError(409, 'Report is already processing.');
    }
    throw weeklyLimitExceededError({
      tier: payload.modelTier,
      label: payload.modelLabel,
      used: row?.quota_used || weeklyLimit,
      limit: weeklyLimit,
      resetAt: row?.quota_window_end
    });
  }

  return normalizeReportRow(row, { includePayload: true, includeReports: true });
}

async function claimReportById(id) {
  await ensureSchema();
  const { rows } = await sql`
    UPDATE report_jobs
    SET
      status = 'processing',
      attempts = attempts + 1,
      started_at = COALESCE(started_at, now()),
      updated_at = now(),
      error = NULL,
      progress = jsonb_set(progress, '{phase}', to_jsonb('processing'::text), true)
    WHERE id = ${id} AND status = 'queued'
    RETURNING *
  `;
  return rows[0] || null;
}

async function claimAvailableReports({ limit = 1, userId = null } = {}) {
  await ensureSchema();
  const cappedLimit = Math.min(5, Math.max(1, Number.parseInt(limit, 10) || 1));

  if (userId) {
    const { rows } = await sql`
      WITH candidate AS (
        SELECT id
        FROM report_jobs
        WHERE user_id = ${userId}
          AND (
            status = 'queued'
            OR (status = 'processing' AND updated_at < now() - (${PROCESSING_STALE_MINUTES} || ' minutes')::interval)
          )
        ORDER BY created_at ASC
        LIMIT ${cappedLimit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE report_jobs
      SET
        status = 'processing',
        attempts = attempts + 1,
        started_at = COALESCE(started_at, now()),
        updated_at = now(),
        error = NULL,
        progress = jsonb_set(progress, '{phase}', to_jsonb('processing'::text), true)
      WHERE id IN (SELECT id FROM candidate)
      RETURNING *
    `;
    return rows;
  }

  const { rows } = await sql`
    WITH candidate AS (
      SELECT id
      FROM report_jobs
      WHERE status = 'queued'
        OR (status = 'processing' AND updated_at < now() - (${PROCESSING_STALE_MINUTES} || ' minutes')::interval)
      ORDER BY created_at ASC
      LIMIT ${cappedLimit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE report_jobs
    SET
      status = 'processing',
      attempts = attempts + 1,
      started_at = COALESCE(started_at, now()),
      updated_at = now(),
      error = NULL,
      progress = jsonb_set(progress, '{phase}', to_jsonb('processing'::text), true)
    WHERE id IN (SELECT id FROM candidate)
    RETURNING *
  `;
  return rows;
}

async function updateReportProgress(id, reports, progress) {
  await sql`
    UPDATE report_jobs
    SET
      reports = ${jsonParam(reports)}::jsonb,
      progress = ${jsonParam(progress)}::jsonb,
      updated_at = now()
    WHERE id = ${id}
  `;
}

async function markReportCompleted(id, reports, finalReport, reportCount) {
  const progress = {
    total: reportCount,
    completed: reportCount,
    phase: 'completed'
  };
  const { rows } = await sql`
    UPDATE report_jobs
    SET
      status = 'completed',
      reports = ${jsonParam(reports)}::jsonb,
      final_report = ${jsonParam(finalReport)}::jsonb,
      progress = ${jsonParam(progress)}::jsonb,
      error = NULL,
      updated_at = now(),
      completed_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0];
}

async function markReportFailed(id, message, reports = [], reportCount = DEFAULT_REPORT_COUNT) {
  const completed = reports.filter(Boolean).length;
  const progress = {
    total: reportCount,
    completed,
    phase: 'failed'
  };
  const { rows } = await sql`
    UPDATE report_jobs
    SET
      status = 'failed',
      reports = ${jsonParam(reports)}::jsonb,
      final_report = NULL,
      progress = ${jsonParam(progress)}::jsonb,
      error = ${String(message || 'Report processing failed.')},
      updated_at = now(),
      completed_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0];
}

async function runPool(items, concurrency, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      await worker(item);
    }
  });
  await Promise.all(runners);
}

function getDraftModelPlan(payload, reportCount) {
  const configuredPlan = Array.isArray(payload.draftModels)
    ? payload.draftModels.map((model) => asString(model, 200)).filter(Boolean)
    : [];
  const fallbackModel = asString(payload.supportModel || payload.model, 200) || DEFAULT_REPORT_MODEL;
  return Array.from({ length: reportCount }, (_, index) => configuredPlan[index] || fallbackModel);
}

async function processClaimedReport(row) {
  let payload = null;
  let reportCount = Number(row.report_count) || DEFAULT_REPORT_COUNT;
  let reports = [];
  let completed = 0;

  try {
    payload = sanitizeReportInput(row.payload || {});
    const prompt = buildReportPrompt(payload);
    reportCount = payload.reportCount;
    const draftModelPlan = getDraftModelPlan(payload, reportCount);
    const supportModel = asString(payload.supportModel || payload.model, 200) || DEFAULT_REPORT_MODEL;
    const draftConcurrency = Math.min(
      WORKER_CONCURRENCY,
      Math.max(1, Number.parseInt(payload.draftConcurrency, 10) || WORKER_CONCURRENCY)
    );
    reports = Array.from({ length: reportCount }, () => null);

    await runPool(
      Array.from({ length: reportCount }, (_, index) => index),
      draftConcurrency,
      async (index) => {
        const draftModel = draftModelPlan[index] || supportModel;
        try {
          const result = await withRetries(
            () => callGemini({
              model: draftModel,
              prompt,
              enableSearch: payload.enableSearch,
              index,
              attachments: payload.attachments,
              reasoningEffort: payload.reasoningEffort,
              timeoutMs: REPORT_DRAFT_TIMEOUT_MS
            }),
            { retries: 2, delayMs: 1500 }
          );
          reports[index] = {
            index,
            success: true,
            model: draftModel,
            content: result.content,
            searchSuggestions: result.searchSuggestions || [],
            valuations: extractValuations(result.content)
          };
        } catch (error) {
          reports[index] = {
            index,
            success: false,
            model: draftModel,
            error: error.message || 'Unknown AI error'
          };
        } finally {
          completed += 1;
          await updateReportProgress(row.id, reports, {
            total: reportCount,
            completed,
            phase: 'reports'
          });
        }
      }
    );

    const successfulReports = reports.filter((report) => report?.success);
    if (successfulReports.length === 0) {
      throw new Error('No successful report drafts were generated.');
    }

    await updateReportProgress(row.id, reports, {
      total: reportCount,
      completed,
      phase: 'merging'
    });

    const finalReport = await generateMergedReport({
      successfulReports,
      reportAudience: payload.reportAudience,
      model: supportModel,
      reasoningEffort: payload.reasoningEffort,
      enableSearch: payload.enableSearch,
      onProgressPhase: (phase) => updateReportProgress(row.id, reports, {
        total: reportCount,
        completed,
        phase
      })
    });

    finalReport.model = payload.model;
    finalReport.modelTier = payload.modelTier;
    finalReport.modelLabel = payload.modelLabel;
    finalReport.modelProvider = payload.modelProvider;
    finalReport.supportModel = supportModel;
    finalReport.draftModels = draftModelPlan;
    finalReport.reasoningEffort = payload.reasoningEffort;
    finalReport.draftConcurrency = draftConcurrency;
    finalReport.promptKey = payload.promptKey;
    finalReport.reportAudience = payload.reportAudience;
    finalReport.propertyAddress = payload.propertyAddress || finalReport.inferredAddress || '';

    const completedRow = await markReportCompleted(row.id, reports, finalReport, reportCount);
    return normalizeReportRow(completedRow, { includePayload: true, includeReports: true });
  } catch (error) {
    const failedRow = await markReportFailed(
      row.id,
      error.message || 'Report processing failed.',
      reports,
      reportCount
    );
    return normalizeReportRow(failedRow, { includePayload: true, includeReports: true });
  }
}

export async function processReportById(id) {
  const claimed = await claimReportById(id);
  if (!claimed) {
    return { processed: 0, skipped: true };
  }
  const report = await processClaimedReport(claimed);
  return { processed: 1, reports: [report] };
}

export async function processAvailableReports({ limit = 1, userId = null } = {}) {
  const claimed = await claimAvailableReports({ limit, userId });
  const processed = [];
  for (const row of claimed) {
    processed.push(await processClaimedReport(row));
  }
  return {
    claimed: claimed.length,
    processed: processed.length,
    reports: processed.map((report) => ({
      id: report.id,
      status: report.status,
      error: report.error
    }))
  };
}
