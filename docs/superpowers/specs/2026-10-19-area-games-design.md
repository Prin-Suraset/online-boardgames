# Buddyfight and Cardfight web recreation design

Status: proposed design for SilverHorn/Spark review. Investigation and implementer review are authorized; this document does not approve changes to shared contracts.

## Intent and evidence

Recreate **Buddyfight Area 1.38** and **Cardfight!! Area 4.16** as two playable games in the existing board-game platform, with modern desktop, tablet/iPad, and smartphone controls. Retain each game's distinct field and workflow while reusing guests/accounts, rooms, chat, spectators, reconnect, rules, and rematches.

Sources are the separate projects in `Reverse Engineered/`. Read their `REPORT.md`, `BUILD.md`, recovered GML, data exports, and Cardfight's `project/Manual/index.html`. The recovery README explicitly says legacy runtime equivalence and online services are untested. Recovered card descriptions do not prove automated card abilities. Treat findings as evidence, not a verified complete rules specification.

The actual frontend is **Vite + React + TypeScript + Tailwind**, not Next.js. Keep the existing FastAPI backend and `BaseGame` pattern; no framework migration.

## Scope and proposed decisions

These are planner recommendations, not decisions already approved by the owner:

* Recreate the source clients' **assisted, player-controlled card-table workflow**. Automate validated table operations, private views, deterministic dealing, and evidenced helpers. Players resolve card text through explicit moves/counter adjustments. Clearly explain manual resolution in the rulebook. A complete automatic ability interpreter is a separately estimated extension, not a silent requirement or a claim of parity.
* Build Cardfight first, then Buddyfight. Cardfight has named source and a preserved manual, reducing mechanics-mapping risk; Buddyfight has a smaller catalog but more obfuscated controller code. The second game can reuse proven UI primitives without merging game rules.
* Each duel has two active players. Reuse the platform's spectator role; spectators cannot act or see private cards. No competitive gameplay bot is promised by the recovered evidence. Disable test-bot entry for these game types unless a separate bot policy is implemented.
* Preserve and import all recovered catalog/deck data with provenance, while supporting each playable format incrementally. Label unsupported formats and source anomalies. Do not claim every format/card helper is validated because a catalog record exists.
* Reuse existing account semantics. Guest deck storage may use versioned local storage; durable account-linked deck sync needs an approved persistence/API design and is deferred. Both players select validated deck snapshots before a match begins.

## Deliverables and completion boundary

1. Evidence inventory connecting legacy features to source locations, web behavior, tests, and unsupported items.
2. Reproducible non-executing catalog/deck import with diagnostics and image mappings for both games.
3. A reviewed contract addendum defining game IDs, setup/deck selection, state/action/view shapes, errors, and integration without changing old game payloads.
4. Two deterministic game plugins with phase/turn state, zone movement, card orientation/visibility, resources/counters, setup, concession, completion, and per-player/spectator views. Implement source-supported helpers as named actions, never by executing card GML.
5. Searchable deck workshop and touch-accessible card inspection/action menus; separate game-specific boards with modern controls.
6. Hub/room/rulebook integration; two-browser play, spectators, reconnect, rematch, and responsive evidence.

An initial two-player vertical slice is a milestone, not the complete recreation. The final parity checklist must explicitly account for the remaining recovered editor, match, format, and convenience features. Deferred features stay unchecked in HANDOFF with their evidence and reason; do not declare the entire project complete while they remain.

## Game distinctions and fidelity

**Buddyfight:** preserve buddy/flag selection, main deck and supported extra/Lost-deck workflow, hand, deck, gauge, drop, left/center/right monster areas, item and applicable spell/soul areas; life, gauge, phase, rest/stand, card inspection, search/shuffle, draw, call and movement helpers. Final zone IDs and helper legality must be traced to recovered code before their contracts are accepted. The recovered deck encoding uses the first list entry as buddy; it is not an ordinary main-deck card.

**Cardfight:** preserve Vanguard/rear-guard field, hand, deck, damage, drop, soul, bind/removed cards, guardian, G-zone and ride-deck workflows where evidenced; stand/rest/face state, phase controls, drive/damage check, counter blast/charge, soul blast/charge, modifiers and markers. The manual documents both explicit user operations and selective automation. Separate supported format profiles rather than inventing one universal deck rule across D/V/other recovered formats.

