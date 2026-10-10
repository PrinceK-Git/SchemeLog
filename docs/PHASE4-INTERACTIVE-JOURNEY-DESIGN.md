# Phase 4 — answer-driven discovery and preparation

**Date:** 10 October 2026

**Status:** Implementation design; Phase 4 is not implemented by this document.

**Workspace:** `D:\SchemeLog`

**Target outcome:** A tested, explicitly fictional, answer-driven questionnaire → results → detail →
preparation journey using the existing UI.

**Default mode:** `demo`; reviewed-data publication remains independently gated.

## 1. Authority, scope and success

This design expands Phase 4 of `D:\SchemeLog\docs\PHASES-3-5-90-MINUTE-DESIGN.md`, especially
sections 6.1–6.4, against the delivered interfaces and migration checklist in
`D:\SchemeLog\docs\PHASE3-HANDOFF.md`. For delivered domain contracts, the handoff and current
implementation take precedence over earlier suggested interfaces. Additional domain detail is in
`D:\SchemeLog\docs\PHASE3-EXPLAINABLE-MATCHING-DESIGN.md`.

Paths in those documents refer to earlier machines. All implementation paths in this document use
the current workspace. Proposed modules and interfaces below are explicitly new work, not claims
about exports already available.

### 1.1 Goals

1. Actual submitted answers determine assessments through the Phase 3 engine.
2. Every personal result is traceable to a normalized profile, record version and evaluation context.
3. Explanations retain logical grouping, uncertainty, supporting evidence and useful next actions.
4. Questions collect only fields relevant to the active catalogue plus necessary companion inputs.
5. Preparation applicability and user checkmarks remain separate from eligibility.
6. Empty data, invalid data, missing profiles and direct routes have distinct, recoverable states.
7. Fictional data, limited coverage and evaluation dates are unmistakable on every relevant route.

### 1.2 Non-goals

No engine rewrite, new framework, runtime API, database, authentication, persistence, analytics,
chatbot, exact-income follow-up wizard, opaque ranking, redesigned dashboard or expanded scraping.
Do not research or publish the three real drafts as part of UI integration. Do not invent reviewers,
application dates, benefit amounts, sources or fictional application destinations.

Full release verification and optional deployment belong to Phase 5. Phase 4 must add and run its
integration tests; it cannot defer proof that answers change results to a later phase.

### 1.3 Completion labels

| Label                        | Required evidence                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| Phase 4 integration complete | Implemented scope and acceptance criteria below, including answer-driven browser proof |
| Interactive prototype ready  | Integrated demo plus the full Phase 5 regression/build gates                           |
| Reviewed-data build ready    | All applicable checks plus genuine independent review and publication/registry gates   |
| Live deployment verified     | An authorized deployment and checks against the deployed routes                        |

These labels are not interchangeable. A design document, historical test run or successful build
alone earns none of the implementation labels.

## 2. Inspected starting point

| Area              | Current state                                                                                                      | Phase 4 change                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Domain core       | Pure normalization, rule evaluation, application status, validation and evidence resolution exist                  | Consume frozen interfaces without duplicating their decisions              |
| Data selection    | `D:\SchemeLog\client\src\data\catalogue-mode.js` explicitly selects demo and a fixed date                          | Make this configuration drive repository and UI                            |
| Declarative demo  | Four rule-based records in `D:\SchemeLog\client\src\data\demo-catalogue.js`                                        | Replace presentation fixtures with these records                           |
| Repository        | `D:\SchemeLog\client\src\repositories\catalogue.js` returns legacy fixtures; its slug lookup actually compares IDs | Guard envelopes, return records and resolve actual slugs                   |
| Session           | `D:\SchemeLog\client\src\app\Session.jsx` stores draft, legacy filtered submission and checkmarks                  | Store one atomic evaluation snapshot and explicit edit revisions           |
| Questions         | `D:\SchemeLog\client\src\data\questions.js` has fixed sections, illustrative income bands and a permissive filter  | Derive relevant controls and use strict domain normalization on submit     |
| Questionnaire     | `D:\SchemeLog\client\src\pages\Questionnaire.jsx` submits legacy answers; numeric controls assume percentages      | Wire submission, dynamic sections and scale-aware controls                 |
| Results/details   | Personal-looking statuses and explanations come from fixture properties                                            | Render assessments joined to the exact evaluated records                   |
| Checklist         | All fixture documents count; keys contain `demo-v1`                                                                | Evaluate conditions and key progress by real record version                |
| Application shell | `D:\SchemeLog\client\src\app\App.jsx` has hardcoded Phase 1/demo copy                                              | Make global disclosure consistent with selected mode                       |
| Real catalogue    | `D:\SchemeLog\client\src\data\catalogue.json` contains zero published records                                      | Preserve that truth; never substitute drafts                               |
| Browser tests     | Existing journeys assert prewritten statuses and fixed question steps                                              | Migrate assertions while retaining accessibility/privacy/recovery coverage |

The handoff records 144 unit/server tests and eight browser tests passing in its environment. Those
are historical results, not Phase 4 evidence. Local nested dependencies must be checked/restored
before the full validation sequence; they are not assumed present.

## 3. Architecture and ownership boundaries

