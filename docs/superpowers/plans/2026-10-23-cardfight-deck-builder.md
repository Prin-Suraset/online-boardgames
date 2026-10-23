# Cardfight Deck Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Cardfight deck building to a standalone page, keep only saved-deck selection in room setup, and provide account sync plus portable deck sharing.

**Architecture:** First deliver and review a responsive UI prototype for `/decks/cardfight` and the compact room picker before implementing persistence. After visual acceptance, add strict authenticated REST endpoints and an owner-scoped SQLite repository with optimistic revisions. Reuse the existing card browser and deck validation; a typed client hook chooses account storage for members and local storage for guests. Share codes encode only deck data and import as drafts. Existing room submission remains `CF_SUBMIT_DECK`.

**Tech Stack:** FastAPI, Pydantic v2 strict models, SQLite, React/TypeScript, Vite, browser localStorage and Clipboard API. No dependency additions.

**Spec:** [2026-10-23-cardfight-deck-builder-design.md](../specs/2026-10-23-cardfight-deck-builder-design.md)

## Global Constraints

- “Account cloud saves are for registered accounts; guest saves remain local.”
- “The code is portable text, not encrypted or secret; it grants no access to the sender's account.”
- “Do not change existing schemas or TypeScript room action interfaces.”
- “Preserve private deck submission and never expose a player's saved deck to other room participants.”
- “Keep the builder usable at PC, tablet, and phone widths; maintain keyboard access, visible focus, labels, and existing card inspection behavior.”
- Root `AGENTS.md` requires a committed `HANDOFF.md` update whenever work is paused and strict typing without `any`.

## Review Focus

- Member A cannot list, overwrite, or delete Member B's deck: owner filters apply to every repository operation and inaccessible IDs share the same 404 behavior.
- Two tabs saving the same deck cannot silently clobber one another: stale revisions produce `409 DECK_REVISION_CONFLICT` and preserve the server copy.
- Invalid, oversized, wrong-game, and unsupported share codes fail as a draft-import error without changing saved decks or room state.
- Guest saves never appear as account-synced; registered room pickers list cloud decks and local saves require explicit import.
- A stale catalog or incomplete deck may be saved as work-in-progress but cannot bypass existing authoritative room submission validation.

## File Map

- `backend/app/cardfight_decks.py`: SQLite table and owner-scoped repository operations, outside the engine.
- `backend/app/api/cardfight_decks.py`: strict request/response models, bearer authentication, guest rejection, structured errors, CRUD routes.
- `backend/app/main.py`: instantiate the deck repository against the existing auth database and register the router.
- `frontend/src/lib/areaDecks.ts`: bounded versioned share-code codec using the existing `CardfightDeck` guard.
- `frontend/src/lib/cardfightDeckApi.ts`: strict response guards and typed authenticated CRUD functions.
- `frontend/src/components/cards/useCardfightDecks.ts`: member cloud/local guest storage selection, refresh, save, delete, and explicit local migration.
- `frontend/src/components/cards/DeckWorkshop.tsx`: keep card browsing/editing/validation; receive persistence and share callbacks instead of owning room submission or storage selection.
- `frontend/src/pages/CardfightDecksPage.tsx`: standalone library, builder, cloud revision conflict, import/export/share, and local-to-account migration UI.
- `frontend/src/App.tsx`, `frontend/src/components/Navbar.tsx`: route and global Decks entry.
- `frontend/src/components/cards/CardfightSetup.tsx`: replace embedded editor with saved-deck picker, selected deck validation summary, and submission.
- `frontend/src/components/cards/cardfight.css`: standalone page and compact picker styles with responsive states.
- `HANDOFF.md`: record progress, blockers, and committed task boundaries.

## API Contract for Implementation

- `GET /api/cardfight/decks` -> `{ "decks": SavedCardfightDeck[] }`.
- `POST /api/cardfight/decks` body `{ "deck": CardfightDeckDefinition }` -> 201 `SavedCardfightDeck`.
- `PUT /api/cardfight/decks/{deck_id}` body `{ "deck": CardfightDeckDefinition, "expected_revision": int }` -> `SavedCardfightDeck`; stale revision -> 409 `{ "detail": { "code": "DECK_REVISION_CONFLICT", "message": string } }`.
- `DELETE /api/cardfight/decks/{deck_id}` -> 204; missing and other-owner IDs both return structured 404.
- `SavedCardfightDeck` is `{id: string, revision: int, deck: CardfightDeckDefinition, created_at: string, updated_at: string}`.
- `CardfightDeckDefinition` is strict `{game_id: "cardfight", catalog_version: str[1,64], name: str[1,80], main: int[1..2147483647][], ride: int[1..2147483647][], extra: int[1..2147483647][], starter_index: int[0..255] | null}`. Array limits are main256, ride16, extra64. Saving permits incomplete decks; existing room submission is authoritative for playable validation.
- Each route validates the existing bearer token and derives the owner ID from it. Cloud endpoints reject guests with `403 ACCOUNT_REQUIRED`.
- Storage identity is `(owner_id, deck_id)`; deck names need not be unique. Revision starts at 1 and increments transactionally. `PUT` must compare-and-swap against `expected_revision`.

