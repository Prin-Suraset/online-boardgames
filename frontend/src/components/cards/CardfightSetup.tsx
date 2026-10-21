import type { CardfightSetupView, CardfightSetupAction, Player } from '../../types';
import { DeckWorkshop } from './DeckWorkshop';
import { useCardfightCatalog } from './useCardfightCatalog';
import './cardfight.css';
interface Props { setup:CardfightSetupView; players:readonly Player[]; playerId:string; isHost:boolean; onAction:(action:CardfightSetupAction)=>void; onReady:(ready:boolean)=>void; onStart:()=>void; connected:boolean }
export function CardfightSetup({setup,players,playerId,isHost,onAction,onReady,onStart,connected}:Props) {
 const {catalog,error}=useCardfightCatalog();const own=players.find(p=>p.id===playerId);const valid=setup.seats.find(s=>s.player_id===playerId)?.deck_valid===true;
 const canStart=connected&&players.length===2&&players.every(p=>p.is_ready)&&setup.seats.every(s=>s.deck_valid);
 return <section className="cf cf-setup"><h1 className="text-2xl font-bold">Cardfight · prepare your duel</h1><p>Two players, private decks, manual abilities. เลือกเด็คของคุณ แล้วกดพร้อมเมื่อจัดเรียบร้อยแล้ว</p>
  <div className="cf-setup-status">{players.map(player=><div key={player.id} className="cf-setup-seat"><h2>{player.name}{player.id===playerId?' (you)':''}</h2><p>{setup.seats.find(s=>s.player_id===player.id)?.deck_valid?'Deck validated':'Waiting for deck'} · {player.is_ready?'Ready':'Not ready'}</p></div>)}</div>
  <div className="cf-toolbar"><label>Table profile<select value={setup.profile_id??''} disabled={!isHost||!connected} onChange={e=>{if(e.target.value)onAction({action_type:'AREA_SELECT_PROFILE',payload:{profile_id:'cardfight-manual-v1',first_player_id:setup.first_player_id??players[0]?.id??playerId}});}}><option value="">Host chooses a profile</option><option value="cardfight-manual-v1">Assisted legacy table</option></select></label>
  <label>First player<select value={setup.first_player_id??''} disabled={!isHost||!connected||setup.profile_id===null} onChange={e=>{onAction({action_type:'AREA_SELECT_PROFILE',payload:{profile_id:'cardfight-manual-v1',first_player_id:e.target.value}});}}><option value="">Choose first player</option>{players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  {own&&<button className="cf-primary" disabled={!connected||(!own.is_ready&&!valid)} onClick={()=>{onReady(!own.is_ready);}}>{own.is_ready?'Not ready':'Ready for duel'}</button>}{isHost&&<button className="cf-primary" disabled={!canStart} onClick={onStart}>Start duel</button>}</div>
  <p>Changing profile or first player clears both submissions and ready flags. Submit again after a change. Five-card opening; one optional reshuffle mulligan; concession or agreed result ends the match.</p>
  {error&&<p role="alert">{error}</p>}{!catalog&&!error&&<p role="status">Loading card catalog…</p>}{catalog&&catalog.catalog_version!==setup.catalog_version&&<p role="alert">Catalog versions differ. Reload after the current catalog is deployed.</p>}
  {setup.self_setup!==null&&catalog&&<DeckWorkshop key={setup.catalog_version} catalog={catalog} initialDeck={setup.self_setup.deck} canSubmit={connected&&setup.profile_id!==null&&catalog.catalog_version===setup.catalog_version} onSubmit={deck=>{onAction({action_type:'CF_SUBMIT_DECK',payload:{deck}});}}/>}
  {setup.self_setup===null&&<p className="cf-validation">You are spectating. Decks stay private; take an available seat to prepare your own.</p>}
 </section>;
}
