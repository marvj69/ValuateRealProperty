import { DEFAULT_REPORT_MODEL } from './report-models.js';

const DEFAULT_GEMINI_TIMEOUT_MS = 120_000;
const MIN_GEMINI_TIMEOUT_MS = 5_000;
const MAX_GEMINI_TIMEOUT_MS = 240_000;
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_REASONING_EFFORT = 'medium';
const OPENAI_REASONING_EFFORTS = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']);

export function normalizeModelName(model) {
  const selected = model || process.env.REPORT_MODEL || DEFAULT_REPORT_MODEL;
  return String(selected).replace(/^models\//i, '');
}

export function isOpenAIModel(model) {
  const normalized = normalizeModelName(model).toLowerCase();
  return (
    normalized.startsWith('gpt-') ||
    normalized.startsWith('chatgpt-') ||
    /^o\d/.test(normalized) ||
    normalized.startsWith('o-')
  );
}

function resolveTimeoutMs(timeoutMs) {
  const parsed = Number.parseInt(timeoutMs, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_GEMINI_TIMEOUT_MS;
  return Math.min(MAX_GEMINI_TIMEOUT_MS, Math.max(MIN_GEMINI_TIMEOUT_MS, parsed));
}

function resolveOpenAIReasoningEffort(reasoningEffort) {
  const normalized = String(reasoningEffort || process.env.OPENAI_REASONING_EFFORT || DEFAULT_OPENAI_REASONING_EFFORT)
    .trim()
    .toLowerCase();
  return OPENAI_REASONING_EFFORTS.has(normalized) ? normalized : DEFAULT_OPENAI_REASONING_EFFORT;
}

function isOpenAIReasoningModel(model) {
  const normalized = normalizeModelName(model).toLowerCase();
  return normalized.startsWith('gpt-5') || /^o\d/.test(normalized) || normalized.startsWith('o-');
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

function buildOpenAIInput(prompt, attachments = []) {
  const content = [{ type: 'input_text', text: prompt }];

  for (const attachment of attachments || []) {
    const mimeType = String(attachment.mimeType || '').trim();
    const data = String(attachment.data || '').replace(/^data:[^,]+,/, '');
    if (!mimeType || !data) continue;

    const fileData = `data:${mimeType};base64,${data}`;
    if (mimeType.startsWith('image/')) {
      content.push({
        type: 'input_image',
        image_url: fileData
      });
    } else if (mimeType === 'application/pdf') {
      content.push({
        type: 'input_file',
        filename: String(attachment.name || 'attachment.pdf').slice(0, 200),
        file_data: fileData
      });
    }
  }

  return [{ role: 'user', content }];
}

function addOpenAITool(tools, tool) {
  if (!tool?.type || tools.some((existingTool) => existingTool.type === tool.type)) return;
  tools.push(tool);
}

function buildOpenAITools({ enableSearch, extraTools = [] }) {
  const tools = [];
  if (enableSearch) {
    addOpenAITool(tools, { type: 'web_search', search_context_size: 'medium' });
  }

  for (const tool of extraTools || []) {
    if (tool?.code_execution || tool?.type === 'code_interpreter') {
      addOpenAITool(tools, { type: 'code_interpreter', container: { type: 'auto' } });
    }
    if (tool?.type === 'web_search') {
      addOpenAITool(tools, { type: 'web_search', search_context_size: tool.search_context_size || 'medium' });
    }
  }

  return tools;
}

function collectOpenAIText(output, texts = []) {
  if (!output) return texts;
  if (Array.isArray(output)) {
    for (const item of output) collectOpenAIText(item, texts);
    return texts;
  }
  if (typeof output !== 'object') return texts;

  if ((output.type === 'output_text' || output.type === 'text') && typeof output.text === 'string') {
    texts.push(output.text);
  }
  if (output.type === 'message' && typeof output.content === 'string') {
    texts.push(output.content);
  }
  if (Array.isArray(output.content)) collectOpenAIText(output.content, texts);
  if (Array.isArray(output.output)) collectOpenAIText(output.output, texts);
  return texts;
}

function extractOpenAIContent(data) {
  if (typeof data.output_text === 'string') {
    return data.output_text.trim();
  }
  return collectOpenAIText(data.output)
    .map((text) => text.trim())
    .filter(Boolean)
    .join('\n\n')
    .trim();
}

function collectOpenAIAnnotations(output, annotations = []) {
  if (!output) return annotations;
  if (Array.isArray(output)) {
    for (const item of output) collectOpenAIAnnotations(item, annotations);
    return annotations;
  }
  if (typeof output !== 'object') return annotations;

  if (Array.isArray(output.annotations)) {
    annotations.push(...output.annotations);
  }
  if (Array.isArray(output.content)) collectOpenAIAnnotations(output.content, annotations);
  if (Array.isArray(output.output)) collectOpenAIAnnotations(output.output, annotations);
  return annotations;
}

function extractOpenAISearchSuggestions(data) {
  const suggestions = collectOpenAIAnnotations(data.output)
    .map((annotation) => {
      const url = String(annotation.url || '').trim();
      const title = String(annotation.title || '').trim();
      if (!url) return '';
      return title ? `${title}: ${url}` : url;
    })
    .filter(Boolean);
  return [...new Set(suggestions)];
}

async function callOpenAI({
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const normalizedModel = normalizeModelName(model);
  const tools = buildOpenAITools({ enableSearch, extraTools });
  const requestBody = {
    model: normalizedModel,
    input: buildOpenAIInput(prompt, attachments),
    max_output_tokens: Math.max(1, Number.parseInt(maxOutputTokens, 10) || 65536),
    store: false
  };

  if (isOpenAIReasoningModel(normalizedModel)) {
    requestBody.reasoning = {
      effort: resolveOpenAIReasoningEffort(reasoningEffort)
    };
  } else if (Number.isFinite(temperature)) {
    requestBody.temperature = Math.min(2, Math.max(0, temperature));
  }

  if (tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = 'auto';
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  };
  if (process.env.OPENAI_ORGANIZATION) {
    headers['OpenAI-Organization'] = process.env.OPENAI_ORGANIZATION;
  }
  if (process.env.OPENAI_PROJECT) {
    headers['OpenAI-Project'] = process.env.OPENAI_PROJECT;
  }

  const resolvedTimeoutMs = resolveTimeoutMs(timeoutMs);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolvedTimeoutMs);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!response.ok) {
      let message = `OpenAI API error: ${response.status}`;
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
    if (data.status === 'incomplete') {
      throw new Error(`OpenAI response incomplete: ${data.incomplete_details?.reason || 'unknown reason'}`);
    }

    const content = extractOpenAIContent(data);
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    return {
      content,
      searchSuggestions: extractOpenAISearchSuggestions(data)
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`OpenAI request timed out after ${Math.round(resolvedTimeoutMs / 1000)} seconds.`);
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
  if (isOpenAIModel(normalizedModel)) {
    return callOpenAI({
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

    return { content, searchSuggestions };
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
