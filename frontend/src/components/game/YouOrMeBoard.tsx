import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronUp,
  CircleDollarSign,
  Crown,
  HandCoins,
  PhoneCall,
  ShieldCheck,
  Trophy,
} from "lucide-react";

import { cn } from "../../lib/styles";
import type {
  ChatMessage,
  GameEvent,
  Player,
  YouOrMeCardView as Card,
  YouOrMePlayerView,
  YouOrMeView,
} from "../../types";
import { ChatBox } from "./ChatBox";
import { ChatDrawer } from "./ChatDrawer";
import { YouOrMeCard } from "./YouOrMeCard";

interface YouOrMeBoardProps {
  game: YouOrMeView;
  players: readonly Player[];
  playerId: string;
  sendAction: (actionType: string, payload: object) => void;
  notify: (message: string) => void;
  gameEvents: readonly GameEvent[];
  chatMessages: readonly ChatMessage[];
  sendChat: (text: string) => void;
}

interface RoundResultWinner {
  id: string;
  name: string;
  won_amount: number;
}

interface RoundResultEliminatedPlayer {
  id: string;
  name: string;
}

interface RoundResultValue {
  round_number: number;
  winners: readonly RoundResultWinner[];
  is_tie: boolean;
  eliminated_players: readonly RoundResultEliminatedPlayer[];
  is_game_over: boolean;
  overall_winner: {
    id: string;
    name: string;
    total_coins: number;
  } | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRoundResultValue(value: unknown): value is RoundResultValue {
  if (!isRecord(value) || typeof value.round_number !== "number" || typeof value.is_tie !== "boolean" || typeof value.is_game_over !== "boolean") {
    return false;
  }
  if (!Array.isArray(value.winners) || !value.winners.every((winner) => (
    isRecord(winner) && typeof winner.id === "string" && typeof winner.name === "string" && typeof winner.won_amount === "number"
  ))) {
    return false;
  }
  if (!Array.isArray(value.eliminated_players) || !value.eliminated_players.every((player) => (
    isRecord(player) && typeof player.id === "string" && typeof player.name === "string"
  ))) {
    return false;
  }
  return value.overall_winner === null || (
    isRecord(value.overall_winner) &&
    typeof value.overall_winner.id === "string" &&
    typeof value.overall_winner.name === "string" &&
    typeof value.overall_winner.total_coins === "number"
  );
}

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

function PlayerPod({
  gamePlayer,
  player,
  isLocal,
  isTurn,
  phase,
}: {
  gamePlayer: YouOrMePlayerView & { round_bet: number };
  player: Player | undefined;
  isLocal: boolean;
  isTurn: boolean;
  phase: YouOrMeView["phase"];
}) {
  const showCardFace = phase === "SHOWDOWN" || phase === "FINISHED";
  const selectedCard = gamePlayer.selected_card;

  return (
    <article
      className={cn(
        "flex w-full items-center gap-2 rounded-2xl border p-2 text-left shadow-[0_12px_26px_rgba(0,0,0,0.48)] backdrop-blur-md transition-all sm:gap-3 sm:p-2.5",
        isLocal ? "max-w-[24rem]" : "max-w-[20rem]",
        isTurn
          ? "border-amber-200 bg-amber-950/85 ring-2 ring-amber-300/80 ring-offset-2 ring-offset-emerald-950 shadow-[0_0_28px_rgba(251,191,36,0.42)]"
          : "border-amber-100/15 bg-slate-950/80",
        isLocal && "border-emerald-200/70",
        gamePlayer.is_folded && "opacity-55 grayscale",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full border-2 border-amber-200/50 bg-gradient-to-br from-amber-300/35 to-rose-950 text-lg shadow-inner sm:size-10 sm:text-xl",
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

        <div className="mt-1.5 flex items-center justify-between gap-1 text-[9px] font-black sm:mt-2 sm:gap-2 sm:text-[10px]">
          <span className="rounded-full border border-rose-300/20 bg-rose-950/70 px-2 py-1 text-rose-100">
            ❤️ {String(gamePlayer.coins)} Coins
          </span>
          <span className="rounded-full border border-amber-300/20 bg-amber-950/65 px-2 py-1 text-amber-100">
            BET: {String(gamePlayer.round_bet)}
          </span>
        </div>
      </div>

      <div className={cn(
        "flex min-h-14 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-amber-200/20 bg-black/10 py-1 sm:min-h-16 sm:w-14",
      )}>
        {selectedCard !== null ? (
          <YouOrMeCard
            card={selectedCard}
            faceDown={!showCardFace}
            className={cn(
              "w-10 border-amber-200/70 sm:w-11",
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

export function YouOrMeBoard({
  game,
  players,
  playerId,
  sendAction,
  notify,
  gameEvents,
  chatMessages,
  sendChat,
}: YouOrMeBoardProps) {
  const [betAmount, setBetAmount] = useState(String(Math.max(5, game.current_bet + 5)));
  const [pendingCard, setPendingCard] = useState<Card | null>(null);
  const showdownRoundRef = useRef<number | null>(null);
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

  useEffect(() => {
    if (game.phase !== "SHOWDOWN") {
      showdownRoundRef.current = null;
      return;
    }
    if (showdownRoundRef.current === game.round_number) return;
    showdownRoundRef.current = game.round_number;
    const timer = window.setTimeout(() => {
      sendAction("SHOWDOWN_COMPLETE", {});
    }, 5000);
    return () => { window.clearTimeout(timer); };
  }, [game.phase, game.round_number, sendAction]);

  const roundResult = useMemo(() => {
    const latest = [...gameEvents].reverse().find(
      (event) => event.event_type === "ROUND_RESULT" && isRoundResultValue(event.value),
    );
    return latest !== undefined && isRoundResultValue(latest.value) ? latest.value : null;
  }, [gameEvents]);

  const activeRoundResult = game.phase === "SHOWDOWN" || game.phase === "FINISHED" ? roundResult : null;
  const potWon = activeRoundResult?.winners.reduce((total, winner) => total + winner.won_amount, 0) ?? 0;

  const submitRaise = (): void => {
    const amount = Number(betAmount);
    if (!Number.isInteger(amount) || amount <= game.current_bet || amount > maxRaise) {
      notify(`Raise must be a whole number from ${String(game.current_bet + 1)} to ${String(maxRaise)}.`);
      return;
    }
    sendAction("BET", { amount });
  };

  const selectCard = (cardId: string): void => {
    if (game.phase !== "SELECT_CARD" || ownView === undefined || ownView.selected_card !== null) return;
    const card = ownView.hand.find((handCard) => handCard.id === cardId);
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
    <>
      <ChatDrawer
        messages={chatMessages}
        currentPlayerId={playerId}
        onSend={sendChat}
      />

      {activeRoundResult !== null && (
        <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center p-4">
          <section className="w-full max-w-xl rounded-[2rem] border border-amber-200/60 bg-slate-950/95 p-6 text-center shadow-[0_0_70px_rgba(251,191,36,0.35)] backdrop-blur-xl animate-[modal-pop_240ms_ease-out_both]">
            <p className="text-xs font-black tracking-[0.25em] text-amber-300 uppercase">Round {String(activeRoundResult.round_number)} result</p>
            <h2 className="mt-3 text-2xl font-black text-amber-50 sm:text-3xl">
              {activeRoundResult.is_tie
                ? `🤝 รอบนี้ ${activeRoundResult.winners.map((winner) => winner.name).join(" และ ")} เสมอกัน! แบ่งเหรียญคนละครึ่ง`
                : `🏆 รอบนี้ ${activeRoundResult.winners[0]?.name ?? "ผู้เล่น"} ชนะ! กวาด Pot ${String(potWon)} เหรียญ`}
            </h2>
            {activeRoundResult.eliminated_players.length > 0 && (
              <div className="mt-4 space-y-1 text-lg font-black text-rose-200">
                {activeRoundResult.eliminated_players.map((player) => (
                  <p key={player.id}>💀 รอบนี้ {player.name} เหรียญหมด พ่ายแพ้!</p>
                ))}
              </div>
            )}
            {activeRoundResult.is_game_over && activeRoundResult.overall_winner !== null && (
              <p className="mt-5 border-t border-amber-200/20 pt-4 text-xl font-black text-amber-200 sm:text-2xl">
                👑 จบเกม! {activeRoundResult.overall_winner.name} ได้รับชัยชนะด้วยเหรียญทั้งหมด {String(activeRoundResult.overall_winner.total_coins)} เหรียญ!
              </p>
            )}
          </section>
        </div>
      )}

      <div className="relative flex h-[calc(100dvh-9rem)] min-h-0 w-full flex-1 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl sm:h-[calc(100dvh-7.5rem)] xl:flex-row">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#090d16]">
          <div className="w-full flex-1 min-h-0 relative p-2 sm:p-4 overflow-hidden flex items-center justify-center">
            <div className="w-full h-full rounded-[40px] md:rounded-[70px] border-4 md:border-8 border-amber-950 shadow-2xl bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-800 via-emerald-950 to-slate-950 flex flex-col justify-between items-center p-3 sm:p-5 relative overflow-hidden">
              <div className="pointer-events-none absolute inset-4 rounded-[80px] border border-amber-500/20 md:rounded-[120px]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(52,211,153,0.15),transparent_35%),linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.03),transparent_80%)]" />

              <div className="w-full flex justify-center items-center flex-shrink-0 z-10">
                <div className="flex w-full flex-wrap justify-center gap-2 sm:gap-3">
                  {opponents.map((gamePlayer) => (
                    <PlayerPod
                      key={gamePlayer.player_id}
                      gamePlayer={{ ...gamePlayer, round_bet: game.player_round_bets[gamePlayer.player_id] ?? 0 }}
                      player={playerMap.get(gamePlayer.player_id)}
                      isLocal={false}
                      isTurn={gamePlayer.player_id === game.current_player_id}
                      phase={game.phase}
                    />
                  ))}
                </div>
              </div>

              <div className="my-auto flex flex-col items-center justify-center gap-1 z-10">
                <div className="flex w-[min(100%,22rem)] flex-col items-center gap-1 rounded-[2rem] border border-amber-200/30 bg-slate-950/55 px-3 py-2 text-center shadow-[0_0_42px_rgba(251,191,36,0.17)] backdrop-blur-sm sm:px-5 sm:py-3">
                  <div className="flex items-center justify-center gap-2 text-rose-100">
                    <HandCoins className="size-4 text-amber-300 sm:size-5" />
                    <span className="text-sm font-black sm:text-lg">❤️ POT: {String(game.pot)} เหรียญ</span>
                  </div>
                  <div className="flex justify-center -space-x-2 text-xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" aria-label="stacked gold and ruby coins">
                    <span>🪙</span><span>🪙</span><span>🔴</span><span>🪙</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="rounded-full border border-amber-300/50 bg-amber-400/15 px-3 py-1 text-[10px] font-black tracking-[0.18em] text-amber-100 uppercase">
                      ROUND {String(game.round_number)} / {String(game.total_rounds)}
                    </span>
                  </div>
                  <p className="text-[10px] font-black text-emerald-100 sm:text-xs">{phaseLabel(game.phase)}</p>
                  {game.phase === "BETTING" && (
                    <p className="text-[9px] font-bold text-amber-200/60">Current table bet: {String(game.current_bet)} ❤️</p>
                  )}
                  {lastRound && game.phase !== "BETTING" && (
                    <p className="text-[9px] font-bold text-amber-100/70">
                      Last winner: {lastRound.winner_ids.map((id) => nameOf(playerMap.get(id))).join(", ")} · {rankName(lastRound.winning_rank)}
                    </p>
                  )}
                </div>
              </div>

              <div className="w-full flex flex-col items-center gap-1.5 flex-shrink-0 z-20">
                {ownView && (
                  <>
                    <PlayerPod
                      gamePlayer={{ ...ownView, round_bet: game.player_round_bets[playerId] ?? 0 }}
                      player={playerMap.get(playerId)}
                      isLocal
                      isTurn={isBettingTurn}
                      phase={game.phase}
                    />
                    <div className="flex max-w-full flex-col items-center gap-1 overflow-visible">
                      {game.phase === "SELECT_CARD" && (
                        <p className="text-[10px] font-medium text-amber-300/80 sm:text-xs">คลิกเลือกไพ่ 1 ใบ</p>
                      )}
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        {ownView.hand.map((card) => (
                          <YouOrMeCard
                            key={card.id}
                            card={card}
                            selectable={game.phase === "SELECT_CARD" && ownView.selected_card === null}
                            onClick={() => { selectCard(card.id); }}
                            className="w-11 h-15 sm:w-13 sm:h-18 md:w-14 md:h-19 shadow-2xl transition-transform hover:-translate-y-3"
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

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
        </main>

        <aside className="hidden w-80 flex-shrink-0 flex-col border-l border-slate-800 bg-slate-900/90 p-3 xl:flex">
          <ChatBox
            messages={chatMessages}
            currentPlayerId={playerId}
            onSend={sendChat}
          />
        </aside>
      </div>

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
    </>
  );
}