```text
Explicit mode configuration
  → bundled catalogue repository + envelope/record guards
  → validated immutable catalogue snapshot
      → question plan: field union + companion controls + income bands
      → public record presentation

Questionnaire draft + actually presented active fields
  → strict normalizeProfile
  → captured evaluation context
  → evaluateCatalogue + document applicability
  → one atomic in-memory submission snapshot
      → result groups / logical explanations / matching-version detail

Independent in-memory checklistProgress
  → preparation counters only; never profile or engine inputs
```

**Repository:** data selection, load validation, slug lookup and coverage diagnostics. It never
calculates eligibility or accepts a student's profile.

**Question adapter:** field relevance, vocabulary-backed options, companion controls and labels.
It does not decide whether a student passes a rule.

**Submission coordinator:** normalization, time capture, domain calls and atomic commit. All work
finishes before committing results. No evaluation inside reducers, render functions or render effects.

**Presentation:** joins and formats existing data; it never recalculates status from individual rows.
Use React text rendering, not injected HTML.

**Publication tooling:** existing server validators remain authoritative for review, schema,
registry and publication. No filesystem loader, PDF parser or source-fetching code enters the browser.

## 4. Frozen Phase 3 contracts

| Existing absolute module                                 | Contract to consume                                                                                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `D:\SchemeLog\client\src\domain\profile\normalize.js`    | `normalizeProfile(draft, { askedFields, incomeBands, vocab })` returns `{ ok: true, profile, mappingIssues }` or `{ ok: false, errors }`                            |
| `D:\SchemeLog\client\src\domain\eligibility\evaluate.js` | `evaluateCatalogue(profile, catalogue, context)` returns a sorted assessment array; also exports `evaluateRule`, `evaluateScheme`, `ENGINE_VERSION`, `STATUS_ORDER` |
| `D:\SchemeLog\client\src\domain\validation\scheme.js`    | `validateAssessmentScheme` returns an issue array, not an `{ ok }` object; `createEvidenceResolver` resolves mode-specific provenance; `walkRules` traverses trees  |
| `D:\SchemeLog\client\src\domain\application\status.js`   | `deriveApplicationStatus(application, context)`; standalone calls need `currentCycle` and already-resolved evidence                                                 |
| `D:\SchemeLog\client\src\data\demo-catalogue.js`         | `demoCatalogue`, `demoContext`, `referenceProfile`, `validateDemoCatalogue`                                                                                         |
| `D:\SchemeLog\client\src\data\vocabularies.js`           | Browser-safe `vocabularies` adapter                                                                                                                                 |
| `D:\SchemeLog\client\src\domain\eligibility\reasons.js`  | `reasonCopy`, `explainReason(code, mode)` for stable, mode-aware copy                                                                                               |

Context contains `mode`, `catalogueVersion`, `engineVersion`, `evaluatedAt` and optional
`currentCycles`. Engine version is `1.0.0`; use the exported constant. Catalogue version must match
the evaluated envelope. The timestamp requires seconds and an explicit offset or `Z`.

An assessment contains `schemeId`, `schemeVersion`, `status`, `ruleResults`, `missingFields`,
`manualChecks`, `dataWarnings`, `applicationStatus`, `catalogueVersion`, `engineVersion`, `evaluatedAt`.
Join `assessment.schemeVersion` to `record.recordVersion`, not to a nonexistent record `schemeVersion`.
Invalid domain inputs throw `DomainValidationError` with `code` and sorted `issues`. Do not display
raw input objects or log profiles when handling errors.

## 5. Explicit catalogue loading and trust

### 5.1 Proposed repository API

Keep an asynchronous load boundary for consistent loading/error UI, even though data is bundled:

```text
getCatalogue() -> Promise<CatalogueLoad>
getScheme(slug, catalogueSnapshot) -> SchemeRecord | null

CatalogueLoad {
  mode: 'demo' | 'reviewed'
  catalogue: validated selected-mode envelope
  coverage: original coverage metadata
  quarantined: validated publication-time quarantine summaries
}
```

`getCatalogue()` loads only the configured mode and returns a detached, read-only-in-use snapshot.
`getScheme` searches `record.slug` in an explicitly supplied validated snapshot. It does not reload
another version or fall back to fixtures. Cache only non-personal catalogue data; provider state
owns loading, ready, empty and error states. An empty valid envelope is not a rejected promise.

Use `/scholarships/demo-learning-pathways` for the Learning Pathways fixture. Existing routes use
`/scholarships/:slug`; change card links from record ID to `record.slug`. No legacy alias table is
required. Old fixture slugs may correctly reach the not-found state.

### 5.2 Validation layers

1. Reject an unsupported configured mode before selecting data.
2. In demo mode, call `validateDemoCatalogue`, including its ID/slug uniqueness and evidence checks.
   Add presentation-shape checks for any optional properties the UI consumes; do not assume demo
   records have real-schema benefits, authority or application steps.
3. In reviewed mode, a proposed pure browser envelope guard checks required/extraneous keys,
   supported schema/vocabulary versions, version syntax, actual dates/timestamps, complete coverage
   shape, nonnegative count equality, quarantine summary shape and unique record IDs/slugs.
4. Run `validateAssessmentScheme(record, { mode, vocab })` on every selected record. Reject wrong-mode
   IDs, invalid rule/document trees and unresolved evidence references.
5. Real record JSON-schema validity and publication/review/registry semantics must also pass the
   existing offline build. The browser guard is defense in depth, not proof of human approval.

