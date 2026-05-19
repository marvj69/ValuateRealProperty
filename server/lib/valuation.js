import {
  buildAddressExtractionPrompt,
  buildComplianceReviewPrompt,
  buildComplianceRevisionPrompt,
  buildFinalReportPrompt,
  buildValidationPrompt,
  buildValueExtractionPrompt
} from './prompts.js';
import { callGemini, isOpenAIModel } from './gemini.js';

const COMPLIANCE_REVIEW_MODEL = 'gemini-flash-lite-latest';
const COMPLIANCE_REVISION_MODEL = 'gemini-3-flash-preview';
const COMP_VALIDATION_MODEL = 'gemini-flash-lite-latest';
const MAX_COMPLIANCE_REREVIEW_ROUNDS = 2;
const MAX_COMP_VALIDATION_ATTEMPTS = 3;
const MIN_VERIFIED_COMP_COUNT = 1;
const COMP_VALIDATION_TIMEOUT_MS = 60_000;
const COMP_VALIDATION_MAX_CHARS = 60_000;
const COMP_VALIDATION_PER_REPORT_MAX_CHARS = 8_000;
const FINAL_REPORT_TIMEOUT_MS = 120_000;
const COMPLIANCE_REVIEW_TIMEOUT_MS = 45_000;
const COMPLIANCE_REVISION_TIMEOUT_MS = 90_000;
const EXTRACTION_TIMEOUT_MS = 30_000;
const COMP_VALIDATION_HEADING_PATTERN = /\b(comparable|comparables|comp\b|comps\b|sale|sales|sold|closed|active|pending|listing|listings|competition|adjustment|market data|mls)\b/i;
const COMP_VALIDATION_LINE_PATTERN = /\b(comparable|comparables|comp\b|comps\b|sale|sales|sold|closed|active|pending|listing|listings|competition|adjustment|mls|price\/sqft)\b/i;

