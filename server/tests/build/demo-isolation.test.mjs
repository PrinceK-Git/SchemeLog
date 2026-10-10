import test from 'node:test';
import assert from 'node:assert/strict';
import { demoCatalogue } from '../../../client/src/data/demo-catalogue.js';
import { validateCatalogue } from '../../src/domain/validation/validateCatalogue.js';
import { buildCatalogue } from '../../scripts/build-catalogue.mjs';

test('demo records fail real publication even when publicationStatus is changed', () => {
  for (const publicationStatus of ['draft', 'published']) {
    const records = demoCatalogue.schemes.map((record) => ({
      ...structuredClone(record),
      publicationStatus,
    }));
    const report = validateCatalogue(records, { evaluatedAt: '2026-10-10' });
    assert.equal(report.ok, false);
    assert.deepEqual(report.publishable, []);
    assert.throws(() =>
      buildCatalogue(records, {
        registry: { registryVersion: 1, userAgent: 'SchemeLog test', hosts: {}, entries: [] },
        release: { catalogueVersion: 'test', publishedAt: '2026-10-10T00:00:00+05:30' },
        evaluatedAt: '2026-10-10',
      }),
    );
  }
});
