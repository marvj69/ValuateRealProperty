// Persisted workflow choices, distinct from the model sent to the provider.
export const FAST_REPORT_MODEL = 'fast';
export const SMART_REPORT_MODEL = 'smart';
export const META_REPORT_MODEL = 'muse-spark-1.3-contributor';
export const DEFAULT_REPORT_MODEL = FAST_REPORT_MODEL;

export function getReportStageReasoningEffort(stage) {
  return stage === 'draft' || stage === 'final_merge' ? 'high' : 'medium';
}

const LEGACY_REPORT_MODEL_ALIASES = Object.freeze({
  'muse-spark-1.3-contributor': FAST_REPORT_MODEL,
  'gemini-flash-lite-latest': FAST_REPORT_MODEL,
  'gemini-3.1-flash-lite': FAST_REPORT_MODEL,
  'gemini-3-flash-preview': SMART_REPORT_MODEL,
  'gemini-3.5-flash': SMART_REPORT_MODEL,
  'gemini-flash-latest': SMART_REPORT_MODEL
});

export const REPORT_MODEL_OPTIONS = Object.freeze([
  Object.freeze({
    tier: 'fast',
    label: 'Fast',
    provider: 'meta',
    model: FAST_REPORT_MODEL,
    supportModel: META_REPORT_MODEL,
    reasoningEffort: getReportStageReasoningEffort('draft'),
    draftConcurrency: 3
  }),
  Object.freeze({
    tier: 'smart',
    label: 'Smart',
    provider: 'meta',
    model: SMART_REPORT_MODEL,
    supportModel: META_REPORT_MODEL,
    reasoningEffort: getReportStageReasoningEffort('draft'),
    draftConcurrency: 3
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
