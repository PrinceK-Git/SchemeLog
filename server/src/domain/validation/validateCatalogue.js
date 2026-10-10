import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { loadVocabularies } from './vocab.js';
import { validateRule, OPERATORS } from '../../../../client/src/domain/validation/rules.js';
import { isReviewDue } from '../../../../client/src/domain/freshness.js';
import { PROFILE_FIELDS } from '../../data/question-fields.js';

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = join(here, 'schema');
const readSchema = (name) => JSON.parse(readFileSync(join(SCHEMA_DIR, name), 'utf8'));

export const schemeSchema = readSchema('scheme.schema.json');
export const catalogueSchema = readSchema('catalogue.schema.json');
export const registrySchema = readSchema('registry.schema.json');

export { OPERATORS };
const BRANCHES = new Set(['allOf', 'anyOf']);

function buildAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  ajv.addSchema(schemeSchema);
  ajv.addSchema(catalogueSchema);
  ajv.addSchema(registrySchema);
  return ajv;
}

const ajv = buildAjv();
const validateSchemeSchema = ajv.getSchema(schemeSchema.$id);
const validateCatalogueSchema = ajv.getSchema(catalogueSchema.$id);
export const validateRegistrySchema = ajv.getSchema(registrySchema.$id);

const finding = (severity, layer, check, schemeId, path, message) => ({
  severity,
  layer,
  check,
  schemeId,
  path,
  message,
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PLACEHOLDER_DATES = new Set(['0000-00-00', '1970-01-01', '9999-12-31']);
const HTML_TAG = /<[^>]*>/;

/** Walk a rule tree depth-first, yielding `[node, path]`. */
function* walkRule(node, path = 'rule') {
  if (!node || typeof node !== 'object') return;
  yield [node, path];
  if (Array.isArray(node.children)) {
    for (const [index, child] of node.children.entries())
      yield* walkRule(child, `${path}.children[${index}]`);
  }
  if (node.child) yield* walkRule(node.child, `${path}.child`);
}

/** Every rule tree on a record: eligibility plus conditional-document rules. */
function* recordRuleTrees(record) {
  if (record.eligibility?.rule) yield [record.eligibility.rule, 'eligibility.rule'];
  for (const [index, document] of (record.documents || []).entries()) {
    if (document.appliesWhen) yield [document.appliesWhen, `documents[${index}].appliesWhen`];
  }
}

/** Collect every string a record carries, with its JSON path. */
function* walkStrings(value, path = '') {
  if (typeof value === 'string') yield [value, path];
  else if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) yield* walkStrings(item, `${path}[${index}]`);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value))
      yield* walkStrings(item, path ? `${path}.${key}` : key);
  }
}

/* ------------------------------------------------------- layer 1: schema */

function schemaLayer(record, index, findings) {
  const id = typeof record?.id === 'string' ? record.id : null;
  if (!validateSchemeSchema(record)) {
    for (const error of validateSchemeSchema.errors) {
      findings.push(
        finding(
          'reject',
          'schema',
          'schema',
          id,
          `schemes[${index}]${error.instancePath}`,
          `${error.message}${error.params?.allowedValues ? ` (allowed: ${error.params.allowedValues.join(', ')})` : ''}`,
        ),
      );
    }
    return false;
  }
  return true;
}

/* -------------------------------------------------- layer 2: referential */

