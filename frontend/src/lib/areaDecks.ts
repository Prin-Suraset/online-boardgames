import type { CardfightDeck } from '../types/cardfight';
import { isCardfightDeck } from './cardfightGuards.ts';
import { getCardfightTokenIds } from './cardfightTokens.ts';
export { getCardfightTokenIds } from './cardfightTokens.ts';
export interface AreaCard { card_id: number; game_id: 'cardfight'; fields: Readonly<Record<string, unknown>>; full_art: string; thumbnail_art: string; unresolved_fields: readonly string[] }
export interface AreaCatalog { game_id: 'cardfight'; catalog_version: string; cards: readonly AreaCard[] }
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export const cardName = (card: AreaCard | undefined): string => typeof card?.fields.CardName === 'string' ? card.fields.CardName : 'Unknown card';
export const cardText = (card: AreaCard | undefined): string => typeof card?.fields.CardText === 'string' ? card.fields.CardText : 'No text available.';
export const grade = (card: AreaCard | undefined): number | null => typeof card?.fields.UnitGrade === 'number' && Number.isInteger(card.fields.UnitGrade) ? card.fields.UnitGrade : null;
export const FALLBACK_ART = '/area-games/cardfight/art/missing.svg';
export function parseCatalog(value: unknown): AreaCatalog {
  if (!record(value) || value.game_id !== 'cardfight' || typeof value.catalog_version !== 'string' || !Array.isArray(value.cards)) throw new Error('Invalid Cardfight catalog. Reload to retry.');
  const cards: AreaCard[] = value.cards.map((item: unknown) => {
    if (!record(item) || !Number.isSafeInteger(item.card_id) || typeof item.card_id !== 'number' || item.game_id !== 'cardfight' || !record(item.fields) || typeof item.full_art !== 'string' || typeof item.thumbnail_art !== 'string' || !Array.isArray(item.unresolved_fields) || !item.unresolved_fields.every((s: unknown) => typeof s === 'string')) throw new Error('Invalid card catalog entry.');
    for (const url of [item.full_art,item.thumbnail_art]) if (!/^\/area-games\/cardfight\/[a-zA-Z0-9/_\-.]+$/.test(url) || url.includes('..')) throw new Error('Invalid card artwork URL.');
    return {card_id:item.card_id,game_id:'cardfight',fields:item.fields,full_art:item.full_art,thumbnail_art:item.thumbnail_art,unresolved_fields:item.unresolved_fields};
  });
  return {game_id:'cardfight',catalog_version:value.catalog_version,cards};
}
export function validateDeck(deck: CardfightDeck, catalog: AreaCatalog): string[] {
  const issues: string[] = []; const lookup = new Map(catalog.cards.map(c => [c.card_id,c])); const tokenIds = getCardfightTokenIds(catalog.cards);
  if (deck.catalog_version !== catalog.catalog_version) issues.push('Catalog changed. Revalidate this deck with the current catalog.');
  if (deck.main.length !== 50) issues.push('Main deck needs exactly 50 cards.');
  if (deck.ride.length !== 0 && deck.ride.length !== 4) issues.push('Ride deck must be empty or contain four cards in grade order 0, 1, 2, 3.');
  if (deck.extra.length > 16) issues.push('G zone supports at most 16 cards.');
  if (deck.tokens.length > 30) issues.push('Token deck supports at most 30 cards.');
  if ([...deck.main,...deck.ride,...deck.extra,...deck.tokens].some(id => !lookup.has(id))) issues.push('Deck contains unknown card IDs.');
  if ([...deck.main,...deck.ride,...deck.extra].some(id => tokenIds.has(id))) issues.push('Token cards must be kept in the Token Deck section.');
  if (deck.tokens.some(id => !tokenIds.has(id))) issues.push('Token Deck can contain only confirmed token cards.');
  if (deck.ride.length) {
    if (deck.starter_index !== null || deck.ride.some((id,i) => grade(lookup.get(id)) !== i)) issues.push('Choose ride grades 0, 1, 2, 3 in that order and no main starter.');
  } else if (deck.starter_index === null || deck.main[deck.starter_index] === undefined || grade(lookup.get(deck.main[deck.starter_index] ?? -1)) !== 0) issues.push('Select a main-deck starter with a known grade of 0.');
  if (deck.extra.some(id => lookup.get(id)?.fields.ExtraDeck !== 1)) issues.push('Every G-zone card needs confirmed ExtraDeck classification. Unknown classification is unsupported.');
  if (!deck.name.trim()) issues.push('Give this deck a name.');
  return issues;
}
export function parseDeckFile(raw: string): CardfightDeck {
  if (new TextEncoder().encode(raw).length > 65536) throw new Error('Deck JSON exceeds 64 KiB.');
  const value: unknown = JSON.parse(raw);
  const migrated = migrateDeckShape(value);
  if (!migrated) throw new Error('Invalid deck JSON. Import a Cardfight deck export with all sections.');
  return migrated;
}
function migrateDeckShape(value: unknown): CardfightDeck | null {
  if (isCardfightDeck(value)) return value;
  if (!record(value) || Object.hasOwn(value, 'tokens')) return null;
  const migrated: unknown = {...value, tokens: []};
  return isCardfightDeck(migrated) ? migrated : null;
}
export function decodeLegacyDeck(raw: string): number[] {
  if (raw.length > 262144) throw new Error('Legacy file exceeds 256 KiB.');
  const hex = raw.replace(/\s/g,'');
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(hex)) throw new Error('Legacy deck must be hexadecimal.');
  const bytes = Uint8Array.from(hex.match(/../g) ?? [], pair => Number.parseInt(pair,16));
  const view = new DataView(bytes.buffer);
  if (bytes.length < 8) throw new Error('Truncated legacy deck.');
  const count = view.getUint32(4,true);
  if (view.getUint32(0,true) !== 301 || count > 4096 || bytes.length !== 8+count*16) throw new Error('Unsupported legacy deck version or length.');
  return Array.from({length:count},(_,i) => {
    const offset=8+i*16, id=view.getFloat64(offset+4,true);
    if (view.getUint32(offset,true)!==0 || view.getUint32(offset+12,true)!==0 || !Number.isSafeInteger(id) || id<1 || id>2147483647) throw new Error('Unsupported legacy card record.');
    return id;
  });
}
export function encodeLegacyDeck(ids: readonly number[]): string {
  if (ids.length>4096 || ids.some(id=>!Number.isSafeInteger(id)||id<1||id>2147483647)) throw new Error('Invalid legacy card IDs.');
  const buffer=new ArrayBuffer(8+ids.length*16), view=new DataView(buffer);
  view.setUint32(0,301,true);view.setUint32(4,ids.length,true);
  ids.forEach((id,i)=>{view.setFloat64(12+i*16,id,true);});
  return Array.from(new Uint8Array(buffer),n=>n.toString(16).padStart(2,'0')).join('');
}
const STORAGE_KEY = 'area-games.cardfight.decks.v1';
type StoragePort = Pick<Storage,'getItem' | 'setItem'>;
export function readSavedDecks(storage: StoragePort): CardfightDeck[] {
  try { const data: unknown=JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]'); return Array.isArray(data) ? data.map(migrateDeckShape).filter((deck): deck is CardfightDeck => deck !== null) : []; } catch { return []; }
}
export function saveDeck(storage: StoragePort, deck: CardfightDeck): void {
  const existing=readSavedDecks(storage), index=existing.findIndex(d=>d.name===deck.name);
  if(index<0) existing.push(deck); else existing[index]=deck;
  storage.setItem(STORAGE_KEY,JSON.stringify(existing));
}
export function getSavedDeckChoices(storage: StoragePort, catalog: AreaCatalog): { deck: CardfightDeck; issues: string[] }[] {
  return readSavedDecks(storage).map(deck => ({ deck, issues: validateDeck(deck, catalog) }));
}
export function emptyDeck(version: string): CardfightDeck { return {game_id:'cardfight',catalog_version:version,name:'My deck',main:[],ride:[],extra:[],tokens:[],starter_index:null}; }
export function sampleDeck(version: string): CardfightDeck { return {...emptyDeck(version),name:'Recovered Blaster Blade',starter_index:0,main:[5681,5729,5729,5729,5729,5679,5679,5679,5679,5680,5680,5680,5680,5730,5730,5730,5730,5712,5712,5712,5678,5678,5678,5678,5674,5674,5674,5675,5675,5675,5675,5700,5700,5700,5700,5677,5677,5677,5677,5711,5711,5711,5683,5683,5683,5683,5728,5728,5728,5728]}; }
