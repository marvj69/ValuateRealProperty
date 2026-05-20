import { DEFAULT_REPORT_MODEL } from './report-models.js';

const DEFAULT_GEMINI_TIMEOUT_MS = 120_000;
const MIN_GEMINI_TIMEOUT_MS = 5_000;
const MAX_GEMINI_TIMEOUT_MS = 240_000;
const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_REASONING_EFFORT = 'high';
const DEEPSEEK_REASONING_EFFORTS = new Set(['high', 'max']);
const DEEPSEEK_REASONING_ALIASES = Object.freeze({
  none: 'high',
  minimal: 'high',
  low: 'high',
  medium: 'high',
  high: 'high',
  xhigh: 'max',
  max: 'max'
});

export function normalizeModelName(model) {
  const selected = model || process.env.REPORT_MODEL || DEFAULT_REPORT_MODEL;
  return String(selected).replace(/^models\//i, '');
}

export function isDeepSeekModel(model) {
  const normalized = normalizeModelName(model).toLowerCase();
  return normalized.startsWith('deepseek-');
}

function resolveTimeoutMs(timeoutMs) {
  const parsed = Number.parseInt(timeoutMs, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_GEMINI_TIMEOUT_MS;
  return Math.min(MAX_GEMINI_TIMEOUT_MS, Math.max(MIN_GEMINI_TIMEOUT_MS, parsed));
}

function resolveDeepSeekUrl() {
  const baseUrl = String(process.env.DEEPSEEK_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL)
    .trim()
    .replace(/\/+$/, '');
  return `${baseUrl || DEFAULT_DEEPSEEK_BASE_URL}/chat/completions`;
}

function resolveDeepSeekReasoningEffort(reasoningEffort) {
  const requested = String(reasoningEffort || process.env.DEEPSEEK_REASONING_EFFORT || DEFAULT_DEEPSEEK_REASONING_EFFORT)
    .trim()
    .toLowerCase();
  const normalized = DEEPSEEK_REASONING_ALIASES[requested] || requested;
  return DEEPSEEK_REASONING_EFFORTS.has(normalized) ? normalized : DEFAULT_DEEPSEEK_REASONING_EFFORT;
}

function getThinkingConfigForModel(model) {
  const normalized = normalizeModelName(model).toLowerCase();
  if (normalized.startsWith('gemini-3')) {
    return { thinkingLevel: 'high' };
  }
  if (normalized.includes('2.5') || normalized.includes('flash-latest')) {
    return { thinkingBudget: -1 };
  }
  return null;
}

function buildDeepSeekMessages(prompt) {
  return [
    {
      role: 'user',
      content: String(prompt || '')
    }
  ];
}

function extractDeepSeekContent(data = {}) {
  const message = data.choices?.[0]?.message || {};
  if (typeof message.content === 'string') {
    return message.content.trim();
  }
  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }
  return '';
}

function normalizeDeepSeekUsage(data = {}) {
  const usage = data.usage || {};
  const inputTokens = Number(usage.input_tokens ?? usage.prompt_tokens);
  const outputTokens = Number(usage.output_tokens ?? usage.completion_tokens);
  const totalTokens = Number(usage.total_tokens);
  const reasoningTokens = Number(usage.completion_tokens_details?.reasoning_tokens);
  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : null,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : null,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : null,
    reasoningTokens: Number.isFinite(reasoningTokens) ? reasoningTokens : null,
    raw: usage
  };
}

function normalizeGeminiUsage(data = {}) {
  const usage = data.usageMetadata || {};
  const inputTokens = Number(usage.promptTokenCount);
  const outputTokens = Number(usage.candidatesTokenCount);
  const totalTokens = Number(usage.totalTokenCount);
  const thoughtsTokens = Number(usage.thoughtsTokenCount);
  return {
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : null,
    outputTokens: Number.isFinite(outputTokens) ? outputTokens : null,
    totalTokens: Number.isFinite(totalTokens) ? totalTokens : null,
    thoughtsTokens: Number.isFinite(thoughtsTokens) ? thoughtsTokens : null,
    raw: usage
  };
}

