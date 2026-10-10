# Phases 3–5 — release verification and handoff

**Date:** 10 October 2026  
**Workspace:** `C:\Coding\Scheme_log\app`  
**Mode:** Explicit fictional interactive demo; zero published real schemes.  
**Release status:** **Interactive prototype ready** — local unit/publication/build/format checks and all 16 pinned-Chromium browser tests passed.  
**Deployment:** Not attempted. Live deployment pending; no authorized destination or credentials supplied.

## 1. Candidate and scope

The runtime is based on commit `f598eb61bfd34bb85de3450df81b24b6948269b8` on `prince`.
This handoff describes that base plus uncommitted Phase 5 test/documentation changes, not a new
release commit. No commit, tag, remote CI success or deployment is claimed.

The design at `C:\Coding\Scheme_log\app\docs\PHASE5-RELEASE-VERIFICATION-DESIGN.md` was already
untracked when execution began and has been preserved. Phase 5 adds:

- Explicit named assertions for all four reference-profile statuses in the existing browser journey.
- An assertion that marking an uncertain document does not change Needs verification.
- A reset regression that marks a task, resets, and resubmits the same answers without reloading the
  page. The old mark must not return. It runs at both configured viewport sizes.
- This release handoff and a hash manifest of the production artifact and release inputs.

No application, styling, domain, publication-rule, dependency version or lockfile change was needed.
The three real drafts, empty registry and release metadata remain unchanged. No research-source fetch
or human approval was performed. Package/browser installation is distinct from scheme-source fetching.

## 2. Versions, coverage and clocks

| Property                     | Value                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Runtime mode                 | `demo`                                                                            |
| Demo catalogue               | `demo-2026-10-10.1`; four fictional records, each record version `1`              |
| Real catalogue               | `2026-10-10.1`; zero records                                                      |
| Schema / vocabulary          | `1.0.0` / `1.0.0`                                                                 |
| Engine / profile             | `1.0.0` / `1`                                                                     |
| Demo evaluation instant      | `2026-10-10T12:00:00+05:30`, visibly disclosed                                    |
| Real snapshot publishedAt    | `2026-10-10T00:00:00+05:30`; empty development snapshot, not independent approval |
| Toolchain                    | Windows; Node `v24.16.0`; npm `11.13.0`; Vite `8.3.4`                             |
| Published real schemes       | **0**; all three researched schemes remain drafts                                 |
| Registry / source hash input | Empty hosts/entries; collected source snapshot hashes `{}`                        |

The fixed demo instant is not the release execution time. Reviewed-mode submission captures one
actual ISO instant at its event boundary; freshness uses Asia/Kolkata, with review-due on or before
today treated as due. Missing reviewed current-cycle policy yields unknown application status.
Direct public details also conservatively show unknown application status without a personal snapshot.

Standalone catalogue/registry checks ran on 10 October 2026. Two additional offline catalogue builds
used explicit `CATALOGUE_EVALUATION_DATE=2026-10-10`; the previous environment value was restored.
That variable controls the build, not every standalone validator. It must not be used to backdate a
future reviewed release and hide stale facts.

## 3. Command evidence

All commands run from `C:\Coding\Scheme_log\app`. Times below are local Asia/Kolkata (+05:30).
Raw local logs are under `C:\Coding\Scheme_log\app\test-results\phase5`; this gitignored directory
is not a shipped artifact. This document and the manifest are the durable summary.

After the interrupted installation recovered, `npm run setup` was rerun successfully end-to-end
at 18:21 (exit 0; both locked nested installs, zero reported audit vulnerabilities). The required
non-browser sequence was repeated on that clean setup: `npm test` at 18:22:04,
`npm run validate:catalogue` at 18:22:08, `npm run validate:registry` at 18:22:09,
`npm run build` at 18:22:10 and `npm run format:check` at 18:22:13, all exit 0 with the same results
below. All 13 manifest file hashes still matched after that build. These are the final runtime checks;
subsequent edits are release documentation only. Final repository formatting and `git diff --check`
passed again at 18:27 after the handoff was completed; all 13 manifest hashes still matched and ports
4173/4174 had no remaining test-server listeners. The final diff confirms runtime, real data,
lockfiles and committed Playwright configuration are unchanged.

