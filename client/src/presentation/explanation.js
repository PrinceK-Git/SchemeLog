import { explainReason } from '../domain/eligibility/reasons.js';

export function explanationContext(parent, child, inherited = null) {
  if (inherited) return inherited;
  if (parent.operator === 'not') return 'exclusion';
  if (parent.operator === 'anyOf' && parent.outcome === 'pass' && child.outcome !== 'pass')
    return 'alternative';
  return null;
}

/** Context qualifies domain copy; it never overrides a rule outcome or scheme status. */
export function explanationReason(row, mode, context = null) {
  const reason = explainReason(row.reasonCode, mode);
  if (context === 'alternative')
    return `Within this optional alternative only: ${reason} Another alternative satisfies this group; this branch is not required for the result.`;
  if (context === 'exclusion')
    return `Inside the excluded condition only: ${reason} The parent exclusion determines what this means for the result.`;
  return reason;
}
