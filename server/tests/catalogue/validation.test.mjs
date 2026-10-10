import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  validateCatalogue,
  validateRegistry,
} from '../../src/domain/validation/validateCatalogue.js';
import { validateProfile } from '../../src/domain/validation/validateProfile.js';

const dataDir = new URL('../../src/data/schemes/', import.meta.url);
const base = JSON.parse(readFileSync(new URL('sch-nmmss.json', dataDir), 'utf8'));
const options = { evaluatedAt: '2026-10-10' };
function fixture() {
  const record = structuredClone(base);
  record.id = 'fx-sch-validation';
  record.slug = 'fixture-validation';
  record.publicationStatus = 'draft';
  record.verification.curatedBy = 'test-curator';
  record.verification.reviewedBy = null;
  record.verification.reviewedAt = null;
  return record;
}
// Publication tests are isolated in-memory copies, never approvals in real data.
function publicationCandidate() {
  const record = fixture();
  record.id = 'sch-validation-test-only';
  record.publicationStatus = 'published';
  record.verification.reviewedBy = 'test-independent-reviewer';
  record.verification.reviewedAt = '2026-10-10';
  record.links[0].status = 'verified';
  return record;
}
const report = (record, extra = {}) => validateCatalogue([record], { ...options, ...extra });
const known = (value) => ({ state: 'known', value });
const profile = (field, value) => ({ profileVersion: 1, [field]: known(value) });
const income = {
  min: 0,
  max: 100,
  minInclusive: true,
  maxInclusive: true,
  currency: 'INR',
  period: 'year',
};
const dateValue = (value, precision = 'date') => ({
  value,
  precision,
  checkedAt: '2026-10-10',
  evidence: [base.sources[0].id],
});

test('real records remain structurally valid as unreviewed drafts with unknown freshness', () => {
  const records = readdirSync(dataDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const record = JSON.parse(readFileSync(new URL(name, dataDir), 'utf8'));
      record.publicationStatus = 'draft';
      record.verification.reviewedBy = null;
      record.verification.reviewedAt = null;
      record.eligibility.freshness.state = 'unknown';
      record.application.freshness.state = 'unknown';
      for (const benefit of record.benefits) benefit.freshness.state = 'unknown';
      return record;
    });
  const result = validateCatalogue(records, options);
  assert.deepEqual(result.rejects, []);
  assert.deepEqual(result.publishable, []);
});

test('draft fixtures are accepted but fixture publication is rejected', () => {
  const record = fixture();
  assert.deepEqual(report(record).rejects, []);
  record.publicationStatus = 'published';
  assert.ok(report(record).rejects.some((f) => f.check === 'fixture-in-catalogue'));
  assert.equal(report(record).publishable.length, 0);
});

test('only an independent, dated reviewer passes the publication review gate', () => {
  const record = publicationCandidate();
  assert.deepEqual(report(record).rejects, []);
  assert.equal(report(record).publishable.length, 1);
  for (const reviewer of [
    null,
    'pending',
    'unknown',
    'ai-assisted-research',
    'test-curator',
    ' TEST-CURATOR ',
  ]) {
    record.verification.reviewedBy = reviewer;
    const result = report(record);
    assert.equal(result.publishable.length, 0, String(reviewer));
    assert.ok(result.quarantines.some((f) => f.check === 'no-second-review'));
  }
  record.verification.reviewedBy = 'test-independent-reviewer';
  record.verification.reviewedAt = null;
  assert.equal(report(record).publishable.length, 0);
  record.verification.reviewedBy = '   ';
  assert.ok(report(record).rejects.length > 0);
});

test('self-review warns and quarantines, or rejects in strict review mode', () => {
  const record = publicationCandidate();
  record.verification.reviewedBy = record.verification.curatedBy;
  assert.ok(report(record).warnings.some((f) => f.check === 'self-review'));
  assert.ok(report(record, { strictReview: true }).rejects.some((f) => f.check === 'self-review'));
});

test('all material leaves default to requiring evidence, including manual and nested not rules', () => {
  for (const operator of ['eq', 'manualVerification']) {
    const record = publicationCandidate();
    const leaf =
      operator === 'eq'
        ? {
            id: 'r-test-leaf',
            operator,
            field: 'educationLevel',
            value: 'school',
            explanationKey: 'test.leaf',
          }
        : {
            id: 'r-test-leaf',
            operator,
            reason: 'Needs review',
            checkHint: 'Check official guidance',
            explanationKey: 'test.leaf',
          };
    record.eligibility.rule = {
      id: 'r-test-not',
      operator: 'not',
      child: leaf,
      explanationKey: 'test.not',
    };
    assert.ok(
      report(record).quarantines.some(
        (f) => f.check === 'missing-evidence' && f.path.endsWith('.child.evidence'),
      ),
    );
    assert.equal(report(record).publishable.length, 0);
    leaf.material = false;
    assert.equal(report(record).publishable.length, 1);
    leaf.material = true;
    leaf.evidence = ['src-does-not-exist'];
    assert.ok(report(record).quarantines.some((f) => f.check === 'dangling-evidence'));
    leaf.evidence = [record.sources[0].id];
    assert.equal(report(record).publishable.length, 1);
  }
});

