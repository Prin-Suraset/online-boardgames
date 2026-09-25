# Session Handoff

## 1. Current Status
* **Active Task**: Add an accessible guide book UI for the three playable games.
* **State**: Ready for Test (production build and lint pass; live browser review remains pending)

## 2. Completed in this Session
* [x] Added a scrollable `GameRulesModal` that renders `GAME_RULES` with game metadata and all rule sections. It supports Escape, backdrop close, focus trapping/return, and scroll locking.
* [x] Added guide buttons to each catalog card, beside the selected game in room creation, and in the room header so players can read rules during play.
* [x] Verified `cd frontend && npm run build`, `npm run lint` (0 errors; one existing Fast Refresh warning in `YouOrMeCard.tsx`), and `git diff --check`; committed as `76f485c` (`feat(ui): add accessible game rulebook modal`) in `/tmp/TheBoardGame-guide-ui-git.6GJko5/.git`.
* [x] Added `frontend/src/data/gameRules.ts` with conversational Thai rulebooks for Tic-Tac-Toe, What Number, and You or Me. Kept player counts, available center cards, ties, and early game endings aligned with the current engines.
* [x] Humanized game announcements, action prompts, skill and target dialogs, chat labels, room lobby and finish messages, connection notices, and card accessibility labels without changing action or payload contracts.
* [x] Verified `cd frontend && npm run build`, `npm run lint` (0 errors; one existing Fast Refresh warning in `YouOrMeCard.tsx`), and `git diff --check`.
* [x] Committed the copy changes as `762841e` (`feat(copy): humanize Thai game rules and in-game messages`) in `/tmp/TheBoardGame-thai-copy-git.10frzG/.git` because workspace Git metadata is read-only.
* [x] Grouped catalog cards into full-width carousel pages: three games on desktop, two cards on tablet, and one card on mobile. The next desktop page contains Custom Games, with page-based arrows and pagination dots.
* [x] Verified `cd frontend && npm run build` (0 errors), `npm run lint` (0 errors; one existing Fast Refresh warning), and `git diff --check`.
* [x] Committed the carousel fix as `a23c86b` (`fix(carousel): ensure 3 cards fill the carousel row on desktop viewports`) in `/tmp/TheBoardGame-carousel-git.axmTNY/.git` because the workspace `.git` index is read-only.
* [x] Replaced the Create a room game dropdown with a trigger and accessible selection modal for the three playable games, plus a disabled Custom Games preview.
* [x] Replaced the flat catalog grid with a horizontally snapping carousel, navigation arrows, pagination dots, and existing Play now room creation actions.
* [x] Centralized catalog labels and metadata in `frontend/src/lib/gameCatalog.ts` without changing game or WebSocket contracts.
* [x] Verified `cd frontend && npm run build` (0 TypeScript or compilation errors), relative-base production build, `npm run lint` (0 errors; one pre-existing Fast Refresh warning), and `git diff --check`.
* [x] Committed the UI implementation as `0ac9716` (`feat(ui): add GameSelectModal for room creation and convert game catalog to responsive carousel`) in `/tmp/TheBoardGame-ui-git.0tXzfP/repo/.git` because the workspace `.git` index is read-only.
* [x] Added the pure `YouOrMeEngine` with a 52-card deck, seven rounds, antes, hidden-card views, betting actions, folds, showdown settlement, ties, and overall winner calculation.
* [x] Registered `you_or_me` for 2–4 players in the room manager and schemas, including random bot card selection and betting heuristics.
* [x] Added the requested engine tests; focused tests pass 7/7 and the complete backend suite passes 45/45.
* [x] Added catalog registration, strict WebSocket parsing, the felt betting arena, card image/fallback rendering, hand selection, betting controls, and finish state UI.
* [x] Committed as `a3da1c3` (`feat(game): implement You or me who more than? betting game engine, bots, and poker table UI`) in temporary Git metadata because the workspace `.git` mount is read-only.
* [x] Added a typed `VITE_WS_URL` resolver with `wss://boardgames-backend-pzln.onrender.com` as its fallback.
* [x] Removed the WebSocket dependency on `window.location`, including the production Vercel host fallback.
* [x] Added strict Vite typing for `VITE_WS_URL` and verified the frontend production build, lint, and whitespace checks pass.
* [x] Confirmed the repository contains only one frontend `WebSocket` constructor and it uses the new resolver.
* [x] Committed the implementation as `677061f` (`fix(ws): force direct connection to Render backend at boardgames-backend-pzln.onrender.com`).
* [x] Added five public center clue cards at game start and one additional clue after every two completed turns.
* [x] Added player-view center cards, `CENTER_CARD_REVEALED` room events, client announcements, and the felt display.
* [x] Extracted the skill confirmation flow into `SkillConfirmModal.tsx` with localized descriptions, target selection, and explicit Confirm/Cancel actions.
* [x] Added engine and room-level regression tests for initial/periodic cards and reveal event ordering.
* [x] Frontend `npm run build`, lint, Python compilation, and whitespace checks pass.
* [x] Wrong guesses now reveal matching numbers from the remaining center draw pile and preserve player-held numbers as hidden.
* [x] Added `CENTER_REVEALED_FROM_GUESS` and `GUESS_HELD_BY_ANOTHER` room events with Thai announcements and regression tests.
* [x] Committed the implementation as `4a65f4e` (`feat(rules): reveal guessed number into center clues if present in draw deck on wrong guess`).
* [x] Added `Room.reset_for_rematch()` to destroy the old match state, clear action logs, and reset human/bot readiness to the lobby baseline.
* [x] Changed What Number starts to use a fresh room-generated seed, ensuring new hidden hands, skills, center cards, turn counter, and 120-second timer on every match.
* [x] Added `REMATCH` and `PLAY_AGAIN` WebSocket actions while retaining `RESET_ROOM` compatibility.
* [x] Reset frontend game inputs, timer, skill modal, notifications, and announcements across the rematch lifecycle; labeled the actions in Thai and English.
* [x] Backend `pytest -v` equivalent (`backend/venv/bin/pytest -v`) passes all 36 tests; frontend `npm run build` passes.
* [x] Committed the rematch implementation as `e34cef3` (`fix(gameplay): ensure Play Again completely resets engine and starts a fresh new match`) in temporary Git metadata because the workspace `.git` mount is read-only.
* [x] Added WebSocket coverage for the `REMATCH` action as `665bef1` (`test(gameplay): cover rematch websocket action`).
* [x] Applied responsive lobby containers and catalog grid rules to the Vite hub and navbar (`max-w-7xl`, `px-4 sm:px-6 lg:px-8`, and one/two/three-column breakpoints).
* [x] Made the What Number table use a dynamic viewport-height shell, compact `lg`/`xl` table scaling, smaller player pods, a `w-72`/`lg:w-80` sidebar, and a `top-[42%]` center anchor to preserve hand clearance.
* [x] Fixed SWAP to require an active target, replace the target's unrevealed card, and return the old number to the remaining deck; room events now carry the target display name.
* [x] Formatted RADAR/PEEK private results with room display names and a safe fallback that never exposes raw guest IDs.
* [x] Moved private skill results beside the local hand with larger glowing dismissible cards, added an 8-second auto-dismiss, and added a local-only 7.5-second holographic PEEK ghost card.
* [x] Added SWAP target selection to the skill confirmation flow and regression coverage for target replacement and guest-ID-safe private results.
* [x] Verified `backend/venv/bin/pytest -v` (38 passed), `backend/venv/bin/pytest -v backend/tests/test_what_number.py` (17 passed), `npm run lint`, `npm run build`, and `git diff --check`.
* [x] Committed the gameplay implementation as `5f868b6` (`fix(gameplay): optimize responsive multi-device layout, fix swap skill target, relocate radar/peek results, and add peek ghost silhouette`).
* [x] Rebuilt the What Number arena as a full-width/full-height layout below `xl` (1280px), retaining the static sidebar only at `xl` and above.
* [x] Added the compact tablet/mobile top HUD, floating chat toggle, right-side slide-over `ChatDrawer` with backdrop/Escape close behavior, unread badge, and responsive center/player spacing.
* [x] Added `scale-85` to the Tailwind theme, compact clue cards, flank/top opponent anchors, wrapped display names, and responsive local card sizes.
* [x] Verified frontend `npm run build`, `npm run lint`, and `git diff --check`; committed as `ee63be2` (`refactor(responsive): implement full-width table with slide-over chat drawer and top HUD for tablet/mobile viewports`).
* [x] Pinned the left opponent pod to the table edge at `xl`, preserved all tablet/mobile positioning rules, extended toast notifications to 5 seconds with a 300ms exit transition, verified `npm run build` and `git diff --check`, and committed the requested implementation as `27cc33f` (`fix(ui): align left player pod to table edge on desktop and extend notification duration to 5s`).
* [x] Corrected the Tailwind desktop utility cascade so the explicit left-edge anchor overrides the previous variable anchor; the correction is included with this handoff update.
* [x] Applied the Grand Tabletop Lounge visual system: radial indigo mesh, amber CTAs, glass panels, guest/member profile pills, tabletop catalog cards, felt arena, active-turn halos, and tactile number cards.
* [x] Committed the final UI pass as `c6e5a64` (`style(ui): apply cohesive Grand Tabletop Lounge theme across navigation, catalog, and game arena`).
* [x] Added the scalable golden die favicon at `frontend/public/favicon.svg` and linked it from `frontend/index.html`; committed as `b75cec5` (`feat(ui): add Grand Tabletop Lounge favicon`).
* [x] Added `getCardImagePath` and mapped You or me cards to the exact fantasy card assets, including numeric, animal-label, Thai-label, hidden-card, and fallback cases; committed as `a68833b` (`fix(ui): map You or me cards to fantasy assets`) in temporary Git metadata.
* [x] Rebuilt `YouOrMeBoard.tsx` as an authentic oval casino poker table with padded amber rail, emerald felt, gold racetrack, radial 2–4 player seating, center pot/round display, hidden showdown cards, bottom hand dock, and floating casino betting controls; committed as `f393664` (`style(poker): transform You or me who more than? into authentic oval casino poker table`), with the requested Coins seat-label polish in `76c24f0`.
* [x] Preserved `SELECT_CARD`, `CHECK`, `CALL`, `BET`, and `FOLD` dispatches, reused the existing fantasy card image resolver, and added face-down presentation plus deal/showdown animations without changing backend payload contracts.
* [x] Added a card placement confirmation modal with enlarged artwork, Thai/English confirm and cancel actions, and deferred `SELECT_CARD` dispatch; replaced the betting number input with a sanitized spinner-free numeric text field.
* [x] Committed as `4cd4c8c` (`feat(gameplay): confirm card placement and sanitize bet input`) in temporary Git metadata because the workspace `.git` mount is read-only.
* [x] Removed the poker slogan and oversized table title, moved the round indicator into the center pot badge, and rebuilt the poker board as a bounded flex viewport with the table and local hand visible together.
* [x] Added the existing live room `ChatBox` to the `xl` desktop sidebar and the existing `ChatDrawer` to tablet/mobile, wired through the established `CHAT_MESSAGE` and `SEND_CHAT` WebSocket flow.
* [x] Committed as `34da4e6` (`refactor(poker): remove oversized title banner to fit table on screen and integrate live room chat`) and `4be4f14` (`fix(poker): remove remaining slogan and tighten mobile arena height`) in temporary Git metadata.
* [x] Closed the missing `<main>` element in `frontend/src/components/game/YouOrMeBoard.tsx`, resolving the reported JSX parser cascade; committed as `6ca47a2` (`fix(ui): close You or Me board main element`) in temporary Git metadata.
* [x] Removed the remaining extra closing `<div>` that closed the outer board container before `</main>`, fixing the actual JSX nesting error; committed as `e537ffb` (`fix(ui): correct You or Me JSX container nesting`) in temporary Git metadata.

