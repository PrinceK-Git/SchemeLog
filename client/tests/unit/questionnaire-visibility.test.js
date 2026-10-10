import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fieldsFor,
  visibleSections,
  updateAnswer,
  validateAnswers,
} from '../../src/data/questions.js';
import { buildQuestionPlan } from '../../src/domain/profile/question-plan.js';
import { normalizeProfile } from '../../src/domain/profile/normalize.js';
import { vocabularies as vocab } from '../../src/data/vocabularies.js';
import { PROFILE_FIELDS, ADDITIONAL_FIELDS } from '../../src/domain/profile/fields.js';
import { makeQuestionnaireCatalogue } from '../helpers/questionnaire-catalogue.js';
import { createCatalogueRepository } from '../../src/repositories/catalogue.js';
import { createSubmission } from '../../src/app/submission.js';
import { sessionReducer, initialState } from '../../src/app/session-state.js';

const leaf = (field, rest = {}) => ({
  id: `r-${field.replaceAll('.', '-').toLowerCase()}`,
  operator: 'eq',
  field,
  explanationKey: 'test.visibility',
  ...rest,
});
const leaves = [
  leaf('educationLevel', { value: 'undergraduate' }),
  leaf('courseCode', { value: 'ug-science' }),
  leaf('studyYear', { operator: 'gte', value: 1, unit: 'course-year' }),
  leaf('domicileState', { value: 'IN-AS' }),
  leaf('annualHouseholdIncome', { operator: 'lte', value: 250000, unit: 'INR/year' }),
  leaf('institutionType', { value: 'govt' }),
  leaf('category', { value: 'general' }),
  leaf('academicScore', {
    operator: 'gte',
    value: 0,
    scale: 'percentage',
    context: 'class-12-board',
  }),
  ...Object.keys(ADDITIONAL_FIELDS).map((key) => leaf(`additionalAnswers.${key}`, { value: 'no' })),
];
const tree = { id: 'r-all', operator: 'allOf', explanationKey: 'test.all', children: leaves };
const catalogue = (documentOnly = false) => ({
  catalogueVersion: 'visibility-test',
  schemes: [
    {
      eligibility: { rule: documentOnly ? null : tree },
      documents: documentOnly ? [{ appliesWhen: tree }] : [],
    },
  ],
});
const plan = buildQuestionPlan(catalogue(), { vocab });
const normalize = (draft, currentPlan = plan, presented = currentPlan.draftFieldIds) =>
  normalizeProfile(draft, {
    askedFields: presented.filter((id) => fieldsFor(draft, currentPlan)[id].visible),
    incomeBands: currentPlan.incomeBands,
    vocab,
  });

test('all supported fields and companions are planned equally from eligibility and documents', () => {
  assert.deepEqual(buildQuestionPlan(catalogue(true), { vocab }), plan);
  assert.deepEqual(
    new Set(plan.requiredProfileFields),
    new Set([
      ...Object.keys(PROFILE_FIELDS),
      ...Object.keys(ADDITIONAL_FIELDS).map((key) => `additionalAnswers.${key}`),
    ]),
  );
  assert.equal(new Set(plan.draftFieldIds).size, plan.draftFieldIds.length);
  assert.deepEqual(
    visibleSections({}, plan)
      .flatMap((s) => s.fields)
      .sort(),
    [...plan.draftFieldIds].sort(),
  );
});

