import { assertValid, freshnessIssues, validInstant, issue } from './validation/common.js';

/** Calendar dates are always derived from the injected instant, never the host timezone. */
export function kolkataDate(evaluatedAt) {
  assertValid(
    'context',
    validInstant(evaluatedAt)
      ? []
      : [issue('evaluatedAt', 'timestamp', 'An ISO instant with offset is required.')],
  );
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(evaluatedAt));
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function isReviewDue(reviewDue, date) {
  return Boolean(reviewDue && reviewDue <= date);
}

/** An inherited untrusted state cannot be upgraded by a child. */
export function effectiveFreshness(freshness, context, inherited = null) {
  if (freshness !== undefined && freshness !== null)
    assertValid('freshness', freshnessIssues(freshness, 'freshness'));
  if (inherited && inherited.state !== 'current') return { ...inherited };
  if (!freshness)
    return inherited ? { ...inherited } : { state: 'unknown', reasonCode: 'fact_unknown' };
  const date = kolkataDate(context.evaluatedAt);
  let state = freshness.state;
  if (freshness.checkedAt > date) state = 'unknown';
  else if (state === 'current' && isReviewDue(freshness.reviewDue, date)) state = 'review-due';
  return {
    state,
    reasonCode: {
      current: null,
      unknown: 'fact_unknown',
      'review-due': 'fact_review_due',
      superseded: 'fact_superseded',
    }[state],
  };
}
