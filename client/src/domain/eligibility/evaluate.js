import { vocabularies } from '../../data/vocabularies.js';
import { validateProfile } from '../validation/profile.js';
import { validateRule } from '../validation/rules.js';
import { assertContext, ENGINE_VERSION } from '../validation/context.js';
import { assertValid, clone, compareText, isObject, issue } from '../validation/common.js';
import {
  createEvidenceResolver,
  validateAssessmentScheme,
  walkRules,
} from '../validation/scheme.js';
import { effectiveFreshness } from '../freshness.js';
import { deriveApplicationStatus } from '../application/status.js';
import { compareInterval, compareNumber } from './interval.js';
import { explainReason } from './reasons.js';

export { ENGINE_VERSION };
export const STATUS_ORDER = ['potential', 'verification', 'unmet', 'unavailable'];

function assertProfile(profile, vocab) {
  const report = validateProfile(profile, { vocab });
  // Do not propagate validator diagnostics containing profile values into runtime exceptions.
  assertValid(
    'profile',
    report.errors.map((error) => issue(error.field, 'profile-shape', 'Invalid profile field.')),
  );
}

function answerFor(profile, field) {
  if (field.startsWith('additionalAnswers.'))
    return (
      profile.additionalAnswers?.[field.slice('additionalAnswers.'.length)] ?? {
        state: 'not-asked',
      }
    );
  return profile[field] ?? { state: 'not-asked' };
}

function aggregate(operator, outcomes) {
  if (operator === 'not')
    return outcomes[0] === 'unknown' ? 'unknown' : outcomes[0] === 'pass' ? 'fail' : 'pass';
  if (operator === 'allOf')
    return outcomes.includes('fail')
      ? 'fail'
      : outcomes.every((o) => o === 'pass')
        ? 'pass'
        : 'unknown';
  return outcomes.includes('pass')
    ? 'pass'
    : outcomes.every((o) => o === 'fail')
      ? 'fail'
      : 'unknown';
}

const groupCodes = {
  allOf: {
    pass: 'all_conditions_met',
    fail: 'mandatory_condition_failed',
    unknown: 'conditions_unresolved',
  },
  anyOf: {
    pass: 'alternative_met',
    fail: 'all_alternatives_failed',
    unknown: 'alternatives_unresolved',
  },
  not: {
    pass: 'negated_condition_met',
    fail: 'negated_condition_failed',
    unknown: 'negated_condition_unknown',
  },
};

function compareAnswer(answer, rule) {
  if (answer.state !== 'known') return ['unknown', `answer_${answer.state.replace('-', '_')}`];
  const value = answer.value;
  let outcome;
  if (rule.operator === 'eq') outcome = value === rule.value ? 'pass' : 'fail';
  else if (rule.operator === 'in') outcome = rule.value.includes(value) ? 'pass' : 'fail';
  else if (rule.field === 'annualHouseholdIncome') {
    if (value.currency !== 'INR' || value.period !== 'year' || rule.unit !== 'INR/year')
      return ['unknown', 'unit_mismatch'];
    outcome = compareInterval(value, rule);
  } else if (rule.field === 'academicScore') {
    if (value.scale !== rule.scale) return ['unknown', 'score_scale_mismatch'];
    if (value.context !== rule.context) return ['unknown', 'score_context_mismatch'];
    outcome = compareNumber(value.value, rule);
  } else {
    const school = typeof value.stage === 'string';
    if ((school ? 'school-class' : 'course-year') !== rule.unit)
      return ['unknown', 'study_context_mismatch'];
    outcome = compareNumber(school ? Number(value.stage.slice(6)) : value.stage, rule);
  }
  return [
    outcome,
    outcome === 'unknown'
      ? 'income_overlap'
      : outcome === 'pass'
        ? 'condition_met'
        : 'condition_not_met',
  ];
}

