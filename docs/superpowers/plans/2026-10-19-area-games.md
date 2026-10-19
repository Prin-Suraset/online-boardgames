# Buddyfight and Cardfight Web Recreation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, with the investigator reviewing each finished task as requested by the owner. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add faithful assisted web recreations of Buddyfight Area 1.38 and Cardfight Area 4.16 with modern PC, tablet/iPad and smartphone experiences.

**Architecture:** Two independent deterministic plugins integrate with existing FastAPI rooms and the React/Vite client. Catalog/deck conversion and seed generation happen outside the engines. Reuse transport, authentication, spectators and chat; share small card-display components only after both games demonstrate the need.

**Tech Stack:** Python 3.11+, FastAPI, Pydantic v2, pytest; existing React, Vite, TypeScript and Tailwind. No framework migration or legacy native runtime.

**Spec:** `docs/superpowers/specs/2026-10-19-area-games-design.md`

## Execution state

Investigation/design/plan and implementer readiness review are the current handoff. Product implementation is pending owner review of the proposed assisted-simulator scope and approval of affected contracts under AGENTS rule 6. This is a contract-first staged plan: Task 1 resolves exact source-backed setup/format/priority values; later engine tasks must consume its approved addendum rather than invent values. Do not treat milestone outlines as permission to improvise unresolved TCG rules.

## Global constraints

* Read `AGENTS.md`, `/home/prin/.codex/RTK.md`, root HANDOFF, applicable nested instructions and `skills/frontend-design/SKILL.md`; prefix shell commands with `rtk`. Never read denied `*.env` files.
* Preserve the recovered source tree. It is untracked; stage explicit files and never sweep its binaries into a commit.
* Pure deterministic engines; I/O and randomness outside `backend/app/engine/*`.
* Every broadcast uses player-specific/public-only views; private cards never enter public events or logs.
* Strict Python/TypeScript typing; no TypeScript `any`. Shared contracts require Spark/SilverHorn agreement.
* Every new transition gets normal/illegal/game-over pytest coverage. Bad input leaves the connection open and state unchanged.
* Each verified functional increment gets a Conventional Commit immediately. Diagnose failures rather than blindly rolling back code.
* PC, tablet/iPad and smartphone are acceptance requirements, including portrait and landscape tablet use.
* After each completed task, the investigator reviews the result and available task/context/usage status. Fix relevant findings before the next task; update HANDOFF with evidence and remaining work.
* At **30% context remaining**, compact if the runtime exposes that control; otherwise write a concise continuation checkpoint before relying on automatic compaction. At **20% of the five-hour allowance remaining**, save all completed and incomplete work, commits, results, blockers and next commands to HANDOFF for later continuation. Percentages require a real gauge; wall-clock elapsed time is not proof of account quota remaining. If no gauge exists, say so and keep task checkpoints current.

## Review focus

1. Hidden information leaks through face-down art URLs, stable references after shuffle, logs, spectator reconnect and final results: Tasks 3 and 5 and both integration tasks must prove redaction.
2. New game IDs falling into existing Top100/default branches, four-seat defaults or unsupported bots: Tasks 4 and 6 must use explicit dispatch/capacity and regression tests.
3. Defensive/out-of-turn interactions rejected by an over-simple turn check, or unauthorized foreign-card mutation: Task 1 defines permissions; Tasks 3 and 5 test both permitted and rejected cases.
4. Corrupt/oversized legacy files, repeated card copies and buddy/extra/ride boundary errors: Task 2 must preserve observed structure and reject unsupported input.
5. A full hand, long names, soft keyboard or inspector covers actions on phones/iPads: Tasks 7 and 8 require real viewport checks, not just a build.

## File responsibilities

Existing integration owners:

* `backend/app/engine/base.py`: existing abstract interface, unchanged unless separately approved.
* `backend/app/schemas.py`: game ID and view unions; reviewed setup transport only.
* `backend/app/rooms.py`: capacity, setup, start/action/view routing, results, concessions, rematches, spectators and bot availability.
* `backend/app/main.py`, `backend/app/realtime.py`: inspect existing dispatch/broadcast and add only approved handling.
* `frontend/src/types/index.ts`, `frontend/src/hooks/useRoomSocket.ts`: strict client types and runtime payload guards.
* `frontend/src/lib/gameCatalog.ts`, `frontend/src/pages/index.tsx`, `frontend/src/pages/room.tsx`: discovery, creation and rendering.
* `frontend/src/data/gameRules.ts`: source-backed instructions and manual-resolution explanation.

