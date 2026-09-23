import { useEffect, useState, type CSSProperties } from "react";
import {
  Clock3,
  Eye,
  Layers3,
  RadioTower,
  Shield,
  Shuffle,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

import { FlipCard } from "./FlipCard";
import { ChatBox } from "./ChatBox";
import { ChatDrawer } from "./ChatDrawer";
import { CenterTable } from "./CenterTable";
import { cn } from "../../lib/styles";
import type {
  ChatMessage,
  NumberCardView,
  Player,
  SkillCardView,
  WhatNumberPlayerView,
  WhatNumberView,
} from "../../types";

interface WhatNumberBoardProps {
  game: WhatNumberView;
  players: readonly Player[];
  playerId: string;
  secondsLeft: number;
  peekGhost: PeekGhost | null;
  selectedTargetId: string;
  guessedNumber: string;
  isAttacker: boolean;
  hasPenalty: boolean;
  onVolunteer: () => void;
  onRevealCard: (cardId: string) => void;
  onTargetChange: (playerId: string) => void;
  onGuessChange: (value: string) => void;
  onSubmitGuess: () => void;
  onSelectSkill: (skill: SkillCardView) => void;
  chatMessages: readonly ChatMessage[];
  onSendChat: (text: string) => void;
}

export interface PeekGhost {
  targetPlayerId: string;
  cardId: string;
  number: number;
}

interface SeatStyle extends CSSProperties {
  "--seat-x": string;
  "--seat-y": string;
}

interface SeatPlacement {
  style: SeatStyle;
  orientation: "north" | "flank";
  edge: "north" | "left" | "right";
}

const SKILL_ICONS = {
  PEEK: Eye,
  SHIELD: Shield,
  RADAR: RadioTower,
  SWAP: Shuffle,
  SAFE_EXIT: Zap,
} as const;

function displayName(player: Player | undefined, fallback = "ผู้เล่น"): string {
  const candidate = player?.display_name?.trim() || player?.name.trim() || "";
  return candidate
    && !candidate.toLowerCase().startsWith("guest_")
    && !candidate.toLowerCase().startsWith("guest-")
    ? candidate
    : fallback;
}

function seatPlacement(index: number, seatCount: number): SeatPlacement {
  if (seatCount === 1) {
    return {
      style: { "--seat-x": "50%", "--seat-y": "10%" },
      orientation: "north",
      edge: "north",
    };
  }
  if (seatCount === 2) {
    return {
      style: {
        "--seat-x": index === 0 ? "12%" : "88%",
        "--seat-y": "50%",
      },
      orientation: "flank",
      edge: index === 0 ? "left" : "right",
    };
  }
  if (seatCount === 3) {
    const fourPlayerSeats: readonly SeatPlacement[] = [
      {
        style: { "--seat-x": "50%", "--seat-y": "10%" },
        orientation: "north",
        edge: "north",
      },
      {
        style: { "--seat-x": "12%", "--seat-y": "50%" },
        orientation: "flank",
        edge: "left",
      },
      {
        style: { "--seat-x": "88%", "--seat-y": "50%" },
        orientation: "flank",
        edge: "right",
      },
    ];
    return fourPlayerSeats[index] ?? {
      style: { "--seat-x": "50%", "--seat-y": "10%" },
      orientation: "north",
      edge: "north",
    };
  }
  const angle = Math.PI + (Math.PI * index) / (seatCount - 1);
  const cosine = Math.cos(angle);
  const easedCosine = Math.sign(cosine) * Math.pow(Math.abs(cosine), 0.7);
  const x = 50 + 38 * easedCosine;
  return {
    style: {
      "--seat-x": `${String(x)}%`,
      "--seat-y": `${String(50 + 40 * Math.sin(angle))}%`,
    },
    orientation: x <= 24 || x >= 76 ? "flank" : "north",
    edge: x <= 24 ? "left" : x >= 76 ? "right" : "north",
  };
}

function NumberCard({
  card,
  isOwn,
  canReveal,
  index,
  size,
  onReveal,
}: {
  card: NumberCardView;
  isOwn: boolean;
  canReveal: boolean;
  index: number;
  size: "local" | "opponent" | "opponentDense";
  onReveal: (cardId: string) => void;
}) {
  const compact = size !== "local";
  return (
    <FlipCard
      isRevealed={card.is_revealed}
      disabled={!canReveal}
      onClick={() => { onReveal(card.id); }}
      className={cn(
        "animate-[card-deal_500ms_cubic-bezier(0.2,0.8,0.2,1)_backwards] rounded-xl transition-transform duration-200",
        size === "local" && "!h-16 !w-12 !flex-none !aspect-auto sm:!h-[4.5rem] sm:!w-[3.25rem] md:!h-[4.75rem] md:!w-14",
        size === "opponent" && "!h-14 !w-10 !flex-none !aspect-auto",
        size === "opponentDense" && "!h-11 !w-7 !flex-none !aspect-auto",
        canReveal && "cursor-pointer hover:-translate-y-2 hover:rotate-1 hover:scale-105 hover:ring-2 hover:ring-amber-300",
      )}
      style={{ animationDelay: `${String(index * 70)}ms` }}
      {...(canReveal ? { title: "คลิกเพื่อเปิดการ์ดนี้" } : {})}
      ariaLabel={
        canReveal
          ? "คลิกเพื่อเปิดการ์ดนี้"
          : card.is_revealed
            ? `Revealed card ${String(card.number ?? "unknown")}`
            : "Face-down number card"
      }
      back={
        <span
          className={cn(
            "grid size-full place-items-center border font-black shadow-lg",
            compact ? "text-sm" : "text-base sm:text-lg md:text-xl",
            isOwn
              ? "border-cyan-200/30 bg-[radial-gradient(circle_at_50%_35%,#285e68,#102b34_65%)] text-cyan-50"
              : "border-amber-100/20 bg-[repeating-linear-gradient(135deg,#6d3d22,#6d3d22_7px,#3d2217_7px,#3d2217_14px)] text-amber-100",
          )}
        >
          <span className={cn(
            "grid place-items-center rounded-full border border-current/40 bg-black/15",
            compact ? "size-5" : "size-8 sm:size-9 md:size-10",
          )}>
            {isOwn ? card.number ?? "?" : "?"}
          </span>
        </span>
      }
      front={
        <span
          className={cn(
            "grid size-full place-items-center border border-rose-300/45 bg-[radial-gradient(circle_at_50%_35%,#fff7ed,#fed7aa_70%)] font-black text-rose-800 shadow-lg",
            compact ? "text-sm" : "text-base sm:text-lg md:text-xl",
          )}
        >
          {card.number ?? "?"}
        </span>
      }
    />
  );
}

function OpponentSeat({
  gamePlayer,
  player,
  isActive,
  isDense,
  placement,
  peekGhost,
}: {
  gamePlayer: WhatNumberPlayerView;
  player: Player | undefined;
  isActive: boolean;
  isDense: boolean;
  placement: SeatPlacement;
  peekGhost: PeekGhost | null;
}) {
  const isFlank = placement.orientation === "flank";
  return (
    <article
      style={placement.style}
      className={cn(
        "absolute z-20 rounded-2xl border bg-[#071713]/95 p-2 shadow-xl backdrop-blur-sm xl:p-2.5",
        placement.edge === "left" && "left-2 top-1/2 -translate-y-1/2 sm:left-4 xl:left-6 xl:right-auto xl:top-1/2 xl:translate-x-0 xl:-translate-y-1/2",
        placement.edge === "right" && "right-2 top-1/2 -translate-y-1/2 sm:right-4 xl:left-[var(--seat-x)] xl:top-[var(--seat-y)] xl:right-auto xl:-translate-x-1/2 xl:-translate-y-1/2",
        placement.edge === "north" && "top-14 left-1/2 -translate-x-1/2 sm:top-16 xl:left-[var(--seat-x)] xl:top-[var(--seat-y)] xl:right-auto xl:-translate-x-1/2 xl:-translate-y-1/2",
        isFlank
          ? "w-28 sm:w-32 xl:w-36 2xl:w-40"
          : isDense
            ? "w-36 sm:w-40 xl:w-44 2xl:w-48"
            : "w-44 sm:w-48 xl:w-56 2xl:w-60",
        isActive
          ? "animate-[active-seat_2s_ease-in-out_infinite] border-amber-300/80 ring-2 ring-amber-300/20"
          : "animate-[seat-in_450ms_ease-out_both] border-emerald-100/15",
        gamePlayer.status === "ELIMINATED" && "opacity-50 grayscale",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full border border-amber-100/20 bg-[#6d3d22] text-xs font-black text-amber-50">
          {player?.avatar ?? "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-[11px] font-black leading-tight text-white">
            {displayName(player)}
          </p>
          <p className="text-[9px] font-bold tracking-wider text-emerald-100/45 uppercase">
            {gamePlayer.status}
          </p>
        </div>
        <span className="rounded-full bg-violet-400/15 px-1.5 py-0.5 text-[9px] font-bold text-violet-200">
          {gamePlayer.skill_count} skill
        </span>
        {gamePlayer.shield_active && <Shield className="size-4 text-cyan-300" aria-label="Shield active" />}
      </div>
      <div className={cn(
        "mt-2 gap-1",
        isFlank
          ? "grid grid-cols-2 justify-items-center gap-y-0.5 xl:gap-y-1"
          : "flex flex-row justify-center",
      )}>
        {gamePlayer.cards.map((card, index) => (
          <div key={card.id} className="relative">
            <NumberCard
              card={card}
              isOwn={false}
              canReveal={false}
              index={index}
              size={isDense ? "opponentDense" : "opponent"}
              onReveal={() => undefined}
            />
            {peekGhost?.targetPlayerId === gamePlayer.player_id
              && peekGhost.cardId === card.id && (
                <div
                  className="pointer-events-none absolute bottom-[calc(100%+0.6rem)] left-1/2 z-40 flex h-24 w-16 -translate-x-1/2 animate-pulse items-center justify-center rounded-xl border-2 border-cyan-300 bg-gradient-to-br from-cyan-300/25 via-violet-500/25 to-slate-950/80 text-2xl font-black text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.6)] backdrop-blur-md"
                  role="status"
                  aria-label={`Peeked number ${String(peekGhost.number)}`}
                >
                  <span className="drop-shadow-[0_0_8px_rgba(165,243,252,0.9)]">
                    👁️ {String(peekGhost.number)}
                  </span>
                </div>
              )}
          </div>
        ))}
      </div>
    </article>
  );
}

function DeckPile({ label, accent }: { label: string; accent: "amber" | "violet" }) {
  return (
    <div className="text-center">
      <div
        className={cn(
          "relative mx-auto h-24 w-16 rounded-xl border shadow-xl before:absolute before:inset-1 before:-z-10 before:translate-x-1 before:translate-y-1 before:rounded-xl before:border after:absolute after:inset-1 after:-z-20 after:translate-x-2 after:translate-y-2 after:rounded-xl after:border",
          accent === "amber"
            ? "border-amber-200/30 bg-[repeating-linear-gradient(135deg,#6d3d22,#6d3d22_7px,#3d2217_7px,#3d2217_14px)] before:border-amber-900 before:bg-amber-950 after:border-amber-950 after:bg-black"
            : "border-violet-200/30 bg-[radial-gradient(circle_at_center,#7c3aed,#2e1065)] before:border-violet-950 before:bg-violet-950 after:border-violet-950 after:bg-black",
        )}
      >
        <span className="grid size-full place-items-center"><Layers3 className="size-6 text-white/70" /></span>
      </div>
      <p className="mt-2 text-[9px] font-black tracking-wider text-emerald-100/55 uppercase">{label}</p>
    </div>
  );
}

export function WhatNumberBoard({
  game,
  players,
  playerId,
  secondsLeft,
  peekGhost,
  selectedTargetId,
  guessedNumber,
  isAttacker,
  hasPenalty,
  onVolunteer,
  onRevealCard,
  onTargetChange,
  onGuessChange,
  onSubmitGuess,
  onSelectSkill,
  chatMessages,
  onSendChat,
}: WhatNumberBoardProps) {
  const [visibleInsight, setVisibleInsight] = useState<string | null>(null);
  const playerNames = new Map(players.map((player) => [player.id, displayName(player)]));
  const ownView = game.players.find((player) => player.player_id === playerId);
  const opponents = game.players.filter((player) => player.player_id !== playerId);
  const activeOpponents = opponents.filter((player) => player.status === "ACTIVE");
  const selectedTarget = activeOpponents.find(
    (player) => player.player_id === selectedTargetId,
  );
  const parsedGuess = Number(guessedNumber);
  const canSubmitGuess = /^\d+$/.test(guessedNumber)
    && Number.isInteger(parsedGuess)
    && parsedGuess >= 1
    && parsedGuess <= 40;
  const isUrgent = secondsLeft <= Math.min(10, Math.ceil(game.thinking_time_seconds / 3));
  const timePercent = Math.max(
    0,
    Math.min(100, (secondsLeft / game.thinking_time_seconds) * 100),
  );
  const announcement = game.phase === "THINKING"
    ? "The table is choosing an attacker"
    : game.phase === "PENALTY"
      ? `${playerNames.get(game.pending_penalty_player_id ?? "") ?? "ผู้เล่น"} must reveal a card`
      : `${playerNames.get(game.active_player_id ?? "") ?? "ผู้เล่น"} is targeting ${playerNames.get(selectedTargetId) ?? "ผู้เล่นเป้าหมาย"}`;
  const activePlayerName = playerNames.get(game.active_player_id ?? "") ?? "Waiting for player";
  const latestInsight = game.private_insights.at(-1);

  useEffect(() => {
    if (latestInsight === undefined) {
      return;
    }
    const showTimer = window.setTimeout(() => {
      setVisibleInsight(latestInsight);
    }, 0);
    const hideTimer = window.setTimeout(() => {
      setVisibleInsight(null);
    }, 8000);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [game.private_insights, latestInsight]);

  return (
    <>
      <div className="absolute top-6 left-1/2 z-30 flex max-w-[calc(100%-7rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/90 px-3 py-2 text-white shadow-lg backdrop-blur-md sm:gap-3 sm:px-4 xl:hidden">
        <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px] font-black tracking-wide text-emerald-200 sm:text-xs">
          T{game.turn_counter}
        </span>
        <span className="max-w-[7rem] truncate text-xs font-bold text-slate-200 sm:max-w-[10rem]">
          {game.phase === "THINKING" ? "Waiting for volunteer" : activePlayerName}
        </span>
        <span className={cn(
          "flex shrink-0 items-center gap-1 font-mono text-sm font-black",
          isUrgent ? "animate-pulse text-rose-300" : "text-emerald-200",
        )}>
          <Clock3 className="size-3.5" /> {secondsLeft}s
        </span>
        <div className="hidden h-1.5 w-12 overflow-hidden rounded-full bg-black/50 sm:block" aria-label={`${String(secondsLeft)} seconds remaining`}>
          <div
            className={cn("h-full rounded-full transition-[width,background-color] duration-500", isUrgent ? "bg-rose-400" : "bg-cyan-400")}
            style={{ width: `${String(timePercent)}%` }}
          />
        </div>
        {game.phase === "THINKING" && (
          <button
            type="button"
            onClick={onVolunteer}
            className="animate-pulse rounded-full bg-indigo-600 px-2.5 py-1.5 text-[10px] font-black text-white transition hover:bg-indigo-500 sm:px-3 sm:text-xs"
          >
            Volunteer!
          </button>
        )}
      </div>

      <ChatDrawer
        messages={chatMessages}
        currentPlayerId={playerId}
        onSend={onSendChat}
      />

      <div className="relative flex h-full min-h-0 w-full animate-[table-arrive_500ms_ease-out_both] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl xl:flex-row">
      <section className="relative box-border h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-[#050c0b] p-2 sm:p-4">
        <div className="relative box-border h-full w-full overflow-hidden rounded-[3rem] border-4 border-amber-950/70 bg-gradient-to-b from-emerald-800 via-emerald-950 to-slate-950 p-2 shadow-[inset_0_0_90px_rgba(0,0,0,0.7),0_25px_70px_rgba(0,0,0,0.5)] sm:rounded-[5rem] sm:p-4 xl:rounded-[100px] xl:border-8">
          <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.16)_0,transparent_52%),repeating-linear-gradient(115deg,transparent_0,transparent_6px,rgba(255,255,255,0.02)_7px)]" />
          <div className="pointer-events-none absolute inset-3 rounded-[86px] border border-emerald-200/10" />

          <div className="absolute inset-0">
            {opponents.map((gamePlayer, index) => {
              const placement = seatPlacement(index, opponents.length);
              return (
                <OpponentSeat
                  key={gamePlayer.player_id}
                  gamePlayer={gamePlayer}
                  player={players.find((player) => player.id === gamePlayer.player_id)}
                  isActive={game.active_player_id === gamePlayer.player_id}
                  isDense={opponents.length > 5}
                  placement={placement}
                  peekGhost={peekGhost}
                />
              );
            })}
          </div>

          <div className="absolute top-[36%] left-1/2 z-10 w-fit max-w-[calc(100%-1rem)] -translate-x-1/2 -translate-y-1/2 scale-85 rounded-[2rem] border border-emerald-200/10 bg-black/20 px-2 py-2 text-center shadow-inner sm:scale-90 sm:px-4 sm:py-3 md:top-[38%] md:scale-100 xl:top-[42%] xl:px-6 xl:py-4">
            <div className="flex items-end justify-center gap-3 sm:gap-5">
              <DeckPile label="Number deck" accent="amber" />
              <DeckPile label="Skill deck" accent="violet" />
            </div>
            <CenterTable cards={game.revealed_center_cards} />
            <div className="mt-3 flex max-w-64 items-center justify-center gap-2 rounded-full border border-emerald-200/10 bg-emerald-950/80 px-3 py-1.5 text-[10px] font-bold text-emerald-100 sm:mt-4 sm:max-w-72 sm:px-4 sm:py-2 sm:text-xs">
              <Sparkles className="size-3.5 shrink-0 text-amber-300" /> {announcement}
            </div>
          </div>

          {isAttacker && selectedTarget !== undefined && (
            <div className="absolute bottom-36 left-1/2 z-30 flex w-fit max-w-[95vw] -translate-x-1/2 animate-[action-rise_300ms_ease-out_both] flex-wrap items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-md sm:bottom-40 sm:p-3 xl:bottom-44">
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-100">
                <Target className="size-4 text-rose-300" />
                🎯 เป้าหมาย: {playerNames.get(selectedTarget.player_id) ?? "ผู้เล่นเป้าหมาย"}
              </div>
              <button
                type="button"
                onClick={() => { onTargetChange(""); }}
                className="rounded-lg px-2 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-400/10 hover:text-amber-100"
              >
                เปลี่ยนเป้าหมาย
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                aria-label="Guess number from 1 to 40"
                placeholder="ใส่เลข 1 - 40"
                value={guessedNumber}
                onChange={(event) => {
                  onGuessChange(event.target.value.replace(/[^0-9]/g, ""));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canSubmitGuess) {
                    onSubmitGuess();
                  }
                }}
                className="w-36 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-center text-lg font-bold text-white [appearance:textfield] focus:ring-2 focus:ring-amber-400 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={onSubmitGuess}
                disabled={!canSubmitGuess}
                className="primary-button border-amber-400/60 bg-amber-600 px-4 hover:bg-amber-500"
              >
                โจมตี (Attack)
              </button>
            </div>
          )}

          {hasPenalty && (
            <div className="absolute top-[38%] left-1/2 z-30 w-[min(90%,38rem)] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-2xl border-2 border-rose-500 bg-slate-900/95 px-6 py-4 text-center text-lg font-black text-rose-200 shadow-2xl backdrop-blur-md">
              คุณทายผิด! ต้องเลือกเปิดการ์ดของตัวเอง 1 ใบ
            </div>
          )}

          {ownView !== undefined && (
            <article
              className={cn(
                "absolute bottom-2 left-1/2 z-20 flex max-h-[35%] max-w-[95%] -translate-x-1/2 flex-col items-center gap-1.5 overflow-visible rounded-2xl border bg-slate-900/90 px-4 py-2 shadow-xl backdrop-blur-md transition-all duration-300 sm:bottom-3 sm:max-w-none",
                hasPenalty
                  ? "z-40 -translate-y-8 scale-110 border-rose-500 bg-slate-900/95 ring-4 ring-rose-500/70 shadow-2xl"
                  : "z-20 border-slate-700/60",
                game.active_player_id === playerId && !hasPenalty
                  && "animate-[active-seat_2s_ease-in-out_infinite] border-amber-300/80 ring-2 ring-amber-300/20",
                ownView.status === "ELIMINATED" && "opacity-50 grayscale",
              )}
            >
              <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-full border border-cyan-100/30 bg-cyan-900 font-black text-cyan-50">
                    {players.find((player) => player.id === playerId)?.avatar ?? "?"}
                  </span>
                  <div>
                    <p className="text-sm font-black text-white">
                      {displayName(players.find((player) => player.id === playerId), "You")} · You
                    </p>
                    <p className="text-[9px] font-bold tracking-wider text-cyan-100/50 uppercase">
                      {hasPenalty ? "Choose a card to reveal" : ownView.status}
                    </p>
                  </div>
                </div>
                {ownView.shield_active && (
                  <span className="flex items-center gap-1 rounded-full bg-cyan-300/15 px-2 py-1 text-[9px] font-black text-cyan-200 uppercase">
                    <Shield className="size-3" /> Shielded
                  </span>
                )}
              </div>
              <div className="flex shrink-0 justify-center gap-1.5 sm:gap-2">
                {ownView.cards.map((card, index) => (
                  <NumberCard
                    key={card.id}
                    card={card}
                    isOwn
                    canReveal={hasPenalty && !card.is_revealed}
                    index={index}
                    size="local"
                    onReveal={onRevealCard}
                  />
                ))}
              </div>
              {ownView.skills.length > 0 && (
                <div className="flex max-w-full shrink-0 items-center gap-1.5 overflow-x-auto pb-0.5">
                  {ownView.skills.map((skill) => {
                    const Icon = SKILL_ICONS[skill.skill_type];
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        title={skill.description}
                        onClick={() => { onSelectSkill(skill); }}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-bold text-violet-100 transition hover:border-violet-300/50 hover:bg-violet-400/15"
                      >
                        <Icon className="size-4 text-violet-200" />
                        <span>{skill.skill_type.replace("_", " ")}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {visibleInsight !== null && (
                <div className="absolute right-2 bottom-[calc(100%+0.75rem)] z-50 flex w-[min(78vw,24rem)] items-center gap-3 rounded-2xl border-2 border-cyan-400/70 bg-slate-900/95 p-4 text-base font-bold tracking-wide text-amber-200 shadow-2xl backdrop-blur-md md:text-lg lg:top-1/2 lg:right-auto lg:bottom-auto lg:left-[calc(100%+0.75rem)] lg:-translate-y-1/2">
                  <Sparkles className="size-5 shrink-0 text-cyan-300" aria-hidden="true" />
                  <p className="min-w-0 flex-1">{visibleInsight}</p>
                  <button
                    type="button"
                    onClick={() => { setVisibleInsight(null); }}
                    className="rounded-lg px-2 py-1 text-lg leading-none text-cyan-200 transition hover:bg-cyan-300/10 hover:text-white"
                    aria-label="Dismiss private skill result"
                  >
                    ✕
                  </button>
                </div>
              )}
            </article>
          )}
        </div>
      </section>

      <aside className="hidden h-full min-h-0 w-80 max-w-full shrink-0 flex-col gap-4 overflow-hidden border-l border-slate-800 bg-slate-900/90 p-4 xl:flex">
        <section className="shrink-0 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-emerald-200 uppercase">
              Turn {game.turn_counter}
            </span>
            <span className={cn(
              "flex items-center gap-1.5 font-mono text-xl font-black",
              isUrgent ? "animate-pulse text-rose-300" : "text-emerald-200",
            )}>
              <Clock3 className="size-4" /> {secondsLeft}s
            </span>
          </div>
          <h2 className="mt-3 text-lg font-black text-white">{announcement}</h2>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/50 shadow-inner">
            <div
              className={cn(
                "h-full rounded-full transition-[width,background-color] duration-500",
                isUrgent ? "bg-rose-400" : "bg-gradient-to-r from-emerald-300 to-cyan-400",
              )}
              style={{ width: `${String(timePercent)}%` }}
            />
          </div>
        </section>

        {game.phase === "THINKING" && (
          <button type="button" onClick={onVolunteer} className="primary-button w-full shrink-0 py-4 text-base">
            <Zap className="size-5" /> Volunteer to Attack!
          </button>
        )}

        <ChatBox
          messages={chatMessages}
          currentPlayerId={playerId}
          onSend={onSendChat}
        />
      </aside>
      </div>
    </>
  );
}
