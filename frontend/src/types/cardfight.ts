export const CF_ZONES = ['DECK','HAND','VANGUARD','REAR','GUARDIAN','DAMAGE','DROP','SOUL','BIND','REMOVED','G_ZONE','RIDE','CHECK'] as const;
export type CFZone = typeof CF_ZONES[number];
export interface CardfightDeck {
  game_id: 'cardfight'; catalog_version: string; name: string;
  main: readonly number[]; ride: readonly number[]; extra: readonly number[]; starter_index: number | null;
}
export interface CatalogDiagnostic {
  code: string; severity: 'warning' | 'error';
  key: { game_id: 'cardfight'; card_id: number } | null;
  source: { path: string; line: number } | null; message: string;
}
export interface CardfightSetupView {
  stage: 'LOBBY'; game_type: 'cardfight'; profile_id: string | null; first_player_id: string | null;
  catalog_version: string; seats: readonly { player_id: string; deck_valid: boolean }[];
  self_setup: { deck: CardfightDeck | null; diagnostics: readonly CatalogDiagnostic[] } | null;
}
export interface CFModifiers { power: number; shield: number; defense: number; critical: number }
export interface CFConcealedCard {
  ref: string; orientation: 'STAND' | 'REST'; face: 'DOWN'; slot: string | null; position: number;
}
export interface CFVisibleCard {
  ref: string; card_id: number; orientation: 'STAND' | 'REST'; face: 'UP' | 'DOWN';
  slot: string | null; position: number; modifiers: CFModifiers; counters: number;
}
export type CFCard = CFVisibleCard | CFConcealedCard;
export interface CFZoneView { zone: CFZone; count: number; cards: readonly CFCard[] }
export interface CFTable { player_id: string; hand_count: number; deck_count: number; zones: readonly CFZoneView[]; resources: Readonly<Record<string, never>> }
export interface CFInspection { inspection_id: string; zone: CFZone; cards: readonly CFVisibleCard[]; reorder_allowed: boolean }
export interface CFResultProposal { proposer_id: string; proposal_revision: number; outcome: 'WIN' | 'DRAW'; winner_id: string | null }
export interface CardfightView {
  stage: 'OPENING' | 'PLAYING' | 'FINISHED'; game_type: 'cardfight'; profile_id: string;
  revision: number; turn: number; phase: 'RIDE' | 'MAIN' | 'BATTLE' | 'END';
  active_player_id: string; priority_holder_id: string; response_window: 'NONE' | 'RESPONSE' | 'CHECK';
  players: readonly CFTable[];
  self: { hand: readonly CFVisibleCard[]; opening_status: 'PENDING' | 'KEPT' | 'READY'; inspection: CFInspection | null; concealed_zone_cards: readonly CFVisibleCard[] } | null;
  pending_result: CFResultProposal | null;
  result: { outcome: 'WIN' | 'DRAW'; winner_id: string | null; reason: 'CONCESSION' | 'AGREEMENT' } | null;
  history: readonly { sequence: number; actor_id: string; action_type: CFActionType; public_refs: readonly string[]; count: number | null }[];
  legal_actions: readonly { action_type: CFActionType }[];
}
type Revision = { expected_revision: number };
type Action<K extends string, P extends object = Record<string, never>> = { action_type: K; payload: P & Revision };
export type CardfightAction =
  | Action<'CF_DRAW', { count: number; edge: 'TOP' | 'BOTTOM' }>
  | Action<'CF_SHUFFLE', { zone: 'DECK' }>
  | Action<'CF_INSPECT', { zone: CFZone; count: number | null }>
  | Action<'CF_CLOSE_INSPECTION', { inspection_id: string }>
  | Action<'CF_MOVE', { card_ref: string; to_zone: CFZone; slot: string | null; position: number | null; parent_ref: string | null }>
  | Action<'CF_REORDER', { inspection_id: string; ordered_refs: readonly string[] }>
  | Action<'CF_ORIENT', { card_ref: string; orientation: 'STAND' | 'REST' }>
  | Action<'CF_SET_FACE', { card_ref: string; face: 'UP' | 'DOWN' }>
  | Action<'CF_SET_MODIFIER', { card_ref: string; stat: 'POWER' | 'SHIELD' | 'DEFENSE' | 'CRITICAL'; value: number }>
  | Action<'CF_SET_COUNTER', { card_ref: string; value: number }>
  | Action<'CF_MULLIGAN', { card_refs: readonly string[] }>
  | Action<'CF_DECLARE_ATTACK', { attacker_ref: string; target_ref: string | null; target_player_id: string | null }>
  | Action<'CF_PROPOSE_RESULT', { outcome: 'WIN' | 'DRAW'; winner_id: string | null }>
  | Action<'CF_CONFIRM_RESULT' | 'CF_REJECT_RESULT', { proposal_revision: number }>
  | { action_type: 'CF_KEEP_HAND' | 'CF_READY_TO_PLAY' | 'CF_NEXT_PHASE' | 'CF_END_TURN' | 'CF_OPEN_RESPONSE' | 'CF_PASS_RESPONSE' | 'CF_DRIVE_CHECK' | 'CF_DAMAGE_CHECK' | 'CF_RESOLVE_CHECK' | 'CF_CONCEDE'; payload: Revision };
export type CFActionType = CardfightAction['action_type'];
export type CardfightSetupAction =
  | { action_type: 'AREA_SELECT_PROFILE'; payload: { profile_id: 'cardfight-manual-v1'; first_player_id: string } }
  | { action_type: 'CF_SUBMIT_DECK'; payload: { deck: CardfightDeck } };