function referentialLayer(record, vocab, findings) {
  const id = record.id;
  const push = (severity, check, path, message) =>
    findings.push(finding(severity, 'referential', check, id, path, message));

  // Vocabulary codes on the record itself.
  if (Array.isArray(record.applicableStates)) {
    for (const [index, code] of record.applicableStates.entries()) {
      if (!vocab.codes.states.has(code))
        push('reject', 'vocab-code', `applicableStates[${index}]`, `Unknown state code "${code}".`);
    }
  }
  for (const [index, document] of (record.documents || []).entries()) {
    if (!vocab.codes['document-types'].has(document.type))
      push(
        'reject',
        'vocab-code',
        `documents[${index}].type`,
        `Unknown document type "${document.type}".`,
      );
  }

  // Source, locator, rule, link, and benefit identifier uniqueness.
  const sourceIds = new Set();
  const evidenceTargets = new Set();
  for (const [index, source] of record.sources.entries()) {
    if (sourceIds.has(source.id))
      push('reject', 'duplicate-id', `sources[${index}].id`, `Duplicate source id "${source.id}".`);
    sourceIds.add(source.id);
    evidenceTargets.add(source.id);
    const locatorIds = new Set();
    for (const locator of source.locators || []) {
      if (locatorIds.has(locator.id))
        push(
          'reject',
          'duplicate-id',
          `sources[${index}].locators`,
          `Duplicate locator id "${locator.id}".`,
        );
      locatorIds.add(locator.id);
      evidenceTargets.add(`${source.id}#${locator.id}`);
    }
  }

  for (const list of [
    ['links', record.links],
    ['benefits', record.benefits],
    ['documents', record.documents],
  ]) {
    const [name, items] = list;
    const seen = new Set();
    for (const [index, item] of (items || []).entries()) {
      if (seen.has(item.id))
        push('reject', 'duplicate-id', `${name}[${index}].id`, `Duplicate id "${item.id}".`);
      seen.add(item.id);
    }
  }

  const ruleIds = new Set();
  for (const [tree, treePath] of recordRuleTrees(record)) {
    for (const [node, path] of walkRule(tree, treePath)) {
      if (ruleIds.has(node.id))
        push('reject', 'duplicate-id', `${path}.id`, `Duplicate rule id "${node.id}".`);
      ruleIds.add(node.id);
    }
  }

  // Every evidence reference must resolve to a source, or a source#locator.
  const checkEvidence = (refs, path) => {
    for (const [index, ref] of (refs || []).entries()) {
      const target = ref.replace('#', '#');
      if (!evidenceTargets.has(target))
        push(
          'quarantine',
          'dangling-evidence',
          `${path}[${index}]`,
          `Evidence "${ref}" does not resolve to a source or locator on this record.`,
        );
    }
  };
  checkEvidence(record.eligibility.evidence, 'eligibility.evidence');
  for (const [index, benefit] of record.benefits.entries())
    checkEvidence(benefit.evidence, `benefits[${index}].evidence`);
  for (const [index, document] of record.documents.entries())
    checkEvidence(document.evidence, `documents[${index}].evidence`);
  for (const [index, step] of (record.applicationSteps || []).entries())
    checkEvidence(step.evidence, `applicationSteps[${index}].evidence`);
  for (const key of ['opens', 'closes']) {
    const value = record.application[key];
    if (value && value.state !== 'unknown')
      checkEvidence(value.evidence, `application.${key}.evidence`);
  }
  if (record.application.statusOverride)
    checkEvidence(
      record.application.statusOverride.evidence,
      'application.statusOverride.evidence',
    );
  for (const [tree, treePath] of recordRuleTrees(record)) {
    for (const [node, path] of walkRule(tree, treePath))
      checkEvidence(node.evidence, `${path}.evidence`);
  }
}

/* ----------------------------------------------------- layer 3: semantic */

function semanticRules(record, vocab, push) {
  const seenIds = new Set();
  for (const [tree, path] of recordRuleTrees(record)) {
    for (const issue of validateRule(tree, { vocab, path, seenIds }).errors) {
      // Identifier duplicates retain their existing referential-layer finding.
      if (issue.code !== 'duplicate-id') push('reject', issue.code, issue.path, issue.message);
    }
  }
}

function semanticCoverage(record, push) {
  if (record.eligibility.coverage !== 'unusable' && record.eligibility.rule === null)
    push(
      'reject',
      'empty-rule-tree',
      'eligibility.rule',
      `coverage "${record.eligibility.coverage}" requires a rule tree; only "unusable" may have none.`,
    );
  if (record.eligibility.coverage === 'unusable' && record.eligibility.rule !== null)
    push(
      'quarantine',
      'coverage-consistency',
      'eligibility.rule',
      'coverage "unusable" must not carry a rule tree.',
    );
  if (
    record.eligibility.coverage === 'complete' &&
    /not found|could not (be )?(find|locate)|material condition missing/i.test(
      record.eligibility.notes || '',
    )
  )
    push(
      'quarantine',
      'coverage-consistency',
      'eligibility.notes',
      'coverage "complete" contradicts notes that record a material condition as not found.',
    );
}

function semanticEvidence(record, push) {
  for (const [index, benefit] of record.benefits.entries()) {
    if (benefit.amount.state !== 'unknown' && (benefit.evidence || []).length === 0)
      push(
        'quarantine',
        'missing-evidence',
        `benefits[${index}].evidence`,
        'A benefit amount must cite at least one source.',
      );
  }
  for (const key of ['opens', 'closes']) {
    const value = record.application[key];
    if (value?.state !== 'unknown' && (value?.evidence || []).length === 0)
      push(
        'quarantine',
        'missing-evidence',
        `application.${key}.evidence`,
        'A published application date must cite at least one source.',
      );
  }
  for (const [tree, treePath] of recordRuleTrees(record)) {
    for (const [node, path] of walkRule(tree, treePath)) {
      const isLeaf = !BRANCHES.has(node.operator) && node.operator !== 'not';
      if (isLeaf && node.material !== false && (node.evidence || []).length === 0)
        push(
          'quarantine',
          'missing-evidence',
          `${path}.evidence`,
          `Material rule "${node.id}" has no evidence reference.`,
        );
    }
  }
}

