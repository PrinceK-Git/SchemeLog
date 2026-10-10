import { loadVocabularies, FIELD_VOCABULARY } from './vocab.js';
import {
  ADDITIONAL_FIELDS,
  ANSWER_STATES,
  FORBIDDEN_FIELDS,
  PROFILE_FIELDS,
} from '../../data/question-fields.js';

const SCHOOL_STAGE = /^class-(1[0-2]|[1-9])$/;
const SCORE_RANGES = {
  percentage: [0, 100],
  percentile: [0, 100],
  'cgpa-10': [0, 10],
  'cgpa-4': [0, 4],
};

const error = (field, message) => ({ field, message });
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const extraKeys = (value, allowed) =>
  Object.keys(value)
    .filter((key) => !allowed.includes(key))
    .map((key) => `Unexpected field "${key}" is not allowed.`);

/**
 * Check one `known` value against its declared shape (§6).
 * @returns {string[]} messages; empty when the value is well formed
 */
function checkValue(field, value, vocab) {
  const messages = [];
  const declaration = field.startsWith('additionalAnswers.')
    ? ADDITIONAL_FIELDS[field.slice('additionalAnswers.'.length)]
    : PROFILE_FIELDS[field];
  const shape = declaration.shape;

  if (shape === 'code') {
    if (typeof value !== 'string') return [`${field} must be a code string.`];
    const vocabularyName = FIELD_VOCABULARY[field];
    if (vocabularyName && !vocab.codes[vocabularyName].has(value))
      messages.push(`"${value}" is not a code in ${vocabularyName}.json.`);
    if (declaration.values && !declaration.values.includes(value))
      messages.push(`"${value}" is not one of ${declaration.values.join(', ')}.`);
    return messages;
  }

  if (shape === 'studyYear') {
    if (!isObject(value)) return [`${field} must be an object.`];
    messages.push(...extraKeys(value, ['stage', 'of']));
    if (typeof value.stage === 'string') {
      if (!SCHOOL_STAGE.test(value.stage))
        messages.push(`"${value.stage}" is not a school stage code.`);
      if ('of' in value) messages.push('A school stage must not carry "of".');
      return messages;
    }
    if (!Number.isInteger(value.stage) || value.stage < 1)
      messages.push('studyYear.stage must be an integer of at least 1.');
    if (!Number.isInteger(value.of) || value.of < 1)
      messages.push('studyYear.of must be an integer of at least 1.');
    if (Number.isInteger(value.stage) && Number.isInteger(value.of) && value.stage > value.of)
      messages.push(`studyYear.stage ${value.stage} cannot exceed studyYear.of ${value.of}.`);
    return messages;
  }

  if (shape === 'incomeInterval') {
    if (!isObject(value)) return [`${field} must be an interval object.`];
    messages.push(
      ...extraKeys(value, ['min', 'max', 'minInclusive', 'maxInclusive', 'currency', 'period']),
    );
    const { min, max, minInclusive, maxInclusive, currency, period } = value;
    if (!Number.isFinite(min) || min < 0)
      messages.push('income.min must be a number of at least 0.');
    if (max !== null && (!Number.isFinite(max) || max < 0))
      messages.push('income.max must be a number of at least 0, or null for an open band.');
    if (Number.isFinite(min) && Number.isFinite(max) && min > max)
      messages.push(`income.min ${min} is greater than income.max ${max}.`);
    if (Number.isFinite(min) && min === max && (minInclusive !== true || maxInclusive !== true))
      messages.push('income interval is empty: equal bounds must both be inclusive.');
    if (typeof minInclusive !== 'boolean' || typeof maxInclusive !== 'boolean')
      messages.push('income needs explicit minInclusive and maxInclusive booleans.');
    if (currency !== 'INR') messages.push('income.currency must be "INR".');
    if (period !== 'year')
      messages.push(
        'income.period must be "year"; convert a monthly figure with monthlyToAnnual().',
      );
    return messages;
  }

  if (shape === 'academicScore') {
    if (!isObject(value)) return [`${field} must be an object.`];
    messages.push(...extraKeys(value, ['value', 'scale', 'context']));
    const { value: score, scale, context } = value;
    if (!vocab.codes['score-scales'].has(scale))
      messages.push(`"${scale}" is not a known score scale.`);
    if (!vocab.codes['exam-contexts'].has(context))
      messages.push(`"${context}" is not a known exam context.`);
    if (!Number.isFinite(score)) {
      messages.push('academicScore.value must be a number.');
      return messages;
    }
    const range = SCORE_RANGES[scale];
    if (range && (score < range[0] || score > range[1]))
      messages.push(`A ${scale} score must be between ${range[0]} and ${range[1]}; got ${score}.`);
    return messages;
  }

  return [`No shape declared for ${field}.`];
}

