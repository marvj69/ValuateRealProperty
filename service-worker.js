const CACHE_VERSION = 'v2.11';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const OFFLINE_URL = './offline.html';
const DEFAULT_REPORTS_MODEL = 'gemini-3-flash-preview';
const JOBS_DB_NAME = 'valuate-jobs';
const JOBS_STORE_NAME = 'jobs';
const HISTORY_DB_NAME = 'valuate-history';
const HISTORY_STORE_NAME = 'reports';
const MAX_REPORT_RETRIES = 2;
const RETRY_DELAY_MS = 1500;
let processingQueue = false;

const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './app.js?v=2.11',
  './tailwind-config.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/icon-180.png',
  './photo assets/906-Real-Estate-Group_Logo-2024_Black.png',
  './photo assets/CBlobo.png',
  OFFLINE_URL
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
      .then(() => processQueue())
  );
});

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
      return response;
    });
  });
}

function networkFirst(request) {
  return fetch(request).then((response) => {
    const copy = response.clone();
    caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
    return response;
  }).catch(() => caches.match(request));
}

function staleWhileRevalidate(request) {
  return caches.match(request).then((cached) => {
    const networkFetch = fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => cached);

    return cached || networkFetch;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let jobsDbPromise = null;
function openJobsDb() {
  if (jobsDbPromise) return jobsDbPromise;
  jobsDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(JOBS_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(JOBS_STORE_NAME)) {
        const store = db.createObjectStore(JOBS_STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('updatedAt', 'updatedAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return jobsDbPromise;
}

let historyDbPromise = null;
function openHistoryDb() {
  if (historyDbPromise) return historyDbPromise;
  historyDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(HISTORY_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
        const store = db.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return historyDbPromise;
}

async function saveJob(job) {
  const db = await openJobsDb();
  job.updatedAt = Date.now();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(JOBS_STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(JOBS_STORE_NAME).put(job);
  });
}

async function getJob(jobId) {
  const db = await openJobsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(JOBS_STORE_NAME, 'readonly');
    const request = tx.objectStore(JOBS_STORE_NAME).get(jobId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function listJobs() {
  const db = await openJobsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(JOBS_STORE_NAME, 'readonly');
    const request = tx.objectStore(JOBS_STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function saveHistoryReport(record) {
  const db = await openHistoryDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(HISTORY_STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(HISTORY_STORE_NAME).put(record);
  });
}

function generateHistoryId() {
  if (self.crypto?.randomUUID) {
    return self.crypto.randomUUID();
  }
  return `hist-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeModelName(model) {
  const selectedModel = model || DEFAULT_REPORTS_MODEL;
  return selectedModel.replace(/^models\//i, '');
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

async function callGeminiAPI(apiKey, model, prompt, enableSearch, index, attachments = [], extraTools = []) {
  const normalizedModel = normalizeModelName(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${apiKey}`;

  const parts = [{ text: prompt }];
  if (attachments && attachments.length > 0) {
    attachments.forEach((attachment) => {
      parts.push({
        inline_data: {
          mime_type: attachment.mimeType,
          data: attachment.data
        }
      });
    });
  }

  const thinkingConfig = getThinkingConfigForModel(model);
  const requestBody = {
    contents: [{
      parts
    }],
    generationConfig: {
      temperature: 1 + (index * 0.05),
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 65536
    }
  };
  if (thinkingConfig) {
    requestBody.generationConfig.thinkingConfig = thinkingConfig;
  }

  const tools = [];
  if (enableSearch) {
    tools.push({ google_search: {} });
  }
  if (extraTools.length > 0) {
    tools.push(...extraTools);
  }
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
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response generated');
  }

  const candidate = data.candidates[0];
  const contentParts = candidate.content?.parts || [];
  const content = contentParts
    .map((part) => part.text || '')
    .filter(Boolean)
    .join('\n\n');

  let searchSuggestions = [];
  if (data.candidates[0]?.groundingMetadata?.searchEntryPoint?.renderedContent) {
    searchSuggestions = [data.candidates[0].groundingMetadata.searchEntryPoint.renderedContent];
  }
  if (data.candidates[0]?.groundingMetadata?.webSearchQueries) {
    searchSuggestions = data.candidates[0].groundingMetadata.webSearchQueries;
  }

  return { content, searchSuggestions };
}

function extractValuations(content) {
  const parseNumber = (value) => {
    if (!value) return null;
    return parseFloat(String(value).replace(/,/g, ''));
  };

  const valuations = {
    pointEstimate: null,
    rangeLow: null,
    rangeHigh: null
  };

  const pointPatterns = [
    /Single\s*Point\s*Estimate[:\s]*\$?([\d,]+)/i,
    /Most\s*Likely\s*(?:Market\s*)?Value[:\s]*\$?([\d,]+)/i,
    /Point\s*Estimate[:\s]*\$?([\d,]+)/i,
    /Estimated\s*(?:Market\s*)?Value[:\s]*\$?([\d,]+)(?!\s*[-–])/i
  ];

  for (const pattern of pointPatterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      valuations.pointEstimate = parseNumber(match[1]);
      break;
    }
  }

  const rangePatterns = [
    /(?:Estimated\s*)?(?:Market\s*)?Value\s*Range[:\s]*\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/i,
    /Range[:\s]*\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/i,
    /\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/i
  ];

  for (const pattern of rangePatterns) {
    const match = content.match(pattern);
    if (match?.[1] && match?.[2]) {
      valuations.rangeLow = parseNumber(match[1]);
      valuations.rangeHigh = parseNumber(match[2]);
      break;
    }
  }

  return valuations;
}

function mergeValueRange(valuations, valueRangeOverride) {
  if (!valueRangeOverride?.rangeLow || !valueRangeOverride?.rangeHigh) {
    return valuations;
  }
  return {
    ...valuations,
    rangeLow: valueRangeOverride.rangeLow,
    rangeHigh: valueRangeOverride.rangeHigh
  };
}

async function inferValueRangeFromReport(apiKey, reportText) {
  const cleanedText = (reportText || '').replace(/\s+/g, ' ').trim();
  if (!cleanedText || !apiKey) {
    return null;
  }

  const prompt = `You are a valuation range extraction assistant.
Read the report and return ONLY a JSON object with numeric rangeLow and rangeHigh values.
Use whole numbers without commas or currency symbols.
If no clear value range is present, return "UNKNOWN".

Report:
${cleanedText}`;

  const result = await callGeminiAPI(
    apiKey,
    'gemini-flash-lite-latest',
    prompt,
    false,
    0,
    []
  );

  const responseText = (result?.content || '').trim();
  if (!responseText || /unknown/i.test(responseText)) {
    return null;
  }

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  let parsed = null;
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (error) {
      parsed = null;
    }
  }

  const parseNumber = (value) => {
    if (value === null || value === undefined) return null;
    const numeric = parseFloat(String(value).replace(/,/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  };

  const rangeLow = parseNumber(parsed?.rangeLow ?? parsed?.low ?? parsed?.min);
  const rangeHigh = parseNumber(parsed?.rangeHigh ?? parsed?.high ?? parsed?.max);

  if (!rangeLow || !rangeHigh) {
    return null;
  }

  return rangeLow <= rangeHigh
    ? { rangeLow, rangeHigh }
    : { rangeLow: rangeHigh, rangeHigh: rangeLow };
}

async function inferAddressFromFinalReport(apiKey, model, reportText) {
  const cleanedText = (reportText || '').replace(/\s+/g, ' ').trim();
  if (!cleanedText || !apiKey) {
    return null;
  }

  const prompt = `You are an address extraction assistant.
Return ONLY the full subject property address (street, city, state, ZIP) from the report text.
Choose the subject property, not comparable listings. If no clear subject address is present, return "UNKNOWN".

Report Text:
${cleanedText}`;

  const result = await callGeminiAPI(
    apiKey,
    'gemini-flash-lite-latest',
    prompt,
    false,
    0,
    []
  );

  let candidate = (result?.content || '').trim();
  if (!candidate) return null;
  candidate = candidate.split('\n')[0].trim();
  candidate = candidate.replace(/^[-*]\s*/, '');
  candidate = candidate.replace(/^Address\s*[:\-]\s*/i, '');
  candidate = candidate.replace(/^Subject\s*Property\s*[:\-]\s*/i, '');
  if (!candidate || /^unknown$/i.test(candidate)) {
    return null;
  }
  return candidate;
}

async function validateCompsAndListings(apiKey, model, enableSearch, reportsText) {
  const VALIDATE_COMPS_TEMPLATE = `You are a data verification specialist focused on real estate comps. Extract all comparable sales and active/pending listings from the reports below and verify them.

Verification steps (strict):
- Confirm each address exists and appears to be a real property.
- Verify key data (sale/list date, price, beds, baths, SqFt, year built, lot size) using reputable public sources (Zillow, Redfin, Realtor.com, county records, assessor/recorder data).
- If data conflicts, choose the most credible source and note the discrepancy.
- If you cannot verify an address or at least the price + date, exclude it.

Output format (Markdown):
## Validated Comparable Sales
| Address | Sale Date | Sale Price | Beds | Baths | SqFt | Year Built | Lot Size | Sources | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Validated Active/Pending Listings
| Address | List/Pending Date | List Price | Beds | Baths | SqFt | Year Built | Lot Size | Sources | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Excluded/Unverified
- Address (reason)

Rules:
- Do not invent new comps outside the reports. Only correct obvious address errors if a verified match is found.
- If web search is unavailable, state "Web search unavailable" and exclude any comp/listing you cannot verify from the report text itself.
- Be conservative: when in doubt, exclude.

Reports:
${reportsText}`;

  const result = await callGeminiAPI(
    apiKey,
    model,
    VALIDATE_COMPS_TEMPLATE,
    enableSearch,
    0,
    []
  );

  return result.content;
}

async function persistFinalReport(job, markdownContent, valueRangeOverride, inferredAddress) {
  const extractedValuations = extractValuations(markdownContent || '');
  const mergedValuations = mergeValueRange(extractedValuations, valueRangeOverride);
  const record = {
    id: generateHistoryId(),
    createdAt: Date.now(),
    address: job.payload?.propertyAddress?.trim() || inferredAddress || 'Address not provided',
    audience: job.payload?.reportAudience || '',
    model: job.payload?.model || '',
    promptKey: job.payload?.promptKey || 'standard',
    reportCount: job.payload?.reportCount || null,
    enableSearch: Boolean(job.payload?.enableSearch),
    valuations: mergedValuations,
    content: markdownContent || ''
  };

  try {
    await saveHistoryReport(record);
  } catch (error) {
    console.warn('Failed to save valuation history.', error);
  }

  return record;
}

async function notifyClients(message) {
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clientList.forEach((client) => client.postMessage(message));
}

async function showCompletionNotification(job, record) {
  if (!self.registration?.showNotification || typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  const addressLabel = job.payload?.propertyAddress?.trim() || job.finalReport?.inferredAddress || 'your valuation';
  await self.registration.showNotification('Valuation ready', {
    body: `Your report for ${addressLabel} is ready.`,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192-maskable.png',
    tag: 'valuation-ready',
    renotify: true,
    data: {
      jobId: job.id,
      recordId: record?.id || null
    }
  });
}

async function processJob(job) {
  if (job?.payload && !job.payload.model) {
    job.payload.model = DEFAULT_REPORTS_MODEL;
  }

  if (!job?.payload?.apiKey) {
    job.status = 'error';
    job.error = 'Missing API configuration.';
    await saveJob(job);
    await notifyClients({ type: 'JOB_ERROR', jobId: job.id });
    return;
  }

  const reportCount = job.payload.reportCount || 1;
  job.status = 'running';
  job.phase = 'reports';
  job.error = null;
  job.progress = job.progress || { total: reportCount, completed: 0 };
  job.progress.total = reportCount;
  job.reports = Array.isArray(job.reports) ? job.reports : [];
  job.progress.completed = job.reports.filter((item) => item && (item.success || item.error)).length;
  await saveJob(job);
  await notifyClients({ type: 'JOB_UPDATE', jobId: job.id });

  for (let i = 0; i < reportCount; i++) {
    const existing = job.reports[i];
    if (existing?.success || existing?.error) {
      job.progress.completed = job.reports.filter((item) => item && (item.success || item.error)).length;
      continue;
    }

    job.runningIndex = i;
    await saveJob(job);
    await notifyClients({ type: 'JOB_UPDATE', jobId: job.id });

    let attempt = 0;
    let lastError = null;
    let result = null;

    while (attempt <= MAX_REPORT_RETRIES) {
      try {
        const response = await callGeminiAPI(
          job.payload.apiKey,
          job.payload.model,
          job.payload.prompt,
          job.payload.enableSearch,
          i,
          job.payload.attachments || []
        );
        result = response;
        break;
      } catch (error) {
        lastError = error;
        if (attempt < MAX_REPORT_RETRIES) {
          await sleep(RETRY_DELAY_MS);
          attempt++;
          continue;
        }
        break;
      }
    }

    if (result) {
      job.reports[i] = {
        index: i,
        success: true,
        content: result.content,
        searchSuggestions: result.searchSuggestions || [],
        valuations: extractValuations(result.content)
      };
    } else {
      job.reports[i] = {
        index: i,
        success: false,
        error: lastError?.message || 'Unknown error'
      };
    }

    job.progress.completed = job.reports.filter((item) => item && (item.success || item.error)).length;
    await saveJob(job);
    await notifyClients({ type: 'JOB_UPDATE', jobId: job.id });
  }

  job.runningIndex = null;
  const successfulReports = job.reports.filter((item) => item && item.success);
  if (successfulReports.length === 0) {
    job.status = 'error';
    job.error = 'No successful reports to merge.';
    await saveJob(job);
    await notifyClients({ type: 'JOB_ERROR', jobId: job.id });
    return;
  }

  const reportsText = successfulReports
    .map((report, index) => `--- Report ${index + 1} ---\n${report.content}`)
    .join('\n\n');

  job.phase = 'validating';
  await saveJob(job);
  await notifyClients({ type: 'JOB_UPDATE', jobId: job.id });

  let validatedCompsContent = 'Validation step unavailable.';
  try {
    validatedCompsContent = await validateCompsAndListings(
      job.payload.apiKey,
      job.payload.model,
      job.payload.enableSearch,
      reportsText
    );
  } catch (error) {
    validatedCompsContent = `Validation step failed: ${error.message}. Proceed with caution and note that comps were not independently verified.`;
  }

  job.phase = 'merging';
  await saveJob(job);
  await notifyClients({ type: 'JOB_UPDATE', jobId: job.id });

  const FINAL_REPORT_TEMPLATE = `You are a senior real estate analyst. Read all reports below and produce ONE report that merges and reconciles them into a single, authoritative narrative.
Intended audience: ${job.payload.reportAudience}. Tailor emphasis, risks, and recommendations accordingly.

Requirements:
- Resolve inconsistencies across reports, favoring data that is cited more consistently or appears better supported.
- Combine comps and listings into unified tables (de-duplicate where possible).
- Preserve the required report structure and formatting from the original reports (Markdown headings, tables, bullet points).
- Use ## headings for main sections and ### for subsections.
- Keep a professional, analytical tone.
- Use the validated comps/listings below as authoritative. Do not include comps/listings not present there. If validation notes exclusions or uncertainty, reflect that in the final report.

Validated Comparable Sales & Listings:
${validatedCompsContent}

Reports to Merge:
${reportsText}`;

  try {
    const finalResult = await callGeminiAPI(
      job.payload.apiKey,
      job.payload.model,
      FINAL_REPORT_TEMPLATE,
      false,
      0,
      [],
      [{ code_execution: {} }]
    );

    job.phase = 'finalizing';
    await saveJob(job);
    await notifyClients({ type: 'JOB_UPDATE', jobId: job.id });

    let valueRange = null;
    try {
      valueRange = await inferValueRangeFromReport(job.payload.apiKey, finalResult.content);
    } catch (error) {
      valueRange = null;
    }

    let inferredAddress = null;
    try {
      inferredAddress = await inferAddressFromFinalReport(job.payload.apiKey, job.payload.model, finalResult.content);
    } catch (error) {
      inferredAddress = null;
    }

    const extractedValuations = extractValuations(finalResult.content || '');
    const mergedValuations = mergeValueRange(extractedValuations, valueRange);

    job.finalReport = {
      content: finalResult.content,
      valueRange,
      inferredAddress,
      valuations: mergedValuations
    };

    const historyRecord = await persistFinalReport(job, finalResult.content, valueRange, inferredAddress);
    job.status = 'completed';
    job.phase = 'completed';
    await saveJob(job);
    await notifyClients({ type: 'JOB_COMPLETE', jobId: job.id });
    await showCompletionNotification(job, historyRecord);
  } catch (error) {
    job.status = 'error';
    job.phase = 'error';
    job.error = `Final report failed: ${error.message}`;
    await saveJob(job);
    await notifyClients({ type: 'JOB_ERROR', jobId: job.id });
  }
}

async function processQueue() {
  if (processingQueue) return;
  processingQueue = true;
  try {
    const jobs = await listJobs();
    const queued = jobs.filter((job) => job && (job.status === 'queued' || job.status === 'running'));
    for (const job of queued) {
      await processJob(job);
    }
  } catch (error) {
    console.warn('Background queue processing failed.', error);
  } finally {
    processingQueue = false;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.hostname === 'generativelanguage.googleapis.com') {
    return;
  }

  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(
        networkFirst(request).then((response) => response || caches.match(OFFLINE_URL))
      );
      return;
    }

    event.respondWith(
      cacheFirst(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  const cdnHosts = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com',
    'cdn.jsdelivr.net',
    'cdn.tailwindcss.com'
  ];

  if (cdnHosts.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'QUEUE_JOB') {
    event.waitUntil((async () => {
      try {
        const job = data.job || (data.jobId ? await getJob(data.jobId) : null);
        if (!job) return;
        await saveJob(job);
        await processQueue();
      } catch (error) {
        console.warn('Failed to queue job.', error);
      }
    })());
    return;
  }
  if (data.type === 'PROCESS_QUEUE') {
    event.waitUntil(processQueue());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'valuation-sync') {
    event.waitUntil(processQueue());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
      return undefined;
    })
  );
});