function semanticLinks(record, push) {
  if (!record.links.some((link) => link.status === 'verified'))
    push(
      'quarantine',
      'no-verified-link',
      'links',
      'A published record needs at least one link with status "verified".',
    );
  for (const [index, link] of record.links.entries()) {
    if (!link.url.startsWith('https://'))
      push('quarantine', 'insecure-url', `links[${index}].url`, 'Links must use HTTPS.');
    if (link.purpose === 'application' && link.url.includes('?'))
      push(
        'quarantine',
        'url-query-params',
        `links[${index}].url`,
        'An application link must not carry query parameters, which can leak user data.',
      );
  }
  for (const [index, source] of record.sources.entries()) {
    if (!source.url.startsWith('https://'))
      push('quarantine', 'insecure-url', `sources[${index}].url`, 'Sources must use HTTPS.');
  }
}

function semanticContent(record, push) {
  const { opens, closes } = record.application;
  if (
    opens?.state !== 'unknown' &&
    closes?.state !== 'unknown' &&
    Date.parse(opens.value) > Date.parse(closes.value)
  )
    push(
      'quarantine',
      'date-order',
      'application',
      `"opens" (${opens.value}) is after "closes" (${closes.value}).`,
    );

  for (const [value, path] of walkStrings(record)) {
    if (/(^|\.)(value|closes|opens|edition|title|summary)$/.test(path) && value.trim() === '')
      push(
        'reject',
        'placeholder-unknown',
        path,
        'An unknown fact must be an Unknown object, never an empty string.',
      );
    if (ISO_DATE.test(value) && PLACEHOLDER_DATES.has(value))
      push(
        'reject',
        'placeholder-unknown',
        path,
        `"${value}" is a placeholder date; use an Unknown object instead.`,
      );
    if (HTML_TAG.test(value))
      push('reject', 'html-content', path, `String contains an HTML tag: ${value.slice(0, 60)}`);
  }

  for (const [index, benefit] of record.benefits.entries()) {
    if (benefit.amount.state !== 'unknown' && benefit.amount.value === 0)
      push(
        'reject',
        'placeholder-unknown',
        `benefits[${index}].amount.value`,
        'An unknown amount must be an Unknown object, not 0.',
      );
  }

  if (record.id.startsWith('fx-') && record.publicationStatus === 'published')
    push(
      'reject',
      'fixture-in-catalogue',
      'id',
      'Fixture records (id starting "fx-") must never appear in the published catalogue.',
    );
}

function semanticFreshness(record, options, push) {
  const checkFreshness = (freshness, path) => {
    if (!freshness?.reviewDue) return;
    if (isReviewDue(freshness.reviewDue, options.evaluatedAt))
      push(
        'warn',
        'review-due-passed',
        `${path}.reviewDue`,
        `reviewDue ${freshness.reviewDue} has passed; dependent facts evaluate as review-due.`,
      );
  };
  checkFreshness(record.eligibility.freshness, 'eligibility.freshness');
  checkFreshness(record.application.freshness, 'application.freshness');
  for (const [index, benefit] of record.benefits.entries())
    checkFreshness(benefit.freshness, `benefits[${index}].freshness`);

  const curator = record.verification.curatedBy.trim().toLowerCase();
  const reviewer = record.verification.reviewedBy?.trim().toLowerCase();
  const placeholderReviewer =
    /^(unknown|none|null|n\/a|pending|unreviewed|not[- ]reviewed|ai(?:[- ].*)?|automated(?:[- ].*)?)$/i;
  if (!reviewer || placeholderReviewer.test(reviewer) || !record.verification.reviewedAt)
    push(
      'quarantine',
      'no-second-review',
      'verification.reviewedBy',
      'A published record needs a second reviewer; nobody publishes their own material claims.',
    );
  else if (reviewer === curator) {
    push(
      options.strictReview ? 'reject' : 'warn',
      'self-review',
      'verification.reviewedBy',
      'The reviewer is the same person as the curator.',
    );
    push(
      'quarantine',
      'no-second-review',
      'verification.reviewedBy',
      'Self-review cannot satisfy the independent publication review gate.',
    );
  }

  // Addendum §6: a stale source hash makes dependent facts review-due.
  for (const [index, source] of record.sources.entries()) {
    const latest = options.snapshotHashes?.[source.id];
    if (latest && source.textSha256 && latest !== source.textSha256)
      push(
        'warn',
        'source-changed',
        `sources[${index}].textSha256`,
        `The latest snapshot of ${source.id} has a different text hash; dependent facts are review-due until a curator re-checks them.`,
      );
    if (latest && !source.textSha256)
      push(
        'warn',
        'source-hash-missing',
        `sources[${index}]`,
        `A snapshot exists for ${source.id} but the record has no textSha256; record it so change detection can work.`,
      );
  }
}

