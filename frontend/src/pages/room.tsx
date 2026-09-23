import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  CircleDashed,
  Clipboard,
  Crown,
  LoaderCircle,
  LogOut,
  OctagonX,
  Play,
  Radio,
  UserRound,
} from "lucide-react";

import { TicTacToeBoard } from "../components/TicTacToeBoard";
import { WhatNumberGame } from "../components/WhatNumberGame";
import { GameAnnouncer } from "../components/game/GameAnnouncer";
import { Toast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { useRoomSocket } from "../hooks/useRoomSocket";
import { navigate } from "../lib/navigation";
import { cn } from "../lib/styles";
import type { AuthUser, Player, TicTacToeView, WhatNumberView } from "../types";

function isTicTacToeView(game: TicTacToeView | WhatNumberView): game is TicTacToeView {
  return "board" in game;
}

function PlayerSlot({ player, label }: { player: Player | undefined; label: string }) {
  return (
    <div className="flex min-h-28 items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
      <div
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-2xl text-xl font-black",
          player === undefined ? "border border-dashed border-white/15 text-slate-600" : "bg-cyan/15 text-cyan",
        )}
      >
        {player?.avatar ?? <UserRound className="size-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-bold text-white">{player?.name ?? "Waiting for player"}</p>
          {player?.is_host === true && <Crown className="size-3.5 shrink-0 text-amber-300" />}
        </div>
        <p className="mt-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">{label}</p>
      </div>
      {player !== undefined && (
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase",
            player.is_ready ? "bg-mint/15 text-mint" : "bg-white/5 text-slate-500",
          )}
        >
          {player.is_ready ? "Ready" : "Not ready"}
        </span>
      )}
    </div>
  );
}

interface RoomPageProps {
  code: string;
}

export function RoomPage({ code }: RoomPageProps) {
  const { token, user } = useAuth();

  if (user === null || token === null) {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-slate-950 px-5 text-center">
        <div>
          <LoaderCircle className="mx-auto size-8 animate-spin text-indigo-300" />
          <p className="mt-4 font-bold text-slate-300">Choose a player profile to join this room.</p>
        </div>
      </main>
    );
  }

  return <RoomSession code={code} token={token} user={user} />;
}

interface RoomSessionProps extends RoomPageProps {
  token: string;
  user: AuthUser;
}

