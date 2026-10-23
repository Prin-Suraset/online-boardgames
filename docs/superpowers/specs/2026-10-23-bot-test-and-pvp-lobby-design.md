# Bot Test Rooms and PvP Rooms

## Intent

Give players two clear room paths from the lobby: create a normal PvP room to share with another person, or create a test room populated with the existing game bots.

## Goals

- Keep the current selected-game flow and room-code join flow.
- Label normal room creation as PvP.
- Offer a bot-test action only for What Number, You or Me, and Top100, which already have bot turns.
- On entry to a bot-test room, add enough ready bots to meet that game's minimum player count. What Number needs two bots; You or Me and Top100 need one each.
- Let the authenticated room host invoke the existing `ADD_TEST_BOTS` action. The room manager continues to enforce host authority, supported games, lobby-only insertion, and capacity.
- Leave Tic-Tac-Toe and Cardfight as PvP-only until bot behavior exists.

## Non-goals

- No new game rules, bot strategy, room schema, or WebSocket payload shape.
- No automatic readiness or start for the human host; they review the lobby and start the match themselves.
- No bots added to ordinary PvP rooms.

## Approach

Create the room with the existing API. The bot-test action navigates to that room with an explicit mode query. Once the host's socket receives the initial lobby state, the client sends the existing `ADD_TEST_BOTS` action once. The server authorizes the authenticated host and calls the existing bounded bot insertion method. Reconnects do not add more bots because the action is only triggered when the room contains just the host. Standard PvP room creation and join-by-code remain unchanged.

## UX

Keep the selected game control. Show “Create PvP room” for every game. Show “Test vs bot” for supported games, with a short explanation that it fills the table with test bots. For unsupported games, omit the bot action and explain that bot play is unavailable for that game. On failure, show the server error in the room instead of leaving the host with a silent or empty test room.

## Acceptance

- Each supported game creates a test room with the correct number of bots and leaves the human host able to ready and start.
- Ordinary PvP creation adds no bots; join-by-code remains unchanged.
- Non-host, unauthenticated, full-room, active-room, and unsupported-game bot requests are rejected safely.
- Reopening a bot-test room does not duplicate bots.
- Build and focused room/API checks pass; desktop and narrow-screen lobby controls remain usable.
