/** Stable copy, no model-generated explanation or HTML. */
export const reasonCopy = Object.freeze({
  condition_met: 'Your answer meets this condition.',
  condition_not_met: 'Your answer does not meet this condition.',
  answer_unsure: 'You marked this answer as unsure.',
  answer_declined: 'You chose not to provide this answer.',
  answer_not_asked: 'This information has not been collected.',
  income_overlap:
    'Your selected range crosses the limit. Clarify your income range or check the official requirement.',
  score_scale_mismatch: 'Your score uses a different scale; it has not been converted.',
  score_context_mismatch: 'This rule refers to a different examination.',
  study_context_mismatch: 'This rule refers to a different kind of study stage.',
  unit_mismatch: 'The quantities cannot be compared in the supplied units.',
  manual_verification: 'This condition needs a separate check.',
  fact_unknown: 'This requirement is not confirmed as current.',
  fact_review_due: 'This requirement is due for review.',
  fact_superseded: 'This requirement has been superseded.',
  evidence_unconfirmed: 'Supporting information is not confirmed.',
  all_conditions_met: 'All evaluated conditions are satisfied.',
  mandatory_condition_failed: 'A mandatory condition is not satisfied.',
  conditions_unresolved: 'Some conditions remain unresolved.',
  alternative_met: 'An alternative is satisfied; the other alternatives are not required.',
  all_alternatives_failed: 'None of the alternatives is satisfied.',
  alternatives_unresolved: 'An alternative may apply, but remains unresolved.',
  negated_condition_met: 'The exclusion does not apply to the supplied answer.',
  negated_condition_failed: 'The exclusion applies to the supplied answer.',
  negated_condition_unknown: 'Whether this exclusion applies is unresolved.',
  partial_coverage: 'Some scheme conditions are not available for assessment.',
  unusable_coverage: 'There is not enough scheme information for an assessment.',
});

export function explainReason(code, mode = 'reviewed') {
  const copy = reasonCopy[code] || 'Check the condition and its supporting information.';
  return mode === 'demo' ? copy.replace('official requirement', 'fictional test condition') : copy;
}
