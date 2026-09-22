# AGENTS.md

## 1. Project Overview
* **Project Name**: Online Board Game Platform
* **Description**: A scalable, real-time multiplayer online board game platform supporting both classic/standard board games and custom user-defined games.
* **Target Audience**: Supports both **Guests** (ephemeral anonymous sessions) and **Registered Users** (persistent accounts, stats, and match histories).
* **High-Level Architecture**:
  1. **Platform Hub (Lobby/Catalog)**: User sessions, game discovery, room creation, and room-code based matchmaking.
  2. **Game Client & Engine**: Real-time interactive gameplay powered by WebSockets, utilizing a modular plugin architecture for distinct game rules.

---

## 2. Agent Roles & Collaboration Workflow

| Role | Entity | Primary Responsibilities |
| :--- | :--- | :--- |
| **Lead Developer / Project Owner** | **SilverHorn** | Sets project requirements, tests on Linux environment, performs code reviews, and makes final architectural decisions. |
| **System Architect & Planner** | **Spark** | Defines system design, database schemas, WebSocket protocols, task decompositions, and prompt templates for Codex. |
| **Implementation Agent** | **Codex** | Generates source code, implements endpoints and game logic, writes unit tests, and refactors within the IDE. |

---

## 3. Technology Stack & Target Environment

* **Host Environment**: Linux (Ubuntu-based)
* **Backend**: Python 3.11+ / FastAPI (Async, WebSockets, Pydantic v2)
* **Frontend**: Next.js / React (TypeScript, Tailwind CSS)
* **Data Storage**:
  * **Persistent**: PostgreSQL (or SQLite for local development)
  * **Transient / Cache**: In-Memory structures or Redis (for active rooms and match states)
* **Networking**: REST API (Lobby & User Management) + WebSockets (Real-time Room & Game State Sync)

---

## 4. <Goldenrule>

<Goldenrule>
1. **Always Commit on Updates**:
   * Every time a new feature is added, a script is modified, or functional code is updated, create a Git commit immediately with a clear, meaningful commit message adhering to conventional commits (e.g., `feat:`, `fix:`, `test:`, `refactor:`).

2. **No Blind Rollbacks**:
   * When encountering errors, test failures, or bugs, NEVER roll back or delete working code blindly. Read the error traces, inspect the logs, analyze the root cause, and fix the specific issue directly within the existing code.

3. **Always Read & Maintain HANDOFF**:
   * ALWAYS check for and read `HANDOFF.md` before initiating any new task or session.
   * If any work or task is left unfinished, in-progress, or partially implemented, write/update `HANDOFF.md` immediately with current status, pending steps, and blockers.

4. **Strict Separation of Concerns (Purity of Game Engine)**:
   * Game logic MUST be written as pure, deterministic state machines.
   * NEVER import WebSockets, HTTP modules, databases, or I/O frameworks into the game engine modules (`app/engine/*`).
   * A game instance must depend ONLY on input actions and produce deterministic state transitions.

5. **Zero Information Leakage (Anti-Cheat / Hidden Information)**:
   * NEVER broadcast full raw game states directly to clients if the game contains private information (e.g., hidden cards, secret roles).
   * ALWAYS filter state through a player-specific view method (`get_player_view(player_id)`) before sending over WebSockets.

6. **Strict Contract Adherence**:
   * NEVER modify existing Pydantic schemas, WebSocket payload types, or TypeScript interfaces unilaterally.
   * All modifications to core interfaces or data models must conform to specifications agreed upon with Spark and SilverHorn.

7. **Rigorous Typing & No `any`**:
   * Python code must enforce complete, strict type annotations (`typing`, Pydantic models).
   * TypeScript code must be strictly typed. The use of `any` is strictly prohibited unless explicitly instructed.

8. **Graceful Validation & Fault Isolation**:
   * Invalid moves or malformed player payloads MUST NEVER crash the WebSocket connection or server process.
   * Always validate player turns, active status, and move legality. Reject invalid actions with structured error codes (e.g., `NOT_YOUR_TURN`, `INVALID_ACTION`).

9. **Test-Driven Game Mechanics**:
   * Every new game plugin or state transition MUST be accompanied by comprehensive unit tests verifying normal turns, illegal move rejections, and game-over conditions.
   * All tests must execute cleanly in a headless Linux CLI environment (`pytest`).
</Goldenrule>

---

## 5. HANDOFF Protocol (`HANDOFF.md`)

When pausing or ending a session with pending work, `HANDOFF.md` must be created or updated at the repository root with this format:

```markdown
# Session Handoff

## 1. Current Status
* **Active Task**: [Short description of current work]
* **State**: In-Progress / Blocked / Ready for Test

## 2. Completed in this Session
* [x] List completed changes and commit hashes

## 3. Pending & Next Steps
* [ ] Detailed step-by-step checklist of what remains to be done

## 4. Known Issues & Notes
* Error logs, edge cases noticed, or specific caveats for the next agent