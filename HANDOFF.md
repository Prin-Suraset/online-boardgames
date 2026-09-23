# Session Handoff

## 1. Current Status
* **Active Task**: Verify and ship the Play Again / rematch lifecycle for What Number I Have.
* **State**: Ready for Test

## 2. Completed in this Session
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

## 3. Pending & Next Steps
* [ ] Push `e34cef3` and the handoff update to `origin/main`.
* [ ] Perform a live deployment smoke test: finish a What Number match, click Play Again, start the rematch, and confirm fresh cards, center clues, empty announcements, and the 120-second timer.

## 4. Known Issues & Notes
* Backend tests pass with `backend/venv/bin/pytest`; the plain `pytest` command and `backend/.venv` do not contain pytest.
* The local `.git` directory is read-only; commits are stored in `/tmp/TheBoardGame-rematch-git` until pushed.
* Push to `origin/main` may be blocked because this environment cannot resolve `github.com`; the rematch commit `e34cef3` is ready to push.
* The center event is emitted by the room adapter after `TURN_END` and before `TURN_START`, with the revealed number as a string value.
* A wrong guess checks `WhatNumberState.number_deck` (the remaining center draw pile). Matches move immediately to `revealed_center_cards`; non-matches emit `GUESS_HELD_BY_ANOTHER` without exposing the holder.
