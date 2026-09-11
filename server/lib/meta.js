import { MetaAI } from './meta-client.js';

export function normalizeModelName() {
  // Legacy mode IDs and queued payloads cannot override the API model.
  return MetaAI.model;
}

export async function callMeta({ prompt, enableSearch = false, attachments = [],
  maxOutputTokens = 65536, timeoutMs = 120000, reasoningEffort = null } = {}) {
  const apiKey = process.env.META_API_KEY || process.env.MODEL_API_KEY;
  if (!apiKey) throw new Error('META_API_KEY is not configured.');
  const parsedTimeout = Number(timeoutMs);
  const duration = Number.isFinite(parsedTimeout) ? Math.min(240000, Math.max(5000, parsedTimeout)) : 120000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), duration);
  try {
    return await MetaAI.generate(apiKey, prompt, enableSearch, attachments, {
      maxOutputTokens,
      reasoningEffort: ['minimal', 'low', 'medium', 'high', 'max'].includes(reasoningEffort) ? reasoningEffort : 'medium',
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Meta AI request timed out after ${Math.round(duration / 1000)} seconds.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function withRetries(operation, { retries = 2, delayMs = 1500 } = {}) {
  let attempt = 0;
  let lastError = null;
  while (attempt <= retries) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (error.retryable === false || attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      attempt += 1;
    }
  }
  throw lastError;
}
