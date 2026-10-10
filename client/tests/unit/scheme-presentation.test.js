import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { demoCatalogue, demoContext } from '../../src/data/demo-catalogue.js';
import {
  assessmentGroups,
  formatAnswer,
  formatRequirement,
  displayedLastVerified,
  presentFacts,
  safeDestinations,
} from '../../src/presentation/scheme.js';
import { safeHttpsUrl, validatePresentationScheme } from '../../src/domain/validation/catalogue.js';
import { walkRules } from '../../src/domain/validation/scheme.js';
import { interval, known, scheme } from '../helpers/catalogue.js';

// Synthetic unit-only metadata: not a publication artifact or genuine reviewer approval.
function reviewedFixture() {
  const record = scheme();
  delete record.fictional;
  delete record.testConditions;
  record.id = 'sch-unit-only';
  record.slug = 'unit-only';
  record.publicationStatus = 'published';
  record.verification = {
    curatedBy: 'unit-test-curator',
    curatedAt: '2026-09-01',
    reviewedBy: 'unit-test-reviewer',
    reviewedAt: '2026-10-01',
  };
  record.sources = [
    {
      id: 'src-unit',
      url: 'https://example.test/information',
      title: 'Unit-only source',
      authority: 'Unit-only authority',
      kind: 'scheme-page',
      locators: [{ id: 'loc-fact', ref: 'Unit test fact' }],
    },
  ];
  record.links = [
    {
      id: 'lnk-unit',
      purpose: 'scheme-info',
      url: record.sources[0].url,
      label: 'Unit information',
      checkedAt: '2026-10-01',
      status: 'verified',
    },
  ];
  const evidence = ['src-unit#loc-fact'];
  for (const tree of [record.eligibility.rule, ...record.documents.map((doc) => doc.appliesWhen)])
    for (const [node] of walkRules(tree)) if (node.evidence) node.evidence = [...evidence];
  for (const document of record.documents) document.evidence = [...evidence];
  record.summary = 'Synthetic unit record; never published as a scholarship.';
  record.authority = { name: 'Unit-only authority', level: 'unknown' };
  record.benefits = [
    {
      id: 'ben-unit',
      type: 'other',
      description: 'Unit test benefit',
      amount: { value: 100, currency: 'INR', frequency: 'year' },
      evidence,
      freshness: {
        state: 'current',
        checkedAt: '2026-09-15',
        checkedBy: 'unit-test-checker',
        reviewDue: '2027-01-01',
      },
    },
  ];
  record.applicationSteps = [{ order: 1, title: 'Unit-only instruction', evidence }];
  return record;
}
const context = { ...demoContext, mode: 'reviewed' };

test('assessment groups preserve domain IDs, order and existing icons', () => {
  assert.deepEqual(
    assessmentGroups.map((group) => group.id),
    ['potential', 'verification', 'unmet', 'unavailable'],
  );
  assert.deepEqual(
    assessmentGroups.map((group) => group.icon),
    ['check', 'clock', 'minus', 'info'],
  );
});

test('answer formatting preserves uncertainty, zero, interval inclusion and score/year dimensions', () => {
  assert.equal(formatAnswer({ state: 'unsure' }), 'Not sure');
  assert.equal(formatAnswer({ state: 'declined' }), 'Prefer not to answer');
  assert.equal(formatAnswer({ state: 'not-asked' }), 'Not asked');
  assert.equal(formatAnswer(known(interval(0, 0))), '₹0 per year');
  assert.equal(
    formatAnswer(known(interval(0, 100000))),
    'At least ₹0 and up to ₹1,00,000 per year',
  );
  assert.equal(formatAnswer(known(interval(100000, null, false))), 'Above ₹1,00,000 per year');
  assert.match(
    formatAnswer(known({ value: 0, scale: 'percentage', context: 'previous-year' })),
    /^0% — Previous/,
  );
  assert.match(
    formatAnswer(known({ value: 3, scale: 'cgpa-4', context: 'class-12-board' })),
    /3 \(CGPA on a 4-point scale\).*Class 12/,
  );
  assert.equal(formatAnswer(known({ stage: 2, of: 4 })), 'Year 2 of 4');
  assert.equal(formatAnswer(known({ stage: 'class-10' })), 'Class 10');
  assert.equal(formatAnswer(known({ unexpected: 'object' })), 'Answer unavailable');
});

