import { useEffect, useRef, type KeyboardEvent } from "react";
import { BookOpen, Clock3, Users, X } from "lucide-react";

import { GAME_RULES } from "../data/gameRules";
import type { GameType } from "../types";

interface GameRulesModalProps {
  gameId: GameType;
  onClose: () => void;
}

export function GameRulesModal({ gameId, onClose }: GameRulesModalProps) {
  const rulebook = GAME_RULES[gameId];
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === "Escape") {
      onClose();
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

  if (rulebook === undefined) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/85 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-rules-title"
        aria-describedby="game-rules-subtitle"
        onKeyDown={handleKeyDown}
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700/60 bg-[#161B26]/90 text-white shadow-2xl shadow-black/60 backdrop-blur-md"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-amber-400/10 to-transparent p-5 sm:p-7">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-amber-300">
              <BookOpen className="size-4" /> คู่มือเกม
            </p>
            <h2 id="game-rules-title" className="mt-3 flex items-center gap-3 text-2xl font-black sm:text-3xl">
              <span aria-hidden="true">{rulebook.icon}</span>
              <span>{rulebook.title}</span>
            </h2>
            <p id="game-rules-subtitle" className="mt-2 text-sm leading-6 text-slate-300">{rulebook.subtitle}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-amber-100">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-[#1C212D] px-3 py-1.5 font-semibold tracking-wider text-slate-300"><Users className="size-3.5 text-[#E5A93C]" /> {rulebook.players}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-[#1C212D] px-3 py-1.5 font-semibold tracking-wider text-slate-300"><Clock3 className="size-3.5 text-[#E5A93C]" /> {rulebook.duration}</span>
            </div>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="ปิดคู่มือเกม" className="icon-button !size-10 shrink-0 rounded-full">
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-7">
          {rulebook.sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-slate-700/60 bg-[#1C212D] p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-lg font-black text-amber-100">
                <span aria-hidden="true">{section.icon}</span> {section.title}
              </h3>
              <div className="mt-3 space-y-2.5">
                {section.content.map((paragraph) => (
                  <p key={paragraph} className="border-l-2 border-amber-400/30 pl-3 text-sm leading-7 text-slate-200 sm:text-base">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
