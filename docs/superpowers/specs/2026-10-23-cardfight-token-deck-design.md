# Cardfight Token Deck

**Status:** Owner approved full deck/room scope and the separate Token Deck editor section on 2026-10-23. Implementation is recorded in `docs/superpowers/plans/2026-10-23-cardfight-token-deck.md`; final independent review and commit are pending.

## Intent

Give Cardfight decks a separate supplemental token section with room for up to 30 card copies. Token cards must not count toward, shuffle with, or be submitted as part of the 50-card main deck.

## Goals

- Add an ordered `tokens: number[]` section with a maximum of 30 entries to the Cardfight deck definition.
- Show **Token Deck** as its own section/tab in both deck editor surfaces, with an independent `0 / 30` counter and capacity validation. Selecting it shows only token-classified cards; Main/Ride/G zone hide token-classified cards.
- Keep tokens separate in saved deck data, deck import/export, lobby submission, trusted catalog snapshots, and the deterministic game state.
- Let the owning player inspect their token supply and move a token to hand or a rear-guard circle during Main; keep opponent token identities concealed until played.
- Reject token-classified card IDs in main, ride, and G-zone sections.
- Preserve existing deck files and local saves by explicitly normalizing the previous shape (without `tokens`) to an empty token section during import/load migration.

## Token classification

The recovered catalog has no single `IsToken` field. Derive a trusted token-ID set from exact data fields: records marked `TokenInHand == 1`, plus card IDs referenced by `TokenSummoner`, numbered `TokenSummoner` fields, `TokenSummonerRodeUponNumber`, and `TokenSummonRodeUponNumber`. Do not infer token status from card names or prose. Apply the same source-field rule in frontend filtering and the trusted backend catalog adapter; reject unknown token IDs on server submission.

## Contract and state behavior

- `CardfightDeckDefinition` gains `tokens`, a strict tuple/list of positive card IDs, at most 30. The combined operational maximum becomes 366 (main 256 + ride 16 + G-zone 64 + tokens 30), while playable validation remains main=50, ride=0 or 4, G-zone<=16, and tokens<=30.
- `CF_SUBMIT_DECK` retains its action discriminator and envelope; its nested deck gains the required `tokens` array. `CardfightSetupView.self_setup.deck` returns the same section privately to its owner. No raw deck or token IDs are added to public lobby views.
- The engine snapshots trusted definitions for tokens but never shuffles them into `DECK`, counts them toward opening hand/draw, or includes them in the G-zone. It initializes a distinct `TOKEN` supply zone. Opponents see only the public token-zone count; only the owner can inspect the card identities. A token can be moved from that supply to `HAND` or to `REAR` during Main. Token IDs cannot be moved from the token supply into `DECK`, Ride, or G zone.
- Card text and token summoning effects remain player-resolved. This change does not automate effects.
- Deck builders and APIs must retain token order and duplicates. Legacy JSON and device-local deck migration add `tokens: []` only when reading the previous exact deck shape; all newly written deck definitions carry `tokens`.

## UI proposal

Add a Token Deck section/tab alongside Main, Ride, and G zone in the standalone preview and the current working `DeckWorkshop`. While Token Deck is selected, show only catalog records in the derived token-ID set, apply the selected Cardfight format and text search, and cap additions at 30 total copies. Other sections filter out token-classified cards. The section's selected cards have normal inspector/removal controls; the main count remains 50. The real room deck selector and submission show token count separately.

## Alternatives considered

1. **Builder-only token tray:** avoids shared schema changes but cannot survive save/import or reach a room; owner selected full deck and room support.
2. **Put tokens in Main or G zone:** violates the separate 50-card deck and the owner's explicit requirement.
3. **Separate typed token section and TOKEN supply zone (selected):** carries tokens end to end, preserves main-deck behavior, and gives players access to their selected token cards without automatically resolving their effects.

## Files expected to change

- `frontend/src/types/cardfight.ts`, `frontend/src/lib/cardfightGuards.ts`, `frontend/src/lib/areaDecks.ts`, `frontend/src/components/cards/DeckWorkshop.tsx`, `frontend/src/pages/CardfightDeckPreview.tsx`, `frontend/src/components/cards/CardfightSetup.tsx`, `frontend/src/components/game/CardfightBoard.tsx`, and related Cardfight CSS.
- `backend/app/engine/games/cardfight.py`, `backend/app/card_data/cardfight_catalog.py`, `backend/app/schemas.py`, `backend/app/rooms.py` if setup adaptation requires it, and existing Cardfight tests.
- `docs/superpowers/specs/2026-10-19-area-games-contracts.md`, the Cardfight deck builder plan, and `HANDOFF.md`.

## Acceptance

- A 50-card main deck remains exactly 50 when up to 30 tokens are added; token copies do not affect main-deck counts or opening draws.
- Token IDs are rejected from main/ride/G zone, and non-token IDs are rejected from the token section.
- Token deck identities stay private before use; an owner can inspect the supply and move an item to Hand or Rear during Main; opponent receives no token IDs before a token is public on field.
- Opening hand, deck count, shuffle, mulligan, and ride/G-zone operations are unchanged by the token section.
- New saves round-trip tokens; old deck exports/local saves load as empty token decks.
- Unit tests cover normal setup, bounds, illegal section/classification submissions, privacy, token movement, and existing main deck behavior.
