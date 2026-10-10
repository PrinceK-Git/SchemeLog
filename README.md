# Schemelog

**Your future. Your opportunities.**

A responsive scholarship-discovery frontend built with React, Vite, JavaScript, and vanilla CSS. Phase 1 implements the full student journey with clearly labelled fictional data: landing page, guided questionnaire, result examples, and scholarship details with a preparation checklist.

Implements [Issue #1](https://github.com/PrinceK-Git/SchemeLog/issues/1).

## Run locally

Use Node.js 22.12 or newer (Node.js 24 is used for validation).

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. To check the production bundle:

```sh
npm run build
npm run preview
```

## User journey

1. Start at `/` and choose **Find My Scholarships**.
2. Answer the optional questions at `/questionnaire`. Unknown and declined answers are supported; education choices control dependent questions. Review or edit answers before submitting.
3. Explore `/results`, with four clearly separated assessment examples. **Preview scenario** also demonstrates an empty catalogue and a recoverable loading error.
4. Open `/scholarships/learning-pathways` or another example, review requirements, and mark preparation tasks.

Direct detail links work without a profile. Visiting `/results` without submitting answers offers a route back to the questionnaire. Unknown routes and scheme identifiers have a recovery page.

## Privacy and honesty

- All scholarships and assessments are fictional examples. Results are prewritten and do **not** calculate eligibility from questionnaire answers.
- No scholarship rules, benefits, dates, or scheme-specific application destinations have been verified in this release.
- External links open the National Scholarship Portal or myScheme as **general discovery resources**, never as application links for fictional schemes.
- Answers and preparation checkmarks live only in React memory. In-app navigation preserves them; refresh, closing the tab, or opening a new tab starts a fresh session.
- No accounts, analytics, database, document uploads, persistent browser storage, or profile network requests are used.
- No Aadhaar, bank account numbers, government credentials, or OTPs are collected.
- Preparation checkmarks are student notes, not eligibility confirmation or application submission.

## Structure

```text
src/
  app/                  routes, shared shell, session state
  components/           controls, notices, result cards, explanation UI
  data/                 fictional records and conditional question definitions
  pages/                four primary screens
  repositories/         fixture adapter for later real-data integration
  styles/               CSS variables, base styles, shared layout patterns
tests/
  unit/                 answer validation, branching, normalization, adapter behavior
  journey/              production-browser workflows and accessibility checks
docs/
  screenshots/          desktop and mobile screenshots of all four screens
```

Styling uses standard CSS files with CSS custom properties, component-prefixed classes, Grid, Flexbox, and responsive media queries. No CSS framework is required.

## Checks

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser tests use the production preview server and cover the journey at desktop and 360 px mobile widths, correction of invalid percentages, conditional answer clearing, stale-answer messaging, unknown answers, empty/error scenarios, filter behavior, direct routes, checkbox persistence/reset, storage checks, official destination attributes, and automated accessibility scans. Additional checks cover tablet layout, 640 px reflow, reduced motion, and page anchors. Test screenshots are written to `docs/screenshots/`.

Automated accessibility checks supplement human review; they are not a claim of complete WCAG conformance. See [validation notes](docs/VALIDATION.md) for the actual results and remaining limitations.

## Screenshots

| Screen                | Desktop                                               | Mobile                                               |
| --------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| Landing               | [View](docs/screenshots/01-landing-desktop.png)       | [View](docs/screenshots/01-landing-mobile.png)       |
| Questionnaire         | [View](docs/screenshots/02-questionnaire-desktop.png) | [View](docs/screenshots/02-questionnaire-mobile.png) |
| Results               | [View](docs/screenshots/03-results-desktop.png)       | [View](docs/screenshots/03-results-mobile.png)       |
| Details and checklist | [View](docs/screenshots/04-details-desktop.png)       | [View](docs/screenshots/04-details-mobile.png)       |

## Later phases

Source verification and the real catalogue belong to Phase 2; the deterministic matching engine belongs to Phase 3; real-data integration belongs to Phase 4. Replace the repository adapter and assessment provider without embedding rules in UI components. A deployed static host will need a fallback to `index.html` for client-side routes. Final hosting setup belongs to Phase 5.
