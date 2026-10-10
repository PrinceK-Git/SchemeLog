// Infinity is internal only. Public profiles/results always use max: null.
const end = (interval) => (interval.max === null ? Infinity : interval.max);
const before = (a, b) =>
  end(a) < b.min || (end(a) === b.min && !(a.maxInclusive && b.minInclusive));

export function compareInterval(interval, rule) {
  let satisfying;
  switch (rule.operator) {
    case 'lt':
    case 'lte':
      satisfying = {
        min: -Infinity,
        max: rule.value,
        minInclusive: false,
        maxInclusive: rule.operator === 'lte',
      };
      break;
    case 'gt':
    case 'gte':
      satisfying = {
        min: rule.value,
        max: null,
        minInclusive: rule.operator === 'gte',
        maxInclusive: false,
      };
      break;
    case 'between':
      satisfying = rule;
      break;
    default:
      throw new TypeError('Unsupported interval operator.');
  }
  if (before(interval, satisfying) || before(satisfying, interval)) return 'fail';
  const lowerContained =
    interval.min > satisfying.min ||
    (interval.min === satisfying.min && (!interval.minInclusive || satisfying.minInclusive));
  const upperContained =
    end(interval) < end(satisfying) ||
    (end(interval) === end(satisfying) && (!interval.maxInclusive || satisfying.maxInclusive));
  return lowerContained && upperContained ? 'pass' : 'unknown';
}

export function compareNumber(value, rule) {
  return compareInterval({ min: value, max: value, minInclusive: true, maxInclusive: true }, rule);
}