| Command/check                   | Time on 10 October | Actual result                                                                                                                                                                    |
| ------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                        | 18:10–18:12        | Initial EPERM from a stale project preview holding a native binary; passed after stopping only that identified preview. Root audited one package, zero reported vulnerabilities. |
| `npm run setup`                 | 18:11              | Client locked installation passed (29 packages); server attempt interrupted by ECONNRESET. Not reported as a combined success.                                                   |
| `npm ci --prefix server`        | 18:14–18:16        | Background retry completed, exit 0: 20 packages installed, zero reported vulnerabilities. Earlier foreground retry exceeded the command tool's 30-second timeout.                |
| `npm test`                      | 18:16:36           | Exit 0: **134 client + 47 server = 181 passing tests**, zero failures/skips. Includes source request-safety and production-graph checks.                                         |
| `npm run validate:catalogue`    | 18:16:38           | Exit 0: three drafts, zero published/publishable, zero rejects, six quarantine findings, zero warnings.                                                                          |
| `npm run validate:registry`     | 18:16:39           | Exit 0: empty registry valid; no source requests.                                                                                                                                |
| `npm run build`                 | 18:16:41           | Exit 0: registry/strict offline publication gate and Vite passed; 74 transformed modules.                                                                                        |
| `npm run format:check`          | 18:16:44           | Exit 0 after the browser test changes; rerun after final documentation is required.                                                                                              |
| `npm run test:e2e -- --list`    | 18:15              | Exit 0: **16 tests discovered**, eight per viewport. Discovery alone is not execution.                                                                                           |
| `npm run build:catalogue` twice | 18:17              | Both exit 0 with fixed publication date; identical hashes across runs and matching client/server catalogue bytes.                                                                |
| Actual artifact inspection      | 18:18              | Four expected static files inspected and hashed; targeted exclusion scan passed.                                                                                                 |

The six catalogue findings are missing reviewed links and independent reviewers on three drafts.
They are not six published records. Generated coverage contains zero published records and no
withheld-published entries. Successful structural validation does not approve the draft facts.

### Installation and verification interruptions

Chromium installation initially exceeded the command-tool timeout; a background retry encountered
DNS failures and connection resets for the download hosts, then exited 1. The first actual
`CI=1 npm run test:e2e` attempt exited 1 with 16 browser-launch failures because the pinned headless
Chromium executable was absent; no journey assertion ran in that attempt. A smaller headless-only
installation and a diagnostic system-Chrome run were attempted separately, without changing the
committed Playwright configuration. The system Chrome 154.0.8037.98 diagnostic passed all 16 tests
in 47.5 seconds. `npm exec --prefix client -- playwright install chromium --only-shell` then
completed at 18:24:55 with exit 0, installing the pinned headless shell 156.0.8078.4 (revision 1248),
FFmpeg and Winldd. This is sufficient for the configured headless tests; headed Chromium remains
uninstalled. The final default-configuration browser run is recorded below separately.
The first ad hoc artifact inventory expected only HTML/CSS/JS and rejected the existing favicon SVG.
After inspecting `C:\Coding\Scheme_log\app\client\public\favicon.svg`, the inventory included
that legitimate static asset and the inspection passed. No application change was made for this.

## 4. Browser acceptance

**Final standard run:** `CI=1 npm run test:e2e`, 18:25:04–18:25:52 (+05:30), exit 0:
**16 passed in 46.2 seconds**, zero failures/skips. The unchanged committed Playwright configuration
used the pinned headless Chromium 156.0.8078.4, not the diagnostic system-Chrome override. Both
preview servers were created for the run with reuse disabled and closed afterward. The actual
artifact matched all recorded hashes following the last production build.

Raw log: `C:\Coding\Scheme_log\app\test-results\phase5\browser-final.log`.
The initial missing-browser failures remain separately documented; they are not assertion failures
and are not counted as successful journey runs. No required local gate remains browser-blocked.

The suite at `C:\Coding\Scheme_log\app\client\tests\journey\frontend.spec.js` covers:

1. Answer-driven discovery: all four named statuses, reasons, stale/edit/resubmit and privacy.
2. Honest uncertainty: declined income, satisfied alternatives, unresolved manual checks,
   conditional documents and unknown deadlines.
3. Preparation/recovery: in-app progress retention, changed applicability, refresh clearing,
   no-profile/direct detail behavior and invalid routes.
4. New reset regression: old preparation marks cannot reappear after same-profile resubmission.
5. Unknown answers, filters, school changes and responsive landing regressions.
6. Isolated reviewed empty/invalid/quarantined/retry states without demo fallback.
7. Isolated strict-income overlap and score/course companion controls without invented certainty.
8. Keyboard activation with focused step headings.

