interface CenterTableProps {
  cards: readonly number[];
}

export function CenterTable({ cards }: CenterTableProps) {
  return (
    <section className="mt-3 w-[min(90vw,38rem)] max-w-full rounded-2xl border border-sky-400/30 bg-[#141B2D]/80 p-2 shadow-[0_0_20px_rgba(56,189,248,0.12)] backdrop-blur-md sm:mt-4 sm:p-3">
      <div className="flex items-center justify-center">
        <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold tracking-wider text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.2)] sm:px-3 sm:text-xs">
          🔍 กองกลาง (เปิดแล้ว {String(cards.length)} ใบ)
        </span>
      </div>
      <div className="mt-2 flex flex-nowrap justify-center gap-1.5 overflow-x-auto pb-1 sm:mt-3 sm:gap-2">
        {cards.map((number, index) => (
          <span
            key={`${String(number)}-${String(index)}`}
            className="shrink-0 rounded-lg border border-sky-300/80 bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 px-2 py-1 text-xs font-black text-slate-900 shadow-md sm:text-sm"
            aria-label={`การ์ดใบ้เลข ${String(number)} ในกองกลาง`}
          >
            {number}
          </span>
        ))}
      </div>
    </section>
  );
}
