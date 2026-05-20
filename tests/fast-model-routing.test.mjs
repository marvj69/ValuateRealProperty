import assert from 'node:assert/strict';
import { sanitizeReportInput, getDraftModelPlan } from '../server/lib/reports.js';
import { FAST_REPORT_MODEL, SMART_REPORT_MODEL } from '../server/lib/report-models.js';
import {
  generateMergedReport,
  resolveComplianceRevisionModel
} from '../server/lib/valuation.js';

process.env.GEMINI_API_KEY = 'test-key';
delete process.env.REPORT_MODEL;

const input = sanitizeReportInput({
  propertyAddress: '123 Fast Lane, Marquette, MI',
  model: FAST_REPORT_MODEL,
  reportCount: 4,
  enableSearch: true
});

assert.equal(input.modelTier, 'fast');
assert.equal(input.model, FAST_REPORT_MODEL);
assert.equal(input.supportModel, FAST_REPORT_MODEL);
assert.deepEqual(getDraftModelPlan(input, input.reportCount), [
  FAST_REPORT_MODEL,
  FAST_REPORT_MODEL,
  FAST_REPORT_MODEL,
  FAST_REPORT_MODEL
]);
assert.equal(resolveComplianceRevisionModel(input.supportModel), FAST_REPORT_MODEL);

const calls = [];
let complianceReviews = 0;

globalThis.fetch = async (url, options = {}) => {
  const requestBody = JSON.parse(options.body || '{}');
  const prompt = requestBody.contents?.[0]?.parts?.[0]?.text || '';
  const modelMatch = String(url).match(/\/models\/([^:/?]+):generateContent/);
  const model = modelMatch?.[1] || '';
  calls.push({ model, prompt });

  let text = '';
  if (prompt.startsWith('You are a data verification specialist')) {
    text = JSON.stringify({
      verifiedComparableSales: [
        {
          address: '100 Comp St, Marquette, MI',
          saleDate: '2026-01-15',
          salePrice: '$300,000',
          beds: '3',
          baths: '2',
          sqft: '1,600',
          yearBuilt: '1990',
          lotSize: '0.25 acres',
          mlsNumber: '50123456',
          sourceUrls: ['https://example.com/comp'],
          sourceSummary: 'Example source confirmed sale details',
          notes: 'Usable nearby sale'
        }
      ],
      verifiedActivePendingListings: [],
      conflictedComparables: [],
      rejectedComparables: [],
      validationNotes: ['Mock verified comp.']
    });
  } else if (prompt.startsWith('You are a senior real estate valuation analyst')) {
    text = [
      '# Final Real Estate Valuation Report',
      '',
      'Subject property: 123 Fast Lane, Marquette, MI',
      '',
      'Estimated Market Value Range: $275,000 - $325,000',
      'Single Point Estimate: $300,000',
      'Confidence Level: Medium'
    ].join('\n');
  } else if (prompt.startsWith('You are a lightweight ethics and professional-compliance reviewer')) {
    complianceReviews += 1;
    text = JSON.stringify(
      complianceReviews === 1
        ? {
            status: 'NEEDS_REVISION',
            findings: [
              {
                passage: 'Confidence Level: Medium',
                riskCategory: 'Weak Disclaimer',
                explanation: 'Add a clear non-appraisal limitation.'
              }
            ]
          }
        : {
            status: 'PASS',
            findings: []
          }
    );
  } else if (prompt.startsWith('You are revising a client-facing real estate valuation report')) {
    text = [
      '# Final Real Estate Valuation Report',
      '',
      'Subject property: 123 Fast Lane, Marquette, MI',
      '',
      'Estimated Market Value Range: $275,000 - $325,000',
      'Single Point Estimate: $300,000',
      'Confidence Level: Medium',
      '',
      'This is not an appraisal and no physical inspection was performed.'
    ].join('\n');
  } else if (prompt.startsWith('You are a valuation range extraction assistant')) {
    text = JSON.stringify({ rangeLow: 275000, rangeHigh: 325000 });
  } else if (prompt.startsWith('You are an address extraction assistant')) {
    text = '123 Fast Lane, Marquette, MI';
  } else {
    throw new Error(`Unexpected Gemini prompt: ${prompt.slice(0, 80)}`);
  }

  return {
    ok: true,
    async json() {
      return {
        candidates: [
          {
            content: {
              parts: [{ text }]
            }
          }
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15
        }
      };
    }
  };
};

const finalReport = await generateMergedReport({
  successfulReports: [
    {
      index: 0,
      success: true,
      model: FAST_REPORT_MODEL,
      content: 'Comparable sale: 100 Comp St sold for $300,000 on 2026-01-15. Source: https://example.com/comp'
    }
  ],
  reportAudience: 'seller',
  model: input.supportModel,
  reasoningEffort: input.reasoningEffort,
  enableSearch: input.enableSearch
});

assert.equal(finalReport.comparableValidation.model, FAST_REPORT_MODEL);
assert.equal(finalReport.complianceReview.model, FAST_REPORT_MODEL);
assert.equal(finalReport.complianceReview.revisionModel, FAST_REPORT_MODEL);
assert.equal(finalReport.valueRange.rangeLow, 275000);
assert.equal(finalReport.inferredAddress, '123 Fast Lane, Marquette, MI');
assert.equal(calls.length, 7);
assert.deepEqual([...new Set(calls.map((call) => call.model))], [FAST_REPORT_MODEL]);

const smartInput = sanitizeReportInput({
  propertyAddress: '123 Smart Lane, Marquette, MI',
  model: SMART_REPORT_MODEL,
  reportCount: 4,
  enableSearch: true
});

assert.equal(smartInput.modelTier, 'smart');
assert.equal(smartInput.model, SMART_REPORT_MODEL);
assert.equal(smartInput.supportModel, SMART_REPORT_MODEL);

calls.length = 0;
complianceReviews = 0;

const smartFinalReport = await generateMergedReport({
  successfulReports: [
    {
      index: 0,
      success: true,
      model: SMART_REPORT_MODEL,
      content: 'Comparable sale: 100 Comp St sold for $300,000 on 2026-01-15. Source: https://example.com/comp'
    }
  ],
  reportAudience: 'seller',
  model: smartInput.supportModel,
  reasoningEffort: smartInput.reasoningEffort,
  enableSearch: smartInput.enableSearch
});

const smartValidationCalls = calls.filter((call) => call.prompt.startsWith('You are a data verification specialist'));
const smartMergeCalls = calls.filter((call) => call.prompt.startsWith('You are a senior real estate valuation analyst'));

assert.equal(smartFinalReport.comparableValidation.model, FAST_REPORT_MODEL);
assert.equal(smartValidationCalls.length, 1);
assert.equal(smartValidationCalls[0].model, FAST_REPORT_MODEL);
assert.equal(smartMergeCalls.length, 1);
assert.equal(smartMergeCalls[0].model, SMART_REPORT_MODEL);
assert.equal(smartFinalReport.complianceReview.model, SMART_REPORT_MODEL);

console.log(`Fast and Smart model routing verified across Gemini workflow calls.`);
