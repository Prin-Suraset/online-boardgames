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
      disabled={!selectable}
      aria-label={isFaceDown ? "Face-down card" : `Card ${String(card.rank)}`}
      className={cn(
        "relative grid aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-xl border-2 border-amber-300/80 bg-[#20162b] shadow-[0_8px_22px_rgba(0,0,0,0.35)] transition",
        selectable && "cursor-pointer hover:-translate-y-3 hover:scale-105 hover:border-yellow-200 hover:shadow-[0_0_24px_rgba(250,204,21,0.55)]",
        !selectable && "cursor-default",
        className,
      )}
    >
      {!imageFailed && (
        <img
          src={imagePath}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => { setImageFailed(true); }}
        />
      )}
      {imageFailed && (
        <span
          className={cn(
            "absolute inset-0 grid place-items-center p-1 text-center font-black",
            isFaceDown
              ? "bg-[repeating-linear-gradient(45deg,#261b40_0,#261b40_8px,#51302e_8px,#51302e_16px)] text-amber-100"
              : "bg-[radial-gradient(circle_at_50%_30%,#fff7d6,#d9902f_72%,#7a351f)] text-rose-950",
          )}
        >
          {isFaceDown ? (
            <span className="rounded-full border border-amber-200/50 bg-black/25 px-2 py-1 text-lg">?</span>
          ) : (
            <span className="text-3xl drop-shadow-md">{rankLabel(card.rank ?? 0)}</span>
          )}
        </span>
      )}
      {!isFaceDown && (
        <span className="absolute top-1 left-1 rounded-full border border-amber-100/60 bg-rose-950/75 px-1.5 py-0.5 text-[9px] font-black text-amber-100">
          {String(card.rank)}
        </span>
      )}
    </button>
  );
}
