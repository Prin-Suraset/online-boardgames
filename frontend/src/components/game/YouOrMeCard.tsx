import { useState } from "react";

import { cn } from "../../lib/styles";
import type { YouOrMeCardView } from "../../types";

interface YouOrMeCardProps {
  card: YouOrMeCardView;
  className?: string;
  selectable?: boolean;
  onClick?: () => void;
  faceDown?: boolean;
}

export function getCardImagePath(rank: number | string, isFaceUp: boolean = true): string {
  if (!isFaceUp || rank === "BACK") {
    return "/images/cards/fantasy-card-back.png";
  }

  const r = Number(rank);
  if (r >= 1 && r <= 10) {
    return `/images/cards/fantasy-card-number-${String(r)}.png`;
  }
  if (
    r === 11 ||
    String(rank).toUpperCase().includes("ROOSTER") ||
    String(rank).toUpperCase().includes("CHICKEN") ||
    rank === "ไก่"
  ) {
    return "/images/cards/fantasy-card-number-Chicken.png";
  }
  if (
    r === 12 ||
    String(rank).toUpperCase().includes("BOAR") ||
    String(rank).toUpperCase().includes("PIG") ||
    rank === "หมู"
  ) {
    return "/images/cards/fantasy-card-number-Pig.png";
  }
  if (r === 13 || String(rank).toUpperCase().includes("DRAGON") || rank === "มังกรจีน") {
    return "/images/cards/fantasy-card-number-ChineseDragon.png";
  }

  return "/images/cards/fantasy-card-back.png";
}

const rankLabel = (rank: number): string => {
  if (rank === 11) return "🐔";
  if (rank === 12) return "🐗";
  if (rank === 13) return "🐉";
  return String(rank);
};

export function YouOrMeCard({ card, className, selectable = false, onClick, faceDown = false }: YouOrMeCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isFaceDown = faceDown || card.rank === null || !card.is_revealed;
  const imagePath = getCardImagePath(
    isFaceDown ? "BACK" : card.card_key ?? card.rank ?? "BACK",
    !isFaceDown,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isFaceDown ? "Face-down card" : `Card ${String(card.rank)}`}
      className={cn(
        "relative z-10 grid aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-xl border-2 border-sky-300/80 bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 text-slate-900 opacity-100 brightness-100 contrast-100 shadow-md transition-transform",
        selectable && "cursor-pointer hover:-translate-y-1.5 hover:border-sky-400 hover:shadow-[0_0_25px_rgba(56,189,248,0.7)]",
        !selectable && "pointer-events-none cursor-default",
        className,
      )}
    >
      {!imageFailed && (
        <img
          src={imagePath}
          alt=""
          className={cn("absolute inset-0 z-10 size-full object-cover", isFaceDown ? "opacity-100 brightness-100 contrast-100" : "opacity-60 brightness-125 saturate-50")}
          onError={() => { setImageFailed(true); }}
        />
      )}
      {imageFailed && (
        <span
          className={cn(
            "absolute inset-0 grid place-items-center p-1 text-center font-black",
            isFaceDown
              ? "bg-[repeating-linear-gradient(45deg,#0B0F19_0,#0B0F19_8px,#1D4D66_8px,#1D4D66_16px)] text-sky-100"
              : "bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 text-slate-900",
          )}
        >
          {isFaceDown ? (
            <span className="rounded-full border border-sky-300/50 px-2 py-1 text-lg">?</span>
          ) : (
            <span className="text-3xl drop-shadow-md">{rankLabel(card.rank ?? 0)}</span>
          )}
        </span>
      )}
      {!isFaceDown && (
        <span className="absolute top-1 left-1 rounded-full border border-sky-300/80 bg-slate-50/95 px-1.5 py-0.5 text-[9px] font-black text-slate-900 shadow-sm">
          {String(card.rank)}
        </span>
      )}
    </button>
  );
}