Exact opening counts, starting resources, phase sequences, deck constraints, allowed reactions and end conditions belong in the evidence-backed contract addendum. Unresolved values block that feature, not unrelated imports or UI planning. Never substitute recalled TCG rules for recovered behavior without labeling the difference and getting owner agreement.

## Architecture and security boundaries

* New plugins follow `initial_state(player_ids)`, `apply_action(state, player_id, action)`, and `get_player_view(state, player_id)` from `backend/app/engine/base.py`. Additional setup helpers may take explicit deck snapshots and a seed, as existing plugins do; retain the abstract contract.
* Catalog loading, file decoding, persistence, secure seed creation, sockets and clocks stay outside `backend/app/engine/*`. Engine transitions receive validated inputs; no I/O, ambient randomness, native code or legacy network traffic.
* Model physical card instances separately from catalog IDs so duplicates remain individually selectable. Canonical state tracks ownership, controller, zone, position, orientation and face visibility. Never put hidden catalog IDs, art URLs, deck order, search results or private logs in another viewer's payload.
* Hidden cards use viewer-safe opaque references. Shuffle/hidden-zone changes must not allow stable public references to reveal the new order. A spectator receives public-only data, including after reconnect and at game end unless a deliberate reveal rule is approved.
* Manual ability resolution does not allow arbitrary mutation: authorize the actor and zone, validate target existence, ownership/control, quantities, capacity and applicable phase/priority. Allow defensive/out-of-turn actions only through an explicit source-evidenced permission matrix.
* Failed actions leave state unchanged and return the existing structured errors. Ended matches reject moves. Concession produces an ordinary game result. Rematches discard all previous private cards, setup selections, modifiers, logs and UI state.
* Public action history describes public operations; private searches/draws never leak through announcements, chat integrations, errors, results or persisted replay exports. Keep private replay data server-side or omit it from an export.
* Reuse existing WebSocket envelopes. New game IDs/view union members and any new setup payloads require Spark/SilverHorn agreement under AGENTS rule 6. Do not repurpose an old game's action or loosen validators to accept arbitrary objects.

## Data and assets

Keep `Reverse Engineered/` unchanged as source evidence. It is currently untracked and contains large binary/asset trees; stage only explicit planning/product files, never `git add .`.

Build offline converters consuming data exports and literal GML assignments without `eval`, `exec` or legacy DLLs. Keep stable source IDs namespaced by game; preserve source path/line and original text. Produce structured diagnostics for duplicates, unresolved expressions, missing images and unsupported deck records. Buddyfight duplicate IDs 3251 and 5450 need loader-order evidence before choosing effective values. Cardfight's missing `Text/Triggers.txt` must remain a recorded gap; do not fabricate its contents or infer all trigger automation from card prose.

Use generated, versioned catalog manifests and explicit image indexes. Avoid bundling thousands of images into the frontend JavaScript or loading the entire image catalog on initial page load. Supply thumbnails on demand and an accessible missing-art card. Do not import recovery DLLs, updater binaries, saved settings or legacy service endpoints into the application.

Deck import/export has a bounded codec for observed `.prfl` layouts. Preserve order, duplicates, buddy and extra/ride grouping where evidence supports them. Reject malformed, oversized, unknown-ID and unsupported-variant input with actionable messages. A successful byte roundtrip does not prove a deck is legal for every format.

## Responsive interaction design

Apply `skills/frontend-design/SKILL.md`. Keep the platform's midnight/slate/gold identity. Proposed tokens, grounded in `frontend/src/index.css`: canvas `#0b0f19`, panel `#161b26`, slate `#334155`, primary text `#f1f5f9`, active gold `#e5a93c`, field green `#14532d`. Reuse the installed Inter/system stack with normal case labels, tabular numeric counters, readable Thai/English copy. Separate the games through field geometry and resource cues, not a global reskin.