function RoomSession({ code, token, user }: RoomSessionProps) {
  const profile = useMemo(
    () => ({
      playerId: user.id,
      playerName: user.display_name,
      avatar: user.display_name.trim().slice(0, 1).toUpperCase() || "?",
    }),
    [user.display_name, user.id],
  );
  const [notice, setNotice] = useState<string | null>(null);
  const {
    room,
    connectionStatus,
    isConnected,
    error,
    notification,
    chatMessages,
    gameEvents,
    clearError,
    clearTransientState,
    sendAction,
    sendChat,
    toggleReady,
    startGame,
    leaveRoom,
  } = useRoomSocket(code, profile, token);

  const previousRoomStatus = useRef(room?.status);
  useEffect(() => {
    if (room?.status === "LOBBY" && previousRoomStatus.current !== "LOBBY") {
      setNotice(null);
      clearTransientState();
    }
    previousRoomStatus.current = room?.status;
  }, [clearTransientState, room?.status]);

  const currentPlayer = room?.players.find((player) => player.id === profile.playerId);
  const minPlayers = room?.game_type === "what_number" ? 3 : 2;
  const maxPlayers = room?.game_type === "what_number" ? 8 : 2;
  const allPlayersReady =
    room !== null && room.players.length >= minPlayers && room.players.every((player) => player.is_ready);
  const canStart = currentPlayer?.is_host === true && allPlayersReady;
  const canMove =
    room?.status === "PLAYING" &&
    room.game !== null &&
    isTicTacToeView(room.game) &&
    room.game.current_player === profile.playerId;
  const wasForceEnded = room?.result?.details.forced === true;
  const isWhatNumberSession = room?.game_type === "what_number" && room.status !== "LOBBY";

  const forceEndGame = (): void => {
    if (window.confirm("Are you sure you want to force terminate this game?")) {
      sendAction("FORCE_END_GAME", {});
    }
  };

  const copyInvite = async (): Promise<void> => {
    const roomCode = code.trim().toUpperCase();
    try {
      await navigator.clipboard.writeText(roomCode);
      const copiedMessage = `คัดลอกรหัสห้องแล้ว: ${roomCode}`;
      setNotice(copiedMessage);
      window.setTimeout(() => {
        setNotice((current) => current === copiedMessage ? null : current);
      }, 2500);
    } catch {
      setNotice("ไม่สามารถคัดลอกรหัสห้องได้");
    }
  };

  const exitRoom = (): void => {
    leaveRoom();
    navigate("/");
  };

  const displayError = notice ?? notification ?? (!isConnected ? error : null);

  return (
    <main className={cn(
      "min-h-screen",
      isWhatNumberSession ? "px-2 py-2 sm:px-3 sm:py-3" : "px-4 py-5 sm:px-7 sm:py-7",
    )}>
      <div className="ambient ambient-one" />
      <div className={cn(
        "mx-auto w-full",
        isWhatNumberSession ? "max-w-[120rem]" : "max-w-5xl",
      )}>
        <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 backdrop-blur-xl sm:px-5">
          <button type="button" onClick={exitRoom} className="ghost-button">
            <ArrowLeft className="size-4" /> Exit room
          </button>
          <div className="flex items-center gap-3">
            {room?.status === "PLAYING" && user.is_admin && (
              <button
                type="button"
                onClick={forceEndGame}
                className="inline-flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-500/15 px-3 py-2 text-xs font-black text-red-200 transition hover:bg-red-500/25"
              >
                <OctagonX className="size-4" /> Force End Game (Admin)
              </button>
            )}
            <div className="text-right">
              <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Room code</p>
              <p className="font-mono text-lg font-black tracking-[0.2em] text-white">{code.toUpperCase()}</p>
            </div>
            <button type="button" onClick={() => void copyInvite()} className="icon-button size-10" aria-label="Copy room code">
              <Clipboard className="size-4" />
            </button>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold",
              connectionStatus === "CONNECTED" ? "bg-mint/10 text-mint" : "bg-white/5 text-slate-400",
            )}
          >
            {connectionStatus === "CONNECTING" ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Radio className="size-3.5" />
            )}
            {connectionStatus.toLowerCase()}
          </div>
        </header>

        {room === null ? (
          <section className="relative z-10 grid min-h-[70vh] place-items-center text-center">
            <div>
              <LoaderCircle className="mx-auto size-8 animate-spin text-cyan" />
              <h1 className="mt-5 font-display text-3xl font-black text-white">Joining the table…</h1>
              <p className="mt-2 text-sm text-slate-500">Connecting you to room {code.toUpperCase()}</p>
            </div>
          </section>
        ) : room.status === "LOBBY" ? (
          <section className="relative z-10 mx-auto max-w-3xl pt-16 pb-14 sm:pt-24">
            <div className="text-center">
              <p className="eyebrow">Private {room.game_type === "what_number" ? "What number I have?" : "Tic-Tac-Toe"} room</p>
              <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-white sm:text-6xl">Gather your players.</h1>
              <p className="mx-auto mt-4 max-w-lg text-slate-400">All players need to mark themselves ready. The host starts when at least {minPlayers} players are seated.</p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: maxPlayers }, (_, index) => {
                const player = room.players[index];
                return (
                  <PlayerSlot
                    key={player?.id ?? `empty-${String(index)}`}
                    player={player}
                    label={player?.is_host === true ? "Host" : player?.is_bot === true ? "Test bot" : `Player ${String(index + 1)}`}
                  />
                );
              })}
            </div>

            <div className="panel mt-5 flex flex-col items-stretch justify-between gap-4 p-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                {currentPlayer?.is_ready === true ? (
                  <Check className="size-5 text-mint" />
                ) : (
                  <CircleDashed className="size-5 text-slate-500" />
                )}
                <div>
                  <p className="font-bold text-white">{currentPlayer?.is_ready === true ? "You're ready" : "Ready to play?"}</p>
                  <p className="text-xs text-slate-500">You can change this until the game starts.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { toggleReady(currentPlayer?.is_ready !== true); }}
                className={currentPlayer?.is_ready === true ? "secondary-button" : "primary-button"}
              >
                {currentPlayer?.is_ready === true ? "Unready" : "I'm ready"}
              </button>
            </div>

            {currentPlayer?.is_host === true && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {room.game_type === "what_number" && room.players.length < minPlayers && (
                  <button
                    type="button"
                    onClick={() => { sendAction("ADD_TEST_BOTS", { count: minPlayers - room.players.length }); }}
                    className="secondary-button py-4 text-base"
                  >
                    <Bot className="size-5" /> Add Test Bots (Fill to 3)
                  </button>
                )}
                <button type="button" onClick={startGame} disabled={!canStart} className="primary-button py-4 text-base">
                  <Play className="size-5 fill-current" />
                  {canStart ? "Start game" : `Waiting for ${String(minPlayers)} ready players`}
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className={cn(
            "relative z-10",
            isWhatNumberSession ? "pt-3 pb-3" : "pt-10 pb-20 sm:pt-14",
          )}>
            {!isWhatNumberSession && <div className="mb-8 text-center">
              <p className="eyebrow">Room {room.room_code}</p>
              <h1 className="mt-3 font-display text-3xl font-black text-white sm:text-5xl">
                {room.game_type === "what_number" ? "Read the table. Hide your hand." : "Three in a row wins."}
              </h1>
            </div>}

            {room.game !== null && isTicTacToeView(room.game) && (
              <TicTacToeBoard
                game={room.game}
                canMove={canMove}
                onMove={(position) => { sendAction("MAKE_MOVE", { position }); }}
                onInvalidAttempt={setNotice}
              />
            )}

            {room.game !== null && !isTicTacToeView(room.game) && (
              <WhatNumberGame
                game={room.game}
                players={room.players}
                playerId={profile.playerId}
                isTimerAuthority={room.host_id === profile.playerId}
                sendAction={sendAction}
                notify={setNotice}
                chatMessages={chatMessages}
                sendChat={sendChat}
              />
            )}

            {room.status === "FINISHED" && room.game !== null && (
              <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/75 p-5 backdrop-blur-sm">
                <div className="panel w-full max-w-md p-7 text-center sm:p-9">
                  <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-coral/15 text-2xl text-coral">{isTicTacToeView(room.game) && room.game.status === "draw" ? "=" : "★"}</div>
                  <p className="eyebrow mt-6">Game complete</p>
                  <h2 className="mt-2 font-display text-4xl font-black text-white">
                    {wasForceEnded
                      ? "Game terminated by Admin"
                      : isTicTacToeView(room.game) && room.game.status === "draw"
                      ? "It's a draw."
                      : (isTicTacToeView(room.game) ? room.game.winner : room.game.winner_id) === profile.playerId
                        ? "You won!"
                        : "Good game."}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {wasForceEnded
                      ? "This game was ended immediately and no winner was recorded."
                      : isTicTacToeView(room.game) && room.game.status === "draw"
                        ? "A perfectly balanced board."
                        : "The table is ready whenever you are."}
                  </p>
                  {(currentPlayer?.is_host === true || user.is_admin) && (
                    <button
                      type="button"
                      onClick={() => { sendAction("REMATCH", {}); }}
                      className="primary-button mt-7 w-full"
                    >
                      <Play className="size-4" /> 🔄 เล่นใหม่อีกรอบ (Play Again)
                    </button>
                  )}
                  <button type="button" onClick={exitRoom} className="secondary-button mt-3 w-full">
                    <LogOut className="size-4" /> กลับสู่ห้องพัก (Back to Lobby)
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {isWhatNumberSession && (
        <GameAnnouncer events={gameEvents} currentPlayerId={profile.playerId} />
      )}

      {displayError !== null && (
        <Toast
          message={displayError}
          onDismiss={() => {
            clearError();
            setNotice(null);
          }}
        />
      )}
    </main>
  );
}