Proposed new modules (confirm repository conventions during Task 1):

* `backend/app/card_data/`: typed imported catalogs, deck codecs and diagnostics; no engine imports of filesystem loaders.
* `backend/scripts/import_area_games.py`: offline deterministic conversion CLI.
* `backend/app/engine/games/buddyfight.py`, `cardfight.py`: separate state/action/view and transition ownership. Split a plugin into its own package if its responsibility grows beyond a readable single module.
* `frontend/src/components/game/BuddyfightBoard.tsx`, `CardfightBoard.tsx`: game-specific field arrangements.
* `frontend/src/components/cards/`: selected-card inspector, zone list, hand dock and workshop components; no universal rules interpreter.
* `frontend/src/lib/areaDecks.ts`: versioned local deck saves and pure client validation, aligned with server validation.
* `backend/tests/test_area_import.py`, `test_buddyfight.py`, `test_cardfight.py`, `test_area_rooms.py`: conversion, engines and protocol/privacy evidence.

## Task 1: Lock evidence, fidelity checklist and contract addendum

**Files:** investigation report in `docs/investigations/2026-10-19-area-games.md`; create `docs/superpowers/specs/2026-10-19-area-games-contracts.md`; update HANDOFF. No product/schema edits.

**Interfaces:** consumes recovered source evidence and existing `BaseGame`/room/schema contracts. Produces an approved specification for proposed IDs `buddyfight` and `cardfight`, separate typed states/actions/views and deck-setup lifecycle.

- [ ] Trace each playable workflow to source path/line. Build a per-game feature matrix with statuses evidenced / proposed modernization / unresolved / verified; include deck editor, match zones, manual controls, helpers, replay/serialization, format-specific behavior and conveniences.
- [ ] For each supported initial format, record exact opening counts/resources, buddy/flag/starter selection, legal deck composition, phase order, zone capacities, card ownership/control, end conditions, and out-of-turn permission matrix. A format without sufficient evidence remains unsupported, with the blocking source recorded.
- [ ] Define strict `CardDefinition`, per-copy card instance, `DeckDefinition`, setup actions, game-specific action discriminators and view schemas. Record required/optional fields, bounds and example accepted/rejected payloads. Document player/spectator/public/private visibility for every field.
- [ ] Define setup lifecycle explicitly: player-private deck submission, validation against server catalog, readiness only after valid setup, start only with two valid decks, deck changes invalidating readiness, fresh setup on rematch and reconnect behavior. Existing `START_GAME` uses an empty payload; do not overload it silently. Propose an explicit setup action/envelope change for approval, with compatibility examples.
- [ ] Choose deterministic setup/shuffle inputs without exposing seeds/order. Define how subsequent shuffles remain deterministic and safe, including re-identification of hidden cards.
- [ ] Define move rejection/result semantics and private-safe action logs; specify concession and how a manually adjudicated match ends. Do not assume life/damage thresholds apply uniformly across all formats.
- [ ] Review the addendum with Spark/SilverHorn before any affected Pydantic/WebSocket/TypeScript changes. Record approval and spec revision in HANDOFF. If approval is pending, continue read-only investigation/documentation only.
- [ ] Commit explicit docs: `docs: specify area game fidelity and integration contracts`. Investigator checks source claims, readiness and available usage status.

## Task 2: Reproducible catalog/deck import

**Files:** create `backend/app/card_data/__init__.py`, `models.py`, `importer.py`, `deck_codec.py`; create `backend/scripts/import_area_games.py`, `backend/tests/test_area_import.py` and small attributed fixtures. Add generated text catalogs under `backend/data/area-games/`; generate browser catalogs/art under `frontend/public/area-games/` and ignore generated art binaries in Git. Retain original recovery files untouched.

**Interfaces:** `import_catalog(source_root: Path, game_id: Literal["buddyfight", "cardfight"]) -> CatalogImportResult`; `decode_legacy_deck(raw: bytes, game_id: AreaGameId) -> LegacyDeck`; `encode_legacy_deck(deck: LegacyDeck) -> bytes`. All types live in `card_data/models.py`; `CatalogImportResult` carries records, provenance and diagnostics. Engine consumes only the approved immutable definitions/deck snapshots.

