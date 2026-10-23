# Bot Test Rooms and PvP Rooms Implementation Plan

> **For agentic workers:** follow this plan task-by-task and get a separate read-only review against this plan before publication.

**Goal:** Let a player create an ordinary PvP room or a test room filled with enough existing bots to start the selected supported game.

**Architecture:** Reuse room creation and the existing `ADD_TEST_BOTS` WebSocket action. Add a bot-test room query marker so the host client fills the lobby once on first state; authorize that action for the authenticated host, leaving capacity/game/lobby checks in `RoomManager`. Do not add bots to ordinary PvP rooms.

**Tech Stack:** FastAPI, Pydantic, Python 3.11+, React, TypeScript, Vite, Node test runner, pytest.

**Spec:** `docs/superpowers/specs/2026-10-23-bot-test-and-pvp-lobby-design.md`

## Global Constraints

- Preserve the current room creation request, WebSocket envelope, and `ADD_TEST_BOTS` payload shape.
- Bot test rooms are available only for What Number, You or Me, and Top100.
- Fill minimum player counts: two bots for What Number; one bot for You or Me and Top100.
- The authenticated host must initiate bot insertion; the human host must ready and start normally.
- Existing PvP create and join-by-code behavior stays intact. Do not alter Cardfight or Tic-Tac-Toe rules.
- Keep all changes within the agreed lobby/bot authorization scope; add focused tests before production code.

## Review Focus

- What Number has a three-player minimum and needs two bots for one human.
- Missing, mismatched, and non-host identities cannot add bots; host authorization does not become unauthenticated access.
- Unsupported games, full rooms, and non-lobby states reject bot insertion without crashing the socket.
- Reopening a bot-test room does not create duplicate bots; changing room codes resets room/socket/fill state.
- Ordinary PvP creation and game-catalog quick play never gain bots.

## Task 1: Allow authenticated hosts to add existing test bots

**Status:** Complete in `bddffb4`; `tests/test_rooms_api.py` passed (7 tests).

**Files:** `backend/app/main.py`, `backend/tests/test_rooms_api.py`.

**Test:** Add an API/WebSocket regression that creates a guest host and a second guest, proves the authenticated host can use `ADD_TEST_BOTS`, and proves missing/mismatched authentication receive `FORBIDDEN` while a non-host receives the existing `HOST_ONLY` error. Confirm the normal error envelope is sent and the socket remains usable.

**Code:** In the `ADD_TEST_BOTS` dispatch branch, require a non-null `authenticated_user` whose `id` equals `message.player_id`, then retain `rooms.add_test_bots(code, message.player_id, count)` so the room manager's host, game, capacity, and lobby checks remain authoritative. Missing or mismatched identity returns `FORBIDDEN`; an authenticated non-host keeps the manager's `HOST_ONLY` error.

**Verify:** Run `pytest -q tests/test_rooms_api.py` from `backend/`; `git diff --check`; commit `fix(rooms): allow authenticated hosts to add test bots`.

## Task 2: Add explicit lobby choices and one-time bot fill

**Status:** Implemented and independently reviewed PASS, including the route-change fix. Focused backend/frontend suites and production build pass; final full-suite integration check pending.

**Files:** `frontend/src/pages/index.tsx`, `frontend/src/pages/room.tsx`, `frontend/src/lib/roomModes.ts`, `frontend/tests/roomModes.test.mjs`.

**Test:** Verify `testBotCountFor(gameType)` returns 2 for `what_number`, 1 for `you_or_me` and `top100`, and `null` for `tictactoe` and `cardfight`. Verify `roomRouteFor(code)` defaults to an unmarked PvP route and `roomRouteFor(code, "bot-test")` adds the bot-test marker. Verify `roomSessionKey(code)` normalizes case and changes for distinct room codes. Verify `getTestBotFillDecision(input)` requests bots only for an unattempted, connected host in a bot-test LOBBY with one human and no bots; eligible states mark the attempt, while PvP, unsupported, disconnected, playing, non-host, existing-bot, multi-human, and already-attempted states never request bots.

**Code:** Add `roomRouteFor(code: string, mode: RoomMode = "pvp"): string`, `roomSessionKey(code: string): string`, and `getTestBotFillDecision(input: TestBotFillInput): { markAttempted: boolean; count: number | null }` in `frontend/src/lib/roomModes.ts`; use them from the hub and `RoomSession`. Key `RoomSession` by normalized room code so route changes replace socket and fill state. Keep selected-game creation. Label ordinary creation “Create PvP room”. Add “Test vs bot” and the approved explanation for the three supported games only. Bot-test creation uses the normal POST, then navigates to the helper's `/room/{code}?mode=bot-test` route; game-catalog quick play defaults to PvP. The host sends `ADD_TEST_BOTS` once using the helper's count. Existing bot presence or another player prevents auto-fill. Show pending/errors through existing room notification handling.

**Verify:** Run `node --test frontend/tests/roomModes.test.mjs`, run `npm run build` from `frontend/`, and `git diff --check`; manually inspect the lobby at desktop and phone widths if the local frontend is reachable. Commit `feat(lobby): add bot test and pvp room choices`.

## Final Gate

Independent read-only review of `bddffb4`, `61f5f3a`, and `dcffac7` passed. The isolated deterministic auth-test correction `925a0ab` also passed read-only review. Full backend suite passes (141 tests, 10 subtests); all six frontend Node test files pass; production build and `git diff --check` pass. Published to `origin/main` through `0c862bf`.
