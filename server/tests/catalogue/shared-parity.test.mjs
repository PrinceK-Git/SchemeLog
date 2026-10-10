import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validateProfile as serverProfile } from '../../src/domain/validation/validateProfile.js';
import { validateCatalogue } from '../../src/domain/validation/validateCatalogue.js';
import { loadVocabularies } from '../../src/domain/validation/vocab.js';
import { validateProfile } from '../../../client/src/domain/validation/profile.js';
import { validateRule } from '../../../client/src/domain/validation/rules.js';
import { vocabularies } from '../../../client/src/data/vocabularies.js';
import * as clientFields from '../../../client/src/domain/profile/fields.js';
import * as serverFields from '../../src/data/question-fields.js';

const vocab = loadVocabularies();
const known = (value) => ({ state: 'known', value });
const leaf = (patch = {}) => ({
  id: 'r-parity',
  operator: 'eq',
  field: 'educationLevel',
  value: 'school',
  explanationKey: 'test.rule',
  ...patch,
});
const base = JSON.parse(
  readFileSync(new URL('../../src/data/schemes/sch-nmmss.json', import.meta.url), 'utf8'),
);

test('server and browser share field declarations and vocabulary codes', () => {
  for (const key of [
    'PROFILE_FIELDS',
    'ADDITIONAL_FIELDS',
    'ANSWER_STATES',
    'FORBIDDEN_FIELDS',
    'isDeclaredField',
  ])
    assert.equal(serverFields[key], clientFields[key]);
  assert.deepEqual(vocab.codes, vocabularies.codes);
});

test('server wrapper and browser validator have exact valid/invalid profile parity', () => {
  for (const profile of [
    null,
    [],
    {},
    { profileVersion: 1 },
    { profileVersion: 2 },
    { profileVersion: 1, domicileState: known('IN-AS') },
    { profileVersion: 1, domicileState: known('Assam') },
    { profileVersion: 1, category: { state: 'declined' } },
    { profileVersion: 1, category: { state: 'unsure', value: 'sc' } },
    {
      profileVersion: 1,
      annualHouseholdIncome: known({
        min: 0,
        max: null,
        minInclusive: true,
        maxInclusive: true,
        currency: 'INR',
        period: 'year',
      }),
    },
    {
      profileVersion: 1,
      academicScore: known({
        value: 80,
        scale: 'percentage',
        context: 'previous-year',
        phone: 'private',
      }),
    },
    { profileVersion: 1, additionalAnswers: { receivesOtherScholarship: known('no') } },
  ])
    assert.deepEqual(serverProfile(profile), validateProfile(profile, { vocab: vocabularies }));
});

test('shared rule validator rejects operator-specific operands and checks every node property', () => {
  const invalid = [
    null,
    [],
    {},
    leaf({ operator: 'invented' }),
    leaf({ id: 'bad' }),
    leaf({ explanationKey: '' }),
    leaf({ value: 1 }),
    leaf({ evidence: ['not-a-reference'] }),
    leaf({ material: 'yes' }),
    leaf({ children: [leaf({ id: 'r-hidden' })] }),
    leaf({ scale: 'percentage' }),
    leaf({ operator: 'in', value: [] }),
    leaf({ field: 'email' }),
    leaf({ field: 'additionalAnswers.toString' }),
    leaf({ evidence: new Array(1) }),
    { id: 'r-sparse', operator: 'allOf', explanationKey: 'test', children: new Array(2) },
    leaf({ operator: 'lt', field: 'annualHouseholdIncome', value: Infinity, unit: 'INR/year' }),
    leaf({ operator: 'lt', field: 'studyYear', value: 2 }),
    leaf({ operator: 'lte', field: 'academicScore', value: 80 }),
    leaf({
      operator: 'lte',
      field: 'academicScore',
      value: 80,
      scale: 'cgpa',
      context: 'previous-year',
    }),
    leaf({ freshness: { state: 'current', checkedAt: '2026-02-30', checkedBy: 'test' } }),
    leaf({
      freshness: { state: 'unknown', checkedAt: '2026-10-10', checkedBy: 'test', secret: true },
    }),
    { id: 'r-group', operator: 'allOf', explanationKey: 'test', children: [leaf()] },
    {
      id: 'r-manual',
      operator: 'manualVerification',
      explanationKey: 'test',
      reason: ' ',
      checkHint: 'Check',
    },
    {
      id: 'r-manual',
      operator: 'manualVerification',
      explanationKey: 'test',
      reason: 'Check',
      checkHint: 'Check',
      field: 'category',
    },
    {
      id: 'r-between',
      operator: 'between',
      field: 'annualHouseholdIncome',
      min: 10,
      max: 10,
      minInclusive: true,
      maxInclusive: false,
      unit: 'INR/year',
      explanationKey: 'test',
    },
  ];
  for (const rule of invalid)
    assert.equal(validateRule(rule, { vocab }).ok, false, JSON.stringify(rule));
  const cyclic = { id: 'r-cycle', operator: 'not', explanationKey: 'test' };
  cyclic.child = cyclic;
  assert.equal(validateRule(cyclic, { vocab }).ok, false);
});

