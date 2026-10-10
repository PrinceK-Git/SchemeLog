# Phase 4 — answer-driven discovery and preparation handoff

**Date:** 10 October 2026

**Workspace:** `D:\SchemeLog`

**Outcome:** Phase 4 interactive demo integration delivered. This is not a reviewed-data release or
live deployment. Browser evidence is recorded below; no human publication approvals were created.

**Base commit:** `d82f6b78c70443f94a67b83df5007949760c6866`. Implementation remains an uncommitted
working-tree change; no implementation/release commit is claimed.

**Design:** `D:\SchemeLog\docs\PHASE4-INTERACTIVE-JOURNEY-DESIGN.md`.

## 1. Selected mode and versions

| Property                 | Value                                                               |
| ------------------------ | ------------------------------------------------------------------- |
| Active mode              | Explicit `demo` in `D:\SchemeLog\client\src\data\catalogue-mode.js` |
| Demo catalogue           | `demo-2026-10-10.1`, four fictional declarative records             |
| Engine/profile versions  | Engine `1.0.0`; profile version `1`                                 |
| Evaluation time          | Fixed demo instant `2026-10-10T12:00:00+05:30`                      |
| Demo date disclosure     | “Demo rules evaluated as of 10 October 2026.”                       |
| Real catalogue           | `2026-10-10.1`; **zero published records**                          |
| Real source URL registry | Still empty; no new approvals or source requests                    |
| Production artifact      | `D:\SchemeLog\client\dist`                                          |

Reviewed submissions capture a single ISO instant at the submit event boundary; calendar freshness
uses the existing Asia/Kolkata policy. No reviewed current-cycle policy has been invented. Missing
cycle policy keeps application status unknown. All personal state remains in React memory.

## 2. Delivered behavior

- The selected-mode repository validates complete envelopes and assessment/presentation shapes.
  Invalid input fails the entire load; empty and quarantined coverage have separate states. There
  is no reviewed-to-demo fallback, query-string mode switch or profile-bearing network request.
- A rule/document-condition union determines questions. The current demo asks only education and
  annual income. Score scale/context, course duration, declared additional answers and other
  vocabulary-backed controls work when referenced by isolated test catalogues.
- Income bands include document thresholds and zero, with explicit open/closed bounds. Strict-boundary
  overlap stays unknown. No exact income, degree, recognition, exam context or CGPA conversion is guessed.
- Strict normalization receives the retained draft and actual active presented fields. Submission
  atomically stores normalized profile, mapping issues, question plan, exact records, versions,
  evaluation context, assessments and document applicability. Reducers remain pure.
- Draft revisions make results stale. Resubmission replaces the snapshot; route changes and checklist
  changes do not reevaluate it. Catalogue replacement cannot join old assessments to new records.
- Cards and detail routes use real slugs, engine status groups and structured logical reasons.
  Optional-alternative and exclusion subtrees are explicitly qualified rather than presented as
  scheme-wide failures. Missing/manual actions come from the engine's action lists.
- Direct details show public information without manufacturing a reference-profile assessment.
  Application status remains independent; stale/cycle-uncertain raw endpoints are withheld as
  confirmed deadlines. Date-only boundaries never acquire a guessed closing time.
- Preparation uses `schemeId:recordVersion:documentId` keys. Pass/fail/unknown applicability is
  independent of checkmarks. Only applicable completed tasks count; no 100%-eligible/completed claim.
- Reviewed navigation requires exact backing in the generated publication artifact plus verified
  safe HTTPS destinations. Evidence URLs are not automatically actions. Demo has no application links.
- Disclosures, landing methodology, global copy, results, detail, reset/refresh recovery and accessible
  dynamic questions now describe the interactive flow, not prewritten examples.

The legacy fixture file remains in the repository but is not imported into the production graph.
The Phase 3 eligibility/application/normalization core, real draft records, generated catalogue data,
release metadata and URL registry have no content changes.

## 3. Changed implementation boundaries

