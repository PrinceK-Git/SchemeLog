import test from 'node:test';
import assert from 'node:assert/strict';
import reviewedCatalogue from '../../src/data/catalogue.json' with { type: 'json' };
import { demoCatalogue } from '../../src/data/demo-catalogue.js';
import {
  createCatalogueRepository,
  getCatalogue,
  getScheme,
} from '../../src/repositories/catalogue.js';
import { validateCatalogueEnvelope } from '../../src/domain/validation/catalogue.js';

const injected = (mode, value) =>
  createCatalogueRepository({ mode, loaders: { [mode]: async () => value } });

test('default repository selects declarative demo, detaches/freezes snapshots and searches only explicit slugs', async () => {
  const first = await getCatalogue();
  const second = await getCatalogue();
  assert.equal(first.mode, 'demo');
  assert.equal(first.catalogue.schemes.length, 4);
  assert.equal(first.coverage, first.catalogue.coverage);
  assert.deepEqual(first.quarantined, []);
  assert.notEqual(first.catalogue, demoCatalogue);
  assert.notEqual(first.catalogue, second.catalogue);
  assert.equal(Object.isFrozen(first.catalogue.schemes[0].eligibility), true);
  assert.throws(() => {
    first.catalogue.schemes[0].officialName = 'changed';
  }, TypeError);
  assert.equal(getScheme('demo-learning-pathways', first.catalogue).id, 'fx-sch-learning-pathways');
  assert.equal(getScheme('demo-learning-pathways', first).recordVersion, 2);
  assert.equal(getScheme('learning-pathways', first.catalogue), null);
  assert.equal(getScheme('demo-learning-pathways'), null);
  assert.ok(first.catalogue.schemes.every((record) => !('status' in record)));
});

test('reviewed empty envelopes disclose quarantine without falling back or rewriting counts', async () => {
  const input = structuredClone(reviewedCatalogue);
  input.coverage.quarantined.push({
    id: 'sch-withheld-test',
    reason: 'Withheld pending genuine independent review.',
  });
  let demoCalls = 0;
  const repository = createCatalogueRepository({
    mode: 'reviewed',
    loaders: {
      reviewed: async () => input,
      demo: async () => {
        demoCalls++;
        return demoCatalogue;
      },
    },
  });
  const result = await repository.getCatalogue();
  assert.equal(result.mode, 'reviewed');
  assert.deepEqual(result.catalogue.schemes, []);
  assert.deepEqual(result.coverage, input.coverage);
  assert.equal(result.quarantined.length, 1);
  assert.equal(demoCalls, 0);
  assert.deepEqual(
    (await injected('reviewed', reviewedCatalogue).getCatalogue()).catalogue,
    reviewedCatalogue,
  );
});

test('selected-mode errors are whole-load errors, retryable, with no alternate loader calls', async () => {
  let demoCalls = 0;
  let attempts = 0;
  const repository = createCatalogueRepository({
    mode: 'reviewed',
    loaders: {
      reviewed: async () => {
        if (++attempts === 1) throw new Error('Selected load failed');
        return reviewedCatalogue;
      },
      demo: async () => {
        demoCalls++;
        return demoCatalogue;
      },
    },
  });
  await assert.rejects(repository.getCatalogue(), /Selected load failed/);
  assert.equal((await repository.getCatalogue()).coverage.schemeCount, 0);
  assert.equal(demoCalls, 0);
  assert.throws(() => createCatalogueRepository({ mode: 'automatic' }), TypeError);
  await assert.rejects(injected('reviewed', demoCatalogue).getCatalogue());
  await assert.rejects(injected('demo', reviewedCatalogue).getCatalogue());
});

test('invalid selected records never become filtered successes or quarantine entries', async () => {
  for (const mutate of [
    (catalogue) => {
      catalogue.extra = true;
    },
    (catalogue) => {
      catalogue.schemes[1].id = catalogue.schemes[0].id;
    },
    (catalogue) => {
      catalogue.schemes[1].slug = catalogue.schemes[0].slug;
    },
    (catalogue) => {
      catalogue.schemes[0].eligibility.rule.children[0].evidence = ['src-missing'];
    },
    (catalogue) => {
      catalogue.schemes[0].documents[0].appliesWhen.operator = 'invented';
    },
    (catalogue) => {
      catalogue.schemes[0].id = 'sch-wrong-mode';
    },
    (catalogue) => {
      catalogue.schemes[0].summary = { unsafe: 'object' };
    },
    (catalogue) => {
      catalogue.schemes[0].documents[0].notes = ['not text'];
    },
    (catalogue) => {
      catalogue.schemes[0].benefits = [{ amount: 10000 }];
    },
    (catalogue) => {
      catalogue.schemes[0].authority = 'Invented official authority';
    },
    (catalogue) => {
      catalogue.schemes[0].applicationSteps = 'not an array';
    },
    (catalogue) => {
      catalogue.coverage.statement = '<script>unsafe</script>';
    },
    (catalogue) => {
      catalogue.coverage.quarantined = [{ id: 'x', reason: 'injected' }];
    },
  ]) {
    const input = structuredClone(demoCatalogue);
    mutate(input);
    await assert.rejects(injected('demo', input).getCatalogue(), { name: 'DomainValidationError' });
  }
});

test('valid empty demo is an empty snapshot rather than a rejection', async () => {
  const input = structuredClone(demoCatalogue);
  input.schemes = [];
  input.coverage.schemeCount = 0;
  assert.deepEqual((await injected('demo', input).getCatalogue()).catalogue.schemes, []);
});

test('reviewed envelope checks actual dates, supported versions, exact keys and count equality', async () => {
  assert.equal(validateCatalogueEnvelope(reviewedCatalogue).ok, true);
  for (const mutate of [
    (value) => {
      delete value.publishedAt;
    },
    (value) => {
      value.extra = true;
    },
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
      value.publishedAt = '2026-02-30T00:00:00+05:30';
    },
    (value) => {
      value.coverage.schemeCount = 1;
    },
    (value) => {
      value.coverage.schemeCount = -1;
    },
    (value) => {
      value.coverage.quarantined = [{ id: 'sch-test', reason: {}, extra: 1 }];
    },
    (value) => {
      value.coverage.jurisdictions = ['not-a-state'];
    },
    (value) => {
      value.coverage.educationLevels = [null];
    },
    (value) => {
      value.coverage.domains = [];
    },
    (value) => {
      value.coverage.statement = 'short';
    },
  ]) {
    const input = structuredClone(reviewedCatalogue);
    mutate(input);
    assert.equal(validateCatalogueEnvelope(input).ok, false);
    await assert.rejects(injected('reviewed', input).getCatalogue());
  }
});