The field is the focus. Opponent public state is above the field; the local hand and current actions stay reachable below it. Text/actions stay upright even when opponent cards are rotated. Readable card detail is always available because tabletop thumbnails cannot carry full rules text on phones.

| Screen | Layout and controls |
|---|---|
| Desktop, >=1280px | Field fills remaining space, own hand dock below; selected-card inspector and chat/history rail beside the field. Pointer hover may preview; click and keyboard remain complete alternatives. |
| Tablet/iPad, 768–1279px | Full-width field, compact resource/phase strip, scalable cards, touch-friendly hand carousel; inspector and chat in dismissible sheets. Support portrait and landscape without forcing rotation. |
| Smartphone, 320–767px | Compact opponent summary, focused board with explicit zone tabs/expanders, scrollable local hand and persistent action dock. Card taps open inspection/actions, then choose a legal destination. Use safe-area padding and dynamic viewport height; scroll containers cannot hide selected actions behind keyboard or sheets. |

All primary touch targets are at least 44x44 CSS pixels. Every drag operation has a tap-select/tap-destination alternative. No required right-click, hover, Ctrl, Shift, double click or long press. Desktop shortcuts may be optional and documented. Provide visible focus, semantic buttons, named zones, Escape/close and focus return, color-independent status labels, reduced motion, and card-image alt text without hidden-card names.

Workshop: search and source-supported filters, card grid with lazy images, selected card inspector, deck list/counts/validation, import/export, named local saves and explicit format selection. Phone mode switches between browser and deck instead of shrinking three desktop columns. Modern search may ignore case; preserve original card text and source IDs.

## Validation and acceptance

* Each engine transition has normal, rejected-action, input-state-unchanged and terminal-state tests. Fixed seed plus action sequence yields the same state; inspect original states for mutation.
* Privacy tests cover both players, a spectator, private searches, deck inspection, shuffle references, face-down cards, errors/events, reconnect and match completion.
* Protocol tests cover unknown game/action, wrong actor, nonparticipant, out-of-turn defense, malformed payload, invalid zone/card, disconnect/rejoin, concession, rematch and old-game compatibility. Reject bad input without closing the WebSocket.
* Import tests use representative fixtures plus full catalog diagnostics; bound legacy file sizes and unsupported variants. Test duplicate copies and extra/ride/buddy positions. No recovered source executes.
* Run focused tests, full backend suite, frontend build/lint and whitespace checks. Record baseline failures separately, with current evidence; old HANDOFF limitations may be stale.
* Browser-check 1366x768 and 1920x1080 PC; 768x1024, 820x1180 and 1024x768 tablet; 390x844 and 360x800 phone; include 320px width, resize during selection, long names, full hand, dense zones, touch controls, keyboard, open chat and soft keyboard. Capture screenshots for both games, workshop, spectator and final result. A build pass does not substitute for these checks.
* Play complete matches using two independent identities; verify all recorded parity items and existing game smoke tests. Save exact commands, results and unresolved items to HANDOFF.

## Work discipline and owner decisions

Follow root and applicable nested AGENTS instructions. Read/update HANDOFF at every pause; preserve existing unrelated pending tasks. Commit each verified functional increment with Conventional Commits and explicit file staging. Diagnose failures; do not roll back working code blindly. If Git is genuinely unwritable, record the exact failure and request the required permission rather than silently changing repository metadata elsewhere.

Before product implementation, ask SilverHorn to review this complete scope and Spark/SilverHorn to accept the contract addendum. The main decision is assisted-tabletop parity versus complete automatic card rules. This proposal selects the former and leaves the latter as an explicit extension. Implementation is staged: import/evidence, Cardfight vertical slice and parity, then Buddyfight vertical slice and parity, followed by cross-device acceptance.

## Investigator checkpoints and continuation

After every completed work item, the investigator reviews task completion, findings and any exposed context/usage status. At 30% context remaining, compact if supported, otherwise save a concise continuation checkpoint before automatic compaction. At 20% of the five-hour allowance remaining, save every completed/incomplete task, commit, verification result, blocker and next command to root HANDOFF for later continuation. No actual remaining-percentage gauge or forced-compaction tool is currently exposed; do not invent readings or infer account usage allowance from elapsed time.
