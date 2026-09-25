import { useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Gamepad2,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Sparkles,
} from "lucide-react";

import { GameCatalogCarousel } from "../components/GameCatalogCarousel";
import { GameSelectModal } from "../components/GameSelectModal";
import { GameRulesModal } from "../components/GameRulesModal";
import { Toast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { catalogGames } from "../lib/gameCatalog";
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
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [ruleGame, setRuleGame] = useState<GameType | null>(null);
  const [busyAction, setBusyAction] = useState<"create" | "join" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const gameTriggerRef = useRef<HTMLButtonElement>(null);
  const selectedGameDetails = catalogGames.find((game) => game.id === selectedGame) ?? catalogGames[0];

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
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#0B0F19]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,#1b2634_0%,#0b0f19_58%,#070a11_100%)]" />
      <div className="pointer-events-none absolute top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#E5A93C]/10 blur-3xl" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#E5A93C]/35 bg-[#1C212D] px-4 py-2 text-xs font-bold tracking-[0.2em] text-amber-400 uppercase shadow-[0_0_20px_rgba(229,169,60,0.25)]">
            <Sparkles className="size-3.5 text-[#E5A93C]" /> The grand tabletop lounge
          </div>
          <h1 className="mt-6 font-display text-4xl leading-tight font-black tracking-[-0.035em] text-white sm:text-6xl">
            Pull up a chair.
            <span className="block bg-gradient-to-r from-[#F8DE9D] via-[#E5A93C] to-[#B77922] bg-clip-text text-transparent">Play something timeless.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
            Private rooms, instant invites, and real-time play. Start a table or enter a friend's code—no setup maze required.
          </p>
        </section>

        <section className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-2">
          <article className="lounge-card overflow-hidden bg-[#161B26]/90 p-6 sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div className="grid size-12 place-items-center rounded-2xl border border-[#E5A93C]/30 bg-[#E5A93C]/10 text-[#E5A93C] shadow-inner shadow-amber-300/10">
                <Plus className="size-6" />
              </div>
              <span className="game-tag text-slate-300 uppercase"><span className="size-1.5 rounded-full bg-amber-400" />Private by default</span>
            </div>
            <h2 className="mt-6 text-2xl font-black text-white">Create a room</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Choose a game and get a shareable code for your table.</p>
            <div className="mt-6">
              <span className="form-label">Game</span>
              <button
                ref={gameTriggerRef}
                type="button"
                onClick={() => { setIsGameModalOpen(true); }}
                aria-haspopup="dialog"
                className="group mt-2 flex w-full items-center justify-between rounded-xl border border-slate-700 bg-[#1C212D] p-3.5 text-left transition-all hover:border-[#E5A93C]/50 hover:bg-[#252D3B]"
              >
                <span className="flex items-center gap-3">
                  <span className="rounded-lg bg-amber-500/10 p-2 text-xl font-bold text-amber-400" aria-hidden="true">{selectedGameDetails?.icon}</span>
                  <span>
                    <span className="block font-semibold text-slate-100">{selectedGameDetails?.title}</span>
                    <span className="block text-xs text-slate-400">{selectedGameDetails?.players}</span>
                  </span>
                </span>
                <span className="text-xs font-semibold text-amber-400 transition-transform group-hover:translate-x-0.5">เปลี่ยน ▾</span>
              </button>
            </div>
            <button type="button" onClick={() => { void createRoom(); }} disabled={busyAction !== null} className="primary-button mt-5 w-full rounded-lg px-6 py-3 font-black tracking-wider text-[#0B0F19] shadow-lg shadow-amber-500/20">
              {busyAction === "create" ? <LoaderCircle className="size-4 animate-spin" /> : <Gamepad2 className="size-4" />}
              Enter the lounge
            </button>
            <button type="button" onClick={() => { setRuleGame(selectedGame); }} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-300 transition hover:text-amber-100">
              <BookOpen className="size-4" /> อ่านกติกา {selectedGameDetails?.title}
            </button>
          </article>

          <article className="lounge-card p-6 sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div className="grid size-12 place-items-center rounded-2xl border border-sky-400/25 bg-[#1C212D] text-sky-400">
                <LockKeyhole className="size-6" />
              </div>
              <span className="game-tag text-slate-300 uppercase"><span className="size-1.5 rounded-full bg-sky-400" />Invite only</span>
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
              <button type="button" onClick={() => { void joinRoom(); }} disabled={busyAction !== null} className="primary-button mt-5 w-full rounded-lg px-6 py-3 font-black tracking-wider text-[#0B0F19] shadow-lg shadow-amber-500/20">
                {busyAction === "join" ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
              Enter game
            </button>
          </article>
        </section>

        <section className="mt-20">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-amber-400 uppercase">Game catalog</p>
              <h2 className="mt-2 text-3xl font-black text-white">Pick your table</h2>
            </div>
            <p className="text-sm text-slate-500">More classics and custom games are on the way.</p>
          </div>

          <GameCatalogCarousel onPlay={(game) => { void createRoom(game); }} onReadRules={setRuleGame} isBusy={busyAction !== null} />
        </section>
      </div>

      {isGameModalOpen && (
        <GameSelectModal
          selectedGame={selectedGame}
          onSelect={setSelectedGame}
          onClose={() => { setIsGameModalOpen(false); gameTriggerRef.current?.focus(); }}
        />
      )}
      {ruleGame !== null && <GameRulesModal gameId={ruleGame} onClose={() => { setRuleGame(null); }} />}
      {notice !== null && <Toast message={notice} onDismiss={() => { setNotice(null); }} />}
    </main>
  );
}
