# Schemelog — Phases 3–5: the 90-minute focused build

**Date:** 10 October 2026  
**Audience:** an AI implementation agent working in `D:\clihack\SchemeLog`  
**Outcome:** an explainable questionnaire-to-results-to-preparation experience, using the existing UI.  
**Budget:** 90 minutes of elapsed agent work, including checks and handoff.

## 1. What this plan commits to

Keep the features that make the product worth demonstrating:

1. **Answers that actually change results.** A deterministic engine, not prewritten statuses.
2. **An honest “why” panel.** Show the student's answer, the requirement, the outcome and its evidence.
3. **A useful next step.** Missing information and manual checks lead to an edit action or source check.
4. **A personal preparation checklist.** Conditional requirements and preparation progress stay separate.
5. **A trustworthy presentation.** Clear coverage, unknown dates, safe official navigation and mobile layout.

Do not redesign the existing screens. Keep React, Vite, JavaScript, vanilla CSS, Node's test runner
and Playwright. Do not add a framework, database, runtime API, authentication, chatbot or analytics.

**Feasibility boundary:** 90 minutes is a scope and stop rule, not a guarantee of a verified real-data
release. Independent human review and deployment credentials cannot be created by an AI agent.
The implementation target is a tested, clearly labelled prototype build. A reviewed-data
release and live deployment are conditional on prerequisites below. Report blocked gates honestly.

This document narrows the original Phases 3–5 and explicitly redistributes necessary unfinished
Phase 2 tasks. It does not claim that deferred items in the original designs have been completed.

## 2. Starting point and non-negotiable release modes

### Existing work to reuse

- Four React screens, routing, review/edit flow and memory-only state.
- Catalogue/profile validators, schemas, vocabularies and an offline catalogue build.
- Three real research drafts, with known encoding problems documented in verification notes.
- A generated real catalogue with **zero published records**.
- Source scripts and request-safety tests; an intentionally empty reviewed URL registry.
- Previously recorded baseline: production build and 44 unit/regression tests passed.
- Browser tests previously blocked because Playwright Chromium was not installed locally.

Re-run checks; do not treat those historical results as evidence for new code.

### Mode A — reviewed catalogue, only when the gate passes

Use the generated catalogue only when it contains records with genuine independent human approval,
valid evidence and verified destinations. Run all publication checks. Do not manufacture identities,
change drafts to published, label AI review as human review or reuse known incorrect draft rules.
One genuinely reviewed record is acceptable for this reduced release; disclose the limited coverage.

### Mode B — explicit interactive demonstration, the expected default

If no record clears review, the landing page says:

> Interactive prototype. These scholarships are fictional. Your answers drive a demonstration of
> the matching rules; this is not an assessment for a real government scheme.

- Primary CTA: **Try the demo**. Keep a Demo badge on results and details, including direct entry.
- Use separate fictional records with `fx-` IDs and the same declarative rule shapes as real records.
- Fictional rules are explicitly assumed-current **test conditions**, not verified government facts.
- Keep fixtures outside both generated real catalogue files. They must fail real publication checks.
- Demo evidence says “Fictional test condition”; never cite a real authority as proof of a made-up rule.
- External resources, if shown, are labelled general discovery links, never fictional application links.
- An invalid real catalogue causes an error state, not a silent fallback to a successful-looking demo.
- Choose the mode explicitly in a small configuration module. Do not mix demo and reviewed records.

**Done labels:** “Interactive prototype ready”, “Reviewed-data build ready”, and “Live deployment
verified” are three different outcomes. Only claim the gates actually passed.

## 3. Where the unfinished Phase 2 work goes

