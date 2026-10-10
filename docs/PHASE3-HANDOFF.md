# Phase 3 — explainable matching core handoff

**Date:** 10 October 2026  
**Outcome:** **Explainable matching core ready for integration.**  
**Repository:** `C:\Users\omen\Desktop\SchemeLog`  
**Base commit:** `0925edd1477608b8342c1137eb41260114aba5fe` (implementation is uncommitted)  
**Design:** `C:\Users\omen\Desktop\SchemeLog\docs\PHASE3-EXPLAINABLE-MATCHING-DESIGN.md`

## Delivered

- Pure version-1 profile/field/rule validation shared by client and server; server wrappers retain
  filesystem vocabulary loading and all real publication/review/registry checks.
- Strict draft normalization with explicit `askedFields`, injected vocabularies and income bands.
  Undeclared keys and malformed supplied answers are rejected before hidden fields are discarded.
- All eleven rule operators, three-valued logic, complete-tree validation, inclusive/exclusive
  interval comparisons and score/study-dimension compatibility checks.
- Injected evaluation time, Asia/Kolkata calendar dates, due-on-or-before freshness and inherited
  untrusted section/group handling. Current children cannot upgrade stale parents.
- Deterministic assessment ordering, structured logical explanations, provenance, missing fields,
  manual checks, data warnings and detached JSON-serializable results.
- Independent application status: explicit current cycle, exact/date-only boundaries, current
  same-day notice policy, stale/conflicting evidence handling and no invented deadline time.
- Explicit demo mode, four declarative fictional records, separate demo validation and tests proving
  those records cannot enter real publication even if changed to `published`.
- Parameterized domain tests, server/browser validation parity, import-boundary checks and a Vite
  bundle-and-execute smoke test for the new core without connecting it to the application UI.

## Frozen integration interfaces

| Absolute module path                                                        | Exports / contract                                                                                                                                                                                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\eligibility\evaluate.js` | `evaluateRule(profile, rule, options)`, `evaluateScheme(profile, scheme, context)`, `evaluateCatalogue(profile, catalogue, context)`, `ENGINE_VERSION`, `STATUS_ORDER`, `createEligibilityEngine({ vocab })` |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\application\status.js`   | `deriveApplicationStatus(application, context)` and structural `validateApplication`                                                                                                                         |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\profile\normalize.js`    | `normalizeProfile(draft, { askedFields, incomeBands, vocab })`                                                                                                                                               |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\validation\profile.js`   | `validateProfile(profile, { vocab })` -> `{ ok, errors: [{ field, message }] }`                                                                                                                              |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\validation\rules.js`     | `validateRule(rule, { vocab, path, seenIds })` -> `{ ok, errors: [{ path, code, message }] }`                                                                                                                |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\validation\scheme.js`    | `validateAssessmentScheme(scheme, { mode, vocab })`, `createEvidenceResolver(scheme, mode)`                                                                                                                  |
| `C:\Users\omen\Desktop\SchemeLog\client\src\data\demo-catalogue.js`         | `demoCatalogue`, `demoContext`, `referenceProfile`, `validateDemoCatalogue(catalogue, { vocab })`                                                                                                            |
| `C:\Users\omen\Desktop\SchemeLog\client\src\data\catalogue-mode.js`         | `catalogueMode`, `selectCatalogueMode(mode)`; no loader or fallback behavior                                                                                                                                 |
| `C:\Users\omen\Desktop\SchemeLog\client\src\data\vocabularies.js`           | Static browser-safe `vocabularies` and `createVocabularies(inputs)`                                                                                                                                          |

The default engine exports inject the static checked-in vocabulary adapter. The factory permits
explicit vocabulary injection without duplicating validation. JSON imports include the ESM type
attribute supported by the project's Node/Vite versions. No server JavaScript loader or draft
record is in this browser import graph.

### Context and errors

- `engineVersion`: `1.0.0` only.
- `catalogueVersion`: must match the catalogue envelope passed to `evaluateCatalogue`.
- `evaluatedAt`: valid ISO datetime with seconds and explicit offset or `Z`; no hidden clock.
- `mode`: explicitly `demo` or `reviewed`.
- `currentCycles`: optional scheme-ID-to-cycle policy, never inferred from the current year.
- For a direct `deriveApplicationStatus` call, use `currentCycle` instead. `evaluateScheme` obtains
  it from `currentCycles[scheme.id]`. Missing policy yields unknown application status only.
- Invalid domain inputs throw `DomainValidationError` with `code` and sorted `issues`. Runtime
  profile error messages do not echo supplied profile values. Normalization instead returns
  `{ ok: false, errors }` so the caller can retain the draft and show field errors.

`evaluateCatalogue` returns sorted assessment objects, not records and not an envelope. Every
assessment contains `schemeId`, `schemeVersion`, `status`, `ruleResults`, `missingFields`,
`manualChecks`, `dataWarnings`, `applicationStatus`, `catalogueVersion`, `engineVersion`, and
`evaluatedAt`. Rule rows retain parent/child IDs, typed operands, original answer envelope and
resolved evidence views. Complete interfaces are in design section 5.

### Document applicability

Call `evaluateRule` with:

```text
options = {
  context,
  inheritedFreshness: scheme.eligibility.freshness,
  resolveEvidence: createEvidenceResolver(scheme, context.mode)
}
```

Use the document's validated `appliesWhen` tree. The result is `{ outcome, ruleResults }`. Missing
leaf citations produce uncertainty; unresolved references or wrong-mode evidence are boundary
errors. A null condition is not a vacuously passing group: use the document's requirement metadata.
Checklist progress is not an engine input. Version-keyed preparation state remains a Phase 4 concern.

