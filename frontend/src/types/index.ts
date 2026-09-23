export type PlayerMark = "X" | "O";
export type RoomStatus = "LOBBY" | "PLAYING" | "FINISHED";
export type GameType = "tictactoe" | "what_number" | "you_or_me";
export type ConnectionStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";

export interface Player {
  id: string;
  name: string;
  display_name?: string;
  avatar: string;
  is_ready: boolean;
  is_host: boolean;
  is_bot: boolean;
}

export interface TicTacToeView {
  board: readonly (PlayerMark | null)[];
  current_player: string;
  status: "in_progress" | "won" | "draw";
  winner: string | null;
  your_mark: PlayerMark;
}

export type WhatNumberPhase = "THINKING" | "ATTACK" | "PENALTY" | "FINISHED";
export type WhatNumberPlayerStatus = "ACTIVE" | "ELIMINATED";
export type SkillType = "PEEK" | "SHIELD" | "RADAR" | "SWAP" | "SAFE_EXIT";

export interface NumberCardView {
  id: string;
  number: number | null;
  is_revealed: boolean;
}

export interface SkillCardView {
  id: string;
  skill_type: SkillType;
  description: string;
}

export interface WhatNumberPlayerView {
  player_id: string;
  cards: readonly NumberCardView[];
  skills: readonly SkillCardView[];
  skill_count: number;
  status: WhatNumberPlayerStatus;
  shield_active: boolean;
}

export interface WhatNumberView {
  players: readonly WhatNumberPlayerView[];
  revealed_center_cards: readonly number[];
  turn_counter: number;
  thinking_time_seconds: number;
  phase: WhatNumberPhase;
  active_player_id: string | null;
  pending_penalty_player_id: string | null;
  successful_guess_chain: boolean;
  winner_id: string | null;
  event_log: readonly string[];
  private_insights: readonly string[];
}

export type YouOrMePhase = "SELECT_CARD" | "BETTING" | "SHOWDOWN" | "FINISHED";

export interface YouOrMeCardView {
  id: string;
  rank: number | null;
  card_key: string | null;
  is_revealed: boolean;
}

export interface YouOrMePlayerView {
  player_id: string;
  coins: number;
  hand: readonly YouOrMeCardView[];
  hand_count: number;
  selected_card: YouOrMeCardView | null;
  is_folded: boolean;
  status: "ACTIVE" | "ELIMINATED";
}

export interface YouOrMeRoundResult {
  round_number: number;
  pot: number;
  winner_ids: readonly string[];
  winning_rank: number | null;
  payouts: Readonly<Record<string, number>>;
  selected_cards: Readonly<Record<string, number | null>>;
}

export interface YouOrMeView {
  players: readonly YouOrMePlayerView[];
  round_number: number;
  total_rounds: number;
  pot: number;
  phase: YouOrMePhase;
  current_bet: number;
  current_player_id: string | null;
  player_round_bets: Readonly<Record<string, number>>;
  round_history: readonly YouOrMeRoundResult[];
  winner_id: string | null;
  event_log: readonly string[];
}

export interface GameOverResult {
  is_over: boolean;
  outcome: "WIN" | "DRAW" | "FORCED";
  winner_id: string | null;
  details: Readonly<Record<string, unknown>>;
}

export interface RoomState {
  room_code: string;
  game_type: GameType;
  status: RoomStatus;
  host_id: string;
  players: readonly Player[];
  game: TicTacToeView | WhatNumberView | YouOrMeView | null;
  result: GameOverResult | null;
}

export interface GameAction {
  action_type: string;
  payload: object;
}

export interface ProtocolError {
  code: string;
  message: string;
}

export interface ChatMessage {
  sender_id: string;
  sender_name: string;
  text: string;
  timestamp: string;
}

export type GameEventType =
  | "VOLUNTEER"
  | "TIMEOUT_PICK"
  | "ATTACK_GUESS"
  | "GUESS_CORRECT"
  | "GUESS_WRONG"
  | "TURN_END"
  | "TURN_START"
  | "SKILL_USED"
  | "CENTER_CARD_REVEALED"
  | "CENTER_REVEALED_FROM_GUESS"
  | "GUESS_HELD_BY_ANOTHER";

export interface GameEvent {
  event_type: GameEventType;
  actor_id: string | null;
  actor_name: string | null;
  target_id: string | null;
  target_name: string | null;
  value: unknown;
  is_correct: boolean | null;
}

export interface GameStateUpdateEnvelope {
  type: "GAME_STATE_UPDATE";
  payload: RoomState;
}

export interface ErrorEnvelope {
  type: "ERROR";
  payload: ProtocolError;
}

export interface ChatMessageEnvelope {
  event: "CHAT_MESSAGE";
  data: ChatMessage;
}

export interface GameEventEnvelope {
  event: "GAME_EVENT";
  data: GameEvent;
}

export type ServerEnvelope =
  | GameStateUpdateEnvelope
  | ErrorEnvelope
  | ChatMessageEnvelope
  | GameEventEnvelope;

export interface GuestProfile {
  playerId: string;
  playerName: string;
  avatar: string;
}

export interface AuthUser {
  id: string;
  display_name: string;
  is_guest: boolean;
  is_admin: boolean;
  wins: number;
  losses: number;
  draws: number;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
