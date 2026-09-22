# Session Handoff

## 1. Current Status
* **Active Task**: Stable turn rendering, cinematic phase banners, and focused penalty-card selection
* **State**: Ready for Test

## 2. Completed in this Session
* [x] Added the typed, framework-independent base game contract (`28a6e8f`).
* [x] Added the immutable Tic-Tac-Toe state machine and player-scoped views (`28a6e8f`).
* [x] Added unit coverage for legal play, invalid actions, wins, draws, and game-over behavior (`28a6e8f`).
* [x] Enforced strict Pydantic payload validation and added malformed-payload coverage (`ae6036f`).
* [x] Confirmed all Python source compiles and engine modules contain no networking or persistence imports.
* [x] Added the specified FastAPI, Uvicorn, WebSocket, HTTPX, Pydantic, and pytest dependency constraints (`db8da37`).
* [x] Completed the responsive Vite, React, strict TypeScript, and Tailwind frontend (`frontend` commit `5ee95aa`).
* [x] Added persistent guest profiles, room creation/joining, validated WebSocket envelopes, lobby controls, the interactive Tic-Tac-Toe board, notifications, and game result UI (`frontend` commit `5ee95aa`).
* [x] Passed frontend lint and production build with zero errors.
* [x] Added the FastAPI room REST API, development CORS, in-memory room lifecycle, and `/ws/rooms/{room_code}` endpoint (`39232ea`).
* [x] Connected the WebSocket protocol to player-specific Tic-Tac-Toe views with structured errors and malformed-message isolation (`39232ea`).
* [x] Passed 15 backend tests, strict mypy, Python compilation, engine purity scan, frontend lint, and frontend production build.
* [x] Guarded WebSocket callbacks against StrictMode cleanup, cleared stale connection errors on open, and gated transport-error rendering by live connection state (`frontend` commit `5e9afec`).
* [x] Verified the frontend passes the six-character `room_code` expected by backend route `/ws/rooms/{room_code}` and reran frontend lint/build successfully.
* [x] Added SQLite-backed guest/member authentication, PBKDF2 password hashing, signed bearer tokens, and `/api/auth/{guest,register,login,me}` endpoints (`52485d8`, `b52d63e`).
* [x] Added `AuthContext`, accessible onboarding modal, member/guest navbar, authenticated room identity, and redesigned responsive lounge/catalog (`frontend` commit `3915479`).
* [x] Passed 18 backend tests, strict mypy, frontend lint, and the frontend production build.
* [x] Added the pure, seeded `WhatNumberEngine` for 4-8 players with unique number/skill decks, thinking/attack/penalty phases, skills, elimination, timer reduction, and player-scoped anti-cheat views (`8f8c297`).
* [x] Added room support for `what_number`, ready test bots, bounded automatic bot attacks/penalties, and generic typed game-action routing (`8f8c297`).
* [x] Seeded the local admin account and exposed the typed `is_admin` profile flag (`8f8c297`).
* [x] Added the catalog entry, flexible 4-8 player lobby, host bot-fill control, timer, player/card table, guessing controls, skill dock, private intel, and action feed (`frontend` commit `47c3b66`).
* [x] Passed 8 focused What Number tests, all 27 backend tests, strict mypy, Python compilation, frontend ESLint, and the frontend production build.
* [x] Added signed-token WebSocket admin authorization, forced game-over metadata, isolated non-admin denial, and finished-room reset support (`ba7397d`).
* [x] Added the admin-only force-end control, confirmation prompt, forced-termination notice, and play-again/return controls (`frontend` commit `1978ca5`).
* [x] Passed all 28 backend tests, frontend ESLint, and the frontend production build.
* [x] Added a dependency-free, accessible CSS 3D `FlipCard` component and integrated animated number cards into a felt-and-wood virtual tabletop (`frontend` commit `5e6ab51`).
* [x] Added deal-in, card-flip, active-seat, urgent-timer, action-feed, controls, and modal motion with a reduced-motion fallback (`frontend` commit `5e6ab51`).
* [x] Passed frontend ESLint and the production TypeScript/Vite build; confirmed the generated CSS contains the expected 3D rotation and animation rules.
* [x] Extracted the responsive table presentation into `src/components/game/WhatNumberBoard.tsx`, with the local player pinned at the bottom and 1-7 opponents distributed across the upper ellipse and side rims (`frontend` commit `518cbc0`).
* [x] Consolidated turn status, timer, volunteering, action history, and private intel into a fixed-width right control sidebar while expanding the room viewport (`frontend` commit `518cbc0`).
* [x] Changed the guess input to start blank, added Enter submission, and validate whole numbers from 1-40 before sending `GUESS` (`frontend` commit `518cbc0`).
* [x] Passed frontend ESLint and the production TypeScript/Vite build after the component extraction and input behavior change.
* [x] Moved the four-player north/west/east seats to 50%/10%, 12%/50%, and 88%/50%; larger groups use an eased upper-ellipse calculation with flank detection at the outer 24% (`frontend` commit `05809fe`).
* [x] Changed north opponents to compact horizontal hands and west/east flank opponents to two-column vertical mini-grids, with an additional dense-card size for 7-opponent tables (`frontend` commit `05809fe`).
* [x] Replaced the oversized local-player panel with a bottom-3, centered, 38%-height-capped dock using fixed 56×80 number cards and compact horizontally scrolling skills (`frontend` commit `05809fe`).
* [x] Passed frontend ESLint and the production TypeScript/Vite build after the overlap fix.
* [x] Final session checkpoint: admin force-end (`ba7397d`, frontend `1978ca5`), CSS animated tabletop (`5e6ab51`), UNO-style layout and blank guess input (`518cbc0`), and adaptive overlap fix (`05809fe`) are committed with corresponding handoff updates.
* [x] Lowered the What Number engine and room minimum from four players to three, with regression coverage proving three are accepted and two are rejected (`5f36505`).
* [x] Updated the lobby readiness threshold, bot-fill action, game selector, and catalog copy for 3-8 players (`frontend` commit `bed2f33`).
* [x] Passed all 29 backend tests, frontend ESLint, and the production TypeScript/Vite build after the minimum-player change.
* [x] Added validated `SEND_CHAT` input and room-wide `CHAT_MESSAGE` broadcasts using the server-bound player identity (`dd4853e`).
* [x] Added ordered `GAME_EVENT` broadcasts for volunteering, timeout selection, guesses/outcomes, turn transitions, and skill use, while retaining player-filtered game-state broadcasts (`dd4853e`).
* [x] Added timestamped room action logs and an additive, idempotent SQLite `match_history` table that stores complete logs when a match finishes (`dd4853e`).
* [x] Changed room-code copying to copy only the normalized six-character code with a 2.5-second Thai confirmation toast (`frontend` commit `1965dfa`).
* [x] Replaced the What Number action feed with a live, auto-scrolling room chat and added the queued Thai center-screen game announcer (`frontend` commit `1965dfa`).
* [x] Passed all 31 backend tests, Python compilation, frontend ESLint, and the production TypeScript/Vite build after the interactive-room update.
* [x] Added a centered Thai target-selection modal listing only active opponents, including avatar, name, and unrevealed-card count (`frontend` commit `dc05256`).
* [x] Replaced the attack dropdown and number spinner with an explicit target badge, reselection control, digits-only text input, and range-gated Thai attack button (`frontend` commit `dc05256`).
* [x] Converted sequential game announcements into a newest-first, four-card notification stack with event emojis, smooth downward repositioning, and independent 3.5-second dismissals (`frontend` commit `dc05256`).
* [x] Re-ran frontend ESLint and the production TypeScript/Vite build successfully after the attack-flow refactor.
* [x] Removed the turn-counter React key that remounted the complete What Number board on every turn; timer and target selection now reset through turn-aware local state without recreating the table DOM (`frontend` commit `da11fee`).
* [x] Split major phase events into queued, cinematic center-screen banners while preserving the compact notification stack for attack, result, and skill events (`frontend` commit `da11fee`).
* [x] Added local-player penalty focus with a pulsing Thai warning, elevated rose-ringed card dock, and glowing Thai-tooltipped reveal choices (`frontend` commit `da11fee`).
* [x] Confirmed the WebSocket effect remains independent of turn/phase, then passed frontend ESLint and the production TypeScript/Vite build.

