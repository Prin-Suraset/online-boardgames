interface CenterTableProps {
  cards: readonly number[];
}

export function CenterTable({ cards }: CenterTableProps) {
  return (
    <section className="mt-4 max-w-[min(90vw,38rem)] rounded-2xl border border-amber-300/25 bg-amber-950/35 p-3 shadow-inner">
      <div className="flex items-center justify-center">
        <span className="rounded-full border border-amber-300/35 bg-amber-100 px-3 py-1 text-xs font-black text-amber-950 shadow">
          🔍 กองกลาง (เปิดแล้ว {String(cards.length)} ใบ)
        </span>
      </div>
      <div className="mt-3 flex justify-center gap-2 overflow-x-auto pb-1">
        {cards.map((number, index) => (
          <span
            key={`${String(number)}-${String(index)}`}
            className="shrink-0 rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1.5 text-sm font-black text-amber-950 shadow"
            aria-label={`Center clue card ${String(number)}`}
          >
            {number}
          </span>
        ))}
      </div>
    </section>
  );
}