* [x] Set the ante to 10 coins, preserved folded cards face-down while revealing active showdown cards, added the structured `ROUND_RESULT` event, and added the five-second showdown hold with centered Thai round/elimination/game-over announcements; committed as `0a73553` (`feat(rules): set ante to 10 coins, add 5s showdown card reveal, and show round result popups`) in temporary Git metadata.
* [x] Updated You or Me regression tests for the 10-coin ante, folded-card privacy, showdown transitions, and last-player-standing completion.
* [x] Verified `frontend/npm run build`, `frontend/npm run lint` (0 errors; one existing Fast Refresh warning), Python compilation, and `git diff --check`.
* [x] Replaced the squashed poker table with a fluid flex-height arena, integrated the compact in-table hand dock, repositioned the pot and player pods, and added tablet card sizing; committed as `188df98` (`refactor(poker-layout): fix squashed table on tablet by integrating compact hand dock and fluid sizing`).
* [x] Verified `cd frontend && npm run build`, `npm run lint` (0 errors; one existing Fast Refresh warning), and `git diff --check` for the responsive poker layout.
* [x] Refactored `YouOrMeBoard.tsx` to use a full-width felt mat with non-overlapping opponent, center pot, and local player flex tiers; removed the absolute seat offsets and `max-w-5xl` desktop constraint.
* [x] Verified `cd frontend && npm run build` (passes), `npm run lint` (0 errors; one existing Fast Refresh warning), and `git diff --check`; committed as `ecaa5bd` (`refactor(layout): switch poker table interior to 3-tier flexbox to eliminate overlaps and restore full desktop width`) in temporary Git metadata.
* [x] Inspected the deployed room in Chrome at desktop size; it is still serving the older narrow-table build, so it does not validate this local refactor.
* [x] Added the exact You or me showdown sequence: a card-reveal banner, 3000ms card inspection, 4000ms winner-result hold, then `SHOWDOWN_COMPLETE` transition; committed as `07fc77b` (`feat(poker): implement 3s showdown inspection delay, 4s winner hold, and enforce 100% card opacity`) in temporary Git metadata.
* [x] Removed folded-player opacity/grayscale styling from the poker card pod and enforced `opacity-100 brightness-100 contrast-100` on card containers and artwork.
* [x] Verified `cd frontend && npm run build`, `npm run lint` (0 errors; one existing Fast Refresh warning), and `git diff --check`.
* [x] Removed the placed-slot tint and pod backdrop blur, removed native disabled-card styling, enforced `pointer-events-none` for non-selectable cards, and added explicit `z-10` card/artwork stacking; committed as `9fc5122` (`fix(visuals): remove dark overlay on placed card slot and eliminate conditional dimming of played cards`) in temporary Git metadata.
* [x] Verified `cd frontend && npm run build`, `npm run lint` (0 errors; one existing Fast Refresh warning), `git diff --check`, and a live card-placement smoke test showing the placed card-back remains bright without a dim mask.

