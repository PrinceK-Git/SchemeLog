# Phase 5 — release verification and handoff design

**Date:** 10 October 2026  
**Status:** Design only. Phase 5 implementation, final release verification and deployment are not completed by this document.  
**Workspace:** `C:\Coding\Scheme_log\app`  
**Inspected commit:** `f598eb61bfd34bb85de3450df81b24b6948269b8` on branch `prince`.  
**Selected mode:** Keep explicit `demo`; reviewed-data publication is independently gated.  
**Target:** A reproducible, tested interactive prototype with accurate release evidence and an optional, separately authorized deployment.

## 1. Authority and scope

This document expands section 7 of the supplied roadmap, also stored at
`C:\Coding\Scheme_log\app\docs\PHASES-3-5-90-MINUTE-DESIGN.md`.
It is grounded in the current implementation and these previous-phase records:

- `C:\Coding\Scheme_log\app\docs\VALIDATION.md`: historical Phase 1 evidence, not current release proof.
- `C:\Coding\Scheme_log\app\docs\PHASE2-STATUS.md`: offline publication safeguards and deferred source work.
- `C:\Coding\Scheme_log\app\docs\PHASE3-HANDOFF.md`: delivered matching/profile/application contracts.
- `C:\Coding\Scheme_log\app\docs\PHASE4-HANDOFF.md`: integrated journey, tests and remaining release gates.
- `C:\Coding\Scheme_log\app\docs\PHASE4-INTERACTIVE-JOURNEY-DESIGN.md`: intended integration boundaries.
- Research notes under `C:\Coding\Scheme_log\app\docs\verification`: unresolved real-record blockers.

Earlier documents use other machines' paths and describe then-uncommitted work. The current Git
history contains Phase 3 and Phase 4; their historical base commits are not the release candidate.
Use the current workspace paths and recapture the candidate commit when executing this design.

### 1.1 This request versus later execution

This request creates only this design document. Do not change application code, tests, configuration,
dependencies, real drafts, generated catalogues or publication metadata. Do not create release notes
that imply Phase 5 has already passed. Limited non-writing checks are recorded in section 3.

Later Phase 5 execution should:

1. Restore the locked environment and freeze a candidate.
2. Rerun existing regression, publication, production-build and browser gates.
3. Fill only demonstrated verification gaps; fix release blockers with regression coverage.
4. Verify snapshot/version/coverage consistency and inspect the actual shipping artifact.
5. Produce evidence-backed release notes, a demo script and deployment/rollback instructions.
6. Deploy only if a destination is authorized and credentials already exist.

No engine rewrite, UI redesign, framework/test-runner migration, API, database, authentication,
analytics, persistence, chatbot, new schemes or source-fetch automation belongs to this phase.

### 1.2 Release labels

- **Interactive prototype ready:** explicit fictional mode, all required local gates passed on the
  candidate, artifact inspected, release handoff complete. Zero real publications is expected.
- **Reviewed-data build ready:** applicable engineering gates plus at least one genuinely independently
  approved real record, valid evidence, registry-backed destinations and disclosed limited coverage.
  The current data cannot earn this label.
- **Live deployment verified:** an authorized artifact was deployed and the actual HTTPS routes were
  checked. This can describe a deployed prototype; it does not confer real-data approval.

A build alone, a listed browser suite, or historical passing results earns none of these labels.
When a required gate is blocked, deliver the evidence and remaining work without claiming readiness.

## 2. Codebase findings and boundaries to preserve

### 2.1 Current identity

| Property                | Observed value                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| Runtime mode            | `demo`, chosen explicitly in `C:\Coding\Scheme_log\app\client\src\data\catalogue-mode.js`               |
| Demo catalogue          | `demo-2026-10-10.1`; four fictional `fx-sch-` records, record version `1`                               |
| Engine / profile        | Engine `1.0.0`; profile version `1`                                                                     |
| Demo evaluation instant | `2026-10-10T12:00:00+05:30`, visibly disclosed as 10 October 2026                                       |
| Real catalogue          | `2026-10-10.1`; schema/vocabulary `1.0.0`; zero published records                                       |
| Real release metadata   | `publishedAt: 2026-10-10T00:00:00+05:30`; identifies the empty snapshot, not human approval             |
| Research data           | Three real drafts; known rule-encoding and cycle problems remain                                        |
| Reviewed URL registry   | Empty hosts and entries in `C:\Coding\Scheme_log\app\server\sources\registry.json`                      |
| Session                 | React memory only; refresh/reset removes personal state                                                 |
| Shipping directory      | `C:\Coding\Scheme_log\app\client\dist`; do not use the older root-level `C:\Coding\Scheme_log\app\dist` |

