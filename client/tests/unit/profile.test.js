import test from 'node:test';
import assert from 'node:assert/strict';
import {
  answerLabel,
  fieldsFor,
  getDraftAnswer,
  updateAnswer,
  validateAnswers,
  visibleSections,
} from '../../src/data/questions.js';
import { demoCatalogue } from '../../src/data/demo-catalogue.js';
import { vocabularies as vocab } from '../../src/data/vocabularies.js';
import { buildQuestionPlan } from '../../src/domain/profile/question-plan.js';
import { normalizeProfile } from '../../src/domain/profile/normalize.js';

const plan = buildQuestionPlan(demoCatalogue, { vocab });
const companionPlan = {
  catalogueVersion: 'test-controls',
  incomeBands: plan.incomeBands,
  draftFieldIds: [
    'educationLevel',
    'course',
    'studyYear',
    'courseDuration',
    'income',
    'domicile',
    'institution',
    'category',
    'scoreType',
    'scoreScale',
    'score',
    'scoreContext',
    'additionalAnswers.receivesOtherScholarship',
  ],
};
const normalize = (draft, currentPlan = companionPlan) =>
  normalizeProfile(draft, {
    askedFields: Object.entries(fieldsFor(draft, currentPlan))
      .filter(([, field]) => field.visible)
      .map(([id]) => id),
    incomeBands: currentPlan.incomeBands,
    vocab,
  });

test('changing study level clears dependent answers but preserves unrelated choices and the input', () => {
  const initial = {
    educationLevel: 'undergraduate',
    course: 'ug-science',
    studyYear: 'Year 2',
    courseDuration: '4',
    scoreType: 'percentage',
    score: '80',
    scoreScale: 'percentage',
    scoreContext: 'previous-year',
    domicile: 'IN-AS',
    income: 'declined',
  };
  const updated = updateAnswer(initial, 'educationLevel', 'school');
  assert.deepEqual(updated, { educationLevel: 'school', domicile: 'IN-AS', income: 'declined' });
  assert.equal(initial.score, '80');
  assert.deepEqual(updateAnswer(initial, 'educationLevel', 'undergraduate'), initial);
});

test('CGPA never converts a percentage, and scale/context edits clear the old score', () => {
  const updated = updateAnswer(
    { educationLevel: 'undergraduate', scoreType: 'percentage', score: '85' },
    'scoreType',
    'cgpa',
  );
  assert.equal(updated.score, undefined);
  assert.equal(fieldsFor(updated, companionPlan).score.visible, false);
  assert.equal(fieldsFor(updated, companionPlan).scoreScale.visible, true);
  const scaled = { ...updated, scoreScale: 'cgpa-4', score: '3.5', scoreContext: 'previous-year' };
  assert.equal(fieldsFor(scaled, companionPlan).score.max, 4);
  assert.equal(normalize(scaled).profile.academicScore.value.value, 3.5);
  for (const [field, value] of [
    ['scoreScale', 'cgpa-10'],
    ['scoreContext', 'class-12-board'],
  ])
    assert.equal(updateAnswer(scaled, field, value).score, undefined);
});

test('unknown, declined, unanswered and numeric zero remain distinct', () => {
  assert.deepEqual(
    validateAnswers({ educationLevel: 'unknown', income: 'declined' }, undefined, plan),
    {},
  );
  assert.equal(answerLabel({}, 'income', plan), 'Not answered');
  assert.equal(answerLabel({ income: 'declined' }, 'income', plan), 'Prefer not to answer');
  const draft = { scoreType: 'percentage', score: 0, scoreContext: 'previous-year' };
  assert.equal(answerLabel(draft, 'score', companionPlan), '0%');
  assert.equal(normalize(draft).profile.academicScore.value.value, 0);
});

