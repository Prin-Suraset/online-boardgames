import type { CSSProperties, ReactNode } from "react";

import { cn } from "../../lib/styles";

interface FlipCardProps {
  isRevealed: boolean;
  front: ReactNode;
  back: ReactNode;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  style?: CSSProperties;
}

export function FlipCard({
  isRevealed,
  front,
  back,
  ariaLabel,
  className,
  disabled = false,
  onClick,
  title,
  style,
}: FlipCardProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={isRevealed}
      className={cn(
        "group relative aspect-[2/3] w-full [perspective:1000px] disabled:opacity-100",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      title={title}
      style={style}
    >
      <span
        className={cn(
          "absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none",
          isRevealed && "[transform:rotateY(180deg)]",
        )}
      >
        <span className="absolute inset-0 overflow-hidden rounded-xl shadow-[0_10px_22px_rgba(0,0,0,0.35)] [backface-visibility:hidden]">
          {back}
        </span>
        <span className="absolute inset-0 overflow-hidden rounded-xl shadow-[0_10px_22px_rgba(0,0,0,0.35)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {front}
        </span>
      </span>
    </button>
  );
}
