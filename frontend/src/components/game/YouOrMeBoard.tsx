import { useMemo, useState } from "react";
import { Coins, Crown, HandCoins, ShieldAlert, Sparkles } from "lucide-react";

import { cn } from "../../lib/styles";
import type { Player, YouOrMePlayerView, YouOrMeView } from "../../types";
import { YouOrMeCard } from "./YouOrMeCard";

interface YouOrMeBoardProps {
  game: YouOrMeView;
  players: readonly Player[];
  playerId: string;
  sendAction: (actionType: string, payload: object) => void;
  notify: (message: string) => void;
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

function PlayerPod({
  gamePlayer,
  player,
  isLocal,
  isTurn,
}: {
  gamePlayer: YouOrMePlayerView;
  player: Player | undefined;
  isLocal: boolean;
  isTurn: boolean;
}) {
  return (
    <article className={cn(
      "rounded-2xl border p-3 shadow-xl backdrop-blur-md",
      isTurn
        ? "border-amber-300/90 bg-amber-950/70 ring-2 ring-amber-400/50"
        : "border-white/10 bg-slate-950/75",
      isLocal && "border-emerald-300/50",
      gamePlayer.is_folded && "opacity-55 grayscale",
    )}>
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-full border border-amber-200/30 bg-amber-400/20 text-lg">
          {player?.avatar ?? "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-black text-white">{nameOf(player)}</p>
          <p className="text-[10px] font-bold tracking-wider text-amber-200/60 uppercase">
            {isLocal ? "You" : gamePlayer.is_folded ? "Folded" : isTurn ? "Your turn" : "Player"}
          </p>
        </div>
        {isTurn && <Crown className="size-4 text-amber-300" />}
      </div>
      <p className="mt-2 flex items-center gap-1 text-xs font-black text-rose-200">
        ❤️ {String(gamePlayer.coins)} Coins
      </p>
      <div className="mt-3 flex min-h-16 items-center justify-center">
        {gamePlayer.selected_card === null ? (
          <div className="grid size-12 place-items-center rounded-lg border border-dashed border-amber-200/25 text-amber-100/30">?</div>
        ) : (
          <YouOrMeCard card={gamePlayer.selected_card} className="w-11" />
        )}
      </div>
    </article>
  );
}

export function YouOrMeBoard({ game, players, playerId, sendAction, notify }: YouOrMeBoardProps) {
  const [raiseAmount, setRaiseAmount] = useState(String(Math.max(5, game.current_bet + 5)));
  const ownView = game.players.find((player) => player.player_id === playerId);
  const currentPlayer = game.players.find((player) => player.player_id === game.current_player_id);
  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const isBettingTurn = game.phase === "BETTING" && game.current_player_id === playerId;
  const callAmount = Math.max(0, game.current_bet - (game.player_round_bets[playerId] ?? 0));
  const maxRaise = ownView?.coins ?? 0;

  const submitRaise = (): void => {
    const amount = Number(raiseAmount);
    if (!Number.isInteger(amount) || amount <= game.current_bet || amount > maxRaise) {
      notify(`Raise must be a whole number from ${String(game.current_bet + 1)} to ${String(maxRaise)}.`);
      return;
    }
    sendAction("BET", { amount });
  };

  const selectCard = (cardId: string): void => {
    if (game.phase !== "SELECT_CARD" || ownView?.selected_card !== null) return;
    sendAction("SELECT_CARD", { card_id: cardId });
  };

  return (
    <section className="relative min-h-[calc(100vh-7rem)] overflow-hidden rounded-[2rem] border border-amber-200/15 bg-[#102c2a] px-3 py-4 shadow-2xl sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute inset-3 rounded-[1.7rem] border border-amber-100/10 bg-[radial-gradient(ellipse_at_center,#1d6850_0%,#123d34_48%,#0a2928_100%)] shadow-[inset_0_0_70px_rgba(0,0,0,0.45)]" />
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black tracking-[0.25em] text-amber-200/70 uppercase">You or me who more than?</p>
          <h1 className="mt-1 text-xl font-black text-white sm:text-3xl">High-stakes bluffing table</h1>
        </div>
        <div className="rounded-xl border border-amber-200/25 bg-slate-950/45 px-3 py-2 text-right">
          <p className="text-[10px] font-black tracking-widest text-amber-200/65 uppercase">Round</p>
          <p className="text-lg font-black text-amber-100">{String(game.round_number)}/{String(game.total_rounds)}</p>
        </div>
      </div>

      <div className="relative z-10 mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="relative min-h-[29rem] rounded-[1.5rem] border border-amber-100/10 bg-black/10 p-3 sm:p-6">
          <div className="mx-auto flex max-w-sm flex-col items-center rounded-3xl border border-amber-300/30 bg-slate-950/35 px-6 py-5 text-center shadow-[0_0_38px_rgba(251,191,36,0.14)]">
            <div className="flex items-center gap-2 text-rose-200"><HandCoins className="size-5 text-amber-300" /><span className="text-xl font-black">❤️ POT: {String(game.pot)} เหรียญ</span></div>
            <div className="mt-3 flex -space-x-2 text-2xl" aria-label="coin stack">🪙🪙🪙</div>
            <p className="mt-2 text-[10px] font-bold tracking-wider text-emerald-100/55 uppercase">{game.phase === "SELECT_CARD" ? "Choose your secret card" : game.phase === "BETTING" ? `Current bet: ${String(game.current_bet)} ❤️` : "Cards on the table"}</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {game.players.map((gamePlayer) => (
              <PlayerPod
                key={gamePlayer.player_id}
                gamePlayer={gamePlayer}
                player={playerMap.get(gamePlayer.player_id)}
                isLocal={gamePlayer.player_id === playerId}
                isTurn={gamePlayer.player_id === game.current_player_id}
              />
            ))}
          </div>
        </div>

        <aside className="rounded-2xl border border-amber-100/10 bg-slate-950/60 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black text-white"><Coins className="size-4 text-amber-300" /> Table actions</h2>
            <Sparkles className="size-4 text-amber-300/70" />
          </div>
          {isBettingTurn ? (
            <div className="mt-4 space-y-2">
              {game.current_bet === 0 && (
                <button type="button" onClick={() => { sendAction("CHECK", {}); }} className="secondary-button w-full">Check</button>
              )}
              {callAmount > 0 && (
                <button type="button" onClick={() => { sendAction("CALL", {}); }} className="primary-button w-full">Call {String(callAmount)} ❤️</button>
              )}
              <label className="block text-[10px] font-black tracking-wider text-amber-100/60 uppercase">
                Bet / Raise
                <input
                  type="number"
                  min={game.current_bet + 1}
                  max={maxRaise}
                  value={raiseAmount}
                  onChange={(event) => { setRaiseAmount(event.target.value); }}
                  className="text-input mt-1 w-full"
                />
              </label>
              <button type="button" onClick={submitRaise} className="secondary-button w-full">Raise</button>
              <button type="button" onClick={() => { if (window.confirm("Fold this round?")) sendAction("FOLD", {}); }} className="w-full rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-200 transition hover:bg-red-500/20">Fold</button>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-400">
              {game.phase === "SELECT_CARD" ? "Select one card from your hand below." : currentPlayer ? `${nameOf(playerMap.get(currentPlayer.player_id))} is thinking…` : "Waiting for the table…"}
            </p>
          )}
          {game.phase === "BETTING" && <p className="mt-4 text-[10px] font-bold text-amber-100/45">Each player can raise once. A high bet may force a fold.</p>}
          {game.round_history.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-[10px] font-black tracking-widest text-amber-200/60 uppercase">Last round</p>
              <p className="mt-2 text-xs text-slate-300">Round {String(game.round_history.at(-1)?.round_number)} winner: {game.round_history.at(-1)?.winner_ids.map((id) => nameOf(playerMap.get(id))).join(", ")}</p>
              <p className="mt-1 text-xs text-amber-200">Rank: {rankName(game.round_history.at(-1)?.winning_rank ?? null)}</p>
            </div>
          )}
        </aside>
      </div>

      <div className="relative z-10 mt-4 rounded-2xl border border-amber-200/20 bg-slate-950/55 p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black tracking-wider text-amber-100 uppercase">Your hand · {String(ownView?.hand_count ?? 0)} cards left</p>
            {game.phase === "SELECT_CARD" && <p className="mt-1 text-xs text-amber-200/70">คลิกเลือกไพ่ 1 ใบเพื่อวางคว่ำลงกระดาน</p>}
          </div>
          {ownView?.selected_card !== null && ownView?.selected_card !== undefined && <span className="text-xs font-bold text-emerald-200">Card selected: {rankName(ownView.selected_card.rank)}</span>}
        </div>
        <div className="mt-4 flex min-h-28 gap-2 overflow-x-auto pb-2">
          {ownView?.hand.map((card) => (
            <YouOrMeCard key={card.id} card={card} selectable={game.phase === "SELECT_CARD" && ownView.selected_card === null} onClick={() => { selectCard(card.id); }} />
          ))}
        </div>
      </div>
      {game.phase === "FINISHED" && <p className="relative z-10 mt-3 flex items-center justify-center gap-2 text-sm font-black text-amber-200"><ShieldAlert className="size-4" /> Winner: {nameOf(playerMap.get(game.winner_id ?? ""))}</p>}
    </section>
  );
}
