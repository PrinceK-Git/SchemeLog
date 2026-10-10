# Phase 1 validation

Validation date: 10 October 2026.

## Results

| Check                         | Result                                                                                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production build              | Passed with Vite; approximately 94.5 kB compressed JavaScript and 5.7 kB compressed CSS                                                                               |
| Unit tests                    | 7 passed: dependent-answer clearing, score-format handling, unknown/declined answers, numeric boundaries, normalization, question visibility, and catalogue scenarios |
| Browser journeys              | 8 passed: four scenarios each at desktop and mobile widths                                                                                                            |
| Automated accessibility       | No violations reported by axe for the tested WCAG A/AA rules on the checked landing, questionnaire, review, results, details, and empty-result screens                |
| Responsive checks             | No horizontal document overflow at tested desktop, 360 px mobile, 768 px tablet, and 640 px reflow widths                                                             |
| Keyboard interaction          | Primary action opens the questionnaire with Enter; invalid input receives focus; step headings receive focus on navigation                                            |
| Session behavior              | Checkmarks survive in-app navigation and reset on refresh; direct detail entry without a profile works                                                                |
| Storage and URLs              | Browser local/session storage remain empty; personal answers are not inserted into routes                                                                             |
| Result states                 | All four groups, filtering, missing-profile entry, stale-profile notice, no-results scenario, retryable error, and not-found routes exercised                         |
| Official destination handling | General-resource URL and new-tab isolation attributes verified; fictional records have no invented application destination                                            |
| Visual review                 | Desktop and mobile screenshots reviewed; mobile heading spacing corrected and screenshots regenerated                                                                 |

## Test environment

- Windows development environment, Node.js 24, Chromium supplied by Playwright.
- Browser tests execute against the production build served by Vite preview.
- Desktop viewport: 1440 × 1000. Mobile viewport: 360 × 800 with touch emulation.
- Additional widths: 768 and 640 CSS pixels. The 640 px check exercises the width available when a 1280 px window is viewed at 200% zoom; this is a reflow check, not verification of every browser's native zoom controls.
- Eight screenshots are included in `docs/screenshots/`, covering all four primary screens on desktop and mobile.

## Boundaries and remaining checks

- This is the frontend phase. All scheme records and assessment statuses are fictional, prewritten examples. Real-data validation and eligibility logic remain future work.
- Automated accessibility checks and screenshot review do not establish full accessibility conformance. A screen-reader session and checks on a physical entry-level Android device, Safari, Firefox, and native browser zoom remain recommended before public release.
- External portal contents, availability, and real scheme criteria have not been verified. The interface explicitly labels its links as general discovery resources.
- Preview hosting is local. Production hosting and its client-route fallback configuration are not part of this phase.
- Screenshot profiles are fictional test inputs, not real student data.

## Reproduce

```sh
npm ci
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The repository's frontend-check workflow repeats formatting, unit tests, the production build, and browser tests for pushes and pull requests.
