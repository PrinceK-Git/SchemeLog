import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveFreshness, kolkataDate } from '../../src/domain/freshness.js';
import { evaluateScheme } from '../../src/domain/eligibility/evaluate.js';
import { context, profile, scheme, known } from '../helpers/catalogue.js';

for (const state of ['unknown', 'review-due', 'superseded'])
  test(`untrusted section ${state} overrides current leaves and cannot establish failure`, () => {
    const record = scheme();
    record.eligibility.rule.children[0].freshness = { ...record.eligibility.freshness };
    record.eligibility.freshness.state = state;
    for (const educationLevel of [known('undergraduate'), known('school')]) {
      const result = evaluateScheme(profile({ educationLevel }), record, context());
      assert.equal(result.status, 'verification');
      assert.ok(result.ruleResults.every((row) => row.outcome === 'unknown'));
      assert.ok(result.dataWarnings.length);
      assert.deepEqual(result.missingFields, []);
    }
  });

test('leaf staleness is inherited, but unrelated trusted failure remains decisive', () => {
  const record = scheme();
  record.eligibility.rule.children[1].freshness = {
    ...record.eligibility.freshness,
    state: 'unknown',
  };
  assert.equal(evaluateScheme(profile(), record, context()).status, 'verification');
  const failed = evaluateScheme(profile({ educationLevel: known('school') }), record, context());
  assert.equal(failed.status, 'unmet');
  assert.ok(failed.dataWarnings.some((warning) => warning.code === 'fact_unknown'));
  record.eligibility.rule.operator = 'anyOf';
  assert.equal(evaluateScheme(profile(), record, context()).status, 'potential');
  record.eligibility.rule.freshness = { ...record.eligibility.freshness, state: 'superseded' };
  assert.equal(evaluateScheme(profile(), record, context()).status, 'verification');
});

for (const [reviewDue, expected] of [
  ['2026-10-09', 'verification'],
  ['2026-10-10', 'verification'],
  ['2026-10-11', 'potential'],
])
  test(`review due ${reviewDue} against Oct 10`, () => {
    const record = scheme();
    record.eligibility.freshness.reviewDue = reviewDue;
    assert.equal(evaluateScheme(profile(), record, context()).status, expected);
  });

test('Kolkata midnight boundary, injected clock and future checkedAt', () => {
  const before = context({ evaluatedAt: '2026-10-09T18:29:59Z' });
  const midnight = context({ evaluatedAt: '2026-10-09T18:30:00Z' });
  assert.equal(kolkataDate(before.evaluatedAt), '2026-10-09');
  assert.equal(kolkataDate(midnight.evaluatedAt), '2026-10-10');
  const freshness = {
    ...scheme().eligibility.freshness,
    checkedAt: '2026-10-01',
    reviewDue: '2026-10-10',
  };
  assert.equal(effectiveFreshness(freshness, before).state, 'current');
  assert.equal(effectiveFreshness(freshness, midnight).state, 'review-due');
  assert.equal(
    effectiveFreshness({ ...freshness, checkedAt: '2026-10-11' }, midnight).state,
    'unknown',
  );
  assert.throws(() => kolkataDate('2026-02-30T00:00:00Z'));
  assert.throws(() => kolkataDate('2026-10-10T24:00:00Z'));
});

test('informational flag never bypasses stale predicate uncertainty', () => {
  const record = scheme();
  record.eligibility.rule.children[0].material = false;
  record.eligibility.rule.children[0].freshness = {
    ...record.eligibility.freshness,
    state: 'unknown',
  };
  assert.equal(evaluateScheme(profile(), record, context()).status, 'verification');
});
