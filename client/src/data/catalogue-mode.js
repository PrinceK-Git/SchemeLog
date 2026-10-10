export const catalogueMode = Object.freeze({
  mode: 'demo',
  evaluatedAt: '2026-10-10T12:00:00+05:30',
  disclosure:
    'Interactive prototype. These scholarships are fictional. Your answers drive a demonstration of the matching rules; this is not an assessment for a real government scheme.',
  dateDisclosure: 'Demo rules evaluated as of 10 October 2026.',
});

// Phase 4 must choose a loader from this mode, not catch a reviewed-load error and load demo data.
export function selectCatalogueMode(mode) {
  if (!['demo', 'reviewed'].includes(mode))
    throw new TypeError('Select demo or reviewed explicitly.');
  return mode;
}
