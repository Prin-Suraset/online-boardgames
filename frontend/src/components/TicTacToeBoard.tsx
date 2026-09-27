import { cn } from "../lib/styles";
import type { PlayerMark, TicTacToeView } from "../types";

interface TicTacToeBoardProps {
  game: TicTacToeView;
  canMove: boolean;
  onMove: (position: number) => void;
  onInvalidAttempt: (message: string) => void;
}

function Mark({ mark }: { mark: PlayerMark }) {
  return (
    <span
      className={cn(
        "font-display text-5xl font-black sm:text-6xl",
        mark === "X" ? "text-rose-400" : "text-sky-400",
      )}
    >
      {mark}
    </span>
  );
}

export function TicTacToeBoard({
  game,
  canMove,
  onMove,
  onInvalidAttempt,
}: TicTacToeBoardProps) {
  const attemptMove = (position: number): void => {
    if (game.board[position] !== null) {
      onInvalidAttempt("ช่องนี้มีคนลงแล้ว ลองช่องอื่นนะ");
      return;
    }
    if (!canMove) {
      onInvalidAttempt("รออีกนิด ยังไม่ถึงตาคุณนะ");
      return;
    }
    onMove(position);
  };

  return (
    <section aria-label="กระดานโอเอกซ์" className="mx-auto w-full max-w-xl">
      <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-sky-400/30 bg-[#141B2D]/80 px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <div>
          <p className="eyebrow">สัญลักษณ์ของคุณ</p>
          <p className="mt-1 text-lg font-bold text-white">คุณเล่นเป็น {game.your_mark}</p>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold tracking-wider",
              canMove
                ? "border-amber-400/40 bg-amber-400/10 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                : "border-slate-600/50 bg-slate-800/80 text-slate-300",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                canMove ? "animate-pulse bg-amber-400" : "bg-slate-500",
              )}
            />
            {canMove ? "ตาคุณแล้ว!" : "รอเพื่อนลงก่อน"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-[2rem] border border-sky-400/25 bg-gradient-to-b from-[#0F172A]/90 via-[#0B0F19]/90 to-[#0A0E1A]/95 p-3 shadow-[0_0_40px_rgba(56,189,248,0.12)] backdrop-blur-md sm:gap-3 sm:p-4">
        {game.board.map((cell, index) => (
          <button
            type="button"
            key={index}
            onClick={() => { attemptMove(index); }}
            aria-label={`ช่องที่ ${String(index + 1)}${cell === null ? " ยังว่าง" : ` เป็น ${cell}`}`}
            className={cn(
              "aspect-square rounded-2xl border text-center transition duration-200",
              "border-sky-400/25 bg-[#141B2D]/80 hover:-translate-y-0.5 hover:border-sky-400/60 hover:bg-sky-400/10",
              cell === null && canMove && "cursor-pointer shadow-[inset_0_0_0_1px_rgba(56,189,248,0.08)]",
              cell !== null && "cursor-default",
            )}
          >
            {cell !== null && <Mark mark={cell} />}
          </button>
        ))}
      </div>
    </section>
  );
}
