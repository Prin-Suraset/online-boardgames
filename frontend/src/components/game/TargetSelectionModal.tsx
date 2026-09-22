import { Target } from "lucide-react";

import type { Player, WhatNumberPlayerView } from "../../types";

interface TargetSelectionModalProps {
  opponents: readonly WhatNumberPlayerView[];
  players: readonly Player[];
  onSelect: (playerId: string) => void;
}

export function TargetSelectionModal({
  opponents,
  players,
  onSelect,
}: TargetSelectionModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 grid animate-[fade-in_180ms_ease-out_both] place-items-center bg-slate-950/75 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="target-selection-title"
    >
      <section className="panel w-full max-w-2xl animate-[modal-pop_240ms_ease-out_both] border-amber-400/25 bg-slate-950/95 p-6 sm:p-8">
        <div className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full border border-rose-400/30 bg-rose-500/10 text-rose-300">
            <Target className="size-6" />
          </span>
          <h2 id="target-selection-title" className="mt-4 text-2xl font-black text-white">
            เลือกผู้เล่นที่ต้องการโจมตี
          </h2>
          <p className="mt-2 text-sm text-slate-400">เลือกเป้าหมายจากผู้เล่นที่ยังอยู่ในเกม</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {opponents.map((opponent) => {
            const player = players.find((item) => item.id === opponent.player_id);
            const unrevealedCards = opponent.cards.filter((card) => !card.is_revealed).length;
            return (
              <button
                key={opponent.player_id}
                type="button"
                onClick={() => { onSelect(opponent.player_id); }}
                className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/90 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:bg-rose-950/40 hover:shadow-[0_0_28px_rgba(251,146,60,0.2)] focus-visible:border-amber-300"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-full border border-amber-200/20 bg-amber-950 text-xl font-black text-amber-100 transition group-hover:border-amber-300/70 group-hover:ring-4 group-hover:ring-rose-500/15">
                  {player?.avatar ?? "?"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-black text-white">
                    {player?.name ?? opponent.player_id}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-slate-400">
                    การ์ดที่ยังไม่เปิด {unrevealedCards} ใบ
                  </span>
                </span>
                <Target className="size-6 shrink-0 text-slate-600 transition group-hover:scale-110 group-hover:text-rose-300" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
