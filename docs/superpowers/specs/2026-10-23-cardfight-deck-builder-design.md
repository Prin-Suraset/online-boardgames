# Cardfight Deck Builder Outside the Room

**Status:** Draft for owner approval. No product implementation is included in this change.

## Intent

Move Cardfight deck building out of the room setup. Players should build and manage decks on a dedicated Decks page, then choose a saved deck in the room lobby. Registered users need their decks on their account across devices. Guests retain device-local saves. Players can export a deck file or copy a share code that another player can paste into the builder.

## Goals

- Provide a dedicated `/decks/cardfight` page reachable from the global navigation and usable before creating or joining a room.
- Keep the existing searchable card browser, main/ride/G-zone sections, validation, card inspection, sample deck, JSON import/export, and legacy section import/export.
- Replace the embedded `DeckWorkshop` in Cardfight room setup with a compact saved-deck selector, selected-deck summary/validation, and the existing private server submission action.
- Persist registered users' saved decks in the backend, scoped to the authenticated account. Keep guest saves in local storage.
- Add a copyable, versioned, bounded share code and a paste/import control. Import creates an editable draft; it never writes to the recipient's account until saved.
- Preserve the current `CF_SUBMIT_DECK` room action and server validation behavior.
- Provide explicit import of existing device-local saved decks to an account. Never silently overwrite an account deck during migration.

## Non-goals

- Buddyfight deck building, automatic tournament legality certification, public deck directories, deck likes, or server-hosted public share links.
- Changes to match rules, room actions, player views, or Cardfight gameplay contracts.
- Password, account merge, or guest identity migration changes.

## Current behavior

`App.tsx` routes the hub and `/room/{code}` only. Cardfight's `CardfightSetup` embeds `DeckWorkshop`, which combines editing, local-storage save/load, JSON and legacy import/export, validation, and submission. `AuthContext` already exposes a bearer token and distinguishes guest from registered users. `AuthStore` initializes a SQLite database and provides a natural repository location, while authenticated HTTP routes live in `backend/app/api`.

## Approaches considered

1. **Separate editor with device-local saves.** Smallest change and no backend contract changes, but does not meet the owner's requirement for account-synced saves.
2. **Separate editor with account-owned cloud saves and guest-local saves (selected).** Reuses the current editor and auth token, adds a small owner-scoped REST API and SQLite table, and leaves the room WebSocket contract untouched. Requires explicit REST schemas and migration tests.
3. **Public share service or link.** Would centralize sharing but adds public storage, access policy, and abuse controls that are unnecessary for copy/paste deck sharing.

## Proposed product flow

The global navigation gets a **Decks** entry. `/decks/cardfight` opens the full builder outside any room. Registered users load and save their account decks through authenticated requests. Guests continue using device-local storage and see a sign-in prompt if they want cloud sync. Existing local saves remain on the device; a registered user can explicitly import them into the account from the Decks page, with name collisions presented for a deliberate keep/replace/skip choice. A registered user's room picker lists account decks only; a local deck must be imported before it can be selected in a room.

Cardfight room setup contains a **Choose deck** control for the player's saved decks, a concise selected-deck status, and the existing **Submit private deck** action. It contains no card search, deck editor, save/import/export controls, or embedded builder. Decks can be managed by leaving the room and using the global Decks page. Selecting and submitting a deck continues to call `CF_SUBMIT_DECK`; the server remains authoritative for current catalog/profile validation.

## Proposed REST and storage contract

Add a `cardfight_decks` table with opaque deck ID, owner user ID, deck name, catalog version, serialized strict `CardfightDeck` JSON, and created/updated timestamps. Reads and mutations are always filtered by the authenticated owner. Guest tokens receive a structured `ACCOUNT_REQUIRED` response for cloud-deck endpoints; they keep using local saves.

- `GET /api/cardfight/decks` returns the authenticated member's saved deck summaries and definitions.
- `POST /api/cardfight/decks` creates a saved deck and returns its server ID and timestamps.
- `PUT /api/cardfight/decks/{deck_id}` replaces that owner's saved deck by ID and includes the revision last loaded by the client. The server increments the revision on each update and returns `409 DECK_REVISION_CONFLICT` if another device saved a newer revision; the user can reload or save their draft as a separate deck.
- `DELETE /api/cardfight/decks/{deck_id}` deletes only that owner's saved deck.

Request/response models are strict, bounded, and versioned through the embedded `game_id` and `catalog_version`. Saving an incomplete working deck is allowed; room submission retains full gameplay validation. Missing IDs and attempts to access another owner's deck return the same not-found response. API authorization uses the existing bearer-token dependency and derives owner identity from the validated token, never from a client-provided owner ID.

## Share code and export behavior

Keep existing JSON and legacy `.prfl` exports. Add a `CF1:` versioned base64url code encoding only the `CardfightDeck` data. Copy uses the browser clipboard and reports success/failure. Paste/import decodes under a strict maximum size, validates with the existing deck guard, and loads a draft without saving or submitting it. The code is portable text, not encrypted or secret; it grants no access to the sender's account. Unknown catalog cards or a stale catalog version remain visible as validation issues and must be resolved before room submission.

## Constraints and accessibility

- Follow root `AGENTS.md`; maintain strict Python/TypeScript types and no `any`.
- The deck repository and routes remain outside `app/engine/*`; engine purity is unchanged.
- Do not change existing schemas or TypeScript room action interfaces. The new REST contract in this document must be approved before implementation.
- Preserve private deck submission and never expose a player's saved deck to other room participants.
- Keep the builder usable at PC, tablet, and phone widths; maintain keyboard access, visible focus, labels, and existing card inspection behavior.
- Use the existing theme and dependencies; add no package.

## Implementation calls proposed for the owner

- Account cloud saves are for registered accounts; guest saves remain local.
- Local-to-account migration is user-triggered, duplicate names require an explicit choice, and source local saves remain intact.
- Registered room pickers contain account decks only; explicit import is required before a local deck becomes account-selectable.
- Cloud updates use optimistic revision checks and never silently overwrite a newer cross-device edit.
- Copy/paste codes are self-contained deck data, not public links, and imports are drafts until a user saves them.
- Room setup shows one deck picker with selected status and submission; navigation provides access to the full builder.
- Existing JSON/legacy imports and exports remain available on the dedicated page.

## Acceptance criteria

- `/decks/cardfight` is reachable before room creation/join and renders the existing full editor.
- Room setup has no embedded editor and offers only saved-deck selection, selected status, and submission for deck management.
- Registered user A's saved decks persist after refresh/relogin and are not visible or mutable to registered user B.
- Guest saves remain usable on that browser and are not represented as cloud-synced.
- A member can explicitly migrate local decks without deleting local copies or silently overwriting cloud copies.
- JSON export/import and legacy section import/export still work.
- Copying a share code and importing it in another browser recreates an editable equivalent deck; malformed, oversized, wrong-game, and unsupported codes fail with clear messages.
- Imported or saved decks still undergo existing authoritative validation when submitted in a Cardfight room.
- Backend tests cover member CRUD persistence, guest rejection, cross-account isolation, malformed payloads, ID behavior, and migration/name conflicts. Frontend checks cover route/picker and share-code round trip, failure, and clipboard-unavailable states.
- Build and focused tests pass; responsive browser review covers desktop, tablet, and phone.
