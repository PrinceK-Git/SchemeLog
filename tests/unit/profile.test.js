import test from 'node:test';
import assert from 'node:assert/strict';
import {
  answerLabel,
  fieldsFor,
  normalizeProfile,
  updateAnswer,
  validateAnswers,
  visibleSections,
} from '../../src/data/questions.js';
import { getCatalogue, getScheme } from '../../src/repositories/catalogue.js';

test('changing study level clears dependent answers but preserves unrelated personal choices', () => {
  const initial = {
    educationLevel: 'undergraduate',
    course: 'Science',
    studyYear: 'Year 2',
    scoreType: 'percentage',
    score: '80',
    domicile: 'Assam',
    income: 'declined',
  };
  const updated = updateAnswer(initial, 'educationLevel', 'school');
  assert.deepEqual(updated, { educationLevel: 'school', domicile: 'Assam', income: 'declined' });
  assert.equal(initial.score, '80');
});
test('CGPA is not silently converted and changing score format clears a percentage', () => {
  const updated = updateAnswer(
    { educationLevel: 'undergraduate', scoreType: 'percentage', score: '85' },
    'scoreType',
    'cgpa',
  );
  assert.equal(updated.score, undefined);
  assert.equal(fieldsFor(updated).score.visible, false);
});
test('unknown and declined answers are supported without replacing them with known values', () => {
  assert.deepEqual(validateAnswers({ educationLevel: 'unknown', income: 'declined' }), {});
  assert.equal(answerLabel({}, 'income'), 'Not answered');
  assert.equal(answerLabel({ income: 'declined' }, 'income'), 'Prefer not to answer');
  assert.equal(fieldsFor({ educationLevel: 'unknown' }).course.visible, false);
});
test('percentage validation handles exact boundaries, invalid values, and missing information', () => {
  const profile = { educationLevel: 'undergraduate', scoreType: 'percentage' };
  for (const score of ['0', '100', '75.5', ''])
    assert.deepEqual(validateAnswers({ ...profile, score }), {});
  for (const score of ['-1', '101', 'invalid', 'Infinity'])
    assert.ok(validateAnswers({ ...profile, score }).score);
});
test('normalization discards unknown fields and hidden answers', () => {
  assert.deepEqual(
    normalizeProfile({
      educationLevel: 'school',
      domicile: 'Assam',
      score: '80',
      scoreType: 'percentage',
      unexpected: 'remove',
    }),
    { educationLevel: 'school', domicile: 'Assam' },
  );
  assert.ok(validateAnswers({ educationLevel: 'undergraduate', course: 'invented-course' }).course);
});
test('visible sections keep nondependent answers available for an unknown education level', () => {
  const sections = visibleSections({ educationLevel: 'unknown' });
  assert.deepEqual(sections[0].fields, ['educationLevel']);
  assert.ok(sections.some((s) => s.fields.includes('income')));
  assert.ok(sections.some((s) => s.fields.includes('category')));
});
test('catalogue adapter supplies every preview category and explicitly handles empty/error scenarios', async () => {
  const records = await getCatalogue();
  assert.deepEqual(
    new Set(records.map((s) => s.status)),
    new Set(['potential', 'verification', 'unmet', 'unavailable']),
  );
  assert.equal(new Set(records.map((s) => s.id)).size, records.length);
  assert.deepEqual(await getCatalogue('empty'), []);
  await assert.rejects(getCatalogue('error'), /could not be loaded/);
  assert.equal(getScheme('missing'), null);
  assert.equal(getScheme(records[0].id).id, records[0].id);
});