function resolveComplianceRevisionModel(model) {
  return isOpenAIModel(model) ? model : COMPLIANCE_REVISION_MODEL;
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  const numeric = Number.parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

export function extractValuations(content = '') {
  const valuations = {
    pointEstimate: null,
    rangeLow: null,
    rangeHigh: null
  };

  const pointPatterns = [
    /Single\s*Point\s*Estimate[:\s]*\$?([\d,]+)/i,
    /Most\s*Likely\s*(?:Market\s*)?Value[:\s]*\$?([\d,]+)/i,
    /Most\s*Probable\s*List\s*Price[:\s]*\$?([\d,]+)/i,
    /Fair\s*Market\s*Value[:\s]*\$?([\d,]+)/i,
    /Point\s*Estimate[:\s]*\$?([\d,]+)/i,
    /Estimated\s*(?:Market\s*)?Value[:\s]*\$?([\d,]+)(?!\s*[-])/i
  ];

  for (const pattern of pointPatterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      valuations.pointEstimate = parseNumber(match[1]);
      break;
    }
  }

  const rangePatterns = [
    /(?:Estimated\s*)?(?:Market\s*)?Value\s*Range[:\s]*\$?([\d,]+)\s*[\-\u2013\u2014]\s*\$?([\d,]+)/i,
    /Estimated\s*Value\s*Range[:\s]*\$?([\d,]+)\s*[\-\u2013\u2014]\s*\$?([\d,]+)/i,
    /Range[:\s]*\$?([\d,]+)\s*[\-\u2013\u2014]\s*\$?([\d,]+)/i,
    /\$?([\d,]+)\s*[\-\u2013\u2014]\s*\$?([\d,]+)/i
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

export function mergeValueRange(valuations, valueRangeOverride) {
  if (!valueRangeOverride?.rangeLow || !valueRangeOverride?.rangeHigh) {
    return valuations;
  }
  return {
    ...valuations,
    rangeLow: valueRangeOverride.rangeLow,
    rangeHigh: valueRangeOverride.rangeHigh
  };
}

function normalizeText(value, fallback = 'unknown') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function truncateText(value, maxChars) {
  const text = String(value || '').trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()}\n[Truncated to keep validation within runtime limits.]`;
}

function extractCompFocusedText(reportText) {
  const text = String(reportText || '').replace(/\r\n?/g, '\n').trim();
  if (!text) return '';

  const sections = text
    .split(/(?=^#{1,5}\s+)/m)
    .map((section) => section.trim())
    .filter(Boolean);

  const sectionMatches = sections.filter((section) => {
    const heading = section.split('\n')[0] || '';
    return COMP_VALIDATION_HEADING_PATTERN.test(heading)
      || (
        COMP_VALIDATION_LINE_PATTERN.test(section)
        && (
          /\|/.test(section)
          || /https?:\/\//i.test(section)
          || /\bMLS\b/i.test(section)
          || /\$[\d,]{3,}/.test(section)
        )
      );
  });

  if (sectionMatches.length > 0) {
    return sectionMatches.join('\n\n');
  }

  const lineMatches = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => (
      COMP_VALIDATION_LINE_PATTERN.test(line)
      || /https?:\/\//i.test(line)
      || /\bMLS\b/i.test(line)
    ));

  return lineMatches.join('\n');
}

function prepareReportsTextForValidation(reportsText) {
  const original = String(reportsText || '').trim();
  if (!original) return '';

  const reportBlocks = original
    .split(/(?=--- Report \d+ ---)/g)
    .map((block) => block.trim())
    .filter(Boolean);
  const blocks = reportBlocks.length > 0 ? reportBlocks : [original];

  const compacted = blocks.map((block, index) => {
    const headerMatch = block.match(/^--- Report \d+ ---/);
    const header = headerMatch?.[0] || `--- Report ${index + 1} ---`;
    const body = headerMatch ? block.slice(header.length).trim() : block;
    const compFocusedText = extractCompFocusedText(body);
    const selectedText = compFocusedText || body;
    return `${header}\n${truncateText(selectedText, COMP_VALIDATION_PER_REPORT_MAX_CHARS)}`;
  }).join('\n\n');

  return truncateText(compacted, COMP_VALIDATION_MAX_CHARS);
}

function normalizeSourceUrls(value) {
  const rawSources = Array.isArray(value) ? value : [value];
  const sourceText = rawSources
    .map((source) => {
      if (source && typeof source === 'object') {
        return source.url || source.href || source.link || source.sourceUrl || JSON.stringify(source);
      }
      return source;
    })
    .map((source) => String(source ?? ''))
    .join('\n');

  const urlMatches = sourceText.match(/https?:\/\/[^\s)\]}>,|"]+/gi) || [];

  return [...new Set(urlMatches.map((url) => url.trim()))];
}

function firstArrayValue(source, keys) {
  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
  }
  return [];
}

function normalizeComparableSale(record = {}) {
  const sourceUrls = normalizeSourceUrls(record.sourceUrls ?? record.sources ?? record.urls ?? record.citations);
  return {
    address: normalizeText(record.address, ''),
    saleDate: normalizeText(record.saleDate ?? record.soldDate ?? record.closeDate ?? record.date, ''),
    salePrice: normalizeText(record.salePrice ?? record.soldPrice ?? record.price, ''),
    beds: normalizeText(record.beds ?? record.bedrooms),
    baths: normalizeText(record.baths ?? record.bathrooms),
    sqft: normalizeText(record.sqft ?? record.squareFeet ?? record.livingArea),
    yearBuilt: normalizeText(record.yearBuilt),
    lotSize: normalizeText(record.lotSize ?? record.lot),
    mlsNumber: normalizeText(record.mlsNumber ?? record.mls ?? record.listingId),
    sourceUrls,
    sourceSummary: normalizeText(record.sourceSummary ?? record.sourcesSummary ?? record.sourceNames),
    notes: normalizeText(record.notes ?? record.relevance ?? record.reason)
  };
}

function normalizeActivePendingListing(record = {}) {
  const sourceUrls = normalizeSourceUrls(record.sourceUrls ?? record.sources ?? record.urls ?? record.citations);
  return {
    address: normalizeText(record.address, ''),
    status: normalizeText(record.status, ''),
    listOrPendingDate: normalizeText(record.listOrPendingDate ?? record.listDate ?? record.pendingDate ?? record.date, ''),
    listPrice: normalizeText(record.listPrice ?? record.pendingPrice ?? record.price, ''),
    beds: normalizeText(record.beds ?? record.bedrooms),
    baths: normalizeText(record.baths ?? record.bathrooms),
    sqft: normalizeText(record.sqft ?? record.squareFeet ?? record.livingArea),
    yearBuilt: normalizeText(record.yearBuilt),
    lotSize: normalizeText(record.lotSize ?? record.lot),
    mlsNumber: normalizeText(record.mlsNumber ?? record.mls ?? record.listingId),
    sourceUrls,
    sourceSummary: normalizeText(record.sourceSummary ?? record.sourcesSummary ?? record.sourceNames),
    notes: normalizeText(record.notes ?? record.relevance ?? record.reason)
  };
}

function normalizeRejectedComparable(record = {}) {
  return {
    address: normalizeText(record.address, 'Unknown address'),
    category: normalizeText(record.category ?? record.type, 'unknown'),
    reason: normalizeText(record.reason ?? record.notes ?? record.explanation, 'Verification did not meet the minimum evidence standard.'),
    sourceUrls: normalizeSourceUrls(record.sourceUrls ?? record.sources ?? record.urls ?? record.citations)
  };
}

function hasKnownValue(value) {
  const text = normalizeText(value, '').toLowerCase();
  return Boolean(text && !/^(unknown|n\/a|na|none|null|not available|unavailable|not found|not verified|unverified|not disclosed|undisclosed)$/i.test(text));
}

function isActiveOrPendingStatus(status) {
  const text = normalizeText(status, '').toLowerCase();
  if (!hasKnownValue(text)) return false;
  if (/\b(sold|closed|expired|withdrawn|cancelled|canceled|off[-\s]?market)\b/i.test(text)) return false;
  return /\b(active|for sale|pending|contingent|under contract)\b/i.test(text);
}

function hasRequiredSaleEvidence(comp) {
  return Boolean(
    hasKnownValue(comp.address)
    && hasKnownValue(comp.salePrice)
    && hasKnownValue(comp.saleDate)
    && comp.sourceUrls.length > 0
  );
}

function hasRequiredActivePendingEvidence(comp) {
  return Boolean(
    hasKnownValue(comp.address)
    && isActiveOrPendingStatus(comp.status)
    && hasKnownValue(comp.listPrice)
    && comp.sourceUrls.length > 0
  );
}

export function parseComparableValidationResponse(responseText) {
  const parsed = parseJsonObject(responseText);
  if (!parsed || Array.isArray(parsed)) {
    throw new Error('Comparable validation returned unparseable JSON.');
  }

  const verifiedComparableSales = firstArrayValue(parsed, [
    'verifiedComparableSales',
    'validatedComparableSales',
    'comparableSales',
    'closedSales',
    'sales'
  ])
    .map(normalizeComparableSale)
    .filter(hasRequiredSaleEvidence);

  const verifiedActivePendingListings = firstArrayValue(parsed, [
    'verifiedActivePendingListings',
    'validatedActivePendingListings',
    'activePendingListings',
    'activeListings',
    'pendingListings',
    'listings'
  ])
    .map(normalizeActivePendingListing)
    .filter(hasRequiredActivePendingEvidence);

  const conflictedComparables = firstArrayValue(parsed, [
    'conflictedComparables',
    'conflicts',
    'conflictingComparables'
  ]).map(normalizeRejectedComparable);

  const rejectedComparables = firstArrayValue(parsed, [
    'rejectedComparables',
    'excludedComparables',
    'unverifiedComparables',
    'rejected'
  ]).map(normalizeRejectedComparable);

  const validationNotes = Array.isArray(parsed.validationNotes)
    ? parsed.validationNotes.map((note) => normalizeText(note, '')).filter(Boolean)
    : [];

  return {
    verifiedComparableSales,
    verifiedActivePendingListings,
    conflictedComparables,
    rejectedComparables,
    validationNotes
  };
}

function countVerifiedComparables(evidence) {
  return (evidence.verifiedComparableSales?.length || 0)
    + (evidence.verifiedActivePendingListings?.length || 0);
}

function tableCell(value) {
  return normalizeText(value, '').replace(/\|/g, '/');
}

function markdownSourceLinks(sourceUrls = []) {
  if (!sourceUrls.length) return 'none';
  return sourceUrls.map((url, index) => `[Source ${index + 1}](${url})`).join(', ');
}

function formatComparableValidationEvidence(evidence) {
  const salesRows = evidence.verifiedComparableSales.map((comp) => (
    `| ${tableCell(comp.address)} | ${tableCell(comp.saleDate)} | ${tableCell(comp.salePrice)} | ${tableCell(comp.beds)} | ${tableCell(comp.baths)} | ${tableCell(comp.sqft)} | ${tableCell(comp.yearBuilt)} | ${tableCell(comp.lotSize)} | ${tableCell(comp.mlsNumber)} | ${markdownSourceLinks(comp.sourceUrls)} | ${tableCell(comp.notes)} |`
  ));

  const activeRows = evidence.verifiedActivePendingListings.map((comp) => (
    `| ${tableCell(comp.address)} | ${tableCell(comp.status)} | ${tableCell(comp.listOrPendingDate)} | ${tableCell(comp.listPrice)} | ${tableCell(comp.beds)} | ${tableCell(comp.baths)} | ${tableCell(comp.sqft)} | ${tableCell(comp.yearBuilt)} | ${tableCell(comp.lotSize)} | ${tableCell(comp.mlsNumber)} | ${markdownSourceLinks(comp.sourceUrls)} | ${tableCell(comp.notes)} |`
  ));

  const conflictedRows = evidence.conflictedComparables.map((comp) => (
    `- ${comp.address} (${comp.category}): ${comp.reason}${comp.sourceUrls.length ? ` Sources: ${comp.sourceUrls.join(', ')}` : ''}`
  ));

  const rejectedRows = evidence.rejectedComparables.map((comp) => (
    `- ${comp.address} (${comp.category}): ${comp.reason}`
  ));

  return `## Verified Comparable Sales
| Address | Sale Date | Sale Price | Beds | Baths | SqFt | Year Built | Lot Size | MLS # | Sources | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${salesRows.length ? salesRows.join('\n') : '| No verified comparable sales available |  |  |  |  |  |  |  |  |  |  |'}

## Verified Active/Pending Listings
| Address | Status | List/Pending Date | List/Pending Price | Beds | Baths | SqFt | Year Built | Lot Size | MLS # | Sources | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${activeRows.length ? activeRows.join('\n') : '| No verified active/pending listings available |  |  |  |  |  |  |  |  |  |  |  |'}

## Conflicted Comparables Not Approved for Client Tables
${conflictedRows.length ? conflictedRows.join('\n') : '- None reported.'}

## Rejected/Unverified Comparables Not Approved for Client Tables
${rejectedRows.length ? rejectedRows.join('\n') : '- None reported.'}

## Validation Notes
${evidence.validationNotes.length ? evidence.validationNotes.map((note) => `- ${note}`).join('\n') : '- All verified comps above met the minimum evidence standard.'}`;
}

export async function validateCompsAndListings({ reportsText, model, reasoningEffort, enableSearch }) {
  let lastError = null;
  const validationReportsText = prepareReportsTextForValidation(reportsText);
  const validationModel = model || COMP_VALIDATION_MODEL;

  for (let attempt = 1; attempt <= MAX_COMP_VALIDATION_ATTEMPTS; attempt += 1) {
    try {
      const result = await callGemini({
        model: validationModel,
        prompt: buildValidationPrompt(validationReportsText, {
          attempt,
          previousFailure: lastError?.message || ''
        }),
        enableSearch,
        index: attempt - 1,
        attachments: [],
        maxOutputTokens: 16384,
        temperature: 0.2,
        reasoningEffort,
        timeoutMs: COMP_VALIDATION_TIMEOUT_MS
      });

      const evidence = parseComparableValidationResponse(result.content);
      const verifiedCount = countVerifiedComparables(evidence);
      if (verifiedCount < MIN_VERIFIED_COMP_COUNT) {
        throw new Error('No comparable sales, active listings, or pending listings met the minimum verification standard.');
      }

      return {
        content: formatComparableValidationEvidence(evidence),
        evidence,
        attempts: attempt,
        model: validationModel,
        searchSuggestions: result.searchSuggestions || []
      };
    } catch (error) {
      lastError = error;
      console.warn(`Comparable validation attempt ${attempt} failed: ${error.message || error}`);
    }
  }

  throw new Error(`Comparable validation could not verify any usable comparable sales, active listings, or pending listings after ${MAX_COMP_VALIDATION_ATTEMPTS} attempts. Final report was not generated because unverified comps are blocked. Last validation error: ${lastError?.message || 'Unknown validation error'}`);
}

export async function inferValueRangeFromReport({ reportText, model, reasoningEffort }) {
  const cleanedText = String(reportText || '').replace(/\s+/g, ' ').trim();
  if (!cleanedText) return null;

  const result = await callGemini({
    model: model || COMP_VALIDATION_MODEL,
    prompt: buildValueExtractionPrompt(cleanedText),
    enableSearch: false,
    index: 0,
    attachments: [],
    maxOutputTokens: 2048,
    reasoningEffort,
    timeoutMs: EXTRACTION_TIMEOUT_MS
  });

  const responseText = (result.content || '').trim();
  if (!responseText || /unknown/i.test(responseText)) {
    return null;
  }

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let parsed = null;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (error) {
    return null;
  }

  const rangeLow = parseNumber(parsed.rangeLow ?? parsed.low ?? parsed.min);
  const rangeHigh = parseNumber(parsed.rangeHigh ?? parsed.high ?? parsed.max);
  if (!rangeLow || !rangeHigh) return null;

  return rangeLow <= rangeHigh
    ? { rangeLow, rangeHigh }
    : { rangeLow: rangeHigh, rangeHigh: rangeLow };
}

export async function inferAddressFromFinalReport({ reportText, model, reasoningEffort }) {
  const cleanedText = String(reportText || '').replace(/\s+/g, ' ').trim();
  if (!cleanedText) return null;

  const result = await callGemini({
    model: model || COMP_VALIDATION_MODEL,
    prompt: buildAddressExtractionPrompt(cleanedText),
    enableSearch: false,
    index: 0,
    attachments: [],
    maxOutputTokens: 512,
    reasoningEffort,
    timeoutMs: EXTRACTION_TIMEOUT_MS
  });

  let candidate = (result.content || '').trim().split('\n')[0]?.trim() || '';
  candidate = candidate.replace(/^[-*]\s*/, '');
  candidate = candidate.replace(/^Address\s*[:\-]\s*/i, '');
  candidate = candidate.replace(/^Subject\s*Property\s*[:\-]\s*/i, '');
  if (!candidate || /^unknown$/i.test(candidate)) {
    return null;
  }
  return candidate;
}

function parseJsonObject(responseText) {
  const cleaned = String(responseText || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (innerError) {
      return null;
    }
  }
}

function normalizeComplianceFinding(finding = {}) {
  const passage = String(finding.passage || finding.section || finding.quote || '').trim();
  const riskCategory = String(finding.riskCategory || finding.risk_category || finding.category || 'Other').trim();
  const explanation = String(finding.explanation || finding.issue || finding.reason || '').trim();

  return {
    passage: passage.slice(0, 2000),
    riskCategory: riskCategory.slice(0, 200) || 'Other',
    explanation: explanation.slice(0, 1000)
  };
}

export function parseComplianceReviewResponse(responseText) {
  const parsed = parseJsonObject(responseText);
  if (!parsed) {
    throw new Error('Compliance reviewer returned an unparseable response.');
  }

  const status = String(parsed.status || '').trim().toUpperCase();
  if (status === 'PASS') {
    return { status: 'PASS', findings: [] };
  }

  if (status !== 'NEEDS_REVISION') {
    throw new Error('Compliance reviewer returned an invalid status.');
  }

  const findings = Array.isArray(parsed.findings)
    ? parsed.findings.map(normalizeComplianceFinding).filter((finding) => (
        finding.passage && finding.riskCategory && finding.explanation
      ))
    : [];

  if (findings.length === 0) {
    throw new Error('Compliance reviewer requested revisions without structured findings.');
  }

  return { status: 'NEEDS_REVISION', findings };
}

function summarizeComplianceAttempt(review) {
  const riskCategories = [...new Set((review.findings || []).map((finding) => finding.riskCategory))];
  return {
    status: review.status,
    findingCount: review.findings?.length || 0,
    riskCategories
  };
}

function cleanMarkdownResponse(responseText) {
  const cleaned = String(responseText || '').trim();
  const fencedMatch = cleaned.match(/^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/i);
  return (fencedMatch?.[1] || cleaned).trim();
}

async function notifyProgressPhase(onProgressPhase, phase) {
  if (typeof onProgressPhase !== 'function') return;
  try {
    await onProgressPhase(phase);
  } catch (error) {
    // Progress updates are helpful, but they should not block report completion.
  }
}

export async function reviewFinalReportCompliance({
  reportText,
  reportAudience,
  model = COMPLIANCE_REVIEW_MODEL,
  reasoningEffort
}) {
  const result = await callGemini({
    model,
    prompt: buildComplianceReviewPrompt({ reportText, reportAudience }),
    enableSearch: false,
    index: 0,
    attachments: [],
    maxOutputTokens: 8192,
    reasoningEffort,
    timeoutMs: COMPLIANCE_REVIEW_TIMEOUT_MS
  });

  return {
    ...parseComplianceReviewResponse(result.content),
    model,
    reviewedAt: new Date().toISOString()
  };
}

async function reviseFinalReportForCompliance({
  reportText,
  findings,
  reportAudience,
  model = COMPLIANCE_REVISION_MODEL,
  reasoningEffort
}) {
  const result = await callGemini({
    model,
    prompt: buildComplianceRevisionPrompt({ reportText, findings, reportAudience }),
    enableSearch: false,
    index: 0,
    attachments: [],
    maxOutputTokens: 65536,
    reasoningEffort,
    timeoutMs: COMPLIANCE_REVISION_TIMEOUT_MS
  });

  const revisedReport = cleanMarkdownResponse(result.content);
  if (!revisedReport) {
    throw new Error('Compliance revision returned an empty report.');
  }
  return revisedReport;
}

export async function runFinalComplianceReview({
  reportText,
  reportAudience,
  model = COMPLIANCE_REVIEW_MODEL,
  reasoningEffort,
  onProgressPhase
}) {
  let currentReportText = String(reportText || '').trim();
  if (!currentReportText) {
    throw new Error('Final ethics and compliance review cannot run on an empty report.');
  }

  const revisionModel = resolveComplianceRevisionModel(model);
  const attempts = [];
  let revisionRounds = 0;
  for (let round = 0; round <= MAX_COMPLIANCE_REREVIEW_ROUNDS; round += 1) {
    await notifyProgressPhase(onProgressPhase, round === 0 ? 'compliance_review' : 'compliance_rereview');
    const review = await reviewFinalReportCompliance({
      reportText: currentReportText,
      reportAudience,
      model,
      reasoningEffort
    });
    attempts.push(review);

    if (review.status === 'PASS') {
      return {
        content: currentReportText,
        status: 'PASS',
        model,
        revisionModel,
        reviewedAt: review.reviewedAt,
        revisionRounds,
        attempts: attempts.map(summarizeComplianceAttempt)
      };
    }

    await notifyProgressPhase(onProgressPhase, 'compliance_revision');
    currentReportText = await reviseFinalReportForCompliance({
      reportText: currentReportText,
      findings: review.findings,
      reportAudience,
      model: revisionModel,
      reasoningEffort
    });
    revisionRounds += 1;

    if (round === MAX_COMPLIANCE_REREVIEW_ROUNDS) {
      return {
        content: currentReportText,
        status: 'AUTO_REPAIRED',
        model,
        revisionModel,
        reviewedAt: review.reviewedAt,
        repairedAt: new Date().toISOString(),
        revisionRounds,
        repairFindings: review.findings,
        attempts: attempts.map(summarizeComplianceAttempt)
      };
    }
  }

  throw new Error('Final ethics and compliance review did not complete.');
}

export async function generateMergedReport({
  successfulReports,
  reportAudience,
  model,
  reasoningEffort,
  enableSearch,
  onProgressPhase
}) {
  const reportsText = successfulReports
    .map((report, index) => `--- Report ${index + 1} ---\n${report.content}`)
    .join('\n\n');

  await notifyProgressPhase(onProgressPhase, 'validating');
  const comparableValidation = await validateCompsAndListings({
    reportsText,
    model,
    reasoningEffort,
    enableSearch
  });
  const validatedCompsContent = comparableValidation.content;

  await notifyProgressPhase(onProgressPhase, 'merging');
  const result = await callGemini({
    model,
    prompt: buildFinalReportPrompt({
      reportsText,
      validatedCompsContent,
      reportAudience
    }),
    enableSearch: false,
    index: 0,
    attachments: [],
    extraTools: [{ code_execution: {} }],
    temperature: 0.35,
    reasoningEffort,
    timeoutMs: FINAL_REPORT_TIMEOUT_MS
  });

  const complianceReview = await runFinalComplianceReview({
    reportText: result.content,
    reportAudience,
    model,
    reasoningEffort,
    onProgressPhase
  });
  const finalContent = complianceReview.content;

  const extracted = extractValuations(finalContent);
  let inferredRange = null;
  try {
    inferredRange = await inferValueRangeFromReport({
      reportText: finalContent,
      model,
      reasoningEffort
    });
  } catch (error) {
    inferredRange = null;
  }

  let inferredAddress = null;
  try {
    inferredAddress = await inferAddressFromFinalReport({
      reportText: finalContent,
      model,
      reasoningEffort
    });
  } catch (error) {
    inferredAddress = null;
  }

  return {
    content: finalContent,
    valueRange: inferredRange,
    valuations: mergeValueRange(extracted, inferredRange),
    inferredAddress,
    validatedCompsContent,
    comparableValidation: {
      attempts: comparableValidation.attempts,
      model: comparableValidation.model,
      evidence: comparableValidation.evidence,
      searchSuggestions: comparableValidation.searchSuggestions
    },
    complianceReview: {
      status: complianceReview.status,
      model: complianceReview.model,
      revisionModel: complianceReview.revisionModel,
      reviewedAt: complianceReview.reviewedAt,
      repairedAt: complianceReview.repairedAt,
      revisionRounds: complianceReview.revisionRounds,
      repairFindings: complianceReview.repairFindings,
      attempts: complianceReview.attempts
    },
    generatedAt: new Date().toISOString()
  };
}