async function callDeepSeek({
  prompt,
  model,
  enableSearch = false,
  attachments = [],
  extraTools = [],
  maxOutputTokens = 65536,
  temperature = null,
  timeoutMs = DEFAULT_GEMINI_TIMEOUT_MS,
  reasoningEffort = null
}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured.');
  }

  if ((attachments || []).length > 0) {
    throw new Error('DeepSeek Experimental does not support PDF or image attachments through the Chat Completions API. Remove attachments or use Fast/Smart for attachment-based reports.');
  }

  const normalizedModel = normalizeModelName(model);
  const requestBody = {
    model: normalizedModel,
    messages: buildDeepSeekMessages(prompt),
    max_tokens: Math.max(1, Number.parseInt(maxOutputTokens, 10) || 65536),
    stream: false
  };

  if (normalizedModel.toLowerCase() === 'deepseek-v4-pro') {
    requestBody.thinking = { type: 'enabled' };
    requestBody.reasoning_effort = resolveDeepSeekReasoningEffort(reasoningEffort);
  }

  if (Number.isFinite(temperature)) {
    requestBody.temperature = Math.min(2, Math.max(0, temperature));
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  };

  const resolvedTimeoutMs = resolveTimeoutMs(timeoutMs);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolvedTimeoutMs);

  try {
    const response = await fetch(resolveDeepSeekUrl(), {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!response.ok) {
      let message = `DeepSeek API error: ${response.status}`;
      try {
        const errorData = await response.json();
        message = errorData.error?.message || message;
      } catch (error) {
        try {
          const errorText = await response.text();
          message = errorText || message;
        } catch (innerError) {
          // Keep the status-based message.
        }
      }
      throw new Error(message);
    }

    const data = await response.json();
    const finishReason = data.choices?.[0]?.finish_reason || '';
    if (finishReason === 'content_filter') {
      throw new Error('DeepSeek response was blocked by the content filter.');
    }
    if (finishReason === 'insufficient_system_resource') {
      throw new Error('DeepSeek could not complete the request due to insufficient system resources.');
    }
    if (finishReason === 'tool_calls') {
      throw new Error('DeepSeek requested a tool call, but no DeepSeek tool execution is configured for this workflow.');
    }

    const content = extractDeepSeekContent(data);
    if (!content) {
      throw new Error('DeepSeek returned an empty response.');
    }

    return {
      content,
      searchSuggestions: [],
      usage: normalizeDeepSeekUsage(data),
      provider: 'deepseek',
      model: normalizedModel
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`DeepSeek request timed out after ${Math.round(resolvedTimeoutMs / 1000)} seconds.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callGemini({
  prompt,
  model,
  enableSearch = false,
  index = 0,
  attachments = [],
  extraTools = [],
  maxOutputTokens = 65536,
  temperature = null,
  timeoutMs = DEFAULT_GEMINI_TIMEOUT_MS,
  reasoningEffort = null
}) {
  const normalizedModel = normalizeModelName(model);
  if (isDeepSeekModel(normalizedModel)) {
    return callDeepSeek({
      prompt,
      model: normalizedModel,
      enableSearch,
      attachments,
      extraTools,
      maxOutputTokens,
      temperature,
      timeoutMs,
      reasoningEffort
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const parts = [{ text: prompt }];

  for (const attachment of attachments || []) {
    parts.push({
      inline_data: {
        mime_type: attachment.mimeType,
        data: attachment.data
      }
    });
  }

  const resolvedTemperature = Number.isFinite(temperature)
    ? Math.min(1.95, Math.max(0, temperature))
    : Math.min(1.95, 1 + index * 0.05);

  const generationConfig = {
    temperature: resolvedTemperature,
    topP: 0.95,
    topK: 40,
    maxOutputTokens
  };

  const thinkingConfig = getThinkingConfigForModel(model);
  if (thinkingConfig) {
    generationConfig.thinkingConfig = thinkingConfig;
  }

  const tools = [];
  if (enableSearch) {
    tools.push({ google_search: {} });
  }
  if (extraTools.length > 0) {
    tools.push(...extraTools);
  }

  const requestBody = {
    contents: [{ parts }],
    generationConfig
  };
  if (tools.length > 0) {
    requestBody.tools = tools;
  }

  const resolvedTimeoutMs = resolveTimeoutMs(timeoutMs);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolvedTimeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!response.ok) {
      let message = `Gemini API error: ${response.status}`;
      try {
        const errorData = await response.json();
        message = errorData.error?.message || message;
      } catch (error) {
        // Keep the status-based message.
      }
      throw new Error(message);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No response generated.');
    }

    const content = (candidate.content?.parts || [])
      .map((part) => part.text || '')
      .filter(Boolean)
      .join('\n\n');

    if (!content) {
      throw new Error('Gemini returned an empty response.');
    }

    let searchSuggestions = [];
    if (candidate.groundingMetadata?.searchEntryPoint?.renderedContent) {
      searchSuggestions = [candidate.groundingMetadata.searchEntryPoint.renderedContent];
    }
    if (candidate.groundingMetadata?.webSearchQueries) {
      searchSuggestions = candidate.groundingMetadata.webSearchQueries;
    }

    return {
      content,
      searchSuggestions,
      usage: normalizeGeminiUsage(data),
      provider: 'gemini',
      model: normalizedModel
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Gemini request timed out after ${Math.round(resolvedTimeoutMs / 1000)} seconds.`);
    }
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
      if (attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      attempt += 1;
    }
  }
  throw lastError;
}
