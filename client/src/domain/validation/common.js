export const isObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
export const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Boundary errors never contain supplied profile values. */
export class DomainValidationError extends Error {
  constructor(code, issues) {
    super(`Invalid domain input (${code}).`);
    this.name = 'DomainValidationError';
    this.code = code;
    this.issues = [...issues].sort(
      (a, b) => compareText(a.path, b.path) || compareText(a.code, b.code),
    );
  }
}

export function assertValid(code, issues) {
  if (issues.length) throw new DomainValidationError(code, issues);
}

export const issue = (path, code, message) => ({ path, code, message });
export const clone = (value) => structuredClone(value);

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function validInstant(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  )
    return false;
  if (!validDate(value.slice(0, 10))) return false;
  const parts = value.match(/T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/);
  return (
    Number(parts[1]) < 24 &&
    Number(parts[2]) < 60 &&
    Number(parts[3]) < 60 &&
    (parts[4] === 'Z' || (Number(parts[5]) < 24 && Number(parts[6]) < 60)) &&
    Number.isFinite(Date.parse(value))
  );
}

export const validRefs = (refs) =>
  Array.isArray(refs) &&
  Array.from(refs).every(
    (ref) => typeof ref === 'string' && /^src-[a-z0-9-]+(?:#loc-[a-z0-9-]+)?$/.test(ref),
  );

export function freshnessIssues(value, path) {
  if (!isObject(value)) return [issue(path, 'freshness-shape', 'Freshness is required.')];
  const errors = [];
  if (
    Object.keys(value).some(
      (key) => !['state', 'checkedAt', 'checkedBy', 'reviewDue'].includes(key),
    ) ||
    !['current', 'unknown', 'review-due', 'superseded'].includes(value.state) ||
    !validDate(value.checkedAt) ||
    typeof value.checkedBy !== 'string' ||
    !value.checkedBy.trim() ||
    ('reviewDue' in value && !validDate(value.reviewDue))
  )
    errors.push(issue(path, 'freshness-shape', 'Freshness metadata is malformed.'));
  return errors;
}