for (const parent of ['', 'unknown', 'declined'])
  test(`unknown education/score parents (${parent || 'blank'}) keep planned controls and review rows`, () => {
    const draft = { educationLevel: parent, scoreType: parent };
    const definitions = fieldsFor(draft, plan);
    for (const id of plan.draftFieldIds) assert.equal(definitions[id].visible, true, id);
    assert.ok(definitions.course.options.some(({ value }) => value === 'ug-science'));
    assert.ok(definitions.course.options.some(({ value }) => value === 'pg-science'));
    assert.ok(definitions.studyYear.options.some(({ value }) => value === 'Class 10'));
    assert.ok(definitions.studyYear.options.some(({ value }) => value === 'Year 2'));
    const result = normalize(draft);
    assert.equal(result.ok, true);
    assert.equal(result.profile.courseCode.state, 'unsure');
    assert.equal(result.profile.studyYear.state, 'unsure');
    assert.equal(result.profile.academicScore.state, parent === 'declined' ? 'declined' : 'unsure');
    assert.deepEqual(
      visibleSections(draft, plan).map((s) => s.id),
      ['education', 'location', 'income', 'details'],
    );
  });

test('known school and percentage hide only inapplicable companions; zero normalizes', () => {
  const draft = {
    educationLevel: 'school',
    course: 'school-secondary',
    studyYear: 'Class 10',
    domicile: 'IN-AS',
    income: plan.incomeBands[0].id,
    institution: 'govt',
    category: 'general',
    scoreType: 'percentage',
    score: 0,
    scoreContext: 'class-12-board',
    additionalAnswers: Object.fromEntries(Object.keys(ADDITIONAL_FIELDS).map((key) => [key, 'no'])),
  };
  const definitions = fieldsFor(draft, plan);
  assert.equal(definitions.courseDuration.visible, false);
  assert.equal(definitions.scoreScale.visible, false);
  assert.deepEqual(validateAnswers(draft, undefined, plan), {});
  const result = normalize(draft);
  assert.equal(result.ok, true);
  assert.deepEqual(result.profile.studyYear.value, { stage: 'class-10' });
  assert.deepEqual(result.profile.academicScore.value, {
    value: 0,
    scale: 'percentage',
    context: 'class-12-board',
  });
  for (const field of Object.keys(PROFILE_FIELDS))
    assert.equal(result.profile[field].state, 'known', field);
  for (const answer of Object.values(result.profile.additionalAnswers))
    assert.equal(answer.state, 'known');
});

test('independently supplied context does not guess education or score dimensions', () => {
  const draft = {
    educationLevel: 'declined',
    course: 'ug-science',
    studyYear: 'Year 2',
    courseDuration: '3',
    scoreType: 'unknown',
    score: 0,
    scoreContext: 'class-12-board',
  };
  const result = normalize(draft);
  assert.equal(result.ok, true);
  assert.equal(result.profile.educationLevel.state, 'declined');
  assert.equal(result.profile.courseCode.value, 'ug-science');
  assert.deepEqual(result.profile.studyYear.value, { stage: 2, of: 3 });
  assert.equal(result.profile.academicScore.state, 'unsure');
  assert.equal(
    normalize({ ...draft, scoreType: 'cgpa', scoreScale: 'unknown' }).profile.academicScore.state,
    'unsure',
  );
  assert.equal(normalize({ ...draft, score: 'declined' }).profile.academicScore.state, 'declined');
  assert.equal(
    normalize({ ...draft, courseDuration: 'declined' }).profile.studyYear.state,
    'declined',
  );
});

test('parent changes clear dependent values, not unrelated answers or independent school class', () => {
  const draft = {
    educationLevel: 'undergraduate',
    course: 'ug-science',
    studyYear: 'Year 2',
    courseDuration: '3',
    domicile: 'IN-AS',
    category: 'general',
    scoreType: 'cgpa',
    scoreScale: 'cgpa-4',
    score: 0,
    scoreContext: 'class-12-board',
    additionalAnswers: { receivesOtherScholarship: 'no' },
  };
  const changed = updateAnswer(draft, 'educationLevel', 'declined');
  for (const field of [
    'course',
    'studyYear',
    'courseDuration',
    'scoreType',
    'scoreScale',
    'scoreContext',
    'score',
  ])
    assert.equal(changed[field], undefined);
  for (const field of ['domicile', 'category', 'additionalAnswers'])
    assert.deepEqual(changed[field], draft[field]);
  assert.equal(updateAnswer(draft, 'courseDuration', '1').studyYear, undefined);
  assert.equal(
    updateAnswer(
      { ...draft, educationLevel: 'unknown', studyYear: 'Class 10' },
      'courseDuration',
      'declined',
    ).studyYear,
    'Class 10',
  );
});

