import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, ArrowLeft, Check, ChevronDown, CircleHelp, Cloud, Copy, Layers3, Plus, Search, ShieldCheck, Sparkles, Swords, Trash2, Upload, X } from "lucide-react";
import { useCardfightCatalog } from "../components/cards/useCardfightCatalog";
import { CardArtwork } from "../components/cards/CardArtwork";
import { useAuth } from "../context/AuthContext";
import { navigate } from "../lib/navigation";
import { cardName, cardText, emptyDeck, grade, sampleDeck, validateDeck, type AreaCard } from "../lib/areaDecks";
import type { CardfightDeck } from "../types/cardfight";
import "../components/cards/cardfight.css";
import "./cardfight-decks.css";

type Section = "main" | "ride" | "extra";
const demoDecks = ["Blaster Blade · Royal Paladin", "Dragonic Overlord · Kagero", "New deck · Not saved"] as const;

export function CardfightDeckPreview() {
  const { user, isGuest } = useAuth();
  const { catalog, error } = useCardfightCatalog();
  const [mode, setMode] = useState<"builder" | "room">("builder");
  const [deck, setDeck] = useState<CardfightDeck>(() => ({ ...sampleDeck("preview"), name: "Blaster Blade" }));
  const [section, setSection] = useState<Section>("main");
  const [quantity, setQuantity] = useState("1");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [roomDeck, setRoomDeck] = useState<string>(demoDecks[0]);
  const [selected, setSelected] = useState<AreaCard | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const inspectorOpenerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (catalog !== null && deck.catalog_version === "preview") {
      setDeck((previous) => previous.catalog_version === "preview" ? { ...previous, catalog_version: catalog.catalog_version } : previous);
    }
  }, [catalog, deck.catalog_version]);

  useEffect(() => {
    if (selected === null) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelected(null);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
      if (controls === undefined || controls.length === 0) return;
      const first = controls.item(0);
      const last = controls.item(controls.length - 1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      inspectorOpenerRef.current?.focus();
    };
  }, [selected]);

  const cards = useMemo(() => {
    if (catalog === null) return [];
    return catalog.cards.filter((card) => {
      const search = `${cardName(card)} ${cardText(card)} ${card.card_id}`.toLocaleLowerCase();
      const cardGrade = grade(card);
      const gradeMatch = filter === "all" || (filter === "g" ? card.fields.ExtraDeck === 1 : filter === "6plus" ? cardGrade !== null && cardGrade >= 6 : String(cardGrade) === filter);
      return search.includes(query.toLocaleLowerCase()) && gradeMatch;
    }).slice(0, 36);
  }, [catalog, filter, query]);

  const lookup = useMemo(() => new Map((catalog?.cards ?? []).map((card) => [card.card_id, card])), [catalog]);
  const isDeckReady = catalog !== null && validateDeck(deck, catalog).length === 0;
  const isRoomDeckReady = roomDeck !== demoDecks[2];
  const namedCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const id of deck.main) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts.entries()].map(([id, count]) => ({ id, count, card: lookup.get(id) }));
  }, [deck.main, lookup]);

  const addCard = (card: AreaCard, amount: number): void => {
    const key = section;
    const current = key === "main" ? deck.main : key === "ride" ? deck.ride : deck.extra;
    const capacity = key === "main" ? 50 : key === "ride" ? 4 : 16;
    if (!Number.isInteger(amount) || amount < 1 || amount > capacity - current.length) {
      setNotice(`Choose 1–${Math.max(0, capacity - current.length)} copies for this section.`);
      return;
    }
    setDeck((previous) => ({ ...previous, [key]: [...(key === "main" ? previous.main : key === "ride" ? previous.ride : previous.extra), ...Array.from({ length: amount }, () => card.card_id)] }));
    setNotice(`${amount} ${amount === 1 ? "copy" : "copies"} of ${cardName(card)} added to ${key === "extra" ? "G zone" : key}.`);
    setSelected(null);
  };

  const removeCard = (cardId: number): void => {
    setDeck((previous) => {
      const main = [...previous.main];
      const removedIndex = main.lastIndexOf(cardId);
      if (removedIndex < 0) return previous;
      main.splice(removedIndex, 1);
      let starterIndex = previous.starter_index;
      if (starterIndex !== null) {
        if (removedIndex === starterIndex) {
          const replacementStarter = main.findIndex((id) => grade(lookup.get(id)) === 0);
          starterIndex = replacementStarter < 0 ? null : replacementStarter;
        } else if (removedIndex < starterIndex) {
          starterIndex -= 1;
        }
      }
      return { ...previous, main, starter_index: starterIndex };
    });
    setNotice("One copy removed from the main deck.");
  };

  const switchMode = (next: "builder" | "room"): void => {
    setMode(next);
    setSelected(null);
    setNotice("");
  };

  const openInspector = (opener: HTMLElement, card: AreaCard): void => {
    inspectorOpenerRef.current = opener;
    setQuantity("1");
    setSelected(card);
  };

  const startEmptyDraft = (name = "New deck"): void => {
    setDeck({ ...emptyDeck(catalog?.catalog_version ?? "preview"), name });
    setNotice(`${name} draft started. It has not been saved.`);
  };

  if (error !== null) return <main className="cf-decks-page"><div className="cf-decks-error">Card catalog could not be loaded: {error}</div></main>;

  return (
    <main className="cf-decks-page">
      <div className="cf-decks-orbit cf-decks-orbit-one" aria-hidden="true" />
      <div className="cf-decks-orbit cf-decks-orbit-two" aria-hidden="true" />
      <div className="cf-decks-shell">
        <div className="cf-decks-preview-note"><Sparkles size={14} /> Interface preview <span>·</span> Saves and sharing are visual only in this preview</div>
        <header className="cf-decks-heading">
          <div>
            <button type="button" className="cf-decks-back" onClick={() => { navigate("/"); }}><ArrowLeft size={15} /> Back to lounge</button>
            <div className="cf-decks-kicker"><span /> Cardfight Vanguard <span> / </span> Decks</div>
            <h1>{mode === "builder" ? "Your next great ride." : "Choose your deck."}</h1>
            <p>{mode === "builder" ? "Build a list, tune every grade, and bring your deck to the table." : "Pick a saved deck before the match begins. Deck building stays outside the room."}</p>
          </div>
          <div className="cf-decks-heading-art" aria-hidden="true"><Swords size={37} strokeWidth={1.25} /><span>V</span></div>
        </header>

        <div className="cf-decks-mode" role="tablist" aria-label="Deck interface preview">
          <button role="tab" aria-selected={mode === "builder"} onClick={() => { switchMode("builder"); }}><Layers3 size={16} /> Deck builder</button>
          <button role="tab" aria-selected={mode === "room"} onClick={() => { switchMode("room"); }}><Swords size={16} /> Room picker <span className="cf-decks-mode-tag">Preview</span></button>
        </div>

        {mode === "builder" ? (
          <div className="cf-decks-builder">
            <aside className="cf-decks-rail" aria-label="Your decks">
              <div className="cf-decks-rail-title"><span>Your decks</span><button type="button" aria-label="Create a new deck" onClick={() => { startEmptyDraft(); }}><Plus size={17} /></button></div>
              <div className="cf-decks-shelf">
                <button type="button" className={`cf-decks-shelf-item${deck.name === "Blaster Blade" ? " is-current" : ""}`} onClick={() => { setDeck({ ...sampleDeck(catalog?.catalog_version ?? "preview"), name: "Blaster Blade" }); setNotice("Blaster Blade draft selected."); }}>
                  <span className="cf-decks-shelf-mark">RP</span><span><strong>Blaster Blade</strong><small>Royal Paladin · 50 cards</small></span><span className="cf-decks-shelf-dot" />
                </button>
                <button type="button" className={`cf-decks-shelf-item${deck.name === "Dragonic Overlord" ? " is-current" : ""}`} onClick={() => { startEmptyDraft("Dragonic Overlord"); setNotice("Dragonic Overlord is a visual sample only; its card list is not included in this preview."); }}>
                  <span className="cf-decks-shelf-mark orange">K</span><span><strong>Dragonic Overlord</strong><small>Kagero · list not loaded</small></span>
                </button>
                <button type="button" className={`cf-decks-shelf-item${deck.name === "New deck" ? " is-current" : ""}`} onClick={() => { startEmptyDraft(); }}>
                  <span className="cf-decks-shelf-mark empty"><Plus size={16} /></span><span><strong>New deck</strong><small>Start from an empty list</small></span>
                </button>
              </div>
              <div className="cf-decks-sync"><Cloud size={16} /><span><strong>{isGuest ? "Device-only saves" : "Account sync"}</strong><small>{isGuest ? "This guest’s decks stay on this device" : "Saved decks follow your account"}</small></span><span className="cf-decks-sync-dot" /></div>
              <div className="cf-decks-rail-foot"><ShieldCheck size={14} /> {isGuest ? "Register to sync across devices" : "Private to your account"}</div>
            </aside>

            <section className="cf-decks-workspace" aria-label="Card browser">
              <div className="cf-decks-workspace-head">
                <div><span className="cf-decks-eyebrow">Deck editor</span><h2>{deck.name}</h2><p>{deck.name === "Dragonic Overlord" ? "Kagero" : deck.name === "New deck" || deck.name === "My deck" ? "Choose a clan" : "Royal Paladin"} <span /> V Premium · Assisted play</p></div>
                <div className="cf-decks-actions"><button type="button" onClick={() => { setNotice("Preview only: deck export will be available in the finished builder."); }}><ArrowDownToLine size={15} /><span>Export</span></button><button type="button" onClick={() => { setNotice("Preview only: deck code copied in the finished builder."); }}><Copy size={15} /><span>Share code</span></button><button className="cf-decks-save" type="button" onClick={() => { setNotice("Preview only: this draft has not been saved."); }}><Cloud size={15} /> Save deck</button></div>
              </div>

              <div className="cf-decks-searchline">
                <label className="cf-decks-search"><Search size={17} /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); }} placeholder="Search card name, text, or ID" aria-label="Search Cardfight cards" /><kbd>/</kbd></label>
                <label className="cf-decks-filter"><span>Show</span><select aria-label="Filter by grade" value={filter} onChange={(event) => { setFilter(event.target.value); }}><option value="all">All cards</option><option value="0">Grade 0</option><option value="1">Grade 1</option><option value="2">Grade 2</option><option value="3">Grade 3</option><option value="4">Grade 4</option><option value="5">Grade 5</option><option value="6plus">Grade 6+</option><option value="g">G zone</option></select></label>
              </div>

              <div className="cf-decks-section-tabs" role="tablist" aria-label="Deck section">
                {(["main", "ride", "extra"] as const).map((part) => <button type="button" key={part} role="tab" aria-selected={section === part} onClick={() => { setSection(part); }}>{part === "main" ? "Main deck" : part === "ride" ? "Ride deck" : "G zone"}<span>{part === "main" ? deck.main.length : part === "ride" ? deck.ride.length : deck.extra.length}</span></button>)}
              </div>

              <div className="cf-decks-card-grid">
                {cards.map((card) => <button type="button" key={card.card_id} className="cf-decks-card" onClick={(event) => { openInspector(event.currentTarget, card); }} aria-label={`View ${cardName(card)}`}><CardArtwork card={card} full /><span className="cf-decks-card-name">{cardName(card)}</span></button>)}
                {catalog !== null && cards.length === 0 && <div className="cf-decks-no-cards">No cards found. Try another search.</div>}
              </div>
              <div className="cf-decks-resultline">{catalog === null ? "Loading card collection…" : `${cards.length} cards shown`} <span>Choose a card to inspect and add it to your {section === "extra" ? "G zone" : section}.</span></div>
            </section>

            <aside className="cf-decks-list" aria-label="Current deck list">
              <div className="cf-decks-list-title"><div><span className="cf-decks-eyebrow">Current list</span><h2>{deck.name}</h2></div><button aria-label="Deck options" type="button" onClick={() => { setNotice("Deck options are part of the finished builder."); }}>•••</button></div>
              <div className="cf-decks-progress"><div><strong>{deck.main.length}<small> / 50</small></strong><span>Main deck</span></div><div className="cf-decks-progress-bar"><span style={{ width: `${Math.min(deck.main.length / 50 * 100, 100)}%` }} /></div></div>
              <div className="cf-decks-counts"><span><i className="blue" />Ride <b>{deck.ride.length}/4</b></span><span><i className="gold" />G zone <b>{deck.extra.length}/16</b></span></div>
              <div className="cf-decks-list-tabs"><span>Card</span><span>Qty</span></div>
              <div className="cf-decks-listed-cards">
                {namedCounts.map(({ id, count, card }) => <div key={id} className="cf-decks-listed-card"><button type="button" className="cf-decks-listed-open" onClick={(event) => { if (card !== undefined) openInspector(event.currentTarget, card); }} aria-label={`Inspect ${cardName(card)}`}><CardArtwork card={card} /><span>{cardName(card)}</span></button><b aria-label={`${count} copies`}>{count}</b><button type="button" className="cf-decks-listed-remove" aria-label={`Remove one copy of ${cardName(card)}`} title="Remove one copy" onClick={() => { removeCard(id); }}><Trash2 size={15} /></button></div>)}
              </div>
              <button type="button" className="cf-decks-room-cta" disabled={!isDeckReady} onClick={() => { switchMode("room"); }}>{isDeckReady ? "Choose for a room" : "Complete deck to choose for room"} <span>›</span></button>
              <p className="cf-decks-editor-note">Ability resolution is handled by players.</p>
            </aside>
          </div>
        ) : (
          <section className="cf-room-picker" aria-label="Room deck picker preview">
            <div className="cf-room-picker-top"><div><span className="cf-decks-eyebrow">Room setup · Before the match</span><h2>Your deck, then the table.</h2><p>Choose one of your saved decks. The builder and collection stay outside the game lobby.</p></div><div className="cf-room-picker-player"><span>{user?.display_name.trim().slice(0, 2).toUpperCase() || "SH"}</span><div><strong>{user?.display_name ?? "SilverHorn"}</strong><small>Ready to play</small></div></div></div>
            <label className="cf-room-picker-label" htmlFor="cf-preview-room-deck">Selected deck</label>
            <div className="cf-room-picker-choice"><span className="cf-decks-shelf-mark">RP</span><select id="cf-preview-room-deck" value={roomDeck} onChange={(event) => { setRoomDeck(event.target.value); }} aria-label="Choose a deck for this room">{demoDecks.map((name) => <option key={name}>{name}</option>)}</select><ChevronDown size={16} /></div>
            <div className={`cf-room-picker-summary${isRoomDeckReady ? "" : " is-incomplete"}`}><span className="cf-room-picker-art"><Swords size={27} /></span><div className="cf-room-picker-info"><strong>{roomDeck.split(" · ")[0]}</strong><span>{roomDeck.includes("Kagero") ? "Kagero" : "Royal Paladin"} <i /> {isRoomDeckReady ? "50 cards" : "Draft not saved"} <i /> {isRoomDeckReady ? "Setup valid" : "Finish in deck builder"}</span></div><span className="cf-room-valid">{isRoomDeckReady ? <><Check size={14} /> Ready</> : "Draft"}</span></div>
            <div className="cf-room-picker-footer"><div><ShieldCheck size={16} /><span>Deck details stay private until the game begins.</span></div><button type="button" disabled={!isRoomDeckReady} onClick={() => { setNotice("Preview only: deck selection would be sent to this room."); }}>Use this deck <Check size={15} /></button></div>
            <div className="cf-room-picker-more"><span>Need to make changes?</span><button type="button" onClick={() => { switchMode("builder"); }}>Open deck builder <span>↗</span></button></div>
          </section>
        )}
        <div className="cf-decks-notice" role="status">{notice || (catalog === null ? "Loading recovered Cardfight card art…" : "Preview controls only · Account sync, save, and sharing are not connected yet.")}</div>
        <footer className="cf-decks-footer"><span>Common Ground <i /> Cardfight</span><button type="button" onClick={() => { setNotice("Rule help will be linked here in the finished builder."); }}>Deck rules <CircleHelp size={14} /></button><button type="button" onClick={() => { setNotice("Import is planned for the finished builder."); }}><Upload size={14} /> Import</button></footer>
      </div>

      {selected !== null && <div className="cf-decks-modal-backdrop" role="presentation" onClick={() => { setSelected(null); }}><section ref={dialogRef} className="cf-decks-inspector" role="dialog" aria-modal="true" aria-labelledby="cf-decks-inspector-title" onClick={(event) => { event.stopPropagation(); }}><button ref={closeButtonRef} className="cf-decks-inspector-close" type="button" aria-label="Close card details" onClick={() => { setSelected(null); }}><X size={17} /></button><CardArtwork card={selected} full /><div><span className="cf-decks-eyebrow">Grade {grade(selected) ?? "unknown"} · #{selected.card_id}</span><h2 id="cf-decks-inspector-title">{cardName(selected)}</h2><p>{cardText(selected)}</p><label className="cf-decks-quantity">Copies to add<input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2} value={quantity} onChange={(event) => { setQuantity(event.target.value); }} aria-label="Number of copies to add" /></label><button type="button" className="cf-decks-save" disabled={!/^\d+$/.test(quantity) || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > (section === "main" ? 50 - deck.main.length : section === "ride" ? 4 - deck.ride.length : 16 - deck.extra.length)} onClick={() => { addCard(selected, Number(quantity)); }}>Add {quantity || "0"} {Number(quantity) === 1 ? "copy" : "copies"} to {section === "extra" ? "G zone" : section}<Plus size={16} /></button></div></section></div>}
    </main>
  );
}
