import {
  ADDITIONAL_FIELDS,
  FIELD_VOCABULARY,
  NUMERIC_FIELDS,
  isDeclaredField,
} from '../profile/fields.js';
import { compareText, validDate } from './common.js';

const isObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));

export const OPERATORS = new Set([
  'eq',
  'in',
  'lt',
  'lte',
  'gt',
  'gte',
  'between',
  'allOf',
  'anyOf',
  'not',
  'manualVerification',
]);
const COMMON = ['id', 'operator', 'explanationKey', 'evidence', 'material', 'freshness'];
const safeText = (value) =>
  typeof value === 'string' && value.trim().length > 0 && !/[<>]/.test(value);

/** Pure, whole-tree validation. A shared seenIds set covers document and eligibility trees. */
export function validateRule(rule, { vocab, path = 'rule', seenIds = new Set() } = {}) {
  const errors = [];
  const ancestors = new Set();
  const add = (path, code, message) => errors.push({ path, code, message });
  if (!vocab?.codes) add(path, 'vocab-code', 'Injected vocabulary codes are required.');
  const extras = (node, allowed, path) => {
    for (const key of Object.keys(node)) {
      if (!allowed.includes(key))
        add(`${path}.${key}`, 'rule-shape', 'Unexpected property for this rule shape.');
    }
  };
  const visit = (node, path) => {
    if (!isObject(node)) return add(path, 'rule-shape', 'A rule must be an object.');
    if (ancestors.has(node)) return add(path, 'rule-shape', 'Rule trees must not contain cycles.');
    ancestors.add(node);
    if (typeof node.id !== 'string' || !/^r-[a-z0-9]+(-[a-z0-9]+)*$/.test(node.id))
      add(`${path}.id`, 'rule-shape', 'A rule needs a valid r-prefixed identifier.');
    else {
      if (seenIds.has(node.id)) add(`${path}.id`, 'duplicate-id', 'Duplicate rule identifier.');
      seenIds.add(node.id);
    }
    if (typeof node.explanationKey !== 'string' || !/^[a-zA-Z0-9.\-_]+$/.test(node.explanationKey))
      add(`${path}.explanationKey`, 'rule-shape', 'A rule needs a valid explanation key.');
    if ('material' in node && typeof node.material !== 'boolean')
      add(`${path}.material`, 'rule-shape', 'material must be a boolean.');
    if (
      'evidence' in node &&
      (!Array.isArray(node.evidence) ||
        Array.from(node.evidence).some(
          (ref) => typeof ref !== 'string' || !/^src-[a-z0-9-]+(#loc-[a-z0-9-]+)?$/.test(ref),
        ))
    )
      add(`${path}.evidence`, 'rule-shape', 'Evidence must be an array of source references.');
    if ('freshness' in node) {
      const f = node.freshness;
      const p = `${path}.freshness`;
      if (!isObject(f)) add(p, 'rule-shape', 'Freshness must be an object.');
      else {
        extras(f, ['state', 'checkedAt', 'checkedBy', 'reviewDue'], p);
        if (!['current', 'review-due', 'superseded', 'unknown'].includes(f.state))
          add(`${p}.state`, 'rule-shape', 'Unknown freshness state.');
        if (!validDate(f.checkedAt))
          add(`${p}.checkedAt`, 'rule-shape', 'checkedAt must be an actual ISO calendar date.');
        if (!safeText(f.checkedBy) || f.checkedBy.length < 2)
          add(`${p}.checkedBy`, 'rule-shape', 'checkedBy must identify the checker.');
        if ('reviewDue' in f && !validDate(f.reviewDue))
          add(`${p}.reviewDue`, 'rule-shape', 'reviewDue must be an actual ISO calendar date.');
      }
    }
    const op = node.operator;
    let operands = [];
    if (!OPERATORS.has(op))
      add(`${path}.operator`, 'unknown-operator', 'Unsupported rule operator.');
    else if (op === 'allOf' || op === 'anyOf') {
      operands = ['children'];
      if (!Array.isArray(node.children) || node.children.length < 2)
        add(`${path}.children`, 'branch-arity', 'A group needs at least two children.');
    } else if (op === 'not') {
      operands = ['child'];
      if (!isObject(node.child))
        add(`${path}.child`, 'branch-arity', 'not needs exactly one child rule.');
    } else if (op === 'manualVerification') {
      operands = ['reason', 'checkHint'];
      if (!safeText(node.reason) || !safeText(node.checkHint))
        add(path, 'manual-node', 'manualVerification needs nonempty reason and checkHint text.');
    } else {
      const numeric = !['eq', 'in'].includes(op);
      operands = [
        'field',
        ...(op === 'between' ? ['min', 'max', 'minInclusive', 'maxInclusive'] : ['value']),
      ];
      if (numeric && node.field === 'academicScore') operands.push('scale', 'context');
      if (numeric && ['annualHouseholdIncome', 'studyYear'].includes(node.field))
        operands.push('unit');
      if (!isDeclaredField(node.field))
        add(`${path}.field`, 'unknown-field', 'A comparison needs a declared field.');
      else if (numeric !== NUMERIC_FIELDS.has(node.field))
        add(`${path}.operator`, 'rule-shape', 'Operator and field shapes are incompatible.');
      if (!numeric) {
        const values = op === 'in' ? node.value : [node.value];
        if (!Array.isArray(values) || values.length === 0)
          add(`${path}.value`, 'rule-shape', 'in needs a nonempty code array.');
        else
          for (const value of values) {
            const vocabulary = FIELD_VOCABULARY[node.field];
            const declaration =
              typeof node.field === 'string' && node.field.startsWith('additionalAnswers.')
                ? ADDITIONAL_FIELDS[node.field.slice('additionalAnswers.'.length)]
                : null;
            if (typeof value !== 'string')
              add(`${path}.value`, 'rule-shape', 'Code operands must be strings.');
            else if (
              (vocabulary && !vocab?.codes?.[vocabulary]?.has(value)) ||
              (declaration &&
                (!Array.isArray(declaration.values) || !declaration.values.includes(value)))
            )
              add(`${path}.value`, 'vocab-code', 'Unknown code for the declared field.');
          }
      } else {
        if (op === 'between') {
          if (
            !Number.isFinite(node.min) ||
            !Number.isFinite(node.max) ||
            node.min > node.max ||
            (node.min === node.max && (node.minInclusive !== true || node.maxInclusive !== true))
          )
            add(path, 'rule-shape', 'between needs finite, ordered, nonempty bounds.');
          if (typeof node.minInclusive !== 'boolean' || typeof node.maxInclusive !== 'boolean')
            add(path, 'rule-shape', 'between needs explicit inclusion booleans.');
        } else if (!Number.isFinite(node.value))
          add(`${path}.value`, 'rule-shape', 'A numeric comparison needs a finite value.');
        if (node.field === 'annualHouseholdIncome' && node.unit !== 'INR/year')
          add(`${path}.unit`, 'rule-shape', 'An income rule must declare unit INR/year.');
        if (node.field === 'studyYear' && !['course-year', 'school-class'].includes(node.unit))
          add(
            `${path}.unit`,
            'rule-shape',
            'A study-year rule must declare course-year or school-class.',
          );
        if (node.field === 'academicScore') {
          if (!node.scale || !node.context)
            add(path, 'score-scale-context', 'A score rule must declare scale and context.');
          if (node.scale && !vocab?.codes?.['score-scales']?.has(node.scale))
            add(`${path}.scale`, 'vocab-code', 'Unknown score scale.');
          if (node.context && !vocab?.codes?.['exam-contexts']?.has(node.context))
            add(`${path}.context`, 'vocab-code', 'Unknown exam context.');
        }
      }
    }
    extras(node, [...COMMON, ...operands], path);
    // Visit even illegal children: no invalid sibling may hide behind another error.
    if (Array.isArray(node.children))
      for (const [index, child] of node.children.entries())
        visit(child, `${path}.children[${index}]`);
    if ('child' in node) visit(node.child, `${path}.child`);
    ancestors.delete(node);
  };
  visit(rule, path);
  errors.sort(
    (a, b) =>
      compareText(a.path, b.path) ||
      compareText(a.code, b.code) ||
      compareText(a.message, b.message),
  );
  return { ok: errors.length === 0, errors };
}