- [ ] Write failing tests: stable repeated output; game namespace separation; same-name/different-ID cards preserved; Buddyfight duplicate IDs 3251/5450 diagnosed; unknown expression never executed; missing Cardfight trigger source reported; text encoding retained; missing art gets explicit fallback.
- [ ] Add codec fixtures: duplicate copies/order retained, buddy at position zero, extra/ride grouping only when proven, exact unchanged-file roundtrip; reject truncated headers, excessive count/size, nonfinite/nonintegral IDs, unsupported variants and unknown card IDs.
- [ ] Run `rtk python3 -m pytest backend/tests/test_area_import.py -v`; record expected assertion/import failures before implementing.
- [ ] Implement bounded non-executing conversion, deterministic output ordering, image index and loader-order resolution only where traced. Do not run recovery assemblers that overwrite settings or execute GML.
- [ ] Implement static delivery as a reproducible generated build artifact: CLI `--output-dir frontend/public/area-games` writes `{buddyfight,cardfight}/catalog.json` and indexed `art/full/` + `art/thumb/` files from actual recovered full/mini sources. Browser URLs start `/area-games/<game>/`; normalize to known indexed filenames, forbid path traversal and never expose source filesystem paths. Copy supported formats byte-for-byte, use an original accessible fallback for missing art, and keep private per-match IDs out of catalog URLs. Generate only indexed assets, not native projects/DLLs/settings. Document generation before Vite build and ensure deployment includes the static artifact; do not claim Git alone includes ignored art.
- [ ] Run focused tests and full conversion against both recovery trees; compare counts/diagnostics with recovery manifests and save report/output size. Validate every manifest URL resolves within output root with the expected content type/hash, including fallback; Task 4 must browser-check built asset delivery. Stage generated text data explicitly instead of the entire recovery tree.
- [ ] Commit `feat(data): import recovered area card catalogs and decks`. Investigator reviews diagnostics, provenance, privacy and usage; checkpoint HANDOFF.

## Task 3: Cardfight deterministic engine and format profiles

**Files:** create `backend/app/engine/games/cardfight.py`, `backend/tests/test_cardfight.py`; introduce game-local helpers first; extract shared helpers only when both plugins demonstrate the need.

**Interfaces:** `CardfightState`, `CardfightAction`, `CardfightView`; `CardfightEngine` implements the three `BaseGame` methods with those concrete types. Use approved explicit setup factory and independent format profiles from Task 1.

- [ ] Write red tests for approved deck/ride/G-zone setup, phase advance, stand/rest, draw, ride/call/guard/movement, drive/damage reveal, soul blast/charge, damage flip, bind/drop, public modifiers/markers and match end/concession. Trace automatic helpers individually; do not invent missing trigger behavior.
- [ ] Test allowed defending-player actions during an opponent's turn and rejected arbitrary opponent mutations; validate counts/ownership/zone membership and fixed-seed replay consistency.
- [ ] Test card conservation, duplicate-copy identity, immutable input state and unchanged state after rejection. For both players and spectators, assert private hand/search/deck order/face-down IDs/art are absent, shuffle references cannot reveal the new order, and errors/events/final views remain safe.
- [ ] Run `rtk python3 -m pytest backend/tests/test_cardfight.py -v` before and after implementation; retain explicit unsupported helper/format diagnostics for source gaps.
- [ ] Commit `feat(cardfight): add deterministic assisted duel engine`. Investigator verifies evidence matrix and usage; checkpoint HANDOFF.

## Task 4: Cardfight room, workshop and board integration

**Files:** add `frontend/src/components/game/CardfightBoard.tsx`, initial workshop/inspection/hand/zone components under `frontend/src/components/cards/`, `frontend/src/lib/areaDecks.ts` and `backend/tests/test_area_rooms.py`. Modify `backend/app/schemas.py`, `backend/app/rooms.py`, approved dispatch in `backend/app/main.py`/`realtime.py`, `frontend/src/types/index.ts`, `frontend/src/hooks/useRoomSocket.ts`, catalog, room page and rulebooks.

