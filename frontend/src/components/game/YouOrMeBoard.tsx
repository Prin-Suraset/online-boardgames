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
  if (rank === 11) return "ไก่";
  if (rank === 12) return "หมู";
  if (rank === 13) return "มังกรจีน";
  return rank === null ? "—" : String(rank);
}

function phaseLabel(phase: YouOrMeView["phase"]): string {
  if (phase === "SELECT_CARD") return "เลือกไพ่ 1 ใบลงคว่ำหน้า";
  if (phase === "BETTING") return "ถึงช่วงวัดใจ ลงเดิมพันกัน!";
  if (phase === "SHOWDOWN") return "หงายไพ่ ดูแต้มกัน!";
  return "จบเกมแล้ว!";
}

type ShowdownStage = "idle" | "inspection" | "winner" | "complete";

const SHOWDOWN_INSPECTION_MS = 3000;
const SHOWDOWN_WINNER_HOLD_MS = 4000;

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
        "flex w-full items-center gap-2 rounded-2xl border border-sky-400/30 bg-[#141B2D]/80 p-2 text-left text-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all sm:gap-3 sm:p-2.5",
        isLocal ? "max-w-[24rem]" : "max-w-[20rem]",
        isTurn
          ? "border-amber-400 bg-[#141B2D]/90 text-white ring-2 ring-amber-400 ring-offset-2 ring-offset-[#070A12] shadow-[0_0_20px_rgba(245,158,11,0.45)]"
          : "border-sky-400/30 bg-[#141B2D]/80 text-slate-100",
        isLocal && !isTurn && "border-sky-400/30",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full border-2 border-sky-300/60 bg-gradient-to-br from-sky-400/30 to-[#0B0F19] text-lg shadow-inner sm:size-10 sm:text-xl",
              isTurn && "border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.7)]",
            )}
          >
            {player?.avatar ?? "?"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-white">{nameOf(player)}</p>
            <p className="truncate text-[9px] font-bold tracking-[0.12em] text-sky-200/75 uppercase">
              {isLocal ? "ที่นั่งของคุณ" : gamePlayer.is_folded ? "หมอบแล้ว" : isTurn ? "ถึงตาเล่น" : "กำลังรอ"}
            </p>
          </div>
          {isTurn && <Crown className="size-4 shrink-0 text-amber-300" />}
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-1 text-[9px] font-black sm:mt-2 sm:gap-2 sm:text-[10px]">
          <span className="rounded-full border border-emerald-300 bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-400 px-2 py-1 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.35)]">
            ❤️ {String(gamePlayer.coins)} เหรียญ
          </span>
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
            ลงแล้ว: {String(gamePlayer.round_bet)}
          </span>
        </div>
      </div>

      <div className="relative flex min-h-14 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-amber-200/20 py-1 sm:min-h-16 sm:w-14">
        {selectedCard !== null ? (
          <YouOrMeCard
            card={selectedCard}
            faceDown={!showCardFace}
            className={cn(
              "w-10 border-sky-300/80 sm:w-11",
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
  const [showdownStage, setShowdownStage] = useState<ShowdownStage>("idle");
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
      if (game.phase !== "FINISHED") {
        showdownRoundRef.current = null;
      }
      return;
    }
    if (showdownRoundRef.current === game.round_number) return;
    showdownRoundRef.current = game.round_number;
    setShowdownStage("inspection");
    const inspectionTimer = window.setTimeout(() => {
      setShowdownStage("winner");
    }, SHOWDOWN_INSPECTION_MS);
    const timer = window.setTimeout(() => {
      setShowdownStage("complete");
      sendAction("SHOWDOWN_COMPLETE", {});
    }, SHOWDOWN_INSPECTION_MS + SHOWDOWN_WINNER_HOLD_MS);
    return () => {
      window.clearTimeout(inspectionTimer);
      window.clearTimeout(timer);
    };
  }, [game.phase, game.round_number, sendAction]);

  const roundResult = useMemo(() => {
    const latest = [...gameEvents].reverse().find(
      (event) => event.event_type === "ROUND_RESULT" && isRoundResultValue(event.value),
    );
    return latest !== undefined && isRoundResultValue(latest.value) ? latest.value : null;
  }, [gameEvents]);

  const activeRoundResult = game.phase === "SHOWDOWN" && roundResult?.round_number === game.round_number
    ? roundResult
    : null;
  const potWon = activeRoundResult?.winners.reduce((total, winner) => total + winner.won_amount, 0) ?? 0;

  const submitRaise = (): void => {
    const amount = Number(betAmount);
    if (!Number.isInteger(amount) || amount <= game.current_bet || amount > maxRaise) {
      notify(`ใส่จำนวนเหรียญเป็นเลขเต็มตั้งแต่ ${String(game.current_bet + 1)} ถึง ${String(maxRaise)} นะ`);
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

      {activeRoundResult !== null && showdownStage === "winner" && (
        <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center p-4">
          <section className="w-full max-w-xl rounded-[2rem] border border-amber-400/50 bg-[#141B2D]/95 p-6 text-center shadow-[0_0_70px_rgba(245,158,11,0.35)] backdrop-blur-xl animate-[modal-pop_240ms_ease-out_both]">
            <p className="text-xs font-black tracking-[0.25em] text-amber-300 uppercase">ผลรอบที่ {String(activeRoundResult.round_number)}</p>
            <h2 className="mt-3 text-2xl font-black text-amber-50 sm:text-3xl">
              {activeRoundResult.is_tie
                ? `🤝 ${activeRoundResult.winners.map((winner) => winner.name).join(" และ ")} แต้มเท่ากัน! แบ่งเหรียญในกองกลางกันไป`
                : `🏆 ${activeRoundResult.winners[0]?.name ?? "ผู้เล่น"} ชนะรอบนี้! รับไป ${String(potWon)} เหรียญ`}
            </h2>
            {activeRoundResult.eliminated_players.length > 0 && (
              <div className="mt-4 space-y-1 text-lg font-black text-rose-200">
                {activeRoundResult.eliminated_players.map((player) => (
                  <p key={player.id}>💀 {player.name} เหรียญหมด ตกรอบแล้ว!</p>
                ))}
              </div>
            )}
            {activeRoundResult.is_game_over && activeRoundResult.overall_winner !== null && (
              <p className="mt-5 border-t border-amber-200/20 pt-4 text-xl font-black text-amber-200 sm:text-2xl">
                👑 จบเกม! {activeRoundResult.overall_winner.name} คว้าแชมป์ด้วย {String(activeRoundResult.overall_winner.total_coins)} เหรียญ!
              </p>
            )}
          </section>
        </div>
      )}

      <div className="relative flex h-[calc(100dvh-9rem)] min-h-0 w-full flex-1 overflow-hidden rounded-3xl border border-sky-400/25 bg-[#070A12] text-slate-100 shadow-[0_0_40px_rgba(56,189,248,0.12)] sm:h-[calc(100dvh-7.5rem)] xl:flex-row">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#070A12] bg-[radial-gradient(ellipse_at_50%_30%,rgba(56,189,248,0.12)_0%,rgba(7,10,18,0.95)_75%)]">
          <div className="w-full flex-1 min-h-0 relative p-2 sm:p-4 overflow-hidden flex items-center justify-center">
            <div className="w-full h-full rounded-[40px] md:rounded-[70px] border-4 md:border-8 border-sky-400/25 shadow-[0_0_40px_rgba(56,189,248,0.12)] bg-gradient-to-b from-[#0F172A]/90 via-[#0B0F19]/90 to-[#0A0E1A]/95 backdrop-blur-md flex flex-col justify-between items-center p-3 sm:p-5 relative overflow-hidden">
              <div className="pointer-events-none absolute inset-4 rounded-[80px] border border-sky-300/25 md:rounded-[120px]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(56,189,248,0.12)_0%,rgba(7,10,18,0)_75%)]" />
              {showdownStage === "inspection" && (
                <div className="pointer-events-none absolute top-1/2 left-1/2 z-40 w-[min(92%,34rem)] -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="rounded-2xl border border-amber-400/70 bg-[#141B2D]/95 px-4 py-3 text-base font-black text-amber-50 shadow-[0_0_42px_rgba(245,158,11,0.38)] sm:px-6 sm:py-4 sm:text-xl">
                    🃏 ปิดเดิมพันแล้ว! มาหงายไพ่กัน...
                  </div>
                </div>
              )}

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
                <div className="flex w-[min(100%,22rem)] flex-col items-center gap-1 rounded-[2rem] border border-sky-400/30 bg-[#141B2D]/80 px-3 py-2 text-center shadow-[0_0_40px_rgba(56,189,248,0.12)] backdrop-blur-md sm:px-5 sm:py-3">
                  <div className="flex items-center justify-center gap-2 text-amber-100">
                    <HandCoins className="size-4 text-amber-300 sm:size-5" />
                    <span className="text-sm font-black sm:text-lg">❤️ กองกลาง: {String(game.pot)} เหรียญ</span>
                  </div>
                  <div className="flex justify-center -space-x-2 text-xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" aria-label="stacked gold and ruby coins">
                    <span>🪙</span><span>🪙</span><span>🔴</span><span>🪙</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold tracking-wider text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.2)] uppercase">
                      รอบที่ {String(game.round_number)} / {String(game.total_rounds)}
                    </span>
                  </div>
                  <p className="rounded-full border border-amber-400/40 bg-amber-400/10 text-[10px] font-semibold tracking-wider text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.2)] sm:text-xs">{phaseLabel(game.phase)}</p>
                  {game.phase === "BETTING" && (
                    <p className="text-[9px] font-bold text-amber-200/60">เดิมพันตอนนี้: {String(game.current_bet)} ❤️</p>
                  )}
                  {lastRound && game.phase !== "BETTING" && (
                    <p className="text-[9px] font-bold text-amber-100/70">
                      รอบก่อน {lastRound.winner_ids.map((id) => nameOf(playerMap.get(id))).join(", ")} ชนะด้วยไพ่ {rankName(lastRound.winning_rank)}
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
                        {ownView.hand.map((card) => {
                          const canSelect = game.phase === "SELECT_CARD" && ownView.selected_card === null;
                          return (
                            <YouOrMeCard
                              key={card.id}
                              card={card}
                              selectable={canSelect}
                              onClick={() => { selectCard(card.id); }}
                              className={cn(
                                "h-15 w-11 shadow-md transition-transform sm:h-18 sm:w-13 md:h-19 md:w-14",
                                canSelect ? "cursor-pointer hover:-translate-y-1.5" : "pointer-events-none",
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

          {isBettingTurn && (
            <div className="absolute right-3 bottom-3 z-30 w-[calc(100%-1.5rem)] max-w-[20rem] rounded-2xl border border-sky-400/30 bg-[#141B2D]/90 p-3 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:right-5 sm:bottom-5 sm:p-4 lg:right-7 lg:w-80">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs font-black tracking-[0.16em] text-amber-100 uppercase">
                  <CircleDollarSign className="size-4 text-amber-300" /> ถึงตาคุณแล้ว!
                </p>
                <span className="text-[10px] font-bold text-emerald-200">มี {String(ownView?.coins ?? 0)} เหรียญ</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {game.current_bet === 0 ? (
                  <button type="button" onClick={() => { sendAction("CHECK", {}); }} className="min-h-10 rounded-xl border-b-2 border-blue-800 bg-gradient-to-r from-sky-500 to-blue-600 px-2 text-xs font-bold text-white shadow-[0_0_16px_rgba(14,165,233,0.4)] transition-all active:translate-y-0.5 active:scale-95">
                    <ShieldCheck className="size-4 text-emerald-300" /> ผ่าน (Check)
                  </button>
                ) : (
                  <button type="button" onClick={() => { sendAction("CALL", {}); }} className="min-h-10 rounded-xl border-b-2 border-blue-800 bg-gradient-to-r from-sky-500 to-blue-600 px-2 text-xs font-bold text-white shadow-[0_0_16px_rgba(14,165,233,0.4)] transition-all active:translate-y-0.5 active:scale-95">
                    <PhoneCall className="mr-1 inline size-4" /> สู้ (Call) {String(callAmount)}
                  </button>
                )}
                <button type="button" onClick={() => { if (window.confirm("หมอบรอบนี้เลยไหม?")) sendAction("FOLD", {}); }} className="min-h-10 rounded-xl border border-slate-600/50 bg-slate-800/80 px-2 text-xs font-black text-slate-300 transition-all hover:bg-slate-700/60 active:scale-95">
                  🛑 หมอบ (Fold)
                </button>
              </div>
              <div className="mt-3 rounded-xl border border-sky-400/20 bg-[#0B0F19]/70 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="you-or-me-raise" className="flex items-center gap-1 text-[10px] font-black tracking-wider text-amber-100/75 uppercase">
                    <ChevronUp className="size-3" /> {game.current_bet === 0 ? "ลงเดิมพัน" : "เกทับ"}
                  </label>
                  <span className="text-[10px] text-amber-200/55">อย่างน้อย {String(game.current_bet + 1)}</span>
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
                    className="w-32 px-4 py-2 bg-[#070A12] border border-sky-400/50 rounded-xl text-center text-lg font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-sky-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button type="button" onClick={submitRaise} className="min-h-10 shrink-0 rounded-xl border-b-2 border-amber-700 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-3 text-xs font-black text-slate-950 shadow-[0_0_18px_rgba(245,158,11,0.45)] transition-all active:translate-y-0.5 active:scale-95">ยืนยัน</button>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {[5, 10, 20].map((increment) => (
                    <button key={increment} type="button" onClick={() => { setQuickRaise(increment); }} className={cn("rounded-lg px-1 py-1.5 text-[10px] font-black text-white transition-all active:scale-95", increment === 5 ? "border border-emerald-300 bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.35)]" : increment === 10 ? "border border-sky-300 bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_0_10px_rgba(56,189,248,0.35)]" : "border border-rose-300 bg-gradient-to-br from-rose-500 to-amber-500 shadow-[0_0_10px_rgba(244,63,94,0.35)]")}>+{String(increment)}</button>
                  ))}
                  <button type="button" onClick={() => { setBetAmount(String(maxRaise)); }} className="rounded-lg border-b-2 border-rose-800 bg-gradient-to-r from-rose-500 to-amber-500 px-1 py-1.5 text-[10px] font-bold text-white shadow-[0_0_16px_rgba(244,63,94,0.4)] transition-all active:translate-y-0.5 active:scale-95">หมดหน้าตัก</button>
                </div>
              </div>
            </div>
          )}

          {game.phase === "FINISHED" && (
            <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-400/60 bg-amber-400/15 px-4 py-2 text-xs font-black text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.45)]">
              <Trophy className="size-4 text-amber-300" /> แชมป์โต๊ะนี้: {nameOf(playerMap.get(game.winner_id ?? ""))}
            </div>
          )}
            </div>
          </div>
        </main>

        <aside className="hidden w-80 flex-shrink-0 flex-col border-l border-sky-400/30 bg-[#070A12]/90 p-3 shadow-2xl backdrop-blur-xl xl:flex">
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
            className="w-full max-w-md animate-[modal-pop_240ms_ease-out_both] rounded-[2rem] border border-sky-400/30 bg-[#141B2D]/95 p-6 text-center shadow-[0_0_40px_rgba(56,189,248,0.18)] backdrop-blur-md"
          >
            <div className="mx-auto w-fit rounded-2xl bg-sky-400/10 p-2 shadow-[0_0_32px_rgba(56,189,248,0.2)]">
              <YouOrMeCard card={pendingCard} className="w-44 -translate-y-3 border-sky-400 ring-2 ring-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.7)] sm:w-52" />
            </div>
            <h2 id="confirm-card-title" className="mt-5 text-xl font-black text-amber-100 sm:text-2xl">ลงไพ่ใบนี้เลยไหม?</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-amber-100/65">ยืนยันแล้วไพ่จะลงคว่ำหน้า เปลี่ยนทีหลังไม่ได้นะ</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <button type="button" onClick={confirmCardSelection} className="primary-button min-h-11 flex-1">✅ ลงใบนี้เลย</button>
              <button type="button" onClick={() => { setPendingCard(null); }} className="secondary-button min-h-11 flex-1">❌ เลือกใหม่</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