### 2.2 Existing architecture

- `C:\Coding\Scheme_log\app\client\src\domain\eligibility\evaluate.js` implements pure rule,
  scheme and catalogue evaluation, stable status ordering and structured reasons. Preserve injected
  time, three-valued logic, income intervals, trusted-failure precedence and manual uncertainty.
- `C:\Coding\Scheme_log\app\client\src\domain\application\status.js` keeps application status
  independent. Missing current-cycle policy yields unknown; date-only boundaries invent no time.
- `C:\Coding\Scheme_log\app\client\src\domain\freshness.js` derives Asia/Kolkata dates and treats
  review-due on or before today as due. A current child cannot upgrade a stale parent.
- `C:\Coding\Scheme_log\app\client\src\domain\profile\normalize.js` rejects undeclared/malformed
  input. `C:\Coding\Scheme_log\app\client\src\domain\profile\question-plan.js` derives controls
  from eligibility and document conditions. The shipped demo asks education and income only.
- `C:\Coding\Scheme_log\app\client\src\repositories\catalogue.js` loads the selected mode,
  validates and freezes snapshots, and looks up actual slugs. Invalid input fails the whole load;
  it is not converted into an empty catalogue, quarantine entry or fallback demo.
- `C:\Coding\Scheme_log\app\client\src\app\submission.js` stores normalized answers, exact
  records, evaluation context, assessments and document applicability atomically. Preparation keys
  are `schemeId:recordVersion:documentId`; only completed applicable tasks count.
- `C:\Coding\Scheme_log\app\client\src\app\session-state.js` and
  `C:\Coding\Scheme_log\app\client\src\app\Session.jsx` maintain revision-based stale state,
  submission guards and memory-only progress. Navigation and checkmarks do not reevaluate results.
- `C:\Coding\Scheme_log\app\client\src\pages\Results.jsx` renders saved assessments.
  `C:\Coding\Scheme_log\app\client\src\pages\ScholarshipDetail.jsx` uses the exact saved record
  or public information without inventing a personal assessment. Direct application status remains
  conservatively unknown. Presentation helpers withhold unsupported facts and unsafe destinations.
- `C:\Coding\Scheme_log\app\server\scripts\build-catalogue.mjs` performs offline strict publication
  checks and whole-record withholding for changed source hashes. It writes both real catalogue
  copies and `C:\Coding\Scheme_log\app\server\src\data\income-thresholds.json`.
  It is not a read-only validation command.

Browser validation is defense in depth, not a substitute for server publication checks or human
approval. Preserve separate demo validation and rejection of fictional records by real publication.

## 3. Fresh observations versus historical evidence

Observed environment: Windows, Node `v24.16.0`, npm `11.13.0`. The initial tracked tree was clean.
No dependency installation, on-disk production build, browser journey execution or deployment was
performed for this documentation-only request.

| Check during design review               | Actual result                                                                                                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                               | Failed overall: client suite passed; five server test files could not load missing `ajv`. Server output reported 21 passing tests and five file-level failures, not complete server coverage. |
| `npm test --prefix client`               | Independently rerun: **134 passed**, zero failures/skips; includes in-memory Vite production-graph checks.                                                                                    |
| `npm run validate:catalogue`             | Exit 1, missing `ajv`; publication validation blocked.                                                                                                                                        |
| `npm run validate:registry`              | Exit 1, missing `ajv`; registry validation blocked.                                                                                                                                           |
| `npm run format:check`                   | Exit 1; expected client-side Prettier executable missing. Formatting did not start through this script.                                                                                       |
| `npm run test:e2e -- --list`             | Passed discovery: seven scenarios × desktop/mobile = **14 tests**. No browser launched.                                                                                                       |
| Production build / full E2E / deployment | Not run; existing artifacts do not establish new release evidence.                                                                                                                            |

