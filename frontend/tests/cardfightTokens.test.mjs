import test from 'node:test';
import assert from 'node:assert/strict';
import * as areaDecks from '../src/lib/areaDecks.ts';

const card = (card_id, fields = {}) => ({ card_id, game_id: 'cardfight', fields, full_art: '', thumbnail_art: '', unresolved_fields: [] });

test('token ID derivation accepts explicit markers and exact summoner references only', () => {
  assert.equal(typeof areaDecks.getCardfightTokenIds, 'function');
  const cards = [
    card(1, { CardName: 'Plant summoner', TokenSummoner: 10, TokenSummoner2: 11, TokenSummonerRodeUponNumber: 12, TokenSummonRodeUponNumber: 13 }),
    card(2, { CardName: 'Explicit marker', TokenInHand: 1 }),
    card(3, { CardName: 'Other marker', TokenInHand: 2 }),
    card(4, { CardName: 'Not a reference', TokenSummoner2Button1: 14 }),
    card(10, { CardName: 'Plant' }), card(11, { CardName: 'Plant (strong)' }),
    card(12, { CardName: 'Rode-upon token' }), card(13, { CardName: 'Summoned-on-ride token' }),
    card(14, { CardName: 'Unreferenced' }),
  ];
  assert.deepEqual([...areaDecks.getCardfightTokenIds(cards)].sort((a, b) => a - b), [2, 10, 11, 12, 13]);
});
