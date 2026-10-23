# Cardfight Token Deck Implementation Plan

**Approved design:** `docs/superpowers/specs/2026-10-23-cardfight-token-deck-design.md`

## Goal

Add a separate Token Deck section with a 30-copy capacity through deck editing, backward-compatible local/file loading, lobby submission, and a private in-game token supply. Tokens never enter the 50-card shuffled main deck.

## Task 1: Derive token IDs from catalog fields

**Files**
- Create `frontend/src/lib/cardfightTokens.ts` and `frontend/tests/cardfightTokens.test.mjs`.
- Modify `backend/app/card_data/cardfight_catalog.py` with the matching trusted derivation.
- Extend `backend/tests/test_cardfight.py` or add a focused catalog test.

**Behavior**
- Classify only IDs with `TokenInHand == 1` or referenced by `TokenSummoner`, `TokenSummoner2...`, `TokenSummonerRodeUponNumber`, or `TokenSummonRodeUponNumber` fields.
- Ignore missing, non-integer, zero, or unknown references; do not parse card prose or names.
- [x] Cover direct flags, every reference family, and non-token controls with focused frontend and backend tests; both pass.

## Task 2: Extend deck schema and migrate old local/file decks

**Files**
- Modify `frontend/src/types/cardfight.ts`, `frontend/src/lib/cardfightGuards.ts`, and `frontend/src/lib/areaDecks.ts`.
- Modify `frontend/tests/areaDecks.test.mjs`.
- Modify `backend/app/engine/games/cardfight.py` and `backend/tests/test_cardfight.py`.
- Update `docs/superpowers/specs/2026-10-19-area-games-contracts.md` and the deck builder plan API contract.

**Behavior**
- Add `tokens` as an ordered array/tuple of card IDs, maximum 30; preserve duplicates and order.
- Raise the serialized combined operational deck bound from 336 to 366 while keeping main=50, ride=0/4, and G zone<=16 setup rules.
- Empty and sample decks always contain `tokens: []`.
- Add explicit previous-shape migration for local saves and JSON files lacking only the `tokens` key; every newly written/sent deck includes the new array. Reject other missing, malformed, or extra data as before.
- Reject token-classified IDs in main/ride/G zone and non-token IDs in the token section, using trusted catalog metadata on server validation.
- Add tests for 30/31 bounds, wrong section classification, old-shape migration, and order/duplicate preservation.
- [x] Deck schema, legacy migration, section classification/bounds, and empty-deck shape implemented; focused tests pass.

## Task 3: Add Token Deck section to both editors

**Files**
- Modify `frontend/src/components/cards/DeckWorkshop.tsx`, `frontend/src/pages/CardfightDeckPreview.tsx`, `frontend/src/pages/cardfight-decks.css`, and `frontend/src/components/cards/cardfight.css`.
- Modify frontend deck tests where validation or import behavior is covered.

**Behavior**
- Add a distinct `Token Deck` tab/section and a separate `0 / 30` count to both the working room editor and standalone editor.
- In Token Deck, browse only catalog token IDs. In Main/Ride/G zone, hide token IDs. Preserve the active format/search controls and 120-card pagination where present.
- Add/remove token copies independently; block additions above 30. The 50-card main count remains independent.
- Allow JSON and device-save migration; selected-section legacy `.prfl` import/export operates on `tokens` when Token Deck is selected.
- Keep visible keyboard focus and tablet/phone filter/tab wrapping.
- [x] Both editors expose the Token Deck section, filter by trusted derived IDs, count separately to 30, and support adding/removing tokens; narrow-width tab strip scrolls without compressing labels.

## Task 4: Carry tokens through trusted setup and engine state

**Files**
- Modify `backend/app/card_data/cardfight_catalog.py`, `backend/app/engine/games/cardfight.py`, `backend/app/schemas.py` as needed.
- Modify `frontend/src/types/cardfight.ts`, `frontend/src/lib/cardfightGuards.ts`, and `frontend/src/components/game/CardfightBoard.tsx`.
- Extend `backend/tests/test_cardfight.py` and `frontend/tests/cardfight.test.mjs`.

**Behavior**
- Snapshot trusted `is_token` definitions for IDs across all four deck sections; never trust a client token flag.
- Add `TOKEN` as a distinct zone. Initial token instances are not shuffled, drawn, counted as main deck cards, or included in opening hand.
- Opponent views expose only token-supply count and concealed refs; owner can inspect token identities privately. Once moved to a public field zone, normal public card view applies.
- Allow owner token supply entries to move to hand or to Rear during Main; reject moving directly from TOKEN to DECK, RIDE, or G_ZONE. Other phase/turn checks remain in force.
- Board zone selectors and labels include Token Deck; only the owner gets an inspect control for their own supply.
- Tests cover privacy from both viewers, deterministic token instances, token movement/rejection, and unchanged main deck/shuffle/opening counts.
- [x] Trusted snapshots, private TOKEN zone, owner inspection, Main-only hand/Rear movement, and board labels are implemented; focused engine/catalog/room tests pass.

## Task 5: Review, handoff, and commits

- Update `HANDOFF.md` after each finished implementation task with commit and pending work.
- Run focused frontend Node tests and backend Cardfight pytest tests plus the frontend production build after the cross-stack implementation. Do not mutate unrelated test data; inspect repository guidance before backend suite runs.
- Review changes against this plan, especially schema compatibility, identity privacy, token/main separation, and responsive Token Deck tab layout.
- Commit each finished functional task with a conventional commit. Never stage the user-supplied untracked `Reverse Engineered/` directory.
- [ ] Independent reviewer assessment, final feature commit, and owner-authorized publication after PASS.

## Acceptance

- 50 main cards and 0–30 token copies coexist without changing draw/shuffle/opening counts.
- Token IDs are accepted only in Token Deck, and non-token IDs are rejected there.
- Previous local/JSON deck shapes load with an empty Token Deck; current shapes round-trip exact token order and duplicates.
- The owner can privately inspect and use the room's token supply; public views reveal no token IDs until each token enters a public zone.
- Owner-approved Token Deck section is visible in both editors and remains usable on PC, tablet, and phone.