An initial `npm exec --prefix client -- playwright test --list` from the root did not select the
client configuration and failed discovery. The forwarding script in the table corrected the working
directory. Neither invocation is a browser journey result.

The Phase 4 handoff historically reports 134 client + 47 server tests, 14 browser checks and passing
build/format/publication checks. Do not copy those results into a new release's evidence column.
Some client dependencies currently resolve from the root; this does not establish a clean nested
installation. Restore locked dependencies rather than weakening tests or changing package versions.

## 4. Execution plan and validation gates

The roadmap reserves 25 minutes: approximately five for environment/candidate capture, seven for
regression/publication/build, eight for browser/artifact inspection, and five for final handoff.
This is a stop rule, not a guarantee. Installation or correctness blockers must be reported rather
than hidden to fit the estimate. Freeze features before starting; no optional additions.

### 4.1 Environment prerequisite

During later Phase 5 execution, record commit, branch, working-tree status, Node/npm versions and
lockfile hashes. Preserve unrelated work. Keep explicit demo mode unless separately approved real
data genuinely satisfies all publication gates.

Run setup from the actual root; the root package does not install both nested packages by itself:

```powershell
Set-Location 'C:\Coding\Scheme_log\app'
npm ci
npm run setup
npm exec --prefix client -- playwright install chromium
npm run test:e2e -- --list
```

Check each exit code. Do not add AJV or Prettier ad hoc or edit lockfiles to accommodate this machine.
If browser installation is unavailable, mark browser verification blocked.

### 4.2 Required sequence

These commands are future release steps, not claims of successful execution during this review:

```powershell
Set-Location 'C:\Coding\Scheme_log\app'
npm test
npm run validate:catalogue
npm run validate:registry
npm run build
npm run format:check
npm run test:e2e
git diff --check
```

1. **Regression:** both client and server suites complete without failures or unexplained skips.
   Preserve privacy, unknown-state, malformed-input, source-safety and publication-rejection tests.
2. **Catalogue:** inspect reject/quarantine/warning counts and published records, not just exit code.
   Passing validation of drafts does not authorize publication. Zero real publications is expected.
3. **Registry:** validate exact source/URL associations offline. Empty allowlist remains valid for demo.
4. **Build:** root build validates registry, builds catalogue offline, then runs Vite. Inspect generated
   diffs; do not edit drafts or approvals. The artifact is the nested client output only.
5. **Formatting:** run the prescribed script after setup. Do not reformat unrelated files silently.
6. **Browser:** execute both configured projects using the new build, not a stale preview server.

Record command, timestamp, exit code, counts, failure summary and candidate identity. On a blocker,
capture the failure before investigation. Later code fixes require focused regression coverage and
a complete final rerun. Never change expected outcomes simply to conceal an incorrect assessment.

## 5. Browser acceptance design

Reuse `C:\Coding\Scheme_log\app\client\tests\journey\frontend.spec.js`; do not rebuild the suite.
Configuration at `C:\Coding\Scheme_log\app\client\playwright.config.js` already supplies desktop
1440 × 1000 and mobile 360 × 800, one worker, production preview on port 4173, and a separate harness
on port 4174. Ensure those ports are not serving unrelated/stale processes. With `CI` enabled the
configuration does not reuse existing servers; record how the run isolated its servers.

### Journey A — personalized discovery

1. Open the landing page; verify fictional disclosure, fixed evaluation date and **Try the demo**.
2. Choose Undergraduate degree and income above ₹1,00,000 and up to ₹2,50,000 per year; submit.
3. Expect Learning Pathways = potential, Next Chapter = verification, New Horizons = unmet,
   Future Notice = unavailable. Count one potential match among four fictional scholarships.
4. Expand reasons: actual submitted answer, requirement, outcome and fictional test provenance.
5. Edit income above ₹2,50,000; old results retain the prior assessment with a stale notice.
6. Resubmit: Learning Pathways becomes unmet and the stale notice clears.

