import { ADDITIONAL_FIELDS, PROFILE_FIELDS } from './fields.js';
import { validateProfile } from '../validation/profile.js';
import { compareText, isObject } from '../validation/common.js';

const LEGACY = {
  domicile: 'domicileState',
  educationLevel: 'educationLevel',
  course: 'courseCode',
  studyYear: 'studyYear',
  income: 'annualHouseholdIncome',
  institution: 'institutionType',
  category: 'category',
};
const COMPANIONS = ['courseDuration', 'scoreType', 'score', 'scoreContext', 'scoreScale'];
const ALLOWED = new Set([
  ...Object.keys(LEGACY),
  ...Object.keys(PROFILE_FIELDS),
  ...COMPANIONS,
  'additionalAnswers',
]);
const AMBIGUOUS_COURSES = new Set([
  'Arts / humanities',
  'Science',
  'Commerce',
  'Engineering',
  'Medicine / health sciences',
  'Commerce / management',
  'Other undergraduate course',
  'Other postgraduate course',
  'Other diploma',
]);
const COURSE_LABELS = {
  'Secondary school': 'school-secondary',
  'Higher secondary school': 'school-higher-secondary',
};
const INSTITUTIONS = {
  Government: 'govt',
  'Government-aided': 'govt-aided',
  Private: 'private-other',
  Other: 'other',
};
const blank = (value) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
const unknownState = (value) =>
  value === 'declined'
    ? 'declined'
    : blank(value) || value === 'unknown' || value === 'unsure'
      ? 'unsure'
      : null;
const known = (value) => ({ state: 'known', value });
const number = (value) =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value.trim())
      ? Number(value)
      : NaN;
