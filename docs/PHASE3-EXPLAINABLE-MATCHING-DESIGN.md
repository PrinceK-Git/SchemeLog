# Schemelog Phase 3 — explainable matching design

**Date:** 10 October 2026  
**Status:** Implementation specification; not an implementation or release report  
**Scope:** Phase 3 of the reduced Phases 3–5 build  
**Repository:** `C:\Users\omen\Desktop\SchemeLog`  
**Inspected commit:** `0925edd1477608b8342c1137eb41260114aba5fe`  
**Parent plan:** `C:\Users\omen\Desktop\SchemeLog\docs\PHASES-3-5-90-MINUTE-DESIGN.md`

## 1. Purpose and outcome

Replace prewritten personal assessment statuses with a deterministic, explainable rules engine.
Given a validated student profile, a validated scheme, and an explicit evaluation context, the
engine returns a reproducible assessment and the reasons behind it. It must distinguish an unmet
condition from missing student information, missing scheme information, and a manual check.

The Phase 3 deliverable is a tested domain layer and a frozen integration contract. It is **not**
the complete browser journey, a government eligibility determination, or a reviewed-data release.
Phase 4 owns connecting these contracts to the existing questionnaire, repository and screens.

### 1.1 Success criteria

- Answers genuinely change assessments; no input-independent personal status is read from fixtures.
- Unknown answers never become false or satisfied merely because they are absent.
- A current, supported failure can establish `unmet` despite an unrelated unknown condition.
- Stale or unconfirmed facts cannot establish a trusted pass or failure.
- Income bands are assessed as intervals, not midpoints or assumed exact incomes.
- Explanations retain the requirement, supplied answer, outcome and evidence provenance.
- Application availability remains independent of eligibility.
- The same validated inputs, versions and evaluation timestamp produce identical output.
- Domain code runs under Node's existing test runner without React, network or browser globals.

### 1.2 Non-goals

No redesigned screens, runtime API, database, persistence, authentication, ranking score, analytics,
chatbot, source fetching, OCR, currency conversion, CGPA conversion or new testing framework.
No research expansion or AI-generated human approval. Do not modify the three real research drafts
to make a demo work. Do not implement the full deferred Phase 2 source pipeline.

## 2. Current state and concrete gaps

These observations come from source inspection, not assumptions about the parent plan's completion.

| Existing file, absolute path                                                        | Observed behavior                                                                        | Phase 3 decision                                                                                   |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `C:\Users\omen\Desktop\SchemeLog\client\src\data\fixtures.js`                       | UI-shaped fictional records carry prewritten statuses and explanation rows.              | Create separate declarative demo records. Do not feed these presentation fixtures into the engine. |
| `C:\Users\omen\Desktop\SchemeLog\client\src\data\questions.js`                      | Draft values are strings; `normalizeProfile` only filters keys and hidden answers.       | Add a real draft-to-canonical boundary. Filtering is not profile validation.                       |
| `C:\Users\omen\Desktop\SchemeLog\client\src\app\Session.jsx`                        | Stores draft/submitted profiles and checklist progress; no assessment snapshot.          | Specify the snapshot contract now; wire it in Phase 4.                                             |
| `C:\Users\omen\Desktop\SchemeLog\server\src\domain\validation\validateProfile.js`   | Validates four answer states and typed values, but transitively imports filesystem code. | Extract its pure implementation and preserve a server wrapper.                                     |
| `C:\Users\omen\Desktop\SchemeLog\server\src\domain\validation\validateCatalogue.js` | Combines filesystem schema loading, Ajv and semantic/publication checks.                 | Reuse narrowly extracted rule semantics; keep publication authoritative on the server.             |
| `C:\Users\omen\Desktop\SchemeLog\server\src\data\question-fields.js`                | Declares fields and answer states, but also imports generated real income thresholds.    | Separate pure declarations from catalogue-dependent inputs.                                        |
| `C:\Users\omen\Desktop\SchemeLog\client\src\data\catalogue.json`                    | Version `2026-10-10.1`, zero published schemes.                                          | Expected implementation mode is explicit demo mode.                                                |
| `C:\Users\omen\Desktop\SchemeLog\client\src\repositories\catalogue.js`              | Returns presentation fixtures; lookup currently compares the route value with `id`.      | Phase 4 must separate data loading, slug lookup and assessment.                                    |

Important compatibility details:

1. Current semantic validation requires **at least two** children for `allOf` and `anyOf`. Preserve
   that rule; express one condition as a leaf rather than changing the contract.
2. `eq` and `in` are code comparisons, not numeric comparisons. Income, scores and study year use
   numeric operators. Do not invent numeric `eq` support in the engine.
3. Rule IDs use `r-...`; fictional scheme IDs should use `fx-sch-...`, satisfying both the parent
   plan's `fx-` boundary and the existing schema's identifier pattern.
4. The server currently derives review-due warnings with `< evaluatedAt`, not the required
   due-on-or-before comparison. Shared freshness logic must eliminate that discrepancy.
5. The schema permits some operator-inappropriate properties that semantic validation does not
   currently reject. Phase 3 must reject ambiguous nodes rather than choosing a meaning.
6. An existing client test expects unknown draft keys to be silently discarded. Preserve any
   explicitly named draft-pruning helper only for UI housekeeping; the submission boundary must
   instead reject undeclared input, with a regression test explaining the intentional change.

## 3. Scope, ownership and mode

### 3.1 Phase boundaries

| Phase 3 owns                                    | Phase 4 owns                                         | Phase 5 owns                                |
| ----------------------------------------------- | ---------------------------------------------------- | ------------------------------------------- |
| Pure profile validation and normalization       | Catalogue loading and load-error presentation        | Full production/browser regression evidence |
| Structural rule validation and evaluation       | Active-rule questionnaire fields and income controls | Release notes and artifact checks           |
| Freshness, interval and application semantics   | Submission, stale results and resubmission wiring    | Optional authorized deployment              |
| Assessment and explanation contracts            | Rendering answer/evidence rows                       | Final release-mode gates                    |
| Four declarative demo records                   | Document applicability/progress UI                   | Mobile and end-to-end verification          |
| Unit tests and reusable document-rule evaluator | Safe external actions and direct-route behavior      | Handoff and blocked-gate reporting          |

### 3.2 Explicit mode policy

Create a small mode configuration with `mode: 'demo' | 'reviewed'`. Selection happens outside the
engine and must not depend on whether a failed data load happens to return zero records.

- **Demo:** separate fictional catalogue, `fx-sch-` IDs, fictional evidence, fixed disclosed clock.
- **Reviewed:** generated real catalogue only, genuine review/publication gates, captured session clock.
- Never combine the catalogues. A corrupt reviewed catalogue produces an error, not a demo fallback.
- An empty valid reviewed catalogue remains empty; no assessed records are fabricated.
- Demo records must not become publishable if somebody changes `publicationStatus` to `published`.

Demo disclosure required by Phase 4:

> Interactive prototype. These scholarships are fictional. Your answers drive a demonstration of
> the matching rules; this is not an assessment for a real government scheme.

Use “Try the demo” on landing and a Demo badge on results and direct detail routes. A fixed date
must say “Demo rules evaluated as of 10 October 2026,” not imply today's government deadlines.

