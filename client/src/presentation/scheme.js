import publishedCatalogue from '../data/catalogue.json' with { type: 'json' };
import { vocabularies } from '../data/vocabularies.js';
import { fieldLabels } from '../data/questions.js';
import { effectiveFreshness, kolkataDate } from '../domain/freshness.js';
import { isObject, validDate, validInstant } from '../domain/validation/common.js';
import {
  safeHttpsUrl,
  safeText,
  validatePresentationScheme,
} from '../domain/validation/catalogue.js';
import { validateAssessmentScheme, walkRules } from '../domain/validation/scheme.js';

export const assessmentGroups = [
  {
    id: 'potential',
    title: 'Potential match',
    icon: 'check',
    description: 'Evaluated usable conditions pass; this does not guarantee an award.',
  },
  {
    id: 'verification',
    title: 'Needs verification',
    icon: 'clock',
    description: 'Some conditions or scheme information still need checking.',
  },
  {
    id: 'unmet',
    title: 'Does not meet a known condition',
    icon: 'minus',
    description: 'A known mandatory condition is not met.',
  },
  {
    id: 'unavailable',
    title: 'Information unavailable',
    icon: 'info',
    description: 'There is insufficient usable scheme information.',
  },
];
const money = (value) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 21 }).format(value)}`;
const label = (code, vocabulary) => {
  const files = vocabulary ? [vocabularies.files[vocabulary]] : Object.values(vocabularies.files);
  return (
    files.flatMap((file) => file.entries).find((entry) => entry.code === code)?.label ??
    (code === 'yes' ? 'Yes' : code === 'no' ? 'No' : safeText(code) ? code : 'Not specified')
  );
};

export function formatAnswer(envelope) {
  if (!isObject(envelope)) return 'Not applicable';
  if (envelope.state !== 'known') {
    const states = {
      unsure: 'Not sure',
      declined: 'Prefer not to answer',
      'not-asked': 'Not asked',
    };
    return Object.hasOwn(states, envelope.state) ? states[envelope.state] : 'Answer unavailable';
  }
  const value = envelope.value;
  if (typeof value === 'string') return label(value);
  if (!isObject(value)) return 'Answer unavailable';
  if (
    value.currency === 'INR' &&
    value.period === 'year' &&
    Number.isFinite(value.min) &&
    (value.max === null || Number.isFinite(value.max))
  ) {
    if (value.min === value.max && value.minInclusive && value.maxInclusive)
      return `${money(value.min)} per year`;
    const lower = `${value.minInclusive ? 'At least' : 'Above'} ${money(value.min)}`;
    const upper =
      value.max === null
        ? ''
        : ` and ${value.maxInclusive ? 'up to' : 'below'} ${money(value.max)}`;
    return `${lower}${upper} per year`;
  }
  if (
    Number.isFinite(value.value) &&
    typeof value.scale === 'string' &&
    typeof value.context === 'string'
  ) {
    const score =
      value.scale === 'percentage'
        ? `${value.value}%`
        : `${value.value} (${label(value.scale, 'score-scales')})`;
    return `${score} — ${label(value.context, 'exam-contexts')}`;
  }
  if (typeof value.stage === 'string') return label(value.stage, 'school-stages');
  if (Number.isInteger(value.stage) && Number.isInteger(value.of))
    return `Year ${value.stage} of ${value.of}`;
  return 'Answer unavailable';
}

export function formatRequirement(row) {
  if (!isObject(row)) return 'Condition unavailable';
  const expected = row.expected ?? row;
  const operator = row.operator ?? expected.operator;
  const groups = {
    allOf: 'All conditions required',
    anyOf: 'At least one alternative required',
    not: 'Exclusion — this condition must not apply',
  };
  if (Object.hasOwn(groups, operator)) return groups[operator];
  if (operator === 'manualVerification')
    return safeText(expected.checkHint) ? expected.checkHint : 'Check this condition separately';
  const name = fieldLabels[row.field] ?? 'Condition';
  const operand = (value) =>
    row.field === 'annualHouseholdIncome' && Number.isFinite(value)
      ? `${money(value)} per year`
      : typeof value === 'number'
        ? String(value)
        : label(value);
  let requirement;
  if (operator === 'between')
    requirement = `${expected.minInclusive ? 'at least' : 'above'} ${operand(expected.min)} and ${expected.maxInclusive ? 'at most' : 'below'} ${operand(expected.max)}`;
  else if (operator === 'in' && Array.isArray(expected.value))
    requirement = `one of ${expected.value.map(operand).join(', ')}`;
  else {
    const operators = { eq: 'is', lt: 'below', lte: 'at most', gt: 'above', gte: 'at least' };
    requirement = `${operators[operator] ?? 'requires'} ${operand(expected.value)}`;
  }
  const dimension =
    row.field === 'academicScore'
      ? ` (${label(expected.scale, 'score-scales')}; ${label(expected.context, 'exam-contexts')})`
      : row.field === 'studyYear'
        ? ` (${expected.unit === 'school-class' ? 'school class' : 'course year'})`
        : '';
  return `${name}: ${requirement}${dimension}`;
}

const destinations = {
  'scheme-info': 'Scheme information',
  guidelines: 'Read guidelines',
  application: 'Application portal',
};
function reviewed(record, date) {
  const verification = record?.verification;
  return (
    record?.publicationStatus === 'published' &&
    !record.fictional &&
    typeof record.id === 'string' &&
    record.id.startsWith('sch-') &&
    isObject(verification) &&
    [verification.curatedBy, verification.reviewedBy].every(
      (person) => safeText(person) && person.trim().length >= 2,
    ) &&
    !/^(unknown|none|null|pending|unreviewed|ai(?:[- ].*)?|automated(?:[- ].*)?)$/i.test(
      verification.reviewedBy.trim(),
    ) &&
    verification.curatedBy.trim().toLowerCase() !== verification.reviewedBy.trim().toLowerCase() &&
    validDate(verification.curatedAt) &&
    validDate(verification.reviewedAt) &&
    verification.curatedAt <= verification.reviewedAt &&
    verification.reviewedAt <= date
  );
}

/** The generated artifact is the offline registry/review approval boundary, never a hostname. */
export function safeDestinations(record, { mode, evaluatedAt } = {}) {
  if (mode !== 'reviewed' || !validInstant(evaluatedAt)) return [];
  const date = kolkataDate(evaluatedAt);
  if (
    !reviewed(record, date) ||
    validatePresentationScheme(record, { mode }).length ||
    validateAssessmentScheme(record, { mode, vocab: vocabularies }).length
  )
    return [];
  const backing = publishedCatalogue.schemes.find(
    (candidate) => candidate.id === record.id && candidate.recordVersion === record.recordVersion,
  );
  if (!backing || !reviewed(backing, date)) return [];
  return record.links
    .filter((link) => {
      const approvedLink = backing.links.find((candidate) => candidate.id === link.id);
      return (
        approvedLink &&
        ['purpose', 'url', 'status', 'checkedAt'].every((key) => approvedLink[key] === link[key]) &&
        Object.hasOwn(destinations, link.purpose) &&
        link.status === 'verified' &&
        safeHttpsUrl(link.url) &&
        validDate(link.checkedAt) &&
        link.checkedAt <= date &&
        backing.sources.some((source) => source.url === link.url)
      );
    })
    .map((link) => ({
      id: link.id,
      purpose: link.purpose,
      label: destinations[link.purpose],
      url: link.url,
    }));
}

/** Display supported facts only; never compute or embellish personal eligibility. */
export function presentFacts(record, context = {}) {
  const empty = {
    summary: null,
    authority: null,
    benefits: [],
    applicationSteps: [],
    lastVerified: null,
  };
  if (
    !isObject(record) ||
    !['demo', 'reviewed'].includes(context.mode) ||
    validatePresentationScheme(record, context).length ||
    validateAssessmentScheme(record, { mode: context.mode, vocab: vocabularies }).length
  )
    return empty;
  if (context.mode === 'demo') return { ...empty, summary: record.summary ?? null };
  if (!validInstant(context.evaluatedAt) || !reviewed(record, kolkataDate(context.evaluatedAt)))
    return empty;
  const sourceIds = new Set(
    record.sources.flatMap((source) => [
      source.id,
      ...source.locators.map((locator) => `${source.id}#${locator.id}`),
    ]),
  );
  const supported = (refs) =>
    Array.isArray(refs) && refs.length > 0 && refs.every((ref) => sourceIds.has(ref));
  const dates = [];
  const benefits = [];
  for (const benefit of record.benefits ?? []) {
    if (
      !supported(benefit.evidence) ||
      effectiveFreshness(benefit.freshness, context).state !== 'current'
    )
      continue;
    const amount =
      benefit.amount.state === 'unknown'
        ? 'Amount not confirmed'
        : `${money(benefit.amount.value)} ${benefit.amount.frequency === 'one-time' ? 'one-time' : `per ${benefit.amount.frequency}`}`;
    benefits.push(
      `${benefit.description} — ${amount}${benefit.amount.cap ? ` (${benefit.amount.cap})` : ''}${benefit.conditions ? `; ${benefit.conditions}` : ''}`,
    );
    dates.push(benefit.freshness.checkedAt);
  }
  const applicationSteps = [];
  if (effectiveFreshness(record.application?.freshness, context).state === 'current') {
    for (const step of [...(record.applicationSteps ?? [])].sort((a, b) => a.order - b.order)) {
      if (!supported(step.evidence)) continue;
      applicationSteps.push(`${step.title}${step.description ? ` — ${step.description}` : ''}`);
      dates.push(record.application.freshness.checkedAt);
    }
  }
  // Free-form summaries may repeat expired amounts; withhold them when any benefit is unsupported.
  const allBenefitsCurrent = (record.benefits ?? []).every(
    (benefit) =>
      supported(benefit.evidence) &&
      benefit.amount.state !== 'unknown' &&
      effectiveFreshness(benefit.freshness, context).state === 'current',
  );
  if (allBenefitsCurrent && record.summary) dates.push(record.verification.reviewedAt);
  if (record.authority) dates.push(record.verification.reviewedAt);
  return {
    summary: allBenefitsCurrent ? (record.summary ?? null) : null,
    authority: record.authority?.name ?? null,
    benefits,
    applicationSteps,
    lastVerified: dates.length ? dates.sort()[0] : null,
  };
}

