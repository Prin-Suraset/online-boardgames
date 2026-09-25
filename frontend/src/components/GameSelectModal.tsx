import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Settings2, X } from "lucide-react";

import { catalogGames } from "../lib/gameCatalog";
import type { GameType } from "../types";

interface GameSelectModalProps {
  selectedGame: GameType;
  onSelect: (game: GameType) => void;
  onClose: () => void;
}

export function GameSelectModal({ selectedGame, onSelect, onClose }: GameSelectModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!isClosing) {
      return;
    }
    const timeout = window.setTimeout(onClose, 180);
    return () => { window.clearTimeout(timeout); };
  }, [isClosing, onClose]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === "Escape") {
      setIsClosing(true);
      return;
    }
    if (event.key !== "Tab" || dialogRef.current === null) {
      return;
    }
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first && last !== undefined) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last && first !== undefined) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-md transition-opacity duration-200 ${isClosing ? "opacity-0" : "opacity-100"}`}
      onMouseDown={(event) => { if (event.target === event.currentTarget) setIsClosing(true); }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-select-title"
        onKeyDown={handleKeyDown}
        className={`w-full max-w-xl rounded-3xl border border-amber-400/20 bg-slate-900/95 p-5 shadow-2xl shadow-black/50 transition-transform duration-200 sm:p-7 ${isClosing ? "translate-y-2 scale-95" : "translate-y-0 scale-100"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-amber-300 uppercase">Choose your table</p>
            <h2 id="game-select-title" className="mt-1 text-2xl font-black text-white">Select a game</h2>
            <p className="mt-2 text-sm text-slate-400">Pick the game you want to play in your new room.</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={() => { setIsClosing(true); }} aria-label="Close game selection" className="icon-button !size-9 shrink-0 rounded-full">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 max-h-[min(65vh,32rem)] space-y-3 overflow-y-auto pr-1">
          {catalogGames.map((game) => (
            <button
              key={game.id}
              type="button"
              onClick={() => { onSelect(game.id); setIsClosing(true); }}
              aria-pressed={selectedGame === game.id}
              className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors hover:border-amber-400/60 hover:bg-slate-800 ${selectedGame === game.id ? "border-amber-400/70 bg-amber-400/10" : "border-slate-700 bg-slate-800/50"}`}
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-2xl" aria-hidden="true">{game.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-slate-100">{game.title}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">{game.selectionDetails}</span>
              </span>
              {selectedGame === game.id && <span className="text-xs font-bold text-amber-300">Selected</span>}
            </button>
          ))}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-700/60 bg-slate-800/30 p-4 opacity-65" aria-disabled="true">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-700/60 text-slate-400"><Settings2 className="size-6" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-slate-300">Custom Games</span>
              <span className="mt-1 block text-xs text-slate-500">Bring your own rules to the table.</span>
            </span>
            <span className="rounded-full bg-slate-700 px-2.5 py-1 text-[10px] font-bold text-slate-300 uppercase">Coming soon</span>
          </div>
        </div>
      </section>
    </div>
  );
}
