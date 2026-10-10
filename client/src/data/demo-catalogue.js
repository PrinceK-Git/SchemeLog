import { vocabularies } from './vocabularies.js';
import { catalogueMode } from './catalogue-mode.js';
import { validateAssessmentScheme } from '../domain/validation/scheme.js';
import { isObject, issue, validInstant } from '../domain/validation/common.js';
import { ENGINE_VERSION } from '../domain/validation/context.js';

const freshness = () => ({
  state: 'current',
  checkedAt: '2026-10-10',
  checkedBy: 'fictional-test-fixture',
  reviewDue: '2027-01-01',
});
const unknown = () => ({ state: 'unknown', reason: 'not-found' });
const condition = (name, text) => ({
  id: `src-demo-${name}#loc-condition`,
  label: 'Fictional test condition',
  text,
});
const testConditions = [
  condition('undergraduate', 'Undergraduate study satisfies this fictional condition.'),
  condition('postgraduate', 'Postgraduate study satisfies this fictional alternative.'),
  condition('school', 'School study satisfies this fictional condition.'),
  condition('income', 'Annual household income is at most INR 250000 for this fictional example.'),
  condition(
    'low-income',
    'Annual household income is at most INR 100000 for this fictional example.',
  ),
  condition(
    'recognition',
    'Institution recognition requires a separate check in this fictional example.',
  ),
];
const node = (id, operator, rest) => ({
  id: `r-${id}`,
  operator,
  explanationKey: `demo.${id}`,
  ...rest,
});
const level = (id, value) =>
  node(id, 'eq', { field: 'educationLevel', value, evidence: [`src-demo-${value}#loc-condition`] });
const income = (id, value) =>
  node(id, 'lte', {
    field: 'annualHouseholdIncome',
    value,
    unit: 'INR/year',
    evidence: [`src-demo-${value === 250000 ? 'income' : 'low-income'}#loc-condition`],
  });
const group = (id, operator, children) => node(id, operator, { children });

function scheme(id, officialName, rule, coverage = 'complete') {
  return {
    id: `fx-sch-${id}`,
    slug: `demo-${id}`,
    officialName,
    recordVersion: 1,
    fictional: true,
    publicationStatus: 'draft',
    summary:
      'Fictional test conditions, assumed current only for the disclosed demonstration date.',
    eligibility: {
      coverage,
      cycle: '2026-27',
      rule,
      evidence: [],
      freshness: freshness(),
      notes:
        coverage === 'unusable'
          ? 'Fictional conditions are unavailable; no personal assessment can be made.'
          : 'Assumed-current fictional test conditions; not government requirements.',
    },
    application: { cycle: '2026-27', opens: unknown(), closes: unknown(), freshness: freshness() },
    documents: [],
    links: [],
    sources: [],
    testConditions: structuredClone(testConditions),
  };
}

const learning = scheme(
  'learning-pathways',
  'Learning Pathways Demo Scholarship',
  group('learning-root', 'allOf', [
    level('learning-level', 'undergraduate'),
    income('learning-income', 250000),
  ]),
);
learning.documents.push({
  id: 'doc-income',
  type: 'income-certificate',
  title: 'Fictional income preparation task',
  requirement: 'conditional',
  appliesWhen: income('learning-document-income', 100000),
  evidence: ['src-demo-low-income#loc-condition'],
});

export const demoCatalogue = {
  mode: 'demo',
  catalogueVersion: 'demo-2026-10-10.1',
  evaluatedAt: catalogueMode.evaluatedAt,
  coverage: {
    schemeCount: 4,
    statement:
      'Four fictional scholarships demonstrate matching rules. No real scholarships have cleared independent review.',
  },
  schemes: [
    learning,
    scheme(
      'next-chapter',
      'Next Chapter Demo Grant',
      group('next-root', 'allOf', [
        group('next-alternatives', 'anyOf', [
          level('next-undergraduate', 'undergraduate'),
          level('next-postgraduate', 'postgraduate'),
        ]),
        node('next-recognition', 'manualVerification', {
          reason: 'Institution recognition is not established by ownership type.',
          checkHint: 'Check the fictional institution recognition condition separately.',
          evidence: ['src-demo-recognition#loc-condition'],
        }),
      ]),
    ),
    scheme(
      'new-horizons',
      'New Horizons Demo Award',
      group('horizons-root', 'allOf', [
        level('horizons-level', 'school'),
        income('horizons-income', 100000),
      ]),
    ),
    scheme('future-notice', 'Future Notice Demo Scholarship', null, 'unusable'),
  ],
};

export const referenceProfile = {
  profileVersion: 1,
  educationLevel: { state: 'known', value: 'undergraduate' },
  annualHouseholdIncome: {
    state: 'known',
    value: {
      min: 0,
      max: 250000,
      minInclusive: true,
      maxInclusive: true,
      currency: 'INR',
      period: 'year',
    },
  },
};

export const demoContext = {
  evaluatedAt: catalogueMode.evaluatedAt,
  catalogueVersion: demoCatalogue.catalogueVersion,
  engineVersion: ENGINE_VERSION,
  mode: 'demo',
  currentCycles: Object.fromEntries(demoCatalogue.schemes.map((record) => [record.id, '2026-27'])),
};

/** Explicit fixture entry point; never relax the real publication validator. */
export function validateDemoCatalogue(catalogue, { vocab = vocabularies } = {}) {
  const errors = [];
  if (
    !isObject(catalogue) ||
    catalogue.mode !== 'demo' ||
    !Array.isArray(catalogue.schemes) ||
    typeof catalogue.catalogueVersion !== 'string' ||
    !catalogue.catalogueVersion.startsWith('demo-') ||
    !validInstant(catalogue.evaluatedAt) ||
    !isObject(catalogue.coverage) ||
    catalogue.coverage.schemeCount !== catalogue.schemes.length ||
    typeof catalogue.coverage.statement !== 'string'
  )
    return {
      ok: false,
      errors: [issue('catalogue', 'demo-envelope', 'Invalid explicit demo catalogue.')],
    };
  const ids = new Set();
  const slugs = new Set();
  for (const record of catalogue.schemes) {
    errors.push(...validateAssessmentScheme(record, { mode: 'demo', vocab }));
    if (ids.has(record?.id) || slugs.has(record?.slug))
      errors.push(issue('schemes', 'duplicate-id', 'Demo scheme IDs and slugs must be unique.'));
    ids.add(record?.id);
    slugs.add(record?.slug);
  }
  return { ok: errors.length === 0, errors };
}