Both configured Chromium projects are required: desktop 1440 × 1000 and mobile 360 × 800. Existing
axe checks cover WCAG A/AA tags; additional reflow checks use 768 px and 640 px. Production preview
uses port 4173 and the separate test harness uses 4174. Run with `CI=1` to prevent stale-server reuse.
Only the fresh nested production artifact is eligible for browser evidence, not the older root dist.

Privacy assertions retain empty local/session storage and cookies, no profile-bearing/non-GET
requests or console values during discovery, and isolated new-tab resource links without profile
parameters. Harness fixtures are test-only and do not enter production.

Automated checks are not screen-reader, Safari/Firefox, physical-device or full accessibility
certification. Existing Phase 1 screenshots are not current release evidence.

## 5. Reproducibility and shipping artifact

Artifact: **`C:\Coding\Scheme_log\app\client\dist`**. Do not deploy the old root-level
`C:\Coding\Scheme_log\app\dist`, source caches, tests or the server package.

The manifest at `C:\Coding\Scheme_log\app\docs\release\PHASE5-ARTIFACT-MANIFEST.json` records
file sizes/SHA-256 hashes for all four output files, lockfiles, catalogue copies, thresholds, release
metadata, registry and the exact browser spec. Its file inventory is repository-relative for
portability; resolve it against the workspace above.

- Client/server catalogue SHA-256:
  `250f8814e7c4df5a428178e1e34d6a153d6da8661e30c93baaecee8784328850`.
- Generated income thresholds SHA-256:
  `37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570`.
- JavaScript: 370,407 bytes (Vite reports 115.49 kB gzip); CSS: 25,644 bytes (5.76 kB gzip).
- Output includes HTML, JavaScript, CSS and favicon SVG; no maps or additional static payloads.
- Production graph unit checks and emitted-text inspection found no three unreviewed draft IDs,
  legacy prewritten catalogue, isolated harness, PDF parser, source extraction/fetching modules or
  Node filesystem code. Targeted private-key marker checks passed; this is not a comprehensive
  security/secret audit.
- No cross-platform byte-identical Vite build guarantee is claimed. The manifest identifies this
  specific local artifact; repeated offline catalogue output was directly verified.

## 6. Two-minute fictional demonstration

From `C:\Coding\Scheme_log\app`, run `npm run preview` after a successful build and use its
displayed local URL. This is not a deployed URL. Browser routes are `/`, `/questionnaire`, `/results`
and `/scholarships/demo-learning-pathways`.

1. **0:00–0:25:** Show the fictional disclosure and **Try the demo**. Select Undergraduate degree
   and **Above ₹1,00,000 and up to ₹2,50,000 per year**; review and submit.
2. **0:25–0:50:** Point to one potential match among four records. Learning Pathways is potential;
   Next Chapter needs verification; New Horizons is unmet; Future Notice is unavailable. Expand
   **Why this result**, showing the actual answer, requirement and fictional provenance.
3. **0:50–1:15:** Edit income to Prefer not to answer. Before resubmission, show the stale results
   notice. Resubmit; Learning Pathways needs verification. Show its uncertain document and unknown
   deadline; Next Chapter's manual recognition check is still unresolved.
4. **1:15–1:45:** Resubmit income up to ₹1,00,000, open Learning Pathways, and mark its required
   preparation task. This tracks preparation, not eligibility or an application submission.
5. **1:45–2:00:** Navigate away/back to retain the mark. Refresh to clear personal state and show
   public detail information with no personal assessment. Reset session also clears preparation.

As a separate answer-change demonstration, income above ₹2,50,000 changes Learning Pathways to
unmet. The demo asks no exact income or unrelated sensitive questions.

## 7. Hosting instructions — deployment pending

No hosting account, upload, paid resource or credentials were created/used. No live URL or previous
known-good deployment exists in this evidence. Obtain authorization for a specific destination first.

For an authorized static host:

1. Select the tested candidate and record its eventual commit and host deployment ID. Configure the
   repository root as the host's build directory; nested server tooling is required during build.
2. Use Node 24. Install command: `npm ci && npm run setup`. Build command: `npm run build`.
   On Windows PowerShell 5, run the install commands separately and check each exit code.
3. Set the host output directory to `client/dist` relative to its repository root, corresponding to
   `C:\Coding\Scheme_log\app\client\dist` here. Publish only that directory's contents.