## 4. Module design and dependency boundary

Use plain JavaScript ES modules, explicit `.js` imports in pure code, JSDoc and existing libraries.
The following are proposed implementation files, not files created by this design-document task.

| Absolute path                                                               | Responsibility                                                                           |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\eligibility\evaluate.js` | Public scheme/catalogue functions; reusable rule-tree evaluation and status aggregation. |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\eligibility\interval.js` | Interval containment/intersection, including open boundaries.                            |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\eligibility\reasons.js`  | Stable reason codes and short English copy map.                                          |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\freshness.js`            | Injected-time freshness and Asia/Kolkata calendar-date helpers.                          |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\application\status.js`   | Independent application status and date-boundary reasons.                                |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\profile\normalize.js`    | Explicit draft conversion, mapping issues and strict submission result.                  |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\profile\fields.js`       | Single pure source of field declarations, answer states and forbidden fields.            |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\validation\profile.js`   | Extracted canonical profile validator; vocabulary is a required injected input.          |
| `C:\Users\omen\Desktop\SchemeLog\client\src\domain\validation\rules.js`     | Shared operator shapes, field compatibility and rule ID checks.                          |
| `C:\Users\omen\Desktop\SchemeLog\client\src\data\demo-catalogue.js`         | Fictional records and explicit demo metadata; no stored assessment statuses.             |
| `C:\Users\omen\Desktop\SchemeLog\client\src\data\catalogue-mode.js`         | Explicit mode and demo evaluation timestamp.                                             |
| `C:\Users\omen\Desktop\SchemeLog\client\tests\unit\eligibility.test.js`     | Parameterized rule, interval, aggregation and determinism tests.                         |
| `C:\Users\omen\Desktop\SchemeLog\client\tests\unit\normalization.test.js`   | Mapping and validation boundary tests.                                                   |
| `C:\Users\omen\Desktop\SchemeLog\client\tests\unit\application.test.js`     | Application freshness, cycle and date tests.                                             |
| `C:\Users\omen\Desktop\SchemeLog\client\tests\helpers\catalogue.js`         | Compact fixture factory for tests only.                                                  |

Small helpers may stay together if splitting them slows the timebox; do not merge responsibilities
or create circular dependencies. The external function signatures below are the integration boundary.

### 4.1 Shared validation without two implementations

For this small repository, keep the extracted pure core under the client's domain directory and
let server wrappers import it. This avoids adding a workspace package or exposing server tooling
to Vite. It is a deliberate temporary ownership choice, not a second validator.

1. Move field constants into the pure field module. The existing server field module re-exports
   them and retains its generated-threshold wrapper so current server imports keep working.
2. Move the existing profile checks into the pure profile validator. Its vocabulary argument has
   no filesystem default. The server wrapper retains `validateProfile(profile, options = {})` and
   loads vocabularies before delegating.
3. Inject a vocabulary lookup built from the existing checked-in vocabulary JSON. Browser adapters
   may statically import those specific JSON files or use a generated static vocabulary snapshot.
   They must not import the server loader or duplicate vocabulary values by hand.
4. Extract only reusable operator/field semantics from the server catalogue validator. Both real
   and demo validation call these same checks. Server-only review, registry and publication checks
   remain mandatory for real publication.
5. Phase 4 adds the full browser envelope guard. If using generated Ajv standalone validation,
   generate it offline using the already installed server Ajv; do not pull the server validator,
   PDF parser or source scripts into browser assets.

The import graph of domain functions must contain no `node:fs`, `node:path`, React, fetch, storage,
logging, environment reads or current-clock calls. Parsing an injected timestamp is allowed;
calling `Date.now()` or `new Date()` without an argument is not.

## 5. Frozen public contracts

### 5.1 Evaluation context

```js
const context = {
  evaluatedAt: '2026-10-10T12:00:00+05:30',
  catalogueVersion: 'demo-2026-10-10.1',
  engineVersion: '1.0.0',
  mode: 'demo',
  currentCycles: {
    'fx-sch-learning-pathways': '2026-27',
    'fx-sch-next-chapter': '2026-27',
    'fx-sch-new-horizons': '2026-27',
    'fx-sch-future-notice': '2026-27',
  },
};
```

The first three fields are required by the parent plan. `mode` is also required for provenance
isolation. `currentCycles` is explicit optional application policy keyed by scheme ID. Missing
cycle policy produces unknown application status; it does not invalidate eligibility.

Why the extra cycle policy: existing cycle strings are free text and cannot prove that a cycle is
current. Never infer a scholarship cycle from the evaluation year. Reviewed mode must obtain the
mapping from reviewed release metadata, not simply copy `application.cycle` into it at evaluation.
If that prerequisite is unavailable, show unknown application status.

Validate the timestamp as an actual ISO instant with offset or `Z`, not a date-only string. Reject
missing/unsupported engine versions and catalogue-version mismatches. Preserve the supplied
timestamp in the snapshot; all comparisons use its parsed instant. Version changes must accompany
semantic changes or changes to demo test conditions. No random IDs enter domain output.

### 5.2 Entry points and failures

```js
evaluateScheme(profile, scheme, context); // Assessment
evaluateCatalogue(profile, catalogue, context); // Assessment[], sorted
deriveApplicationStatus(application, context); // ApplicationStatus
```

`evaluateCatalogue` takes an envelope with `catalogueVersion` and `schemes`, not the legacy
presentation-fixture array. It validates the profile and all evaluable rule structures before
returning any assessments. `evaluateScheme` also checks its direct-call inputs; callers cannot
bypass malformed-known-answer rejection by avoiding catalogue evaluation.

Use a domain validation error with a stable `code` and sorted `issues[{ path, code, message }]` for
malformed profile, context or rule input. Error messages must not echo profile values. Invalid data
is **not** a valid `unavailable` assessment. Phase 4 catches boundary errors and provides recovery.

The full publication/load guard precedes evaluation; the engine is not a substitute for independent
review. A valid missing fact is unknown. An unknown operator, dangling reference, malformed group,
invalid date or broken envelope is invalid data and must be rejected/quarantined at its boundary.

For a standalone application call, `context.currentCycle` is the expected cycle for that application.
`evaluateScheme` derives this from `context.currentCycles[scheme.id]`. Do not mutate the original
context. Evidence references in the application section must already have been resolved by record
validation; standalone callers supply the same validated input contract.

### 5.3 Assessment shape

```text
Assessment {
  schemeId: string
  schemeVersion: number                 // scheme.recordVersion, not catalogueVersion
  status: potential | verification | unmet | unavailable
  ruleResults: RuleResult[]
  missingFields: string[]                // canonical field paths, unique, sorted
  manualChecks: { ruleId, reason, checkHint, evidence }[]
  dataWarnings: { code, path, ruleId, message }[]
  applicationStatus: ApplicationStatus
  catalogueVersion: string
  engineVersion: string
  evaluatedAt: string
}

RuleResult {
  ruleId: string
  parentRuleId: string | null
  childRuleIds: string[]
  operator: string
  field: string | null
  outcome: pass | fail | unknown
  reasonCode: string
  providedAnswer: Answer | null
  expected: object                      // operator and its typed operands
  evidence: EvidenceView[]
  explanationKey: string
}

ApplicationStatus {
  status: open | upcoming | closed | unknown
  reasonCode: string
  cycle: string
  opens: DateValue | Unknown
  closes: DateValue | Unknown
  evidence: string[]
}
```