Implement the pure envelope checks without importing the Node validator or adding a validation
library. Exercise envelope acceptance/rejection against the existing server schema in parity tests.
Validate optional presentation fields before use and fail closed on malformed values. Do not market
this intentionally narrower runtime boundary as the full real publication validator.

### 5.3 Error and quarantine policy

Fail the **whole runtime load** for any malformed selected record or envelope. This is the bounded,
conservative Phase 4 policy: do not silently filter bad records, rewrite coverage counts or present
the survivors as a complete successful load. Show a catalogue-unavailable state with retry and home
actions while retaining the draft and any clearly labelled previous submission.

Publication-time quarantine is different: the offline build can legitimately exclude records and
list them in `coverage.quarantined`. Display the number and safe reason summaries alongside the
accepted coverage statement. A valid zero-record catalogue with quarantine findings is still an
empty catalogue with disclosed exclusions, not a personal failure.

Reviewed-mode load failure or emptiness never triggers demo mode. Mode changes require an explicit
configuration/reload decision, not a URL parameter, exception handler or student answer.

## 6. Catalogue-driven questionnaire

### 6.1 Proposed question-plan adapter

Add a pure planner at `D:\SchemeLog\client\src\domain\profile\question-plan.js`:

```text
buildQuestionPlan(catalogue, { vocab }) -> {
  catalogueVersion,
  requiredProfileFields,
  draftFieldIds,
  incomeBands
}
```

Traverse every `eligibility.rule` and every non-null `documents[].appliesWhen`, including `children`
and `child` under `allOf`, `anyOf` and `not`. Reuse `walkRules`. Collect declared `field` references,
deduplicate and apply a stable UI order. Manual-verification text with no field does not justify
collecting an institution answer. Do not remove schemes or fields because a previous answer is
unknown, declined or currently fails a rule.

Compute dependency closure for controls: a study-year answer may need education level and course
duration; course selection may need education level; an academic score needs format, context and
sometimes scale. These supporting questions are relevant even without their own rule leaf.
Unsupported declared fields without a UI mapping are an integration error, not silently skipped.

The current demo references only education level and income, including its document condition.
Consequently its normal questionnaire should omit domicile, category, institution, course and score.
Companion controls must be tested with isolated test catalogues; do not enlarge the production demo
just to preserve old four-step browser assumptions.

### 6.2 Field mapping and companion controls

| Canonical field         | Draft control strategy                                         | Required behavior                                                                                 |
| ----------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `educationLevel`        | Existing radio/select values                                   | Preserve explicit diploma → `diploma-technical` mapping                                           |
| `domicileState`         | Existing `domicile` selector, vocabulary labels/codes          | Map only an unambiguous state label                                                               |
| `courseCode`            | `course` selector with exact vocabulary choices                | Broad Science/Engineering labels cannot establish a degree; keep mapping issues for legacy values |
| `studyYear`             | Existing `studyYear` plus `courseDuration` for course years    | School answers use class codes; never infer duration or a specific stage from “Year 5 or later”   |
| `annualHouseholdIncome` | `income` band ID                                               | Inject the exact active plan's intervals into normalization                                       |
| `academicScore`         | `scoreType`, `score`, `scoreContext`, conditional `scoreScale` | Distinguish percentage, percentile and CGPA; no conversion or inferred exam                       |
| `institutionType`       | Existing `institution` selector                                | Private maps to `private-other`, not recognized/accredited                                        |
| `category`              | Vocabulary-backed selector                                     | Optional, with explicit uncertainty/decline                                                       |
| `additionalAnswers.*`   | Declared yes/no controls                                       | Use exact declarations; never arbitrary extra fields                                              |

Use either the legacy alias or canonical field for an answer, never both. Do not combine typed
`academicScore` with split score controls. Numeric controls must take min/max/unit from their
definition rather than hardcoding 0–100 and `%`; use nullish handling so zero stays visible.

### 6.3 Actually asked fields and four answer states

Track fields presented on visited steps/review, independently of whether an answer exists. On submit,
intersect presented fields with the current active control set after dependency changes. A merely
planned but never presented field is not asked. Review should expose active unanswered questions
before submission, not just keys present in the draft.

- Supplied valid answer → `known`.
- Presented but blank or explicitly unsure → `unsure`.
- Explicit refusal → `declined`.
- Not presented or no longer active → `not-asked`.

Clear dependent UI answers on legitimate controlling-field edits, extending the current reset logic
to course duration and score context/scale. Keep unrelated answers. Pass the full retained draft to
strict normalization: never run the legacy filtering helper first. Undeclared keys and malformed
hidden supplied values must still be rejected rather than laundered into a valid profile.

Empty sections disappear and the step index is clamped when section membership changes. Preserve
Back, Continue, review/edit and focus handling. When the active catalogue has zero records, show
coverage/empty state before collecting answers; do not run a meaningless questionnaire.

### 6.4 Income band policy

Derive bands from income leaves in both eligibility and document trees. Collect numeric boundaries
from comparisons, equality/membership where supported, and both bounds of `between`. Use validated
rule shapes, not prose, and do not use the generated real threshold file for demo data.

Use a small deterministic partition over nonnegative annual INR:

1. Sort/deduplicate finite nonnegative boundaries; preserve zero as a boundary.
2. With positive edges, first interval is `[0, firstEdge]`, then `(previousEdge, edge]`.
3. If zero is an explicit edge, first emit `[0,0]`, then the positive intervals excluding zero.
4. End with `(lastEdge,+infinity)` using `max: null`, `maxInclusive: false`.
5. If income is referenced but there are no numeric edges, use `[0,+infinity)` with zero included.
6. If income is not referenced at all, return no bands and hide the question.