test('requirements name logical groups, strict boundaries and scale/context without changing outcomes', () => {
  assert.match(formatRequirement({ operator: 'anyOf' }), /alternative/);
  assert.match(formatRequirement({ operator: 'not' }), /must not apply/);
  assert.match(
    formatRequirement({
      operator: 'lt',
      field: 'annualHouseholdIncome',
      expected: { value: 100000 },
    }),
    /below ₹1,00,000/,
  );
  assert.match(
    formatRequirement({
      operator: 'gte',
      field: 'academicScore',
      expected: { value: 80, scale: 'percentile', context: 'class-12-board' },
    }),
    /Percentile; Class 12/,
  );
  assert.match(
    formatRequirement({
      operator: 'gte',
      field: 'studyYear',
      expected: { value: 2, unit: 'course-year' },
    }),
    /course year/,
  );
});

test('demo facts never decorate fictional records with real-looking benefits or actions', () => {
  for (const record of demoCatalogue.schemes) {
    const facts = presentFacts(record, demoContext);
    assert.equal(facts.summary, record.summary);
    assert.equal(facts.authority, null);
    assert.equal(facts.lastVerified, null);
    assert.deepEqual(facts.benefits, []);
    assert.deepEqual(safeDestinations(record, demoContext), []);
  }
});

test('fact adapter omits stale/unsupported benefits and dates verification from oldest displayed check', () => {
  const record = reviewedFixture();
  const facts = presentFacts(record, context);
  assert.deepEqual(facts.benefits, ['Unit test benefit — ₹100 per year']);
  assert.equal(facts.lastVerified, '2026-09-15');
  assert.equal(facts.applicationSteps.length, 1);
  for (const patch of [
    { state: 'superseded' },
    { state: 'unknown' },
    { reviewDue: '2026-10-10' },
    { checkedAt: '2026-10-11' },
  ]) {
    const stale = structuredClone(record);
    Object.assign(stale.benefits[0].freshness, patch);
    const shown = presentFacts(stale, context);
    assert.deepEqual(shown.benefits, []);
    assert.equal(shown.summary, null);
    assert.equal(shown.lastVerified, '2026-10-01');
  }
  record.benefits[0].evidence = [];
  assert.deepEqual(presentFacts(record, context).benefits, []);
});

test('unknown benefit amount is explicit; malformed optional facts fail closed', () => {
  const record = reviewedFixture();
  record.benefits[0].amount = { state: 'unknown', reason: 'not-found' };
  assert.match(presentFacts(record, context).benefits[0], /Amount not confirmed/);
  assert.equal(presentFacts(record, context).summary, null);
  for (const mutate of [
    (value) => {
      value.summary = {};
    },
    (value) => {
      value.authority.name = [];
    },
    (value) => {
      value.benefits[0].amount = { value: '100', currency: 'INR', frequency: 'year' };
    },
    (value) => {
      value.benefits[0].evidence = ['src-missing'];
    },
    (value) => {
      value.applicationSteps[0].description = {};
    },
    (value) => {
      value.sources[0].locators[0].ref = {};
    },
    (value) => {
      value.documents[0].notes = {};
    },
  ]) {
    const invalid = reviewedFixture();
    mutate(invalid);
    assert.ok(validatePresentationScheme(invalid, context).length);
    assert.deepEqual(presentFacts(invalid, context).benefits, []);
  }
});

test('display-wide verification includes only selected supported sections and never retrieval/publication dates', () => {
  const record = reviewedFixture();
  record.eligibility.freshness.checkedAt = '2026-07-01';
  record.application.freshness.checkedAt = '2026-06-01';
  record.sources[0].retrievedAt = '2020-01-01';
  assert.equal(displayedLastVerified(record, context), '2026-09-15');
  assert.equal(
    displayedLastVerified(record, context, { includeApplicationSteps: true }),
    '2026-06-01',
  );
  assert.equal(displayedLastVerified(record, context, { includeAssessment: true }), '2026-07-01');
  assert.equal(displayedLastVerified(record, context, { includeDocuments: true }), '2026-07-01');
  assert.equal(displayedLastVerified(record, context, { includeApplication: true }), '2026-09-15');
  record.application.closes = {
    value: '2026-12-01',
    precision: 'date',
    timezone: 'Asia/Kolkata',
    cycle: '2026-27',
    evidence: ['src-unit'],
    checkedAt: '2026-05-01',
  };
  assert.equal(displayedLastVerified(record, context, { includeApplication: true }), '2026-05-01');
  record.eligibility.freshness.state = 'superseded';
  assert.equal(
    displayedLastVerified(record, context, { includeAssessment: true, includeDocuments: true }),
    '2026-09-15',
  );
  assert.equal(
    displayedLastVerified(demoCatalogue.schemes[0], demoContext, { includeAssessment: true }),
    null,
  );
});

