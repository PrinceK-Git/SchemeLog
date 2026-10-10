import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCatalogue,
  evaluateRule,
  evaluateScheme,
} from '../../src/domain/eligibility/evaluate.js';
import { createEvidenceResolver } from '../../src/domain/validation/scheme.js';
import { DomainValidationError } from '../../src/domain/validation/common.js';
import { demoCatalogue, validateDemoCatalogue } from '../../src/data/demo-catalogue.js';
import { context, freeze, interval, known, leaf, profile, scheme } from '../helpers/catalogue.js';

const evaluate = (rule, answers = profile(), record = scheme(), ctx = context()) =>
  evaluateRule(answers, rule, {
    context: ctx,
    inheritedFreshness: record.eligibility.freshness,
    resolveEvidence: createEvidenceResolver(record, ctx.mode),
  });
const group = (operator, children, id = 'r-group') => ({
  id,
  operator,
  children,
  explanationKey: 'test.group',
});
const incomeRule = (operator, rest = {}) =>
  leaf({ operator, field: 'annualHouseholdIncome', value: 250000, unit: 'INR/year', ...rest });
const byId = (assessments) =>
  Object.fromEntries(assessments.map((item) => [item.schemeId, item.status]));

test('reference catalogue computes four categories and honest evidence', () => {
  assert.deepEqual(validateDemoCatalogue(demoCatalogue), { ok: true, errors: [] });
  const results = evaluateCatalogue(profile(), demoCatalogue, context());
  assert.deepEqual(
    results.map((item) => item.status),
    ['potential', 'verification', 'unmet', 'unavailable'],
  );
  for (const assessment of results) {
    assert.equal(assessment.engineVersion, '1.0.0');
    assert.equal(assessment.evaluatedAt, context().evaluatedAt);
    for (const row of assessment.ruleResults)
      for (const evidence of row.evidence) {
        assert.equal(evidence.kind, 'fictional-test-condition');
        assert.equal(evidence.url, null);
      }
  }
});

for (const [name, overrides, expected] of [
  [
    'declined income',
    { annualHouseholdIncome: { state: 'declined' } },
    ['verification', 'verification', 'unmet', 'unavailable'],
  ],
  [
    'high income',
    { annualHouseholdIncome: known(interval(250000, null, false)) },
    ['unmet', 'verification', 'unmet', 'unavailable'],
  ],
  [
    'school with low income',
    { educationLevel: known('school'), annualHouseholdIncome: known(interval(0, 100000)) },
    ['unmet', 'unmet', 'potential', 'unavailable'],
  ],
  [
    'unsure education',
    { educationLevel: { state: 'unsure' } },
    ['verification', 'verification', 'verification', 'unavailable'],
  ],
])
  test(`answer-driven change: ${name}`, () => {
    const actual = byId(evaluateCatalogue(profile(overrides), demoCatalogue, context()));
    assert.deepEqual(
      demoCatalogue.schemes.map((item) => actual[item.id]),
      expected,
    );
  });

const outcomes = {
  pass: known('undergraduate'),
  fail: known('school'),
  unknown: { state: 'unsure' },
};
for (const operator of ['allOf', 'anyOf'])
  for (const a of Object.keys(outcomes))
    for (const b of Object.keys(outcomes)) {
      test(`${operator} truth table ${a}/${b}`, () => {
        const rule = group(operator, [
          leaf({ id: 'r-a' }),
          leaf({ id: 'r-b', field: 'courseCode', value: 'ug-science' }),
        ]);
        const courseCode =
          b === 'unknown' ? { state: 'unsure' } : known(b === 'pass' ? 'ug-science' : 'other');
        const expected =
          operator === 'allOf'
            ? [a, b].includes('fail')
              ? 'fail'
              : a === 'pass' && b === 'pass'
                ? 'pass'
                : 'unknown'
            : [a, b].includes('pass')
              ? 'pass'
              : a === 'fail' && b === 'fail'
                ? 'fail'
                : 'unknown';
        assert.equal(
          evaluate(rule, profile({ educationLevel: outcomes[a], courseCode })).outcome,
          expected,
        );
      });
    }