All arrays are present, even when empty; use explicit `null`, not inconsistent omitted properties,
for rule fields that do not apply. Group/manual rows have `providedAnswer: null`; absent student
answers on comparison leaves are represented as `{ state: 'not-asked' }`.

`expected` contains only the applicable operand keys: `{ operator, value }` for code comparisons;
numeric comparisons also include unit/scale/context where applicable; `between` retains both
inclusive flags. Group rows identify child IDs; manual rows retain reason and check hint.

Store no checklist progress in this object. Return new output objects; never mutate profile,
catalogue, scheme or context. Keep output JSON-serializable: no Sets, functions, Infinity or Dates.

### 5.4 Rule evaluator reused by document applicability

Expose `evaluateRule(profile, rule, options)` returning `{ outcome, ruleResults }`. Options contain
the injected context, inherited freshness and an evidence resolver from the validated record.
Use the same operator implementation for eligibility and `documents[].appliesWhen`.

Do not let the rule evaluator read document checkmarks. Phase 4 maps pass/fail/unknown to required,
not applicable, or may be required. A document with no condition is not an empty `allOf`: its
`requirement` metadata determines confirmed versus needs-verification behavior.

## 6. Canonical profile and submission boundary

### 6.1 Answer and value shapes

Preserve profile version `1` and the existing server contract:

```js
const referenceProfile = {
  profileVersion: 1,
  educationLevel: { state: 'known', value: 'undergraduate' },
  annualHouseholdIncome: {
    state: 'known',
    value: {
      min: 0,
      max: 250000,
      minInclusive: true,
      maxInclusive: true,
      currency: 'INR',
      period: 'year',
    },
  },
};
```

Other valid envelopes are exactly `{ state: 'unsure' }`, `{ state: 'declined' }` and
`{ state: 'not-asked' }`. They cannot contain `value`. A known envelope must contain a valid value.

Supported canonical fields are `domicileState`, `educationLevel`, `courseCode`, `studyYear`,
`annualHouseholdIncome`, `academicScore`, `category`, `institutionType` and the declared entries
under `additionalAnswers`. Use the existing declarations; arbitrary nested fields are not allowed.

- School year: `{ stage: 'class-10' }`, no duration.
- Course year: `{ stage: 2, of: 4 }`, positive integers, stage no greater than duration.
- Score: `{ value: 80, scale: 'percentage', context: 'class-12-board' }`.
- Income: nonempty interval, finite nonnegative minimum, finite maximum or `null`, explicit flags,
  `INR` and `year`. An unbounded maximum uses `maxInclusive: false`.

The shared validator should tighten the existing open-maximum check to enforce that canonical
flag. Non-finite values, empty intervals, invalid codes and undeclared properties are errors.
Support only profile version 1 until another version has explicit semantics.

### 6.2 Normalization interface

```text
normalizeProfile(draft, { askedFields, incomeBands, vocab }) ->
  { ok: true, profile, mappingIssues[] }
  | { ok: false, errors[] }
```

`askedFields` lists draft fields actually presented; it is questionnaire state, not a guess based
on truthiness. The adapter first validates all incoming keys against its explicit draft allowlist,
then validates supplied values, then maps known values and invokes the shared profile validator.
Do not remove undeclared sensitive keys before validation and claim the original input was valid.

| Draft input                                      | Canonical behavior                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `unknown`                                        | `unsure`                                                                             |
| `declined`                                       | `declined`                                                                           |
| Not presented                                    | `not-asked`; hidden stale dependent values are cleared by the draft reducer          |
| Presented but blank                              | `unsure`; blank numeric input never becomes zero                                     |
| Exact state label such as Assam                  | Vocabulary lookup to `IN-AS`                                                         |
| Education `diploma`                              | `diploma-technical`                                                                  |
| Broad stream such as Science                     | `courseCode: unsure`, plus an ambiguity mapping issue; never infer a specific degree |
| Government / Government-aided                    | `govt` / `govt-aided`                                                                |
| Private                                          | `private-other`; never `private-recognised`; label retains “recognition unknown”     |
| School “Class 10”                                | `{ stage: 'class-10' }`                                                              |
| Course “Year 2” without duration                 | `studyYear: unsure`, with a missing-duration mapping issue                           |
| Percentage without exam context                  | `academicScore: unsure`, with a missing-context mapping issue                        |
| Generic CGPA without a scale                     | `academicScore: unsure`; never convert or assume CGPA-10                             |
| Active-mode income band ID                       | Copy its explicit interval; reject unknown band IDs                                  |
| Unknown option, invalid number or undeclared key | Validation error, not a downgrade to unsure                                          |

Mapping issues are `{ field, code, message }` and accompany the normalized profile in memory. They
are not extra properties inside the profile schema. Distinguish valid but ambiguous legacy labels
from malformed typed known values: the former need clarification; the latter are rejected.

Preserve drafts separately for editing. The old filtering helper must not serve as the submission
validator. Phase 4 replaces its call sites deliberately and updates the old test without deleting
privacy or unknown-state protections.

### 6.3 Active-rule field collection handoff

Phase 4 collects the union of fields in eligibility trees and document conditions. Include every
branch, even currently failing or unknown alternatives; do not prune a scheme because an answer
is unknown. Companion controls such as score context and course duration follow from field shape.

Derive income thresholds from the selected mode, including document conditions. The current server
threshold collector visits eligibility only, so it is not yet sufficient for this UI contract.
No income rule means no income question. Simple non-overlapping bands may use `[0,t1]`, `(t1,t2]`,
and `(t2,+infinity)`; strict thresholds at an inclusive upper edge can still yield honest unknowns.
Handle a zero threshold explicitly: a `[0,0]` band and `(0,+infinity)` preserve zero without gaps.
An exact-income follow-up is not required and must not be pressured.

## 7. Rule validation and evaluation

### 7.1 Closed operator contract

Validate the whole tree before evaluating it, including branches whose results are not needed for
the final outcome. A passing alternative must not hide an invalid sibling operator.

| Operator                 | Required operands                                              | Semantics                                                              |
| ------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `eq`                     | Declared code field, one valid code in `value`                 | Exact code equality; no label matching or coercion.                    |
| `in`                     | Declared code field, nonempty valid-code array in `value`      | Membership in the declared set.                                        |
| `lt`, `lte`, `gt`, `gte` | Numeric field, finite numeric `value`                          | Typed scalar comparison or interval comparison.                        |
| `between`                | Numeric field, finite `min` and `max`, both inclusion booleans | Membership in the specified interval. Reject reversed or empty bounds. |
| `allOf`                  | `children`, at least two nodes                                 | Any fail means fail; all pass means pass; otherwise unknown.           |
| `anyOf`                  | `children`, at least two nodes                                 | Any pass means pass; all fail means fail; otherwise unknown.           |
| `not`                    | Exactly one `child`                                            | Invert pass/fail; preserve unknown.                                    |
| `manualVerification`     | Nonempty `reason` and `checkHint`                              | Always unknown, regardless of supplied answers or checklist state.     |

