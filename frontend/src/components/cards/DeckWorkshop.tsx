import { useMemo, useState, type ChangeEvent } from 'react';
import type { CardfightDeck } from '../../types/cardfight';
import { cardName, cardText, grade, emptyDeck, sampleDeck, validateDeck, parseDeckFile, decodeLegacyDeck, encodeLegacyDeck, readSavedDecks, saveDeck, type AreaCatalog } from '../../lib/areaDecks';
import { getCardfightTokenIds } from '../../lib/cardfightTokens';
import { CardArtwork } from './CardArtwork';
import { CardSheet } from './CardSheet';
import './cardfight.css';
type Section='main'|'ride'|'extra'|'tokens';
export function DeckWorkshop({catalog,initialDeck,onSubmit,canSubmit}:{catalog:AreaCatalog;initialDeck:CardfightDeck|null;onSubmit:(deck:CardfightDeck)=>void;canSubmit:boolean}) {
  const [deck,setDeck]=useState<CardfightDeck>(()=>initialDeck??emptyDeck(catalog.catalog_version));
  const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[page,setPage]=useState(1),[tab,setTab]=useState<'browse'|'deck'>('browse');
  const [section,setSection]=useState<Section>('main'),[selected,setSelected]=useState<number|null>(null),[notice,setNotice]=useState('');
  const [saves,setSaves]=useState<CardfightDeck[]>(()=>readSavedDecks(localStorage));
  const lookup=useMemo(()=>new Map(catalog.cards.map(c=>[c.card_id,c])),[catalog]);
  const tokenIds=useMemo(()=>getCardfightTokenIds(catalog.cards),[catalog]);
  const filtered=useMemo(()=>catalog.cards.filter(card=>(section==='tokens'?tokenIds.has(card.card_id):!tokenIds.has(card.card_id))&&(filter==='all'||(filter==='g'?card.fields.ExtraDeck===1:String(grade(card))===filter))&&`${cardName(card)} ${cardText(card)} ${String(card.card_id)}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())),[catalog,filter,query,section,tokenIds]);
  const issues=validateDeck(deck,catalog), selectedCard=selected===null?undefined:lookup.get(selected);
  const capacity=section==='tokens'?30:section==='main'?256:section==='ride'?16:64;
  const sectionLabel=section==='tokens'?'Token Deck':section==='extra'?'G zone':section==='ride'?'Ride deck':'Main deck';
  const add=(id:number):void=>{if(deck[section].length>=capacity){setNotice('Section limit reached.');return;}setDeck({...deck,[section]:[...deck[section],id],starter_index:section==='ride'?null:deck.starter_index});setNotice(`Added ${cardName(lookup.get(id))} to ${sectionLabel}.`);};
  const remove=(index:number):void=>{setDeck({...deck,[section]:deck[section].filter((_,i)=>i!==index),starter_index:section==='main'&&deck.starter_index!==null?(deck.starter_index===index?null:deck.starter_index>index?deck.starter_index-1:deck.starter_index):deck.starter_index});};
  const download=(name:string,text:string):void=>{const url=URL.createObjectURL(new Blob([text],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);};
  const importFile=async(event:ChangeEvent<HTMLInputElement>):Promise<void>=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;try{if(file.size>262144)throw new Error('File exceeds 256 KiB.');const raw=await file.text();if(file.name.toLowerCase().endsWith('.json')){const imported=parseDeckFile(raw);setDeck(imported);}else{const ids=decodeLegacyDeck(raw);if(ids.some(id=>!lookup.has(id)))throw new Error('Legacy deck contains unknown card IDs.');if(ids.length>capacity)throw new Error(`Too many cards for ${sectionLabel}.`);setDeck({...deck,[section]:ids,starter_index:null});}setNotice('Imported. Review sections, choose a starter and validate before submitting.');setTab('deck');}catch(error){setNotice(error instanceof Error?error.message:'Import failed.');}};
  return <section className="cf-workshop" aria-label="Deck workshop">
    <header className="cf-workshop-header"><div><h2>Deck workshop</h2><p>Build your fifty-card main deck. Abilities and tournament legality are resolved by the players.</p></div><button onClick={()=>{setDeck(sampleDeck(catalog.catalog_version));setTab('deck');setNotice('Loaded the recovered Blaster Blade sample. Review it before submitting.');}}>Load sample deck</button></header>
    <div className="cf-toolbar"><label>Deck name<input maxLength={80} value={deck.name} onChange={e=>{setDeck({...deck,name:e.target.value});}} /></label>
      <button onClick={()=>{try{saveDeck(localStorage,deck);setSaves(readSavedDecks(localStorage));setNotice('Saved on this device.');}catch{setNotice('Local storage is full or unavailable. Export your deck instead.');}}}>Save on device</button>
      <label>Saved decks<select value="" onChange={e=>{const saved=saves[Number(e.target.value)];if(saved){setDeck(saved);setNotice('Loaded local save. Revalidate before submitting.');}}}><option value="">Choose a saved deck</option>{saves.map((saved,i)=><option key={saved.name} value={i}>{saved.name}</option>)}</select></label>
      <button onClick={()=>{download(`${deck.name||'deck'}.json`,JSON.stringify(deck,null,2));}}>Export JSON</button>
    </div>
    <div className="cf-toolbar"><label>Import / edit section<select value={section} onChange={e=>{setSection(e.target.value as Section);}}><option value="main">Main ({deck.main.length}/50)</option><option value="ride">Ride ({deck.ride.length}/4 or 0)</option><option value="extra">G zone ({deck.extra.length}/16)</option><option value="tokens">Token Deck ({deck.tokens.length}/30)</option></select></label>
      <label className="cf-file">Import JSON / legacy<input type="file" accept=".json,.prfl,.prflEx" onChange={e=>{void importFile(e);}} /></label>
      <button onClick={()=>{download(`${deck.name}-${section}.prfl`,encodeLegacyDeck(deck[section]));}}>Export this section (.prfl)</button>
      <p>Legacy files fill only the selected section. Choose starter and ride order explicitly.</p>
    </div>
    <div className="cf-tabs cf-mobile-tabs"><button aria-pressed={tab==='browse'} onClick={()=>{setTab('browse');}}>Browse cards</button><button aria-pressed={tab==='deck'} onClick={()=>{setTab('deck');}}>Your deck ({deck.main.length})</button></div>
    <div className="cf-workshop-columns">
      <section className={`cf-browser ${tab!=='browse'?'cf-mobile-hidden':''}`} aria-label="Browse cards"><div className="cf-toolbar"><label>Search cards<input type="search" value={query} placeholder="Name, text or card ID" onChange={e=>{setQuery(e.target.value);setPage(1);}} /></label><label>Grade / G zone<select value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);}}><option value="all">All cards</option>{[0,1,2,3,4,5].map(g=><option key={g} value={g}>Grade {g}</option>)}<option value="null">Unknown grade</option><option value="g">Confirmed G zone</option></select></label></div>
        <p>{filtered.length} cards found</p><div className="cf-card-grid">{filtered.slice(0,page*48).map(card=><button key={card.card_id} onClick={()=>{setSelected(card.card_id);}} aria-label={`Inspect ${cardName(card)}`}><CardArtwork card={card}/><span>{cardName(card)}</span><small>Grade {grade(card)??'?'} · #{card.card_id}</small></button>)}</div>{filtered.length===0&&<p>No matching cards. Try a shorter search.</p>}{filtered.length>page*48&&<button onClick={()=>{setPage(page+1);}}>Show more cards</button>}
      </section>
      <section className={`cf-deck ${tab!=='deck'?'cf-mobile-hidden':''}`} aria-label="Your deck"><h3>{sectionLabel} · {deck[section].length}/{section==='tokens'?30:section==='main'?50:section==='ride'?4:16}</h3>
        {section==='main'&&deck.ride.length===0&&<label>Main starter<select value={deck.starter_index??''} onChange={e=>{setDeck({...deck,starter_index:e.target.value===''?null:Number(e.target.value)});}}><option value="">Choose a grade 0 copy</option>{deck.main.map((id,i)=>grade(lookup.get(id))===0?<option key={i} value={i}>{i+1}. {cardName(lookup.get(id))}</option>:null)}</select></label>}
        <ol className="cf-deck-list">{deck[section].map((id,i)=><li key={`${String(id)}-${String(i)}`}><button className="cf-deck-card" onClick={()=>{setSelected(id);}}><span>{i+1}. {cardName(lookup.get(id))}</span><small>Grade {grade(lookup.get(id))??'?'}</small></button>{section==='ride'&&i>0&&<button aria-label={`Move ride card ${String(i+1)} earlier`} onClick={()=>{const ids=[...deck.ride];const prior=ids[i-1];if(prior!==undefined){ids[i-1]=id;ids[i]=prior;setDeck({...deck,ride:ids});}}}>↑</button>}<button onClick={()=>{remove(i);}} aria-label={`Remove copy ${String(i+1)} of ${cardName(lookup.get(id))}`}>−</button></li>)}</ol>
        {deck[section].length===0&&<p>This section is empty. Browse a card and add it here.</p>}
      </section>
    </div>
    <footer className="cf-validation"><h3>Assisted legacy table · cardfight-manual-v1</h3>{issues.length>0?<ul>{issues.map(issue=><li key={issue}>{issue}</li>)}</ul>:<p>Deck passes this table’s setup checks. This does not certify tournament legality.</p>}{deck.catalog_version!==catalog.catalog_version&&<button onClick={()=>{setDeck({...deck,catalog_version:catalog.catalog_version});}}>Use current catalog and revalidate</button>}<button className="cf-primary" disabled={issues.length>0||!canSubmit} onClick={()=>{onSubmit(deck);setNotice('Deck submitted. Wait for server validation before readying.');}}>Submit private deck</button><p role="status">{notice}</p></footer>
    {selectedCard&&<CardSheet title={cardName(selectedCard)} onClose={()=>{setSelected(null);}}><div className="cf-card-detail"><CardArtwork card={selectedCard} full/><div><p>Card #{selectedCard.card_id} · Grade {grade(selectedCard)??'unknown'}</p><p className="cf-card-text">{cardText(selectedCard)}</p>{selectedCard.unresolved_fields.length>0&&<p>Some source metadata is unresolved.</p>}<button className="cf-primary" onClick={()=>{add(selectedCard.card_id);}}>Add to {section==='extra'?'G zone':section}</button><p role="status">{notice}</p></div></div></CardSheet>}
  </section>;
}
