import type { AreaCard } from "./areaDecks";

export type CardfightFormat = "premium" | "v-standard" | "d-standard";

const V_STANDARD_FIRST_CARD_ID = 5671;

// Explicit NewCardStat = 0 overrides from the recovered Cardfight initialization script.
const V_STANDARD_EXCLUDED_CARD_IDS = new Set<number>([
  5698, 5699, 5704, 5705, 5706, 5717, 5718, 5719, 5720, 5721, 5740, 5741, 5742, 5743, 5744, 5745, 5746, 5747, 5748, 5749, 5750, 5751,
  5785, 5786, 5787, 5788, 5789, 5859, 5929, 6016, 6072, 6134, 6135, 6136, 6137, 6138, 6165, 6201, 6212, 6264, 6265, 6266, 6267,
  6268, 6269, 6270, 6271, 6272, 6273, 6274, 6275, 6276, 6277, 6489, 6624, 6635, 6638, 6639, 6640, 6649, 6661, 6662, 6663, 6665,
  6666, 6685, 6690, 6691, 6695, 6696, 6704, 6705, 6707, 6708, 6709, 6710, 6711, 6712, 6713, 6714, 6715, 6716, 6717, 6718, 6719,
  6720, 6721, 6722, 6723, 6724, 6725, 6726, 6727, 6728, 6729, 6730, 6731, 6732, 6733, 6734, 6735, 6736, 6737, 6738, 6739, 6740,
  6741, 6742, 7386, 7473, 7474, 7475, 7483, 7484, 7485, 7494, 7496, 7497, 7501, 7505, 7510, 7511, 7526, 7527, 7532, 7533, 7534,
  7535, 7536, 7537, 7538, 7539, 7540, 7541, 7542, 7543, 7544, 7545, 7546, 7547, 7548, 7549, 7550, 7551, 7552, 7553, 7554, 7555,
  7556, 7557, 7561, 7562, 7563, 7564, 7565, 7569, 7575, 7576, 7582, 7583, 7586, 7597, 7598, 7603, 7604, 7605, 7642, 8775, 8776,
  8777, 8778,
]);

function hasDStandardMarker(card: AreaCard): boolean {
  const nation = card.fields.DCards;
  return typeof nation === "number" && nation !== 0;
}

export function isInCardfightFormat(card: AreaCard, format: CardfightFormat): boolean {
  if (format === "premium") return true;

  const dStandard = hasDStandardMarker(card);
  if (format === "d-standard") return dStandard;

  return card.card_id >= V_STANDARD_FIRST_CARD_ID
    && !dStandard
    && card.fields.OldCardStat !== 1
    && !V_STANDARD_EXCLUDED_CARD_IDS.has(card.card_id);
}