Reject unknown operators, undeclared fields, duplicate rule IDs across eligibility and document
trees, unexpected operands, `children` on a leaf, `child` on a group, and field/value operands on
manual nodes. Common metadata such as evidence, explanation key, material and freshness remain
allowed. No `eval`, dynamic function construction or arbitrary property-path evaluation.

Numeric field compatibility:

- Income rules require `unit: 'INR/year'`.
- Academic score rules require valid `scale` and `context`; compare only when both match the answer.
- Study-year rules need an explicit dimension. Adopt `unit: 'course-year'` for integer course
  stages and `unit: 'school-class'` for parsed `class-N` values. This is a **new semantic constraint**
  on the existing string `unit` property, not an assertion that existing records already declare it.
  A valid answer in the other dimension yields `study_context_mismatch`, not a numerical guess.
  Tighten the shared semantic validator accordingly; do not silently repair real drafts. Reduced
  demo records do not need study-year rules, so any draft migration can remain a reported prerequisite.

The canonical profile currently supports only annual INR income. Another currency/period is a
profile validation error, not a valid assessment input. A defensive typed-comparison helper may
return unknown for incompatible units, but the public boundary must not accept malformed known
answers. Valid score and study dimensions can differ from a rule and legitimately produce unknown.

### 7.2 Three-valued truth tables

`P` = pass, `F` = fail, `U` = unknown. Binary tables extend by the same rules to larger groups.

| A   | B   | allOf(A,B) | anyOf(A,B) |
| --- | --- | ---------- | ---------- |
| P   | P   | P          | P          |
| P   | F   | F          | P          |
| P   | U   | U          | P          |
| F   | P   | F          | P          |
| F   | F   | F          | F          |
| F   | U   | F          | U          |
| U   | P   | U          | P          |
| U   | F   | F          | U          |
| U   | U   | U          | U          |

| A   | not(A) |
| --- | ------ |
| P   | F      |
| F   | P      |
| U   | U      |

Evaluate every node for explanations, even if a group outcome is already determined. Emit one row
per node in deterministic depth-first pre-order, preserving catalogue child order. Preserve parent
and child IDs so the UI need not flatten alternatives into misleading mandatory requirements.

### 7.3 Evaluation sequence

1. Validate input shapes, mode, profile, identifiers and evidence references.
2. Establish effective inherited freshness for the section and each rule node.
3. Evaluate children/leaf comparisons without mutating any input.
4. Apply freshness trust: an explicitly stale group is unknown as a whole, and its descendants
   inherit that staleness. A fresh child cannot override a stale ancestor.
5. Aggregate fresh groups using the tables above. Do not apply JavaScript Boolean truthiness.
6. Build structured explanations and actionable uncertainty lists.
7. Map the root result and coverage to a presentation status.
8. Derive application status separately and attach versions/time.

Every eligibility-tree node is treated conservatively as assessment-relevant in this reduced
engine. `material: false` does not exempt a predicate from freshness checks or cause it to be
ignored. Truly informational statements belong outside the eligibility tree. Missing `material`
does not mean unimportant.

## 8. Income intervals: exact semantics

Let `I` be the nonempty set of possible incomes represented by the student's selected interval.
Let `S` be the set satisfying the rule, restricted to the valid income domain `[0,+infinity)`.

```text
if I is a subset of S:       pass
else if I intersects S:      unknown (income_overlap)
else:                       fail
```

This definition applies uniformly to `lt`, `lte`, `gt`, `gte` and `between`. Never substitute the
band's lower bound, upper bound or midpoint as the student's income.

### 8.1 Boundary implementation

- Interpret `max: null` as positive infinity only inside the calculation; keep `null` in output.
- Equal endpoints overlap only when both intervals include that endpoint.
- A subset may share an endpoint with the satisfying interval only if it does not include a point
  excluded by that interval.
- Equal finite minimum and maximum are valid only if both are inclusive: an exact point interval.
- Use direct finite-number comparisons; do not use arbitrary epsilon, rounding or integer-rupee
  assumptions to turn a boundary into certainty.

For two finite adjacent ends, intervals are disjoint when `left.max < right.min`, or when the ends
are equal and at least one touching bound is exclusive. Use the symmetric check as well. A small
containment/intersection helper is less error-prone than duplicating every threshold formula.

### 8.2 Required examples

| Student interval I, INR/year | Rule                      | Outcome | Why                                                |
| ---------------------------- | ------------------------- | ------- | -------------------------------------------------- |
| `[0,250000]`                 | `lte 250000`              | pass    | Every possible value meets the inclusive limit.    |
| `[0,250000]`                 | `lt 250000`               | unknown | The included endpoint fails, lower values pass.    |
| `[0,250000)`                 | `lt 250000`               | pass    | The excluded endpoint cannot occur.                |
| `[250000,250000]`            | `lte 250000`              | pass    | Exact equality is allowed.                         |
| `[250000,250000]`            | `lt 250000`               | fail    | Exact equality is excluded.                        |
| `(250000,+infinity)`         | `lte 250000`              | fail    | All possible incomes are above the limit.          |
| `[200000,300000]`            | `lte 250000`              | unknown | The band crosses the threshold.                    |
| `[250000,+infinity)`         | `gte 250000`              | pass    | Every possible income meets the minimum.           |
| `[250000,+infinity)`         | `gt 250000`               | unknown | Equality is possible and fails the strict minimum. |
| `[100000,200000]`            | `between [100000,200000]` | pass    | Entire interval is contained.                      |
| `[100000,200000]`            | `between (100000,200000)` | unknown | Interior passes, included endpoints fail.          |
| `[0,100000]`                 | `between (100000,200000]` | fail    | No permitted intersection.                         |
| `[0,+infinity)`              | `lte 250000`              | unknown | Finite maximum eligibility cannot be established.  |

Student-facing overlap copy:

> Your selected range crosses the limit. Clarify your income range or check the official requirement.

For demo results, replace the final phrase with “check the fictional test condition.” Neither copy
requires disclosure of an exact income.

## 9. Freshness, evidence and coverage

### 9.1 Injected date and due-today policy

Derive the local date from `context.evaluatedAt` using `Asia/Kolkata`, never the machine's locale or
UTC date substring. A standard `Intl.DateTimeFormat` with explicit time zone and `formatToParts`
is sufficient; assemble `YYYY-MM-DD` from the parts. No date library is required.

Effective freshness is untrusted when:

- Its explicit state is `unknown`, `review-due` or `superseded`.
- Its `reviewDue` date is **on or before** the evaluation date in Asia/Kolkata.
- An ancestor section/group is untrusted.
- Necessary evidence is explicitly absent/unconfirmed for an otherwise valid fact.

An omitted leaf freshness inherits the parent. An explicitly current leaf cannot upgrade an
untrusted parent. A section must have its required freshness metadata; an invalid/missing required
object is a validation error. Future `checkedAt` dates cannot prove current knowledge and should
be flagged untrusted; malformed dates are rejected. Preserve all warnings even when a trusted
failure elsewhere establishes `unmet`.

Boundary example for `reviewDue: '2026-10-10'`:

- `2026-10-09T18:29:59Z` is 9 October locally: not yet due.
- `2026-10-09T18:30:00Z` is 10 October locally: due and therefore unknown.

The same helper should drive server review-due diagnostics after extraction. Keep the existing
conservative whole-record withholding for changed source hashes; do not substitute optimistic
per-rule evaluation for the publication gate.

### 9.2 Evidence projection

Resolve existing `src-...` and `src-...#loc-...` references against the validated scheme. Real
`EvidenceView` objects contain `kind: 'reviewed-source'`, reference, title, authority, locator text
or null, URL and effective freshness. A URL's presence does not itself authorize an external action;
Phase 4 still applies verified-destination filtering.

Demo evidence uses `kind: 'fictional-test-condition'`, a stable fictional reference, descriptive
requirement text, `url: null`, and the label **Fictional test condition**. Do not cite an actual
ministry or scholarship page as support for an invented condition. “Assumed current for this demo”
must be distinguishable from independently reviewed freshness.

Resolve provenance through the selected mode's explicit adapter, not merely by trusting a string
prefix. Real mode rejects fictional evidence, and demo validation requires fictional provenance.
Never inherit unrelated evidence from a neighbouring leaf. Section/group evidence may be shown as
context, but it does not silently replace a missing material leaf citation.

### 9.3 Scheme status decision table

Apply this precedence exactly:

| Condition                                       | Status         |
| ----------------------------------------------- | -------------- |
| Valid `coverage: 'unusable'` with no rule tree  | `unavailable`  |
| Usable coverage and trusted root outcome `fail` | `unmet`        |
| Root unknown, or coverage partial               | `verification` |
| Coverage complete and trusted root pass         | `potential`    |

Thus partial coverage plus a known mandatory failure is `unmet`; partial coverage plus a pass is
still `verification`. Complete coverage with a manual requirement is `verification`. A failed
alternative inside a passing `anyOf` is not a trusted root failure.

A stale alternative does not defeat a separate current passing alternative in an otherwise current
`anyOf`: the successful branch proves that group. Retain the stale-branch warning. A stale group
or section, however, makes the group itself unknown because its structure is unconfirmed.

### 9.4 Deterministic presentation order

Return assessments ordered by:

1. Status: `potential`, `verification`, `unmet`, `unavailable`.
2. `officialName` normalized to Unicode NFC, using explicit lexical code-unit comparison.
3. Stable scheme ID using the same comparison.

This order matches the existing UI group order, not the failure-precedence table. Avoid default
locale-dependent `localeCompare` for the engine's cross-environment ordering contract. Phase 4 may
format names, but must not insert an opaque relevance score. Sort copies, never the input catalogue.

## 10. Explanations and actionable uncertainty

### 10.1 Minimal stable reason vocabulary

| Reason code                                                                      | Meaning / suggested copy                                                          |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `condition_met`                                                                  | Your answer meets this test condition.                                            |
| `condition_not_met`                                                              | Your answer does not meet this condition.                                         |
| `answer_unsure`                                                                  | You marked this answer as unsure.                                                 |
| `answer_declined`                                                                | You chose not to provide this answer.                                             |
| `answer_not_asked`                                                               | This information has not been collected.                                          |
| `income_overlap`                                                                 | Your selected range crosses the limit.                                            |
| `score_scale_mismatch`                                                           | Your score uses a different scale; it has not been converted.                     |
| `score_context_mismatch`                                                         | This rule refers to a different examination.                                      |
| `study_context_mismatch`                                                         | This rule refers to a different kind of study stage.                              |
| `unit_mismatch`                                                                  | The quantities cannot be compared in the supplied units.                          |
| `manual_verification`                                                            | This condition needs a separate check.                                            |
| `fact_unknown`, `fact_review_due`, `fact_superseded`                             | This requirement is not confirmed as current.                                     |
| `evidence_unconfirmed`                                                           | Supporting information is not confirmed.                                          |
| `all_conditions_met`, `mandatory_condition_failed`, `conditions_unresolved`      | Aggregate conjunction explanation.                                                |
| `alternative_met`, `all_alternatives_failed`, `alternatives_unresolved`          | Aggregate alternative explanation.                                                |
| `negated_condition_met`, `negated_condition_failed`, `negated_condition_unknown` | Explain the exclusion/negation result without reversing its wording accidentally. |

Choose primary leaf reasons in a fixed order: untrusted fact, manual check, unknown answer,
incompatible dimension, then comparison result. Keep secondary source warnings in `dataWarnings`.
Do not emit contradictory “answer meets condition” text for an untrusted pass calculation.

The copy map is a small deterministic formatter, not an LLM or a sentence-generation framework.
Render user/catalogue text as plain text, never HTML. Format field labels and canonical codes from
vocabulary data, and retain the actual canonical answer in the in-memory explanation snapshot.

### 10.2 Group-aware explanation example

Requirement: undergraduate **or** postgraduate study. Answer: undergraduate.

```text
Any one study-level condition — PASS: an alternative is satisfied
  Undergraduate — PASS: your answer is undergraduate
  Postgraduate  — FAIL: your answer is undergraduate
                 This alternative is not required because another alternative passed.
```

Do not show the second row as an unmet mandatory scheme requirement. For `not`, display the child
inside its exclusion context: a passing negation can contain a failing child and is not contradictory.

### 10.3 Action list policy

Keep all evaluated rows for transparency, but collect top-level uncertainty actions only through
unknown nodes that contribute to an **unknown root**:

- In unknown `allOf`, traverse its unknown children.
- In unknown `anyOf`, traverse its unknown children; its failed alternatives remain explanation rows.
- In unknown `not`, traverse its unknown child.
- At an uncertain answer/comparability leaf, add the canonical field to `missingFields`.
- At a manual leaf, add its reason, hint and evidence to `manualChecks`.
- Source/freshness uncertainty creates a data warning, not a demand for more student information.

If the root is pass or fail, leave the top-level missing/manual action arrays empty; unresolved rows
can still be expanded as contextual checks. This avoids claiming that supplying an unrelated answer
will fix an already established failure, or demanding a check for an unused passing alternative.
Deduplicate fields, sort field paths, retain manual checks in rule order and sort warnings by path
then code. Partial coverage can require verification with no missing fields: explain the data gap.

Edit actions return to the existing review flow. Source/manual actions say what to verify, not
“upload a certificate to become eligible.” A declined answer remains declined until the student
explicitly changes it; do not re-prompt aggressively.

## 11. Application status, separate from eligibility

`deriveApplicationStatus` must not read student answers or change assessment status. A potentially
matching scheme may be closed, and a potentially matching scheme may have an unknown deadline.

### 11.1 Trust prerequisites

Use dates/notices only when all of the following hold:

1. Application section freshness is current under the same injected date rules.
2. `context.currentCycle` exists and exactly matches `application.cycle`.
3. Each endpoint's explicit cycle, when supplied, matches the section; omitted endpoint cycles
   inherit that section. A mismatch produces unknown with a cycle warning.
4. Relevant date/notice evidence is valid and current; checked dates are not in the future.
5. Date-time endpoints carry an explicit offset or `Z`. Date-only endpoints use an explicit
   supported timezone; for this reduced implementation support `Asia/Kolkata` and return unknown
   for absent/unsupported date-only timezone metadata rather than guessing.