function runRule(profile, rule, { context, inheritedFreshness, resolveEvidence }) {
  const rows = [];
  function visit(node, parentRuleId, inherited) {
    const freshness = effectiveFreshness(node.freshness, context, inherited);
    const children = node.children ?? (node.child ? [node.child] : []);
    const expected = Object.fromEntries(
      [
        'operator',
        'value',
        'min',
        'max',
        'minInclusive',
        'maxInclusive',
        'unit',
        'scale',
        'context',
        'reason',
        'checkHint',
      ]
        .filter((key) => key in node)
        .map((key) => [key, clone(node[key])]),
    );
    if (children.length) expected.childRuleIds = children.map((child) => child.id);
    const evidence = (node.evidence ?? []).map((ref) => ({
      ...resolveEvidence(ref),
      freshness: clone(freshness),
    }));
    const row = {
      ruleId: node.id,
      parentRuleId,
      childRuleIds: children.map((child) => child.id),
      operator: node.operator,
      field: node.field ?? null,
      outcome: 'unknown',
      reasonCode: '',
      providedAnswer: node.field ? clone(answerFor(profile, node.field)) : null,
      expected,
      evidence,
      explanationKey: node.explanationKey,
    };
    rows.push(row);
    const outcomes = children.map((child) => visit(child, node.id, freshness));
    if (freshness.state !== 'current') row.reasonCode = freshness.reasonCode;
    else if (!children.length && !evidence.length) row.reasonCode = 'evidence_unconfirmed';
    else if (groupCodes[node.operator]) {
      row.outcome = aggregate(node.operator, outcomes);
      row.reasonCode = groupCodes[node.operator][row.outcome];
    } else if (node.operator === 'manualVerification') row.reasonCode = 'manual_verification';
    else [row.outcome, row.reasonCode] = compareAnswer(row.providedAnswer, node);
    return row.outcome;
  }
  const inherited = effectiveFreshness(inheritedFreshness, context);
  return { outcome: visit(rule, null, inherited), ruleResults: rows };
}