test('URLs reject unsafe protocols, credentials and deceptive malformed forms', () => {
  assert.equal(safeHttpsUrl('https://example.test/path'), true);
  for (const url of [
    'http://example.test',
    'javascript:alert(1)',
    '//example.test',
    'https://user:password@example.test',
    'https://example.test\\@evil.test',
    'https://example.test/ space',
    'https://',
  ])
    assert.equal(safeHttpsUrl(url), false, url);
});

test('a verified-looking source is not publication authorization and cannot create an Apply action', () => {
  const record = reviewedFixture();
  assert.deepEqual(safeDestinations(record, context), []);
  for (const patch of [
    { url: 'https://government.gov.in/apply', purpose: 'application' },
    { checkedAt: '2026-10-11' },
    { status: 'broken' },
    { status: 'unverified' },
    { url: 'https://user:password@example.test' },
  ]) {
    Object.assign(record.links[0], patch);
    assert.deepEqual(safeDestinations(record, context), []);
  }
  assert.deepEqual(safeDestinations(record, { mode: 'reviewed', evaluatedAt: 'invalid' }), []);
  assert.deepEqual(safeDestinations(record, demoContext), []);
});

test('browser bundle uses exact publication-backed destinations and never relabels information as Apply', async () => {
  const published = reviewedFixture();
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const entry = fileURLToPath(new URL('../../unit-presentation-entry.js', import.meta.url));
  // Isolated test module only: neither the generated artifact nor any registry approval is edited.
  const output = await build({
    configFile: false,
    root,
    logLevel: 'silent',
    plugins: [
      {
        name: 'unit-publication-boundary',
        enforce: 'pre',
        resolveId(id, importer) {
          if (
            id === entry ||
            (id === '../data/catalogue.json' &&
              importer?.replaceAll('\\', '/').endsWith('/presentation/scheme.js'))
          )
            return id === entry ? entry : '\0unit-publication-artifact.js';
        },
        load(id) {
          if (id === entry)
            return "export { safeDestinations } from '/src/presentation/scheme.js';";
          if (id === '\0unit-publication-artifact.js')
            return `export default ${JSON.stringify({ schemes: [published] })};`;
        },
      },
    ],
    build: {
      write: false,
      minify: false,
      lib: { entry, formats: ['es'], fileName: 'unit-presentation' },
    },
  });
  const chunks = Array.isArray(output) ? output.flatMap((item) => item.output) : output.output;
  const code = chunks.find((item) => item.type === 'chunk').code;
  assert.doesNotMatch(code, /node:fs|node:path|pdfjs|readFileSync|sch-nmmss|sch-pm-usp-csss/);
  const browser = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  );
  assert.deepEqual(browser.safeDestinations(published, context), [
    {
      id: 'lnk-unit',
      purpose: 'scheme-info',
      label: 'Scheme information',
      url: 'https://example.test/information',
    },
  ]);
  for (const change of [
    (record) => {
      record.links[0].purpose = 'application';
    },
    (record) => {
      record.links[0].url = 'https://government.gov.in/apply';
    },
    (record) => {
      record.links[0].checkedAt = '2026-10-11';
    },
    (record) => {
      record.links[0].status = 'broken';
    },
    (record) => {
      record.recordVersion++;
    },
    (record) => {
      record.verification.reviewedBy = record.verification.curatedBy;
    },
  ]) {
    const unbacked = structuredClone(published);
    change(unbacked);
    assert.deepEqual(browser.safeDestinations(unbacked, context), []);
  }
});
