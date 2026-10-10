import { schemes } from '../data/fixtures.js';

// Replace this adapter with reviewed records and the matching engine in later phases.
export async function getCatalogue(scenario = 'complete') {
  if (scenario === 'error') throw new Error('The demo catalogue could not be loaded.');
  if (scenario === 'empty') return [];
  return schemes.map((scheme) => ({ ...scheme }));
}
export function getScheme(slug) {
  return schemes.find((scheme) => scheme.id === slug) || null;
}