| Phase 2 carryover                                               | New owner/timebox           | Minimum deliverable                                                                            |
| --------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------- |
| Align answer shapes, allowed fields and vocab codes             | Phase 3                     | A canonical normalized profile; malformed known answers rejected                               |
| Share validation without Node filesystem imports in the browser | Phase 3                     | Browser-safe validation core or generated static inputs; server and browser use the same rules |
| Evidence, coverage and freshness semantics                      | Phase 3                     | Engine treats stale/unconfirmed material rules as unknown                                      |
| Draft rule corrections and independent human approval           | Parallel human prerequisite | Do not spend the 90 minutes researching three real schemes; use Mode B if review is absent     |
| Actual catalogue access and load guard                          | Phase 4                     | Repository separates data from assessment; corrupt data cannot render as trusted results       |
| Income thresholds and relevant questions                        | Phase 4                     | Bands derived from active-mode rules; required fields shown without guessing mappings          |
| Conditional documents and safe destinations                     | Phase 4                     | Rule-based applicability and verified-action filtering                                         |
| Version, coverage, final publication checks                     | Phase 5                     | Reproducible snapshot, explicit release status and test evidence                               |
| Full fetching addendum, snapshot/diff issues and source CI      | Deferred                    | No source fetch during build/test or student use; keep existing tooling separate               |

Retain the existing conservative whole-record withholding on changed source hashes. Per-fact
hash-to-review-queue automation is not required for this timebox. This is a deliberate scope cut,
not conformance with the full fetching addendum.

## 4. Execution clock and ownership

| Elapsed   | Work                                                                                                 | Checkpoint                                    |
| --------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 00–05 min | Inspect current files, run baseline tests, choose release mode; start browser installation if needed | Explicit mode and fixed interfaces            |
| 05–30 min | Phase 3: engine, profile boundary, explanations and core tests                                       | Engine works without React or network         |
| 30–65 min | Phase 4: wire questionnaire, repository, results, details and checklist                              | One complete answer-driven browser journey    |
| 65–85 min | Phase 5: regression checks, production build, smoke journeys, optional deployment                    | Tested build and accurate release notes       |
| 85–90 min | Fix only blockers; final diff review and handoff                                                     | Stop, list actual results and remaining gates |

If teammate tools are available, use at most two implementation owners: one for pure domain code
and tests, one for UI/data adapters. Agree function signatures first and do not edit the same files.
The lead owns integration and final checks. An AI teammate is not an independent human curator.

At minute 30 freeze the engine interface. At minute 65 freeze features. Reserve the final five
minutes for verification, not adding another scheme or visual flourish.

## 5. Phase 3 — explainable matching (minutes 05–30)

### 5.1 Small implementation surface

Suggested paths, all below `D:\clihack\SchemeLog`:

```text
client/src/domain/eligibility/evaluate.js      pure operators, aggregation, reason codes
client/src/domain/application/status.js       independent application status
client/src/domain/profile/normalize.js        explicit UI-to-profile mapping
client/tests/unit/eligibility.test.js         Node tests, imports pure domain functions
client/src/data/demo-catalogue.js             fictional rule-based scenarios only
```

Keep the existing server catalogue validator authoritative for publication. Its current filesystem
imports cannot ship to the browser. Extract only the reusable pure validation core needed by the
client, leaving filesystem loading in a server wrapper. Inject vocabulary data; do not maintain two
different implementations of profile validation. Avoid a wholesale repository restructure.

Freeze these interfaces:

```js
evaluateScheme(profile, scheme, context);
evaluateCatalogue(profile, catalogue, context);
deriveApplicationStatus(application, context);
```

`context` requires an evaluation ISO timestamp, catalogue version and engine version. Capture it
once at submission, outside the engine. Demo mode may use a visibly disclosed fixed evaluation date
so examples do not expire unexpectedly. Production evaluation uses the captured session timestamp.
No hidden clock, fetch, storage, console logging or React imports in domain functions.

Return:

```text
schemeId, schemeVersion, status,
ruleResults[{ ruleId, outcome, reasonCode, providedAnswer, expected, evidence }],
missingFields[], manualChecks[], dataWarnings[], applicationStatus,
catalogueVersion, engineVersion, evaluatedAt
```