| Absolute path                                                                                       | Responsibility                                                                                              |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `D:\SchemeLog\client\src\repositories\catalogue.js`                                                 | Explicit asynchronous load boundary, injected test loaders, frozen snapshots, true slug lookup              |
| `D:\SchemeLog\client\src\domain\validation\catalogue.js`                                            | Browser envelope/presentation defense in depth, safe text/URL checks                                        |
| `D:\SchemeLog\client\src\domain\profile\question-plan.js`                                           | Referenced-field/companion plan and income partitions                                                       |
| `D:\SchemeLog\client\src\data\questions.js`                                                         | Plan-driven controls, labels, resets and local validation                                                   |
| `D:\SchemeLog\client\src\app\submission.js`                                                         | Atomic normalized assessment/document transaction, preparation keys/counts                                  |
| `D:\SchemeLog\client\src\app\session-state.js`                                                      | Pure reducer and revision/version commit guards                                                             |
| `D:\SchemeLog\client\src\app\Session.jsx`                                                           | Catalogue lifecycle and submit-event integration                                                            |
| `D:\SchemeLog\client\src\presentation\scheme.js`                                                    | Group labels, typed formatting, verified destinations, current public facts and oldest displayed check date |
| `D:\SchemeLog\client\src\presentation\application.js`                                               | Qualified status/deadline display without reevaluation                                                      |
| `D:\SchemeLog\client\src\presentation\explanation.js`                                               | Branch-context qualification of existing reason copy                                                        |
| `D:\SchemeLog\client\src\components\UI.jsx`                                                         | Nested explanations, action lists, disclosures and recovery states                                          |
| `D:\SchemeLog\client\src\components\SchemeCard.jsx`                                                 | Record/assessment presentation and version-matched slug links                                               |
| `D:\SchemeLog\client\src\pages\Questionnaire.jsx`                                                   | Actual presented-field tracking, strict submit and accessible errors/review                                 |
| `D:\SchemeLog\client\src\pages\Results.jsx`                                                         | Snapshot groups, answer summaries, filters and reset                                                        |
| `D:\SchemeLog\client\src\pages\ScholarshipDetail.jsx`                                               | Public/personal detail boundary, checklist and application facts                                            |
| `D:\SchemeLog\client\src\pages\Landing.jsx` and `D:\SchemeLog\client\src\app\App.jsx`               | Consistent selected-mode copy                                                                               |
| `D:\SchemeLog\client\src\styles\global.css`                                                         | Narrow-screen nested explanations and text wrapping                                                         |
| `D:\SchemeLog\client\tests\unit`                                                                    | Adapter, planner, transaction, session, formatting, public-fact and build-boundary tests                    |
| `D:\SchemeLog\server\tests\catalogue\envelope-parity.test.mjs`                                      | Runtime envelope shape cases compared with existing Ajv schema                                              |
| `D:\SchemeLog\client\tests\browser`                                                                 | Separate test-only injected-catalogue entry, excluded from production bundle                                |
| `D:\SchemeLog\client\tests\journey\frontend.spec.js` and `D:\SchemeLog\client\playwright.config.js` | Desktop/mobile integration, axe, privacy, recovery and companion checks                                     |
| `D:\SchemeLog\README.md`                                                                            | Updated current behavior and handoff reference                                                              |

## 4. Verification evidence

Environment: Windows, Node `v24.16.0`, npm `11.13.0`; dependencies restored with locked installs.