Every interval includes `min`, `max`, `minInclusive`, `maxInclusive`, `currency: 'INR'`, `period: 'year'`.
IDs are stable functions of bounds, not option indices. The active demo yields `[0,100000]`,
`(100000,250000]`, `(250000,+infinity)`. Labels must distinguish “up to” from “above”.

This intentionally coarse partition does not promise certainty for strict comparisons: `[0,100000]`
against `< 100000` crosses the boundary and must stay unknown. Do not relabel it “below 100000”,
round the answer or force exact-income disclosure. A zero-only band handles `<= 0` honestly.

The helper in `D:\SchemeLog\server\src\data\question-fields.js` drops zero thresholds and can
exclude zero with an empty edge list. Do not import it unchanged as the new questionnaire policy.
Keep that legacy helper untouched unless a separately tested shared extraction is necessary; the
new planner's boundary behavior must be covered explicitly.

## 7. Atomic session and submission lifecycle

### 7.1 Proposed in-memory state

```text
SessionState {
  draftProfile,
  draftRevision,
  presentedFields,
  submission: null | {
    submittedRevision,
    profile,
    mappingIssues,
    askedFields,
    questionPlan,
    catalogueSnapshot,
    context,
    assessments,
    documentApplicability
  },
  checklistProgress
}
```

Store detached snapshot values. `catalogueSnapshot` retains the exact evaluated records and coverage;
do not join a saved assessment to whatever the repository currently returns. `questionPlan` preserves
band meanings for submitted-answer summaries. The draft remains separate and editable.

`stale` means `draftRevision !== submission.submittedRevision`. Increment revision on an actual
draft change, including dependent resets, not on route changes or checkmarks. Once edited, even an
edit subsequently reverted requires resubmission; this simple conservative policy avoids invoking
normalization or evaluation on every render. Clearly label this as last-submitted results.

### 7.2 Submission transaction

1. Require a ready, nonempty validated catalogue and its matching question plan.
2. Capture the current draft revision and draft snapshot; prevent duplicate submit actions.
3. Call strict `normalizeProfile` with active actually-presented fields, that plan's bands and vocab.
4. On validation failure, retain draft and previous submission; show safe inline errors and focus
   the first affected control or review error summary. Do not navigate to results.
5. On success, capture one context outside the reducer and domain core.
6. Call `evaluateCatalogue` once. Evaluate document conditions with that same profile/context.
7. Construct the full snapshot, including mapping issues and all record/version joins.
8. Dispatch one `submit-success` action; accept it only if its captured draft revision and catalogue
   selection still match. Otherwise discard the obsolete attempt and request a new submission.
9. Navigate to results only after successful commit. Clear transient submit errors; stale becomes false.

Normalization mapping issues are nonfatal and visible: show that ambiguous answers stayed unsure.
A `DomainValidationError` during evaluation is a data/integration error, not evidence the student
is ineligible. Retain previous results only with an explicit previous-submission notice; never
partially replace profile, context or assessment arrays.

Keep the reducer pure and export/extract it for Node tests if necessary. A proposed coordinator in
`D:\SchemeLog\client\src\app\submission.js` can own the pure transaction assembly with an injected
clock/context; the event handler supplies time. There must be no `Date.now`, network, logging or
storage side effects in reducer/domain functions.

### 7.3 Time and lifecycle policy

- Demo uses `demoContext`, fixed at `2026-10-10T12:00:00+05:30`, with the disclosure “Demo rules
  evaluated as of 10 October 2026.” Do not silently advance demo facts to the real current day.
- Reviewed submissions capture `new Date().toISOString()` once in the UI event boundary. Calendar
  freshness remains Asia/Kolkata; due today is already due.
- `currentCycles` is explicit release policy, not derived from year or copied from a record as proof
  it is current. Missing reviewed policy gives unknown application status, not invented certainty.
- Rerenders, navigation and checklist changes reuse the submission timestamp and assessments.
- If a catalogue version changes, preserve old results only against their old records with an update
  notice. Require a new plan/submission before using the new catalogue. No background result rewrite.
- Refresh clears draft, submissions and progress. Reset does the same intentionally. Never persist
  them in local/session storage, cookies, IndexedDB, history state, URLs or network requests.

## 8. Results, explanations and details

### 8.1 Presentation contract

Pass `record`, `assessment` and selected-mode presentation metadata separately to cards/details.
An optional pure adapter at `D:\SchemeLog\client\src\presentation\scheme.js` may format display
values, but must not merge a fixture status into a record or compute a replacement eligibility status.

Move reusable group labels/icons out of `D:\SchemeLog\client\src\data\fixtures.js` into a small
presentation constants module. Remove runtime imports of legacy `schemes` and prewritten reasons.
Retain the current four status IDs and engine order:

| Engine status  | UI heading                      | Meaning                                                      |
| -------------- | ------------------------------- | ------------------------------------------------------------ |
| `potential`    | Potential match                 | Complete usable conditions pass; not an award guarantee      |
| `verification` | Needs verification              | Partial coverage or unresolved conditions                    |
| `unmet`        | Does not meet a known condition | A trusted aggregate failure, even with unrelated uncertainty |
| `unavailable`  | Information unavailable         | Insufficient usable scheme conditions                        |

