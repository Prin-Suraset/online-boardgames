# Session Handoff

## 1. Current Status
* **Active Task**: Force frontend WebSocket connections to use the Render backend instead of the Vercel origin.
* **State**: Blocked

## 2. Completed in this Session
* [x] Added a typed `VITE_WS_URL` resolver with `wss://boardgames-backend-pzln.onrender.com` as its fallback.
* [x] Removed the WebSocket dependency on `window.location`, including the production Vercel host fallback.
* [x] Added strict Vite typing for `VITE_WS_URL` and verified the frontend production build, lint, and whitespace checks pass.
* [x] Confirmed the repository contains only one frontend `WebSocket` constructor and it uses the new resolver.

## 3. Pending & Next Steps
* [ ] Commit `frontend/src/hooks/useRoomSocket.ts`, `frontend/src/vite-env.d.ts`, and this handoff once the repository's `.git` metadata is writable.

## 4. Known Issues & Notes
* Git cannot create `.git/index.lock` because `.git` is mounted read-only in the current environment. The commit attempt failed even with approved escalated execution.