## 3. Pending & Next Steps
* [ ] Sync guide book UI commit `76f485c` and this handoff update from `/tmp/TheBoardGame-guide-ui-git.6GJko5/.git` into writable repository Git metadata before pushing.
* [ ] Browser-check the guide book from all three catalog cards, the room creation card, and the room header at desktop and mobile sizes; verify long Thai sections scroll and focus returns after close.
* [ ] Sync commit `762841e` and this handoff update from `/tmp/TheBoardGame-thai-copy-git.10frzG/.git` into writable repository Git metadata before pushing.
* [ ] Review Thai copy in a live room at desktop and mobile widths, especially long announcement banners and the betting controls.
* [ ] On a reachable local or deployed build, verify the first desktop page shows Tic-Tac-Toe, What number I have?, and You or me who more than? side-by-side; `>` reveals Custom Games and `<` returns to the first page. Check the two-card tablet and one-card mobile layouts.
* [ ] Sync the carousel commit and handoff update from `/tmp/TheBoardGame-carousel-git.axmTNY/.git` into writable repository Git metadata before pushing.
* [ ] Browser-smoke the new hub UI on a reachable build: open/close the modal, choose each playable game, confirm the Create a room trigger updates, and use carousel arrows, dots, and touch/trackpad scrolling at desktop and mobile widths.
* [ ] Sync the temporary UI commit and this handoff update into writable repository Git metadata before pushing.
* [ ] Push the gameplay commit, handoff update, and prior rematch commits to `origin/main`.
* [ ] Perform a live deployment smoke test: use SWAP and PEEK/RADAR in a What Number match, confirm target names and private-only results, then click Play Again and confirm fresh cards, center clues, empty announcements, and the 120-second timer.
* [ ] Run the responsive What Number smoke test at iPad Mini (768x1024), iPad Air (820x1180), and laptop (1366x768) viewports against a reachable local/deployed build.
* [ ] Perform a browser smoke test at desktop and tablet/mobile sizes, including table/hand viewport fit and chat send/receive between players.
* [ ] Perform the requested live tablet landscape smoke test at 1024x768 and 1280x800 when a reachable local/deployed game session is available; the local Vite server is currently blocked by sandbox `listen EPERM` on `127.0.0.1:5173`.
* [ ] Perform the live showdown browser smoke test: confirm the banner/cards at 0s, winner popup at 3s, 4-second popup hold, and clean next-round/game-over transition.
* [ ] Install backend requirements and run `pytest -v backend/tests/test_you_or_me.py`; this workspace currently has no `pytest` executable or installed `pydantic` package.

