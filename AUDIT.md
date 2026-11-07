# Podium pre-submission audit (Nov 7, 2026, read-only, updated by the cleanup pass)

## Summary

The repo is in good shape for submission: no `console.*` and no TODO/FIXME/XXX in app code, zero `any` types, every `defineAction` action validates input with zod, guest mode is fully gone (zero matches), the seed deadline is UTC (`2026-11-10T07:59:00Z`) with the official 40/20/20/20 rubric, and tests pass (3 files, 22/22). Fixed in this pass: the ProjectDrawer `liveUrl` wipe (live URL field added), the Timeline timezone label (local time with zone label plus official Nov 9, 11:59 PM PT), the "Am I ready to submit?" readiness check, deterministic Apply top fix (adds a requirement), draft download as `.md`, score before/after on rescore, timezone and weighted-total tests, the last `any`, and the hero mock stats (no fake numbers). The real work left is template leftovers (dead UI components, i18n locales, routes, actions, unused deps) and thin test coverage for reset (needs a DB).

## 1. Dead code

- `app/components/ui/dropdown-menu.tsx`, `hover-card.tsx`, `item.tsx`, `separator.tsx` — zero imports anywhere.
- `app/i18n/` — 11 locale files plus `index.ts` are unreferenced; only `app/routes/observability.tsx:5` imports `en-US` directly.
- `actions/run.ts` — not an action, just `runScript()`; `actions/provider-api-request.ts` — Slack-only template action, unused by Podium.
- `actions/hello.ts`, `navigate.ts`, `view-screen.ts` — template actions, only listed in the agent allowlist at `server/plugins/agent-chat.ts:10-13`; no Podium UI calls them, but the agent skills call `view-screen`, so it stays.
- Template routes still registered via `flatRoutes` (`app/routes.ts`): `app/routes/database.tsx`, `observability.tsx`, `extensions.tsx`, `extensions.$id.tsx`, `extensions.$id.$slug.tsx`, `extensions._index.tsx`, `team.tsx`; nav mapping for them lives in `app/hooks/use-navigation-state.ts:88-119` and `app/components/layout/Layout.tsx:51-52`.
- `public/agent-native-icon-dark.svg`, `agent-native-icon-light.svg`, `agent-native-logo-dark.svg`, `agent-native-logo-light.svg` — unreferenced template branding (favicon/manifest use the Podium icon).
- Unused dependencies (no import in `app/`, `actions/`, `server/`; verify framework dynamic imports before removing): `node-pty`, `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`, `embla-carousel-react`, `vaul`, `react-day-picker`, `react-hook-form`, `react-resizable-panels`, `input-otp`, `@tailwindcss/typography`, `@openrouter/ai-sdk-provider`, `ai-sdk-ollama`, `@electric-sql/pglite`, `isbot`, `use-sync-external-store`, `zustand`, `postgres`, `@ai-sdk/anthropic`, `@ai-sdk/cohere`, `@ai-sdk/google`, `@ai-sdk/groq`, `@ai-sdk/mistral`, `@ai-sdk/openai`, and all 23 `@radix-ui/*` devDeps (zero imports; `app/components/ui/*` imports no radix). Used, keep: `@fontsource-variable/inter` (`app/global.css:1`), `cmdk`/`next-themes`/`@tanstack/react-query` (`app/root.tsx`), `h3` (`server/middleware/auth.ts`).
- Decision: template routes, actions, i18n locales and deps are left in place for this submission. They are inert (not linked from Podium UI), and deleting framework template pieces risks breaking the app this close to the deadline. The four unused `ui/` components are the only safe deletions and are listed for a later pass.

## 2. Duplicate logic

- `sameHackathonUrl` defined twice: `app/lib/podium.ts:207` and `server/db/seed.ts:26` (identical normalize logic). Left as is: client and server cannot share the module (the server copy lives in a server-only file; the client copy is in client code).
- `weakestCriterion` defined twice: `app/lib/podium.ts:218` and `server/db/podium.ts:146`. Same client/server boundary; left as is.
- `formatDay` now delegates to `formatLocal` (`app/lib/podium.ts`) — deduped in this pass.
- `SEED_HACKATHON_URL` defined twice: `server/db/seed.ts:23` and `app/routes/hackathon.$id.tsx:50`; `app/components/landing/LandingPage.tsx:16` holds the same value as `HACKATHON_URL`. Left as is: the route is client code and cannot import the server seed module.

## 3. Leftover template code

