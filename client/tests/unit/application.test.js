import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveApplicationStatus } from '../../src/domain/application/status.js';
import { evaluateScheme } from '../../src/domain/eligibility/evaluate.js';
import { context, profile, scheme, freeze } from '../helpers/catalogue.js';

const unknown = () => ({ state: 'unknown', reason: 'not-found' });
const date = (value, precision = 'date', rest = {}) => ({
  value,
  precision,
  timezone: 'Asia/Kolkata',
  cycle: '2026-27',
  checkedAt: '2026-10-01',
  evidence: ['src-demo-income#loc-condition'],
  ...rest,
});
const application = (rest = {}) => ({
  ...scheme().application,
  opens: date('2026-10-09'),
  closes: date('2026-10-11'),
  ...rest,
});
const ctx = (rest = {}) => context({ currentCycle: '2026-27', ...rest });
const status = (app, options = ctx()) => deriveApplicationStatus(app, options);

for (const [name, app, expected] of [
  ['inside dates', application(), 'open'],
  [
    'before opening',
    application({ opens: date('2026-10-11'), closes: date('2026-10-12') }),
    'upcoming',
  ],
  [
    'after closing',
    application({ opens: date('2026-10-08'), closes: date('2026-10-09') }),
    'closed',
  ],
  ['on closing day', application({ closes: date('2026-10-10') }), 'unknown'],
  ['on opening day', application({ opens: date('2026-10-10') }), 'unknown'],
  ['only past opening', application({ closes: unknown() }), 'unknown'],
  ['only future closing', application({ opens: unknown() }), 'unknown'],
  [
    'only future opening',
    application({ opens: date('2026-10-11'), closes: unknown() }),
    'upcoming',
  ],
  ['only past closing', application({ opens: unknown(), closes: date('2026-10-09') }), 'closed'],
  ['both dates unknown', application({ opens: unknown(), closes: unknown() }), 'unknown'],
])
  test(`application ${name} => ${expected}`, () => assert.equal(status(app).status, expected));

test('exact instant half-open window and offset equivalence', () => {
  const app = application({
    opens: date('2026-10-10T12:00:00+05:30', 'datetime'),
    closes: date('2026-10-10T13:00:00+05:30', 'datetime'),
  });
  assert.equal(status(app).status, 'open');
  assert.equal(status(app, ctx({ evaluatedAt: '2026-10-10T06:30:00Z' })).status, 'open');
  assert.equal(status(app, ctx({ evaluatedAt: '2026-10-10T13:00:00+05:30' })).status, 'closed');
  assert.equal(status(app, ctx({ evaluatedAt: '2026-10-10T11:59:59+05:30' })).status, 'upcoming');
});

test('date-only deadlines remain dates, without invented countdowns or closing times', () => {
  const app = application({ closes: date('2026-10-10') });
  for (const evaluatedAt of ['2026-10-09T18:30:00Z', '2026-10-10T18:29:59Z']) {
    const result = status(app, ctx({ evaluatedAt }));
    assert.equal(result.reasonCode, 'application_boundary_ambiguous');
    assert.equal(result.closes.value, '2026-10-10');
    assert.equal(result.closes.precision, 'date');
    assert.equal('countdown' in result, false);
  }
  assert.equal(status(app, ctx({ evaluatedAt: '2026-10-10T18:30:00Z' })).status, 'closed');
});

test('cycle, freshness and timezone prerequisites are explicit', () => {
  assert.equal(status(application(), context()).reasonCode, 'application_cycle_unknown');
  assert.equal(
    status(application(), ctx({ currentCycle: '2025-26' })).reasonCode,
    'application_cycle_mismatch',
  );
  assert.equal(
    status(application({ closes: date('2026-10-11', 'date', { cycle: '2025-26' }) })).reasonCode,
    'application_cycle_mismatch',
  );
  for (const state of ['unknown', 'review-due', 'superseded'])
    assert.equal(
      status(application({ freshness: { ...scheme().application.freshness, state } })).reasonCode,
      'application_stale',
    );
  assert.equal(
    status(
      application({ freshness: { ...scheme().application.freshness, reviewDue: '2026-10-10' } }),
    ).reasonCode,
    'application_stale',
  );
  assert.equal(
    status(application({ closes: date('2026-10-11', 'date', { checkedAt: '2026-10-11' }) }))
      .reasonCode,
    'application_stale',
  );
  for (const timezone of [undefined, 'UTC', 'Europe/London'])
    assert.equal(
      status(application({ closes: date('2026-10-11', 'date', { timezone }) })).reasonCode,
      'application_timezone_unknown',
    );
  assert.equal(
    status(application({ opens: date('2026-10-09', 'date', { cycle: undefined }) })).status,
    'open',
  );
});

test('current notices resolve uncertainty; old notices do not stay open indefinitely', () => {
  const notice = {
    status: 'open',
    evidence: ['src-demo-income#loc-condition'],
    checkedAt: '2026-10-10',
  };
  const app = application({ opens: unknown(), closes: unknown(), statusOverride: notice });
  assert.equal(status(app).status, 'open');
  assert.equal(status(app).reasonCode, 'application_notice_current');
  for (const checkedAt of ['2026-10-09', '2026-10-11'])
    assert.equal(status({ ...app, statusOverride: { ...notice, checkedAt } }).status, 'unknown');
  assert.equal(
    status({ ...app, statusOverride: { ...notice, status: 'closed' } }).status,
    'closed',
  );
  assert.equal(
    status(application({ closes: date('2026-10-10'), statusOverride: notice })).status,
    'open',
  );
  assert.equal(
    status(application({ statusOverride: { ...notice, status: 'closed' } })).reasonCode,
    'application_evidence_conflict',
  );
});

test('invalid application data is rejected rather than converted to honest uncertainty', () => {
  for (const app of [
    null,
    {},
    application({ opens: date('2026-02-30') }),
    application({ closes: date('2026-10-08') }),
    application({ opens: date('2026-10-10T12:00:00', 'datetime') }),
    application({ statusOverride: { status: 'open', evidence: [], checkedAt: '2026-10-10' } }),
  ])
    assert.throws(() => status(app));
});

test('application status is immutable and cannot change eligibility', () => {
  const record = scheme();
  record.application = application({ opens: date('2026-10-08'), closes: date('2026-10-09') });
  const closed = evaluateScheme(profile(), record, context());
  assert.equal(closed.status, 'potential');
  assert.equal(closed.applicationStatus.status, 'closed');
  record.application = scheme().application;
  const unavailable = evaluateScheme(profile(), record, context());
  assert.equal(unavailable.status, 'potential');
  assert.equal(unavailable.applicationStatus.status, 'unknown');
  assert.deepEqual(closed.ruleResults, unavailable.ruleResults);
  const app = freeze(application());
  const options = freeze(ctx());
  assert.deepEqual(status(app, options), status(app, options));
});

test('empty exact windows reject; mixed date precision never fabricates a closing instant', () => {
  const instant = date('2026-10-10T12:00:00Z', 'datetime');
  assert.throws(() => status(application({ opens: instant, closes: instant })));
  const mixed = application({
    opens: date('2026-10-09T12:00:00Z', 'datetime'),
    closes: date('2026-10-10'),
  });
  assert.equal(status(mixed).reasonCode, 'application_boundary_ambiguous');
  const unsupported = application({ opens: date('2026-10-09', 'date', { timezone: 'UTC' }) });
  assert.equal(status(unsupported).reasonCode, 'application_timezone_unknown');
});