for (const [state, answer] of Object.entries(outcomes))
  test(`not preserves three-valued logic: ${state}`, () => {
    const rule = { id: 'r-not', operator: 'not', child: leaf(), explanationKey: 'test.not' };
    const input = profile({ educationLevel: answer });
    assert.equal(
      evaluate(rule, input).outcome,
      { pass: 'fail', fail: 'pass', unknown: 'unknown' }[state],
    );
    assert.equal(evaluate({ ...rule, id: 'r-not-again', child: rule }, input).outcome, state);
  });

test('in, additional answers, unknown states and absent fields', () => {
  assert.equal(
    evaluate(leaf({ operator: 'in', value: ['school', 'undergraduate'] })).outcome,
    'pass',
  );
  assert.equal(evaluate(leaf({ operator: 'in', value: ['school'] })).outcome, 'fail');
  assert.equal(
    evaluate(
      leaf({ field: 'additionalAnswers.receivesOtherScholarship', value: 'no' }),
      profile({ additionalAnswers: { receivesOtherScholarship: known('no') } }),
    ).outcome,
    'pass',
  );
  for (const state of ['unsure', 'declined', 'not-asked']) {
    const result = evaluate(leaf(), profile({ educationLevel: { state } }));
    assert.equal(result.outcome, 'unknown');
    assert.deepEqual(result.ruleResults[0].providedAnswer, { state });
  }
  const empty = { profileVersion: 1 };
  assert.equal(evaluate(leaf(), empty).ruleResults[0].reasonCode, 'answer_not_asked');
});

test('whole-tree validation rejects malformed unused alternatives and operands', () => {
  for (const bad of [
    leaf({ operator: 'magic' }),
    group('allOf', []),
    group('anyOf', [leaf()]),
    { id: 'r-not', operator: 'not', explanationKey: 'test.not' },
    leaf({ children: [leaf()] }),
    leaf({ field: 'email' }),
    leaf({ operator: 'in', value: [] }),
    leaf({ value: 3 }),
    incomeRule('eq'),
    incomeRule('between', { min: 3, max: 3, minInclusive: false, maxInclusive: true }),
    leaf({ id: 'r-duplicate' }),
  ]) {
    const root = group('anyOf', [leaf({ id: 'r-duplicate' }), bad]);
    assert.throws(() => evaluate(root), DomainValidationError);
  }
  assert.throws(() => evaluate(leaf({ evidence: ['src-missing'] })), DomainValidationError);
});

test('malformed known answers reject without leaking values', () => {
  for (const input of [
    profile({ educationLevel: known('SECRET') }),
    profile({ email: 'SECRET' }),
    profile({ educationLevel: { state: 'unsure', value: 'SECRET' } }),
    profile({ profileVersion: 2 }),
    profile({ annualHouseholdIncome: known(interval(0, null, true, true)) }),
    profile({
      academicScore: known({ value: NaN, scale: 'percentage', context: 'previous-year' }),
    }),
  ])
    assert.throws(
      () => evaluate(leaf(), input),
      (error) =>
        error instanceof DomainValidationError && !JSON.stringify(error).includes('SECRET'),
    );
});

const incomeCases = [
  [interval(0, 250000), 'lte', {}, 'pass'],
  [interval(0, 250000), 'lt', {}, 'unknown'],
  [interval(0, 250000, true, false), 'lt', {}, 'pass'],
  [interval(250000, 250000), 'lte', {}, 'pass'],
  [interval(250000, 250000), 'lt', {}, 'fail'],
  [interval(250000, null, false), 'lte', {}, 'fail'],
  [interval(200000, 300000), 'lte', {}, 'unknown'],
  [interval(250000, null), 'gte', {}, 'pass'],
  [interval(250000, null), 'gt', {}, 'unknown'],
  [interval(0, null), 'lte', {}, 'unknown'],
  [
    interval(100000, 200000),
    'between',
    { min: 100000, max: 200000, minInclusive: true, maxInclusive: true },
    'pass',
  ],
  [
    interval(100000, 200000),
    'between',
    { min: 100000, max: 200000, minInclusive: false, maxInclusive: false },
    'unknown',
  ],
  [
    interval(0, 100000),
    'between',
    { min: 100000, max: 200000, minInclusive: false, maxInclusive: true },
    'fail',
  ],
  [interval(0, 0), 'lte', { value: 0 }, 'pass'],
  [interval(0, 0), 'lt', { value: 0 }, 'fail'],
  [interval(0, null, false), 'gt', { value: 0 }, 'pass'],
];
incomeCases.forEach(([value, operator, operands, expected], index) =>
  test(`income interval case ${index}: ${operator} => ${expected}`, () => {
    const rule = incomeRule(operator, operands);
    if (operator === 'between') delete rule.value;
    assert.equal(
      evaluate(rule, profile({ annualHouseholdIncome: known(value) })).outcome,
      expected,
    );
  }),
);

