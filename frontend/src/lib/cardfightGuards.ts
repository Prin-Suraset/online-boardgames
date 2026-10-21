import type { CardfightSetupView, CardfightView, CardfightDeck, CFVisibleCard, CFActionType } from '../types/cardfight';

const zones = ['DECK','HAND','VANGUARD','REAR','GUARDIAN','DAMAGE','DROP','SOUL','BIND','REMOVED','G_ZONE','RIDE','CHECK'];
const actions: readonly CFActionType[] = ['CF_DRAW','CF_SHUFFLE','CF_INSPECT','CF_CLOSE_INSPECTION','CF_MOVE','CF_REORDER','CF_ORIENT','CF_SET_FACE','CF_SET_MODIFIER','CF_SET_COUNTER','CF_MULLIGAN','CF_KEEP_HAND','CF_READY_TO_PLAY','CF_NEXT_PHASE','CF_END_TURN','CF_DECLARE_ATTACK','CF_OPEN_RESPONSE','CF_PASS_RESPONSE','CF_DRIVE_CHECK','CF_DAMAGE_CHECK','CF_RESOLVE_CHECK','CF_CONCEDE','CF_PROPOSE_RESULT','CF_CONFIRM_RESULT','CF_REJECT_RESULT'];
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
const nullableText = (v: unknown) => v === null || text(v);
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const natural = (v: unknown): v is number => integer(v) && v >= 0;
const member = (v: unknown, choices: readonly string[]) => text(v) && choices.includes(v);
const array = (v: unknown, guard: (item: unknown) => boolean): boolean => Array.isArray(v) && v.every(guard);
const ref = (v: unknown) => text(v) && v.length > 0 && v.length <= 64;
export function isCardfightDeck(v: unknown): v is CardfightDeck {
  if (!record(v)) return false;
  return v.game_id === 'cardfight' && text(v.catalog_version) && v.catalog_version.length > 0 && v.catalog_version.length <= 64 &&
    text(v.name) && v.name.length > 0 && v.name.length <= 80 &&
    ['main','ride','extra'].every(key => array(v[key], id => integer(id) && id > 0 && id <= 2147483647)) &&
    Array.isArray(v.main) && v.main.length >= 1 && v.main.length <= 256 &&
    Array.isArray(v.ride) && v.ride.length <= 16 && Array.isArray(v.extra) && v.extra.length <= 64 &&
    v.main.length + v.ride.length + v.extra.length <= 336 &&
    (v.starter_index === null || (natural(v.starter_index) && v.starter_index <= 255)) &&
    Object.keys(v).every(key => ['game_id','catalog_version','name','main','ride','extra','starter_index'].includes(key));
}
function diagnostic(v: unknown): boolean {
  return record(v) && text(v.code) && member(v.severity,['warning','error']) && text(v.message) &&
    (v.key === null || (record(v.key) && v.key.game_id === 'cardfight' && natural(v.key.card_id))) &&
    (v.source === null || (record(v.source) && text(v.source.path) && natural(v.source.line)));
}
export function isCardfightSetupView(v: unknown): v is CardfightSetupView {
  return record(v) && v.game_type === 'cardfight' && v.stage === 'LOBBY' && nullableText(v.profile_id) && nullableText(v.first_player_id) && text(v.catalog_version) &&
    Array.isArray(v.seats) && v.seats.length <= 2 && v.seats.every(s => record(s) && text(s.player_id) && typeof s.deck_valid === 'boolean') &&
    (v.self_setup === null || (record(v.self_setup) && (v.self_setup.deck === null || isCardfightDeck(v.self_setup.deck)) && array(v.self_setup.diagnostics,diagnostic)));
}
export function isCFVisibleCard(v: unknown): v is CFVisibleCard {
  return record(v) && ref(v.ref) && integer(v.card_id) && v.card_id > 0 && member(v.orientation,['STAND','REST']) && member(v.face,['UP','DOWN']) && nullableText(v.slot) && natural(v.position) &&
    natural(v.counters) && v.counters <= 999 && record(v.modifiers) && ['power','shield','defense','critical'].every(k => record(v.modifiers) && integer(v.modifiers[k]));
}
function card(v: unknown): boolean {
  return isCFVisibleCard(v) || (record(v) && ref(v.ref) && member(v.orientation,['STAND','REST']) && v.face === 'DOWN' && nullableText(v.slot) && natural(v.position) &&
    Object.keys(v).every(k => ['ref','orientation','face','slot','position'].includes(k)));
}
function inspection(v: unknown): boolean {
  return v === null || (record(v) && ref(v.inspection_id) && member(v.zone,zones) && array(v.cards,isCFVisibleCard) && typeof v.reorder_allowed === 'boolean');
}
function outcome(v: Record<string, unknown>): boolean { return member(v.outcome,['WIN','DRAW']) && nullableText(v.winner_id); }
export function isCardfightView(v: unknown): v is CardfightView {
  if (!record(v)) return false;
  return v.game_type === 'cardfight' && member(v.stage,['OPENING','PLAYING','FINISHED']) && text(v.profile_id) && natural(v.revision) && natural(v.turn) &&
    member(v.phase,['RIDE','MAIN','BATTLE','END']) && text(v.active_player_id) && text(v.priority_holder_id) && member(v.response_window,['NONE','RESPONSE','CHECK']) &&
    Array.isArray(v.players) && v.players.length === 2 && v.players.every(p => record(p) && text(p.player_id) && natural(p.hand_count) && natural(p.deck_count) && record(p.resources) && Object.keys(p.resources).length === 0 &&
      array(p.zones,z => record(z) && member(z.zone,zones) && natural(z.count) && array(z.cards,card))) &&
    (v.self === null || (record(v.self) && array(v.self.hand,isCFVisibleCard) && member(v.self.opening_status,['PENDING','KEPT','READY']) && inspection(v.self.inspection) && array(v.self.concealed_zone_cards,isCFVisibleCard))) &&
    (v.pending_result === null || (record(v.pending_result) && text(v.pending_result.proposer_id) && natural(v.pending_result.proposal_revision) && outcome(v.pending_result))) &&
    (v.result === null || (record(v.result) && outcome(v.result) && member(v.result.reason,['CONCESSION','AGREEMENT']))) &&
    array(v.history,h => record(h) && natural(h.sequence) && text(h.actor_id) && member(h.action_type,actions) && array(h.public_refs,ref) && (h.count === null || natural(h.count))) &&
    array(v.legal_actions,a => record(a) && member(a.action_type,actions));
}