## 4. Known Issues & Notes
* The guide book UI now renders `frontend/src/data/gameRules.ts` without changing game or WebSocket contracts.
* Local Vite startup still fails with `listen EPERM` on `127.0.0.1:5173` in both sandboxed and escalated runs, so live browser verification of the new modal could not run here.
* The repository `.git` index is mounted read-only even with escalation, so the copy commit and handoff commit are stored in temporary Git metadata.
* The local Vite server fails with `listen EPERM` on `127.0.0.1:5173` even after escalation. Chrome's browser URL policy blocks opening the local `file://` production build, so the requested live browser verification could not be completed here.
* For this UI task, local Vite startup failed with `listen EPERM` even after an approved escalation. Browser security policy also blocked opening the local `file://` production build, so live interaction checks remain pending.
* The requested `page.tsx` is `frontend/src/pages/index.tsx` in this Vite repository; no Next.js app directory exists.
* The new game is integrated through the existing `backend/app/rooms.py` room manager; this repository does not contain `backend/app/engine/room.py`.
* The existing frontend is Vite-based, so the catalog and room wiring are in `frontend/src/pages/index.tsx` and `frontend/src/pages/room.tsx`.
* `pytest -v backend/tests/test_you_or_me.py` could not run directly because no project pytest executable is installed; the same command ran via the available FastAPI virtualenv and passed 7/7. The full backend suite passed 45/45 there.
* `npm run build` is currently blocked because `frontend/node_modules` is absent; offline `npm ci` cannot find the uncached `zod-validation-error` package.
* Backend tests pass with `backend/venv/bin/pytest`; the plain `pytest` command and `backend/.venv` do not contain pytest.
* The local `.git` directory is read-only; commits are stored in `/tmp/TheBoardGame-rematch-git` until pushed.
* Push to `origin/main` may be blocked because this environment cannot resolve `github.com`; the rematch commit `e34cef3` is ready to push.
* The center event is emitted by the room adapter after `TURN_END` and before `TURN_START`, with the revealed number as a string value.
* A wrong guess checks `WhatNumberState.number_deck` (the remaining center draw pile). Matches move immediately to `revealed_center_cards`; non-matches emit `GUESS_HELD_BY_ANOTHER` without exposing the holder.
* The repository is Vite-based, so the requested `src/app/page.tsx` changes are implemented in `frontend/src/pages/index.tsx`; `Navbar.tsx` remains the shared shell.
* Backend tests may update `data/boardgame.db` as a test artifact; it is not part of this gameplay change.
* Push attempts (including escalated network access) are currently blocked by DNS resolution failure for `github.com`; commits `e34cef3`, `665bef1`, `5f868b6`, `238b8b3`, and `5f541b9` remain ready to push.
* The current sandbox also rejects Vite dev-server socket binding with `EPERM` on both `0.0.0.0:5173` and `127.0.0.1:5173`, so live browser viewport verification could not be run here; production build and lint checks pass.
* For the current theme pass, `frontend/node_modules` was absent. Both sandboxed and escalated `npm ci --no-audit --no-fund` attempts failed resolving `registry.npmjs.org` with `EAI_AGAIN`; the requested build therefore could not be executed in this session. `git diff --check` passes.
* The main `.git` mount is read-only. The theme commit is recorded in `/tmp/TheBoardGame-rematch-git/.git` as `c6e5a64`; sync or push it when repository Git metadata is writable.
* The current frontend dependency install is incomplete (`tsc` and `eslint` are unavailable), so the favicon change could only be verified with `git diff --check` in this session.
* The fantasy card mapping change was verified with `git diff --check` and an exact asset filename inventory; frontend build/lint remain unavailable until dependencies are installed.
* The oval poker table refactor is committed in temporary Git metadata as `f393664`. `git diff --check` passes; `npm ci --offline` cannot resolve uncached `zod-validation-error`, and the normal install was interrupted after registry access stalled.
* The poker layout/chat update's required `frontend/npm run build` verification is currently blocked because `frontend/node_modules` is absent and `tsc` is unavailable; `git diff --check` passes.
* The JSX fix passes `git diff --check`; the production build could not proceed because `frontend/node_modules/.bin/tsc` is absent.
* The corrected JSX structure passes `git diff --check`; frontend build verification remains pending until dependencies are available.
* The requested backend test command could not start in this session: `pytest` and `backend/venv/bin/pytest` are absent, and system Python has no `pydantic`; Python bytecode compilation succeeds.
* Frontend dependencies are available now; the requested production build passes, and lint reports only the existing `react-refresh/only-export-components` warning in `YouOrMeCard.tsx`.
* The new gameplay commit is recorded as `0a73553` in `/tmp/TheBoardGame-rematch-git/.git` because the workspace `.git` index is read-only.
* Browser smoke verification for the showdown pacing could not run in this session because the CUA browser kernel exited before exposing a tab; production build and static timing/style checks pass.
* The placed-card visual smoke test used the existing live room and confirmed the bright card-back presentation, but that deployment still exposes the previous native disabled-card accessibility state; verify the new `pointer-events-none` behavior after deployment.
