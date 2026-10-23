import test from 'node:test';
import assert from 'node:assert/strict';
import { isInCardfightFormat } from '../src/lib/cardFormats.ts';

const card = (card_id, fields = {}) => ({ card_id, game_id: 'cardfight', fields, full_art: '', thumbnail_art: '', unresolved_fields: [] });

test('Premium includes all catalog cards', () => {
  assert.equal(isInCardfightFormat(card(1), 'premium'), true);
  assert.equal(isInCardfightFormat(card(8230, { DCards: 1 }), 'premium'), true);
});

test('D Standard uses the recovered nonzero D-nation marker only', () => {
  assert.equal(isInCardfightFormat(card(8230, { DCards: 1 }), 'd-standard'), true);
  assert.equal(isInCardfightFormat(card(8231, { DCards: -1 }), 'd-standard'), true);
  assert.equal(isInCardfightFormat(card(1, {}), 'd-standard'), false);
  assert.equal(isInCardfightFormat(card(2, { DCards: 0 }), 'd-standard'), false);
});

test('V Standard uses V-series entries and excludes D and premium-only cards', () => {
  assert.equal(isInCardfightFormat(card(1, {}), 'v-standard'), false);
  assert.equal(isInCardfightFormat(card(5729, {}), 'v-standard'), true);
  assert.equal(isInCardfightFormat(card(5698, {}), 'v-standard'), false);
  assert.equal(isInCardfightFormat(card(6000, { OldCardStat: 1 }), 'v-standard'), false);
  assert.equal(isInCardfightFormat(card(8230, { DCards: 1 }), 'v-standard'), false);
});