test('numeric controls use actual scale ranges and reject coercible nondecimal values', () => {
  for (const [scoreType, scoreScale, upper] of [
    ['percentage', undefined, 100],
    ['percentile', undefined, 100],
    ['cgpa', 'cgpa-4', 4],
    ['cgpa', 'cgpa-10', 10],
  ]) {
    const draft = { scoreType, scoreScale, scoreContext: 'previous-year' };
    for (const score of ['0', String(upper), '0.5', ''])
      assert.deepEqual(validateAnswers({ ...draft, score }, undefined, companionPlan), {});
    for (const score of ['-1', String(upper + 1), 'invalid', 'Infinity', '0x10', '1e1', false])
      assert.ok(validateAnswers({ ...draft, score }, undefined, companionPlan).score);
  }
  assert.ok(
    validateAnswers(
      { educationLevel: 'undergraduate', courseDuration: '2.5' },
      undefined,
      companionPlan,
    ).courseDuration,
  );
});

test('strict normalization rejects undeclared and malformed hidden data instead of filtering it', () => {
  assert.equal(normalize({ educationLevel: 'school', unexpected: 'reject' }, plan).ok, false);
  assert.equal(normalize({ educationLevel: 'school', score: 'invalid' }, plan).ok, false);
  const validHidden = normalize(
    {
      educationLevel: 'school',
      scoreType: 'percentage',
      score: '80',
      scoreContext: 'previous-year',
    },
    plan,
  );
  assert.equal(validHidden.ok, true);
  assert.equal(validHidden.profile.academicScore.state, 'not-asked');
  assert.ok(
    validateAnswers(
      { educationLevel: 'undergraduate', course: 'invented-course' },
      undefined,
      companionPlan,
    ).course,
  );
  assert.throws(() => updateAnswer({}, 'additionalAnswers.email', 'private'), TypeError);
});

test('current demo includes only catalogue-relevant questions even when study level is unknown', () => {
  assert.deepEqual(
    visibleSections({ educationLevel: 'unknown' }, plan).map((section) => section.fields),
    [['educationLevel'], ['income']],
  );
  assert.deepEqual(visibleSections({}, { draftFieldIds: [], incomeBands: [] }), []);
  assert.deepEqual(visibleSections({}), []);
  for (const id of ['domicile', 'course', 'category', 'institution', 'scoreType'])
    assert.equal(fieldsFor({ educationLevel: 'undergraduate' }, plan)[id].visible, false);
});

test('exact course, diploma, school year and institution choices normalize without invented recognition', () => {
  const draft = {
    educationLevel: 'diploma',
    course: 'diploma-technical',
    institution: 'private-other',
    domicile: 'IN-AS',
  };
  const result = normalize(draft);
  assert.equal(result.ok, true);
  assert.equal(result.profile.educationLevel.value, 'diploma-technical');
  assert.equal(result.profile.institutionType.value, 'private-other');
  assert.equal(result.profile.courseCode.value, 'diploma-technical');
  const course = fieldsFor({ educationLevel: 'undergraduate' }, companionPlan).course;
  assert.ok(course.options.some((entry) => entry.value === 'ug-science'));
  assert.ok(
    !course.options.some((entry) => entry.value === 'Science' || entry.value === 'pg-science'),
  );
  assert.equal(
    normalize({ educationLevel: 'school', studyYear: 'Class 10' }).profile.studyYear.value.stage,
    'class-10',
  );
  assert.deepEqual(
    normalize({ educationLevel: 'undergraduate', studyYear: 'Year 2', courseDuration: '4' }).profile
      .studyYear.value,
    { stage: 2, of: 4 },
  );
  assert.equal(
    normalize({ educationLevel: 'undergraduate', studyYear: 'Year 2' }).profile.studyYear.state,
    'unsure',
  );
});

test('declared dotted answers use nested storage, independent copies and exact yes/no options', () => {
  const draft = { additionalAnswers: { receivesOtherScholarship: 'yes' }, income: 'declined' };
  const next = updateAnswer(draft, 'additionalAnswers.receivesOtherScholarship', 'no');
  assert.equal(getDraftAnswer(next, 'additionalAnswers.receivesOtherScholarship'), 'no');
  assert.equal(draft.additionalAnswers.receivesOtherScholarship, 'yes');
  assert.equal(next.income, 'declined');
  assert.equal(
    answerLabel(next, 'additionalAnswers.receivesOtherScholarship', companionPlan),
    'No',
  );
  assert.equal(normalize(next).profile.additionalAnswers.receivesOtherScholarship.value, 'no');
});