Use the UI's existing status IDs: `potential`, `verification`, `unmet`, `unavailable`.

### 5.2 Exact semantics to implement

- Support the frozen operators: `eq`, `in`, `lt`, `lte`, `gt`, `gte`, `between`, `allOf`, `anyOf`,
  `not`, `manualVerification`. Unknown operators and malformed groups are validation errors.
- `allOf`: any fail → fail; all pass → pass; otherwise unknown.
- `anyOf`: any pass → pass; all fail → fail; otherwise unknown.
- `not`: invert pass/fail; unknown stays unknown.
- A manual check stays unknown. Preparing a document must never resolve an eligibility rule.
- Unsure, declined and not-asked answers are unknown, not false and not satisfied.
- Incompatible score scale/context or units are unknown; never convert CGPA automatically.
- Critical facts with unknown, superseded or review-due freshness cannot yield a trusted pass/fail.
  Derive review-due against the injected date in Asia/Kolkata; document whether due-today is due
  (choose due on or before today) and test that boundary. Parent section staleness affects its leaves.
- Income intervals pass only when **every** possible value meets the condition, fail only when
  **every** value violates it, otherwise unknown. Respect open ends and inclusive/exclusive bounds.
- For unusable coverage: unavailable. Otherwise trusted root fail: unmet. Partial coverage or root
  unknown: verification. Only complete, current, fully passing conditions: potential.
- Default order: group in the above presentation order, then official name; stable ID tie-breaker.

### 5.3 Explanations worth showing

Use a small reason-code-to-copy map, not an LLM or a sentence generator framework.
Each row has: requirement, provided answer or uncertainty, outcome and source/locator when real.
For income overlap: “Your selected range crosses the limit. Clarify your income range or check the
official requirement.” No pressure to disclose an exact income.
Explain the successful alternative in an `anyOf`; a failed alternative must not look like a scheme failure.

### 5.4 Application status, independently

Known compatible current-cycle endpoints or a current evidenced status notice can establish
open/upcoming/closed. Otherwise return unknown. Do not let an old cycle appear currently open.
Date-only deadlines display as dates, never invented countdowns; on an ambiguous closing-day boundary,
show unknown/check official source. An unknown deadline does not invalidate reviewed eligibility.

### 5.5 Minimum tests before integration

Use parameterized Node tests to cover:

1. All four aggregate statuses; partial coverage cannot produce potential.
2. All four answer states; malformed known answers rejected at validation.
3. `allOf`, `anyOf`, `not` truth tables and empty-group rejection.
4. Trusted failure alongside an unrelated unknown still returns unmet.
5. Income at/below/above inclusive and exclusive thresholds, overlapping and open bands, `between`.
6. Score context mismatch, manual checks and stale section/leaf freshness.
7. Eligibility pass alongside closed or unknown application status; date-only boundary behavior.
8. Identical profile, versions and evaluation time produce identical results and ordering.

Create a compact fictional fixture factory for tests. For the UI, use four small fictional schemes
that exercise income, alternatives, manual verification and unusable information. A single reference
profile should illustrate all four categories; different answers must genuinely change outcomes.

## 6. Phase 4 — a convincing complete journey (minutes 30–65)

### 6.1 Wire, do not rewrite

Modify existing modules:

```text
client/src/data/questions.js
client/src/repositories/catalogue.js
client/src/app/Session.jsx
client/src/pages/Landing.jsx
client/src/pages/Results.jsx
client/src/pages/ScholarshipDetail.jsx
client/src/components/SchemeCard.jsx
client/src/components/UI.jsx
```

The repository loads data for the explicitly selected mode and exposes `getCatalogue()` and
`getScheme(slug)`. It never calculates eligibility. Invalid records are not disguised as empty data.
Run a browser-compatible schema/semantic guard on the bundled snapshot; reject a bad envelope and
disclose any quarantined records. Never weaken the real publication validator to admit `fx-` records.
Use a separate, explicit demo validation entry point for structurally valid fictional records.

