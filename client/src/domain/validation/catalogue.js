import { vocabularies } from '../../data/vocabularies.js';
import { freshnessIssues, isObject, issue, validDate, validInstant, validRefs } from './common.js';

export const safeText = (value) => typeof value === 'string' && !/[<>]/.test(value);
const text = (value) => safeText(value) && value.trim().length > 0;
const keys = (value, required, optional = []) =>
  isObject(value) &&
  required.every((key) => Object.hasOwn(value, key)) &&
  Object.keys(value).every((key) => [...required, ...optional].includes(key));
const arrayOf = (value, check) => Array.isArray(value) && Array.from(value).every(check);

export function safeHttpsUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('https://') || /[\s\\]/.test(value))
    return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** Envelope defense in depth, not a replacement for the offline record/publication schema. */
export function validateCatalogueEnvelope(catalogue, { vocab = vocabularies } = {}) {
  const errors = [];
  const add = (path, message) => errors.push(issue(path, 'catalogue-envelope', message));
  if (
    !keys(catalogue, [
      'schemaVersion',
      'catalogueVersion',
      'publishedAt',
      'vocabVersion',
      'coverage',
      'schemes',
    ])
  )
    return {
      ok: false,
      errors: [issue('catalogue', 'catalogue-envelope', 'Invalid catalogue keys.')],
    };
  if (catalogue.schemaVersion !== '1.0.0') add('schemaVersion', 'Unsupported schema version.');
  if (catalogue.vocabVersion !== '1.0.0' || catalogue.vocabVersion !== vocab?.version)
    add('vocabVersion', 'Unsupported vocabulary version.');
  if (
    typeof catalogue.catalogueVersion !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}\.\d+$/.test(catalogue.catalogueVersion) ||
    !validDate(catalogue.catalogueVersion.slice(0, 10))
  )
    add('catalogueVersion', 'An actual date and release counter are required.');
  if (!validInstant(catalogue.publishedAt))
    add('publishedAt', 'An actual publication instant is required.');
  const coverage = catalogue.coverage;
  if (
    !keys(
      coverage,
      ['domains', 'jurisdictions', 'educationLevels', 'schemeCount', 'statement'],
      ['quarantined'],
    )
  )
    add('coverage', 'Complete coverage metadata is required.');
  else {
    if (
      !arrayOf(coverage.domains, (value) => value === 'student-scholarship') ||
      !coverage.domains.length
    )
      add('coverage.domains', 'Only student scholarships are supported.');
    if (
      !arrayOf(
        coverage.jurisdictions,
        (value) => typeof value === 'string' && /^(central|state|unknown|IN-[A-Z]{2})$/.test(value),
      )
    )
      add('coverage.jurisdictions', 'Invalid jurisdiction summaries.');
    if (!arrayOf(coverage.educationLevels, (value) => typeof value === 'string'))
      add('coverage.educationLevels', 'Education summaries must be strings.');
    if (
      !Number.isInteger(coverage.schemeCount) ||
      coverage.schemeCount < 0 ||
      coverage.schemeCount !== catalogue.schemes?.length
    )
      add('coverage.schemeCount', 'Count must equal the full selected catalogue.');
    if (!safeText(coverage.statement) || [...coverage.statement].length < 30)
      add('coverage.statement', 'A safe coverage statement is required.');
    if (
      'quarantined' in coverage &&
      !arrayOf(
        coverage.quarantined,
        (entry) =>
          keys(entry, ['id', 'reason']) && typeof entry.id === 'string' && safeText(entry.reason),
      )
    )
      add('coverage.quarantined', 'Invalid publication quarantine summaries.');
  }
  if (!Array.isArray(catalogue.schemes)) add('schemes', 'Schemes must be an array.');
  else {
    const ids = new Set();
    const slugs = new Set();
    for (const record of catalogue.schemes) {
      if (!isObject(record) || typeof record.id !== 'string' || typeof record.slug !== 'string')
        add('schemes', 'Records must declare identifiers.');
      else {
        if (ids.has(record.id) || slugs.has(record.slug))
          add('schemes', 'Record IDs and slugs must be unique.');
        ids.add(record.id);
        slugs.add(record.slug);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Validate every optional value the presentation adapter/UI may render. */
export function validatePresentationScheme(record, { mode } = {}) {
  const errors = [];
  const add = (path) =>
    errors.push(issue(path, 'presentation-shape', 'Malformed display metadata.'));
  if (!isObject(record)) return [issue('scheme', 'presentation-shape', 'A record is required.')];
  const optionalText = (object, names, path = '') => {
    for (const name of names) if (name in object && !text(object[name])) add(`${path}${name}`);
  };
  optionalText(record, ['officialName', 'shortName', 'summary']);
  if (
    'authority' in record &&
    (!keys(record.authority, ['name', 'level']) ||
      !text(record.authority.name) ||
      !['central', 'state', 'unknown'].includes(record.authority.level))
  )
    add('authority');
  if (isObject(record.eligibility))
    optionalText(record.eligibility, ['cycle', 'notes'], 'eligibility.');
  if (isObject(record.application)) optionalText(record.application, ['cycle'], 'application.');
  for (const [index, doc] of (Array.isArray(record.documents) ? record.documents : []).entries()) {
    if (!isObject(doc)) {
      add(`documents[${index}]`);
      continue;
    }
    optionalText(doc, ['title', 'notes'], `documents[${index}].`);
  }
  const refs = new Set();
  for (const source of Array.isArray(record.sources) ? record.sources : []) {
    if (!isObject(source)) {
      add('sources');
      continue;
    }
    if (!safeHttpsUrl(source.url)) add('sources.url');
    optionalText(source, ['title', 'authority'], 'sources.');
    refs.add(source.id);
    for (const locator of Array.isArray(source.locators) ? source.locators : []) {
      if (!isObject(locator) || !text(locator.ref)) add('sources.locators');
      else refs.add(`${source.id}#${locator.id}`);
    }
  }
  for (const condition of Array.isArray(record.testConditions) ? record.testConditions : []) {
    if (!isObject(condition) || !text(condition.text) || !text(condition.label))
      add('testConditions');
    else refs.add(condition.id);
  }
  const evidence = (value) => validRefs(value) && value.every((ref) => refs.has(ref));
  if ('benefits' in record) {
    if (!Array.isArray(record.benefits)) add('benefits');
    else
      for (const benefit of record.benefits) {
        if (
          !keys(
            benefit,
            ['id', 'type', 'description', 'amount', 'evidence', 'freshness'],
            ['conditions'],
          ) ||
          !/^ben-[a-z0-9-]+$/.test(benefit.id) ||
          !text(benefit.description) ||
          !['tuition-fee', 'maintenance', 'one-time-grant', 'stipend', 'other'].includes(
            benefit.type,
          ) ||
          !evidence(benefit.evidence)
        ) {
          add('benefits');
          continue;
        }
        errors.push(...freshnessIssues(benefit.freshness, 'benefits.freshness'));
        optionalText(benefit, ['conditions'], 'benefits.');
        const amount = benefit.amount;
        const unknown =
          keys(amount, ['state', 'reason']) &&
          amount.state === 'unknown' &&
          ['not-found', 'source-conflict', 'needs-interpretation', 'stale'].includes(amount.reason);
        if (
          !unknown &&
          (!keys(amount, ['value', 'currency', 'frequency'], ['cap']) ||
            !Number.isFinite(amount.value) ||
            amount.value <= 0 ||
            amount.currency !== 'INR' ||
            !['year', 'month', 'one-time'].includes(amount.frequency) ||
            ('cap' in amount && !text(amount.cap)))
        )
          add('benefits.amount');
      }
  }
  if (
    'applicationSteps' in record &&
    !arrayOf(
      record.applicationSteps,
      (step) =>
        keys(step, ['order', 'title', 'evidence'], ['description']) &&
        Number.isInteger(step.order) &&
        step.order > 0 &&
        text(step.title) &&
        (!('description' in step) || text(step.description)) &&
        evidence(step.evidence),
    )
  )
    add('applicationSteps');
  if (
    !arrayOf(
      record.links,
      (link) =>
        keys(link, ['id', 'purpose', 'url', 'label', 'checkedAt', 'status']) &&
        typeof link.id === 'string' &&
        /^lnk-[a-z0-9-]+$/.test(link.id) &&
        ['scheme-info', 'guidelines', 'application'].includes(link.purpose) &&
        safeHttpsUrl(link.url) &&
        text(link.label) &&
        validDate(link.checkedAt) &&
        ['verified', 'broken', 'unverified'].includes(link.status),
    )
  )
    add('links');
  if (
    mode === 'demo' &&
    ('authority' in record ||
      (record.benefits?.length ?? 0) ||
      (record.applicationSteps?.length ?? 0))
  )
    add('scheme');
  return errors;
}