Show “1 potential match among 4 fictional scholarships”, not “4 matches”. Preserve engine ordering
within groups; do not introduce browser-locale resorting or scores. Optional filters cannot change
assessments. A filtered zero-result state is distinct from an empty catalogue.

### 8.2 Logical explanation rows

Adapt `RuleExplanation` to receive `assessment.ruleResults` and mode. Each row shows requirement,
submitted answer or its uncertainty state, outcome, reason copy and supporting provenance. Format
typed income intervals, score scale/context and study-year dimensions without lossy conversion.

Reconstruct nesting using `parentRuleId` and `childRuleIds`. Label `allOf` as all required, `anyOf`
as alternatives and `not` as an exclusion. For a passing `anyOf`, emphasize the successful branch;
failed siblings remain visible as alternatives, not scheme failures. Do not flatten negated leaves
into misleading red failures either: the parent outcome governs the exclusion's meaning.

Reuse `explainReason` rather than inventing eligibility text. Keep unknown contextual rows visible,
but populate the top-level action list only from engine `missingFields` and `manualChecks`.
Do not promote every unknown descendant into a blocking action: the engine already restricts these
lists to uncertainty contributing to an unknown root. `dataWarnings` describe data limitations,
not requests for more sensitive answers.

Missing-answer actions return to the existing review/edit flow. Manual checks show their check hint
and usable provenance; checking a preparation box cannot resolve them. Deep-link editing is optional.
Fictional provenance always says “Fictional test condition”; real provenance shows source title,
authority and locator. Evidence URLs do not automatically become navigation actions (section 10).

### 8.3 Direct routes and version matching

Detail route behavior:

1. While catalogue loads, show loading; on load error, show catalogue recovery, not not-found.
2. A valid selected catalogue with no matching slug produces the existing not-found page.
3. With a matching submission, use the submitted record snapshot and matching ID/version assessment.
4. With no matching personal assessment, show public information and a questionnaire CTA. Do not
   evaluate an empty/reference profile or show a personal status badge, personalized explanation or
   “required for you” wording.
5. Keep demo disclosure and fixed-date policy visible on direct routes too. A stale submission gets
   the same stale notice on detail and results.

Public document lists may describe generic requirements, but personal applicability/progress controls
remain disabled until a matching submission exists. If a new catalogue is loaded during a session,
an existing submitted detail may remain available as a visibly older snapshot; never mix versions.

### 8.4 Public facts and independent application status

Demo records lack the legacy fixture benefit/amount/authority decorations. Omit those slots or say
“Not specified in this fictional example”; do not copy real-looking amounts from old fixtures.
In reviewed mode, display only supported current benefit facts. Withhold or explicitly mark stale,
superseded and unconfirmed amounts. Derive “Last verified” from the oldest actual check date among
displayed verified facts, never from catalogue publication time or source retrieval time.

Eligibility and application status are separate. Potential eligibility may coexist with closed or
unknown applications. Display exact timestamps as such; display date-only endpoints as dates with no
invented midnight, countdown or closing hour. Supported date-only timezone is Asia/Kolkata; absent or
unsupported timezone yields unknown. Current-cycle and notice semantics stay in the Phase 3 helper.

For direct public details, capture a public-view context once per loaded view (fixed demo date or
reviewed view timestamp), resolve application notice evidence before any standalone status call,
and supply explicit `currentCycle`. If that adapter is not implemented, display application status
as unknown rather than passing unresolved references or inventing a personal assessment.

## 9. Conditional preparation checklist

### 9.1 Applicability

For each conditional document, use the frozen call shape:

```js
evaluateRule(profile, document.appliesWhen, {
  context,
  inheritedFreshness: scheme.eligibility.freshness,
  resolveEvidence: createEvidenceResolver(scheme, context.mode),
});
```

Store the returned `outcome` and explanation rows in the submission's `documentApplicability`, keyed
by scheme ID, record version and document ID. Recalculate on resubmission only. Missing leaf
citations remain uncertainty; dangling/wrong-mode references are validation errors.

| Document case                                       | Applicability/presentation                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Conditional rule passes                             | Required for the supplied answers                                                                                                           |
| Conditional rule fails                              | Not applicable for the supplied answers                                                                                                     |
| Conditional rule unknown                            | May be required — check this condition                                                                                                      |
| `requirement: 'confirmed'`, null condition          | Required according to the record only when inherited freshness is current and supporting metadata/evidence is usable; otherwise unconfirmed |
| `requirement: 'needs-verification'`, null condition | May be required — confirm with the source                                                                                                   |
| No submitted profile                                | Generic document information, not a personal applicability result                                                                           |

Use `effectiveFreshness` for the confirmed/unconditional adapter, not a second date policy. A null
condition is never passed as an empty or vacuously passing rule. The schema requires conditional
documents to carry a valid tree and other requirement kinds to have a null condition.

### 9.2 Progress and counters

Progress keys are exactly `schemeId:recordVersion:documentId`; for example,
`fx-sch-learning-pathways:1:doc-income`. Store booleans in session memory only.

- Count completed applicable tasks only: applicability `pass` and checked `true`.
- Show unknown tasks separately; an optional checkmark on them does not enter the required-task count.
- Failed/non-applicable tasks are excluded from both denominator and numerator; disable their controls.
- Resubmission changes applicability, not eligibility via checkmarks. Retain same-version checkmarks
  so a task can reappear marked if it becomes applicable again; exclude it while not applicable.
