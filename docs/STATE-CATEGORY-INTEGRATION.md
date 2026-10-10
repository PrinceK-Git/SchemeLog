# State and category questionnaire integration

## What changed

The existing rule-driven questionnaire now includes these optional steps:

1. Education.
2. Home state / domicile (36 Indian states and union territories, including Assam and Bihar).
3. Annual household income.
4. Category (General, SC, ST, OBC, EWS and the other existing supported categories).
5. Review and submit.

Not sure, blank and Prefer not to answer remain supported; none is a known satisfied condition.
Fixture-only state/category options are hidden. Category has one decline option, stored as a
`declined` envelope, not the legacy `prefer-not` vocabulary code. Categories remain the existing
single-choice model; overlapping statuses are not inferred or merged.

## Data and matching connection

There is no runtime backend API in this static application. The frontend imports the authoritative
state/category JSON vocabulary from `C:\Coding\Scheme_log\app\server\src\data\vocab` through
`C:\Coding\Scheme_log\app\client\src\data\vocabularies.js`.

The complete path is: catalogue rules → question plan → controls → retained draft → strict
normalization → shared profile validation → assessment snapshot → results/reasons/details.
`domicile` becomes canonical `domicileState` (for example `IN-AS` or `IN-BR`); `category` uses codes
such as `general` or `obc`. The server wrapper imports the same profile validator, not a second
implementation. Server integration tests submit every displayed known state/category combination
through the frontend submission transaction and validate its resulting profile using the server.

Question planning remains data-driven: a future reviewed catalogue only asks fields referenced by
its approved eligibility or document conditions. No hardcoded extra collection was added to the
planner, and no missing reviewed data silently switches to demo mode.

## Fictional demonstration only

To make the restored inputs actually affect the currently shipped demo, Learning Pathways includes
two explicit fictional test conditions: domicile in Assam/Bihar and category General/OBC. Its existing
undergraduate/income conditions still apply. These invented examples are not government eligibility
facts. Evidence continues to say Fictional test condition; real draft records remain untouched.

With undergraduate education and middle income:

| Domicile       | Category       | Learning Pathways                     |
| -------------- | -------------- | ------------------------------------- |
| Assam or Bihar | General or OBC | Potential match                       |
| Maharashtra    | General        | Does not meet a known condition       |
| Assam          | SC             | Does not meet a known condition       |
| Unknown        | General        | Needs verification                    |
| Assam          | Declined       | Needs verification                    |
| Maharashtra    | Declined       | Known state failure still means unmet |

Other scholarships are not filtered out merely because they do not reference state/category.
Results include submitted labels and evaluated rule reasons. Editing marks the saved assessment
stale until resubmission; reset/refresh clears personal state. Nothing is sent to an API or stored
persistently, and a checklist mark never changes eligibility.

Demo catalogue version is now `demo-2026-10-10.2`; Learning Pathways record version is `2`.
Other record versions and the disclosed fixed evaluation instant are unchanged. The record bump
prevents preparation progress from being inherited across changed rules. The previous Phase 5
handoff and artifact manifest are historical evidence for the prior build, not current hashes.

## Verification

Regression coverage includes control options, canonical normalization, all known/unknown/declined
states, invalid-code rejection, answer-dependent matching, shared server validation, version guards,
review/edit/resubmit, privacy and desktop/mobile questionnaire navigation.

Validation on 10 October 2026:

- `npm test`: 144 client tests and 48 server tests passed (192 total).
- `npm run validate:catalogue`: passed with zero rejects; three drafts remain unpublished.
- `npm run validate:registry`: passed; approved URL registry remains empty.
- `npm run build`: passed (74 modules); current artifact is `C:\Coding\Scheme_log\app\client\dist`.
- `npm run format:check` and `git diff --check`: passed.
- `CI=1 npm run test:e2e`: all 30 Chromium tests passed (15 desktop, 15 mobile) in 1.8 minutes.
  An initial run had two label-assertion failures: dropdown/review labels include category aliases
  while result labels use the full vocabulary name. The expectations were separated and the entire
  suite rerun; no product behavior was weakened to satisfy the assertions.

No source-data, reviewed registry, real catalogue or lockfile changes were made. The historical
Phase 5 test totals and artifact hashes do not apply to this updated build. No deployment was attempted.
