import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationDisplay } from '../../src/presentation/application.js';

test('application trust failures withhold raw endpoint dates without hiding same-day precision', () => {
  const application = {
    status: 'unknown',
    reasonCode: 'application_boundary_ambiguous',
    closes: { value: '2026-10-10', precision: 'date', timezone: 'Asia/Kolkata' },
  };
  assert.match(applicationDisplay(application).deadline, /2026-10-10 \(date only/);
  assert.doesNotMatch(applicationDisplay(application).deadline, /00:00|23:59/);
  for (const reasonCode of [
    'application_stale',
    'application_cycle_unknown',
    'application_cycle_mismatch',
    'application_timezone_unknown',
    'application_evidence_conflict',
  ]) {
    const view = applicationDisplay({ ...application, reasonCode });
    assert.equal(view.deadlineConfirmed, false);
    assert.equal(view.deadline, 'Unknown — no confirmed deadline');
  }
  assert.equal(applicationDisplay(null).status, 'Unknown — check current information');
  assert.equal(applicationDisplay(null).deadlineConfirmed, false);
  assert.match(
    applicationDisplay({
      status: 'open',
      reasonCode: 'application_open',
      closes: { value: '2026-10-10T12:00:00+05:30', precision: 'datetime' },
    }).deadline,
    /12:00:00\+05:30 \(exact instant\)/,
  );
});