## Tasks

### Task 0: Standalone deck and room-picker visual prototype

**Files:**
- Create `frontend/src/pages/CardfightDeckPreview.tsx` and `frontend/src/pages/cardfight-decks.css`.
- Modify `frontend/src/App.tsx` and `frontend/src/components/Navbar.tsx` for a review route and global entry.
- Update `HANDOFF.md`.

- [x] Add a separate responsive deck page with library, card browser, deck summary, and visual controls using the existing card catalog assets.
- [x] Add a room-picker preview that demonstrates selecting a saved deck without embedding the builder in the room.
- [ ] Open the preview locally for owner PC/tablet/phone visual review. Do not start cloud persistence, room contract changes, or replace the current setup until the visual direction is accepted.
- [ ] Commit the preview and handoff checkpoint.

**Stop condition:** Owner reviews the visual prototype and confirms direction; adjust the UI before continuing to API/storage tasks.

### Task 1: Owner-scoped cloud repository and REST contract

**Files:**
- Create `backend/app/cardfight_decks.py`.
- Create `backend/app/api/cardfight_decks.py`.
- Modify `backend/app/main.py`.
- Update `HANDOFF.md`.

**Interfaces:**
- Produces `CardfightDeckStore(database_path: Path)`, `list_for_owner(owner_id: str) -> list[SavedCardfightDeckRecord]`, `create_for_owner(owner_id: str, deck: CardfightDeckDefinition) -> SavedCardfightDeckRecord`, `replace_for_owner(owner_id: str, deck_id: str, expected_revision: int, deck: CardfightDeckDefinition) -> SavedCardfightDeckRecord`, and `delete_for_owner(owner_id: str, deck_id: str) -> bool`.
- Router factory `create_cardfight_decks_router(auth: AuthService, store: CardfightDeckStore) -> APIRouter`.

- [ ] Add strict Pydantic models and a table migration that is safe when the database already contains users and match history.
- [ ] Implement SQLite operations scoped by owner and ID; compare revisions inside a write transaction and increment only on successful replacement.
- [ ] Add authenticated CRUD routes; use structured `ACCOUNT_REQUIRED`, `DECK_REVISION_CONFLICT`, and not-found errors. Never accept owner ID from request data.
- [ ] Register the router using the same database path and `AuthService` already constructed by `create_app`.
- [ ] Commit backend/API work with a conventional `feat(cardfight-decks): ...` message and checkpoint `HANDOFF.md`.

### Task 2: Typed deck API client and share-code codec

**Files:**
- Create `frontend/src/lib/cardfightDeckApi.ts`.
- Modify `frontend/src/lib/areaDecks.ts`.
- Modify `frontend/src/types/cardfight.ts` only for the new HTTP DTOs; leave room action/view interfaces unchanged.
- Update `HANDOFF.md`.

**Interfaces:**
- `encodeCardfightShareCode(deck: CardfightDeck): string` returns `CF1:` plus base64url-encoded UTF-8 JSON.
- `decodeCardfightShareCode(code: string): CardfightDeck` rejects codes over 16 KiB, unsupported prefixes, invalid base64/UTF-8/JSON, wrong game IDs, and shapes rejected by `isCardfightDeck`.
- Typed functions `listCardfightDecks(token)`, `createCardfightDeck(token, deck)`, `updateCardfightDeck(token, id, expectedRevision, deck)`, and `deleteCardfightDeck(token, id)` parse responses from the API contract.

- [ ] Define response guards for every saved-deck response and reject malformed server payloads.
- [ ] Implement UTF-8-safe base64url encode/decode, enforce prefix and 16 KiB limit before decoding, and preserve the source deck without normalization beyond JSON data.
- [ ] Wire bearer headers and map structured API failures, including a distinct stale-revision error.
- [ ] Commit the typed helpers and API contract client.

### Task 3: Storage hook and standalone Decks page

**Files:**
- Create `frontend/src/components/cards/useCardfightDecks.ts`.
- Create `frontend/src/pages/CardfightDecksPage.tsx`.
- Modify `frontend/src/components/cards/DeckWorkshop.tsx`.
- Modify `frontend/src/App.tsx`, `frontend/src/components/Navbar.tsx`, and `frontend/src/components/cards/cardfight.css`.
- Update `HANDOFF.md`.

