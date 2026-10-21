import { FALLBACK_ART, cardName, type AreaCard } from '../../lib/areaDecks';
export function CardArtwork({card,full=false}:{card:AreaCard|undefined;full?:boolean}) {
  return <img className="cf-art" src={card ? (full?card.full_art:card.thumbnail_art) : FALLBACK_ART} alt={cardName(card)} loading="lazy" decoding="async" onError={event=>{if(!event.currentTarget.src.endsWith(FALLBACK_ART))event.currentTarget.src=FALLBACK_ART;}} />;
}
