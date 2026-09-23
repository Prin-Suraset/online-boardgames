import { useState } from "react";
import {
  ArrowRight,
  Bot,
  Clock3,
  Gamepad2,
  Grid3X3,
  Hash,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";

import { Toast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { navigate } from "../lib/navigation";
import type { GameType } from "../types";

interface RoomLookup {
  room_code: string;
}

function isRoomLookup(value: unknown): value is RoomLookup {
  return (
    typeof value === "object" &&
    value !== null &&
    "room_code" in value &&
    typeof value.room_code === "string"
  );
}

export function HubPage() {
  const { user, openAuthModal } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [selectedGame, setSelectedGame] = useState<GameType>("tictactoe");
  const [busyAction, setBusyAction] = useState<"create" | "join" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const requireUser = (): boolean => {
    if (user !== null) {
      return true;
    }
    openAuthModal("guest");
    return false;
  };

  const createRoom = async (gameType: GameType = selectedGame): Promise<void> => {
    if (!requireUser() || user === null) {
      return;
    }
    setBusyAction("create");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_type: gameType,
          player: {
            id: user.id,
            name: user.display_name,
            avatar: user.display_name.trim().slice(0, 1).toUpperCase() || "?",
          },
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok || !isRoomLookup(body)) {
        throw new Error("The room service did not accept the request.");
      }
      navigate(`/room/${body.room_code.toUpperCase()}`);
    } catch (caught: unknown) {
      setNotice(caught instanceof Error ? caught.message : "Unable to create a room.");
    } finally {
      setBusyAction(null);
    }
  };

  const joinRoom = async (): Promise<void> => {
    if (!requireUser()) {
      return;
    }
    const code = roomCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setNotice("Enter a valid 6-character room code.");
      return;
    }
    setBusyAction("join");
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(code)}`);
      if (!response.ok) {
        throw new Error(response.status === 404 ? "Room not found." : "Unable to check that room.");
      }
      navigate(`/room/${code}`);
    } catch (caught: unknown) {
      setNotice(caught instanceof Error ? caught.message : "Unable to join the room.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(at_50%_0%,#1e1b4b_0%,#090d16_60%)]" />
      <div className="pointer-events-none absolute top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-400/10 px-4 py-2 text-xs font-bold tracking-wider text-amber-200 uppercase shadow-lg shadow-amber-950/20">
            <Sparkles className="size-3.5 text-amber-300" /> The grand tabletop lounge
          </div>
          <h1 className="mt-6 font-display text-4xl leading-tight font-black tracking-[-0.035em] text-white sm:text-6xl">
            Pull up a chair.
            <span className="block bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">Play something timeless.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
            Private rooms, instant invites, and real-time play. Start a table or enter a friend's code—no setup maze required.
          </p>
        </section>

        <section className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-2">
          <article className="lounge-card overflow-hidden bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-slate-950 p-6 sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div className="grid size-12 place-items-center rounded-2xl bg-amber-400/15 text-amber-300 shadow-inner shadow-amber-300/10">
                <Plus className="size-6" />
              </div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold tracking-wider text-emerald-300 uppercase">Private by default</span>
            </div>
            <h2 className="mt-6 text-2xl font-black text-white">Create a room</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Choose a game and get a shareable code for your table.</p>
            <label className="form-label mt-6 block">
              Game
              <select
                className="text-input mt-2 w-full appearance-none border-amber-500/20"
                value={selectedGame}
                onChange={(event) => { setSelectedGame(event.target.value as GameType); }}
              >
                <option value="tictactoe">Tic-Tac-Toe · 2 players</option>
                <option value="what_number">What number I have? · 3–8 players</option>
              </select>
            </label>
            <button type="button" onClick={() => { void createRoom(); }} disabled={busyAction !== null} className="primary-button mt-5 w-full py-3">
              {busyAction === "create" ? <LoaderCircle className="size-4 animate-spin" /> : <Gamepad2 className="size-4" />}
              Enter the lounge
            </button>
          </article>

          <article className="lounge-card p-6 sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div className="grid size-12 place-items-center rounded-2xl bg-slate-700/70 text-emerald-300">
                <LockKeyhole className="size-6" />
              </div>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Invite only</span>
            </div>
            <h2 className="mt-6 text-2xl font-black text-white">Join a table</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Enter the six-character room code from your invite.</p>
            <label className="form-label mt-6 block">
              Room code
              <input
                value={roomCode}
                onChange={(event) => { setRoomCode(event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6)); }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void joinRoom();
                  }
                }}
                placeholder="ABC123"
                aria-label="Room code"
                className="text-input mt-2 w-full text-center font-mono text-xl font-black tracking-[0.35em] uppercase"
              />
            </label>
              <button type="button" onClick={() => { void joinRoom(); }} disabled={busyAction !== null} className="secondary-button mt-5 w-full py-3">
                {busyAction === "join" ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              Enter game
            </button>
          </article>
        </section>

        <section className="mt-20">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-amber-300 uppercase">Game catalog</p>
              <h2 className="mt-2 text-3xl font-black text-white">Pick your table</h2>
            </div>
            <p className="text-sm text-slate-500">More classics and custom games are on the way.</p>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <article className="group overflow-hidden rounded-3xl border border-amber-400/25 bg-gradient-to-b from-amber-500/10 to-slate-900 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-300/60 hover:shadow-2xl hover:shadow-amber-500/10">
              <div className="flex items-center justify-between">
                <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20"><Grid3X3 className="size-7" /></div>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-300 uppercase">Available</span>
              </div>
              <h3 className="mt-7 text-2xl font-black text-white">Tic-Tac-Toe</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">The essential three-in-a-row duel. Simple rules, sharp decisions.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                <span className="game-tag"><Users className="size-3 text-amber-300" /> 2 players</span>
                <span className="game-tag"><Clock3 className="size-3 text-amber-300" /> ~5m</span>
                <span className="game-tag"><Swords className="size-3 text-amber-300" /> Strategy</span>
              </div>
              <button type="button" onClick={() => { void createRoom("tictactoe"); }} className="primary-button mt-6 w-full">Play now</button>
            </article>

            <article className="group overflow-hidden rounded-3xl border border-emerald-400/25 bg-gradient-to-b from-emerald-500/10 to-slate-900 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-300/50 hover:shadow-2xl hover:shadow-amber-500/10">
              <div className="flex items-center justify-between">
                <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-emerald-700 text-slate-950 shadow-lg shadow-emerald-500/20"><Hash className="size-7" /></div>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-300 uppercase">Available</span>
              </div>
              <h3 className="mt-7 text-2xl font-black text-white">What number I have?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Read the table, manage powerful skills, and expose every rival card.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                <span className="game-tag"><Users className="size-3 text-amber-300" /> 3–8 players</span>
                <span className="game-tag"><Swords className="size-3 text-amber-300" /> Deduction</span>
                <span className="game-tag"><Clock3 className="size-3 text-amber-300" /> ~15m</span>
              </div>
              <button type="button" onClick={() => { void createRoom("what_number"); }} className="primary-button mt-6 w-full">Play now</button>
            </article>

            <article className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 opacity-70">
              <div className="grid size-14 place-items-center rounded-2xl bg-slate-800 text-slate-500"><Bot className="size-7" /></div>
              <h3 className="mt-7 text-2xl font-black text-slate-300">Custom Games</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Bring your own rules and build a table around them.</p>
              <div className="mt-5"><span className="game-tag">Coming soon</span></div>
            </article>

          </div>
        </section>
      </div>

      {notice !== null && <Toast message={notice} onDismiss={() => { setNotice(null); }} />}
    </main>
  );
}
