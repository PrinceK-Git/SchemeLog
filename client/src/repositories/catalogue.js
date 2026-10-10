import { catalogueMode, selectCatalogueMode } from '../data/catalogue-mode.js';
import { vocabularies } from '../data/vocabularies.js';
import { demoCatalogue, validateDemoCatalogue } from '../data/demo-catalogue.js';
import reviewedCatalogue from '../data/catalogue.json' with { type: 'json' };
import { validateAssessmentScheme } from '../domain/validation/scheme.js';
import {
  safeText,
  validateCatalogueEnvelope,
  validatePresentationScheme,
} from '../domain/validation/catalogue.js';
import { assertValid, issue } from '../domain/validation/common.js';

const defaultLoaders = {
  demo: async () => demoCatalogue,
  reviewed: async () => reviewedCatalogue,
};
const freeze = (value) => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export function getScheme(slug, catalogueSnapshot) {
  const catalogue = catalogueSnapshot?.catalogue ?? catalogueSnapshot;
  return catalogue?.schemes?.find((record) => record.slug === slug) ?? null;
}

/** Injection controls loading only, never mode fallback or publication authorization. */
export function createCatalogueRepository({ mode = catalogueMode.mode, loaders = {} } = {}) {
  selectCatalogueMode(mode);
  const loader = loaders[mode] ?? defaultLoaders[mode];
  if (typeof loader !== 'function') throw new TypeError('A selected-mode loader is required.');
  return {
    async getCatalogue() {
      const catalogue = structuredClone(await loader());
      const report =
        mode === 'demo' ? validateDemoCatalogue(catalogue) : validateCatalogueEnvelope(catalogue);
      assertValid('catalogue', report.errors);
      if (mode === 'demo')
        assertValid(
          'catalogue',
          safeText(catalogue.coverage.statement) &&
            catalogue.coverage.statement.trim() &&
            Object.keys(catalogue).every((key) =>
              ['mode', 'catalogueVersion', 'evaluatedAt', 'coverage', 'schemes'].includes(key),
            ) &&
            Object.keys(catalogue.coverage).every((key) =>
              ['statement', 'schemeCount'].includes(key),
            )
            ? []
            : [issue('coverage', 'presentation-shape', 'Invalid fictional coverage metadata.')],
        );
      for (const record of catalogue.schemes) {
        assertValid('catalogue', validateAssessmentScheme(record, { mode, vocab: vocabularies }));
        assertValid('catalogue', validatePresentationScheme(record, { mode }));
      }
      return freeze({
        mode,
        catalogue,
        coverage: catalogue.coverage,
        quarantined: catalogue.coverage.quarantined ?? [],
      });
    },
    getScheme,
  };
}

const repository = createCatalogueRepository();
export const getCatalogue = () => repository.getCatalogue();
