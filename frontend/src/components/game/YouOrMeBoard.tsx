import { useMemo, useState } from "react";
import {
  Check,
  ChevronUp,
  CircleDollarSign,
  Coins,
  Crown,
  HandCoins,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";

import { cn } from "../../lib/styles";
import type { Player, YouOrMeCardView as Card, YouOrMePlayerView, YouOrMeView } from "../../types";
import { YouOrMeCard } from "./YouOrMeCard";

interface YouOrMeBoardProps {
  game: YouOrMeView;
  players: readonly Player[];
  playerId: string;
  sendAction: (actionType: string, payload: object) => void;
  notify: (message: string) => void;
}

type SeatPosition = "top" | "top-left" | "top-right" | "left" | "right" | "local";

function nameOf(player: Player | undefined): string {
  return player?.name ?? "ผู้เล่น";
}

function rankName(rank: number | null): string {
  if (rank === 11) return "ROOSTER";
  if (rank === 12) return "BOAR";
  if (rank === 13) return "DRAGON";
  return rank === null ? "—" : String(rank);
}

function phaseLabel(phase: YouOrMeView["phase"]): string {
  if (phase === "SELECT_CARD") return "วางไพ่คว่ำหน้าของคุณ";
  if (phase === "BETTING") return "ตานี้ใครได้มากกว่า?";
  if (phase === "SHOWDOWN") return "เปิดไพ่ตัดสิน!";
  return "สรุปผลการแข่งขัน";
}

function seatPositionClass(position: SeatPosition): string {
  if (position === "local") {
    return "bottom-3 left-1/2 w-48 -translate-x-1/2 sm:bottom-5";
  }
  if (position === "top") {
    return "top-4 left-1/2 w-48 -translate-x-1/2 md:top-6";
  }
  if (position === "top-left") {
    return "top-[12%] left-[3%] w-44 sm:left-[8%] md:w-48";
  }
  if (position === "top-right") {
    return "top-[12%] right-[3%] w-44 sm:right-[8%] md:w-48";
  }
  if (position === "left") {
    return "top-1/2 left-1 w-44 -translate-y-1/2 sm:left-5 md:w-48";
  }
  return "top-1/2 right-1 w-44 -translate-y-1/2 sm:right-5 md:w-48";
}

function opponentPositions(opponentCount: number): SeatPosition[] {
  if (opponentCount === 1) return ["top"];
  if (opponentCount === 2) return ["top-left", "top-right"];
  return ["top", "left", "right"];
}

function PlayerPod({
  gamePlayer,
  player,
  isLocal,
  isTurn,
  position,
  phase,
}: {
  gamePlayer: YouOrMePlayerView & { round_bet: number };
  player: Player | undefined;
  isLocal: boolean;
  isTurn: boolean;
  position: SeatPosition;
  phase: YouOrMeView["phase"];
}) {
  const showCardFace = phase === "SHOWDOWN" || phase === "FINISHED";
  const cardIsSelected = gamePlayer.selected_card !== null;

  return (
    <article
      className={cn(
        "absolute z-20 rounded-2xl border p-2.5 text-left shadow-[0_12px_26px_rgba(0,0,0,0.48)] backdrop-blur-md transition-all sm:p-3",
        seatPositionClass(position),
        isTurn
          ? "border-amber-200 bg-amber-950/85 ring-2 ring-amber-300/80 ring-offset-2 ring-offset-emerald-950 shadow-[0_0_28px_rgba(251,191,36,0.42)]"
          : "border-amber-100/15 bg-slate-950/80",
        isLocal && "border-emerald-200/70",
        gamePlayer.is_folded && "opacity-55 grayscale",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full border-2 border-amber-200/50 bg-gradient-to-br from-amber-300/35 to-rose-950 text-xl shadow-inner",
            isTurn && "border-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.7)]",
          )}
        >
          {player?.avatar ?? "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-black text-white">{nameOf(player)}</p>
          <p className="truncate text-[9px] font-bold tracking-[0.12em] text-amber-200/65 uppercase">
            {isLocal ? "You · Dealer seat" : gamePlayer.is_folded ? "Folded" : isTurn ? "Active turn" : "Player"}
          </p>
        </div>
        {isTurn && <Crown className="size-4 shrink-0 text-amber-300" />}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-black">
        <span className="rounded-full border border-rose-300/20 bg-rose-950/70 px-2 py-1 text-rose-100">
          ❤️ {String(gamePlayer.coins)} Coins
        </span>
        <span className="rounded-full border border-amber-300/20 bg-amber-950/65 px-2 py-1 text-amber-100">
          BET: {String(gamePlayer.round_bet)}
        </span>
      </div>

      <div className="mt-2 flex min-h-16 items-center justify-center rounded-xl border border-dashed border-amber-200/20 bg-black/10 py-1">
        {cardIsSelected ? (
          <YouOrMeCard
            card={gamePlayer.selected_card!}
            faceDown={!showCardFace}
            className={cn(
              "w-11 border-amber-200/70 sm:w-12",
              showCardFace ? "animate-[card-flip_700ms_ease-out]" : "animate-[deal-card_550ms_ease-out]",
            )}
          />
        ) : (
          <div className="grid size-11 place-items-center rounded-lg border border-dashed border-amber-200/25 text-lg text-amber-100/25">?</div>
        )}
      </div>
    </article>
  );
}

export function YouOrMeBoard({ game, players, playerId, sendAction, notify }: YouOrMeBoardProps) {
  const [betAmount, setBetAmount] = useState(String(Math.max(5, game.current_bet + 5)));
  const [pendingCard, setPendingCard] = useState<Card | null>(null);
  const ownView = game.players.find((player) => player.player_id === playerId);
  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const isBettingTurn = game.phase === "BETTING" && game.current_player_id === playerId;
  const callAmount = Math.max(0, game.current_bet - (game.player_round_bets[playerId] ?? 0));
  const maxRaise = ownView?.coins ?? 0;
  const opponents = game.players.filter((player) => player.player_id !== playerId);
  const lastRound = game.round_history.at(-1);

  const submitRaise = (): void => {
    const amount = Number(betAmount);
    if (!Number.isInteger(amount) || amount <= game.current_bet || amount > maxRaise) {
      notify(`Raise must be a whole number from ${String(game.current_bet + 1)} to ${String(maxRaise)}.`);
      return;
    }
    sendAction("BET", { amount });
  };

  const selectCard = (cardId: string): void => {
    if (game.phase !== "SELECT_CARD" || ownView?.selected_card !== null) return;
    const card = ownView?.hand.find((handCard) => handCard.id === cardId);
    if (card) setPendingCard(card);
  };

  const setQuickRaise = (increment: number): void => {
    const quickAmount = Math.min(maxRaise, game.current_bet + increment);
    setBetAmount(String(Math.max(game.current_bet + 1, quickAmount)));
  };

  const confirmCardSelection = (): void => {
    if (!pendingCard) return;
    sendAction("SELECT_CARD", { card_id: pendingCard.id });
    setPendingCard(null);
  };

  return (
    <section className="relative min-h-[calc(100vh-7rem)] overflow-hidden rounded-[2rem] bg-[#090d16] px-1 py-2 sm:px-3 sm:py-4">
      <div className="relative z-10 mb-3 flex items-center justify-between gap-3 px-2 sm:px-4">
        <div>
          <p className="text-[10px] font-black tracking-[0.25em] text-amber-200/65 uppercase">You or me who more than?</p>
          <h1 className="mt-1 text-lg font-black text-white sm:text-2xl">The Golden Bluff Table</h1>
        </div>
        <div className="rounded-xl border border-amber-200/25 bg-slate-950/70 px-3 py-2 text-right shadow-lg">
          <p className="text-[9px] font-black tracking-[0.18em] text-amber-200/65 uppercase">Round</p>
          <p className="text-lg font-black text-amber-100">{String(game.round_number)} / {String(game.total_rounds)}</p>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[1180px] rounded-[100px] border-[12px] border-amber-950 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_2px_8px_rgba(255,255,255,0.15)] md:rounded-[140px] md:border-[16px]">
        <div className="relative flex h-[620px] w-full items-center justify-center overflow-hidden rounded-[88px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-800 via-emerald-950 to-slate-950 p-6 md:h-[680px] md:rounded-[124px]">
          <div className="pointer-events-none absolute inset-4 rounded-[80px] border border-amber-500/20 md:rounded-[120px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(52,211,153,0.15),transparent_35%),linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.03),transparent_80%)]" />

          <div className="absolute top-1/2 left-1/2 z-10 w-[min(70%,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-amber-200/30 bg-slate-950/55 px-4 py-4 text-center shadow-[0_0_42px_rgba(251,191,36,0.17)] backdrop-blur-sm sm:px-7 sm:py-5">
            <div className="flex items-center justify-center gap-2 text-rose-100">
              <HandCoins className="size-5 text-amber-300" />
              <span className="text-base font-black sm:text-xl">❤️ POT: {String(game.pot)} เหรียญ</span>
            </div>
            <div className="mt-2 flex justify-center -space-x-2 text-2xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" aria-label="stacked gold and ruby coins">
              <span>🪙</span><span>🪙</span><span>🔴</span><span>🪙</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="rounded-full border border-amber-300/50 bg-amber-400/15 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-amber-100 uppercase">
                ROUND {String(game.round_number)} / {String(game.total_rounds)}
              </span>
            </div>
            <p className="mt-3 text-xs font-black text-emerald-100 sm:text-sm">{phaseLabel(game.phase)}</p>
            {game.phase === "BETTING" && (
              <p className="mt-1 text-[10px] font-bold text-amber-200/60">Current table bet: {String(game.current_bet)} ❤️</p>
            )}
            {lastRound && game.phase !== "BETTING" && (
              <p className="mt-2 text-[10px] font-bold text-amber-100/70">
                Last winner: {lastRound.winner_ids.map((id) => nameOf(playerMap.get(id))).join(", ")} · {rankName(lastRound.winning_rank)}
              </p>
            )}
          </div>

          {opponents.map((gamePlayer, index) => (
            <PlayerPod
              key={gamePlayer.player_id}
              gamePlayer={{ ...gamePlayer, round_bet: game.player_round_bets[gamePlayer.player_id] ?? 0 }}
              player={playerMap.get(gamePlayer.player_id)}
              isLocal={false}
              isTurn={gamePlayer.player_id === game.current_player_id}
              position={opponentPositions(opponents.length)[index] ?? "top"}
              phase={game.phase}
            />
          ))}

          {ownView && (
            <PlayerPod
              gamePlayer={{ ...ownView, round_bet: game.player_round_bets[playerId] ?? 0 }}
              player={playerMap.get(playerId)}
              isLocal
              isTurn={isBettingTurn}
              position="local"
              phase={game.phase}
            />
          )}

          {isBettingTurn && (
            <div className="absolute right-3 bottom-3 z-30 w-[calc(100%-1.5rem)] max-w-[20rem] rounded-2xl border border-amber-200/35 bg-slate-950/95 p-3 shadow-[0_18px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:right-5 sm:bottom-5 sm:p-4 lg:right-7 lg:w-80">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs font-black tracking-[0.16em] text-amber-100 uppercase">
                  <CircleDollarSign className="size-4 text-amber-300" /> Your move
                </p>
                <span className="text-[10px] font-bold text-emerald-200">{String(ownView?.coins ?? 0)} coins</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {game.current_bet === 0 ? (
                  <button type="button" onClick={() => { sendAction("CHECK", {}); }} className="secondary-button min-h-10 px-2 text-xs">
                    <ShieldCheck className="size-4 text-emerald-300" /> CHECK
                  </button>
                ) : (
                  <button type="button" onClick={() => { sendAction("CALL", {}); }} className="min-h-10 rounded-xl border border-emerald-300/40 bg-emerald-700/80 px-2 text-xs font-black text-emerald-50 transition hover:bg-emerald-600">
                    <PhoneCall className="mr-1 inline size-4" /> CALL {String(callAmount)}
                  </button>
                )}
                <button type="button" onClick={() => { if (window.confirm("Fold this round?")) sendAction("FOLD", {}); }} className="min-h-10 rounded-xl border border-red-300/35 bg-red-700/70 px-2 text-xs font-black text-red-50 transition hover:bg-red-600">
                  🛑 FOLD
                </button>
              </div>
              <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-950/35 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="you-or-me-raise" className="flex items-center gap-1 text-[10px] font-black tracking-wider text-amber-100/75 uppercase">
                    <ChevronUp className="size-3" /> {game.current_bet === 0 ? "BET" : "RAISE"}
                  </label>
                  <span className="text-[10px] text-amber-200/55">min {String(game.current_bet + 1)}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    id="you-or-me-raise"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="ระบุเหรียญ"
                    value={betAmount}
                    onChange={(event) => {
                      const val = event.target.value.replace(/[^0-9]/g, "");
                      setBetAmount(val);
                    }}
                    className="w-32 px-4 py-2 bg-slate-900 border border-amber-500/50 rounded-xl text-center text-lg font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button type="button" onClick={submitRaise} className="primary-button min-h-10 shrink-0 px-3 text-xs">CONFIRM</button>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {[5, 10, 20].map((increment) => (
                    <button key={increment} type="button" onClick={() => { setQuickRaise(increment); }} className="rounded-lg border border-amber-200/15 bg-white/5 px-1 py-1.5 text-[10px] font-black text-amber-100 transition hover:border-amber-300/50 hover:bg-amber-300/10">+{String(increment)}</button>
                  ))}
                  <button type="button" onClick={() => { setBetAmount(String(maxRaise)); }} className="rounded-lg border border-rose-300/25 bg-rose-950/50 px-1 py-1.5 text-[10px] font-black text-rose-100 transition hover:bg-rose-800/70">ALL-IN</button>
                </div>
              </div>
            </div>
          )}

          {game.phase === "FINISHED" && (
            <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-300/45 bg-amber-950/90 px-4 py-2 text-xs font-black text-amber-100 shadow-xl">
              <Trophy className="size-4 text-amber-300" /> Winner: {nameOf(playerMap.get(game.winner_id ?? ""))}
            </div>
          )}
        </div>
      </div>

      <div className="relative z-20 mx-auto mt-3 w-full max-w-[1180px] rounded-2xl border border-amber-200/20 bg-slate-950/85 p-3 shadow-[0_14px_30px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="flex items-center gap-2 text-xs font-black tracking-wider text-amber-100 uppercase">
              <Coins className="size-4 text-amber-300" /> Your hand · {String(ownView?.hand_count ?? 0)} cards left
            </p>
            {game.phase === "SELECT_CARD" && <p className="mt-1 text-xs text-amber-200/70">คลิกเลือกไพ่ 1 ใบเพื่อวางคว่ำลงกระดาน</p>}
          </div>
          {ownView?.selected_card !== null && ownView?.selected_card !== undefined && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-200"><Check className="size-4" /> Card selected</span>
          )}
        </div>
        <div className="mt-3 flex min-h-24 gap-2 overflow-x-auto pb-1">
          {ownView?.hand.map((card) => (
            <YouOrMeCard
              key={card.id}
              card={card}
              selectable={game.phase === "SELECT_CARD" && ownView.selected_card === null}
              onClick={() => { selectCard(card.id); }}
              className="w-14 hover:-translate-y-4 hover:scale-105 transition-all shadow-2xl sm:w-16"
            />
          ))}
        </div>
      </div>

      {game.phase === "FINISHED" && (
        <p className="relative z-10 mt-3 flex items-center justify-center gap-2 text-sm font-black text-amber-200">
          <ShieldAlert className="size-4" /> {nameOf(playerMap.get(game.winner_id ?? ""))} takes the table
        </p>
      )}
      {game.phase === "SELECT_CARD" && (
        <p className="relative z-10 mt-2 flex items-center justify-center gap-2 text-[10px] font-bold text-emerald-100/50">
          <Sparkles className="size-3" /> Secret cards stay hidden until showdown
        </p>
      )}

      {pendingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-card-title"
            className="w-full max-w-md animate-[modal-pop_240ms_ease-out_both] rounded-[2rem] border border-amber-300/35 bg-slate-950/95 p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
          >
            <div className="mx-auto w-fit rounded-2xl bg-amber-300/10 p-2 shadow-[0_0_32px_rgba(251,191,36,0.2)]">
              <YouOrMeCard card={pendingCard} className="w-44 sm:w-52" />
            </div>
            <h2 id="confirm-card-title" className="mt-5 text-xl font-black text-amber-100 sm:text-2xl">ยืนยันการวางไพ่ใบนี้?</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-amber-100/65">ไพ่ใบนี้จะถูกวางคว่ำหน้าลงบนโต๊ะและไม่สามารถเปลี่ยนได้</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <button type="button" onClick={confirmCardSelection} className="primary-button min-h-11 flex-1">✅ ยืนยันลงไพ่ (Confirm)</button>
              <button type="button" onClick={() => { setPendingCard(null); }} className="secondary-button min-h-11 flex-1">❌ ยกเลิก (Cancel)</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
