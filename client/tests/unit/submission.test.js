import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSubmission,
  evaluateDocuments,
  preparationCounts,
  preparationKey,
} from '../../src/app/submission.js';
import { initialState, sessionReducer } from '../../src/app/session-state.js';
import { demoCatalogue, demoContext, referenceProfile } from '../../src/data/demo-catalogue.js';
import { getCatalogue } from '../../src/repositories/catalogue.js';
import { buildQuestionPlan } from '../../src/domain/profile/question-plan.js';
import { evaluateCatalogue } from '../../src/domain/eligibility/evaluate.js';
import { vocabularies } from '../../src/data/vocabularies.js';

async function inputs(incomeIndex = 1) {
  const catalogueLoad = await getCatalogue();
  const questionPlan = buildQuestionPlan(catalogueLoad.catalogue, { vocab: vocabularies });
  return {
    catalogueLoad,
    questionPlan,
    draftProfile: {
      educationLevel: 'undergraduate',
      domicile: 'IN-AS',
      category: 'general',
      income: questionPlan.incomeBands[incomeIndex].id,
    },
    draftRevision: 2,
    presentedFields: ['educationLevel', 'domicile', 'income', 'category'],
  };
}

test('submission evaluates once, captures all versions and detaches a complete snapshot', async () => {
  const input = await inputs();
  let calls = 0;
  const result = createSubmission(input, {
    evaluate: (...args) => {
      calls++;
      return evaluateCatalogue(...args);
    },
  });
  assert.equal(result.ok, true);
  assert.equal(calls, 1);
  const saved = result.submission;
  assert.deepEqual(
    saved.assessments.map((item) => item.status),
    ['potential', 'verification', 'unmet', 'unavailable'],
  );
  assert.equal(saved.context.evaluatedAt, demoContext.evaluatedAt);
  assert.equal(saved.context.catalogueVersion, demoCatalogue.catalogueVersion);
  assert.equal(saved.profile.annualHouseholdIncome.value.min, 100000);
  assert.equal(saved.profile.annualHouseholdIncome.value.minInclusive, false);
  input.draftProfile.educationLevel = 'school';
  assert.equal(saved.profile.educationLevel.value, 'undergraduate');
  assert.notEqual(saved.catalogueSnapshot, input.catalogueLoad.catalogue);
  assert.doesNotThrow(() => JSON.stringify(saved));
});

test('submission rejects full malformed drafts without evaluating and preserves asked states', async () => {
  const input = await inputs();
  let calls = 0;
  const invalid = createSubmission(
    {
      ...input,
      draftProfile: { ...input.draftProfile, aadhaar: 'sensitive', score: 'bad-hidden' },
    },
    {
      evaluate: () => {
        calls++;
      },
    },
  );
  assert.equal(invalid.ok, false);
  assert.equal(calls, 0);
  assert.ok(invalid.errors.some((error) => error.field === 'aadhaar'));
  assert.ok(invalid.errors.some((error) => error.field === 'score'));
  assert.doesNotMatch(JSON.stringify(invalid), /sensitive|bad-hidden/);
  const blank = createSubmission({
    ...input,
    draftProfile: {},
    presentedFields: ['educationLevel'],
  }).submission.profile;
  assert.equal(blank.educationLevel.state, 'unsure');
  assert.equal(blank.annualHouseholdIncome.state, 'not-asked');
  const declined = createSubmission({ ...input, draftProfile: { income: 'declined' } }).submission
    .profile;
  assert.equal(declined.annualHouseholdIncome.state, 'declined');
});

test('invalid context/data throws before any session commit; plans cannot cross catalogue versions', async () => {
  const input = await inputs();
  assert.throws(() =>
    createSubmission({
      ...input,
      questionPlan: { ...input.questionPlan, catalogueVersion: 'wrong' },
    }),
  );
  assert.throws(() =>
    createSubmission(input, {
      evaluate: () => {
        throw new Error('bad record');
      },
    }),
  );
  assert.equal(initialState.submission, null);
});

test('session rejects obsolete commits and editing, revert, reset have explicit semantics', async () => {
  const input = await inputs();
  let state = sessionReducer(initialState, {
    type: 'catalogue-ready',
    load: input.catalogueLoad,
    plan: input.questionPlan,
  });
  state = sessionReducer(state, {
    type: 'answer',
    field: 'educationLevel',
    value: 'undergraduate',
  });
  state = sessionReducer(state, {
    type: 'answer',
    field: 'income',
    value: input.draftProfile.income,
  });
  state = sessionReducer(state, { type: 'presented', fields: input.presentedFields });
  const result = createSubmission(state);
  state = sessionReducer(state, { type: 'submit-success', submission: result.submission });
  assert.equal(state.submission.submittedRevision, state.draftRevision);
  const saved = state.submission;
  state = sessionReducer(state, { type: 'answer', field: 'educationLevel', value: 'school' });
  state = sessionReducer(state, {
    type: 'answer',
    field: 'educationLevel',
    value: 'undergraduate',
  });
  assert.notEqual(state.submission.submittedRevision, state.draftRevision);
  assert.equal(
    sessionReducer(state, { type: 'submit-success', submission: result.submission }),
    state,
  );
  assert.equal(state.submission, saved);
  assert.equal(sessionReducer(state, { type: 'presented', fields: input.presentedFields }), state);
  const reset = sessionReducer(state, { type: 'reset' });
  assert.equal(reset.submission, null);
  assert.deepEqual(reset.draftProfile, {});
  assert.deepEqual(reset.checklistProgress, {});
  assert.equal(reset.catalogueStatus, 'ready');
});