for (const [operator, expected] of [
  ['lt', ['pass', 'fail', 'fail']],
  ['lte', ['pass', 'pass', 'fail']],
  ['gt', ['fail', 'fail', 'pass']],
  ['gte', ['fail', 'pass', 'pass']],
]) {
  test(`numeric score ${operator} below/equal/above`, () => {
    const rule = leaf({
      operator,
      field: 'academicScore',
      value: 80,
      scale: 'percentage',
      context: 'class-12-board',
    });
    [79, 80, 81].forEach((value, index) =>
      assert.equal(
        evaluate(
          rule,
          profile({
            academicScore: known({ value, scale: 'percentage', context: 'class-12-board' }),
          }),
        ).outcome,
        expected[index],
      ),
    );
  });
}
test('score scales/exams and school/course year are not inferred or converted', () => {
  const rule = leaf({
    operator: 'gte',
    field: 'academicScore',
    value: 80,
    scale: 'percentage',
    context: 'class-12-board',
  });
  for (const scale of ['percentile', 'cgpa-10', 'cgpa-4'])
    assert.equal(
      evaluate(
        rule,
        profile({ academicScore: known({ value: 3, scale, context: 'class-12-board' }) }),
      ).ruleResults[0].reasonCode,
      'score_scale_mismatch',
    );
  assert.equal(
    evaluate(
      rule,
      profile({
        academicScore: known({ value: 80, scale: 'percentage', context: 'previous-year' }),
      }),
    ).ruleResults[0].reasonCode,
    'score_context_mismatch',
  );
  const year = leaf({ operator: 'gte', field: 'studyYear', value: 2, unit: 'course-year' });
  assert.equal(evaluate(year, profile({ studyYear: known({ stage: 2, of: 4 }) })).outcome, 'pass');
  assert.equal(
    evaluate(year, profile({ studyYear: known({ stage: 'class-10' }) })).ruleResults[0].reasonCode,
    'study_context_mismatch',
  );
  assert.equal(
    evaluate(
      { ...year, value: 9, unit: 'school-class' },
      profile({ studyYear: known({ stage: 'class-10' }) }),
    ).outcome,
    'pass',
  );
});

test('partial coverage, trusted failure and unknown facts aggregate conservatively', () => {
  const record = scheme();
  record.eligibility.coverage = 'partial';
  assert.equal(evaluateScheme(profile(), record, context()).status, 'verification');
  assert.equal(
    evaluateScheme(profile({ educationLevel: known('school') }), record, context()).status,
    'unmet',
  );
  record.eligibility.coverage = 'complete';
  const result = evaluateScheme(
    profile({ educationLevel: known('school'), annualHouseholdIncome: { state: 'declined' } }),
    record,
    context(),
  );
  assert.equal(result.status, 'unmet');
  assert.deepEqual(result.missingFields, []);
  record.eligibility.rule.children[0].evidence = [];
  assert.equal(evaluateScheme(profile(), record, context()).status, 'verification');
});