### Journey B — honest uncertainty

1. Submit undergraduate education with income declined. Learning Pathways needs verification.
2. Inspect Next Chapter: the successful alternative does not erase its manual recognition check;
   the failed alternative is not presented as a scheme-wide failure.
3. Learning Pathways' conditional document says “May be required — check this condition”.
4. Marking that task does not resolve eligibility or increment completed applicable tasks.
5. Deadline stays “Unknown — no confirmed deadline”; no invented countdown/application link.
6. Retain the isolated strict-income-boundary scenario for overlapping intervals and score/context
   companion controls. Do not alter shipped fictional conditions merely to produce an overlap.

### Journey C — preparation and recovery

1. Submit undergraduate education and income up to ₹1,00,000. Mark the applicable Learning Pathways
   task; expect one completed preparation task, not an eligibility percentage.
2. Navigate away/back: mark persists. Resubmit the middle income band: task becomes inapplicable
   and leaves the completed-applicable count. Version changes must not inherit checkmarks.
3. Refresh: answers/checkmarks clear. Direct detail entry has no personal assessment.
4. Reset session, visit results without a profile, and visit invalid detail/global routes; verify
   recovery actions. Preserve mode/date disclosures on direct details.
5. Use only the isolated harness for reviewed empty, invalid, quarantine and retry states. Invalid
   reviewed data must never silently switch to demo. Never ship the harness selector.

### Cross-cutting acceptance

Run all three journeys at both widths. Retain existing axe checks, keyboard activation/focused
headings, accessible labels, overflow assertions, 768/640 px reflow and reduced-motion checks.
Verify external anchors contain no profile values, use HTTPS and new-tab isolation attributes, and
label general resources honestly. Verify local/session storage and cookies remain empty and no
answers enter routes, console output or network requests. Existing tests cover much of this; add
only missing assertions under the existing globs during later execution, not this design request.

Automated Chromium/axe success is not screen-reader, Safari, Firefox or physical-device certification.
Record those broader checks as unperformed unless actually completed. Retain failure traces with
fictional test inputs only, never real student data or credentials.

## 6. Reproducible snapshot and artifact inspection

### 6.1 Identity and clocks

Record engine, profile, catalogue, schema/vocabulary and record versions separately from the Git
commit and build timestamp. Do not bump versions solely to make Phase 5 appear new. A changed rule,
record or catalogue must receive its appropriate new identity before final verification.

Keep three time concepts distinct:

- Demo assessment: the disclosed fixed instant `2026-10-10T12:00:00+05:30`.
- Reviewed assessment: one ISO instant captured at submission; freshness uses Asia/Kolkata and
  due-on-or-before-today semantics. No current application cycle is inferred.
- Publication validation: its explicit evaluation date and release metadata. The build accepts
  `CATALOGUE_EVALUATION_DATE`; standalone validators do not all consume that environment variable.
  The registry CLI uses its actual current date. Record these differences rather than claiming one
  variable freezes every command.

For historical reproducibility, run the catalogue build twice with identical records, release
metadata, snapshot hashes and an explicit evaluation date; compare SHA-256 hashes of both generated
catalogue files and the generated income-threshold file. For this snapshot the historical date is
`2026-10-10`. Run real release freshness checks at the actual release date as well; a historical
reproduction must not conceal newly stale material. Restore any temporary environment override.

Inspect `C:\Coding\Scheme_log\app\server\src\data\release.json` rather than substituting the
current wall clock into published metadata. Catalogue copies at
`C:\Coding\Scheme_log\app\server\src\data\catalogue.json` and
`C:\Coding\Scheme_log\app\client\src\data\catalogue.json` must match byte-for-byte. Distinguish
draft validation findings from published records withheld in the coverage envelope; their counts
need not be identical.

Existing deterministic engine and publication tests are necessary but do not alone prove that a
specific on-disk artifact is the release artifact. Capture its file names, sizes and SHA-256 hashes,
plus lockfile identity and toolchain versions. Do not claim cross-platform byte-identical bundles
unless that stronger property is actually tested. Do not store student profiles in release manifests.

### 6.2 Shipping boundary

