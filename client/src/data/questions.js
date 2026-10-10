import { vocabularies } from './vocabularies.js';
import { ADDITIONAL_FIELDS } from '../domain/profile/fields.js';

const option = (value, label) => ({ value, label });
export const unknown = option('unknown', "I'm not sure");
export const declined = option('declined', 'Prefer not to answer');
const choices = (name) =>
  vocabularies.files[name].entries.map(({ code, label }) => option(code, label));
const optional = (options) => [...options, unknown, declined];
export const educationOptions = optional(
  choices('education-levels').map((entry) =>
    entry.value === 'diploma-technical' ? { ...entry, value: 'diploma' } : entry,
  ),
);

export const fieldLabels = {
  educationLevel: 'Current level of study',
  courseCode: 'Course or stream',
  course: 'Course or stream',
  studyYear: 'Current year or school class',
  courseDuration: 'Total course duration in years',
  domicileState: 'Home state / domicile',
  domicile: 'Home state / domicile',
  annualHouseholdIncome: 'Annual household income',
  income: 'Annual household income',
  institutionType: 'Institution type',
  institution: 'Institution type',
  category: 'Category',
  academicScore: 'Academic examination score',
  scoreType: 'Examination score format',
  scoreScale: 'CGPA scale',
  score: 'Examination score',
  scoreContext: 'Which examination does this score describe?',
  ...Object.fromEntries(
    Object.entries(ADDITIONAL_FIELDS).map(([key, value]) => [
      `additionalAnswers.${key}`,
      value.label,
    ]),
  ),
};

export const sectionDefinitions = [
  {
    id: 'education',
    short: 'Education',
    title: 'Let’s start with your studies.',
    description: 'Only questions needed by this catalogue are included.',
    fields: ['educationLevel', 'course', 'courseDuration', 'studyYear'],
  },
  {
    id: 'location',
    short: 'Domicile',
    title: 'Where is your home state?',
    description: 'Domicile may be different from the state where you study.',
    fields: ['domicile'],
  },
  {
    id: 'income',
    short: 'Household',
    title: 'A little about your household.',
    description: 'Choose an annual range, or leave this unknown. No certificate is needed here.',
    fields: ['income'],
  },
  {
    id: 'details',
    short: 'Other details',
    title: 'Just a few more details.',
    description: 'These questions are referenced by this catalogue. You can choose not to share.',
    fields: [
      'institution',
      'category',
      'scoreType',
      'scoreScale',
      'scoreContext',
      'score',
      ...Object.keys(ADDITIONAL_FIELDS).map((key) => `additionalAnswers.${key}`),
    ],
  },
];

export function getDraftAnswer(draft, id) {
  return id.startsWith('additionalAnswers.')
    ? draft.additionalAnswers?.[id.slice('additionalAnswers.'.length)]
    : draft[id];
}

/** No plan means no active collection. Plans, not previous answers, define relevance. */
export function fieldsFor(draft = {}, plan = { draftFieldIds: [], incomeBands: [] }) {
  const active = new Set(plan.draftFieldIds);
  const level = draft.educationLevel;
  const hasLevel = [
    'school',
    'undergraduate',
    'postgraduate',
    'diploma',
    'diploma-technical',
    'other',
  ].includes(level);
  const prefixes = {
    school: 'school-',
    undergraduate: 'ug-',
    postgraduate: 'pg-',
    diploma: 'diploma-',
    'diploma-technical': 'diploma-',
  };
  const courses = choices('courses').filter(
    ({ value }) => value === 'other' || (prefixes[level] && value.startsWith(prefixes[level])),
  );
  const isSchool = level === 'school';
  const duration = Number(draft.courseDuration);
  const yearCount = Number.isInteger(duration) && duration >= 1 && duration <= 100 ? duration : 12;
  const scale = draft.scoreType === 'cgpa' ? draft.scoreScale : draft.scoreType;
  const scoreReady = ['percentage', 'percentile', 'cgpa-10', 'cgpa-4'].includes(scale);
  const definitions = {
    educationLevel: { type: 'radio', options: educationOptions },
    course: {
      visible: hasLevel,
      options: optional(courses),
      hint: 'Choose the exact course; a broad stream cannot identify a degree.',
    },
    studyYear: {
      visible: hasLevel,
      label: isSchool ? 'Current school class' : 'Current year of study',
      options: optional(
        isSchool
          ? choices('school-stages').map(({ label }) => option(label, label))
          : Array.from({ length: yearCount }, (_, index) =>
              option(`Year ${index + 1}`, `Year ${index + 1}`),
            ),
      ),
    },
    courseDuration: {
      type: 'number',
      visible: hasLevel && !isSchool,
      min: 1,
      max: 100,
      step: 1,
      unit: 'years',
      hint: 'Enter the actual duration; it is never inferred from your course.',
    },
    domicile: { options: optional(choices('states')) },
    income: {
      options: optional((plan.incomeBands ?? []).map((band) => option(band.id, band.label))),
      hint: 'Annual household income in INR, not monthly income. A band overlapping a strict condition remains uncertain.',
    },
    institution: {
      options: optional(choices('institution-types')),
      hint: 'Ownership type does not establish recognition or accreditation.',
    },
    category: {
      options: optional(choices('categories')),
      hint: 'You can leave this unknown or choose not to answer.',
    },
    scoreType: {
      options: optional([
        option('percentage', 'Percentage'),
        option('percentile', 'Percentile'),
        option('cgpa', 'CGPA'),
      ]),
      hint: 'Percentage, percentile and CGPA are different; no conversion is performed.',
    },
    scoreScale: {
      visible: draft.scoreType === 'cgpa',
      options: optional(choices('score-scales').filter(({ value }) => value.startsWith('cgpa-'))),
    },
    score: {
      type: 'number',
      visible: scoreReady,
      min: 0,
      max: scale === 'cgpa-4' ? 4 : scale === 'cgpa-10' ? 10 : 100,
      step: 'any',
      unit:
        scale === 'percentage'
          ? '%'
          : scale === 'percentile'
            ? 'percentile'
            : scale === 'cgpa-4'
              ? 'out of 4'
              : 'out of 10',
      hint: 'Leave blank if unsure. Zero is a valid score.',
    },
    scoreContext: {
      options: optional(choices('exam-contexts')),
      hint: 'Select the actual examination; no context is assumed.',
    },
    ...Object.fromEntries(
      Object.entries(ADDITIONAL_FIELDS).map(([key, declaration]) => [
        `additionalAnswers.${key}`,
        {
          options: optional(
            declaration.values.map((value) => option(value, value === 'yes' ? 'Yes' : 'No')),
          ),
          hint: declaration.hint,
        },
      ]),
    ),
  };
  return Object.fromEntries(
    Object.entries(definitions).map(([id, definition]) => [
      id,
      {
        label: fieldLabels[id],
        ...definition,
        visible: active.has(id) && definition.visible !== false,
      },
    ]),
  );
}