test('checklist pass/fail/unknown counts and version keys never affect assessments', async () => {
  const input = await inputs(0);
  const low = createSubmission(input).submission;
  const record = low.catalogueSnapshot.schemes[0];
  const key = preparationKey(record, record.documents[0]);
  assert.equal(key, 'fx-sch-learning-pathways:2:doc-income');
  const progress = { [key]: true };
  assert.deepEqual(preparationCounts(record, low.documentApplicability, progress), {
    applicable: 1,
    completed: 1,
    unknown: 0,
  });
  const high = createSubmission({
    ...input,
    draftProfile: { ...input.draftProfile, income: input.questionPlan.incomeBands[2].id },
  }).submission;
  assert.deepEqual(preparationCounts(record, high.documentApplicability, progress), {
    applicable: 0,
    completed: 0,
    unknown: 0,
  });
  const uncertain = createSubmission({ ...input, draftProfile: { income: 'declined' } }).submission;
  assert.deepEqual(preparationCounts(record, uncertain.documentApplicability, progress), {
    applicable: 0,
    completed: 0,
    unknown: 1,
  });
  const state = { ...initialState, submission: low };
  const checked = sessionReducer(state, { type: 'check', key, checked: true });
  assert.equal(checked.submission, low);
  assert.equal(checked.draftRevision, state.draftRevision);
  assert.equal(
    sessionReducer(checked, { type: 'check', key: 'unknown-key', checked: true }),
    checked,
  );
  const changed = { ...record, recordVersion: record.recordVersion + 1 };
  assert.equal(
    preparationCounts(
      changed,
      { [preparationKey(changed, record.documents[0])]: { outcome: 'pass' } },
      progress,
    ).completed,
    0,
  );
});

test('unconditional document metadata and inherited freshness are not vacuous rules', () => {
  const catalogue = structuredClone(demoCatalogue);
  const record = catalogue.schemes[0];
  record.documents[0].appliesWhen = null;
  record.documents[0].requirement = 'confirmed';
  const key = preparationKey(record, record.documents[0]);
  assert.equal(evaluateDocuments(referenceProfile, catalogue, demoContext)[key].outcome, 'pass');
  record.documents[0].requirement = 'needs-verification';
  assert.equal(evaluateDocuments(referenceProfile, catalogue, demoContext)[key].outcome, 'unknown');
  record.documents[0].requirement = 'confirmed';
  record.eligibility.freshness.reviewDue = '2026-10-10';
  assert.equal(evaluateDocuments(referenceProfile, catalogue, demoContext)[key].outcome, 'unknown');
  record.eligibility.freshness.reviewDue = '2027-01-01';
  record.documents[0].evidence = [];
  assert.equal(evaluateDocuments(referenceProfile, catalogue, demoContext)[key].outcome, 'unknown');
});

test('catalogue replacement preserves exact old records and rejects cross-version submission commits', async () => {
  const input = await inputs();
  const submission = createSubmission(input).submission;
  let state = { ...initialState, ...input, catalogueStatus: 'ready', submission };
  const load = structuredClone(input.catalogueLoad);
  load.catalogue.catalogueVersion = 'demo-2026-10-10.3';
  load.catalogue.schemes[0].recordVersion = 3;
  state = sessionReducer(state, {
    type: 'catalogue-ready',
    load,
    plan: buildQuestionPlan(load.catalogue, { vocab: vocabularies }),
  });
  assert.equal(state.submission.catalogueSnapshot.schemes[0].recordVersion, 2);
  assert.equal(
    state.submission.assessments.find((item) => item.schemeId === 'fx-sch-learning-pathways')
      .schemeVersion,
    2,
  );
  assert.equal(state.catalogueLoad.catalogue.schemes[0].recordVersion, 3);
  assert.notEqual(state.draftRevision, submission.submittedRevision);
  assert.deepEqual(state.presentedFields, []);
  assert.deepEqual(state.draftProfile, {});
  assert.equal(sessionReducer(state, { type: 'submit-success', submission }), state);
});

for (const [domicile, category, expected] of [
  ['IN-AS', 'general', 'potential'],
  ['IN-BR', 'obc', 'potential'],
  ['IN-MH', 'general', 'unmet'],
  ['IN-AS', 'sc', 'unmet'],
  ['unknown', 'general', 'verification'],
  ['IN-AS', 'declined', 'verification'],
  ['', '', 'verification'],
  ['IN-MH', 'declined', 'unmet'],
])
  test(`state/category submission ${domicile || 'blank'}/${category || 'blank'} -> ${expected}`, async () => {
    const input = await inputs();
    const result = createSubmission({
      ...input,
      draftProfile: { ...input.draftProfile, domicile, category },
    });
    assert.equal(result.ok, true);
    const assessment = result.submission.assessments.find(
      ({ schemeId }) => schemeId === 'fx-sch-learning-pathways',
    );
    assert.equal(assessment.status, expected);
    for (const field of ['domicileState', 'category']) {
      const row = assessment.ruleResults.find((rule) => rule.field === field);
      assert.deepEqual(row.providedAnswer, result.submission.profile[field]);
      assert.equal(row.evidence[0].kind, 'fictional-test-condition');
    }
    assert.equal(result.submission.context.catalogueVersion, 'demo-2026-10-10.2');
    assert.equal(assessment.schemeVersion, 2);
  });

test('malformed state/category cannot reach the matching engine', async () => {
  const input = await inputs();
  for (const patch of [{ domicile: 'invented-state' }, { category: 'invented-category' }]) {
    const result = createSubmission(
      { ...input, draftProfile: { ...input.draftProfile, ...patch } },
      { evaluate: () => assert.fail('Invalid codes must never reach assessment') },
    );
    assert.equal(result.ok, false);
  }
});
