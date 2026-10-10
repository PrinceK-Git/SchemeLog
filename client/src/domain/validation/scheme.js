import { validateRule } from './rules.js';
import { freshnessIssues, isObject, issue, validRefs, validDate, clone } from './common.js';
import { validateApplication, isUnknownDate } from '../application/status.js';

export function* walkRules(rule, path = 'eligibility.rule') {
  if (!isObject(rule)) return;
  yield [rule, path];
  for (const [index, child] of (Array.isArray(rule.children) ? rule.children : []).entries())
    yield* walkRules(child, `${path}.children[${index}]`);
  if (rule.child) yield* walkRules(rule.child, `${path}.child`);
}

/** Builds a resolver only after validation; URLs are provenance, not authorized actions. */
export function createEvidenceResolver(scheme, mode) {
  const lookup = new Map();
  if (mode === 'demo') {
    for (const condition of scheme.testConditions)
      lookup.set(condition.id, {
        kind: 'fictional-test-condition',
        reference: condition.id,
        label: 'Fictional test condition',
        text: condition.text,
        url: null,
        freshness: 'assumed-current-for-demo',
      });
  } else {
    for (const source of scheme.sources) {
      const view = {
        kind: 'reviewed-source',
        reference: source.id,
        title: source.title,
        authority: source.authority,
        locator: null,
        url: source.url,
      };
      lookup.set(source.id, view);
      for (const locator of source.locators)
        lookup.set(`${source.id}#${locator.id}`, {
          ...view,
          reference: `${source.id}#${locator.id}`,
          locator: locator.ref,
        });
    }
  }
  return (ref) => (lookup.has(ref) ? clone(lookup.get(ref)) : null);
}

