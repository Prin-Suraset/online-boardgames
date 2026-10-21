import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCatalog, validateDeck, parseDeckFile, encodeLegacyDeck, decodeLegacyDeck, readSavedDecks, saveDeck } from '../src/lib/areaDecks.ts';
const cards = [0,1,2,3,4].map((grade,i)=>({card_id:i+1,game_id:'cardfight',fields:{UnitGrade:grade,...(i===4?{ExtraDeck:1}:{})},full_art:'/area-games/cardfight/art/full/n1.jpg',thumbnail_art:'/area-games/cardfight/art/thumb/n1.jpg',unresolved_fields:[]}));
const catalog = parseCatalog({game_id:'cardfight',catalog_version:'v1',cards});
const deck = {game_id:'cardfight',catalog_version:'v1',name:'Named deck',main:Array(50).fill(1),ride:[],extra:[],starter_index:0};
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
 assert.throws(()=>parseDeckFile(JSON.stringify({...deck,seed:1})));
 const ids=[3,1,3,2]; const encoded=encodeLegacyDeck(ids);
 assert.deepEqual(decodeLegacyDeck(encoded),ids);
 assert.throws(()=>decodeLegacyDeck(encoded.slice(2)));
 assert.throws(()=>decodeLegacyDeck('0'.repeat(300000)));
 assert.throws(()=>encodeLegacyDeck([NaN]));
});
test('versioned saves are explicit, retain names, and recover malformed storage',()=>{
 const memory=new Map(); const storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 assert.deepEqual(readSavedDecks(storage),[]);
 saveDeck(storage,deck); saveDeck(storage,{...deck,name:'Second'});
 assert.deepEqual(readSavedDecks(storage).map(d=>d.name),['Named deck','Second']);
 saveDeck(storage,{...deck,main:Array(50).fill(2)});
 assert.equal(readSavedDecks(storage).length,2);
 assert.equal(readSavedDecks(storage)[0].main[0],2);
 memory.set('area-games.cardfight.decks.v1','bad'); assert.deepEqual(readSavedDecks(storage),[]);
});