**Interfaces:** explicit `cardfight` adapter branches and two-seat capacity; typed `CardfightView` guard and action callback. Keep Cardfight-specific rules and board geometry isolated for the later Buddyfight integration.

- [ ] Create red protocol tests for two-seat creation/capacity, setup/format validation, deck changes invalidating readiness, wrong actors, malformed then valid input on the same socket, spectators/role switching, private reconnect, concession and clean rematch. Add regression tests for all four existing game IDs and Top100 fallback behavior; no unsupported test bots.
- [ ] Implement explicit dispatch and safe logs/results, then workshop format/deck sections and Vanguard/rear-guard/damage/soul/ride/G-zone interactions. Replace manual's modifier-key/right-click necessities with visible actions.
- [ ] Create the first workshop primitives: search/filter, named local saves, import/export, format/deck diagnostics and lazy images. Implement the design's desktop/tablet/phone field, inspector/chat sheets and hand dock with keyboard and tap alternatives, 44px targets, focus restoration, safe areas and reduced motion. Do not simply scale the legacy desktop field until labels become unreadable.
- [ ] Register Cardfight in catalog/select/create/rules/room routes only once playable. Explain manual resolution, hide unsupported bots/formats, and audit participant, role-switch/forfeit, result and private history paths.
- [ ] Run focused plus full backend tests, frontend build/lint and two-identity browser play. Browser-check catalog fetch, representative full/thumbnail images and missing-art fallback from a production build, with no dependence on source-tree paths. Run existing-game regressions; verify both new games again after Buddyfight integration.
- [ ] Commit `feat(cardfight): integrate responsive duel and deck workflow`. Investigator checks source parity, transport/privacy, usage status and HANDOFF.

## Task 5: Buddyfight deterministic engine

**Files:** create `backend/app/engine/games/buddyfight.py`, `backend/tests/test_buddyfight.py`; import immutable card-data types only, never their loaders.

**Interfaces:** `BuddyfightState`, `BuddyfightAction`, `BuddyfightView`; `BuddyfightEngine.initial_state(player_ids: tuple[str, ...]) -> BuddyfightState`; `apply_action(state: BuddyfightState, player_id: str, action: BuddyfightAction) -> BuddyfightState`; `get_player_view(state: BuddyfightState, player_id: str) -> BuddyfightView`. Explicit deck/seed setup factory signature and action fields come verbatim from the approved Task 1 addendum.

- [ ] Write failing tests for each approved setup/phase/action: draw, shuffle/search/reveal, zone moves/call helpers, rest/stand, gauge/life changes, soul/equipment handling, turn advance and concession. Use addendum values rather than remembered game rules.
- [ ] Add rejection tests for every action: unknown actor/card/zone, bad quantities/targets, unauthorized opponent mutation, illegal timing and actions after completion. Assert equality of original state before and after rejection.
- [ ] Add deterministic sequence/card-conservation tests and per-view privacy assertions for two players plus spectator: private hand/search/order/face-down IDs/art absent, shuffle references unlinkable, errors and final view safe.
- [ ] Run `rtk python3 -m pytest backend/tests/test_buddyfight.py -v` to capture red tests, implement minimal transitions, then run until all pass.
- [ ] Commit `feat(buddyfight): add deterministic assisted duel engine`. Investigator reviews each transition against evidence and the addendum; checkpoint HANDOFF.

## Task 6: Buddyfight room and protocol integration

**Files:** modify `backend/app/schemas.py`, `backend/app/rooms.py` and approved dispatch in `backend/app/main.py`/`realtime.py`; extend `backend/tests/test_area_rooms.py` from Task 4; update client types/guards together under the approved contract.

**Interfaces:** use existing room/message envelopes and approved setup action. Add explicit `buddyfight` start/action/view/result branches, exactly two seats and no unsupported bot path. Never let new IDs reach the existing Top100 fallback.

- [ ] Write red tests for creation/capacity, setup/readiness/start, valid action, malformed payload then valid action on the same socket, spectator join/role switch, private reconnect, concession and rematch setup reset.
- [ ] Add compatibility tests for all four existing game IDs; verify default capacity and Top100 behavior remain intact. Test private deck submissions cannot be seen by another player through room summaries/events/history.
- [ ] Implement approved schema and adapter routing; audit `_is_match_participant`, forfeit/role-switch paths and persistence/result handling, not just `start_game`.
- [ ] Run `rtk python3 -m pytest backend/tests/test_area_rooms.py backend/tests/test_spectators.py backend/tests/test_rooms_api.py -v`; run the full backend suite, inspecting database artifacts before staging.
- [ ] Commit `feat(buddyfight): integrate duel setup and room transport`. Investigator audits all dispatch fallbacks and privacy; checkpoint HANDOFF.

