import test from 'node:test';
import assert from 'node:assert/strict';
import { isCardfightDeck, isCardfightSetupView, isCardfightView } from '../src/lib/cardfightGuards.ts';
const setup = {stage:'LOBBY',game_type:'cardfight',profile_id:null,first_player_id:null,catalog_version:'catalog',seats:[{player_id:'p1',deck_valid:false}],self_setup:null};
const card = {ref:'a',card_id:1,orientation:'STAND',face:'UP',slot:null,position:0,modifiers:{power:0,shield:0,defense:0,critical:0},counters:0};
const view = {stage:'OPENING',game_type:'cardfight',profile_id:'cardfight-manual-v1',revision:0,turn:1,phase:'RIDE',active_player_id:'p1',priority_holder_id:'p1',response_window:'NONE',players:['p1','p2'].map(player_id=>({player_id,hand_count:5,deck_count:44,zones:[{zone:'VANGUARD',count:1,cards:[card]}],resources:{}})),self:null,pending_result:null,result:null,history:[],legal_actions:[]};
test('setup guard accepts spectator setup and rejects malformed or mismatched game',()=>{
 assert.equal(isCardfightSetupView(setup),true);
 assert.equal(isCardfightSetupView({...setup,game_type:'top100'}),false);
 assert.equal(isCardfightSetupView({...setup,self_setup:{deck:{name:'incomplete'},diagnostics:[]}}),false);
 assert.equal(isCardfightSetupView({...setup,seats:[{player_id:'p1',deck_valid:'yes'}]}),false);
});
test('match guard validates nested cards, hand, actions and visibility shapes',()=>{
 assert.equal(isCardfightView(view),true);
 assert.equal(isCardfightView({...view,self:{hand:[card],opening_status:'PENDING',inspection:null,concealed_zone_cards:[]}}),true);
 assert.equal(isCardfightView({...view,self:{hand:[{ref:'secret'}],opening_status:'PENDING',inspection:null,concealed_zone_cards:[]}}),false);
 assert.equal(isCardfightView({...view,legal_actions:[{action_type:'PATCH_STATE'}]}),false);
 assert.equal(isCardfightView({...view,revision:'1'}),false);
 assert.equal(isCardfightView({...view,stage:'LOBBY'}),false);
});
test('Cardfight token section is required and TOKEN zone is accepted in private supply views',()=>{
 const deck={game_id:'cardfight',catalog_version:'catalog',name:'Token deck',main:Array(50).fill(1),ride:[],extra:[],tokens:Array(30).fill(2),starter_index:0};
 assert.equal(isCardfightDeck(deck),true);
 assert.equal(isCardfightDeck({...deck,tokens:Array(31).fill(2)}),false);
 const oldShape={...deck};delete oldShape.tokens;
 assert.equal(isCardfightDeck(oldShape),false);
 const withToken={...view,players:view.players.map(player=>({...player,zones:[...player.zones,{zone:'TOKEN',count:1,cards:[{ref:'token',orientation:'STAND',face:'DOWN',slot:null,position:0}]}]}))};
 assert.equal(isCardfightView(withToken),true);
 assert.equal(isCardfightView({...withToken,players:withToken.players.map(player=>({...player,zones:player.zones.map(zone=>zone.zone==='TOKEN'?{...zone,zone:'TOKEN_EXPOSED'}:zone)}))}),false);
});
