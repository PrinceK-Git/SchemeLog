import test from 'node:test';
import assert from 'node:assert/strict';
import { explanationContext, explanationReason } from '../../src/presentation/explanation.js';

test('optional nested failures and exclusions are qualified without changing domain outcomes', () => {
  const parent = { operator: 'anyOf', outcome: 'pass' };
  const nested = { operator: 'allOf', outcome: 'fail', reasonCode: 'mandatory_condition_failed' };
  const context = explanationContext(parent, nested);
  assert.equal(context, 'alternative');
  assert.match(
    explanationReason(nested, 'demo', context),
    /^Within this optional alternative only:/,
  );
  assert.match(explanationReason(nested, 'demo', context), /this branch is not required/);
  assert.equal(explanationContext(parent, { outcome: 'pass' }), null);
  assert.equal(explanationContext(nested, { outcome: 'fail' }, context), 'alternative');
  const exclusion = explanationContext({ operator: 'not' }, nested);
  assert.equal(exclusion, 'exclusion');
  assert.match(explanationReason(nested, 'demo', exclusion), /parent exclusion determines/);
  assert.equal(explanationReason(nested, 'demo'), 'A mandatory condition is not satisfied.');
  assert.equal(nested.outcome, 'fail');
});
