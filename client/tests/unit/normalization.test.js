import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfile } from '../../src/domain/profile/normalize.js';
import { validateProfile } from '../../src/domain/validation/profile.js';
import { vocabularies as vocab } from '../../src/data/vocabularies.js';

const interval = {
  min: 0,
  max: 100000,
  minInclusive: true,
  maxInclusive: true,
  currency: 'INR',
  period: 'year',
};
const incomeBands = [{ id: 'demo-low', value: interval }];
const normalize = (draft, askedFields = Object.keys(draft)) =>
  normalizeProfile(draft, { askedFields, incomeBands, vocab });
const known = (value) => ({ state: 'known', value });

test('strict normalization maps exact legacy labels and copies active-mode intervals', () => {
  const draft = {
    domicile: 'Assam',
    educationLevel: 'diploma',
    course: 'Technical diploma',
    income: 'demo-low',
    institution: 'Private',
    category: 'SC',
    studyYear: 'Class 10',
  };
  const before = structuredClone(draft);
  const result = normalize(draft);
  assert.equal(result.ok, true);
  assert.deepEqual(result.profile.domicileState, known('IN-AS'));
  assert.deepEqual(result.profile.educationLevel, known('diploma-technical'));
  assert.deepEqual(result.profile.courseCode, known('diploma-technical'));
  assert.deepEqual(result.profile.institutionType, known('private-other'));
  assert.deepEqual(result.profile.category, known('sc'));
  assert.deepEqual(result.profile.studyYear, known({ stage: 'class-10' }));
  assert.deepEqual(result.profile.annualHouseholdIncome, known(interval));
  assert.notEqual(result.profile.annualHouseholdIncome.value, interval);
  assert.deepEqual(draft, before);
  assert.deepEqual(normalize(draft), result);
});

test('unknown, declined, blanks and not presented retain distinct answer states', () => {
  const result = normalize(
    { domicile: 'unknown', income: 'declined', category: '', institution: 'Government' },
    ['domicile', 'income', 'category'],
  );
  assert.equal(result.ok, true);
  assert.equal(result.profile.domicileState.state, 'unsure');
  assert.equal(result.profile.annualHouseholdIncome.state, 'declined');
  assert.equal(result.profile.category.state, 'unsure');
  assert.equal(result.profile.institutionType.state, 'not-asked');
  const score = normalize({
    scoreType: 'percentage',
    score: '   ',
    scoreContext: 'class-12-board',
  });
  assert.equal(score.profile.academicScore.state, 'unsure');
  for (const field of ['scoreContext', 'scoreScale']) {
    const declined = normalize({
      scoreType: 'cgpa',
      score: '3',
      scoreScale: 'cgpa-4',
      scoreContext: 'previous-year',
      [field]: 'declined',
    });
    assert.equal(declined.ok, true);
    assert.equal(declined.profile.academicScore.state, 'declined');
  }
  assert.equal(
    normalize({ studyYear: 'Year 2', courseDuration: 'declined' }).profile.studyYear.state,
    'declined',
  );
});

test('valid ambiguous courses, duration and score metadata need clarification rather than guesses', () => {
  const result = normalize({
    course: 'Science',
    studyYear: 'Year 2',
    scoreType: 'percentage',
    score: '80',
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.mappingIssues.map((issue) => issue.code).sort(), [
    'ambiguous_course',
    'missing_context',
    'missing_duration',
  ]);
  for (const field of ['courseCode', 'studyYear', 'academicScore'])
    assert.equal(result.profile[field].state, 'unsure');
  const cgpa = normalize({ scoreType: 'cgpa' });
  assert.equal(cgpa.profile.academicScore.state, 'unsure');
  assert.equal(cgpa.mappingIssues[0].code, 'missing_scale');
  for (const studyYear of ['Other class', 'Year 5 or later']) {
    const ambiguous = normalize({ studyYear });
    assert.equal(ambiguous.ok, true);
    assert.equal(ambiguous.mappingIssues[0].code, 'ambiguous_stage');
  }
});

test('explicit numeric companions yield typed known values without conversion', () => {
  const result = normalize({
    studyYear: 'Year 2',
    courseDuration: '4',
    scoreType: 'percentage',
    score: '0',
    scoreContext: 'class-12-board',
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.profile.studyYear, known({ stage: 2, of: 4 }));
  assert.deepEqual(
    result.profile.academicScore,
    known({ value: 0, scale: 'percentage', context: 'class-12-board' }),
  );
  const cgpa = normalize({
    scoreType: 'cgpa',
    scoreScale: 'cgpa-4',
    score: '3.5',
    scoreContext: 'previous-year',
  });
  assert.equal(cgpa.ok, true);
  assert.equal(cgpa.profile.academicScore.value.value, 3.5);
  assert.equal(cgpa.profile.academicScore.value.scale, 'cgpa-4');
});

test('undeclared fields and malformed hidden values cannot be filtered into validity', () => {
  for (const draft of [
    { email: 'private' },
    { metadata: { aadhaar: 'private' } },
    { domicile: 'Invented' },
    { income: 'under-1' },
    { category: 'invented' },
    { score: '0x10' },
    { score: false },
    { score: 'Infinity' },
    { score: '101' },
    { scoreType: 'cgpa', scoreScale: 'cgpa-4', score: '5' },
    { scoreType: 'percentage', scoreScale: 'cgpa-4', score: '3' },
    { courseDuration: '2.5' },
    { studyYear: { stage: 2 } },
    { academicScore: known({ value: 80, scale: 'percentage' }) },
    { additionalAnswers: { email: known('private') } },
    { category: { state: 'unsure', value: 'sc' } },
    { category: { state: 'known', value: () => 'sc' } },
    { category: Object.create({ state: 'known', value: 'sc' }) },
    { income: { ...interval, max: null, maxInclusive: true } },
  ])
    assert.equal(normalize(draft, []).ok, false, JSON.stringify(draft));
  assert.equal(normalizeProfile({}, { incomeBands, vocab }).ok, false);
  for (const scoreScale of ['percentage', 'percentile']) {
    const draft = { scoreType: 'cgpa', scoreScale, score: '3', scoreContext: 'previous-year' };
    assert.equal(normalize(draft).ok, false);
    assert.equal(normalize(draft, []).ok, false);
  }
  assert.equal(normalize({ domicile: 'Assam', domicileState: known('IN-AS') }).ok, false);
  assert.equal(normalize(Object.create({ domicile: 'Assam' }), ['domicile']).ok, false);
});

test('typed canonical answers and declared additional answers are checked, not coerced', () => {
  const result = normalize({
    domicileState: known('IN-AS'),
    additionalAnswers: { receivesOtherScholarship: 'no' },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.profile.additionalAnswers.receivesOtherScholarship, known('no'));
  assert.equal(validateProfile(result.profile, { vocab }).ok, true);
  for (const profile of [
    { profileVersion: 2 },
    { profileVersion: 1, annualHouseholdIncome: known({ ...interval, max: null }) },
    {
      profileVersion: 1,
      academicScore: known({ value: NaN, scale: 'percentage', context: 'previous-year' }),
    },
  ])
    assert.equal(validateProfile(profile, { vocab }).ok, false);
  assert.equal(validateProfile({ profileVersion: 1 }).ok, false);
});
