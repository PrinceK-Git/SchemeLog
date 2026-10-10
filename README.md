# Schemelog

React scholarship-discovery demo with Phase 2 catalogue contracts and offline publication tooling.

**Status:** the student journey remains a labelled fictional demo. Three researched real scheme
records are **drafts**, not independently reviewed publications. The generated real catalogue is
intentionally empty. Do not use draft rules for student assessments.

## Setup

Node.js 22.12+ (tested with Node 24). From the repository root:

```sh
npm ci
npm run setup
npm run dev
```

Dependencies and lockfiles are isolated in `client/` and `server/`. The root package forwards commands.
No database or runtime backend is required.

```text
SchemeLog/
  client/       React/Vite frontend, dependencies and browser tests
  server/       catalogue data, validation, build scripts and source tooling
    sources/    exact-URL registry; snapshots/text after approved checks
  docs/         review notes and implementation handoff
  .github/      repository checks
  README.md
```

## Checks

```sh
npm test
npm run validate:catalogue
npm run validate:registry
npm run build
npm run preview
npm run format:check
```

Builds and unit tests do not fetch official sites. Catalogue assembly excludes drafts, archives and
quarantined records, then writes the envelope to client and server data folders. Source hash changes
conservatively withhold a whole record until re-review; fine-grained engine integration is deferred.

Browser tests require a build and Chromium:

```sh
npm exec --prefix client -- playwright install chromium
npm run build
npm run test:e2e
```

## Human publication gate

1. Correct draft facts against official guidelines with precise locators.
2. Fill verification notes; a different person checks every material fact and destination.
3. Read robots, terms and copyright policy; add approved exact URLs to the registry.
4. Record genuine curator/reviewer identities and dates, then mark the record published.
5. Bump `server/src/data/release.json` with a date-counter version and actual IST release timestamp.
6. Validate, build and inspect coverage before reviewing the change.

Explicit release metadata keeps repeated builds reproducible. The initial version identifies an
empty development snapshot, not a verified release. Fixture records must never be published.

## Opt-in source checks

```sh
npm run sources -- --all
npm run sources:fetch -- --source src-approved-id
npm run sources:extract
npm run sources:report
```

The registry starts empty because no real human URL/terms approval has been supplied. These commands
make no requests until a reviewed registry change is added. Raw bytes remain in the gitignored
`server/.cache/sources/`. Source tooling is never imported by the frontend and never approves facts.

## Privacy and remaining work

Answers remain in React memory; there are no accounts, analytics, uploads or profile network requests.
The Phase 1 questionnaire still uses its demo answer format; real contract integration is deferred.
See [the handoff](docs/PHASE2-STATUS.md) and [research notes](docs/verification/) before publishing.