function semanticLayer(record, vocab, options, findings) {
  const push = (severity, check, path, message) =>
    findings.push(finding(severity, 'semantic', check, record.id, path, message));
  semanticRules(record, vocab, push);
  semanticCoverage(record, push);
  semanticEvidence(record, push);
  semanticLinks(record, push);
  semanticContent(record, push);
  semanticFreshness(record, options, push);
}

/* ------------------------------------------------------------ public API */

/**
 * Validate a set of scheme records in three layers and sort every finding into
 * reject, quarantine, or warn (§10). Deterministic: the same input always
 * produces an identically ordered report.
 *
 * @param {object[]} records
 * @param {{
 *   evaluatedAt?: string,
 *   strictReview?: boolean,
 *   vocab?: ReturnType<typeof loadVocabularies>,
 *   snapshotHashes?: Record<string, string>
 * }} [options]
 * @returns {import('../types.js').ValidationReport}
 */
export function validateCatalogue(records, options = {}) {
  if (!Array.isArray(records)) {
    const issue = finding(
      'reject',
      'schema',
      'schema',
      null,
      'schemes',
      'Catalogue records must be an array.',
    );
    return {
      ok: false,
      findings: [issue],
      rejects: [issue],
      quarantines: [],
      warnings: [],
      quarantinedIds: [],
      publishable: [],
    };
  }
  const settings = {
    evaluatedAt: options.evaluatedAt ?? new Date().toISOString().slice(0, 10),
    strictReview: options.strictReview ?? false,
    snapshotHashes: options.snapshotHashes ?? {},
  };
  const vocab = options.vocab ?? loadVocabularies();
  const findings = [];

  // Cross-record referential checks first, so a duplicate is reported once.
  const seenIds = new Map();
  const seenSlugs = new Map();
  for (const [index, record] of records.entries()) {
    if (typeof record?.id !== 'string' || typeof record?.slug !== 'string') continue;
    if (seenIds.has(record.id))
      findings.push(
        finding(
          'reject',
          'referential',
          'duplicate-scheme-id',
          record.id,
          `schemes[${index}].id`,
          `Scheme id "${record.id}" is already used by schemes[${seenIds.get(record.id)}].`,
        ),
      );
    else seenIds.set(record.id, index);
    if (seenSlugs.has(record.slug))
      findings.push(
        finding(
          'reject',
          'referential',
          'duplicate-slug',
          record.id,
          `schemes[${index}].slug`,
          `Slug "${record.slug}" is already used by schemes[${seenSlugs.get(record.slug)}].`,
        ),
      );
    else seenSlugs.set(record.slug, index);
  }

  for (const [index, record] of records.entries()) {
    if (!schemaLayer(record, index, findings)) continue;
    referentialLayer(record, vocab, findings);
    semanticLayer(record, vocab, settings, findings);
  }

  findings.sort(
    (a, b) =>
      (a.schemeId || '').localeCompare(b.schemeId || '') ||
      a.layer.localeCompare(b.layer) ||
      a.path.localeCompare(b.path) ||
      a.check.localeCompare(b.check) ||
      a.message.localeCompare(b.message),
  );

  const rejects = findings.filter((f) => f.severity === 'reject');
  const quarantines = findings.filter((f) => f.severity === 'quarantine');
  const warnings = findings.filter((f) => f.severity === 'warn');
  const quarantinedIds = [...new Set(quarantines.map((f) => f.schemeId).filter(Boolean))].sort();
  const publishable = records.filter(
    (record) =>
      record?.publicationStatus === 'published' &&
      typeof record.id === 'string' &&
      !quarantinedIds.includes(record.id) &&
      !rejects.some((f) => f.schemeId === record.id),
  );

  return {
    ok: rejects.length === 0,
    findings,
    rejects,
    quarantines,
    warnings,
    quarantinedIds,
    publishable,
  };
}

/**
 * Guard used by the build script and by the client at load time: checks an
 * assembled envelope against the catalogue schema.
 * @param {object} catalogue
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateCatalogueEnvelope(catalogue) {
  if (validateCatalogueSchema(catalogue)) return { ok: true, errors: [] };
  return {
    ok: false,
    errors: validateCatalogueSchema.errors.map((e) => `${e.instancePath || '/'} ${e.message}`),
  };
}

/**
 * @param {object} registry
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateRegistry(registry) {
  if (validateRegistrySchema(registry)) return { ok: true, errors: [] };
  return {
    ok: false,
    errors: validateRegistrySchema.errors.map((e) => `${e.instancePath || '/'} ${e.message}`),
  };
}

export { loadVocabularies, PROFILE_FIELDS };
