import { demoCatalogue, demoContext, referenceProfile } from '../../src/data/demo-catalogue.js';

export const known = (value) => ({ state: 'known', value });
export const context = (overrides = {}) => ({ ...structuredClone(demoContext), ...overrides });
export const profile = (overrides = {}) => ({ ...structuredClone(referenceProfile), ...overrides });
export const scheme = () => structuredClone(demoCatalogue.schemes[0]);
export const leaf = (overrides = {}) => ({
  id: 'r-test',
  operator: 'eq',
  field: 'educationLevel',
  value: 'undergraduate',
  explanationKey: 'test.level',
  evidence: ['src-demo-undergraduate#loc-condition'],
  ...overrides,
});
export const interval = (min, max, minInclusive = true, maxInclusive = max !== null) => ({
  min,
  max,
  minInclusive,
  maxInclusive,
  currency: 'INR',
  period: 'year',
});
export function freeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}