/** Dependency injection keeps server/browser vocabulary validation identical. */
export function createEligibilityEngine({ vocab }) {
  function evaluateRule(profile, rule, options) {
    assertContext(options?.context);
    assertProfile(profile, vocab);
    assertValid('rule', validateRule(rule, { vocab }).errors);
    const resolveEvidence = options.resolveEvidence ?? (() => null);
    const errors = [];
    for (const [node, path] of walkRules(rule))
      for (const ref of node.evidence ?? []) {
        const view = resolveEvidence(ref);
        if (
          !isObject(view) ||
          view.reference !== ref ||
          view.kind !==
            (options.context.mode === 'demo' ? 'fictional-test-condition' : 'reviewed-source')
        )
          errors.push(
            issue(
              `${path}.evidence`,
              'dangling-evidence',
              'Evidence must resolve in the selected mode.',
            ),
          );
      }
    assertValid('evidence', errors);
    return runRule(profile, rule, { ...options, resolveEvidence });
  }

  function evaluateScheme(profile, scheme, context) {
    assertContext(context);
    assertProfile(profile, vocab);
    assertValid('scheme', validateAssessmentScheme(scheme, { mode: context.mode, vocab }));
    const { coverage, rule, freshness } = scheme.eligibility;
    const evaluated =
      coverage === 'unusable'
        ? { outcome: 'unknown', ruleResults: [] }
        : runRule(profile, rule, {
            context,
            inheritedFreshness: freshness,
            resolveEvidence: createEvidenceResolver(scheme, context.mode),
          });
    const status =
      coverage === 'unusable'
        ? 'unavailable'
        : evaluated.outcome === 'fail'
          ? 'unmet'
          : coverage === 'partial' || evaluated.outcome === 'unknown'
            ? 'verification'
            : 'potential';
    const missing = new Set();
    const manualChecks = [];
    const byId = new Map(evaluated.ruleResults.map((row) => [row.ruleId, row]));
    function actions(row) {
      if (!row || row.outcome !== 'unknown') return;
      // Asking for answers cannot repair stale/unconfirmed requirements.
      if (/^(fact_|evidence_)/.test(row.reasonCode)) return;
      if (row.childRuleIds.length) row.childRuleIds.forEach((id) => actions(byId.get(id)));
      else if (row.reasonCode === 'manual_verification')
        manualChecks.push({
          ruleId: row.ruleId,
          reason: row.expected.reason,
          checkHint: row.expected.checkHint,
          evidence: clone(row.evidence),
        });
      else if (row.field) missing.add(row.field);
    }
    if (evaluated.outcome === 'unknown') actions(evaluated.ruleResults[0]);
    const warnings = evaluated.ruleResults
      .filter((row) => /^(fact_|evidence_)/.test(row.reasonCode))
      .map((row) => ({
        code: row.reasonCode,
        path: `eligibility.rule.${row.ruleId}`,
        ruleId: row.ruleId,
        message: explainReason(row.reasonCode, context.mode),
      }));
    if (coverage !== 'complete')
      warnings.push({
        code: `${coverage}_coverage`,
        path: 'eligibility.coverage',
        ruleId: null,
        message: explainReason(`${coverage}_coverage`, context.mode),
      });
    warnings.sort((a, b) => compareText(a.path, b.path) || compareText(a.code, b.code));
    return {
      schemeId: scheme.id,
      schemeVersion: scheme.recordVersion,
      status,
      ruleResults: evaluated.ruleResults,
      missingFields: [...missing].sort(compareText),
      manualChecks,
      dataWarnings: warnings,
      applicationStatus: deriveApplicationStatus(scheme.application, {
        ...context,
        currentCycle: context.currentCycles?.[scheme.id],
      }),
      catalogueVersion: context.catalogueVersion,
      engineVersion: context.engineVersion,
      evaluatedAt: context.evaluatedAt,
    };
  }

  function evaluateCatalogue(profile, catalogue, context) {
    assertContext(context);
    assertProfile(profile, vocab);
    const errors = [];
    if (
      !isObject(catalogue) ||
      !Array.isArray(catalogue.schemes) ||
      catalogue.catalogueVersion !== context.catalogueVersion
    )
      errors.push(
        issue(
          'catalogue',
          'catalogue-envelope',
          'Catalogue version and records must match the context.',
        ),
      );
    if (
      isObject(catalogue) &&
      ((context.mode === 'demo' && catalogue.mode !== 'demo') ||
        (context.mode === 'reviewed' &&
          catalogue.mode !== undefined &&
          catalogue.mode !== 'reviewed'))
    )
      errors.push(issue('catalogue.mode', 'mode-isolation', 'Catalogue mode does not match.'));
    assertValid('catalogue', errors);
    const ids = new Set();
    const slugs = new Set();
    for (const scheme of catalogue.schemes) {
      errors.push(...validateAssessmentScheme(scheme, { mode: context.mode, vocab }));
      if (ids.has(scheme?.id) || slugs.has(scheme?.slug))
        errors.push(
          issue('catalogue.schemes', 'duplicate-id', 'Scheme IDs and slugs must be unique.'),
        );
      ids.add(scheme?.id);
      slugs.add(scheme?.slug);
    }
    assertValid('catalogue', errors);
    const names = new Map(
      catalogue.schemes.map((scheme) => [scheme.id, scheme.officialName.normalize('NFC')]),
    );
    return catalogue.schemes
      .map((scheme) => evaluateScheme(profile, scheme, context))
      .sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
          compareText(names.get(a.schemeId), names.get(b.schemeId)) ||
          compareText(a.schemeId, b.schemeId),
      );
  }
  return { evaluateRule, evaluateScheme, evaluateCatalogue };
}

export const { evaluateRule, evaluateScheme, evaluateCatalogue } = createEligibilityEngine({
  vocab: vocabularies,
});