## Reference demonstration

**Catalogue version:** `demo-2026-10-10.1`  
**Mode:** `demo`  
**Evaluation instant:** `2026-10-10T12:00:00+05:30`  
**UI disclosure:** “Demo rules evaluated as of 10 October 2026.”

The exported `referenceProfile` supplies undergraduate study and annual INR income `[0,250000]`.

| Fixture                    | Computed reference status |
| -------------------------- | ------------------------- |
| `fx-sch-learning-pathways` | `potential`               |
| `fx-sch-next-chapter`      | `verification`            |
| `fx-sch-new-horizons`      | `unmet`                   |
| `fx-sch-future-notice`     | `unavailable`             |

Declining income changes Learning Pathways to verification; income `(250000,+infinity)` changes
it to unmet. School education with income `[0,100000]` changes New Horizons to potential and Next
Chapter to unmet. Tests also cover unsure education. These are computed outcomes, not fixture
status properties. Learning Pathways includes an income-dependent preparation condition.

All fixture application dates are unknown. Test-only synthetic dates/notices exercise timing
without inventing government facts. Fictional evidence has no external application URL.

## Verification actually run

Environment: Windows, Node `v24.19.0`, npm `11.17.0`. Existing nested dependencies were restored with
`npm ci --prefix client` and `npm ci --prefix server`; no package or lockfile changes were required.

| Command / check                           | Result                                                                                                                                                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                | **144 passed:** 99 client tests and 45 server tests. Includes the original 44 tests plus new cases.                                                                                                                   |
| `npm run validate:catalogue`              | Passed: 3 unchanged drafts, zero rejects, zero publishable records; six expected review/link quarantine findings remain.                                                                                              |
| `npm run validate:registry`               | Passed: intentionally empty reviewed URL allowlist.                                                                                                                                                                   |
| `npm run build`                           | Passed: offline real catalogue remains empty; existing frontend production build succeeds.                                                                                                                            |
| Browser-core smoke test within `npm test` | Passed: Vite bundles the unwired core and the generated module computes all four categories; no Node filesystem/PDF/source-fetching code or real draft records in that bundle.                                        |
| `npm run format:check`                    | Passed after formatting changed/new files and the previously generated design document.                                                                                                                               |
| `npm run test:e2e`                        | **8 passed** across desktop and 360px mobile, including existing axe/layout/privacy/recovery assertions. Initial foreground tool call timed out at 30 seconds; a captured background rerun completed in 30.2 seconds. |
| `git diff --check`                        | Passed.                                                                                                                                                                                                               |
| Real draft/generated catalogue diff       | No changes to the three research records or either generated real catalogue.                                                                                                                                          |

The browser tests are regressions of the **unchanged legacy UI**. They do not claim that the Phase 3
engine is wired into the browser questionnaire. That answer-driven end-to-end gate belongs to
Phase 4. No deployment was attempted. No human approvals were created.

## Phase 4 migration checklist and remaining gates

1. Replace the repository's presentation fixtures with explicitly selected data. Guard complete
   envelopes at load time; the engine's assessment guard is not the full real publication validator
   or the planned repository error/quarantine UX. Reviewed errors must not switch modes.
2. Keep the legacy `questions.js` filter untouched until UI integration. It is **not** the strict
   submission boundary. Its existing regression test remains because the UI is intentionally
   unwired; switch submission call sites to the new domain normalizer in Phase 4.
3. Collect actual `askedFields` and derive a union of rule/document-condition fields. Supply active
   income bands to normalization. The existing server band/threshold helpers remain unchanged;
   Phase 4 must include document thresholds, preserve zero and strict-boundary uncertainty, and
   hide irrelevant income questions. No dynamic questionnaire was added here.
4. Add score context/scale and course-duration companion controls when referenced. Broad streams
   remain mapping issues, Private maps to recognition-unknown, CGPA is never converted.
5. Capture one submission context outside React reducers/domain code. Store normalized profile,
   mapping issues, selected catalogue/record versions and assessments atomically in memory. Draft
   edits mark results stale; resubmission replaces the snapshot. Do not evaluate on every render.
6. Reuse group-aware explanation rows. A failed alternative inside a passing `anyOf` is not a
   scheme failure. Top-level missing/manual actions only identify uncertainty contributing to an
   unknown root; contextual unresolved rows remain visible in the logical explanation.
7. Map the four status groups without calling every record a match. Keep demo and date disclosures
   on landing/results/details, including direct routes without a personal assessment.
8. Application status requires reviewed current-cycle policy. Standalone application calls require
   already-resolved evidence. The scheme guard checks notice references; a real reviewed release
   still requires genuine human approval and all publication/registry checks. Supported date-only
   timezone is Asia/Kolkata; absent or unsupported timezone yields unknown, never a guess.
9. Preparation keys must include `schemeId:recordVersion:documentId`. Conditional applicability and
   progress are separate; do not store progress inside the profile or let it resolve manual rules.
10. Wire verified real destinations separately from evidence URLs. No profile in storage, URLs,
    network requests or logs. No fictional application actions.
11. Run new answer-driven browser journeys after wiring; keep existing regressions. Claim reviewed
    data or deployment only after those independent gates actually pass.

Study-year rules now require `course-year` or `school-class` units. All three current real drafts
still pass structural validation without edits; no draft migration was needed in this change.
Profile version 1, explicit open-income flags and due-today freshness are intentionally stricter
than the previous validators. Shared parity tests cover these changes.

This handoff is a domain-core delivery, not “Interactive prototype ready,” “Reviewed-data build
ready,” or “Live deployment verified.”
