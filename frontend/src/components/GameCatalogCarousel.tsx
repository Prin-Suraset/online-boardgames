import { useEffect, useRef, useState, type UIEvent } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Clock3, Settings2, Swords, Users } from "lucide-react";

import { catalogGames } from "../lib/gameCatalog";
import type { GameType } from "../types";

interface GameCatalogCarouselProps {
  onPlay: (game: GameType) => void;
  onReadRules: (game: GameType) => void;
  isBusy: boolean;
}

const slideCount = catalogGames.length + 1;

function getCardsPerPage(): number {
  if (window.innerWidth >= 1024) return 3;
  if (window.innerWidth >= 768) return 2;
  return 1;
}

export function GameCatalogCarousel({ onPlay, onReadRules, isBusy }: GameCatalogCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(getCardsPerPage);
  const pageCount = Math.ceil(slideCount / cardsPerPage);

  useEffect(() => {
    const handleResize = (): void => {
      const nextCardsPerPage = getCardsPerPage();
      if (nextCardsPerPage !== cardsPerPage) {
        setCardsPerPage(nextCardsPerPage);
        setActiveIndex(0);
        scrollerRef.current?.scrollTo({ left: 0 });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); };
  }, [cardsPerPage]);

  const scrollToIndex = (index: number): void => {
    const scroller = scrollerRef.current;
    if (scroller === null || index < 0 || index >= pageCount) {
      return;
    }
    scroller.scrollTo({
      left: index * scroller.clientWidth,
      behavior: "smooth",
    });
    setActiveIndex(index);
  };

  const handleScroll = (event: UIEvent<HTMLDivElement>): void => {
    const scroller = event.currentTarget;
    setActiveIndex(Math.min(pageCount - 1, Math.round(scroller.scrollLeft / scroller.clientWidth)));
  };

  return (
    <div className="relative mt-7">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        aria-label="Game catalog"
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth py-4"
      >
        {Array.from({ length: pageCount }, (_, pageIndex) => (
          <div key={pageIndex} className="grid w-full shrink-0 snap-start grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: cardsPerPage }, (_, cardIndex) => {
              const index = pageIndex * cardsPerPage + cardIndex;
              if (index >= slideCount) return null;
              const game = catalogGames[index];
              return game === undefined ? (
                <article key="custom" className="flex min-w-0 flex-col rounded-3xl border border-slate-800 bg-slate-900/60 p-6 opacity-70">
                  <div className="grid size-14 place-items-center rounded-2xl bg-slate-800 text-slate-500"><Settings2 className="size-7" /></div>
                  <h3 className="mt-7 text-2xl font-black text-slate-300">Custom Games</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">Bring your own rules and build a table around them.</p>
                  <div className="mt-5"><span className="game-tag text-xs text-slate-400">Coming soon</span></div>
                </article>
              ) : (
                <article
                  key={game.id}
                  className={`group flex min-w-0 flex-col overflow-hidden rounded-3xl border bg-gradient-to-b p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-300/60 hover:shadow-2xl hover:shadow-amber-500/10 ${index === 0 ? "border-amber-400/25 from-amber-500/10 to-slate-900" : index === 1 ? "border-emerald-400/25 from-emerald-500/10 to-slate-900" : "border-rose-400/25 from-rose-500/10 to-slate-900"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-3xl shadow-lg shadow-amber-500/20" aria-hidden="true">{game.icon}</div>
                    <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-300 uppercase">Available</span>
                  </div>
                  <h3 className="mt-7 text-2xl font-black text-white">{game.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{game.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                    <span className="game-tag"><Users className="size-3 text-amber-300" /> {game.players}</span>
                    <span className="game-tag"><Clock3 className="size-3 text-amber-300" /> {game.duration}</span>
                    <span className="game-tag"><Swords className="size-3 text-amber-300" /> {game.genre}</span>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <button type="button" onClick={() => { onReadRules(game.id); }} aria-label={`ดูกติกา ${game.title}`} className="secondary-button min-w-0 flex-1 px-2 text-sm">
                      <BookOpen className="size-4" /> ดูกติกา
                    </button>
                    <button type="button" onClick={() => { onPlay(game.id); }} disabled={isBusy} className="primary-button min-w-0 flex-1 px-2 text-sm">เล่นเลย</button>
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      </div>

      <button type="button" onClick={() => { scrollToIndex(activeIndex - 1); }} disabled={activeIndex === 0} aria-label="Previous page" className="absolute top-1/2 left-0 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-amber-400/30 bg-slate-900/90 text-amber-300 shadow-lg shadow-black/40 transition hover:border-amber-300 hover:bg-amber-400/15 hover:shadow-amber-400/30 sm:-left-3">
        <ChevronLeft className="size-5" />
      </button>
      <button type="button" onClick={() => { scrollToIndex(activeIndex + 1); }} disabled={activeIndex === pageCount - 1} aria-label="Next page" className="absolute top-1/2 right-0 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-amber-400/30 bg-slate-900/90 text-amber-300 shadow-lg shadow-black/40 transition hover:border-amber-300 hover:bg-amber-400/15 hover:shadow-amber-400/30 sm:-right-3">
        <ChevronRight className="size-5" />
      </button>

      <div className="mt-3 flex justify-center gap-2" aria-label="Choose a catalog slide">
        {Array.from({ length: pageCount }, (_, index) => (
          <button key={index} type="button" onClick={() => { scrollToIndex(index); }} aria-label={`Go to page ${String(index + 1)}`} aria-current={activeIndex === index ? "true" : undefined} className={`h-2.5 rounded-full transition-all ${activeIndex === index ? "w-7 bg-amber-400" : "w-2.5 bg-slate-600 hover:bg-slate-400"}`} />
        ))}
      </div>
    </div>
  );
}
