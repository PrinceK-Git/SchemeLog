import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCatalogue, collectIncomeThresholds } from '../../scripts/build-catalogue.mjs';
import { checkRegistry } from '../../scripts/validate-registry.mjs';
import { loadSchemeRecords } from '../../scripts/validate-catalogue.mjs';

const registry = { registryVersion: 1, userAgent: 'SchemelogTest/1.0', hosts: {}, entries: [] };
const release = { catalogueVersion: '2026-10-10.1', publishedAt: '2026-10-10T00:00:00+05:30' };
const options = { registry, release, evaluatedAt: '2026-10-10' };

test('unreviewed real drafts never reach the offline published bundle', () => {
  const records = loadSchemeRecords().map((e) => e.record);
  const result = buildCatalogue(records, options);
  assert.equal(result.coverage.schemeCount, 0);
  assert.deepEqual(result.schemes, []);
  assert.match(result.coverage.statement, /No real scholarships/);
  assert.deepEqual(result, buildCatalogue(records, options));
});

test('publication cannot bypass the reviewed URL registry', () => {
  const record = loadSchemeRecords()[0].record;
  record.publicationStatus = 'published';
  assert.equal(checkRegistry(registry, [record]).ok, false);
  assert.throws(() => buildCatalogue([record], options), /missing from registry/);
});

test('income bands use actual published thresholds, not illustrative limits', () => {
  assert.deepEqual(collectIncomeThresholds([]), []);
  const records = loadSchemeRecords().map((e) => e.record);
  assert.deepEqual(collectIncomeThresholds(records), [350000, 450000, 800000]);
});

test('build code does not import source fetching or extraction', () => {
  const code = readFileSync(new URL('../../scripts/build-catalogue.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(code, /import .*sources\/(fetch|extract)\.mjs/);
});