/** Common assessment guard. Real publication's schema/review/registry gate remains mandatory. */
export function validateAssessmentScheme(scheme, { mode, vocab }) {
  const errors = [];
  const add = (path, code, message) => errors.push(issue(path, code, message));
  if (!isObject(scheme)) return [issue('scheme', 'scheme-shape', 'Scheme must be an object.')];
  if (typeof scheme.id !== 'string' || !/^(fx-)?sch-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scheme.id))
    add('id', 'scheme-id', 'Invalid scheme ID.');
  if (typeof scheme.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scheme.slug))
    add('slug', 'slug', 'Invalid slug.');
  if (typeof scheme.officialName !== 'string' || !scheme.officialName.trim())
    add('officialName', 'name', 'Scheme name is required.');
  if (!Number.isInteger(scheme.recordVersion) || scheme.recordVersion < 1)
    add('recordVersion', 'version', 'Positive record version required.');
  const targets = new Set();
  if (mode === 'demo') {
    if (
      typeof scheme.id !== 'string' ||
      !scheme.id.startsWith('fx-sch-') ||
      scheme.fictional !== true ||
      scheme.publicationStatus !== 'draft'
    )
      add('id', 'mode-isolation', 'Demo records must be fictional unpublished fixtures.');
    if (
      !Array.isArray(scheme.links) ||
      scheme.links.length ||
      !Array.isArray(scheme.sources) ||
      scheme.sources.length ||
      'verification' in scheme
    )
      add(
        'sources',
        'fictional-provenance',
        'Demo records cannot claim real sources, review or application actions.',
      );
    if (!Array.isArray(scheme.testConditions))
      add('testConditions', 'evidence-shape', 'Fictional test conditions are required.');
    else
      for (const [index, condition] of scheme.testConditions.entries()) {
        const path = `testConditions[${index}]`;
        if (
          !isObject(condition) ||
          !validRefs([condition.id]) ||
          condition.label !== 'Fictional test condition' ||
          typeof condition.text !== 'string' ||
          !condition.text.trim() ||
          Object.keys(condition).some((key) => !['id', 'label', 'text'].includes(key))
        )
          add(path, 'fictional-provenance', 'Malformed fictional test condition.');
        else {
          if (targets.has(condition.id)) add(path, 'duplicate-id', 'Duplicate test condition.');
          targets.add(condition.id);
        }
      }
  } else if (mode === 'reviewed') {
    if (
      typeof scheme.id !== 'string' ||
      scheme.id.startsWith('fx-') ||
      scheme.fictional !== undefined ||
      scheme.testConditions !== undefined ||
      scheme.publicationStatus !== 'published'
    )
      add('id', 'mode-isolation', 'Reviewed evaluation requires a published real record.');
    const verification = scheme.verification;
    if (
      !isObject(verification) ||
      typeof verification.reviewedBy !== 'string' ||
      typeof verification.curatedBy !== 'string' ||
      !validDate(verification.reviewedAt) ||
      verification.curatedBy.trim().toLowerCase() ===
        verification.reviewedBy.trim().toLowerCase() ||
      /^(unknown|none|null|pending|unreviewed|ai(?:[- ].*)?|automated(?:[- ].*)?)$/i.test(
        verification.reviewedBy.trim(),
      )
    )
      add('verification', 'review-gate', 'Independent reviewed publication is required.');
    if (!Array.isArray(scheme.sources)) add('sources', 'evidence-shape', 'Sources are required.');
    else
      for (const [index, source] of scheme.sources.entries()) {
        const path = `sources[${index}]`;
        if (
          !isObject(source) ||
          !validRefs([source.id]) ||
          source.id.includes('#') ||
          typeof source.url !== 'string' ||
          !source.url.startsWith('https://') ||
          typeof source.title !== 'string' ||
          typeof source.authority !== 'string' ||
          !Array.isArray(source.locators) ||
          !['guidelines', 'notice', 'scheme-page', 'portal-page', 'faq'].includes(source.kind)
        ) {
          add(path, 'source-shape', 'Malformed evidence source.');
          continue;
        }
        if (targets.has(source.id)) add(path, 'duplicate-id', 'Duplicate source ID.');
        targets.add(source.id);
        for (const locator of source.locators) {
          if (
            !isObject(locator) ||
            !/^loc-[a-z0-9-]+$/.test(locator.id) ||
            typeof locator.ref !== 'string'
          ) {
            add(path, 'locator-shape', 'Malformed locator.');
            continue;
          }
          const ref = `${source.id}#${locator.id}`;
          if (targets.has(ref)) add(path, 'duplicate-id', 'Duplicate locator.');
          targets.add(ref);
        }
      }
  } else add('mode', 'mode', 'Select an explicit catalogue mode.');
  const checkRefs = (refs, path) => {
    if (!validRefs(refs)) {
      add(path, 'evidence-shape', 'Evidence must be an array of references.');
      return;
    }
    for (const ref of refs)
      if (!targets.has(ref))
        add(path, 'dangling-evidence', 'Evidence reference does not resolve in the selected mode.');
  };
  const seenIds = new Set();
  const checkTree = (rule, path) => {
    const report = validateRule(rule, { vocab, path, seenIds });
    errors.push(...report.errors);
    if (!report.ok) return;
    for (const [node, nodePath] of walkRules(rule, path))
      if (node.evidence !== undefined) checkRefs(node.evidence, `${nodePath}.evidence`);
  };
  const eligibility = scheme.eligibility;
  if (!isObject(eligibility))
    add('eligibility', 'eligibility-shape', 'Eligibility section is required.');
  else {
    if (!['complete', 'partial', 'unusable'].includes(eligibility.coverage))
      add('eligibility.coverage', 'coverage', 'Unknown coverage.');
    if (typeof eligibility.cycle !== 'string' || !eligibility.cycle.trim())
      add('eligibility.cycle', 'cycle-shape', 'Eligibility cycle is required.');
    errors.push(...freshnessIssues(eligibility.freshness, 'eligibility.freshness'));
    checkRefs(eligibility.evidence, 'eligibility.evidence');
    if (eligibility.coverage === 'unusable') {
      if (eligibility.rule !== null)
        add(
          'eligibility.rule',
          'coverage-consistency',
          'Unusable coverage must not carry a rule tree.',
        );
    } else checkTree(eligibility.rule, 'eligibility.rule');
  }
  if (!Array.isArray(scheme.documents))
    add('documents', 'documents-shape', 'Documents must be an array.');
  else {
    const seenDocuments = new Set();
    for (const [index, document] of scheme.documents.entries()) {
      const path = `documents[${index}]`;
      if (
        !isObject(document) ||
        typeof document.id !== 'string' ||
        !/^doc-[a-z0-9-]+$/.test(document.id) ||
        !vocab.codes['document-types']?.has(document.type) ||
        typeof document.title !== 'string' ||
        !document.title.trim() ||
        !['confirmed', 'conditional', 'needs-verification'].includes(document.requirement)
      ) {
        add(path, 'document-shape', 'Malformed preparation document.');
        continue;
      }
      if (seenDocuments.has(document.id)) add(path, 'duplicate-id', 'Duplicate document ID.');
      seenDocuments.add(document.id);
      checkRefs(document.evidence, `${path}.evidence`);
      if (document.requirement === 'conditional')
        checkTree(document.appliesWhen, `${path}.appliesWhen`);
      else if (document.appliesWhen !== null)
        add(path, 'document-condition', 'Only conditional documents carry a rule.');
    }
  }
  const appErrors = validateApplication(scheme.application);
  errors.push(...appErrors);
  if (!appErrors.length) {
    for (const key of ['opens', 'closes'])
      if (!isUnknownDate(scheme.application[key]))
        checkRefs(scheme.application[key].evidence, `application.${key}.evidence`);
    if (scheme.application.statusOverride)
      checkRefs(scheme.application.statusOverride.evidence, 'application.statusOverride.evidence');
    if (mode === 'reviewed' && scheme.application.statusOverride && Array.isArray(scheme.sources)) {
      const noticeSources = new Set(
        scheme.sources.filter((source) => source?.kind === 'notice').map((source) => source.id),
      );
      if (
        !scheme.application.statusOverride.evidence.some((ref) =>
          noticeSources.has(ref.split('#')[0]),
        )
      )
        add(
          'application.statusOverride.evidence',
          'notice-evidence',
          'A status override must be supported by a notice source.',
        );
    }
  }
  return errors;
}