4. Configure unmatched application paths to serve `/index.html` without redirecting users home;
   retain normal asset resolution/content types. Missing scripts must not silently receive HTML.
   Current router/base assumptions target the domain root, not an arbitrary subpath.
5. Enable HTTPS. Verify landing, questionnaire, a submitted result, unknown-slug recovery and direct
   `/scholarships/demo-learning-pathways` entry with a hard refresh. Confirm the fictional mode/date,
   no personal claim on direct entry, and privacy. No profile analytics/form capture is authorized.
6. Record the verified URL, actual deployed SHA, artifact hashes, timestamp and route observations.
   If the host rebuilds rather than uploading this local artifact, verify that host-built artifact
   separately. Local Vite fallback behavior does not prove the host's SPA rewrite is configured.

Provider-specific files cannot be supplied accurately before a host is chosen. Until then:
**live deployment pending**.

### Rollback

Before any future deployment, identify its previous verified deployment/artifact. On incorrect
confident assessment, privacy leak, wrong mode/data or broken routes/assets, halt promotion and
restore that entire known-good artifact through the authorized host. Catalogue and application
must roll back together. Recheck landing, questionnaire and direct details afterward.

There is currently no verified live rollback target. For a first failed deployment, unpublish or
serve an honest maintenance page using the authorized host, rather than inventing a known-good URL.
No student database migration is needed: personal state is memory-only. Keep sanitized failure
evidence and do not force-reset unrelated developer work.

## 8. Remaining gates and original-scope deferrals

- **Interactive prototype ready** is achieved by the final local checks, including the default
  pinned-Chromium browser suite. No assertion changes were made after the passing run.
- **Reviewed-data build ready** is not achieved: genuine independent human review, draft corrections,
  exact approved registry URLs and a current-cycle decision are absent. AI testing is not human review.
- **Live deployment verified** is not achieved: no authorized destination or live-route evidence.
- No remote CI run was triggered/verified. The existing workflow retains its unit/build/browser gates;
  this document reports local evidence only.
- Manual screen-reader, physical-device, Safari/Firefox and full visual/accessibility certification
  remain unperformed. No new screenshots or manual visual acceptance claim is made.
- Deferred from the larger roadmap: expanded reviewed catalogue, source-bot CI, per-fact source-diff
  review queues, full extraction/OCR, exhaustive adaptive questioning, exact-income follow-up,
  deadline sorting, section-deep-link edits, persistence, notifications, social login, API and AI advice.

The next implementation owner should preserve these safeguards, not publish drafts to make coverage
look complete. After any runtime/data/dependency change, regenerate the artifact/manifest and rerun
the required gates. Documentation-only follow-ups should identify the tested artifact commit
separately from any later handoff commit.

## 9. Reproduce and final acceptance

On Windows, from `C:\Coding\Scheme_log\app`, run each command separately and stop on nonzero exit:

```powershell
Set-Location 'C:\Coding\Scheme_log\app'
npm ci
npm run setup
npm exec --prefix client -- playwright install chromium --only-shell
npm test
npm run validate:catalogue
npm run validate:registry
npm run build
npm run format:check
$env:CI = '1'
npm run test:e2e
Remove-Item Env:CI
git diff --check
```

Use `playwright install chromium` instead if headed browser use is needed and downloads are available.
Restore any pre-existing CI environment value rather than deleting it in an already-configured shell.
The implementation agent used child processes, so its CI setting did not alter the user's shell.

- [x] Locked root and both nested installations completed; lockfiles unchanged.
- [x] All 181 unit tests and offline publication/registry checks passed.
- [x] Production build and repository formatting passed.
- [x] All 16 browser checks passed at desktop and 360 px mobile widths.
- [x] Existing axe, focus, layout, privacy, uncertainty and recovery assertions retained.
- [x] Preparation reset regression passed without relying on a page reload.
- [x] Repeated catalogue output and all 13 recorded input/artifact hashes verified.
- [x] No unreviewed real record, harness or source/PDF tooling found in shipping output.
- [x] Release instructions, demo script, limitations and rollback documented.
- [ ] Independently reviewed real-data release — blocked on genuine human prerequisites.
- [ ] Authorized live deployment and live-route verification — pending.

The local implementation/verification pass remained within the roadmap's final 25-minute stop rule;
download interruptions were recorded, not presented as immediate first-attempt success. Final changes
are test/documentation-only; application runtime and data stayed unchanged.