### 6.2 Questionnaire: small and faithful

- Use the union of fields referenced by the active catalogue's rules and document conditions.
  This bounded union is the deliberate substitute for a complex adaptive relevance engine.
  Do not prune potentially relevant schemes merely because an answer is unknown.
- Reuse the stepper, inputs and review screen. Remove irrelevant sensitive questions.
- Store normalized known/unsure/declined/not-asked envelopes on submission. Preserve the draft UI
  values separately so editing and existing form controls remain straightforward.
- Map only unambiguous values: state label → state code, diploma → `diploma-technical`.
  “Private” does not establish recognition; “Science” alone does not establish an exact course.
- Ask for score scale and exam context when a score rule needs them. Never infer Class XII from
  “previous exam”. If an existing answer lacks required context, ask again or preserve it as unknown.
- Course-year input needs course duration; school stage needs its class code. Do not invent either.
- Generate non-overlapping income bands from active-mode thresholds. Represent strict-boundary
  uncertainty honestly. If no income rule exists, hide the income question rather than show a useless band.
- Never drop undeclared sensitive fields silently and call the original input valid: reject at the
  profile boundary. No profile data in URLs, storage, logs or network requests.

### 6.3 Results and details

- Evaluate once on submission and store the assessment snapshot beside the normalized profile.
- Draft editing marks existing results stale; resubmission replaces results and their context.
- Render all four groups from engine output. Count potential matches separately from total records.
- Keep the current card layout and “Why this result” disclosure. Add only useful answer/evidence rows.
- “Edit answers” returns to the existing review flow; no new clarification wizard.
- Use actual coverage text and clear demo labels; never call all records matches.
- Details reuse the same scheme version and assessment. Direct visits show public information without
  claiming a personal assessment. Unknown slugs retain the not-found page.
- In reviewed mode, show only current supported amounts; stale/superseded amounts are withheld or
  explicitly unconfirmed. “Last verified” is the oldest check date among the displayed verified facts.

### 6.4 Checklist and official handoff

Evaluate each `appliesWhen` through the same rule evaluator:

| Applicability | Presentation                            |
| ------------- | --------------------------------------- |
| Pass          | Required for the supplied answers       |
| Fail          | Not applicable for the supplied answers |
| Unknown       | May be required — check this condition  |

Use keys `schemeId:recordVersion:documentId` instead of the hardcoded demo version.
Keep progress in memory. Recalculate applicability on resubmission; excluded items do not count
toward completed applicable tasks. A new record version does not inherit prior checkmarks.
Copy: “You marked 2 preparation tasks as done.” Never “100% eligible” or “application complete”.

Render external actions only for verified HTTPS destinations in reviewed mode. Distinguish scheme
information, guidelines and application portal. Broken or absent application destinations fall back
to another verified source. New tabs use `rel="noopener noreferrer"`; attach no profile parameters.

Keep existing empty/error/no-profile/direct-route behavior and adapt its copy to the selected mode.
Add no animations, new dashboard or opaque ranking score.

## 7. Phase 5 — prove it works and hand it over (minutes 65–90)

### 7.1 Validation sequence

From `D:\clihack\SchemeLog`, use the existing scripts:

```sh
npm test
npm run validate:catalogue
npm run validate:registry
npm run build
npm run format:check
npm run test:e2e
```

Add new unit tests under the existing client/server test globs; avoid a test-runner migration.
Update browser assertions that currently expect prewritten fixture statuses. Do not delete the old
privacy, unknown-state or validation checks merely to make new tests green.
If needed, begin Chromium setup early with `npm exec --prefix client -- playwright install chromium`.
If unavailable, record browser verification as blocked; a successful Vite build is not a browser test.

### 7.2 Three required browser journeys

1. **Personalized discovery:** submit a known demo profile, inspect actual rule reasons, change an
   answer, resubmit and verify that the assessment changes and stale messaging clears.