- A new record version has a new key and inherits no progress. Reset/refresh clears all progress.
- With zero confirmed applicable tasks, say so; do not show 100% or divide by zero.

Copy: “You marked 2 preparation tasks as done.” Never “100% eligible”, “application complete” or
“documents verified”. These are user-marked preparation reminders, not uploads or official checks.

## 10. Safe external navigation and privacy

Replace hardcoded `SourceLink` behavior with an explicit destination prop/adapter. In reviewed mode,
only render record actions whose `links[]` entry has an allowed purpose, `status: 'verified'`, valid
HTTPS URL, nonfuture check date and publication-approved provenance/registry backing. Do not infer
approval from a government-looking hostname. Reject URLs with credentials and unsafe protocols.

Keep purpose labels distinct: “Scheme information”, “Read guidelines”, “Application portal”. If an
application destination is absent/broken/unverified, offer a verified information/guidelines link
under its actual label, never as a replacement “Apply” button. Do not probe destination health from
the student's browser. Portal access does not itself establish that applications are open.

Evidence references and destination authorization are separate. A provenance URL may be shown as
text; make it clickable only through the same approved destination policy. Demo `links` and `sources`
remain empty. General discovery resources, if retained, are separate explicitly labelled links,
never fictional application actions.

All new-tab links use `target="_blank"`, `rel="noopener noreferrer"` and accessible new-tab wording.
Never append answers, profile IDs or session data to any destination. No profile logging, telemetry,
external fonts/scripts newly added for this work, form submission requests or client error reporting
that serializes session state. Local static assets are allowed; personal data transmission is not.

## 11. Screen states and accessibility

| State                         | Required presentation/action                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| Landing, demo                 | Exact fictional-prototype disclosure, coverage, fixed date, primary CTA “Try the demo” |
| Landing, reviewed             | Actual reviewed coverage; no universal eligibility or exhaustive catalogue claim       |
| Loading                       | Labelled status message; prevent questionnaire submission against unloaded data        |
| Valid empty catalogue         | Coverage and exclusions; no “you are ineligible” message and no fallback mode          |
| Invalid catalogue             | Clear load error, retry/home; retain draft; no trusted partial rendering               |
| No profile at results         | Questionnaire CTA and explanation that refresh clears session                          |
| Invalid submission            | Inline errors + focusable summary; no navigation or partial commit                     |
| Mapping uncertainty           | Nonfatal clarification copy; preserve unsure rather than guessed values                |
| Stale results/details         | “Uses your last submitted answers”; review/resubmit action                             |
| Unknown detail slug           | Existing not-found state only after a valid lookup                                     |
| No applicable checklist tasks | Neutral empty preparation state, not completion/eligibility success                    |

Reuse stepper, cards, notices, disclosures, skip link and route focus. Group status must have text,
not color alone. Associate labels/hints/errors with controls; make new error summaries focusable.
Announce submission/loading errors without repeatedly announcing on every render. Conditional
controls and changing sections must not strand keyboard focus. Test 360px width, long source labels,
logical explanation indentation, keyboard-only completion and existing axe assertions.

Remove obsolete claims that results are prewritten or not based on answers once integration works.
Update global header/footer, page titles, landing methodology, questionnaire review, card labels and
detail notices together so they describe the same selected mode. Do not remove truthful warnings
until their corresponding implementation is complete.

## 12. File-level implementation plan

| Absolute file/module                                                                  | Work                                                                                                   |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `D:\SchemeLog\client\src\repositories\catalogue.js`                                   | Explicit loader, guarded snapshots, true slug lookup; remove legacy fixture source                     |
| `D:\SchemeLog\client\src\domain\validation\catalogue.js` (new)                        | Browser-safe envelope/presentation guards and structured non-personal issues                           |
| `D:\SchemeLog\client\src\domain\profile\question-plan.js` (new)                       | Referenced-field union, companion dependencies and active income bands                                 |
| `D:\SchemeLog\client\src\data\questions.js`                                           | Consume plan/vocab, dynamic sections, labels, controls and dependent reset rules                       |
| `D:\SchemeLog\client\src\app\submission.js` (new)                                     | Testable snapshot assembly; normalization, assessment and applicability orchestration                  |
| `D:\SchemeLog\client\src\app\Session.jsx`                                             | Catalogue load state, draft revisions, atomic submit action and preparation state                      |
| `D:\SchemeLog\client\src\pages\Questionnaire.jsx`                                     | Presented-field tracking, companions, strict submit/error handling and dynamic review                  |
| `D:\SchemeLog\client\src\pages\Results.jsx`                                           | Snapshot-based groups/counts, coverage, stale and recovery states                                      |
| `D:\SchemeLog\client\src\pages\ScholarshipDetail.jsx`                                 | Exact-version join, public direct entry, conditional checklist and safe actions                        |
| `D:\SchemeLog\client\src\components\SchemeCard.jsx`                                   | Separate record/assessment props, actual slug and optional fact slots                                  |
| `D:\SchemeLog\client\src\components\UI.jsx`                                           | Group-aware explanations, robust status badges and explicit source-link inputs                         |
| `D:\SchemeLog\client\src\presentation\scheme.js` (new)                                | Small pure fact/destination/label adapters; no eligibility calculation                                 |
| `D:\SchemeLog\client\src\pages\Landing.jsx` and `D:\SchemeLog\client\src\app\App.jsx` | Consistent mode/date/coverage copy and CTAs                                                            |
| `D:\SchemeLog\client\tests\unit`                                                      | Planner, loader, transaction, reducer, presentation and checklist tests under existing `.test.js` glob |
| `D:\SchemeLog\client\tests\journey\frontend.spec.js`                                  | Actual answer-driven journeys; keep axe/privacy/layout/recovery regressions                            |

