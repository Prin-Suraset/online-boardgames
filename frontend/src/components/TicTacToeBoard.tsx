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
        mark === "X" ? "text-coral" : "text-cyan",
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
      <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
        <div>
          <p className="eyebrow">สัญลักษณ์ของคุณ</p>
          <p className="mt-1 text-lg font-bold text-white">คุณเล่นเป็น {game.your_mark}</p>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold",
              canMove
                ? "bg-mint/15 text-mint"
                : "bg-white/8 text-slate-300",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                canMove ? "animate-pulse bg-mint" : "bg-slate-500",
              )}
            />
            {canMove ? "ตาคุณแล้ว!" : "รอเพื่อนลงก่อน"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-[2rem] border border-white/10 bg-slate-950/60 p-3 shadow-2xl shadow-cyan-950/20 sm:gap-3 sm:p-4">
        {game.board.map((cell, index) => (
          <button
            type="button"
            key={index}
            onClick={() => { attemptMove(index); }}
            aria-label={`ช่องที่ ${String(index + 1)}${cell === null ? " ยังว่าง" : ` เป็น ${cell}`}`}
            className={cn(
              "aspect-square rounded-2xl border text-center transition duration-200",
              "border-white/10 bg-white/[0.045] hover:-translate-y-0.5 hover:border-cyan/35 hover:bg-cyan/8",
              cell === null && canMove && "cursor-pointer shadow-[inset_0_0_0_1px_rgba(94,234,212,0.03)]",
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