test('empty/minimal plans do not collect extra fields and unsupported UI mappings fail explicitly', () => {
  assert.deepEqual(
    visibleSections({}, buildQuestionPlan({ catalogueVersion: 'empty', schemes: [] }, { vocab })),
    [],
  );
  const minimal = buildQuestionPlan(
    {
      catalogueVersion: 'minimal',
      schemes: [
        { eligibility: { rule: { ...tree, children: [leaves[0], leaves[4]] } }, documents: [] },
      ],
    },
    { vocab },
  );
  assert.deepEqual(
    visibleSections({}, minimal).flatMap((s) => s.fields),
    ['educationLevel', 'income'],
  );
  assert.equal(normalize({}, minimal).profile.domicileState.state, 'not-asked');
  assert.throws(
    () => visibleSections({}, { draftFieldIds: ['unimplemented'], incomeBands: [] }),
    /unsupported control/,
  );
});

test('isolated all-fields submission preserves presented states and evaluates document-only answers', async () => {
  const catalogueLoad = await createCatalogueRepository({
    mode: 'demo',
    loaders: { demo: async () => makeQuestionnaireCatalogue('all-fields') },
  }).getCatalogue();
  const questionPlan = buildQuestionPlan(catalogueLoad.catalogue, { vocab });
  let state = sessionReducer(initialState, {
    type: 'catalogue-ready',
    load: catalogueLoad,
    plan: questionPlan,
  });
  // Only education-section controls have actually been presented at this point.
  state = sessionReducer(state, {
    type: 'presented',
    fields: visibleSections({}, questionPlan)[0].fields,
  });
  const partial = createSubmission(state).submission;
  assert.equal(partial.profile.courseCode.state, 'unsure');
  assert.equal(partial.profile.category.state, 'not-asked');
  assert.equal(partial.profile.academicScore.state, 'not-asked');
  for (const section of visibleSections({}, questionPlan))
    state = sessionReducer(state, { type: 'presented', fields: section.fields });
  const blank = createSubmission(state).submission;
  for (const field of Object.keys(PROFILE_FIELDS))
    assert.equal(blank.profile[field].state, 'unsure', field);
  for (const answer of Object.values(blank.profile.additionalAnswers))
    assert.equal(answer.state, 'unsure');

  const draftProfile = {
    educationLevel: 'undergraduate',
    course: 'ug-arts',
    studyYear: 'Year 2',
    courseDuration: '3',
    domicile: 'IN-AS',
    income: questionPlan.incomeBands[0].id,
    institution: 'govt',
    category: 'general',
    scoreType: 'percentage',
    score: 75,
    scoreContext: 'class-12-board',
    additionalAnswers: Object.fromEntries(
      Object.keys(ADDITIONAL_FIELDS).map((key) => [
        key,
        key === 'isRegularFullTimeStudent' ? 'yes' : 'no',
      ]),
    ),
  };
  const known = createSubmission({ ...state, draftProfile }).submission;
  assert.equal(known.assessments[0].status, 'potential');
  assert.equal(Object.values(known.documentApplicability)[0].outcome, 'pass');
  const changed = createSubmission({
    ...state,
    draftProfile: { ...draftProfile, category: 'sc' },
  }).submission;
  assert.equal(changed.assessments[0].status, 'potential');
  assert.equal(Object.values(changed.documentApplicability)[0].outcome, 'fail');
  assert.equal(known.askedFields.includes('scoreScale'), false); // Percentage needs no CGPA scale.
  assert.equal(
    createSubmission({ ...state, draftProfile: { ...draftProfile, email: 'not-allowed' } }).ok,
    false,
  );
});