Small presentation constants or pure reducer/checklist helpers may be extracted beside these files
to keep tests independent of JSX. This is not permission for a broad architecture migration. Change
existing CSS only where the new logical rows, controls or warnings require layout support.

Leave `D:\SchemeLog\server\src\data\schemes`, both generated real catalogue files, release metadata
and registry approvals untouched unless a separately authorized genuine publication occurs.

## 13. Test design and expected observations

### 13.1 Node test matrix

| Area                      | Required cases                                                                                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                | Valid demo/reviewed-empty; invalid mode/envelope/count/version; duplicate ID/slug; wrong-mode record; malformed presentation data; no error fallback; disclosed quarantine; actual slug lookup |
| Envelope parity           | Shared valid/invalid envelope cases checked against existing server schema; browser guard does not claim human approval                                                                        |
| Planner                   | Nested groups and negation; document-only field/threshold; no field on manual rule; stable deduplication; no pruning for unknown answers; missing control mapping fails                        |
| Income                    | No relevant rule; zero-only/positive/multiple/duplicate edges; no-edge income condition; unbounded interval; strict threshold overlap; exact endpoint membership; no gaps/double counting      |
| Normalization integration | Actually asked vs blank vs declined vs hidden; full-draft rejection of forbidden/malformed input; score scale/context; course duration; zero rendering; no guessed mappings                    |
| Transaction               | One evaluation per successful submission; fixed injected context; all-or-nothing error behavior; mapping issues retained; obsolete revision rejected                                           |
| Session                   | Edit marks stale; route/checkmark does not; submit replaces; version mismatch never joins; reset clears; inputs/snapshots are detached                                                         |
| Explanation               | Passing alternative contains failed sibling without scheme-failure copy; negation meaning retained; top-level actions use engine lists; provenance and unknown copy                            |
| Checklist                 | Pass/fail/unknown conditions; null metadata handling; inherited stale evidence; counts; same-version retention; new-version reset; checkmark cannot resolve manual rule                        |
| Navigation/facts          | Unsafe/unverified/broken destinations hidden; fallback correctly labelled; fictional actions absent; stale amounts withheld; oldest displayed check date                                       |

Use `node:test` and `node:assert/strict`, as in existing tests. No runner migration or new test library.
Preserve existing domain tests; update obsolete legacy UI-filter assertions only where their call
sites are intentionally retired, replacing them with strict-boundary coverage rather than deleting
the safety property.

### 13.2 Deterministic demo oracle

The domain `referenceProfile` uses `[0,250000]`. The UI plan splits that range at the document
threshold. An undergraduate profile selecting `(100000,250000]` must still produce these statuses:

| Fixture ID                 | Expected result |
| -------------------------- | --------------- |
| `fx-sch-learning-pathways` | `potential`     |
| `fx-sch-next-chapter`      | `verification`  |
| `fx-sch-new-horizons`      | `unmet`         |
| `fx-sch-future-notice`     | `unavailable`   |

For Learning Pathways, that band makes the `<= 100000` preparation task not applicable; choosing
`[0,100000]` makes it required. Declining income changes Learning Pathways to verification and the
document condition to unknown. Selecting `(250000,+infinity)` changes Learning Pathways to unmet.
School plus `[0,100000]` changes New Horizons to potential and Next Chapter to unmet. All fixture
application dates remain unknown. Assertions must name outcomes, not merely count four cards.

### 13.3 Three browser journeys

1. **Personalized discovery:** start via “Try the demo”; confirm irrelevant sensitive questions are
   absent; submit undergraduate plus a middle band; inspect grouped reasons and evidence; edit to
   a high band; visit old results to verify stale copy; resubmit and verify Learning Pathways becomes
   unmet and stale clears. Verify result/detail context and version agree.
2. **Honest uncertainty:** decline income; observe verification and unknown document applicability;
   inspect Next Chapter's manual recognition check and passing alternative; confirm unknown
   application dates. Exercise strict-boundary overlap and score-context controls through isolated
   test data, not invented real records or production-only test controls.
3. **Preparation and recovery:** submit low income; mark the applicable task; navigate away/back;
   resubmit a band making it non-applicable and verify counters; refresh and verify profile/progress
   clear; visit a direct demo detail without personal results; test invalid slug, valid empty data and
   catalogue failure/retry. No reviewed error may switch to demo.

Run these at desktop and 360px widths using the existing Playwright projects. Preserve tablet/reflow,
reduced-motion, landing anchors, keyboard focus and axe coverage. Observe requests, external hrefs,
browser storage and console output for accidental profile disclosure; ordinary static asset requests
are not a failure. Inspect the built import graph/assets for real draft records and Node/PDF/fetch code.

The legacy user-facing “Preview scenario” selector must not manufacture personal results. Remove it
or restrict it to clearly labelled non-assessing demo diagnostics. Prefer injected repository loaders
for unit tests and a separate test-only browser build/harness for empty/error/alternate-field cases;
no profile-bearing query parameters or production runtime mode overrides.

### 13.4 Commands and evidence recording