The existing schema has no notice validity interval. As a conservative reduced policy, a
`statusOverride` alone establishes open/closed only when it was checked on the injected local date,
is backed by a current-cycle notice, and the application section is current. A broader notice
validity policy requires a future explicit contract change. Demo notices are fictional test inputs.

### 11.2 Endpoint decision rules

Interpret a datetime as an exact boundary and a date-only endpoint as a calendar day with unknown
time within that day. Do not convert a closing date into 23:59:59 or display a countdown.

| Evidence relative to evaluation time                            | Status     |
| --------------------------------------------------------------- | ---------- |
| Definitely before a trusted opening                             | `upcoming` |
| Definitely after a trusted closing                              | `closed`   |
| Definitely after opening and before closing, both trusted       | `open`     |
| On a date-only opening or closing day without a decisive notice | `unknown`  |
| Only opening is known and it has already passed                 | `unknown`  |
| Only closing is known and it is still in the future             | `unknown`  |
| No compatible endpoints or current notice                       | `unknown`  |

For exact datetimes use a half-open application window `[opens, closes)`: equality with opening is
open if the closing bound is known and later; equality with closing is closed. This engine policy
must be documented in tests and used only when the source actually supplies an exact instant.
For date-only values, “before” and “after” compare calendar dates in the endpoint's supported zone;
the opening/closing day itself is ambiguous unless an evidenced notice resolves it.

A valid notice may resolve endpoint ambiguity or missing endpoints. If a notice contradicts a
definite endpoint-based status, return unknown with `application_evidence_conflict`; do not assume
the notice supersedes the dates. Invalid/reversed endpoint data belongs in validation/quarantine.

Recommended status reason codes: `application_open`, `application_upcoming`, `application_closed`,
`application_dates_unknown`, `application_boundary_ambiguous`, `application_cycle_unknown`,
`application_cycle_mismatch`, `application_stale`, `application_notice_current`,
`application_timezone_unknown`, and `application_evidence_conflict`.

Application freshness, benefit freshness and eligibility freshness are separate. Never withhold a
trusted eligibility result solely because an amount or deadline is unknown.

## 12. Fictional catalogue and worked journey

### 12.1 Separate demo validation entry point

Create `validateDemoCatalogue(catalogue, { vocab })` alongside the demo data adapter. It calls the
shared rule/profile-shape helpers, but it is not an option that disables review checks inside the
real publication validator.

The demo envelope contains `mode: 'demo'`, a demo-prefixed catalogue version, a fixed evaluation
timestamp, coverage disclosure, and `schemes`. Each demo record contains the engine-consumed
fields `id`, `slug`, `officialName`, `recordVersion`, `eligibility`, `application` and `documents`,
plus safe fictional presentation metadata. It also contains:

```text
fictional: true
publicationStatus: draft
testConditions: [{ id, label: 'Fictional test condition', text }]
links: []
sources: []
```

Rules use the existing declarative node structure and reference stable test-condition IDs with
the existing evidence-reference syntax, such as `src-demo-income#loc-limit`. The demo resolver
resolves them against `testConditions`, not real `sources`. There is no fabricated `verification`
person or claim of human review. Demo freshness uses the existing state/date shape, with
`checkedBy: 'fictional-test-fixture'` and explicit assumed-current disclosure, never a real reviewer.

This deliberately separate envelope/record contract is **not** a published real SchemeRecord.
Shared evaluation sees the common assessment fields through the explicit selected-mode adapter.
The demo guard additionally requires fictional evidence, no official application actions, unique
IDs/slugs, complete rule validation and consistent coverage. It rejects real records mixed into the
demo envelope. Real publication validation must reject the demo records, including a test that
attempts to change their status to published. Do not relax real schema requirements for sources,
links or human review to accommodate this format.

For all four fixtures, use record version 1 and assumed-current eligibility checked on 10 October
2026 with review due after the fixed demo date. Use synthetic current-cycle dates only in targeted
tests; the UI fixtures may keep all application dates unknown.

### 12.2 Four schemes and one reference profile

The reference profile from section 6 supplies undergraduate study and income `[0,250000]` INR/year.
No category, domicile or score is needed by these four UI fixtures. Keep those sensitive/unneeded
questions out of the reduced demo questionnaire. Additional operators still receive unit tests.

| Scheme ID / official name                                       | Coverage and rule tree                                                                                                                 | Reference outcome |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `fx-sch-learning-pathways` / Learning Pathways Demo Scholarship | Complete: `allOf(educationLevel eq undergraduate, income lte 250000 INR/year)`                                                         | `potential`       |
| `fx-sch-next-chapter` / Next Chapter Demo Grant                 | Complete: `allOf(anyOf(educationLevel eq undergraduate, educationLevel eq postgraduate), manualVerification(institution recognition))` | `verification`    |
| `fx-sch-new-horizons` / New Horizons Demo Award                 | Complete: `allOf(educationLevel eq school, income lte 100000 INR/year)`                                                                | `unmet`           |
| `fx-sch-future-notice` / Future Notice Demo Scholarship         | Unusable: `rule: null`, notes explicitly say conditions are unavailable                                                                | `unavailable`     |

New Horizons deliberately demonstrates a trusted education failure alongside income overlap:
`allOf(fail, unknown)` is fail. Next Chapter demonstrates a successful study-level alternative and
an unresolved manual condition. These are calculated results, not stored fixture status fields.

For Learning Pathways, add a fictional conditional preparation item with an `appliesWhen` income
rule such as `lte 100000 INR/year`, with its own unique rule ID and fictional evidence. Its
applicability is unknown for the reference profile, pass for `[0,100000]`, and fail for
`(100000,250000]`. Preparing that item never changes the scholarship assessment.

### 12.3 Expected answer-driven changes

| Change from reference profile         | Learning Pathways | Next Chapter | New Horizons | Future Notice |
| ------------------------------------- | ----------------- | ------------ | ------------ | ------------- |
| None                                  | potential         | verification | unmet        | unavailable   |
| Income declined                       | verification      | verification | unmet        | unavailable   |
| Income `(250000,+infinity)`           | unmet             | verification | unmet        | unavailable   |
| Education school, income `[0,100000]` | unmet             | unmet        | potential    | unavailable   |
| Education unsure, reference income    | verification      | verification | verification | unavailable   |

These expectations form integration fixtures for Phase 4. The `unavailable` record cannot become
assessable merely by changing answers. Avoid a fake “all categories always represented” guarantee:
the reference profile shows all four, but another profile is allowed to change group counts.

### 12.4 Worked single-rule trace

For Learning Pathways income with a declined answer:

```text
ruleId: r-learning-income
operator: lte
field: annualHouseholdIncome
providedAnswer: { state: declined }
expected: { operator: lte, value: 250000, unit: INR/year }
outcome: unknown
reasonCode: answer_declined
evidence label: Fictional test condition
evidence text: Annual household income is at most INR 250000 for this fictional example.
```

The education leaf passes, the root is unknown, coverage is complete, and the assessment becomes
`verification`. `missingFields` contains `annualHouseholdIncome`; the application status remains
independent and unknown. With `[0,250000]`, the same income rule passes and the scheme is potential.