**Interfaces:**
- `useCardfightDecks()` selects authenticated cloud storage for registered users and existing localStorage storage for guests; exposes typed `decks`, `loading`, `error`, `refresh`, `save`, and `remove` operations.
- Standalone page is routable at `/decks/cardfight`, reachable from global navigation before a room exists.
- `DeckWorkshop` takes selected draft/persisted-deck metadata and explicit callbacks; it no longer submits directly to a room.

- [ ] Build the page around the existing catalog and builder; retain card search, filters, section editing, starter selection, validation, inspection, sample deck, and file import/export.
- [ ] Implement new/save/update/delete library flows. Include revision conflict recovery with “Reload cloud deck” and “Save as copy”; never retry stale writes automatically.
- [ ] For registered users, show device-local saves in a separate import area; require explicit Keep both (rename copy), Replace account copy, or Skip for each name collision. Keep local source data after migration.
- [ ] For guests, keep saves in the existing versioned localStorage key and identify them as device-local.
- [ ] Add route and navigation entry; style the page for PC, tablet, and phone without hiding focus or essential actions.
- [ ] Commit the page/storage refactor and checkpoint HANDOFF.

### Task 4: Compact room deck picker

**Files:**
- Modify `frontend/src/components/cards/CardfightSetup.tsx`.
- Modify `frontend/src/components/cards/cardfight.css`.
- Update `HANDOFF.md`.

**Interfaces:**
- The room picker consumes saved deck definitions from `useCardfightDecks()`; members see account decks and guests see local decks.
- Preserve existing `CardfightSetupAction` and `CF_SUBMIT_DECK` payload unchanged.

- [ ] Remove embedded `DeckWorkshop` and replace it with a labeled saved-deck selector, selected deck name/section counts/validation messages, and explicit Submit deck button.
- [ ] Leave profile selection, first player, ready/start, spectator notice, and server diagnostics intact.
- [ ] Disable submit while disconnected, no profile is selected, catalog version differs, or existing client validation fails; keep server validation authoritative.
- [ ] Show a clear path to manage decks from the global navigation when no cloud/local deck exists, without embedding editor controls in room setup.
- [ ] Commit the room picker and update HANDOFF.

### Task 5: Share and import flow, integration review

**Files:**
- Modify `frontend/src/pages/CardfightDecksPage.tsx` and `frontend/src/components/cards/DeckWorkshop.tsx`.
- Modify `frontend/src/components/cards/cardfight.css`.
- Update `HANDOFF.md`.

- [ ] Add copy share code and paste/import draft controls. Clipboard failure leaves the code selectable and does not block export.
- [ ] Ensure share-code import never saves to an account or submits to a room automatically; show validation for stale catalogs and unknown cards.
- [ ] Preserve JSON and legacy `.prfl` file export/import behavior on the standalone page.
- [ ] Walk through member cloud saves, guest local saves, device migration conflicts, stale cross-device revisions, room selection/submission, file export, and share-code import.
- [ ] Review PC, tablet, and phone layouts, update HANDOFF with any incomplete acceptance or blocker, and commit final UI integration.

### Owner follow-up: Card format categories

**Files:**
- Create `frontend/src/lib/cardFormats.ts` and `frontend/tests/cardFormats.test.mjs`.
- Modify `frontend/src/pages/CardfightDeckPreview.tsx` and `frontend/src/pages/cardfight-decks.css`.
- Update `HANDOFF.md`.

**Format mapping:** Premium includes the complete catalog. D Standard uses the recovered Cardfight `DCards` marker (`DCards != 0`). V Standard follows the recovered `NewCardStat` initialization: card IDs from 5671 onward, excluding `OldCardStat == 1`, the explicit `NewCardStat = 0` exceptions, and D Standard cards. The format selector combines with existing grade/search filters and pagination.

- [x] Add unit coverage for Premium inclusion, D marker inclusion, V inclusion/exclusions, and cross-format separation.
- [x] Add an accessible format selector; reset pagination when it changes.
- [x] Browser verified Premium (17,146 cards), V Standard (3,049), and D Standard (7,921), with page one restored on each format change. Frontend production build and all 4 Node test files pass; focused independent reviewer PASS.
- [x] Commit the format filter and updated HANDOFF (`feat(cardfight-decks): filter cards by format`).

## Execution Notes

- The owner approved the design document before this plan was written. Implement tasks sequentially because each establishes interfaces consumed by later work.
- The owner previously requested a LOW reasoning level for implementation; use LOW for the implementation agent.
- The owner asked for an investigator/implementer/reviewer workflow. The implementer follows this plan; an independent reviewer checks the resulting commits against this plan before any push.
- The current developer session policy prohibits adding or running tests unless the owner asks for test/verification work; use strict types, production builds, and code review where allowed, and do not claim automated test coverage.
- Never stage or modify the untracked `Reverse Engineered/` source tree.
