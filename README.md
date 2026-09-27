# The Board Game

A real-time multiplayer board game platform for playing with friends in private rooms. Choose a game, share a six-character room code, and play together in the browser. Join as a guest or create an account.

## Games

| Game | Players | What to expect |
| --- | ---: | --- |
| Tic-Tac-Toe | 2 | A classic three-in-a-row match. |
| What number I have? | 3–8 | A card deduction game with turns, guesses, and skills. |
| You or me who more than? | 2–4 | Hidden cards, betting, and showdowns. |
| Top 1-100 by ChatGPT | 2–8 | Guess ranked answers across ten rounds. |

## Features

- Private rooms with shareable codes, ready states, and real-time gameplay.
- Guest sessions and registered accounts, with match records stored by the backend.
- Room chat, game rules in the browser, and rematches after a game ends.
- Player-specific game views that keep hidden cards and private results out of other players' updates.
- Development bots for What number I have?, You or me who more than?, and Top 1-100 by ChatGPT.

## Tech stack

- **Frontend:** React, TypeScript, Vite, and Tailwind CSS.
- **Backend:** Python, FastAPI, Pydantic, and WebSockets.
- **Storage:** SQLite for accounts and match history; in-memory state for active rooms.
- **Game logic:** Separate game engines under `backend/app/engine/games/`.

## Run locally

You need Python 3.11+, Node.js, and npm. Start the backend and frontend in separate terminals from the repository root.

**Backend**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export BOARDGAME_AUTH_SECRET="replace-this-with-a-long-random-secret"
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. By default, it creates a SQLite database at `backend/data/boardgame.db` when started from the `backend` directory. Set `BOARDGAME_DATABASE_PATH` to use another location.

**Frontend**

```bash
cd frontend
npm ci
VITE_WS_URL=ws://localhost:8000 npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to the local backend. Setting `VITE_WS_URL` connects room WebSockets to the same backend; otherwise, the client uses its configured hosted server.

## Tests and build

```bash
cd backend
python -m pytest
```

```bash
cd frontend
npm run build
npm run lint
```

The backend exposes interactive API docs at `http://localhost:8000/docs` while it is running.
