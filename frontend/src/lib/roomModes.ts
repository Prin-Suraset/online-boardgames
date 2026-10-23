import type { GameType, RoomStatus } from '../types';

const minimumPlayersWithBots: Partial<Record<GameType, number>> = {
  what_number: 3,
  you_or_me: 2,
  top100: 2,
};

export type RoomMode = 'pvp' | 'bot-test';

export function roomRouteFor(roomCode: string, mode: RoomMode = 'pvp'): string {
  const path = `/room/${roomCode.trim().toUpperCase()}`;
  return mode === 'bot-test' ? `${path}?mode=bot-test` : path;
}

export function testBotCountFor(gameType: GameType): number | null {
  const minimumPlayers = minimumPlayersWithBots[gameType];
  return minimumPlayers === undefined ? null : minimumPlayers - 1;
}

export interface TestBotFillInput {
  mode: string | null;
  attempted: boolean;
  connected: boolean;
  status: RoomStatus | null;
  gameType: GameType | null;
  isHost: boolean;
  players: readonly { is_bot: boolean }[];
}

export function getTestBotFillDecision(
  input: TestBotFillInput,
): { markAttempted: boolean; count: number | null } {
  if (
    input.mode !== 'bot-test'
    || input.attempted
    || !input.connected
    || input.status !== 'LOBBY'
    || !input.isHost
  ) {
    return { markAttempted: false, count: null };
  }
  const count = input.gameType !== null
    && input.players.length === 1
    && !input.players.some((player) => player.is_bot)
    ? testBotCountFor(input.gameType)
    : null;
  return { markAttempted: true, count };
}
