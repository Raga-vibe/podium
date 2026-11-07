# Changelog

All notable user-facing changes to this app are documented here.

## 2026-11-07 — Final cleanup, debug and feature pass

### Model default (reverted)

- Builder.io keeps its own default model (gpt-6-luna). A global `agent.model` of Gemini 3.5 Flash-Lite was tried and reverted the same day: the framework's model setting is app-wide and would also switch Builder users to that model. The deployment Gemini key (GOOGLE_GENERATIVE_AI_API_KEY) uses the framework's Google provider default (gemini-3.8-flash). There is no supported per-provider default-model override.

### Features

- **Project links.** The project now has three link fields: repo URL, live (deployed) URL and Clips demo URL. The rubric coach scores against them (a missing link caps Usefulness & Execution and Innovation) and the submission writer lists them when present, never inventing a missing one. Migration v3 adds `projects.live_url`.
- **Submission readiness check.** New `check-readiness` action (deterministic: every requirement done, repo/live/Clips demo links present, every criterion scored, draft saved, deadline ahead) plus a `submission-readiness` skill and an "Am I ready to submit?" button on the board. Returns a pass or a fix list.
- **Apply top fix.** The button now adds the fix as a new requirement on the board via `add-requirement` (deterministic, with a toast); the agent does the same through the rubric-coach skill.
- **Rescore before/after.** Rescoring a criterion keeps the old score as `previousScore` (migration v3 adds `scores.previous_score`) and the board shows "Was X, now Y".
- **Draft export.** Copy as Markdown was already there; "Download .md" now downloads the draft as a Markdown file.

### Bug fixes

- **Timezone display.** The deadline is stored in UTC (`2026-11-10T07:59:00Z`). The Timeline and header now show it in the viewer's local zone with the correct zone label, plus the official "Nov 9, 11:59 PM PT". `formatInZone` no longer appends the raw IANA name (`America/Los_Angeles`).
- **Requirement checkboxes.** `toggle-requirement` accepts an optional explicit `done` (idempotent), the UI passes it, and the checkbox is disabled while its toggle is pending, so a double-click cannot flip twice. Clicking the title only edits, never toggles.
- **Hero mock stats.** The landing hero shows the real board screenshot (`public/board.png`); the fallback mock board no longer shows fake numbers ("3 of 5 done · Score 8.4 / 10" is gone).
- **Guest removal confirmed.** Zero matches for "Try the demo", "Continue as guest", "No setup for visitors", "no sign-up" or `demo@podium.app` anywhere in the repo; no `/guest` route. Landing CTAs are "Get started" and "View on GitHub".

### Clean code

- Zero `any` types (the last one, `pathForCommand(command: any)`, is now typed).
- `formatDay` delegates to `formatLocal` (one formatter, not two).
- `get-hackathon` reuses the shared `projectOutputSchema` and `scoreOutputSchema` instead of its own copies.
- MissionBoard row actions (Accept/Reject, reorder, delete) are disabled while pending; delete asks for confirmation.
- ImportBar submit is disabled after sending (until the URL changes).

### Tests

- 22 tests, 3 files (was 9 tests, 2 files). New `tests/podium-helpers.test.ts` covers the weighted total (official 40/20/20/20 rubric), board order (Build, Demo, Submission, Eligibility), deadline/timezone math (UTC storage, official Nov 9, 11:59 PM PT, local zone label), and `.ics` generation (one deadline event with the full name, UTC times, 24h and 2h alarms).
- `pnpm typecheck`, `pnpm agent-native:doctor` and `pnpm build` are clean.

### Not done (deliberate)

- Template leftovers (unused `ui/` components, i18n locales, template routes/actions, unused deps) are left in place: they are inert, and deleting framework template pieces risks breaking the app this close to the deadline. See AUDIT.md.
- `sameHackathonUrl`, `weakestCriterion` and `SEED_HACKATHON_URL` stay duplicated across the client/server boundary by design (client code cannot import server modules).
- The chat "Save failed" toast, sidebar duplicate titles and double-send guard live in the framework's chat template code, not in Podium's code; the template's own guards (`sentRef`, `retryStartedForRunsRef`) are present. No app-level change was made to framework chat code.
- Reset has no automated test (it needs a live database); it is covered by the fresh-account smoke test instead.

## 2026-10-10

### Fixed

- Large prompts with full context remain available to retry when sending fails.

## 2026-09-30

### Improved

- Chat uses a compact + menu with context submenus, keeps task, automation, and skill actions at the root, and omits Generate Image.

## 2026-09-27

### Fixed

- Chat retries the original request with its attachments after model setup.

## 2026-08-27

### Fixed

- Chat includes the runtime packages needed for provider keys after deployment.

For the full list of updates, see the [changelog folder](./changelog/).
