/** Format only already-derived status. Unknown trust/cycle must not promote preserved raw dates. */
export function applicationDisplay(application) {
  const unusable = new Set([
    'application_stale',
    'application_cycle_unknown',
    'application_cycle_mismatch',
    'application_timezone_unknown',
    'application_evidence_conflict',
  ]);
  const closes = application?.closes;
  const deadlineConfirmed = Boolean(closes?.value && !unusable.has(application.reasonCode));
  return {
    status:
      application?.status && application.status !== 'unknown'
        ? application.status
        : 'Unknown — check current information',
    deadlineConfirmed,
    deadline: deadlineConfirmed
      ? `${closes.value}${closes.precision === 'date' ? ' (date only · Asia/Kolkata; no closing time specified)' : ' (exact instant)'}`
      : 'Unknown — no confirmed deadline',
  };
}
