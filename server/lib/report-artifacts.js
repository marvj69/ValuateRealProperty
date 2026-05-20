import crypto from 'node:crypto';
import { ensureSchema, sql } from './db.js';
import { callGemini, isDeepSeekModel, normalizeModelName } from './gemini.js';

const CACHE_STATUS_HIT = 'hit';
const CACHE_STATUS_MISS = 'miss';
const CACHE_STATUS_RACE_HIT = 'race_hit';

function asString(value, maxLength = 20000) {
  return String(value || '').trim().slice(0, maxLength);
}

function hashText(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function stableNormalize(value) {
  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((normalized, key) => {
        const nextValue = value[key];
        if (nextValue !== undefined) {
          normalized[key] = stableNormalize(nextValue);
        }
        return normalized;
      }, {});
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableNormalize(value));
}

function stableHash(value) {
  return hashText(stableStringify(value));
}

function jsonParam(value) {
  return JSON.stringify(value ?? null);
}

function normalizeAttachmentForHash(attachment = {}) {
  const mimeType = asString(attachment.mimeType || attachment.mime_type, 200);
  const data = String(attachment.data || '').replace(/^data:[^,]+,/, '');
  return {
    name: asString(attachment.name || 'attachment', 500),
    mimeType,
    size: Number.isFinite(attachment.size) ? attachment.size : null,
    dataHash: hashText(data)
  };
}

export function buildReportInputFingerprint(payload = {}) {
  return stableHash({
    propertyAddress: asString(payload.propertyAddress, 1000),
    additionalDetails: asString(payload.additionalDetails),
    specialInstructions: asString(payload.specialInstructions),
    reportAudience: asString(payload.reportAudience, 100),
    promptKey: asString(payload.promptKey, 100),
    reportCount: Number.parseInt(payload.reportCount, 10) || null,
    enableSearch: Boolean(payload.enableSearch),
    model: asString(payload.model, 200),
    modelTier: asString(payload.modelTier, 100),
    modelLabel: asString(payload.modelLabel, 100),
    modelProvider: asString(payload.modelProvider, 100),
    supportModel: asString(payload.supportModel, 200),
    reasoningEffort: asString(payload.reasoningEffort, 100),
    draftConcurrency: Number.parseInt(payload.draftConcurrency, 10) || null,
    draftModels: Array.isArray(payload.draftModels)
      ? payload.draftModels.map((model) => asString(model, 200))
      : [],
    attachments: Array.isArray(payload.attachments)
      ? payload.attachments.map(normalizeAttachmentForHash)
      : []
  });
}

function normalizeGeminiRequestForHash(options = {}) {
  return {
    prompt: String(options.prompt || ''),
    model: normalizeModelName(options.model),
    enableSearch: Boolean(options.enableSearch),
    index: Number.parseInt(options.index, 10) || 0,
    attachments: Array.isArray(options.attachments)
      ? options.attachments.map(normalizeAttachmentForHash)
      : [],
    extraTools: Array.isArray(options.extraTools) ? options.extraTools : [],
    maxOutputTokens: Number.parseInt(options.maxOutputTokens, 10) || 65536,
    temperature: Number.isFinite(options.temperature) ? options.temperature : null,
    reasoningEffort: asString(options.reasoningEffort, 100)
  };
}

function normalizeTokenUsage(usage = {}) {
  usage = usage && typeof usage === 'object' ? usage : {};
  const inputTokens = Number(usage.inputTokens ?? usage.promptTokenCount ?? usage.prompt_tokens ?? usage.input_tokens);
  const outputTokens = Number(usage.outputTokens ?? usage.candidatesTokenCount ?? usage.completion_tokens ?? usage.output_tokens);
  const totalTokens = Number(usage.totalTokens ?? usage.totalTokenCount ?? usage.total_tokens);
  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : null,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : null,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : null,
    raw: usage.raw || usage
  };
}

async function findArtifact({ userId, reportId, inputFingerprint, stage, stageKey, model, requestHash }) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT *
    FROM report_artifacts
    WHERE user_id = ${userId}
      AND report_job_id = ${reportId}
      AND input_fingerprint = ${inputFingerprint}
      AND stage = ${stage}
      AND stage_key = ${stageKey}
      AND model = ${model}
      AND request_hash = ${requestHash}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function markArtifactHit(id) {
  await sql`
    UPDATE report_artifacts
    SET cache_hits = cache_hits + 1,
        updated_at = now()
    WHERE id = ${id}
  `;
}

async function insertArtifact({
  context,
  stage,
  stageKey,
  model,
  promptHash,
  requestHash,
  content,
  usage,
  latencyMs
}) {
  const id = crypto.randomUUID();
  const normalizedUsage = normalizeTokenUsage(usage);
  const { rows } = await sql`
    INSERT INTO report_artifacts (
      id,
      user_id,
      user_email,
      report_job_id,
      input_fingerprint,
      stage,
      stage_key,
      model,
      prompt_hash,
      request_hash,
      content,
      token_usage,
      latency_ms
    )
    VALUES (
      ${id},
      ${context.userId},
      ${context.userEmail || ''},
      ${context.reportId || null},
      ${context.inputFingerprint},
      ${stage},
      ${stageKey},
      ${model},
      ${promptHash},
      ${requestHash},
      ${jsonParam(content)}::jsonb,
      ${jsonParam(normalizedUsage)}::jsonb,
      ${latencyMs}
    )
    ON CONFLICT (user_id, report_job_id, input_fingerprint, stage, stage_key, model, request_hash)
    DO NOTHING
    RETURNING *
  `;
  return rows[0] || null;
}