2. **Honest uncertainty:** decline income or use an overlapping band, see Needs verification;
   view a manual check, conditional document and unknown deadline without invented certainty.
3. **Preparation and recovery:** check an item, navigate away/back, retain it; refresh and reset;
   direct detail link has no personal assessment; invalid slug and catalogue error have recovery.

Run the journeys at desktop and 360 px widths. Check accessible labels, keyboard focus, no horizontal
overflow and existing axe assertions. Confirm no questionnaire values appear in external links or storage.
Check built assets do not contain source fetching/PDF code or any of the unreviewed real draft records.

### 7.3 Deployment: optional external gate, not a time sink

- Static artifact: `D:\clihack\SchemeLog\client\dist`.
- In a fresh host environment, installation must cover both nested packages:
  install command `npm ci && npm run setup`; build command `npm run build`.
- Configure a SPA fallback to `index.html` for nested routes on the chosen host.
- Deploy only if the user has already authorized a hosting destination and credentials are available.
  Never create accounts, spend money or claim an upload happened without evidence.
- Verify the deployed landing page, questionnaire and a direct detail URL in the selected mode.
- Otherwise deliver the tested artifact and exact hosting steps. Mark “live deployment pending”.
- Record the version/commit deployed and the previous known-good deployment for rollback, if one exists.

### 7.4 Final handoff

Write `D:\clihack\SchemeLog\docs\release\PHASES-3-5-RELEASE.md` with:

- Selected mode, published real scheme count and explicit limitations.
- Commands run and their actual results; blocked tests listed separately.
- Engine/catalogue versions, evaluation-time policy and release commit when available.
- Demo route/profile and a two-minute demo script: answer → why → uncertainty → checklist.
- Deployment URL only if verified; otherwise artifact location and deployment instructions.
- Rollback procedure and uncompleted original-design requirements.

## 8. Cuts and hard stops

| Trigger                                | Cut or fallback                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| No genuine human approval by minute 05 | Choose explicit Mode B; leave real drafts untouched                                            |
| Engine behind at minute 25             | Reduce demo rule/field variety and prose polish, not correctness; reject unsupported operators |
| Integration behind at minute 50        | Drop optional filters, deadline sorting and section-deep-link editing                          |
| Feature incomplete at minute 65        | Stop adding it; keep a working honest flow and record the omission                             |
| Browser download/hosting blocked       | Deliver tests/build evidence and state the blocked external gate                               |
| Any incorrect confident assessment     | Fix or withhold it before cosmetic work; never change expected tests to conceal the bug        |
| Minute 90                              | Stop and report the achieved release level; do not claim all original phases passed            |

Deferred beyond this plan: source-bot workflow, scraping expansion, OCR, full editorial tooling,
3–5 independently reviewed real schemes, exhaustive adaptive questioning, exact-income follow-up,
new design system, notifications, persistence, social login, API and AI-generated advice.

## 9. Completion checklist for this reduced design

- [ ] Engine runs without React, network or hidden time dependencies.
- [ ] Changing answers changes assessments; uncertainty and trusted failures behave correctly.
- [ ] Every result has a useful evaluated explanation rather than prewritten personal claims.
- [ ] Active mode and coverage are unmistakable on landing, results and direct detail routes.
- [ ] No unreviewed real record or fabricated reviewer reaches the published catalogue.
- [ ] Conditional requirements and preparation checkmarks are independent and version-keyed.
- [ ] Official actions are safe and correctly labelled; demo links do not imply real applications.
- [ ] Existing UI remains mobile-friendly and memory-only; edit/resubmit/recovery flow works.
- [ ] Unit tests, offline build and formatting pass; browser results are recorded accurately.
- [ ] Release notes distinguish a working prototype, a reviewed-data release and a live deployment.

**Agent starting instruction:** implement only this document's reduced scope, reuse existing modules,
choose the data mode in the first five minutes, and reserve the last 25 minutes for integration checks
and handoff. Never turn a missing human or external prerequisite into an invented success.