## Task 7: Buddyfight workshop, responsive field and discovery

**Files:** add `BuddyfightBoard.tsx`; extend the card workshop/inspection/hand/zone components and `areaDecks.ts` from Task 4; update catalog, room rendering, types/guards, rules and narrowly scoped styles.

**Interfaces:** `BuddyfightBoard` receives parsed `BuddyfightView` and the existing typed game-action callback; it sends only approved `BuddyfightAction` payloads. Deck selection uses the approved setup contract; no full state or arbitrary patches from the client.

- [ ] Implement workshop search/filter, named local saves, import/export and visible format/deck diagnostics using Task 2 data; keep image fetching lazy. Guest saves remain local and account-linked persistence is labeled deferred.
- [ ] Build game-specific monster/item/buddy/gauge areas, phase/resources strip, readable inspection, hand dock, legal destination/action selection and public history. Display manual ability resolution plainly in help.
- [ ] Implement spec layouts at >=1280px, 768–1279px and 320–767px. Every pointer shortcut has keyboard and tap alternatives; 44px targets, safe areas, focus restoration and reduced motion are required.
- [ ] Register catalog/select/create/rules/room routes together only when the game is playable; do not advertise a nonworking preview as a playable game. Hide unsupported bot and format options.
- [ ] Verify `rtk npm --prefix frontend run build`, `rtk npm --prefix frontend run lint`; exercise two-player play, spectator and local-save flows in a real browser. Save viewport screenshots from the spec and log exact failures or unavailable browser checks.
- [ ] Commit `feat(buddyfight): add responsive workshop and game table`. Investigator checks source parity, usability/usage status and evidence; checkpoint any unfinished parity items before final acceptance.

## Task 8: Complete parity review and cross-device acceptance

**Files:** evidence/feature matrix, targeted fixes/tests, root HANDOFF; no unrelated cleanup.

- [ ] Investigator reviews every recovered feature entry against the implementation. Resolve feature gaps or explicitly obtain owner acceptance for deferral; keep missing Cardfight trigger source and unverified helpers visible. A playable subset is not complete source-client parity.
- [ ] Finish explicitly planned compatibility/convenience work still open in that matrix, including Buddyfight replay import/export only to the extent decoded and privacy-safe (Cardfight has no recovered replay fixtures); new helpers follow the same red/green/commit/review loop.
- [ ] Exercise complete matches, deck changes invalidating readiness, state recovery, failed-action recovery, hidden searches, opponent/spectator privacy, concession, role switching, result and rematch using independent sessions.
- [ ] Browser-check every screen size in the design, both tablet orientations, 320px fallback, resize during selection, long names, dense board/full hand, open chat and phone keyboard. Capture actual screenshots and verify no overlaps or inaccessible actions.
- [ ] Run `rtk python3 -m pytest backend/tests -v`, frontend build/lint and `rtk git diff --check`. Record exact totals and baseline failures; never relabel unrun checks as passing. Do not restore unrelated changed files blindly if tests modify a database.
- [ ] Commit each tested fix immediately with a narrow Conventional Commit; run a final investigator review after the last change. Update HANDOFF with commit hashes, verified/deferred matrix, outstanding blockers and next commands. Push/deploy only if separately authorized.

## Implementer handoff and checkpoints

The implementer first reviews this plan and the design, reports important unresolved assumptions, and waits for the required scope/contract review before product work. Begin with Task 1, not game registration. Do not register either new ID until explicit start/action/view paths, setup and strict client guards exist.

After each task, send the investigator the commit/diff, relevant source evidence, acceptance assertions and actual checks. The investigator reports findings and available usage state; the implementer fixes findings, commits, updates checkboxes and HANDOFF, then proceeds. The parent tracks the sequence and prevents competing edits. If compaction or session quota requires stopping, HANDOFF is the authoritative continuation entry point, with current task/substep and all incomplete tasks retained.
