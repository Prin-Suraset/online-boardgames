interface CenterTableProps {
  cards: readonly number[];
}

export function CenterTable({ cards }: CenterTableProps) {
  return (
    <section className="mt-3 w-[min(90vw,38rem)] max-w-full rounded-2xl border border-amber-300/25 bg-slate-950/35 p-2 shadow-[inset_0_0_24px_rgba(0,0,0,0.35)] sm:mt-4 sm:p-3">
      <div className="flex items-center justify-center">
        <span className="rounded-full border border-amber-300/35 bg-amber-200/90 px-2 py-1 text-[10px] font-black text-amber-950 shadow sm:px-3 sm:text-xs">
          🔍 กองกลาง (เปิดแล้ว {String(cards.length)} ใบ)
        </span>
      </div>
      <div className="mt-2 flex flex-nowrap justify-center gap-1.5 overflow-x-auto pb-1 sm:mt-3 sm:gap-2">
        {cards.map((number, index) => (
          <span
            key={`${String(number)}-${String(index)}`}
            className="shrink-0 rounded-lg border border-amber-300/80 bg-gradient-to-b from-amber-100 to-amber-300 px-2 py-1 text-xs font-black text-amber-950 shadow-[0_3px_10px_rgba(0,0,0,0.25)] sm:text-sm"
            aria-label={`Center clue card ${String(number)}`}
          >
            {number}
          </span>
        ))}
      </div>
    </section>
  );
}
