export const FAST_REPORT_MODEL = 'gemini-flash-lite-latest';
export const SMART_REPORT_MODEL = 'gemini-3-flash-preview';
export const EXPERIMENTAL_REPORT_MODEL = 'experimental';
export const OPENAI_EXPERIMENTAL_REPORT_MODEL = 'gpt-5.5';
export const OPENAI_EXPERIMENTAL_REASONING_EFFORT = 'medium';
export const DEFAULT_REPORT_MODEL = FAST_REPORT_MODEL;

const LEGACY_REPORT_MODEL_ALIASES = Object.freeze({
  'gemini-3.5-flash': SMART_REPORT_MODEL,
  'gemini-flash-latest': SMART_REPORT_MODEL
});

const EXPERIMENTAL_DRAFT_COUNT = 6;
const EXPERIMENTAL_DRAFT_MODELS = Object.freeze(
  Array.from({ length: EXPERIMENTAL_DRAFT_COUNT }, () => OPENAI_EXPERIMENTAL_REPORT_MODEL)
);

export const REPORT_MODEL_OPTIONS = Object.freeze([
  Object.freeze({
    tier: 'fast',
    label: 'Fast',
    provider: 'gemini',
    model: FAST_REPORT_MODEL,
    supportModel: FAST_REPORT_MODEL
  }),
  Object.freeze({
    tier: 'smart',
    label: 'Smart',
    provider: 'gemini',
    model: SMART_REPORT_MODEL,
    supportModel: SMART_REPORT_MODEL
  }),
  Object.freeze({
    tier: 'experimental',
    label: 'Experimental',
    provider: 'openai',
    model: EXPERIMENTAL_REPORT_MODEL,
    supportModel: OPENAI_EXPERIMENTAL_REPORT_MODEL,
    reasoningEffort: OPENAI_EXPERIMENTAL_REASONING_EFFORT,
    reportCount: EXPERIMENTAL_DRAFT_MODELS.length,
    draftConcurrency: EXPERIMENTAL_DRAFT_COUNT,
    draftModels: EXPERIMENTAL_DRAFT_MODELS
  })
]);

const REPORT_MODEL_BY_NAME = Object.freeze(
  REPORT_MODEL_OPTIONS.reduce((models, option) => {
    models[option.model] = option;
    return models;
  }, {})
);

export function normalizeReportModelName(model = DEFAULT_REPORT_MODEL) {
  const normalized = String(model || DEFAULT_REPORT_MODEL).trim().replace(/^models\//i, '');
  return LEGACY_REPORT_MODEL_ALIASES[normalized] || normalized;
}

export function getReportModelSelection(model = DEFAULT_REPORT_MODEL) {
  const normalized = normalizeReportModelName(model);
  const option = REPORT_MODEL_BY_NAME[normalized];
  return option
    ? {
        tier: option.tier,
        label: option.label,
        provider: option.provider || null,
        model: option.model,
        supportModel: option.supportModel || option.model,
        reasoningEffort: option.reasoningEffort || null,
        reportCount: option.reportCount || null,
        draftConcurrency: option.draftConcurrency || null,
        draftModels: option.draftModels ? [...option.draftModels] : null
      }
    : null;
}

export function getAllowedReportModels() {
  return REPORT_MODEL_OPTIONS.map((option) => option.model);
}