async function recordApiUsageEvent({
  context,
  stage,
  stageKey,
  provider,
  model,
  requestHash,
  cacheStatus,
  usage,
  latencyMs
}) {
  if (!context?.userId || !context?.inputFingerprint) return;
  const normalizedUsage = normalizeTokenUsage(usage);
  await ensureSchema();
  await sql`
    INSERT INTO api_usage_events (
      id,
      user_id,
      user_email,
      report_job_id,
      input_fingerprint,
      stage,
      stage_key,
      provider,
      model,
      request_hash,
      cache_status,
      input_tokens,
      output_tokens,
      total_tokens,
      token_usage,
      latency_ms
    )
    VALUES (
      ${crypto.randomUUID()},
      ${context.userId},
      ${context.userEmail || ''},
      ${context.reportId || null},
      ${context.inputFingerprint},
      ${stage},
      ${stageKey},
      ${provider},
      ${model},
      ${requestHash},
      ${cacheStatus},
      ${normalizedUsage.inputTokens},
      ${normalizedUsage.outputTokens},
      ${normalizedUsage.totalTokens},
      ${jsonParam(normalizedUsage)}::jsonb,
      ${latencyMs}
    )
  `;
}

export async function callGeminiWithCache({
  artifactContext,
  stage,
  stageKey = 'default',
  validateResult = null,
  ...options
}) {
  if (!artifactContext?.userId || !artifactContext?.reportId || !artifactContext?.inputFingerprint || !stage) {
    return callGemini(options);
  }

  const normalizedModel = normalizeModelName(options.model);
  const provider = isDeepSeekModel(normalizedModel) ? 'deepseek' : 'gemini';
  const normalizedRequest = normalizeGeminiRequestForHash({
    ...options,
    model: normalizedModel
  });
  const promptHash = hashText(normalizedRequest.prompt);
  const requestHash = stableHash(normalizedRequest);
  const safeStageKey = asString(stageKey, 200) || 'default';

  const cached = await findArtifact({
    userId: artifactContext.userId,
    reportId: artifactContext.reportId,
    inputFingerprint: artifactContext.inputFingerprint,
    stage,
    stageKey: safeStageKey,
    model: normalizedModel,
    requestHash
  });
  if (cached) {
    try {
      if (typeof validateResult === 'function') {
        validateResult(cached.content || {});
      }
      await markArtifactHit(cached.id);
      await recordApiUsageEvent({
        context: artifactContext,
        stage,
        stageKey: safeStageKey,
        provider,
        model: normalizedModel,
        requestHash,
        cacheStatus: CACHE_STATUS_HIT,
        usage: cached.token_usage,
        latencyMs: 0
      });
      return {
        ...(cached.content || {}),
        cacheHit: true
      };
    } catch (error) {
      console.warn(`Ignoring invalid cached ${stage} artifact: ${error.message || error}`);
    }
  }

  const startedAt = Date.now();
  let result = null;
  let latencyMs = 0;
  try {
    result = await callGemini(options);
    latencyMs = Date.now() - startedAt;
    if (typeof validateResult === 'function') {
      validateResult(result);
    }
  } catch (error) {
    latencyMs = Date.now() - startedAt;
    if (result?.usage) {
      await recordApiUsageEvent({
        context: artifactContext,
        stage,
        stageKey: safeStageKey,
        provider,
        model: normalizedModel,
        requestHash,
        cacheStatus: CACHE_STATUS_MISS,
        usage: result.usage,
        latencyMs
      });
    }
    throw error;
  }

  const inserted = await insertArtifact({
    context: artifactContext,
    stage,
    stageKey: safeStageKey,
    model: normalizedModel,
    promptHash,
    requestHash,
    content: result,
    usage: result.usage,
    latencyMs
  });

  const cacheStatus = inserted ? CACHE_STATUS_MISS : CACHE_STATUS_RACE_HIT;
  if (!inserted) {
    const raced = await findArtifact({
      userId: artifactContext.userId,
      reportId: artifactContext.reportId,
      inputFingerprint: artifactContext.inputFingerprint,
      stage,
      stageKey: safeStageKey,
      model: normalizedModel,
      requestHash
    });
    if (raced) {
      await markArtifactHit(raced.id);
      await recordApiUsageEvent({
        context: artifactContext,
        stage,
        stageKey: safeStageKey,
        provider,
        model: normalizedModel,
        requestHash,
        cacheStatus,
        usage: result.usage,
        latencyMs
      });
      return {
        ...(raced.content || {}),
        cacheHit: true
      };
    }
  }

  await recordApiUsageEvent({
    context: artifactContext,
    stage,
    stageKey: safeStageKey,
    provider,
    model: normalizedModel,
    requestHash,
    cacheStatus: CACHE_STATUS_MISS,
    usage: result.usage,
    latencyMs
  });

  return {
    ...result,
    cacheHit: false
  };
}
