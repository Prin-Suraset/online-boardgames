import test from 'node:test';
import assert from 'node:assert/strict';
import { paginateItems } from '../src/lib/cardPagination.ts';

test('paginated catalog results contain at most 120 items and retain later pages', () => {
  const cards = Array.from({ length: 241 }, (_, index) => index);

  assert.deepEqual(paginateItems(cards, 1, 120), cards.slice(0, 120));
  assert.deepEqual(paginateItems(cards, 2, 120), cards.slice(120, 240));
  assert.deepEqual(paginateItems(cards, 3, 120), [240]);
  assert.deepEqual(paginateItems(cards, 4, 120), []);
});
