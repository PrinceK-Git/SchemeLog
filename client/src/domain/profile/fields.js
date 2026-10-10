/** Browser-safe shared profile field contract. */
/** Scalar shape each field carries when `state === 'known'`. */
export const PROFILE_FIELDS = {
  domicileState: { vocabulary: 'states', shape: 'code' },
  educationLevel: { vocabulary: 'education-levels', shape: 'code' },
  courseCode: { vocabulary: 'courses', shape: 'code' },
  studyYear: { vocabulary: null, shape: 'studyYear' },
  annualHouseholdIncome: { vocabulary: null, shape: 'incomeInterval' },
  academicScore: { vocabulary: null, shape: 'academicScore' },
  category: { vocabulary: 'categories', shape: 'code' },
  institutionType: { vocabulary: 'institution-types', shape: 'code' },
};

/**
 * Scheme-specific yes/no questions. Shared declarations, reused when wording matches
 * (Phase 2 §14 open question, resolved in favour of shared declarations).
 */
export const ADDITIONAL_FIELDS = {
  receivesOtherScholarship: {
    shape: 'code',
    values: ['yes', 'no'],
    label: 'Are you already receiving another scholarship, fee waiver, or stipend?',
    hint: 'Many schemes exclude students who hold another scholarship for the same year.',
  },
  receivesOtherStateScholarship: {
    shape: 'code',
    values: ['yes', 'no'],
    label: 'Are you receiving a scholarship from a state government?',
    hint: 'Used only by fixtures in this release.',
  },
  isRegularFullTimeStudent: {
    shape: 'code',
    values: ['yes', 'no'],
    label: 'Are you enrolled as a regular, full-time student?',
    hint: 'Distance, correspondence, and part-time courses are often excluded.',
  },
  studiesThroughDistanceMode: {
    shape: 'code',
    values: ['yes', 'no'],
    label: 'Is your course delivered through distance or correspondence mode?',
  },
  isParentGovernmentEmployee: {
    shape: 'code',
    values: ['yes', 'no'],
    label: 'Is a parent or guardian employed by central or state government?',
  },
};

/** Four answer states (§6). Only `known` can pass or fail a rule. */
export const ANSWER_STATES = ['known', 'unsure', 'declined', 'not-asked'];

/**
 * Never collected, never stored, never accepted by `validateProfile()`.
 * Any key matching one of these (case-insensitive) is a validation error.
 */
export const FORBIDDEN_FIELDS = [
  'aadhaar',
  'aadhar',
  'uid',
  'bankaccount',
  'accountnumber',
  'ifsc',
  'pan',
  'phone',
  'mobile',
  'email',
  'password',
  'otp',
  'dob',
  'name',
  'address',
];

/**
 * @param {string} fieldPath e.g. 'domicileState' or 'additionalAnswers.receivesOtherScholarship'
 * @returns {boolean}
 */
export function isDeclaredField(fieldPath) {
  if (typeof fieldPath !== 'string' || fieldPath === '') return false;
  if (fieldPath.startsWith('additionalAnswers.')) {
    return Object.hasOwn(ADDITIONAL_FIELDS, fieldPath.slice('additionalAnswers.'.length));
  }
  return Object.hasOwn(PROFILE_FIELDS, fieldPath);
}

/**
 * Which vocabulary a profile field's codes are drawn from.
 * Fields absent from this map are not code fields.
 */
export const FIELD_VOCABULARY = {
  domicileState: 'states',
  educationLevel: 'education-levels',
  courseCode: 'courses',
  category: 'categories',
  institutionType: 'institution-types',
};

/** Fields that carry a numeric comparison (§8 rule operator table). */
export const NUMERIC_FIELDS = new Set(['annualHouseholdIncome', 'academicScore', 'studyYear']);

/** Fields a score rule applies to; these must declare `scale` and `context`. */
export const SCORE_FIELDS = new Set(['academicScore']);
