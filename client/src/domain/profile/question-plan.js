import { ADDITIONAL_FIELDS, isDeclaredField } from './fields.js';
import { walkRules } from '../validation/scheme.js';
import { validateRule } from '../validation/rules.js';
import { assertValid, isObject, issue } from '../validation/common.js';

const controls = {
  educationLevel: ['educationLevel'],
  courseCode: ['educationLevel', 'course'],
  studyYear: ['educationLevel', 'studyYear', 'courseDuration'],
  domicileState: ['domicile'],
  annualHouseholdIncome: ['income'],
  institutionType: ['institution'],
  category: ['category'],
  academicScore: ['scoreType', 'scoreScale', 'score', 'scoreContext'],
  ...Object.fromEntries(
    Object.keys(ADDITIONAL_FIELDS).map((key) => [
      `additionalAnswers.${key}`,
      [`additionalAnswers.${key}`],
    ]),
  ),
};
const fieldOrder = Object.keys(controls);
const draftOrder = [...new Set(Object.values(controls).flat())];
const money = (value) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 21 }).format(value)}`;

/** A deterministic, gap-free partition; it does not promise strict-boundary certainty. */
function incomeBands(edges) {
  const sorted = [...edges].sort((a, b) => a - b);
  const bands = [];
  const add = (min, max, minInclusive) => {
    const label =
      max === 0
        ? '₹0 (no annual household income)'
        : max === null
          ? `${minInclusive ? 'From' : 'Above'} ${money(min)} per year`
          : `${minInclusive ? 'Up to' : `Above ${money(min)} and up to`} ${money(max)} per year`;
    bands.push({
      id: `income-${minInclusive ? 'closed' : 'open'}-${min}-${max ?? 'infinity'}`,
      label,
      value: {
        min,
        max,
        minInclusive,
        maxInclusive: max !== null,
        currency: 'INR',
        period: 'year',
      },
    });
  };
  let previous = 0;
  for (const edge of sorted) {
    add(previous, edge, bands.length === 0);
    previous = edge;
  }
  add(previous, null, bands.length === 0);
  return bands;
}

/** Consume validated catalogue rule trees, never profile answers or manual-check prose. */
export function buildQuestionPlan(catalogue, { vocab } = {}) {
  assertValid(
    'question-plan',
    isObject(catalogue) &&
      Array.isArray(catalogue.schemes) &&
      typeof catalogue.catalogueVersion === 'string' &&
      vocab?.codes
      ? []
      : [
          issue(
            'catalogue',
            'question-plan',
            'A catalogue and injected vocabularies are required.',
          ),
        ],
  );
  const fields = new Set();
  const edges = new Set();
  for (const record of catalogue.schemes) {
    assertValid(
      'question-plan',
      isObject(record?.eligibility) && Array.isArray(record.documents)
        ? []
        : [issue('schemes', 'question-plan', 'Validated scheme records are required.')],
    );
    const trees = [record.eligibility.rule, ...record.documents.map((doc) => doc?.appliesWhen)];
    const seenIds = new Set();
    for (const tree of trees) {
      if (tree === null) continue;
      assertValid('question-plan', validateRule(tree, { vocab, seenIds }).errors);
      for (const [node] of walkRules(tree)) {
        if (!node.field) continue;
        assertValid(
          'question-plan',
          isDeclaredField(node.field) && Object.hasOwn(controls, node.field)
            ? []
            : [
                issue(
                  'field',
                  'question-mapping',
                  'The referenced field needs a supported control.',
                ),
              ],
        );
        fields.add(node.field);
        if (node.field === 'annualHouseholdIncome') {
          const boundaries = [node.min, node.max, ...[].concat(node.value ?? [])];
          for (const edge of boundaries) if (Number.isFinite(edge) && edge >= 0) edges.add(edge);
        }
      }
    }
  }
  const requiredProfileFields = fieldOrder.filter((field) => fields.has(field));
  const activeControls = new Set(requiredProfileFields.flatMap((field) => controls[field]));
  return {
    catalogueVersion: catalogue.catalogueVersion,
    requiredProfileFields,
    draftFieldIds: draftOrder.filter((id) => activeControls.has(id)),
    incomeBands: fields.has('annualHouseholdIncome') ? incomeBands(edges) : [],
  };
}
