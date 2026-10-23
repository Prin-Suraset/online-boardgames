import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCatalog, validateDeck, parseDeckFile, encodeLegacyDeck, decodeLegacyDeck, readSavedDecks, saveDeck } from '../src/lib/areaDecks.ts';
const cards = [0,1,2,3,4].map((grade,i)=>({card_id:i+1,game_id:'cardfight',fields:{UnitGrade:grade,...(i===0?{TokenSummoner:7}:{}),...(i===4?{ExtraDeck:1}:{})},full_art:'/area-games/cardfight/art/full/n1.jpg',thumbnail_art:'/area-games/cardfight/art/thumb/n1.jpg',unresolved_fields:[]}));
cards.push({card_id:6,game_id:'cardfight',fields:{TokenInHand:1},full_art:'/area-games/cardfight/art/full/n1.jpg',thumbnail_art:'/area-games/cardfight/art/thumb/n1.jpg',unresolved_fields:[]});
cards.push({card_id:7,game_id:'cardfight',fields:{CardName:'Plant'},full_art:'/area-games/cardfight/art/full/n1.jpg',thumbnail_art:'/area-games/cardfight/art/thumb/n1.jpg',unresolved_fields:[]});
const catalog = parseCatalog({game_id:'cardfight',catalog_version:'v1',cards});
const deck = {game_id:'cardfight',catalog_version:'v1',name:'Named deck',main:Array(50).fill(1),ride:[],extra:[],tokens:[],starter_index:0};
const legacyDeck = {...deck}; delete legacyDeck.tokens;
test('profile validation keeps unknown mechanics unknown and validates explicit sections',()=>{
 assert.deepEqual(validateDeck(deck,catalog),[]);
 assert.ok(validateDeck({...deck,main:[...deck.main.slice(1)]},catalog).length);
 assert.ok(validateDeck({...deck,catalog_version:'stale'},catalog).length);
 assert.deepEqual(validateDeck({...deck,ride:[1,2,3,4],starter_index:null,extra:[5]},catalog),[]);
 assert.ok(validateDeck({...deck,extra:[4]},catalog).length);
 assert.ok(validateDeck({...deck,ride:[1,2,4,3],starter_index:null},catalog).length);
 assert.ok(validateDeck({...deck,main:Array(50).fill(99)},catalog).length);
});
test('deck JSON and numeric legacy codec preserve duplicate order and reject malformed input',()=>{
 assert.deepEqual(parseDeckFile(JSON.stringify(deck)),deck);
 const tokenDeck={...deck,tokens:[6,7,6]};
 assert.deepEqual(parseDeckFile(JSON.stringify(tokenDeck)),tokenDeck);
 assert.deepEqual(parseDeckFile(JSON.stringify(legacyDeck)),deck);
 assert.throws(()=>parseDeckFile(JSON.stringify({...deck,seed:1})));
 const ids=[3,1,3,2]; const encoded=encodeLegacyDeck(ids);
 assert.deepEqual(decodeLegacyDeck(encoded),ids);
 assert.throws(()=>decodeLegacyDeck(encoded.slice(2)));
 assert.throws(()=>decodeLegacyDeck('0'.repeat(300000)));
 assert.throws(()=>encodeLegacyDeck([NaN]));
});
test('token validation keeps a 30-copy reserve outside the main, ride, and G-zone sections',()=>{
 assert.deepEqual(validateDeck({...deck,tokens:[6,7,6]},catalog),[]);
 assert.ok(validateDeck({...deck,tokens:Array(31).fill(6)},catalog).length);
 assert.ok(validateDeck({...deck,tokens:[2]},catalog).length);
 assert.ok(validateDeck({...deck,tokens:[99]},catalog).length);
 assert.ok(validateDeck({...deck,main:[6,...deck.main.slice(1)]},catalog).length);
});
test('versioned saves are explicit, retain names, and recover malformed storage',()=>{
 const memory=new Map(); const storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 assert.deepEqual(readSavedDecks(storage),[]);
 saveDeck(storage,deck); saveDeck(storage,{...deck,name:'Second'});
 assert.deepEqual(readSavedDecks(storage).map(d=>d.name),['Named deck','Second']);
 const legacyMemory=new Map([['area-games.cardfight.decks.v1',JSON.stringify([legacyDeck])]]);
 assert.deepEqual(readSavedDecks({getItem:k=>legacyMemory.get(k)??null,setItem:(k,v)=>legacyMemory.set(k,v)}),[deck]);
 saveDeck(storage,{...deck,main:Array(50).fill(2)});
 assert.equal(readSavedDecks(storage).length,2);
 assert.equal(readSavedDecks(storage)[0].main[0],2);
 memory.set('area-games.cardfight.decks.v1','bad'); assert.deepEqual(readSavedDecks(storage),[]);
});