test('alternatives retain structure and manual checks only contribute to unresolved roots', () => {
  const record = structuredClone(demoCatalogue.schemes[1]);
  const assessment = evaluateScheme(profile(), record, context());
  const alternative = assessment.ruleResults.find((row) => row.operator === 'anyOf');
  assert.equal(alternative.outcome, 'pass');
  assert.equal(alternative.reasonCode, 'alternative_met');
  assert.equal(
    assessment.ruleResults.find((row) => row.ruleId === alternative.childRuleIds[1]).outcome,
    'fail',
  );
  assert.equal(assessment.manualChecks.length, 1);
  record.eligibility.rule.operator = 'anyOf';
  assert.equal(evaluateScheme(profile(), record, context()).status, 'potential');
  assert.deepEqual(evaluateScheme(profile(), record, context()).manualChecks, []);
  record.eligibility.rule.operator = 'allOf';
  assert.equal(
    evaluateScheme(profile({ educationLevel: known('school') }), record, context()).status,
    'unmet',
  );
});

test('document applicability uses identical evaluator and is independent of preparation state', () => {
  const record = scheme();
  const rule = record.documents[0].appliesWhen;
  for (const [value, expected] of [
    [interval(0, 100000), 'pass'],
    [interval(100000, 250000, false), 'fail'],
    [interval(0, 250000), 'unknown'],
  ])
    assert.equal(
      evaluate(rule, profile({ annualHouseholdIncome: known(value) })).outcome,
      expected,
    );
  const first = evaluateScheme(profile(), record, context());
  assert.deepEqual(
    evaluateScheme(profile(), record, context({ checklistProgress: { arbitrary: true } })),
    first,
  );
});

test('determinism, ordering and frozen input immutability', () => {
  const input = freeze(profile());
  const catalogue = freeze(structuredClone(demoCatalogue));
  const ctx = freeze(context());
  const before = JSON.stringify({ input, catalogue, ctx });
  const one = evaluateCatalogue(input, catalogue, ctx);
  assert.deepEqual(
    evaluateCatalogue(input, { ...catalogue, schemes: [...catalogue.schemes].reverse() }, ctx),
    one,
  );
  assert.equal(JSON.stringify(evaluateCatalogue(input, catalogue, ctx)), JSON.stringify(one));
  assert.equal(JSON.stringify({ input, catalogue, ctx }), before);
  const a = scheme();
  const b = scheme();
  a.id = 'fx-sch-a';
  a.slug = 'a';
  b.id = 'fx-sch-b';
  b.slug = 'b';
  assert.deepEqual(
    evaluateCatalogue(input, { ...demoCatalogue, schemes: [b, a] }, ctx).map((r) => r.schemeId),
    [a.id, b.id],
  );
  b.officialName = 'A name';
  assert.equal(
    evaluateCatalogue(input, { ...demoCatalogue, schemes: [a, b] }, ctx)[0].schemeId,
    b.id,
  );
});

test('explicit modes, versions and complete-record validation cannot be bypassed', () => {
  for (const ctx of [
    context({ evaluatedAt: '2026-10-10' }),
    context({ mode: undefined }),
    context({ engineVersion: '999' }),
  ])
    assert.throws(() => evaluateScheme(profile(), scheme(), ctx), DomainValidationError);
  assert.throws(
    () => evaluateCatalogue(profile(), demoCatalogue, context({ catalogueVersion: 'other' })),
    DomainValidationError,
  );
  assert.throws(
    () => evaluateCatalogue(profile(), demoCatalogue, context({ mode: 'reviewed' })),
    DomainValidationError,
  );
  assert.deepEqual(
    evaluateCatalogue(
      profile(),
      { catalogueVersion: 'real-v1', schemes: [] },
      context({ mode: 'reviewed', catalogueVersion: 'real-v1' }),
    ),
    [],
  );
  const invalid = scheme();
  invalid.documents[0].appliesWhen.operator = 'magic';
  assert.throws(() => evaluateScheme(profile(), invalid, context()), DomainValidationError);
  const mixed = structuredClone(demoCatalogue);
  mixed.schemes[0].id = 'sch-real';
  assert.equal(validateDemoCatalogue(mixed).ok, false);
});

