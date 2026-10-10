import {
  assertValid,
  clone,
  freshnessIssues,
  isObject,
  issue,
  validDate,
  validInstant,
  validRefs,
} from '../validation/common.js';
import { assertContext } from '../validation/context.js';
import { effectiveFreshness, kolkataDate } from '../freshness.js';

const unknownReasons = ['not-found', 'source-conflict', 'needs-interpretation', 'stale'];
export const isUnknownDate = (value) => isObject(value) && value.state === 'unknown';

/** Structural checks are separate from uncertainty about otherwise valid facts. */
export function validateApplication(application, path = 'application') {
  if (!isObject(application))
    return [issue(path, 'application-shape', 'Application section is required.')];
  const errors = freshnessIssues(application.freshness, `${path}.freshness`);
  const add = (where, code, message) => errors.push(issue(`${path}.${where}`, code, message));
  if (
    Object.keys(application).some(
      (key) => !['cycle', 'opens', 'closes', 'statusOverride', 'freshness'].includes(key),
    )
  )
    add('', 'application-shape', 'Unexpected application property.');
  if (typeof application.cycle !== 'string' || !application.cycle.trim())
    add('cycle', 'cycle-shape', 'Application cycle is required.');
  for (const key of ['opens', 'closes']) {
    const endpoint = application[key];
    if (isUnknownDate(endpoint)) {
      if (
        !unknownReasons.includes(endpoint.reason) ||
        Object.keys(endpoint).some((name) => !['state', 'reason'].includes(name))
      )
        add(key, 'date-shape', 'Unknown date is malformed.');
      continue;
    }
    if (
      !isObject(endpoint) ||
      Object.keys(endpoint).some(
        (name) =>
          !['value', 'precision', 'timezone', 'cycle', 'evidence', 'checkedAt'].includes(name),
      ) ||
      !['date', 'datetime'].includes(endpoint.precision) ||
      !(endpoint.precision === 'date' ? validDate(endpoint.value) : validInstant(endpoint.value)) ||
      !validDate(endpoint.checkedAt) ||
      !validRefs(endpoint.evidence) ||
      endpoint.evidence.length === 0 ||
      (endpoint.timezone !== undefined && typeof endpoint.timezone !== 'string') ||
      (endpoint.cycle !== undefined &&
        (typeof endpoint.cycle !== 'string' || !endpoint.cycle.trim()))
    )
      add(key, 'date-shape', 'Date endpoint is malformed.');
  }
  const notice = application.statusOverride;
  if (
    notice !== undefined &&
    (!isObject(notice) ||
      Object.keys(notice).some((key) => !['status', 'evidence', 'checkedAt'].includes(key)) ||
      !['open', 'closed'].includes(notice.status) ||
      !validRefs(notice.evidence) ||
      !notice.evidence.length ||
      !validDate(notice.checkedAt))
  )
    add('statusOverride', 'notice-shape', 'Status notice is malformed.');
  if (!errors.length && !isUnknownDate(application.opens) && !isUnknownDate(application.closes)) {
    // A date represents an uncertain instant within a day, not a manufactured deadline.
    // Do not assign a timezone merely to perform this structural ordering check.
    const range = (endpoint) => {
      if (endpoint.precision === 'datetime')
        return [Date.parse(endpoint.value), Date.parse(endpoint.value)];
      if (endpoint.timezone !== 'Asia/Kolkata') return null;
      const start = Date.parse(`${endpoint.value}T00:00:00+05:30`);
      return [start, start + 86400000];
    };
    const opening = range(application.opens);
    const closing = range(application.closes);
    if (opening && closing && opening[0] >= closing[1])
      add('', 'date-order', 'Application window is reversed or empty.');
  }
  return errors;
}

/** Dates/notices must already have resolved record-level evidence. No cycle is inferred. */
export function deriveApplicationStatus(application, context) {
  assertContext(context);
  assertValid('application', validateApplication(application));
  const result = (status, reasonCode, evidence = []) => ({
    status,
    reasonCode,
    cycle: application.cycle,
    opens: clone(application.opens),
    closes: clone(application.closes),
    evidence: [...new Set(evidence)],
  });
  const unknown = (reason) => result('unknown', reason);
  if (!context.currentCycle) return unknown('application_cycle_unknown');
  if (context.currentCycle !== application.cycle) return unknown('application_cycle_mismatch');
  if (effectiveFreshness(application.freshness, context).state !== 'current')
    return unknown('application_stale');
  const today = kolkataDate(context.evaluatedAt);
  const now = Date.parse(context.evaluatedAt);
  const endpoints = [application.opens, application.closes];
  for (const endpoint of endpoints) {
    if (isUnknownDate(endpoint)) continue;
    if (endpoint.cycle !== undefined && endpoint.cycle !== application.cycle)
      return unknown('application_cycle_mismatch');
    if (endpoint.checkedAt > today) return unknown('application_stale');
    if (endpoint.precision === 'date' && endpoint.timezone !== 'Asia/Kolkata')
      return unknown('application_timezone_unknown');
  }
  // -1: before the endpoint, 0: ambiguous calendar day, 1: on/after exact instant or after day.
  const position = (endpoint) => {
    if (isUnknownDate(endpoint)) return null;
    if (endpoint.precision === 'datetime') return now < Date.parse(endpoint.value) ? -1 : 1;
    return today < endpoint.value ? -1 : today > endpoint.value ? 1 : 0;
  };
  const opening = position(application.opens);
  const closing = position(application.closes);
  let status = 'unknown';
  let reason =
    opening === 0 || closing === 0 ? 'application_boundary_ambiguous' : 'application_dates_unknown';
  let evidence = [];
  if (opening === -1) {
    status = 'upcoming';
    evidence = application.opens.evidence;
  } else if (closing === 1) {
    status = 'closed';
    evidence = application.closes.evidence;
  } else if (opening === 1 && closing === -1) {
    status = 'open';
    evidence = [...application.opens.evidence, ...application.closes.evidence];
  }
  if (status !== 'unknown') reason = `application_${status}`;
  const notice = application.statusOverride;
  if (notice && notice.checkedAt === today) {
    if (status !== 'unknown' && status !== notice.status)
      return unknown('application_evidence_conflict');
    return result(notice.status, 'application_notice_current', notice.evidence);
  }
  return result(status, reason, evidence);
}
