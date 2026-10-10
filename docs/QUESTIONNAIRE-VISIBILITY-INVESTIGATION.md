# Catalogue-driven questionnaire visibility investigation

## Before changing visibility rules — reproduced 10 October 2026

Workspace: `C:\Coding\Scheme_log\app`. Base commit: `17560b7` with the existing, uncommitted
state/category follow-up preserved. That follow-up's active demo already references state/category;
the committed Phase 4/5 demo references only education/income. This issue does not change either
catalogue's rules or publish real drafts just to exercise controls.

Baseline: 144 client tests and 48 server tests pass. An isolated rule tree referencing course and
course year, plus a document-only score condition, produces the correct eight-control plan. With
education blank, `unknown` or `declined`, only education, score format and exam context are visible;
course, study year, duration, scale and score disappear. This reproduces the issue without modifying
the shipped demo. A plan containing `unimplemented` also silently produces zero sections.

| Field/area                                                   | Classification before fix                                                                                                                                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domicile, institution, category, declared additional answers | Intentionally hidden when unreferenced; planned controls render correctly when referenced. Canonical-to-draft mappings and dotted additional answers already work.                                 |
| Course                                                       | UI defect: `hasLevel` hides a planned control for blank/unsure/declined education. A user can know an exact course without choosing a broad education level.                                       |
| Study year/stage                                             | UI defect: same parent gate hides both school class and course year. Unknown level must not imply either context.                                                                                  |
| Course duration                                              | Missing UI for potentially relevant course years when education is unknown. Hidden for a known school student is intentional.                                                                      |
| Score                                                        | UI defect: `scoreReady` hides a planned input until format/CGPA scale is known. A supplied number must remain untrusted without its dimensions, not disappear.                                     |
| Score scale                                                  | Hidden for known percentage/percentile is intentional (format establishes scale); hidden when format is unknown prevents answering a potentially relevant companion.                               |
| Eligibility/document/nested traversal                        | No reproduced defect: planner traverses eligibility and every `appliesWhen`, including `allOf`, `anyOf`, `not`; Set-based deduplication and stable ordering already exist.                         |
| Manual prose/empty catalogue                                 | Correct: no unrelated inputs introduced; empty plans collect nothing.                                                                                                                              |
| Review                                                       | Already iterates active section fields, including unanswered fields, but inherits the defective UI visibility gates above.                                                                         |
| Presented tracking                                           | Tracks rendered controls and review fields; submission filters against currently applicable controls. Once hidden planned controls are restored, their blanks become unsure rather than not-asked. |
| Numeric zero                                                 | Existing number input uses nullish fallback and normalizer accepts zero; retain regression coverage.                                                                                               |
| Parent resets                                                | Existing level/course/duration/score resets generally work. Preserve unrelated fields and add coverage for unknown parents and school/course transitions.                                          |
| Unsupported control mapping                                  | Planner rejects undeclared/unmapped canonical fields, but UI silently ignores unsupported draft IDs. Must fail explicitly at the load/integration boundary.                                        |
| Step/progress                                                | Section order is deterministic; current progress uses raw step while content clamps it. Use the same clamped index for content, navigation and progress.                                           |

## Targeted approach

- Keep catalogue-driven collection; do not force all legacy fields into all catalogues.
- Show all exact course choices when education context is unknown. For unknown study context, offer
  explicitly labelled school classes and course years, with no automatic context inference.
- Keep duration visible unless school context is explicitly known. Keep score visible when planned;
  unknown format/scale yields unknown normalization, never a guessed percentage/CGPA conversion.
- Keep potentially relevant CGPA scale visible for unknown format, but hide it for a known
  percentage/percentile. Numeric inputs support blank, unsure and declined explicitly.
- Fail unmapped planned controls explicitly; validate renderability when loading the question plan.
- Use isolated test catalogues for every supported field, document-only rules, nested rules, minimal
  two-field and empty catalogues. Validate normalization and assessment, not just dropdown presence.

Application data flow remains static catalogue → plan → draft controls → review/presented fields →
strict normalization/shared validation → assessment snapshot. No runtime API, persistence or new
framework is introduced.

## Implemented resolution

- `C:\Coding\Scheme_log\app\client\src\data\questions.js` no longer hides planned course,
  study-year/stage or score controls behind known-parent gates. Unknown education exposes exact
  courses and explicitly distinguished Class/Year choices. Known school still hides course duration;
  known percentage/percentile still hides the unnecessary CGPA scale.
- Planned numeric inputs in `C:\Coding\Scheme_log\app\client\src\pages\Questionnaire.jsx` have
  accessible answer-status selectors, preserving blank/unsure/declined/zero without coercion. A score
  supplied without format/scale is retained in the draft but remains unknown after normalization.
- Changing course duration clears a dependent course year, but does not clear an independently
  selected school class when education is unknown. Existing education/course/score reset behavior
  continues to preserve unrelated answers.
- Unknown planned control IDs throw an explicit integration error. The session validates UI mappings
  when loading a plan, routing failures through the existing catalogue error/retry state.
- Progress, Back/Continue and content use the same clamped step index. Review still iterates active
  controls rather than stored keys, so active unanswered rows remain visible.
- No traversal or companion-plan rewrite was necessary: reproduction and regressions establish that
  those existing functions already handle document-only/nested references correctly.

## Regression fixtures and evidence

The new factory at `C:\Coding\Scheme_log\app\client\tests\helpers\questionnaire-catalogue.js`
creates isolated all-fields, document-only, minimal and empty catalogues. All-fields covers all eight
canonical profile fields and all five declared additional questions; it supplies actual fictional
condition evidence, not real scheme claims. The harness remains outside the production import graph.

New unit tests cover all supported control mappings, eligibility/document parity, unknown parents,
numeric zero, school/course context, dependency resets, empty/minimal plans and explicit unsupported
mapping errors. A full submission test verifies that unpresented fields remain not-asked, presented
blanks become unsure, all known answers reach assessment, and a document-only category edit changes
document applicability without changing eligibility. Strict undeclared-input rejection is retained.

New browser coverage includes all-fields visibility with blank/unknown/declined parents, numeric
status selectors, complete unanswered review, Back/edit/focus/progress, normalized known and zero
scores, document-only applicability, school transitions and minimal/empty catalogue behavior. Every
case runs at desktop and 360 px with axe/layout checks.

An initial browser run exposed an exact-label locator error in the new test-only scenario selector
and was stopped rather than waiting for repeated timeouts. Selecting the scenario by its accessible
combobox role fixes the test. Empty-catalogue expectations correctly assert recovery with no form,
not a manufactured review screen. The focused 18-case browser suite then passed on both viewports.

The earlier uncommitted state/category follow-up is deliberately preserved. This issue did not add
or change any shipped fictional rule; its isolated minimal fixture verifies that education/income
alone still yields only those two questions. Real records, publication registry, generated real
catalogues and lockfiles remain unchanged.
