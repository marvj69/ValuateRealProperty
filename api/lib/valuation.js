import {
  buildAddressExtractionPrompt,
  buildFinalReportPrompt,
  buildValidationPrompt,
  buildValueExtractionPrompt
} from './prompts.js';
import { callGemini } from './gemini.js';

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

export async function validateCompsAndListings({ reportsText, model, enableSearch }) {
  const result = await callGemini({
    model,
    prompt: buildValidationPrompt(reportsText),
    enableSearch,
    index: 0,
    attachments: []
  });
  return result.content;
}

export async function inferValueRangeFromReport({ reportText, model }) {
  const cleanedText = String(reportText || '').replace(/\s+/g, ' ').trim();
  if (!cleanedText) return null;

  const result = await callGemini({
    model: 'gemini-flash-lite-latest',
    prompt: buildValueExtractionPrompt(cleanedText),
    enableSearch: false,
    index: 0,
    attachments: [],
    maxOutputTokens: 2048
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

export async function inferAddressFromFinalReport({ reportText, model }) {
  const cleanedText = String(reportText || '').replace(/\s+/g, ' ').trim();
  if (!cleanedText) return null;

  const result = await callGemini({
    model: 'gemini-flash-lite-latest',
    prompt: buildAddressExtractionPrompt(cleanedText),
    enableSearch: false,
    index: 0,
    attachments: [],
    maxOutputTokens: 512
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

export async function generateMergedReport({ successfulReports, reportAudience, model, enableSearch }) {
  const reportsText = successfulReports
    .map((report, index) => `--- Report ${index + 1} ---\n${report.content}`)
    .join('\n\n');

  let validatedCompsContent = 'Validation step unavailable.';
  try {
    validatedCompsContent = await validateCompsAndListings({
      reportsText,
      model,
      enableSearch
    });
  } catch (error) {
    validatedCompsContent = `Validation step failed: ${error.message}. Proceed with caution and note that comps were not independently verified.`;
  }

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
    extraTools: [{ code_execution: {} }]
  });

  const extracted = extractValuations(result.content);
  let inferredRange = null;
  try {
    inferredRange = await inferValueRangeFromReport({
      reportText: result.content,
      model
    });
  } catch (error) {
    inferredRange = null;
  }

  let inferredAddress = null;
  try {
    inferredAddress = await inferAddressFromFinalReport({
      reportText: result.content,
      model
    });
  } catch (error) {
    inferredAddress = null;
  }

  return {
    content: result.content,
    valueRange: inferredRange,
    valuations: mergeValueRange(extracted, inferredRange),
    inferredAddress,
    validatedCompsContent,
    generatedAt: new Date().toISOString()
  };
}