## 3. Pending & Next Steps
* [ ] Resume by browser-testing the latest frontend commit `05809fe` against a reachable local backend.
* [ ] Restore package-index/DNS access.
* [ ] Run `python3 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt` from `backend/`.
* [ ] Test two browser sessions through create, join, ready, start, legal/illegal move, and game-over flows.
* [ ] Browser-test guest onboarding, name change, registration, logout/login, and session restoration after refresh.
* [ ] Browser-test a complete What Number match, including each skill and the finished-game overlay.
* [ ] Browser-test the virtual tabletop at mobile and desktop widths, including card dealing, penalty reveal flips, active-seat glow, timer urgency, and reduced-motion mode.
* [ ] Browser-test the circular seat distribution with 3-8 players and confirm the blank guess input rejects empty/out-of-range values without sending an action.
* [ ] Browser-test force-ending both Tic-Tac-Toe and What Number games from the seeded admin account.
* [ ] Browser-test room-code clipboard contents, chat between separate browser profiles, and the full Thai announcer sequence once the local frontend is reachable from browser automation.
* [ ] Browser-test volunteer and timeout selection into the target modal, target reselection, spinner-free numeric filtering, and stacked attack/outcome notifications once the local frontend is reachable.
* [ ] Browser-test several complete turn transitions for table DOM stability, center-banner timing, and penalty dock elevation/restoration once the local frontend is reachable.

