import test from 'node:test';
import assert from 'node:assert/strict';
import { demoCatalogue } from '../../src/data/demo-catalogue.js';
import { vocabularies as vocab } from '../../src/data/vocabularies.js';
import { buildQuestionPlan } from '../../src/domain/profile/question-plan.js';
import { normalizeProfile } from '../../src/domain/profile/normalize.js';
import { compareInterval } from '../../src/domain/eligibility/interval.js';
import { leaf, interval } from '../helpers/catalogue.js';

const catalogue = (rule, documents = []) => ({
  catalogueVersion: 'test-questions',
  schemes: [{ eligibility: { rule }, documents }],
});
const income = (value, patch = {}) =>
  leaf({ field: 'annualHouseholdIncome', operator: 'lte', value, unit: 'INR/year', ...patch });
const plan = (input) => buildQuestionPlan(input, { vocab });

test('demo plan is minimal, stable and collects document thresholds without mutating data', () => {
  const original = structuredClone(demoCatalogue);
  const result = plan(demoCatalogue);
  assert.deepEqual(result.requiredProfileFields, [
    'educationLevel',
    'domicileState',
    'annualHouseholdIncome',
    'category',
  ]);
  assert.deepEqual(result.draftFieldIds, ['educationLevel', 'domicile', 'income', 'category']);
  assert.deepEqual(
    result.incomeBands.map((band) => band.value),
    [interval(0, 100000), interval(100000, 250000, false), interval(250000, null, false)],
  );
  assert.deepEqual(plan(demoCatalogue), result);
  assert.deepEqual(demoCatalogue, original);
  assert.match(result.incomeBands[0].label, /^Up to/);
  assert.match(result.incomeBands[1].label, /^Above/);
});

test('nested alternatives and exclusions discover fields and deterministic companion closure', () => {
  const input = catalogue(
    {
      id: 'r-root',
      operator: 'anyOf',
      explanationKey: 'test',
      children: [
        {
          id: 'r-not',
          operator: 'not',
          explanationKey: 'test',
          child: leaf({ id: 'r-course', field: 'courseCode', value: 'ug-btech' }),
        },
        leaf({ id: 'r-year', field: 'studyYear', operator: 'gte', value: 2, unit: 'course-year' }),
        leaf({
          id: 'r-score',
          field: 'academicScore',
          operator: 'gte',
          value: 80,
          scale: 'percentage',
          context: 'previous-year',
        }),
        leaf({ id: 'r-extra', field: 'additionalAnswers.receivesOtherScholarship', value: 'no' }),
      ],
    },
    [{ appliesWhen: leaf({ id: 'r-state', field: 'domicileState', value: 'IN-AS' }) }],
  );
  const result = plan(input);
  assert.deepEqual(result.requiredProfileFields, [
    'courseCode',
    'studyYear',
    'domicileState',
    'academicScore',
    'additionalAnswers.receivesOtherScholarship',
  ]);
  assert.deepEqual(result.draftFieldIds, [
    'educationLevel',
    'course',
    'studyYear',
    'courseDuration',
    'domicile',
    'scoreType',
    'scoreScale',
    'score',
    'scoreContext',
    'additionalAnswers.receivesOtherScholarship',
  ]);
  assert.deepEqual(result.incomeBands, []);
  assert.throws(() => plan(catalogue(leaf({ field: 'undeclared' }))));
});

test('manual text cannot justify extra collection, and empty catalogues have no questions', () => {
  const manual = {
    id: 'r-manual',
    operator: 'manualVerification',
    reason: 'Check institution recognition',
    checkHint: 'Ask the institution',
    explanationKey: 'test',
  };
  assert.deepEqual(plan(catalogue(manual)).draftFieldIds, []);
  assert.deepEqual(plan({ catalogueVersion: 'empty', schemes: [] }).incomeBands, []);
});

test('zero-only boundaries, duplicate edges and open tail partition income exactly once', () => {
  const root = {
    id: 'r-root',
    operator: 'allOf',
    explanationKey: 'test',
    children: [
      income(0, { id: 'r-zero' }),
      income(10, { id: 'r-ten' }),
      income(10, { id: 'r-duplicate' }),
    ],
  };
  const bands = plan(catalogue(root)).incomeBands;
  assert.deepEqual(
    bands.map((band) => band.value),
    [interval(0, 0), interval(0, 10, false), interval(10, null, false)],
  );
  assert.equal(new Set(bands.map((band) => band.id)).size, bands.length);
  for (const value of [0, 0.0001, 1, 9.99, 10, 10.001, 1e12]) {
    const matches = bands.filter(
      ({ value: band }) =>
        (value > band.min || (band.minInclusive && value === band.min)) &&
        (band.max === null || value < band.max || (band.maxInclusive && value === band.max)),
    );
    assert.equal(matches.length, 1, String(value));
  }
  assert.equal(compareInterval(bands[0].value, income(0)), 'pass');
});

test('between bounds and document-only boundaries are included while unsupported equality stays invalid', () => {
  const between = leaf({
    field: 'annualHouseholdIncome',
    operator: 'between',
    unit: 'INR/year',
    min: 100,
    max: 200,
    minInclusive: true,
    maxInclusive: false,
  });
  delete between.value;
  const result = plan(catalogue(null, [{ appliesWhen: between }]));
  assert.deepEqual(
    result.incomeBands.map((band) => band.value.max),
    [100, 200, null],
  );
  assert.deepEqual(result.draftFieldIds, ['income']);
  assert.throws(() => plan(catalogue(income(100, { operator: 'eq' }))));
});

test('no nonnegative boundaries includes zero; no income reference means no bands', () => {
  const result = plan(catalogue(income(-1)));
  assert.deepEqual(
    result.incomeBands.map((band) => band.value),
    [interval(0, null)],
  );
  assert.deepEqual(plan(catalogue(leaf())).incomeBands, []);
});

test('fractional income boundary labels do not round away validated values', () => {
  const result = plan(catalogue(income(0.0001)));
  assert.match(result.incomeBands[0].label, /₹0\.0001/);
  assert.equal(result.incomeBands[0].value.max, 0.0001);
});

test('normalization uses the plan interval unchanged and strict-boundary overlap stays unknown', () => {
  const input = catalogue(income(100, { operator: 'lt' }));
  const result = plan(input);
  const normalized = normalizeProfile(
    { income: result.incomeBands[0].id },
    { askedFields: ['income'], incomeBands: result.incomeBands, vocab },
  );
  assert.equal(normalized.ok, true);
  assert.deepEqual(normalized.profile.annualHouseholdIncome.value, interval(0, 100));
  assert.equal(
    compareInterval(
      normalized.profile.annualHouseholdIncome.value,
      input.schemes[0].eligibility.rule,
    ),
    'unknown',
  );
  assert.equal(
    compareInterval(result.incomeBands[1].value, input.schemes[0].eligibility.rule),
    'fail',
  );
});
