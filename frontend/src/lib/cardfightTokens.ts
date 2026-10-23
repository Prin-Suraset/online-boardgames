import type { AreaCard } from "./areaDecks";

const TOKEN_REFERENCE_FIELDS = /^(?:TokenSummoner\d*|TokenSummonerRodeUponNumber|TokenSummonRodeUponNumber)$/;

export function getCardfightTokenIds(cards: readonly AreaCard[]): ReadonlySet<number> {
  const catalogIds = new Set(cards.map((card) => card.card_id));
  const tokenIds = new Set<number>();

  for (const card of cards) {
    if (card.fields.TokenInHand === 1) tokenIds.add(card.card_id);
    for (const [field, value] of Object.entries(card.fields)) {
      if (TOKEN_REFERENCE_FIELDS.test(field) && typeof value === "number" && Number.isSafeInteger(value) && catalogIds.has(value)) {
        tokenIds.add(value);
      }
    }
  }

  return tokenIds;
}
