import { useMemo, useState } from 'react';
import type { CardfightDeck } from '../../types/cardfight';
import { getSavedDeckChoices, type AreaCatalog } from '../../lib/areaDecks';
import './cardfight.css';

interface Props {
  catalog: AreaCatalog;
  currentDeck: CardfightDeck | null;
  canSubmit: boolean;
  onSubmit: (deck: CardfightDeck) => void;
}

function savedChoices(catalog: AreaCatalog): { choices: ReturnType<typeof getSavedDeckChoices>; storageAvailable: boolean } {
  try {
    return { choices: getSavedDeckChoices(window.localStorage, catalog), storageAvailable: true };
  } catch {
    return { choices: [], storageAvailable: false };
  }
}

export function CardfightDeckPicker({ catalog, currentDeck, canSubmit, onSubmit }: Props) {
  const { choices, storageAvailable } = useMemo(() => savedChoices(catalog), [catalog]);
  const [selected, setSelected] = useState('');
  const choice = selected === '' ? undefined : choices[Number(selected)];

  return <section className="cf-lobby-deck" aria-labelledby="cf-lobby-deck-title">
    <div className="cf-lobby-deck-copy">
      <h2 id="cf-lobby-deck-title">Choose your deck</h2>
      <p>{currentDeck ? `Submitted: ${currentDeck.name}` : 'Your deck stays private until the match begins.'}</p>
    </div>
    {choices.length > 0 ? <div className="cf-lobby-deck-controls">
      <label htmlFor="cf-lobby-deck-select">Saved decks
        <select id="cf-lobby-deck-select" value={selected} onChange={event => { setSelected(event.target.value); }}>
          <option value="">Select a saved deck</option>
          {choices.map(({ deck, issues }, index) => <option key={`${deck.name}-${index}`} value={index}>
            {deck.name} · {deck.main.length}/50 main{issues.length > 0 ? ' · needs review' : ''}
          </option>)}
        </select>
      </label>
      <button className="cf-primary" disabled={!canSubmit || choice === undefined || choice.issues.length > 0} onClick={() => {
        if (choice && choice.issues.length === 0) onSubmit(choice.deck);
      }}>Use selected deck</button>
    </div> : <div className="cf-lobby-deck-empty">
      <p>{storageAvailable ? 'No saved decks on this device.' : 'Browser storage is unavailable, so local decks cannot be loaded.'}</p>
      <a href="/decks/cardfight">Open Decks</a>
    </div>}
    {choice && <div className="cf-lobby-deck-summary" aria-live="polite">
      <p><strong>{choice.deck.name}</strong></p>
      <p>Main {choice.deck.main.length}/50 · Ride {choice.deck.ride.length}/4 · G zone {choice.deck.extra.length}/16 · Tokens {choice.deck.tokens.length}/30</p>
    </div>}
    {choice && choice.issues.length > 0 && <ul className="cf-validation" role="status" aria-label="Deck validation issues">
      {choice.issues.map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}
    </ul>}
  </section>;
}
