# Phase 2 — time-boxed handoff

This is a prioritized foundation, **not the entirety of Phase 2**. The final pass was limited to
15 minutes at the user's request.

## Implemented

- Requested client/server/docs layout with root commands and updated CI paths.
- Nine vocabularies, JSDoc contracts, catalogue/scheme/registry schemas and layered validators.
- Offline catalogue assembly, explicit release metadata, coverage disclosure and draft exclusion.
- Removed fabricated curator-d/reviewer-c approvals. All real records are drafts with unknown
  freshness and unverified destinations. Notes identify specific encoding mistakes requiring review.
- Registry checks tie exact URLs and source IDs to records; published links require registry entries.
- Source scripts and critical request-safety tests. Empty allowlist makes fetching opt-in.
- Node tests for validation, publication safeguards and source request safety.

## Deferred

1. Genuine human curation and independent review of 3–5 records. Drafts must not drive assessments.
2. Full source-pipeline conformance: persistent review queues, all-link status propagation,
   per-fact changed-source freshness, complete extraction/normalization/PDF fixture coverage.
3. Scheduled source CI, bot branch, raw artifacts and issue synchronization. No scheduled workflow
   is installed until the baseline and host policies are reviewed.
4. Browser-compatible shared validation, real catalogue repository/UI wiring and profile conversion.
   The original frontend remains functional and explicitly fictional. No matching engine added.
5. Runtime API (not needed by the static-build design); no broken API start command remains.
6. Vitest migration and all design exit tests. Existing Node test runner retained for this timebox.
7. Vocabulary cleanup: separate fixture-only codes and narrow production code sets.

## Decisions

- Builds never fetch. Changed source hashes conservatively withhold whole records rather than
  exposing unconfirmed critical facts before the Phase 3 engine is implemented.
- Release version/time are explicit in server/src/data/release.json. Use CATALOGUE_EVALUATION_DATE
  to fix the validation date for reproducibility tests.
- No AI-generated identity is evidence of human review. Empty real catalogue is intentional and
  disclosed, following the design's real-data-gate fallback.

## Validation results

- Production build passed.
- Unit/regression tests: 44 passed (7 client, 37 server).
- Catalogue validation: zero rejects; drafts withheld as expected.
- Registry validation and empty-allowlist source run passed without requests.
- Formatting check passed before the final handoff update.
- Browser tests attempted but blocked: Playwright Chromium executable is not installed locally.