- Template routes and actions listed in §1; template skills in `.agents/skills/` (everything except Podium's `daily-brief`, `rubric-coach`, `rules-extraction`, `submission-writer`) are framework-provided docs, not Podium's — review before deleting, the framework may expect them.
- `server/plugins/otel.ts` and `server/middleware/auth.ts` are framework plumbing, in use.

## 4. console.log / warn / error

- None in `app/`, `actions/`, `server/`, `tests/`.

## 5. TODO / FIXME / XXX

- None (word-boundary search).

## 6. `any` types and unvalidated inputs

- Zero `any` types: the last one (`app/hooks/use-navigation-state.ts:125`, `pathForCommand(command: any)`) is now typed in this pass.
- All 27 `defineAction` actions carry a zod `schema`; `actions/provider-api-request.ts` has its own zod schema but no `defineAction`; `actions/run.ts` is a script entrypoint, not an action.

## 7. Async buttons missing loading / disabled / error toast

- Fixed in this pass: `MissionBoard.tsx` checkbox is disabled while its toggle is pending and the toggle is idempotent (explicit `done`); Accept/Reject, reorder and delete are disabled while pending; delete asks for confirmation. `ImportBar.tsx` submit is disabled after sending (until the URL changes). `RubricPanel.tsx` Apply top fix is disabled while adding.
- `RubricPanel.tsx` — "Score my project" and "Fix my weakest criterion" are `askAgent` calls with no feedback or disabled state (fire-and-forget by design; the agent replies in chat). Left as is.
- `app/components/home/HomePage.tsx` — seed failure has no error toast; it falls through to the empty state silently (`seedStarter` has no `onError`). Left as is: the empty state is the helpful copy.
- Good, no change needed: `DraftPanel.tsx` (Save disabled + toasts), `ProjectDrawer.tsx` (disabled + toasts + validation), `TimelinePanel.tsx` (downloading state + toasts), `hackathon.$id.tsx` Reset demo / Clear board (confirm + spinner + toasts).

## 8. Bugs, placeholders, feature gaps

- Fixed in this pass: `ProjectDrawer.tsx` now has a live-URL field (and the demo field is labelled Clips), so saving no longer wipes a live URL the agent set. `TimelinePanel.tsx` now shows the local time with its zone label plus the official "Nov 9, 11:59 PM PT". The hero mock stats are gone from the fallback (real copy, no fake numbers); the hero shows the real `public/board.png` screenshot. "Am I ready to submit?" is a `check-readiness` action plus a `submission-readiness` skill and a board button. "Apply top fix" now adds the fix as a requirement via `add-requirement` (the agent does the same through the rubric-coach skill). Draft download as `.md` is in `DraftPanel.tsx`. Rescore keeps the old score as `previousScore` and the board shows "Was X, now Y".
- Seed defines 5 requirements (`server/db/seed.ts:39-69`), not 7, so reset-demo restores 5 on an empty board, not 7; on the live board it restores the 7 real imported rules (they are kept, set open and accepted). It does not restore deleted milestones.
- "Save failed" toast on chat-tab close: no such string exists in app code; it comes from the framework's chat autosave, not Podium code. The guards that exist in the template (`sentRef` in `ChatInitialMessage`, `retryStartedForRunsRef` in `ChatRunFailure`) prevent double-sends; no app-level change was made to framework chat code.
- Double-send guard and chat-title dedupe: no guard/dedupe in app code (`ChatRouteContent.tsx`/`Sidebar.tsx` are framework template code); the fix lives in the framework toolkit, not this repo.
- Tests: `tests/export-calendar.test.ts`, `tests/whats-left.test.ts` and `tests/podium-helpers.test.ts` (22 tests). No test for reset (it needs a live DB) or the agent default model.

## Test result

`pnpm test`: 3 test files passed, 22 tests passed. `pnpm typecheck`: clean. `pnpm agent-native:doctor`: clean. `pnpm build`: clean.

## Top 5 highest-value cleanups

1. ~~Fix the ProjectDrawer `liveUrl` wipe~~ — done in this pass.
2. ~~Fix the TimelinePanel timezone label~~ — done in this pass.
3. Delete dead template code: the four unused `ui/` components, the 11 unused i18n locales, template routes/actions, `actions/run.ts`, the Slack provider action, and the four `agent-native-*.svg` files; prune unused deps after checking framework dynamic imports. Deferred: inert and risky to remove this close to the deadline; see §1.
4. ~~Dedupe `formatDay`/`formatLocal`~~ — done in this pass. `sameHackathonUrl`, `weakestCriterion` and `SEED_HACKATHON_URL` stay duplicated across the client/server boundary by design.
5. ~~Add the missing tests (weighted total, timezone math) and a double-submit guard on ImportBar plus pending states on MissionBoard row actions~~ — done in this pass. Reset still has no test (needs a live DB).