const plainObject = (value) =>
  isObject(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** Strict submission boundary. The legacy filtering helper is intentionally not used. */
export function normalizeProfile(draft, { askedFields, incomeBands, vocab } = {}) {
  const errors = [];
  const mappingIssues = [];
  const fail = (field, message) => errors.push({ field, message });
  const clarify = (field, code, message) => {
    mappingIssues.push({ field, code, message });
    return { state: 'unsure' };
  };
  if (!plainObject(draft))
    return { ok: false, errors: [{ field: '', message: 'Draft must be an object.' }] };
  if (!Array.isArray(askedFields) && !(askedFields instanceof Set))
    fail('askedFields', 'Explicit askedFields are required.');
  const asked = new Set(
    Array.isArray(askedFields) || askedFields instanceof Set ? askedFields : [],
  );
  for (const field of asked) {
    if (
      !ALLOWED.has(field) &&
      !(
        typeof field === 'string' &&
        field.startsWith('additionalAnswers.') &&
        Object.hasOwn(ADDITIONAL_FIELDS, field.slice('additionalAnswers.'.length))
      )
    )
      fail('askedFields', 'Asked fields must be declared draft fields.');
  }
  for (const field of Object.keys(draft))
    if (!ALLOWED.has(field)) fail(field, 'Undeclared draft field is not allowed.');
  if (!vocab?.codes || !vocab?.files)
    fail('vocab', 'Injected vocabulary codes and entries are required.');
  const profile = { profileVersion: 1 };
  const lookup = (value, vocabulary) => {
    if (typeof value !== 'string') return undefined;
    if (vocab?.codes?.[vocabulary]?.has(value)) return value;
    const entries = vocab?.files?.[vocabulary]?.entries || [];
    const matches = entries.filter(
      (entry) => entry.label === value || entry.aliases?.includes(value),
    );
    return matches.length === 1 ? matches[0].code : undefined;
  };
  const convert = (field, value) => {
    // Typed envelopes are never repaired or downgraded; validate every supplied value below.
    if (isObject(value) && 'state' in value) return value;
    const state = unknownState(value);
    if (state) return { state };
    if (field === 'studyYear') {
      if (isObject(value)) return known(value);
      if (value === 'Other class' || value === 'Year 5 or later')
        return clarify(
          field,
          'ambiguous_stage',
          'Confirm the exact study stage and course duration.',
        );
      const school = typeof value === 'string' && /^Class (1[0-2]|[1-9])$/.exec(value);
      if (school) return known({ stage: `class-${school[1]}` });
      const year = typeof value === 'string' && /^Year ([1-9]\d*)$/.exec(value);
      if (year) {
        if (asked.has('courseDuration') && draft.courseDuration === 'declined')
          return { state: 'declined' };
        if (!asked.has('courseDuration') || unknownState(draft.courseDuration))
          return clarify(field, 'missing_duration', 'Confirm the total course duration.');
        return known({ stage: Number(year[1]), of: number(draft.courseDuration) });
      }
    } else if (field === 'annualHouseholdIncome') {
      if (isObject(value)) return known(value);
      const matches = Array.isArray(incomeBands)
        ? incomeBands.filter((band) => band.id === value)
        : [];
      if (matches.length === 1) return known(matches[0].value);
    } else if (field === 'academicScore') {
      if (isObject(value)) return known(value);
    } else if (field === 'courseCode' && AMBIGUOUS_COURSES.has(value)) {
      return clarify(
        field,
        'ambiguous_course',
        'Choose a specific course; a broad stream does not identify a degree.',
      );
    } else {
      let mapped = value;
      if (field === 'educationLevel' && value === 'diploma') mapped = 'diploma-technical';
      if (field === 'institutionType' && Object.hasOwn(INSTITUTIONS, value))
        mapped = INSTITUTIONS[value];
      if (field === 'courseCode' && Object.hasOwn(COURSE_LABELS, value))
        mapped = COURSE_LABELS[value];
      if (field === 'category' && value === 'Other') mapped = 'other';
      const code = lookup(mapped, PROFILE_FIELDS[field].vocabulary);
      if (code !== undefined) return known(code);
    }
    fail(field, 'Choose a valid option or supply a valid typed value.');
    return { state: 'unsure' };
  };
  // Validate companion values even when hidden: normalization must not launder bad data.
  if (
    !unknownState(draft.courseDuration) &&
    (!Number.isInteger(number(draft.courseDuration)) || number(draft.courseDuration) < 1)
  )
    fail('courseDuration', 'Course duration must be a positive integer.');
  if (
    !unknownState(draft.scoreType) &&
    !['percentage', 'percentile', 'cgpa', 'cgpa-10', 'cgpa-4'].includes(draft.scoreType)
  )
    fail('scoreType', 'Choose a valid score format.');
  if (!unknownState(draft.scoreScale) && !vocab?.codes?.['score-scales']?.has(draft.scoreScale))
    fail('scoreScale', 'Choose a valid score scale.');
  if (
    draft.scoreType === 'cgpa' &&
    !unknownState(draft.scoreScale) &&
    !['cgpa-10', 'cgpa-4'].includes(draft.scoreScale)
  )
    fail('scoreScale', 'CGPA requires an explicit CGPA scale; no conversion is permitted.');
  if (
    !unknownState(draft.scoreScale) &&
    !unknownState(draft.scoreType) &&
    draft.scoreType !== 'cgpa' &&
    draft.scoreScale !== draft.scoreType
  )
    fail('scoreScale', 'Score scale and selected score format must agree.');
  if (
    !unknownState(draft.scoreContext) &&
    !vocab?.codes?.['exam-contexts']?.has(draft.scoreContext)
  )
    fail('scoreContext', 'Choose a valid examination context.');
  const suppliedScale = draft.scoreScale || draft.scoreType;
  const upper = suppliedScale === 'cgpa-4' ? 4 : suppliedScale === 'cgpa-10' ? 10 : 100;
  if (
    !unknownState(draft.score) &&
    (!Number.isFinite(number(draft.score)) ||
      number(draft.score) < 0 ||
      number(draft.score) > upper)
  )
    fail('score', 'Score must be a finite number within the selected scale.');

  for (const field of Object.keys(PROFILE_FIELDS)) {
    const legacy = Object.keys(LEGACY).find((key) => LEGACY[key] === field);
    const keys = [...new Set([field, legacy].filter(Boolean))];
    const supplied = keys.filter((key) => Object.hasOwn(draft, key));
    if (supplied.length > 1)
      fail(field, 'Do not supply both canonical and legacy answers for one field.');
    const key = supplied[0] || keys.find((key) => asked.has(key)) || field;
    const answer = convert(field, draft[key]);
    const check = validateProfile({ profileVersion: 1, [field]: answer }, { vocab });
    errors.push(...check.errors);
    // Valid stale hidden answers are discarded only after their shape has been checked.
    profile[field] = keys.some((key) => asked.has(key)) ? answer : { state: 'not-asked' };
  }

  const scoreAsked = COMPANIONS.slice(1).some((key) => asked.has(key));
  if (scoreAsked) {
    if (asked.has('academicScore') || Object.hasOwn(draft, 'academicScore'))
      fail('academicScore', 'Do not combine typed and split score inputs.');
    let answer;
    const type = asked.has('scoreType') ? draft.scoreType : undefined;
    if (COMPANIONS.slice(1).some((key) => asked.has(key) && draft[key] === 'declined'))
      answer = { state: 'declined' };
    else if (unknownState(type)) answer = { state: unknownState(type) };
    else if (type === 'cgpa' && (!asked.has('scoreScale') || unknownState(draft.scoreScale)))
      answer = clarify(
        'academicScore',
        'missing_scale',
        'Confirm the CGPA scale; no conversion is assumed.',
      );
    else if (!asked.has('score') || unknownState(draft.score))
      answer = { state: unknownState(draft.score) || 'unsure' };
    else if (!asked.has('scoreContext') || unknownState(draft.scoreContext))
      answer = clarify(
        'academicScore',
        'missing_context',
        'Confirm which examination the score describes.',
      );
    else
      answer = known({
        value: number(draft.score),
        scale: type === 'cgpa' ? draft.scoreScale : type,
        context: draft.scoreContext,
      });
    profile.academicScore = answer;
  }

  profile.additionalAnswers = {};
  if ('additionalAnswers' in draft && !plainObject(draft.additionalAnswers))
    fail('additionalAnswers', 'Additional answers must be an object.');
  else
    for (const [key, value] of Object.entries(draft.additionalAnswers || {})) {
      if (!Object.hasOwn(ADDITIONAL_FIELDS, key)) {
        fail(`additionalAnswers.${key}`, 'Undeclared additional field is not allowed.');
        continue;
      }
      const answer = isObject(value)
        ? value
        : unknownState(value)
          ? { state: unknownState(value) }
          : known(value);
      errors.push(
        ...validateProfile({ profileVersion: 1, additionalAnswers: { [key]: answer } }, { vocab })
          .errors,
      );
      profile.additionalAnswers[key] =
        asked.has(`additionalAnswers.${key}`) || asked.has('additionalAnswers')
          ? answer
          : { state: 'not-asked' };
    }
  for (const key of Object.keys(ADDITIONAL_FIELDS)) {
    if (!Object.hasOwn(profile.additionalAnswers, key))
      profile.additionalAnswers[key] = {
        state:
          asked.has(`additionalAnswers.${key}`) || asked.has('additionalAnswers')
            ? 'unsure'
            : 'not-asked',
      };
  }
  errors.push(...validateProfile(profile, { vocab }).errors);
  if (errors.length) {
    errors.sort((a, b) => compareText(a.field, b.field) || compareText(a.message, b.message));
    return {
      ok: false,
      errors: errors.filter(
        (entry, index) =>
          !index ||
          entry.field !== errors[index - 1].field ||
          entry.message !== errors[index - 1].message,
      ),
    };
  }
  mappingIssues.sort((a, b) => compareText(a.field, b.field) || compareText(a.code, b.code));
  return {
    ok: true,
    profile: structuredClone(profile),
    mappingIssues: mappingIssues.filter((issue) => profile[issue.field].state !== 'not-asked'),
  };
}