Inspect the freshly built `C:\Coding\Scheme_log\app\client\dist` and retain the existing production
graph assertions in `C:\Coding\Scheme_log\app\client\tests\unit\domain-boundary.test.js`.
The shipping graph must exclude:

- Legacy prewritten fixtures from `C:\Coding\Scheme_log\app\client\src\data\fixtures.js`.
- The isolated test harness and its “Isolated test scenario” selector.
- Unreviewed real draft records: `sch-nmmss`, `sch-pm-usp-csss`, `sch-pm-usp-sss-jk-ladakh`.
- Server fetching/extraction scripts, Node filesystem code, PDF tooling and raw source snapshots.

Check actual emitted JS and any source maps as well as module-graph evidence; a string scan alone
is not a complete dependency audit. Demo records are intentionally present, but must remain separate
from both generated real catalogue files and fail real publication checks. Confirm that no secrets,
source caches or test artifacts are uploaded with the static output.

## 7. Optional deployment and rollback

No hosting destination or credentials have been established by this review. Default status is
**Live deployment pending**. Do not create accounts, incur costs, select a host on the user's behalf,
or claim an upload without evidence.

If later authorized:

1. Use the repository root as build working directory with Node 22.12+; prefer the verified Node 24
   toolchain. Install command: `npm ci && npm run setup`. Build command: `npm run build`.
2. Publish only `C:\Coding\Scheme_log\app\client\dist`. A host with relative directory settings
   should select this directory relative to its checked-out repository root, not the old root output.
3. Configure history fallback: non-asset application routes serve the built `index.html`; real assets
   retain correct content types and paths. Serve the application at the domain root unless a separate
   base-path change has been designed and tested. Do not invent host-specific configuration now.
4. Record candidate commit, artifact hashes, host build/deployment ID and verified URL. Do not expose
   credential values. Ensure any host rebuild corresponds to the intended candidate/toolchain.
5. Against the actual HTTPS deployment, check landing, questionnaire submission and answer-driven
   results; open and refresh the direct Learning Pathways URL. Verify mode/date disclosure and safe
   links. Local preview success is not proof of a host's SPA fallback.
6. Mark live verification only after those checks. If unauthorized or blocked, provide the artifact
   identity and these hosting steps without substituting an imagined URL.

Rollback should restore the previous known-good immutable deployment/artifact and its routing
configuration, then repeat landing/questionnaire/direct-route smoke checks. Record the previous
deployment ID and commit if one actually exists. None is known now; on a first-deployment failure,
withdraw the candidate or disable its public route and report that no prior release is available.
Do not rewrite Git history or roll back data approvals to manufacture a known-good state. There is
no persistent student database to migrate; refreshed sessions intentionally reset.

## 8. Deliverables and minimal future change surface

The only file created for this request is
`C:\Coding\Scheme_log\app\docs\PHASE5-RELEASE-VERIFICATION-DESIGN.md`.

Later implementation must create
`C:\Coding\Scheme_log\app\docs\release\PHASES-3-5-RELEASE.md` with these sections:

1. **Outcome:** selected mode, real/fictional counts, achieved readiness labels and limitations.
2. **Candidate:** tested source commit, dirty-tree disclosure if applicable, engine/catalogue/profile
   versions, record versions, evaluation-time policy and artifact identity. If release notes are
   committed separately, distinguish that documentation commit from the tested source commit.
3. **Evidence:** exact commands, environment, timestamps, exits, counts and artifact/log locations.
   Separate final passes, failed attempts, blocked checks and checks not run.
4. **Coverage and safety:** withheld records, empty registry, draft exclusion, fictional provenance,
   unknown deadlines, memory-only privacy and accessibility scope.
5. **Demo:** routes, fictional profile, expected changes and two-minute script below.
6. **Deployment:** verified URL/host ID only when observed; otherwise artifact path, hosting steps and
   “Live deployment pending”.
7. **Rollback:** actual previous known-good identity or explicitly none; restoration/smoke procedure.
8. **Remaining work:** defects, external gates and original-design deferrals without claiming they
   were delivered by the reduced roadmap.

