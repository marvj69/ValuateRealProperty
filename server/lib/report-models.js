export const FAST_REPORT_MODEL = 'gemini-flash-lite-latest';
export const SMART_REPORT_MODEL = 'gemini-3-flash-preview';
export const DEFAULT_REPORT_MODEL = FAST_REPORT_MODEL;

const LEGACY_REPORT_MODEL_ALIASES = Object.freeze({
  'gemini-3.5-flash': SMART_REPORT_MODEL,
  'gemini-flash-latest': SMART_REPORT_MODEL
});

export const REPORT_MODEL_OPTIONS = Object.freeze([
  Object.freeze({
    tier: 'fast',
    label: 'Fast',
    model: FAST_REPORT_MODEL
  }),
  Object.freeze({
    tier: 'smart',
    label: 'Smart',
    model: SMART_REPORT_MODEL
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
        model: option.model
      }
    : null;
}

export function getAllowedReportModels() {
  return REPORT_MODEL_OPTIONS.map((option) => option.model);
}
