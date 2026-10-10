# Schemelog

**Your future. Your opportunities.**

Schemelog helps students explore scholarships, understand potential matches, and prepare for the next steps. It combines a React frontend styled with vanilla CSS, an explainable matching engine, and offline tools for validating and publishing scholarship data.

**Current status:** an interactive prototype with four explicitly fictional scholarships. Answers genuinely change the demonstration results. Three researched real scholarship records remain unpublished drafts, and the generated reviewed catalogue contains **zero published schemes**. Schemelog is an independent project, not a government website. A potential match is not approval or an application submission.

## Contents

- [Features and scope](#features-and-scope)
- [Technology stack](#technology-stack)
- [Getting started](#getting-started)
- [Repository structure](#repository-structure)
- [Routes and demo walkthrough](#routes-and-demo-walkthrough)
- [Architecture and data flow](#architecture-and-data-flow)
- [Matching and uncertainty](#matching-and-uncertainty)
- [Catalogue publication](#catalogue-publication)
- [Source-checking tools](#source-checking-tools)
- [Command reference](#command-reference)
- [Testing and continuous integration](#testing-and-continuous-integration)
- [Privacy and accessibility](#privacy-and-accessibility)
- [Builds and hosting](#builds-and-hosting)
- [Troubleshooting](#troubleshooting)
- [Development and future work](#development-and-future-work)
- [Further documentation](#further-documentation)

## Features and scope

- Responsive landing page, guided questionnaire, result groups, and scholarship details.
- Catalogue-driven questions. The shipped demo asks about education, domicile, annual household income bands, and category. Course, study-stage, score, and other supported controls appear only when the selected catalogue requires them.
- Optional answers, uncertainty and decline choices, validation, and review before submission.
- Deterministic matching with explanations connecting submitted answers to conditions and evidence.
- Four groups: **Potential match**, **Needs verification**, **Does not meet a known condition**, and **Information unavailable**.
- Application availability and unknown deadlines displayed separately from eligibility.
- Conditional document preparation with session-only checkmarks.
- Stale-result notices after edits, plus loading, empty, error/retry, and not-found states.
- Offline catalogue validation, publication filtering, source-change checks, and versioned release metadata.

The repository has both `client/` and `server/`. **The server package currently provides offline catalogue tooling, not a running HTTP API.** The student journey works without a database, API server, or authentication service. Accounts, persistent profiles, document uploads, notifications, and automatic applications are not implemented.

## Technology stack

| Area              | Implementation                                                        |
| ----------------- | --------------------------------------------------------------------- |
| Frontend          | React 19, React DOM, React Router 7, JavaScript modules               |
| Development/build | Vite 8 and its React plugin                                           |
| Styling           | Vanilla CSS, custom properties, Grid, Flexbox, media queries          |
| Session state     | React context and reducer; memory only                                |
| Matching          | JavaScript domain modules with profile, rule, and evidence validation |
| Catalogue tools   | Node.js, JSON Schema, Ajv, and ajv-formats                            |
| Source extraction | node-html-parser and pdfjs-dist in the server toolchain               |
| Tests             | Node.js test runner, Playwright, and axe accessibility checks         |
| Formatting / CI   | Prettier and GitHub Actions                                           |

Dependency ranges are in the package manifests; lockfiles pin installations. No Tailwind or other CSS framework is used.

## Getting started

### Prerequisites

- Git and access to this repository.
- Node.js **22.12 or newer**, with npm. **Node 24** is configured in CI.
- Playwright's Chromium installation for browser tests.

### Install and run

```sh
git clone https://github.com/PrinceK-Git/SchemeLog.git
cd SchemeLog
npm ci
npm run setup
npm run dev
```

For an existing checkout, start from the repository root containing `client/`, `server/`, and the root `package.json`.

`npm ci` installs the root package. `npm run setup` installs locked dependencies in **both nested packages**. The root installation alone is not sufficient to start the app.

Open the URL printed by Vite, normally `http://127.0.0.1:5173/`. No `.env` file, API key, database connection, or backend process is required for the current demo.

### Preview a production build

```sh
npm run build
npm run preview
```

Preview normally serves at `http://127.0.0.1:4173/`. The full build validates the registry, assembles publishable catalogue records, and builds the frontend into **`client/dist/`**. An empty reviewed catalogue does not disable the explicitly configured fictional demo.

## Repository structure

```text
SchemeLog/
├── client/
│   ├── public/                   # Static assets
│   ├── src/
│   │   ├── app/                  # Routes, session state, submission transaction
│   │   ├── components/           # Shared controls, cards, icons, explanation UI
│   │   ├── data/                 # Demo data, generated catalogue, questions
│   │   ├── domain/
│   │   │   ├── application/      # Application availability
│   │   │   ├── eligibility/      # Rules, interval comparisons, reason codes
│   │   │   ├── profile/          # Normalization and question planning
│   │   │   └── validation/       # Profile, rule, scheme, catalogue contracts
│   │   ├── pages/                # Landing, questionnaire, results, details
│   │   ├── presentation/         # Domain-to-display transformations
│   │   ├── repositories/         # Explicit demo/reviewed catalogue loading
│   │   └── styles/               # Tokens, global styles, shared layouts
│   ├── tests/                    # Unit tests, journeys, isolated browser harness
│   ├── package.json
│   ├── package-lock.json
│   ├── playwright.config.js
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── data/
│   │   │   ├── schemes/          # Authored real scholarship records
│   │   │   ├── vocab/            # Shared canonical codes and labels
│   │   │   ├── catalogue.json    # Generated reviewed catalogue
│   │   │   └── release.json      # Explicit release identity
│   │   └── domain/validation/    # Validators and JSON schemas
│   ├── scripts/                  # Validation, publication, source checks
│   ├── sources/                  # URL registry and source reports
│   ├── tests/                    # Publication, parity, and source-safety tests
│   ├── package.json
│   └── package-lock.json
├── docs/                         # Designs, handoffs, research, screenshots
├── .github/workflows/checks.yml  # Automated checks
├── package.json                  # Root command forwarding
├── package-lock.json
└── README.md
```

The packages have separate installs; this is not an npm-workspaces setup. The frontend imports static vocabularies from `server/src/data/vocab/`, so retain the complete repository when building. Server fetching and extraction code is kept out of the browser bundle.

## Routes and demo walkthrough

| Route                 | Purpose                                                       |
| --------------------- | ------------------------------------------------------------- |
| `/`                   | Introduction, process, privacy, and demo entry                |
| `/questionnaire`      | Relevant questions, navigation, review, and submission        |
| `/results`            | Submitted profile, grouped assessments, explanations, filters |
| `/scholarships/:slug` | Scheme information and preparation checklist                  |
| Unknown route or slug | Recovery page                                                 |

Example detail route: `/scholarships/demo-learning-pathways`. Direct entry displays public/demo information without inventing a personal assessment.

To try the current fictional rules:

1. Select **Undergraduate degree**, **Assam** or **Bihar**, income **above ₹1,00,000 and up to ₹2,50,000 per year**, and **General** or **OBC** category.
2. Review and submit. Learning Pathways should be a potential match; Next Chapter needs verification; New Horizons does not meet a known condition; Future Notice has unavailable information.
3. Edit domicile to Maharashtra. The saved results become stale until resubmission. Resubmitting makes Learning Pathways fail its fictional domicile condition.
4. Restore Assam and decline the category answer. With the other conditions satisfied, resubmission demonstrates Needs verification.
5. With all other Learning Pathways conditions satisfied, select income up to ₹1,00,000 to demonstrate its applicable preparation task. Marking it does not change eligibility or submit an application.

These state, category, and income requirements are **invented demonstration conditions**, not government scholarship facts.

## Architecture and data flow

```text
Student journey — browser
Selected catalogue → validated snapshot → question plan → draft answers
    → review and normalization → eligibility/document evaluation
    → submitted snapshot → results, explanations, checklist

Catalogue preparation — offline Node.js tools
Authored records + vocabularies + registry + release metadata
    → validation and publication gate → generated catalogue copies
    → frontend production build
```

### Frontend responsibilities

- [Session provider](client/src/app/Session.jsx): loads data, plans questions, and coordinates submissions.
- [Session reducer](client/src/app/session-state.js): separates draft answers, revisions, submitted snapshot, catalogue state, and checklist progress.
- [Submission transaction](client/src/app/submission.js): normalizes answers and evaluates eligibility and document applicability together, retaining catalogue version and evaluation context.
- [Catalogue repository](client/src/repositories/catalogue.js): validates the selected source. A reviewed-load failure never silently substitutes fictional data.
- Presentation modules translate domain results into display text; page components do not own scholarship thresholds.

### Server responsibilities

The server package owns authored records, vocabularies, schemas, source review tools, and offline publication. It currently has no HTTP routes, listening process, student-profile endpoint, or user database. Its profile-validation wrapper reuses the browser-safe validator to keep contracts consistent.

### Demo and reviewed modes

[Catalogue mode](client/src/data/catalogue-mode.js) explicitly selects `demo` today. The fictional catalogue is `demo-2026-10-10.2`, evaluated at the disclosed fixed instant `2026-10-10T12:00:00+05:30`.

Reviewed mode loads generated `client/src/data/catalogue.json`, currently containing no published schemes. Mode selection is a deliberate code/configuration change, not an environment-variable toggle or a way to bypass publication review. Reviewed application availability also requires an explicit current-cycle policy; without one, it remains unknown.

## Matching and uncertainty

Profiles distinguish `known`, `unsure`, `declined`, and `not-asked`. Missing or declined information is not a satisfied condition. Annual income is an interval in INR/year; an interval that crosses a threshold can remain unresolved. Academic comparisons retain scale and examination context without silently converting CGPA to percentages.

Rules support individual comparisons, `allOf`/`anyOf` groups, negation, and manual verification. Evidence and freshness affect evaluation. A satisfied alternative can resolve an `anyOf` group; a known mandatory failure can make a result unmet even when another answer is unknown.

| Result                          | Meaning                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------- |
| Potential match                 | Complete usable conditions evaluate as satisfied; approval is not guaranteed |
| Needs verification              | Answers, manual checks, freshness, or coverage leave uncertainty             |
| Does not meet a known condition | A usable required condition evaluates as failed                              |
| Information unavailable         | Eligibility coverage cannot support an assessment                            |

Application availability is evaluated separately. Document applicability and preparation progress are also separate. Progress keys contain the scheme ID, record version, and document ID so changed records do not inherit marks from an older version.

## Catalogue publication

### Current real-data status

Authored records in `server/src/data/schemes/` cover:

- National Means-cum-Merit Scholarship Scheme (NMMSS).
- PM-USP Central Sector Scheme of Scholarship for College and University Students.
- PM-USP Special Scholarship Scheme for students of Jammu & Kashmir and Ladakh.

All three are **draft research records**. Their presence does not establish current eligibility facts, independent review, or publication readiness. See [scheme review notes](docs/verification/).

### Publication workflow

1. Correct authored facts against official guidelines and record precise evidence locators.
2. Have a different reviewer check material facts and destinations; record genuine reviewer identities and dates.
3. Review access policies and register approved exact URLs in `server/sources/registry.json`.
4. Complete required review metadata before marking a record published.
5. Update `server/src/data/release.json` with the intended version and actual release timestamp.
6. Validate, build, and inspect coverage and withheld records.

```sh
npm run validate:catalogue
npm run validate:registry
npm run build
```

Structural validation does not approve facts. Publication excludes drafts, archives, and quarantined records. Source-hash changes conservatively withhold affected records until review. Fictional records must never enter real publication.

Generated outputs are `client/src/data/catalogue.json`, `server/src/data/catalogue.json`, and `server/src/data/income-thresholds.json`. Edit authored inputs rather than manually patching outputs. Explicit release metadata supports repeatable catalogue builds.

The optional `CATALOGUE_EVALUATION_DATE` environment variable controls the publication build's evaluation date for reproducibility. It does not control every standalone validator or the demo clock, and should not be used to backdate a release to hide overdue review.

## Source-checking tools

Source checks are separate, opt-in maintenance commands. Normal builds and unit tests do not fetch official scholarship sites. Installing dependencies or browsers can still require internet access.

```sh
# Plan a fetch without making requests
npm run sources:fetch -- --dry-run

# Fetch approved entries, extract content, and update the report
npm run sources -- --all

# Fetch one registered source; replace the example ID
npm run sources:fetch -- --source src-approved-id

# Process already downloaded content
npm run sources:extract
npm run sources:report
```

The checked-in registry has no approved hosts or entries, so it currently provides no sources to fetch. Fetches are constrained by reviewed URLs, host policy, robots handling, and request-safety checks. Content extraction or an unchanged hash does not replace factual review.

Raw bytes stay in ignored `server/.cache/sources/`. Source metadata and extracted artifacts are managed under `server/sources/`; its readable summary is [report.md](server/sources/report.md).

## Command reference

Run from the repository root unless stated otherwise.

| Command                      | Purpose                                               |
| ---------------------------- | ----------------------------------------------------- |
| `npm ci`                     | Install the root locked package                       |
| `npm run setup`              | Install client and server locked dependencies         |
| `npm run dev`                | Start frontend development                            |
| `npm run build`              | Validate registry, assemble catalogue, build frontend |
| `npm run preview`            | Serve the existing frontend build locally             |
| `npm test`                   | Run client tests followed by server tests             |
| `npm run test:e2e`           | Run configured browser journeys                       |
| `npm run validate:catalogue` | Validate authored records and report findings         |
| `npm run validate:registry`  | Validate registry policy and references               |
| `npm run build:catalogue`    | Regenerate catalogues through publication validation  |
| `npm run sources:fetch`      | Fetch due approved sources                            |
| `npm run sources:extract`    | Extract downloaded content                            |
| `npm run sources:report`     | Regenerate the source report                          |
| `npm run sources -- --all`   | Run the source pipeline for all approved entries      |
| `npm run format:check`       | Check repository formatting                           |
| `npm run format`             | Rewrite formatting across the repository              |

Focused checks: `npm test --prefix client` and `npm test --prefix server`. Prefer the root build for release validation; a client-only build skips publication checks.

## Testing and continuous integration

### Local checks

```sh
npm run format:check
npm test
npm run validate:catalogue
npm run validate:registry
npm run build
npm exec --prefix client -- playwright install chromium
npm run test:e2e
```

Client tests cover normalization, question planning/visibility, eligibility, income intervals, freshness, application status, submission snapshots, and presentation. Server tests cover schemas, publication, shared-contract parity, source safety, and isolation of fictional records from real publication.

Browser tests cover the journey, edits, uncertainty, preparation, reset, recovery, accessibility, and responsive behavior. Isolated test catalogues exercise controls that the shipped demo does not require, without adding those rules to production.

Playwright uses desktop **1440 × 1000** and mobile **360 × 800**, with production preview on **4173** and an isolated harness on **4174**. Build first. Local runs may reuse servers, so stop stale processes before checking a new build. CI disables reuse.

### GitHub Actions

[The workflow](.github/workflows/checks.yml) runs for pull requests targeting `main` and pushes to its configured branches. It installs Node 24 and both packages, checks formatting, runs unit/server tests, builds, installs Chromium with system dependencies, and runs browser tests. Failed runs upload browser-test artifacts.

Counts and hashes in handoff documents apply to their recorded revisions. The Phase 5 manifest predates the current demo and questionnaire follow-ups. Use fresh results for the checkout being reviewed rather than treating historical evidence as current verification.

## Privacy and accessibility

Answers, submitted assessments, and checkmarks remain in React memory. Navigation retains them; refresh, reset, or a new tab starts a fresh personal session. Profiles are not persisted in local storage, session storage, cookies, or a database, and questionnaire profiles are not sent to a backend.

There are no accounts, analytics, uploads, payments, or collection flows for Aadhaar, bank details, passwords, or OTPs. External resources do not automatically submit applications.

The UI includes labels, keyboard focus handling, a skip link, error feedback, responsive layouts, and reduced-motion support. Automated axe checks supplement browser testing; they do not certify complete WCAG conformance or replace screen-reader, physical-device, Safari/Firefox, and native-zoom checks.

## Builds and hosting

The app can be served statically. Keep the complete repository available during build because the client consumes shared vocabularies and the root build executes server tooling.

| Setting                 | Value                                 |
| ----------------------- | ------------------------------------- |
| Build working directory | Repository root                       |
| Node version            | 24 recommended                        |
| Installation            | `npm ci`, followed by `npm run setup` |
| Build command           | `npm run build`                       |
| Publish directory       | `client/dist`                         |

Configure application routes to fall back to `/index.html` while preserving normal asset handling. Current routing and Vite settings assume hosting at the domain root; subdirectory hosting needs additional configuration. Verify direct detail URLs and hard refreshes on the actual host.

Publish only `client/dist`, not caches, tests, server sources, or an older root-level `dist/`. Local preview is not a production deployment. No verified live URL is documented here.

Before release, record the deployed commit, mode, artifact identity, and route checks. Retain a previously verified complete artifact for rollback so application and catalogue remain aligned. The [release handoff](docs/release/PHASES-3-5-RELEASE.md) contains hosting and rollback guidance, with historical evidence explicitly scoped to its earlier build.

## Troubleshooting

| Symptom                                      | What to check                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| Missing Vite, Prettier, or server dependency | Run `npm run setup`; root installation alone is insufficient                     |
| Node syntax or engine errors                 | Check `node --version`; preferably use Node 24                                   |
| Missing browser executable                   | Run `npm exec --prefix client -- playwright install chromium`                    |
| Browser tests show old UI or cannot bind     | Stop stale processes on 4173/4174, rebuild, and rerun                            |
| Reviewed catalogue is empty                  | Expected until real records clear publication review                             |
| A question is absent                         | Check catalogue requirements and question planning; unrelated fields stay hidden |
| Edited answers do not change results         | Review and resubmit the draft                                                    |
| Refresh loses answers/checkmarks             | Expected memory-only behavior                                                    |
| Hosted detail URL returns 404                | Configure SPA fallback to `index.html`                                           |
| Publication rejects or withholds a record    | Inspect evidence, registry approval, review metadata, and freshness findings     |

## Development and future work

Keep vanilla CSS design values in `client/src/styles/tokens.css`, shared foundations in `global.css`/`layout.css`, and component/page styles alongside their owners. Keep matching in domain modules rather than duplicating conditions inside JSX.

Adding a profile field requires coordinated updates to contracts, vocabulary where relevant, planning, normalization, display mappings, and tests. Demo-rule changes should retain fictional disclosures and evidence, update catalogue/record versions, and verify explanations and document applicability.

The package split accommodates future backend work, but a runtime API still needs deliberate design. Further work includes independently reviewed real data, current-cycle policy, live-host verification, and any later API, database, authentication, persistence, or notification features. The existence of `server/` does not mean these services are already implemented.

Contributions should explain user-visible behavior and checks performed. Review generated catalogue changes separately from authored facts. Do not commit caches, secrets, or personal student data.

## Further documentation

| Document                                                                   | Purpose                                         |
| -------------------------------------------------------------------------- | ----------------------------------------------- |
| [Phase 2 status](docs/PHASE2-STATUS.md)                                    | Catalogue tooling and publication gaps          |
| [Matching design](docs/PHASE3-EXPLAINABLE-MATCHING-DESIGN.md)              | Domain contracts and evaluation                 |
| [Phase 3 handoff](docs/PHASE3-HANDOFF.md)                                  | Engine implementation and recorded checks       |
| [Interactive journey design](docs/PHASE4-INTERACTIVE-JOURNEY-DESIGN.md)    | Session and interface integration               |
| [Phase 4 handoff](docs/PHASE4-HANDOFF.md)                                  | Journey behavior and release gates              |
| [State/category integration](docs/STATE-CATEGORY-INTEGRATION.md)           | Current fictional rules and shared vocabularies |
| [Questionnaire visibility](docs/QUESTIONNAIRE-VISIBILITY-INVESTIGATION.md) | Conditional controls and regression coverage    |
| [Release verification design](docs/PHASE5-RELEASE-VERIFICATION-DESIGN.md)  | Release checks and boundaries                   |
| [Historical release handoff](docs/release/PHASES-3-5-RELEASE.md)           | Earlier build evidence and hosting guidance     |
| [Historical artifact manifest](docs/release/PHASE5-ARTIFACT-MANIFEST.json) | Hashes for the older recorded artifact          |
| [Scheme review notes](docs/verification/)                                  | Research and independent-review requirements    |
| [Phase 1 validation](docs/VALIDATION.md)                                   | Earlier frontend checks and limitations         |

Historical screenshots and artifacts are development records, not evidence of fresh verification for the current checkout or a live deployment.