test('malformed scheme objects, cyclic rules and sparse evidence fail at the boundary', () => {
  for (const invalid of [null, {}, { ...scheme(), id: 1 }, Object.create(scheme())])
    assert.throws(() => evaluateScheme(profile(), invalid, context()), DomainValidationError);
  const cyclic = scheme();
  cyclic.eligibility.rule.children.push(cyclic.eligibility.rule);
  assert.throws(() => evaluateScheme(profile(), cyclic, context()), DomainValidationError);
  const sparse = scheme();
  sparse.eligibility.rule.children[0].evidence = new Array(1);
  assert.throws(() => evaluateScheme(profile(), sparse, context()), DomainValidationError);
  sparse.eligibility.rule.children[0].evidence = ['src-demo-undergraduate#loc-condition'];
  sparse.application.statusOverride = {
    status: 'open',
    checkedAt: '2026-10-10',
    evidence: new Array(1),
  };
  assert.throws(() => evaluateScheme(profile(), sparse, context()), DomainValidationError);
});

test('actionable missing fields, inclusive score between, and detached output values', () => {
  const result = evaluateScheme(
    profile({ annualHouseholdIncome: { state: 'declined' } }),
    scheme(),
    context(),
  );
  assert.deepEqual(result.missingFields, ['annualHouseholdIncome']);
  const rule = leaf({
    operator: 'between',
    field: 'academicScore',
    min: 70,
    max: 80,
    minInclusive: true,
    maxInclusive: false,
    scale: 'percentage',
    context: 'previous-year',
  });
  delete rule.value;
  for (const [value, expected] of [
    [69, 'fail'],
    [70, 'pass'],
    [75, 'pass'],
    [80, 'fail'],
  ]) {
    const input = profile({
      academicScore: known({ value, scale: 'percentage', context: 'previous-year' }),
    });
    const evaluated = evaluate(rule, input);
    assert.equal(evaluated.outcome, expected);
    evaluated.ruleResults[0].providedAnswer.value.value = 0;
    assert.equal(input.academicScore.value.value, value);
  }
  for (const value of [interval(0, 200000), interval(100000, 150000), interval(150000, 150000)])
    assert.equal(
      evaluate(incomeRule('lte'), profile({ annualHouseholdIncome: known(value) })).outcome,
      'pass',
    );
});

test('reviewed evidence projections preserve locators without mixing fictional provenance', () => {
  // Synthetic in-memory test record, not an approval for publication or a real scholarship.
  const record = scheme();
  delete record.fictional;
  delete record.testConditions;
  record.id = 'sch-review-test';
  record.publicationStatus = 'published';
  record.verification = {
    curatedBy: 'test-curator',
    reviewedBy: 'test-reviewer',
    reviewedAt: '2026-10-10',
  };
  record.sources = [
    {
      id: 'src-test',
      title: 'Test guideline',
      authority: 'Test authority',
      kind: 'guidelines',
      url: 'https://example.org/test',
      locators: [{ id: 'loc-test', ref: 'Section 1' }],
    },
  ];
  const replaceRefs = (node) => {
    node.evidence = ['src-test#loc-test'];
    for (const child of node.children ?? []) replaceRefs(child);
  };
  replaceRefs(record.eligibility.rule);
  record.eligibility.evidence = ['src-test'];
  for (const document of record.documents) {
    replaceRefs(document.appliesWhen);
    document.evidence = ['src-test'];
  }
  const ctx = context({
    mode: 'reviewed',
    catalogueVersion: 'real-test-only',
    currentCycles: { [record.id]: '2026-27' },
  });
  const evaluated = evaluateScheme(profile(), record, ctx);
  assert.equal(evaluated.status, 'potential');
  assert.equal(evaluated.ruleResults[1].evidence[0].kind, 'reviewed-source');
  assert.equal(evaluated.ruleResults[1].evidence[0].locator, 'Section 1');
  record.application.statusOverride = {
    status: 'open',
    checkedAt: '2026-10-10',
    evidence: ['src-test'],
  };
  assert.throws(() => evaluateScheme(profile(), record, ctx), DomainValidationError);
  record.sources[0].kind = 'notice';
  assert.equal(evaluateScheme(profile(), record, ctx).applicationStatus.status, 'open');
  record.verification.reviewedBy = 'ai-assisted-research';
  assert.throws(() => evaluateScheme(profile(), record, ctx), DomainValidationError);
});
