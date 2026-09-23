# Session Handoff

## 1. Current Status
* **Active Task**: Fix desktop/tablet bottom viewport cutoff and incomplete chat scrolling.
* **State**: Ready for Test

## 2. Completed in this Session
* [x] Constrained the room route to a single viewport-height flex shell, kept the shared navbar and room header from shrinking, and propagated `flex-1 min-h-0` through the room arena.
* [x] Removed the board's nested viewport height and 600px minimum; made the arena/mat fill their allocated height, compacted local cards and skill buttons, and reduced tablet flank spacing.
* [x] Changed the opponent entrance animation to use independent `scale`, preserving the translate transforms that center the flank pods.
* [x] Kept desktop chat input/header from shrinking while allowing only the message list to scroll; constrained the tablet drawer and HUD to the arena below the headers.
* [x] Verified final frontend `npm run build` (0 errors), `npm run lint`, and `git diff --check` after the layout, dynamic viewport cascade, and animation corrections.
* [x] Committed the layout implementation as `4fd9c39` (`fix(layout): resolve bottom viewport cutoff by using flex-1 min-h-0 and compacting player docks`) in `/tmp/TheBoardGame-layout-git` because workspace Git metadata is read-only.
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
* [x] Replaced chat sentinel `scrollIntoView()` with isolated message-list scrolling, preserved form submission prevention, locked the What Number session root against document scrolling, and verified `npm run build` plus `git diff --check`.
* [x] Committed the chat viewport fix as `377b77c` (`fix(chat): eliminate screen jumping on message reception by isolating scroll to chat container`).
* [x] Followed up with `5a68875` to retain the project-supported form event typing; `npm run lint` and `npm run build` pass.
* [x] Applied the Grand Tabletop Lounge theme: amber CTA system, slate glass panels, radial night backdrop, profile/status pill, catalog showcase cards, luxury felt table, active-turn halos, and tactile number cards.
* [x] Verified `frontend/npm run build`, `frontend/npm run lint`, and `git diff --check` pass.
* [x] Committed the UI theme as `11e4f69` (`style(ui): apply cohesive Grand Tabletop Lounge theme across navigation, catalog, and game arena`) in the temporary Git metadata because the workspace `.git` mount is read-only.

## 3. Pending & Next Steps
* [ ] Browser verification for this layout fix remains blocked: check 1920x1080, 1366x768, and iPad 1024x768. Verify all five local cards and skill buttons, both flank pods' bottom cards, desktop chat input/send, and open tablet chat input/send have bottom clearance. Repeat with a long chat history and the penalty dock active.
* [ ] Import the layout and handoff commits from `/tmp/TheBoardGame-layout-git` (or `/tmp/board-layout-fix.bundle`) into writable Git metadata before pushing; the workspace `.git` HEAD remains at `28daf7c`.
* [ ] Push the gameplay commit, handoff update, and prior rematch commits to `origin/main`.
* [ ] Perform a live deployment smoke test: use SWAP and PEEK/RADAR in a What Number match, confirm target names and private-only results, then click Play Again and confirm fresh cards, center clues, empty announcements, and the 120-second timer.
* [ ] Run the responsive What Number smoke test at iPad Mini (768x1024), iPad Air (820x1180), and laptop (1366x768) viewports against a reachable local/deployed build.
* [ ] Send and receive repeated chat messages in a browser and confirm only the inner message list scrolls while the game table remains stationary.
* [ ] Run the Grand Tabletop Lounge visual smoke test at desktop and tablet breakpoints; confirm contrast, card readability, and no clipped table controls.

## 4. Known Issues & Notes
* This session: `npm run dev -- --host 127.0.0.1` fails with `listen EPERM` on port 5173, including an escalated retry. The browser security policy also explicitly rejected the isolated `file:///tmp/board-layout-check/1366x768.html` fixture. No browser viewport checks were completed and no visual pass is claimed.
* The workspace `.git` remains read-only even with an escalated `git add` attempt. This layout task uses a copy of the current repository metadata at `/tmp/TheBoardGame-layout-git`, based on workspace HEAD `28daf7c`; it does not reuse the older rematch metadata history.
* Backend tests pass with `backend/venv/bin/pytest`; the plain `pytest` command and `backend/.venv` do not contain pytest.
* The local `.git` directory is read-only; commits are stored in `/tmp/TheBoardGame-rematch-git` until pushed.
* Push to `origin/main` may be blocked because this environment cannot resolve `github.com`; the rematch commit `e34cef3` is ready to push.
* The center event is emitted by the room adapter after `TURN_END` and before `TURN_START`, with the revealed number as a string value.
* A wrong guess checks `WhatNumberState.number_deck` (the remaining center draw pile). Matches move immediately to `revealed_center_cards`; non-matches emit `GUESS_HELD_BY_ANOTHER` without exposing the holder.
* The repository is Vite-based, so the requested `src/app/page.tsx` changes are implemented in `frontend/src/pages/index.tsx`; `Navbar.tsx` remains the shared shell.
* Backend tests may update `data/boardgame.db` as a test artifact; it is not part of this gameplay change.
* Push attempts (including escalated network access) are currently blocked by DNS resolution failure for `github.com`; commits `e34cef3`, `665bef1`, `5f868b6`, `238b8b3`, and `5f541b9` remain ready to push.
* The current sandbox also rejects Vite dev-server socket binding with `EPERM` on both `0.0.0.0:5173` and `127.0.0.1:5173`, so live browser viewport verification could not be run here; production build and lint checks pass.