/** Only included visible, currently supported facts contribute to the display-wide date. */
export function displayedLastVerified(
  record,
  context = {},
  {
    includeAssessment = false,
    includeApplication = false,
    includeDocuments = false,
    includeApplicationSteps = false,
    links = [],
  } = {},
) {
  if (
    context.mode !== 'reviewed' ||
    !validInstant(context.evaluatedAt) ||
    !reviewed(record, kolkataDate(context.evaluatedAt)) ||
    validatePresentationScheme(record, context).length ||
    validateAssessmentScheme(record, { mode: context.mode, vocab: vocabularies }).length
  )
    return null;
  const facts = presentFacts(record, context);
  const dates = [];
  const date = kolkataDate(context.evaluatedAt);
  const addDate = (value) => {
    if (validDate(value) && value <= date) dates.push(value);
  };
  const supported = (refs) => Array.isArray(refs) && refs.length > 0;
  if (facts.summary || facts.authority) addDate(record.verification.reviewedAt);
  for (const benefit of record.benefits ?? []) {
    if (
      supported(benefit.evidence) &&
      effectiveFreshness(benefit.freshness, context).state === 'current'
    )
      addDate(benefit.freshness.checkedAt);
  }
  const applicationCurrent =
    effectiveFreshness(record.application.freshness, context).state === 'current';
  if (includeApplicationSteps && facts.applicationSteps.length && applicationCurrent)
    addDate(record.application.freshness.checkedAt);
  if (includeApplication && applicationCurrent) {
    const dateFacts = [
      record.application.opens,
      record.application.closes,
      record.application.statusOverride,
    ].filter(
      (fact) =>
        fact && supported(fact.evidence) && validDate(fact.checkedAt) && fact.checkedAt <= date,
    );
    if (dateFacts.length) {
      addDate(record.application.freshness.checkedAt);
      dateFacts.forEach((fact) => addDate(fact.checkedAt));
    }
  }
  const eligibility = effectiveFreshness(record.eligibility.freshness, context);
  const treeDates = (tree) => {
    if (!tree) return;
    const states = new Map();
    const ancestors = new Map();
    for (const [node] of walkRules(tree)) {
      const parent = ancestors.get(node.id);
      const state = effectiveFreshness(
        node.freshness,
        context,
        parent ? states.get(parent.id) : eligibility,
      );
      states.set(node.id, state);
      for (const child of node.children ?? (node.child ? [node.child] : []))
        ancestors.set(child.id, node);
      if (state.state !== 'current' || !supported(node.evidence)) continue;
      addDate(record.eligibility.freshness.checkedAt);
      let cursor = node;
      while (cursor) {
        if (cursor.freshness) addDate(cursor.freshness.checkedAt);
        cursor = ancestors.get(cursor.id);
      }
    }
  };
  if (includeAssessment && record.eligibility.coverage !== 'unusable')
    treeDates(record.eligibility.rule);
  if (includeDocuments) {
    for (const document of record.documents) {
      if (eligibility.state === 'current' && supported(document.evidence))
        addDate(record.eligibility.freshness.checkedAt);
      if (includeAssessment) treeDates(document.appliesWhen);
    }
  }
  const authorized = safeDestinations(record, context);
  for (const visible of Array.isArray(links) ? links : []) {
    if (authorized.some((link) => link.id === visible.id && link.url === visible.url))
      addDate(record.links.find((link) => link.id === visible.id).checkedAt);
  }
  return dates.length ? dates.sort()[0] : null;
}