test('whole-tree and cross-tree identifier checks cannot be hidden by a passing alternative', () => {
  const rule = {
    id: 'r-any',
    operator: 'anyOf',
    explanationKey: 'test',
    children: [leaf(), leaf({ id: 'r-invalid', operator: 'invented' })],
  };
  assert.ok(
    validateRule(rule, { vocab }).errors.some((error) => error.code === 'unknown-operator'),
  );
  const seenIds = new Set();
  assert.equal(validateRule(leaf(), { vocab, seenIds }).ok, true);
  assert.ok(
    validateRule(leaf(), { vocab, seenIds, path: 'documents[0].appliesWhen' }).errors.some(
      (error) => error.code === 'duplicate-id',
    ),
  );
  for (const unit of ['course-year', 'school-class'])
    assert.equal(
      validateRule(leaf({ operator: 'lte', field: 'studyYear', value: 2, unit }), { vocab }).ok,
      true,
    );
});

test('catalogue semantic findings preserve the shared rule check codes', () => {
  const cases = [
    leaf({ field: 'undeclared' }),
    leaf({ value: 'invented' }),
    leaf({ operator: 'in', value: [] }),
    leaf({ operator: 'lt', field: 'studyYear', value: 2 }),
    leaf({ operator: 'lt', field: 'annualHouseholdIncome', value: 100 }),
    leaf({ operator: 'lte', field: 'academicScore', value: 80 }),
    leaf({ child: leaf({ id: 'r-unexpected' }) }),
  ];
  for (const rule of cases) {
    const record = structuredClone(base);
    record.eligibility.rule = rule;
    const result = validateCatalogue([record], { evaluatedAt: '2026-10-10' });
    const issues = validateRule(rule, { vocab, path: 'eligibility.rule' }).errors;
    for (const issue of issues)
      assert.ok(
        result.rejects.some(
          (finding) => finding.check === issue.code && finding.path === issue.path,
        ),
        JSON.stringify(issue),
      );
  }
});

test('checked-in drafts are inspected without silent semantic repairs', () => {
  const directory = new URL('../../src/data/schemes/', import.meta.url);
  const records = readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(new URL(file, directory), 'utf8')));
  const originals = structuredClone(records);
  const report = validateCatalogue(records, { evaluatedAt: '2026-10-10' });
  assert.deepEqual(report.rejects, []);
  assert.deepEqual(report.publishable, []);
  assert.deepEqual(records, originals);
});

test('server review-due warning uses the same inclusive day boundary as the engine', () => {
  const record = structuredClone(base);
  record.eligibility.freshness.reviewDue = '2026-10-10';
  for (const [evaluatedAt, expected] of [
    ['2026-10-09', false],
    ['2026-10-10', true],
    ['2026-10-11', true],
  ]) {
    const report = validateCatalogue([record], { evaluatedAt });
    assert.equal(
      report.warnings.some(
        (finding) =>
          finding.check === 'review-due-passed' &&
          finding.path === 'eligibility.freshness.reviewDue',
      ),
      expected,
    );
  }
});
