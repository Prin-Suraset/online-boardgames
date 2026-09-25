import { useRef, useState, type UIEvent } from "react";
import { ChevronLeft, ChevronRight, Clock3, Settings2, Swords, Users } from "lucide-react";

import { catalogGames } from "../lib/gameCatalog";
import type { GameType } from "../types";

interface GameCatalogCarouselProps {
  onPlay: (game: GameType) => void;
  isBusy: boolean;
}

const slideCount = catalogGames.length + 1;

export function GameCatalogCarousel({ onPlay, isBusy }: GameCatalogCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = (index: number): void => {
    const scroller = scrollerRef.current;
    const slide = scroller?.querySelectorAll<HTMLElement>("[data-game-slide]")[index];
    if (scroller === null || slide === undefined) {
      return;
    }
    const scrollerRect = scroller.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();
    scroller.scrollTo({
      left: scroller.scrollLeft + slideRect.left - scrollerRect.left - (scroller.clientWidth - slide.clientWidth) / 2,
      behavior: "smooth",
    });
    setActiveIndex(index);
  };

  const handleScroll = (event: UIEvent<HTMLDivElement>): void => {
    const scroller = event.currentTarget;
    const center = scroller.getBoundingClientRect().left + scroller.clientWidth / 2;
    const slides = scroller.querySelectorAll<HTMLElement>("[data-game-slide]");
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    slides.forEach((slide, index) => {
      const rect = slide.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    setActiveIndex(closestIndex);
  };

  return (
    <div className="relative mt-7">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        aria-label="Game catalog"
        className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-2 py-4"
      >
        <div aria-hidden="true" className="w-[calc(50%_-_150px)] shrink-0 sm:w-[calc(50%_-_170px)] md:w-[calc(50%_-_190px)]" />
        {catalogGames.map((game, index) => (
          <article
            key={game.id}
            data-game-slide
            className={`group flex w-[300px] flex-shrink-0 snap-center flex-col overflow-hidden rounded-3xl border bg-gradient-to-b p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-300/60 hover:shadow-2xl hover:shadow-amber-500/10 sm:w-[340px] md:w-[380px] ${index === 0 ? "border-amber-400/25 from-amber-500/10 to-slate-900" : index === 1 ? "border-emerald-400/25 from-emerald-500/10 to-slate-900" : "border-rose-400/25 from-rose-500/10 to-slate-900"}`}
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
            <button type="button" onClick={() => { onPlay(game.id); }} disabled={isBusy} className="primary-button mt-6 w-full">Play now</button>
          </article>
        ))}
        <article data-game-slide className="flex w-[300px] flex-shrink-0 snap-center flex-col rounded-3xl border border-slate-800 bg-slate-900/60 p-6 opacity-70 sm:w-[340px] md:w-[380px]">
          <div className="grid size-14 place-items-center rounded-2xl bg-slate-800 text-slate-500"><Settings2 className="size-7" /></div>
          <h3 className="mt-7 text-2xl font-black text-slate-300">Custom Games</h3>
          <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">Bring your own rules and build a table around them.</p>
          <div className="mt-5"><span className="game-tag text-xs text-slate-400">Coming soon</span></div>
        </article>
        <div aria-hidden="true" className="w-[calc(50%_-_150px)] shrink-0 sm:w-[calc(50%_-_170px)] md:w-[calc(50%_-_190px)]" />
      </div>

      <button type="button" onClick={() => { scrollToIndex(Math.max(0, activeIndex - 1)); }} disabled={activeIndex === 0} aria-label="Previous game" className="absolute top-1/2 left-0 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-amber-400/30 bg-slate-900/90 text-amber-300 shadow-lg shadow-black/40 transition hover:border-amber-300 hover:bg-amber-400/15 hover:shadow-amber-400/30 sm:-left-3">
        <ChevronLeft className="size-5" />
      </button>
      <button type="button" onClick={() => { scrollToIndex(Math.min(slideCount - 1, activeIndex + 1)); }} disabled={activeIndex === slideCount - 1} aria-label="Next game" className="absolute top-1/2 right-0 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-amber-400/30 bg-slate-900/90 text-amber-300 shadow-lg shadow-black/40 transition hover:border-amber-300 hover:bg-amber-400/15 hover:shadow-amber-400/30 sm:-right-3">
        <ChevronRight className="size-5" />
      </button>

      <div className="mt-3 flex justify-center gap-2" aria-label="Choose a catalog slide">
        {Array.from({ length: slideCount }, (_, index) => (
          <button key={index} type="button" onClick={() => { scrollToIndex(index); }} aria-label={`Go to game ${String(index + 1)}`} aria-current={activeIndex === index ? "true" : undefined} className={`h-2.5 rounded-full transition-all ${activeIndex === index ? "w-7 bg-amber-400" : "w-2.5 bg-slate-600 hover:bg-slate-400"}`} />
        ))}
      </div>
    </div>
  );
}