function checkAnswer(field, answer, vocab, errors) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
    errors.push(error(field, 'Every field must be wrapped in an answer envelope.'));
    return;
  }
  for (const message of extraKeys(answer, ['state', 'value'])) errors.push(error(field, message));
  if (!ANSWER_STATES.includes(answer.state)) {
    errors.push(error(field, `Unknown answer state "${answer.state}".`));
    return;
  }
  if (answer.state !== 'known') {
    if ('value' in answer)
      errors.push(error(field, `A "${answer.state}" answer must not carry a value.`));
    return;
  }
  if (!('value' in answer)) {
    errors.push(error(field, 'A "known" answer must carry a value.'));
    return;
  }
  // A malformed `known` value is an error, never silently downgraded to unknown.
  for (const message of checkValue(field, answer.value, vocab)) errors.push(error(field, message));
}

/**
 * Validate a student profile against the Phase 2 field contract (§6).
 * Rejects forbidden fields, undeclared fields, and malformed `known` values.
 *
 * @param {object} profile
 * @param {{ vocab?: ReturnType<typeof loadVocabularies> }} [options]
 * @returns {{ ok: boolean, errors: { field: string, message: string }[] }}
 */
export function validateProfile(profile, options = {}) {
  const vocab = options.vocab ?? loadVocabularies();
  const errors = [];

  if (!profile || typeof profile !== 'object' || Array.isArray(profile))
    return { ok: false, errors: [error('', 'A profile must be an object.')] };
  if (!Number.isInteger(profile.profileVersion) || profile.profileVersion < 1)
    errors.push(error('profileVersion', 'profileVersion must be a positive integer.'));

  for (const [key, value] of Object.entries(profile)) {
    if (key === 'profileVersion') continue;
    const normalised = key.toLowerCase().replace(/[^a-z]/g, '');
    if (FORBIDDEN_FIELDS.some((forbidden) => normalised.includes(forbidden))) {
      errors.push(error(key, `"${key}" is a forbidden field; Schemelog never collects it.`));
      continue;
    }
    if (key === 'additionalAnswers') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        errors.push(error(key, 'additionalAnswers must be an object.'));
        continue;
      }
      for (const [extraKey, extraAnswer] of Object.entries(value)) {
        if (!Object.hasOwn(ADDITIONAL_FIELDS, extraKey)) {
          errors.push(
            error(
              `additionalAnswers.${extraKey}`,
              `"${extraKey}" is not declared in question-fields.js.`,
            ),
          );
          continue;
        }
        checkAnswer(`additionalAnswers.${extraKey}`, extraAnswer, vocab, errors);
      }
      continue;
    }
    if (!Object.hasOwn(PROFILE_FIELDS, key)) {
      errors.push(error(key, `"${key}" is not a declared profile field.`));
      continue;
    }
    checkAnswer(key, value, vocab, errors);
  }

  errors.sort((a, b) => a.field.localeCompare(b.field) || a.message.localeCompare(b.message));
  return { ok: errors.length === 0, errors };
}