From `D:\SchemeLog`, check Node.js 22.12+ and restore missing dependencies with `npm ci` and
`npm run setup`. Browser installation is a separate prerequisite:

```powershell
Set-Location D:\SchemeLog
npm exec --prefix client -- playwright install chromium
npm test
npm run validate:catalogue
npm run validate:registry
npm run build
npm run format:check
npm run test:e2e
git diff --check
```

Run targeted Node integration tests during implementation, then this full sequence for the Phase 5
handoff. Catalogue/test/build commands must not fetch official sources. Record actual test counts,
exit codes and blocked gates; do not copy Phase 3 results. If browser dependencies/downloads are
unavailable, mark browser validation blocked and do not claim the journey is verified.

## 14. Sequencing, timebox and risk control

The parent plan allocates minutes 30–65 (35 elapsed minutes) to Phase 4. This detailed document is
not a guarantee that every adapter and proof fits that budget. Preserve correctness and stop rules;
report incomplete gates rather than broadening claims.

| Phase 4 elapsed | Work package                                              | Exit checkpoint                                                                 |
| --------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 0–7 min         | Freeze mode, loader contracts, guards and question plan   | Valid demo loads; invalid/empty reviewed data cannot become demo                |
| 7–16 min        | Dynamic controls, strict normalization and atomic session | Submitted answers produce a stored engine snapshot; invalid input cannot commit |
| 16–25 min       | Results/cards/details and logical explanations            | Changed answers change named outcomes; direct routes make no personal claim     |
| 25–30 min       | Conditional checklist, destination filtering and copy     | Versioned preparation and no fictional application actions                      |
| 30–35 min       | Targeted tests and one full browser journey               | Evidence for integration or an explicit blocked/incomplete handoff              |

If two implementation owners are used, one owns pure repository/planner/adapters/tests, the other
owns session/UI/browser wiring. Agree exports first; avoid concurrent edits to the same file. The
lead owns integration and final diff review. An AI reviewer does not satisfy human publication review.

**Allowed cuts:** optional filters, deadline sorting, deep-link editing, visual polish and extra
fictional scenarios. **Not allowed cuts:** strict profile validation, mode isolation, honest unknown
states, privacy, grouped explanation correctness, version matching or answer-driven proof. At the
feature freeze, stop adding controls/features; mark missing required behavior incomplete.

| Risk                                                      | Mitigation                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Assessment guard mistaken for publication approval        | Separate runtime and offline gates; default demo; no draft imports      |
| New UI silently retains fixture claims                    | Remove runtime fixture imports and grep obsolete copy/status references |
| Income bands miss document thresholds or zero             | Traverse both tree types; explicit partition and endpoint tests         |
| Companion controls collect irrelevant data                | Field union plus dependency closure; test minimal two-field demo        |
| Async load/edit race commits inconsistent results         | Capture revisions/catalogue selection and commit atomically             |
| Passing `anyOf` looks like a failed scheme                | Preserve tree structure and parent semantics                            |
| Checklist implies eligibility or completion               | Independent state, qualified copy and applicable-only counters          |
| Reviewed direct detail invents current application status | Explicit cycle/evidence adapter or unknown fallback                     |
| Missing browser prerequisites                             | Record blocked gate; build is not browser evidence                      |

## 15. Acceptance checklist and handoff

- [ ] Repository loads only the explicit selected mode; complete envelope validation and record guards
      run before questionnaire or trusted data rendering.
- [ ] Invalid data, valid empty data and publication quarantine are distinguishable; no silent fallback.
- [ ] Active rules and document conditions drive questions and non-overlapping income bands, including zero.
- [ ] Actual asked fields, uncertain/declined answers, score context and duration are handled without guessing.
- [ ] Strict normalization receives the retained full draft; sensitive or malformed input cannot be filtered away.
- [ ] One successful submission stores normalized profile, mapping issues, versions, records, context,
      assessments and document applicability atomically in memory.
- [ ] Edits mark snapshots stale; resubmission replaces them; rendering/navigation never reevaluates eligibility.
- [ ] All four status groups, counts, logical explanations and next actions come from engine output.
- [ ] Result/detail joins use exact record versions; direct detail visits make no personal assessment claim.
- [ ] Conditional applicability, progress keys and counters follow section 9; progress never changes eligibility.
- [ ] Demo/date/coverage disclosures are consistent; no unsupported amount, deadline or application action appears.
- [ ] Verified destinations and evidence URLs are handled separately; personal data stays off storage,
      URLs, requests and logs.
- [ ] Targeted unit and answer-driven browser tests pass with actual evidence, or required blocked gates
      are explicitly marked and completion is withheld.
- [ ] Existing accessibility/privacy/recovery regressions remain covered; build contains no real drafts
      or server-only tooling.

At implementation handoff, write `D:\SchemeLog\docs\PHASE4-HANDOFF.md` with selected mode,
catalogue/engine versions, date policy, changed files, actual commands/results, test counts, known
limitations and remaining Phase 5 gates. Include a two-minute script: submit → why → edit/resubmit →
uncertainty → checklist. Record the actual commit when available, not a predicted hash.

The Phase 5 owner then runs the full release sequence and records the achieved release level in
`D:\SchemeLog\docs\release\PHASES-3-5-RELEASE.md`. Hosting authorization, genuine human approvals and
live deployment are independent prerequisites; this Phase 4 design does not claim any of them.