| Command/check from `D:\SchemeLog`                         | Actual result                                                                                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci` and `npm run setup`                              | Passed; client/server dependencies installed, no reported audit vulnerabilities                                                    |
| `npm exec --prefix client -- playwright install chromium` | Passed; Chromium/headless shell installed                                                                                          |
| `npm test`                                                | Passed: **134 client tests + 47 server tests = 181**, zero failures/skips                                                          |
| `npm run validate:catalogue`                              | Passed with zero rejects; zero published/publishable real records; six existing quarantine findings across three drafts            |
| `npm run validate:registry`                               | Passed; empty reviewed allowlist remains safe                                                                                      |
| `npm run build`                                           | Passed: registry validation, offline catalogue build and Vite production bundle; generated data unchanged                          |
| `npm run test:e2e`                                        | Passed: **14/14** Chromium journeys (seven scenarios × desktop/mobile), including keyboard-only activation; final run 42.7 seconds |
| Production graph test in `npm test`                       | Passed: no legacy fixtures, test harness, real scheme drafts, server scripts, PDF or filesystem code                               |
| `npm run format:check` / `git diff --check`               | Passed; no formatting or whitespace errors                                                                                         |

Earlier development failures were fixed, not counted as successful runs: an income control's
accessible name included its Optional suffix; a test omitted the injected planner vocabulary; and
formatting needed the existing Prettier configuration. Review additionally tightened deadline trust,
last-verified scope, dependency-control order and nested alternative wording, with regression tests.

Browser coverage includes named outcome changes; stale/resubmit; explicit uncertainty; group logic;
conditional preparation and refresh loss; direct/no-profile/unknown routes; minimal-field collection;
reviewed empty/error/quarantine/retry without fallback; strict-boundary income; CGPA/context/duration
controls; invalid score and zero; school-dependent reset; desktop/360px layouts; tablet reflow;
reduced motion; landing anchors; axe checks; new-tab labels; storage/request/console privacy checks.
Keyboard-only activation also verifies focused step/review/result headings. Browser tests send no
profile requests; both external requests and non-GET/profile-bearing local requests are checked.
The production journey and the alternate-data harness are separate entry points, not a production
scenario selector. Test-only fictional conditions do not enter the real catalogue or shipped demo.

## 5. Two-minute demonstration

1. Run `npm run dev` from `D:\SchemeLog`, then open its displayed local URL. Select **Try the demo**.
2. Choose Undergraduate degree, continue, then “Above ₹1,00,000 and up to ₹2,50,000 per year”.
   Review and submit. Learning Pathways is potential; Next Chapter needs verification; New Horizons
   is unmet; Future Notice is unavailable.
3. Expand **Why this result**. Inspect the submitted interval, requirements and fictional provenance.
   Next Chapter explains its alternative and manual recognition check without treating every failed
   alternative as a scheme failure.
4. Edit income to above ₹2,50,000. Visit old results to see the stale notice, then resubmit. Learning
   Pathways changes to unmet. Change income to Prefer not to answer to see verification instead.
5. Resubmit the low band (up to ₹1,00,000). Open Learning Pathways requirements and mark its preparation
   task. Navigate back and return: the mark remains. Change to the middle band: the task becomes
   non-applicable and leaves the progress count. Refresh: personal answers and marks are gone.
6. Direct route `/scholarships/demo-learning-pathways` retains the demo/date disclosure but makes no
   personal eligibility claim. Dates and application destinations remain unknown/unavailable.

## 6. Deliberate limitations and Phase 5 gates

- No genuine independent human review exists for a real record. Reviewed-data publication remains
  blocked, not implicitly approved by runtime validation or this AI implementation review.
- Browser guards are intentionally narrower than the complete server schema/publication checks;
  the existing offline gate remains mandatory. Tests distinguish schema parity from stricter runtime
  semantics rather than claiming identical validators.
- Direct public details deliberately show **unknown application status** without a personal snapshot.
  No standalone public current-cycle/evidence resolver was added. This is the design's conservative
  allowed path, not an inferred current cycle. Reviewed submission policy still needs a genuine
  current-cycle decision before applications can be confidently labelled open/closed.
- Exact-income follow-up, deadline sorting, section deep-link editing, exhaustive adaptation and
  persistence remain out of scope. Numeric income equality/membership remain unsupported where the
  existing Phase 3 rule validator rejects them; no new operator semantics were introduced.
- Checkmarks can survive same-version resubmission in memory but never cross record versions.
  A catalogue replacement clears the editable draft/presented fields to avoid reusing changed band
  meanings while preserving a visibly older submitted snapshot.
- Automated Chromium/axe checks are not full accessibility certification or manual screen-reader,
  Safari, Firefox or physical-device validation. Those broader release checks remain recommended.
- No hosting action was attempted. Phase 5 must record the actual release commit, rerun final checks
  on that commit, complete release notes, obtain hosting authorization, verify deployed routes and
  record rollback details. **Live deployment pending.**
- The expanded implementation and proof exceeded the original compressed Phase 4 time estimate.
  Correctness checks were not dropped or represented as fitting a guaranteed 35-minute delivery.

Do not label this a reviewed-data release or live deployment. Phase 5 release documentation belongs
at `D:\SchemeLog\docs\release\PHASES-3-5-RELEASE.md`; it has not been fabricated here.
