import test from 'node:test';
import assert from 'node:assert/strict';
import { getTestBotFillDecision, roomRouteFor, roomSessionKey, testBotCountFor } from '../src/lib/roomModes.ts';

test('test rooms fill exactly the selected game minimum and exclude unsupported games', () => {
  assert.equal(testBotCountFor('what_number'), 2);
  assert.equal(testBotCountFor('you_or_me'), 1);
  assert.equal(testBotCountFor('top100'), 1);
  assert.equal(testBotCountFor('tictactoe'), null);
  assert.equal(testBotCountFor('cardfight'), null);
});

test('room routes default to PvP and mark only explicit bot-test rooms', () => {
  assert.equal(roomRouteFor('abc123'), '/room/ABC123');
  assert.equal(roomRouteFor('abc123', 'pvp'), '/room/ABC123');
  assert.equal(roomRouteFor('abc123', 'bot-test'), '/room/ABC123?mode=bot-test');
});

test('room session keys reset session state when the room code changes', () => {
  assert.equal(roomSessionKey('aaaaaa'), roomSessionKey('AAAAAA'));
  assert.notEqual(roomSessionKey('AAAAAA'), roomSessionKey('BBBBBB'));
});

test('bot fill is requested once only for an eligible solo host in a bot-test lobby', () => {
  const eligible = {
    mode: 'bot-test', attempted: false, connected: true, status: 'LOBBY',
    gameType: 'what_number', isHost: true, players: [{ is_bot: false }],
  };
  assert.deepEqual(getTestBotFillDecision(eligible), { markAttempted: true, count: 2 });

  for (const change of [
    { mode: 'pvp' },
    { attempted: true },
    { connected: false },
    { status: 'PLAYING' },
    { isHost: false },
    { gameType: 'cardfight' },
    { players: [{ is_bot: false }, { is_bot: false }] },
    { players: [{ is_bot: false }, { is_bot: true }] },
  ]) {
    const decision = getTestBotFillDecision({ ...eligible, ...change });
    assert.equal(decision.count, null, JSON.stringify(change));
  }
});
