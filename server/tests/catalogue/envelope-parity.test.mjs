import test from 'node:test';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import catalogueSchema from '../../src/domain/validation/schema/catalogue.schema.json' with { type: 'json' };
import schemeSchema from '../../src/domain/validation/schema/scheme.schema.json' with { type: 'json' };
import catalogue from '../../src/data/catalogue.json' with { type: 'json' };
import { validateCatalogueEnvelope } from '../../../client/src/domain/validation/catalogue.js';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schemeSchema);
const schema = ajv.compile(catalogueSchema);

test('pure browser envelope checks agree with the server JSON schema on envelope shape cases', () => {
  const cases = [
    ['empty published envelope', () => {}, true],
    [
      'optional quarantine absent',
      (value) => {
        delete value.coverage.quarantined;
      },
      true,
    ],
    [
      'quarantine summary',
      (value) => {
        value.coverage.quarantined = [
          { id: 'sch-withheld', reason: 'Pending independent review.' },
        ];
      },
      true,
    ],
    [
      'offset instant',
      (value) => {
        value.publishedAt = '2026-10-10T12:15:00Z';
      },
      true,
    ],
    [
      'missing required field',
      (value) => {
        delete value.publishedAt;
      },
      false,
    ],
    [
      'extraneous root field',
      (value) => {
        value.extra = true;
      },
      false,
    ],
    [
      'invalid version syntax',
      (value) => {
        value.catalogueVersion = 'latest';
      },
      false,
    ],
    [
      'invalid publication date',
      (value) => {
        value.publishedAt = '2026-02-30T12:00:00Z';
      },
      false,
    ],
    [
      'invalid clock time',
      (value) => {
        value.publishedAt = '2026-10-10T25:00:00Z';
      },
      false,
    ],
    [
      'no timestamp timezone',
      (value) => {
        value.publishedAt = '2026-10-10T12:00:00';
      },
      false,
    ],
    [
      'coverage absent',
      (value) => {
        delete value.coverage;
      },
      false,
    ],
    [
      'coverage extra',
      (value) => {
        value.coverage.extra = true;
      },
      false,
    ],
    [
      'coverage missing count',
      (value) => {
        delete value.coverage.schemeCount;
      },
      false,
    ],
    [
      'negative count',
      (value) => {
        value.coverage.schemeCount = -1;
      },
      false,
    ],
    [
      'fractional count',
      (value) => {
        value.coverage.schemeCount = 0.5;
      },
      false,
    ],
    [
      'no domains',
      (value) => {
        value.coverage.domains = [];
      },
      false,
    ],
    [
      'unsupported domain',
      (value) => {
        value.coverage.domains = ['housing'];
      },
      false,
    ],
    [
      'invalid jurisdictions',
      (value) => {
        value.coverage.jurisdictions = ['Assam'];
      },
      false,
    ],
    [
      'nonstring education level',
      (value) => {
        value.coverage.educationLevels = [null];
      },
      false,
    ],
    [
      'short statement',
      (value) => {
        value.coverage.statement = 'short';
      },
      false,
    ],
    [
      'HTML statement',
      (value) => {
        value.coverage.statement += '<script>';
      },
      false,
    ],
    [
      'malformed quarantine array',
      (value) => {
        value.coverage.quarantined = {};
      },
      false,
    ],
    [
      'quarantine field absent',
      (value) => {
        value.coverage.quarantined = [{ id: 'sch-test' }];
      },
      false,
    ],
    [
      'quarantine field extra',
      (value) => {
        value.coverage.quarantined = [{ id: 'sch-test', reason: 'Review', extra: 1 }];
      },
      false,
    ],
    [
      'unsafe quarantine reason',
      (value) => {
        value.coverage.quarantined = [{ id: 'sch-test', reason: '<unsafe>' }];
      },
      false,
    ],
    [
      'nonarray schemes',
      (value) => {
        value.schemes = null;
      },
      false,
    ],
  ];
  for (const [name, mutate, expected] of cases) {
    const input = structuredClone(catalogue);
    mutate(input);
    assert.equal(schema(input), expected, `${name}: server schema`);
    assert.equal(validateCatalogueEnvelope(input).ok, expected, `${name}: browser envelope`);
  }
  for (const input of [null, [], {}, 'catalogue']) {
    assert.equal(schema(input), false);
    assert.equal(validateCatalogueEnvelope(input).ok, false);
  }
});

test('runtime semantic checks intentionally narrow schema acceptance, not claim full schema parity', () => {
  for (const mutate of [
    (value) => {
      value.schemaVersion = '2.0.0';
    },
    (value) => {
      value.vocabVersion = '2.0.0';
    },
    (value) => {
      value.catalogueVersion = '2026-02-30.1';
    },
    (value) => {
      value.coverage.schemeCount = 1;
    },
  ]) {
    const input = structuredClone(catalogue);
    mutate(input);
    assert.equal(schema(input), true);
    assert.equal(validateCatalogueEnvelope(input).ok, false);
  }
});