## 13. Phase 4 handoff contract

### 13.1 Submission and editing

The intended sequence is:

```text
Select mode explicitly
  -> load and guard that mode's catalogue
  -> derive required field union and companion controls
  -> collect draft answers in memory
  -> normalize and validate on submission
  -> capture one evaluation context
  -> evaluate catalogue once
  -> store normalized profile, mapping issues, catalogue snapshot and assessments together
  -> render existing results/details from the same snapshot
```

Suggested session fields are `draftProfile`, `submittedProfile`, `submittedDraft`,
`assessmentSnapshot: { context, assessments, catalogueVersion }`, and `checklistProgress`.
Keep the selected catalogue's record versions available with the session so details never combine
an old assessment with a new rule tree.

- Capture the real timestamp in the submit handler outside the reducer/domain functions. Demo
  mode injects the fixed timestamp from configuration.
- Draft edits mark the prior assessment stale. Compare draft state or explicit edit revisions,
  not only normalized output: two different ambiguous drafts can both normalize to unsure.
- Validation failure does not replace a previous successful snapshot. Keep it visibly stale.
- Successful resubmission atomically replaces profile, assessments and context, then clears stale.
- Do not call the engine on every render, card expansion or route change.
- A direct detail route without a submitted profile shows public information with no personal
  status claim; it still displays the selected mode badge.
- Unknown slugs retain the not-found recovery route. Slug lookup must use `slug`, not assume `id`.

### 13.2 Preparation state

Checklist keys are `schemeId:recordVersion:documentId`. A record-version change does not inherit
checkmarks. Recompute applicability using the new submitted profile; keep preparation progress
independent from eligibility and exclude inapplicable items from the completed-applicable count.
Unknown applicability stays “May be required — check this condition,” not a confirmed requirement.

Documents currently have no section-level freshness field. For conditional document rules, use
eligibility-section freshness conservatively as the inherited record context, plus any explicit
rule freshness; a later dedicated document freshness model is outside this timebox. Never use
application deadline freshness to establish document applicability. Reviewed publication checks
still govern the documentary evidence itself.

Use “You marked 2 preparation tasks as done,” never “100% eligible” or “application complete.”
Refresh/reset clears all personal state. Do not persist profile, explanation answers or checklist
progress in storage, URLs, logs, analytics or network requests.

### 13.3 UI copy and trust boundaries

Count `potential` separately from total records. A group title is not a guarantee of eligibility.
Show the exact coverage limitations and a useful next action for unknown results. Phase 4 renders
safe real evidence links only when verified and HTTPS, with no profile parameters and
`rel="noopener noreferrer"` for new tabs. Demo evidence is non-navigable; optional discovery links
must be labelled general resources and must not resemble fictional application links.

The repository returns data, not personal assessments. The engine returns assessments, not JSX,
routes, links with attached personal parameters, or checklist progress. This boundary must survive
integration even if existing card props require a small view-model adapter.

## 14. Test plan

Use `node:test` and `node:assert/strict`, matching the existing project. Put client test files in
`C:\Users\omen\Desktop\SchemeLog\client\tests\unit` with `.test.js` extensions so the existing
test glob runs them. Server parity/publication tests remain under
`C:\Users\omen\Desktop\SchemeLog\server\tests` with `.test.mjs` extensions.

Use a compact fixture factory for a valid minimal scheme/profile/context, then override only the
case being tested. Do not duplicate production engine calculations in expected-value helpers.
Freeze inputs recursively for immutability tests. Synthetic reviewed test records are test inputs,
not genuine human approval and must never be exported to a release catalogue.

### 14.1 Mandatory parameterized matrix

| Area                       | Required assertions                                                                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status aggregation         | All four statuses; complete pass; partial pass; partial fail; complete unknown; unusable; trusted fail plus unrelated unknown.                                                     |
| Answer states              | Known pass/fail, unsure, declined, not-asked and omitted field; unknown envelopes cannot carry values.                                                                             |
| Profile boundary           | Reject missing known values, undeclared/sensitive keys, invalid codes, wrong types, invalid versions, NaN/Infinity, bad interval flags and malformed nested values.                |
| Normalization              | Diploma/state mapping; blank is not zero; ambiguous course/context/duration stays unknown with a mapping issue; private never means recognized.                                    |
| Code operators             | `eq`, `in`, valid additional-answer codes; no coercion; numeric fields reject code operators.                                                                                      |
| Groups                     | All nine binary rows for both groups, all three negations, nesting, more than two children, empty/single-child group rejection and missing/extra `not` operands.                   |
| Whole-tree validation      | Unknown operator in an unused alternative still rejects; duplicate IDs, undeclared fields, inappropriate operands and dangling evidence do not disappear through short-circuiting. |
| Numeric comparisons        | Below/equal/above for `lt`, `lte`, `gt`, `gte`; inclusive/exclusive `between`; score ranges and study dimensions.                                                                  |
| Income                     | Every section 8 example; zero, exact-point intervals, unbounded maximum, touching exclusive endpoints, invalid empty/reversed intervals.                                           |
| Incompatibility            | Percentage versus percentile, CGPA-10 versus CGPA-4, exam-context mismatch, school versus course year; no silent conversion.                                                       |
| Manual check               | Always unknown; reason/hint retained; preparation state cannot affect evaluation.                                                                                                  |
| Freshness                  | Current leaf; stale leaf; absent leaf inherits; stale parent overrides current child; superseded and unknown; due yesterday/today/tomorrow.                                        |
| Timezone                   | The exact 18:30Z Asia/Kolkata day transition; machine timezone does not affect results; invalid timestamp rejected.                                                                |
| Alternative explanations   | Passing alternative with failed/unknown sibling remains pass; parent-child relation preserved; unused manual checks do not become required top-level actions.                      |
| Evidence and coverage      | Fictional evidence has no official URL; real/demonstration provenance cannot mix; partial coverage cannot produce potential; missing evidence cannot produce trusted certainty.    |
| Application dates          | Open/upcoming/closed/unknown; exact opening/closing instants; date-only boundary unknown; no invented countdown; one-sided endpoints.                                              |
| Application cycles/notices | Missing policy, old/mismatched cycle, stale section, current checked notice, expired notice policy, unsupported timezone and conflicting evidence.                                 |
| Independence               | Eligibility potential with closed or unknown application; stale benefit does not alter eligibility; checklist changes do not alter output.                                         |
| Determinism                | Repeat deep equality and JSON output, reversed input scheme order, official-name ordering, stable ID ties, immutable inputs and matching version stamps.                           |
| Mode/publication           | Demo IDs rejected from real publication, even if changed to published; separate demo validator rejects mixed mode; empty reviewed catalogue returns no assessments.                |
| Shared validator parity    | Client pure validator and server wrapper return identical findings for the same profile/vocabulary corpus.                                                                         |

### 14.2 Useful invariants beyond examples

- `not(not(x))` preserves the outcome for pass/fail/unknown.
- A passing `anyOf` remains passing when another valid alternative is unknown, provided the group
  itself is current. A failing `allOf` remains failing under an unrelated valid unknown child.