Store release evidence alongside the handoff only when generated; avoid empty placeholder logs.
Potential future test additions belong under `C:\Coding\Scheme_log\app\client\tests\unit`,
`C:\Coding\Scheme_log\app\client\tests\journey`, or existing server test directories under
`C:\Coding\Scheme_log\app\server\tests`. Do not add another runner or duplicate domain logic.
Only demonstrated blockers justify application edits during Phase 5 execution.

The existing workflow `C:\Coding\Scheme_log\app\.github\workflows\checks.yml` already installs
nested dependencies, checks formatting/tests/build, installs Chromium, runs E2E and uploads failure
artifacts. It is not a deployment workflow. Record its actual candidate run if available; local
success must not be reported as CI success. Workflow changes are not required merely for this design.

### Two-minute demonstration

- **0:00–0:25:** landing disclosure → Try the demo → undergraduate + middle income band → submit.
- **0:25–0:50:** show one potential match among four; expand Learning Pathways reasons and fictional
  provenance. Point out that Next Chapter still requires a manual check.
- **0:50–1:20:** edit to high income, show stale results, resubmit and observe unmet; decline income
  and resubmit to demonstrate verification instead of a guessed decision.
- **1:20–2:00:** submit low income, open requirements, mark preparation and navigate away/back.
  Explain unknown dates and non-application resources. Refresh to show memory-only reset and no
  personal assessment on direct detail entry.

Use routes `/`, `/questionnaire`, `/results` and `/scholarships/demo-learning-pathways` on the local
preview or verified host. These are browser routes, not filesystem paths. The demo uses fictional
inputs only; it never assesses eligibility for an actual government scholarship.

## 9. Risks, deferrals and completion checklist

### Prioritized risks

| Risk                                                       | Required response                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Missing nested dependencies                                | Restore locked setup, then rerun; do not change assertions or claim prior results apply. |
| Stale root artifact or reused preview                      | Build/inspect nested client output and verify server identity.                           |
| False confident eligibility, privacy leak or unsafe action | Release blocker; fix with regression or withhold release.                                |
| Invalid reviewed data                                      | Show error, never successful-looking demo fallback.                                      |
| Missing human approval                                     | Keep explicit demo; never publish drafts or invent reviewer identities.                  |
| Browser/download/hosting unavailable                       | Report blocked gate distinctly; no browser/live success claim.                           |
| Time budget exhausted                                      | Stop feature work, preserve evidence, list remaining gates.                              |

Deferred: correcting/reviewing the three research drafts, expanded real coverage, source-bot CI,
per-fact source-diff queues, full extraction/OCR tooling, exhaustive adaptation, exact-income
follow-up, deadline sorting, section-deep-link editing, persistence, notifications, social login,
runtime API and AI-generated advice. Broad manual accessibility/cross-browser certification is not
established by the current automated suite. Reviewed application-cycle policy remains a genuine
prerequisite for confident open/closed labels; do not infer it in release notes.

### Phase 5 execution acceptance checklist — not completed by this design

- [ ] Candidate, mode, versions, lockfiles and evaluation policy recorded.
- [ ] Locked nested setup succeeds; no unauthorized dependencies or data approvals added.
- [ ] Client/server regressions, catalogue/registry checks, build and formatting pass on candidate.
- [ ] All required journeys execute at desktop and 360 px; failures/skips are disclosed.
- [ ] Privacy, keyboard/axe/layout, uncertainty and recovery assertions retained.
- [ ] Version-keyed preparation never changes eligibility; stale/resubmit semantics preserved.
- [ ] Generated catalogue copies agree; snapshot reproducibility and artifact hashes recorded.
- [ ] Fresh production artifact excludes unreviewed drafts, harness, fetching/PDF code and secrets.
- [ ] Release handoff contains actual evidence, demo instructions, limits and rollback procedure.
- [ ] Deployment is verified on authorized live routes or explicitly pending.
- [ ] Final diff contains only intended changes; readiness labels match achieved gates.

**Design outcome:** Phase 5 is specified against the current implementation. Its first known
execution blocker is incomplete local nested dependency setup, not missing Phase 4 integration.
No Phase 5 release, reviewed-data approval or deployment is claimed by this document.