export function visibleSections(draft, plan) {
  const definitions = fieldsFor(draft, plan);
  return sectionDefinitions
    .map((section) => ({
      ...section,
      fields: section.fields.filter((id) => definitions[id].visible),
    }))
    .filter((section) => section.fields.length);
}

export function updateAnswer(draft, field, value) {
  if (!Object.hasOwn(fieldLabels, field)) throw new TypeError('Choose a declared answer field.');
  const next = { ...draft };
  if (field.startsWith('additionalAnswers.')) {
    next.additionalAnswers = {
      ...draft.additionalAnswers,
      [field.slice('additionalAnswers.'.length)]: value,
    };
  } else next[field] = value;
  if (value === getDraftAnswer(draft, field)) return next;
  const resets = {
    educationLevel: [
      'course',
      'courseCode',
      'studyYear',
      'courseDuration',
      'scoreType',
      'score',
      'scoreContext',
      'scoreScale',
      'academicScore',
    ],
    course: ['studyYear', 'courseDuration', 'score', 'scoreContext', 'academicScore'],
    courseDuration: ['studyYear'],
    scoreType: ['score', 'scoreScale', 'academicScore'],
    scoreScale: ['score', 'academicScore'],
    scoreContext: ['score', 'academicScore'],
  };
  for (const dependent of resets[field] ?? []) delete next[dependent];
  return next;
}

const blank = (value) => value == null || (typeof value === 'string' && !value.trim());
export function validateAnswers(draft, fieldIds, plan) {
  const definitions = fieldsFor(draft, plan);
  const errors = {};
  for (const id of fieldIds ?? Object.keys(definitions)) {
    const field = definitions[id];
    const value = getDraftAnswer(draft, id);
    if (!field?.visible || blank(value)) continue;
    if (field.type === 'number') {
      if (['unknown', 'unsure', 'declined'].includes(value)) continue;
      const numeric =
        typeof value === 'number'
          ? value
          : typeof value === 'string' && /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value.trim())
            ? Number(value)
            : NaN;
      if (
        !Number.isFinite(numeric) ||
        numeric < field.min ||
        numeric > field.max ||
        (field.step === 1 && !Number.isInteger(numeric))
      )
        errors[id] =
          `Enter ${field.step === 1 ? 'a whole number' : 'a number'} from ${field.min} to ${field.max}, or leave blank.`;
    } else if (!field.options.some((entry) => entry.value === value))
      errors[id] = 'Choose one of the available answers, or leave this unknown.';
  }
  return errors;
}

export function answerLabel(draft, id, plan) {
  const value = getDraftAnswer(draft, id);
  if (blank(value)) return 'Not answered';
  if (value === 'declined') return declined.label;
  if (value === 'unknown' || value === 'unsure') return unknown.label;
  const definition = fieldsFor(draft, plan)[id];
  const selected = definition?.options?.find((entry) => entry.value === value);
  if (selected) return selected.label;
  if (
    definition?.type === 'number' &&
    !validateAnswers(draft, [id], plan)[id] &&
    ['string', 'number'].includes(typeof value)
  )
    return `${value}${definition.unit === '%' ? '%' : ` ${definition.unit}`}`;
  return 'Answer needs checking';
}