- Narrowing an income interval that already passes a fixed trusted rule cannot make it fail.
- Replacing a trusted leaf with unknown cannot create a new trusted pass/fail for that leaf.
- Evaluating a frozen profile/catalogue never changes input serialization.
- All returned rule IDs resolve to the input tree; all used evidence resolves in the selected mode.

Enumerate small fixed cases; do not introduce a property-testing dependency for this timebox.

### 14.3 Commands for implementation verification

Run from `C:\Users\omen\Desktop\SchemeLog`:

```powershell
Set-Location 'C:\Users\omen\Desktop\SchemeLog'
npm run setup
npm test
npm run validate:catalogue
npm run validate:registry
npm run build
npm run format:check
```

`npm run setup` is a prerequisite only when nested dependencies are absent. A fresh environment
first runs `npm ci` at the root, then setup. Do not add dependencies just to make this design work.
The production build must show that importing the new engine does not pull server filesystem or
source-fetching code into the client. Where a new module is not yet wired to the entry point, a
successful existing build alone does not prove its browser compatibility; use a focused import
smoke check or temporary build entry without committing test-only application wiring.

Phase 4/5 additionally run `npm run test:e2e` for answer-change, uncertainty and preparation journeys
at desktop and 360px widths. If Chromium is absent, the existing setup command is
`npm exec --prefix client -- playwright install chromium`. Report installation/browser failures
honestly; a build is not browser evidence.

## 15. Implementation sequence and timebox

This elaborates the parent's minutes 05–30 budget; it is a prioritization and stop rule, not a
guarantee that every verification prerequisite can be satisfied in 25 minutes.

| Overall elapsed time | Work                                                                                              | Exit evidence                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 00–05                | Inspect baseline, install existing dependencies if needed, select explicit mode, agree contracts. | Mode and baseline limitations recorded.                        |
| 05–10                | Extract pure profile/field/rule checks; add strict normalization and parity cases.                | Browser-safe import boundary; malformed known values rejected. |
| 10–18                | Implement interval comparison, rule recursion, freshness and aggregation with table-driven tests. | Core truth tables, boundary and stale-fact cases pass.         |
| 18–23                | Add structured reasons, independent application status and deterministic ordering.                | Reproducible assessments; date/cycle cases pass.               |
| 23–27                | Add four declarative demo records and reference-profile scenarios.                                | Four computed categories and genuine answer-change cases.      |
| 27–30                | Run checks, review integration contract, freeze signatures and report gaps.                       | Phase 4 receives actual working surface and actual blockers.   |

Use at most two implementation owners across the overall build: domain/tests and UI/adapters. The
domain owner controls extraction, engine and core tests; the UI owner consumes frozen contracts and
does not independently reimplement validation. Agree ownership of shared files before parallel edits.

If behind, reduce demo fields, decorative explanation prose and module splitting—not truth tables,
validation, uncertainty or privacy. An unsupported rule remains rejected. If a core gate is still
failing at the checkpoint, mark Phase 3 incomplete and identify the integration blocker; do not
return prewritten statuses through the new API to imitate completion.

## 16. Risks and decisions register

| Risk / ambiguity                                                | Decision and containment                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Server imports accidentally enter browser assets                | Pure extraction, explicit static inputs, import smoke test and built-asset inspection.                        |
| Separate validators drift                                       | One pure profile/rule implementation, server wrapper, shared parity corpus.                                   |
| Legacy UI strips sensitive keys                                 | Strict validation before mapping; retain draft pruning only as explicitly nonvalidating housekeeping.         |
| Flat explanations imply every alternative is mandatory          | Preserve tree IDs and group rows; contextualize failed alternatives and negations.                            |
| Income threshold equality overclaims certainty                  | Interval subset/intersection semantics and inclusive/exclusive matrix.                                        |
| Freshness clock differs by host                                 | Inject instant; derive Asia/Kolkata date; due-today is due everywhere.                                        |
| Old application cycle looks open                                | Explicit reviewed cycle policy; absent policy means unknown, never infer from year.                           |
| Status notice remains open indefinitely                         | Conservative same-day checked notice policy until validity intervals exist.                                   |
| Study year conflates school and degree stage                    | Explicit unit semantics; reject malformed rules and leave draft migration to real-data review.                |
| Fictional evidence passes as official                           | Separate mode/validator, fictional evidence kind, no real authority citations or fictional application links. |
| Existing catalogue passes shape checks but lacks genuine review | Keep independent human review and publication gates; structural validity is not release approval.             |
| Timebox consumed by infrastructure                              | Record dependency/browser blockers; avoid research or deployment work inside domain timebox.                  |

No question is left for the implementation agent to answer by inventing a fact. Unknown source,
cycle, date, recognition or course detail stays unknown or is rejected when malformed.

## 17. Acceptance checklist and handoff

- [ ] Public signatures and JSON-serializable assessment fields match section 5.
- [ ] Profile and rule validation use shared pure logic; server publication safeguards remain intact.
- [ ] Normalization rejects undeclared input before filtering and preserves the four answer states.
- [ ] Every supported operator and malformed-group boundary has a passing unit test.
- [ ] Income intervals, score/study context and inherited freshness behave as specified.
- [ ] Due-today and Asia/Kolkata day-boundary tests pass.
- [ ] All four statuses are computed from the reference demo profile.
- [ ] At least two answer changes alter computed outcomes as specified in section 12.
- [ ] Explanations preserve group structure, supplied answer and honest evidence provenance.
- [ ] Application status cannot alter eligibility and cannot infer a current cycle.
- [ ] Checklist state is absent from eligibility input and output.
- [ ] Demo records stay outside both generated real catalogue files and fail publication checks.
- [ ] Repeated evaluation has identical content/order and does not mutate input.
- [ ] Existing tests, new tests, catalogue/registry validation and production build are run; actual
      results and any blockers are handed over rather than replaced by historical pass counts.
- [ ] Phase 4 receives reference profile, mode/date policy, data contract and known migration gaps.

The Phase 3 completion label is **“Explainable matching core ready for integration.”** Use it only
after the domain gates pass. It does not mean “Interactive prototype ready,” “Reviewed-data build
ready,” or “Live deployment verified”; those require the later integration/release gates.

## Appendix A. Verification observed while preparing this design

This document was grounded in the inspected commit above. No eligibility engine or application UI
was implemented as part of writing it. Existing research drafts and generated catalogues were not
changed.

Observed environment: Node `v24.19.0`, npm `11.17.0`, Windows PowerShell.

| Check run during design preparation   | Actual result                                                                                                                                                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                            | Failed overall: 7 client tests passed and 21 server request-safety tests passed; two server test files could not load because `ajv` was not installed/resolvable. This is not evidence that all server assertions executed. |
| `npm run validate:catalogue`          | Blocked by `ERR_MODULE_NOT_FOUND` for `ajv`.                                                                                                                                                                                |
| `npm run validate:registry`           | Blocked by the same missing server dependency.                                                                                                                                                                              |
| Production build and browser journeys | Not run for this documentation-only task; must be rerun during implementation.                                                                                                                                              |

The historical 44-test/build success in the Phase 2 handoff is historical only. Restore the existing
nested dependencies and rerun the checks before claiming an implementation baseline is green.