## 4. Known Issues & Notes
* Dependency installation failed because the environment could not resolve the package index, including after an approved unrestricted retry.
* On 2026-09-21, `npm install framer-motion` failed with `EAI_AGAIN` and the offline cache was unavailable. The animation task was subsequently completed with pure CSS3 and Tailwind utilities, so `framer-motion` is no longer required and no dependency metadata was changed.
* Backend tests ran successfully with a compatible cached local Python environment; the repository-local `.venv` still needs installation when registry access returns.
* Backend development command: `cd backend && uvicorn app.main:app --reload --port 8000`.
* Authentication uses `data/boardgame.db` by default. Set `BOARDGAME_DATABASE_PATH` and a strong `BOARDGAME_AUTH_SECRET` outside local development.
* The workspace root exposes an empty, non-writable `.git` mount. Git was therefore initialized under `backend/`, which contains all Step 1 implementation files and commits.
* The same root Git limitation required `frontend/` to use its own Git repository.
* Frontend setup: `cd frontend && npm install && npm run dev`. Production verification: `npm run lint && npm run build`.
* Frontend test flow: open `/`, set the guest name/avatar, create a room, join its six-character code in a second browser session, ready both players, start as host, exercise valid and invalid moves, and confirm the win/draw result UI.
* StrictMode regression behavior: intentional cleanup closes with code `1000`; cancelled socket callbacks cannot mutate state, and a successful replacement connection clears prior transport errors.
* Auth test flow: clear `auth_token`, reload to open onboarding, enter as a named/default guest, use the navbar to change name or register, log out, log back in, then refresh and confirm `/api/auth/me` restores the session.
* Seeded development admin credentials: username `admin`, password `admin123`. Change or remove this fixed credential before production deployment.
* Solo What Number test flow: run the backend and frontend commands below, log in as admin (or use a guest), choose **What number I have?**, create the room, mark yourself ready, click **Add Test Bots (Fill to 3)**, then start the game. Volunteer during THINKING; if a bot is selected when the timer expires, its guesses and any penalty reveal resolve automatically.
* What Number verification commands: `cd backend && pytest -v tests/test_what_number.py`; `cd frontend && npm run lint && npm run build`.
* Admin force-end flow: log in with the seeded admin account, join or create a room, and start the game. While the room status is `PLAYING`, click **Force End Game (Admin)** in the top bar and accept the confirmation. Every connected player receives a `FINISHED` state with no winner and sees **Game terminated by Admin**.
* After a forced or normal finish, the host or an admin can click **Play again** to reset the same room to `LOBBY`; **Return to lobby** exits to the platform hub.
* The force-end WebSocket request must carry the signed session token and sends `FORCE_END_GAME` through the existing game-action envelope. Non-admin requests receive only `FORBIDDEN: Only admin can force end the game` and do not interrupt other room clients.
* `frontend/package-lock.json` remains an untracked environment-generated file and was not included in feature commits.
* Live browser testing was unavailable because this environment rejects local port binding with `EPERM`; the same full flow passed through direct in-process ASGI HTTP and WebSocket sessions.
* For the overlap-fix session, the existing browser frontend was reachable but its development proxy could not reach the isolated backend (`Failed to fetch`), so live-room visual confirmation remains pending. Static geometry review and the compiled production build passed.
* Session ended with the backend worktree clean and no uncommitted frontend source changes. The only frontend worktree item is the previously documented untracked `package-lock.json`.
* Chat client request: `{"action":"SEND_CHAT","payload":{"text":"..."}}`. Text is trimmed, must contain 1-200 characters, and invalid chat receives an isolated `ERROR` envelope with code `INVALID_CHAT`.
* Chat server event: `{"event":"CHAT_MESSAGE","data":{"sender_id":"...","sender_name":"...","text":"...","timestamp":"<UTC ISO-8601>"}}`. Sender identity is taken from the joined socket, never from client payload.
* Game event server envelope: `{"event":"GAME_EVENT","data":{"event_type":"VOLUNTEER|TIMEOUT_PICK|ATTACK_GUESS|GUESS_CORRECT|GUESS_WRONG|TURN_END|TURN_START|SKILL_USED","actor_id":null,"actor_name":null,"target_id":null,"target_name":null,"value":null,"is_correct":null}}`. Applicable identity/value fields are populated; ordered events are broadcast immediately after the player-scoped state update.
* Completed matches are inserted into SQLite table `match_history` with match ID, room code, game type, start/finish timestamps, and JSON action logs. `INSERT OR IGNORE` makes retrying the same match ID safe; resetting a room starts a new match ID and clears the in-memory prior log only after it has been saved.
* Attack targeting is now explicit: entering local `ATTACK` with no selected target opens `TargetSelectionModal`; choosing a card closes it, and **เปลี่ยนเป้าหมาย** clears the selection to reopen it. A target that becomes eliminated is automatically invalidated. Skill targeting retains the prior first-active-opponent fallback and the WebSocket `GUESS` contract is unchanged.
* `GameAnnouncer` renders at most four active cards at `top-6`. New events are inserted at the top, keyed wrappers transition older cards downward, and each event begins fading/sliding out at 3.2 seconds before removal at 3.5 seconds.
* The board-flash root cause was `key={room.game.turn_counter}` on `WhatNumberGame`, which remounted the board and replayed `table-arrive`. That key is removed. The countdown stores its owning turn and derives the fresh turn duration immediately; target selection uses the same turn ownership pattern. The room socket still depends only on room code, stable profile fields, and token.
* Major events `TURN_START`, `VOLUNTEER`, `TIMEOUT_PICK`, and `TURN_END` now use a sequential center banner: 250 ms scale/fade entrance, 1.5 seconds fully visible, and 250 ms fade-out. Back-to-back turn-end/start events display in protocol order.
* During a local `PENALTY`, the board shows **คุณทายผิด! ต้องเลือกเปิดการ์ดของตัวเอง 1 ใบ**, elevates/scales the local dock, and marks each unrevealed card with a glow and **คลิกเพื่อเปิดการ์ดนี้** tooltip. The existing `REVEAL_OWN { card_id }` action is unchanged; the dock returns through a 300 ms transition after the phase changes.
