import { DEFAULT_REPORT_MODEL } from './prompts.js';

export function normalizeModelName(model) {
  const selected = model || process.env.REPORT_MODEL || DEFAULT_REPORT_MODEL;
  return selected.replace(/^models\//i, '');
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

export async function callGemini({
  prompt,
  model,
  enableSearch = false,
  index = 0,
  attachments = [],
  extraTools = [],
  maxOutputTokens = 65536
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const normalizedModel = normalizeModelName(model);
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

  const generationConfig = {
    temperature: Math.min(1.95, 1 + index * 0.05),
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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
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

  return { content, searchSuggestions };
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