test('conditional documents require a rule, and other requirements require null', () => {
  const record = fixture();
  const document = record.documents[0];
  document.requirement = 'conditional';
  document.appliesWhen = null;
  assert.ok(report(record).rejects.length > 0);
  document.appliesWhen = {
    id: 'r-doc-test',
    operator: 'eq',
    field: 'educationLevel',
    value: 'school',
    explanationKey: 'test.doc',
    evidence: [record.sources[0].id],
  };
  assert.deepEqual(report(record).rejects, []);
  delete document.appliesWhen.evidence;
  assert.ok(report(record).quarantines.some((f) => f.path === 'documents[0].appliesWhen.evidence'));
  document.requirement = 'confirmed';
  assert.ok(report(record).rejects.length > 0);
});

test('application dates validate calendar dates and datetime precision', () => {
  for (const [value, precision] of [
    ['2026-02-30', 'date'],
    ['not-a-date', 'date'],
    ['2026-13-01', 'date'],
    ['2026-10-10', 'datetime'],
    ['2026-10-10T12:00:00Z', 'date'],
    ['2026-10-10T25:00:00Z', 'datetime'],
  ]) {
    const record = fixture();
    record.application.opens = dateValue(value, precision);
    assert.ok(report(record).rejects.length > 0, value);
  }
  const record = fixture();
  record.application.opens = dateValue('2024-02-29');
  assert.deepEqual(report(record).rejects, []);
  record.application.opens = dateValue('2026-10-10T01:00:00+05:30', 'datetime');
  record.application.closes = dateValue('2026-10-09T21:00:00Z', 'datetime');
  assert.equal(
    report(record).quarantines.some((f) => f.check === 'date-order'),
    false,
  );
  record.application.closes = dateValue('2026-10-09T18:00:00Z', 'datetime');
  assert.ok(report(record).quarantines.some((f) => f.check === 'date-order'));
});

test('malformed catalogue inputs return the existing report shape without throwing', () => {
  for (const input of [null, undefined, {}, 'bad', [null], [[]], [{}]]) {
    const result = validateCatalogue(input, options);
    assert.equal(result.ok, false);
    assert.ok(result.rejects.length > 0);
    assert.deepEqual(result.publishable, []);
  }
});

test('HTML is rejected even in schema-unconstrained string fields', () => {
  const record = fixture();
  record.verification.notesPath = '<script>alert(1)</script>';
  assert.ok(report(record).rejects.some((f) => f.check === 'html-content'));
});

test('profiles reject additional keys at every object boundary', () => {
  const cases = [
    { profileVersion: 1, email: 'private' },
    { profileVersion: 1, category: { state: 'unsure', email: 'private' } },
    {
      profileVersion: 1,
      studyYear: { ...known({ stage: 1, of: 4 }), metadata: { aadhaar: 'private' } },
    },
    profile('studyYear', { stage: 1, of: 4, aadhaar: 'private' }),
    profile('annualHouseholdIncome', { ...income, metadata: { bankAccount: 'private' } }),
    profile('academicScore', {
      value: 80,
      scale: 'percentage',
      context: 'previous-year',
      phone: 'private',
    }),
    { profileVersion: 1, additionalAnswers: { email: known('private') } },
    {
      profileVersion: 1,
      additionalAnswers: {
        receivesOtherScholarship: { state: 'declined', metadata: { email: 'private' } },
      },
    },
  ];
  for (const value of cases) assert.equal(validateProfile(value).ok, false, JSON.stringify(value));
  assert.equal(validateProfile(profile('studyYear', { stage: 1, of: 4 })).ok, true);
  assert.equal(validateProfile(profile('annualHouseholdIncome', income)).ok, true);
  assert.equal(
    validateProfile(
      profile('academicScore', { value: 80, scale: 'percentage', context: 'previous-year' }),
    ).ok,
    true,
  );
});

test('empty income intervals and malformed value objects are rejected', () => {
  for (const [minInclusive, maxInclusive] of [
    [false, false],
    [true, false],
    [false, true],
  ]) {
    assert.equal(
      validateProfile(
        profile('annualHouseholdIncome', { ...income, min: 100, minInclusive, maxInclusive }),
      ).ok,
      false,
    );
  }
  assert.equal(validateProfile(profile('annualHouseholdIncome', { ...income, min: 100 })).ok, true);
  assert.equal(
    validateProfile(profile('annualHouseholdIncome', { ...income, max: null, maxInclusive: false }))
      .ok,
    true,
  );
  for (const field of ['studyYear', 'annualHouseholdIncome', 'academicScore']) {
    for (const value of [[], null, 'bad'])
      assert.equal(validateProfile(profile(field, value)).ok, false);
  }
});

test('a registry with no human-approved sources may be safely empty', () => {
  assert.deepEqual(
    validateRegistry({
      registryVersion: 1,
      userAgent: 'Schemelog test agent',
      hosts: {},
      entries: [],
    }),
    { ok: true, errors: [] },
  );
});
