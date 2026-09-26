import { useEffect, useState, type SyntheticEvent } from "react";
import { ChevronDown, Clock3, Crown, LogOut, Play, Send, Sparkles, Trophy } from "lucide-react";

import { cn } from "../../lib/styles";
import type { ChatMessage, Player, Top100View } from "../../types";
import { ChatBox } from "./ChatBox";
import { ChatDrawer } from "./ChatDrawer";

interface Top100BoardProps {
  roomCode: string;
  game: Top100View;
  players: readonly Player[];
  playerId: string;
  sendAction: (actionType: string, payload: object) => void;
  chatMessages: readonly ChatMessage[];
  sendChat: (text: string) => void;
  canRematch: boolean;
  onRematch: () => void;
  onExit: () => void;
}

export function Top100Board({
  roomCode,
  game,
  players,
  playerId,
  sendAction,
  chatMessages,
  sendChat,
  canRematch,
  onRematch,
  onExit,
}: Top100BoardProps) {
  const [inputText, setInputText] = useState("");
  const [showReveal, setShowReveal] = useState(true);
  const turnKey = `${String(game.round_number)}:${game.turn_player_id ?? "finished"}:${String(game.turn_timer)}`;
  const [clock, setClock] = useState({ key: turnKey, seconds: game.turn_timer });
  const secondsRemaining = game.status === "FINISHED"
    ? 0
    : clock.key === turnKey ? clock.seconds : game.turn_timer;
  const timerProgress = Math.max(0, Math.min(100, secondsRemaining / 30 * 100));
  const activePlayer = players.find((player) => player.id === game.turn_player_id);
  const canGuess = game.status === "PLAYING" && game.is_my_turn && secondsRemaining > 0;
  const revealOpen = game.status === "FINISHED" && showReveal;

  useEffect(() => {
    if (game.status !== "PLAYING") return;
    const deadline = Date.now() + game.turn_timer * 1000;
    const interval = window.setInterval(() => {
      setClock({
        key: turnKey,
        seconds: Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
      });
    }, 250);
    return () => { window.clearInterval(interval); };
  }, [game.status, game.turn_timer, turnKey]);

  useEffect(() => {
    if (!revealOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [revealOpen]);

  const submitGuess = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const guess = inputText.trim();
    if (!canGuess || guess === "") return;
    sendAction("SUBMIT_GUESS", { guess });
    setInputText("");
  };

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[33rem] w-full gap-4 bg-[#0B0F19] text-white">
      <section aria-label="โต๊ะเกม Top 1-100" className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-amber-300/20 bg-[radial-gradient(ellipse_at_50%_12%,#243145_0%,#121a29_48%,#0B0F19_100%)] shadow-[inset_0_0_70px_rgba(0,0,0,0.25)]">
        <div className="pointer-events-none absolute top-16 left-1/2 h-64 w-80 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />

        <header className="relative z-10 border-b border-amber-200/10 bg-[#101725]/75 px-4 py-4 pr-16 sm:px-6 sm:pr-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.25em] text-amber-300 uppercase">Top 1-100 by ChatGPT</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-200">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">ห้อง {roomCode}</span>
                <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-amber-200">รอบ {game.round_number}/10</span>
              </div>
            </div>
            <div className="min-w-36 rounded-2xl border border-amber-400/20 bg-slate-950/70 px-4 py-2.5 sm:min-w-44">
              <div className="flex items-center justify-between gap-3 text-sm font-black">
                <span className="flex items-center gap-1.5 text-slate-300"><Clock3 className="size-4 text-amber-300" /> เวลา</span>
                <span role="timer" aria-label="เวลาที่เหลือ" className={secondsRemaining <= 10 ? "text-rose-300" : "text-amber-200"}>
                  {secondsRemaining} วิ
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700" aria-hidden="true">
                <div className={cn("h-full rounded-full transition-[width] duration-300", secondsRemaining <= 10 ? "bg-rose-400" : "bg-amber-400")} style={{ width: `${String(timerProgress)}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="ผู้เล่นในห้อง">
            {players.map((player) => (
              <span key={player.id} className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                player.id === game.turn_player_id
                  ? "border-amber-300 bg-amber-400/15 text-amber-100 shadow-[0_0_12px_rgba(229,169,60,0.25)]"
                  : "border-white/10 bg-white/5 text-slate-400",
              )}>
                <span aria-hidden="true">{player.avatar}</span>
                {player.id === playerId ? "คุณ" : player.name}
                {player.id === game.turn_player_id && <span className="text-[10px]">กำลังทาย</span>}
              </span>
            ))}
          </div>
        </header>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-7 sm:py-8">
          <div className="mx-auto w-full max-w-3xl rounded-3xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-400/15 via-[#1D2634] to-[#111827] px-5 py-6 text-center shadow-[0_0_36px_rgba(229,169,60,0.22)] sm:px-8 sm:py-8">
            <p className="text-xs font-bold tracking-[0.25em] text-amber-300 uppercase">หมวดคำตอบ</p>
            <h1 className="mt-3 font-display text-2xl font-black leading-snug text-amber-100 sm:text-4xl">🎯 หัวข้อ: {game.topic_title}</h1>
          </div>

          {game.revealed_chronological_items.length > 0 && (
            <section className="mx-auto mt-8 w-full max-w-6xl" aria-label="คำตอบที่ทายถูกตามลำดับ" aria-live="polite">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-300">
                <Sparkles className="size-4 text-amber-300" /> คำตอบที่ค้นพบ · {game.revealed_chronological_items.length} / 100
              </div>
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {game.revealed_chronological_items.map((item, index) => (
                  <article key={`${String(index)}-${item.name}`} className={cn(
                    "rounded-2xl border p-4 shadow-lg",
                    item.is_mine
                      ? "border-amber-300/60 bg-gradient-to-br from-amber-400/20 to-[#1A2230] shadow-amber-500/10"
                      : "border-cyan-200/15 bg-[#182536]/85 shadow-black/20",
                  )}>
                    <div className="flex items-start gap-3">
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-black", item.is_mine ? "bg-amber-300 text-slate-950" : "bg-cyan-300/15 text-cyan-100")}>
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="break-words text-base font-black text-white">{item.is_mine && <Crown className="mr-1 inline size-4 text-amber-300" />}{item.name}</h2>
                        <p className="mt-1 text-xs text-slate-300">{item.is_mine ? "คำตอบของคุณ" : `ตอบโดย: ${item.by ?? "ผู้เล่น"}`}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                      {item.is_mine || game.status === "FINISHED" ? (
                        <>
                          <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-amber-100">อันดับ {item.rank}</span>
                          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-emerald-200">+{item.points} แต้ม</span>
                        </>
                      ) : (
                        <span className="rounded-full border border-cyan-200/20 bg-slate-950/50 px-2.5 py-1 text-cyan-100">อันดับ: ???</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="relative z-10 shrink-0 border-t border-amber-300/20 bg-[#0D1422]/95 px-4 py-4 shadow-[0_-15px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-7">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 lg:flex-row lg:items-end">
            <form onSubmit={submitGuess} className="min-w-0 flex-1">
              <label htmlFor="top100-guess" className="mb-2 block text-xs font-bold text-amber-200">
                {canGuess ? "ถึงตาคุณแล้ว! เลือกคำตอบที่มั่นใจ" : game.status === "FINISHED" ? "จบเกมแล้ว" : `รอ ${activePlayer?.name ?? "ผู้เล่น"} ทายคำตอบ`}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="top100-guess"
                  type="text"
                  maxLength={200}
                  autoComplete="off"
                  value={inputText}
                  onChange={(event) => { setInputText(event.target.value); }}
                  disabled={!canGuess}
                  placeholder={canGuess ? "พิมพ์คำตอบของคุณที่นี่ (มีเวลา 30 วิ)..." : "รอเทิร์นของคุณ..."}
                  className={cn(
                    "min-w-0 flex-1 rounded-xl px-4 py-3 text-sm outline-none transition sm:text-base",
                    canGuess
                      ? "border-2 border-amber-400 bg-slate-900 text-white shadow-[0_0_18px_rgba(229,169,60,0.22)] placeholder:text-slate-400 focus:border-cyan-300"
                      : "cursor-not-allowed border-2 border-slate-800 bg-slate-950/60 text-slate-500 placeholder:text-slate-600",
                  )}
                />
                <button type="submit" disabled={!canGuess || inputText.trim() === ""} className="primary-button min-h-12 justify-center px-5 disabled:cursor-not-allowed disabled:opacity-40">
                  <Send className="size-4" /> ส่งคำตอบ (Submit)
                </button>
              </div>
            </form>
            <div className="self-start rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-100 lg:self-end" aria-label="คะแนนส่วนตัว">
              คะแนนของคุณ: {game.my_score} แต้ม
            </div>
          </div>
        </div>

        {game.status === "FINISHED" && !showReveal && (
          <button type="button" onClick={() => { setShowReveal(true); }} className="absolute top-36 right-4 z-20 rounded-full border border-amber-300/50 bg-slate-900 px-4 py-2 text-sm font-bold text-amber-200 shadow-lg sm:top-28">
            <Trophy className="mr-1 inline size-4" /> ดูผลคะแนน
          </button>
        )}
      </section>

      <aside className="hidden h-full w-80 shrink-0 xl:flex" aria-label="แชตในห้อง">
        <ChatBox messages={chatMessages} currentPlayerId={playerId} onSend={sendChat} />
      </aside>
      <ChatDrawer messages={chatMessages} currentPlayerId={playerId} onSend={sendChat} />

      {revealOpen && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/85 p-3 backdrop-blur-md sm:p-6">
          <section role="dialog" aria-modal="true" aria-labelledby="top100-results-title" className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-amber-300/60 bg-[#141D2B] shadow-[0_0_50px_rgba(229,169,60,0.25)]">
            <div className="flex items-start justify-between gap-3 border-b border-amber-300/20 bg-gradient-to-r from-amber-400/20 to-transparent px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-amber-300 uppercase">Grand reveal · 10 รอบ</p>
                <h2 id="top100-results-title" className="mt-2 font-display text-2xl font-black text-white sm:text-4xl"><Trophy className="mr-2 inline size-7 text-amber-300" /> เปิดคะแนนสุดท้าย!</h2>
              </div>
              <button type="button" onClick={() => { setShowReveal(false); }} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10">ดูบอร์ด</button>
            </div>
            <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-7">
              <ol className="space-y-2" aria-label="อันดับคะแนนสุดท้าย">
                {(game.final_rankings ?? []).map((ranking) => (
                  <li key={ranking.player_id} className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3",
                    ranking.position === 1 ? "border-amber-300/60 bg-amber-400/15" : "border-white/10 bg-white/5",
                  )}>
                    <span className="w-10 text-center text-lg font-black text-amber-200">#{ranking.position}</span>
                    {ranking.position === 1 && <Crown className="size-5 shrink-0 text-amber-300" aria-label="ผู้ชนะ" />}
                    <span className="min-w-0 flex-1 truncate font-bold text-white">{ranking.player_name}{ranking.player_id === playerId ? " (คุณ)" : ""}</span>
                    <strong className="whitespace-nowrap text-amber-100">{ranking.score} แต้ม</strong>
                  </li>
                ))}
              </ol>
              <details className="group mt-5 rounded-2xl border border-amber-300/20 bg-slate-950/40 p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-amber-100">
                  ดูเฉลยทั้ง 100 อันดับ <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(game.answer_sheet ?? []).map((answer) => (
                    <li key={answer.rank} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      <span className="font-black text-amber-300">#{answer.rank}</span> <span className="font-semibold text-white">{answer.name}</span>
                      {answer.aliases.length > 0 && <p className="mt-1 break-words text-xs text-slate-400">{answer.aliases.join(" · ")}</p>}
                    </li>
                  ))}
                </ol>
              </details>
            </div>
            <div className="flex flex-col gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:px-7">
              {canRematch && <button type="button" onClick={onRematch} className="primary-button flex-1 justify-center"><Play className="size-4" /> เล่นอีกตา</button>}
              <button type="button" onClick={onExit} className="secondary-button flex-1 justify-center"><LogOut className="size-4" /> กลับไปห้องรอเพื่อน</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
