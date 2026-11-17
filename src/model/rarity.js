// Rarity tiers and how likely each one is. Model code: no p5 drawing calls.
// Load after rng.js and before items.js.
//
// Rarity changes how a weapon plays, not just its numbers: it sets how many affixes a weapon
// gets (affixCount) and legendaries add a unique hook. Weights shift two ways:
//  - depth: deeper rooms make common rarer and the high tiers more likely
//  - source: "chest" is the baseline, "elite" favors better tiers, "boss" never drops below
//    rare (see SOURCE_MIN_RARITY)

const RARITIES = Object.freeze([
  { id: "common", label: "Common", color: [190, 190, 190], affixCount: 0, weight: 60 },
  { id: "uncommon", label: "Uncommon", color: [90, 210, 110], affixCount: 1, weight: 28 },
  { id: "rare", label: "Rare", color: [80, 150, 240], affixCount: 2, weight: 9 },
  { id: "epic", label: "Epic", color: [180, 100, 240], affixCount: 3, weight: 2.5 },
  // Legendary: 2 affixes plus the unique hook from legendaries.js.
  { id: "legendary", label: "Legendary", color: [255, 160, 40], affixCount: 2, weight: 0.5 }
]);

const RARITY_IDS = Object.freeze(RARITIES.map((r) => r.id));

// How much each extra level of depth multiplies a tier's weight (common goes down).
const DEPTH_WEIGHT_STEP = Object.freeze({
  common: -0.1,
  uncommon: 0,
  rare: 0.15,
  epic: 0.3,
  legendary: 0.5
});
const MIN_DEPTH_MULTIPLIER = 0.25;

// Multiplier on each tier's weight for each source.
const SOURCE_WEIGHT_MULTIPLIER = Object.freeze({
  chest: { common: 1, uncommon: 1, rare: 1, epic: 1, legendary: 1 },
  elite: { common: 0.5, uncommon: 1, rare: 2, epic: 2.5, legendary: 2 },
  boss: { common: 1, uncommon: 1, rare: 4, epic: 6, legendary: 8 }
});

// The lowest tier a source can drop.
const SOURCE_MIN_RARITY = Object.freeze({
  chest: "common",
  elite: "common",
  boss: "rare"
});

const LOOT_SOURCES = Object.freeze(Object.keys(SOURCE_WEIGHT_MULTIPLIER));

function getRarity(id) {
  return RARITIES.find((r) => r.id === id) || null;
}

function rarityIndex(id) {
  return RARITY_IDS.indexOf(id);
}

// The weighted list [{ id, weight }] for a depth and source. Tiers below the source's floor
// get weight 0. A floor can also be raised with minRarity (the bad-luck guarantee).
function rarityWeights(depth = 0, source = "chest", minRarity = null) {
  if (!LOOT_SOURCES.includes(source)) {
    throw new RangeError("unknown loot source: " + source);
  }
  const safeDepth = Math.max(0, depth);
  let floor = rarityIndex(SOURCE_MIN_RARITY[source]);
  if (minRarity !== null) {
    floor = Math.max(floor, rarityIndex(minRarity));
  }
  return RARITIES.map((r, i) => {
    const depthMultiplier = Math.max(
      MIN_DEPTH_MULTIPLIER,
      1 + DEPTH_WEIGHT_STEP[r.id] * safeDepth
    );
    const weight = i < floor
      ? 0
      : r.weight * depthMultiplier * SOURCE_WEIGHT_MULTIPLIER[source][r.id];
    return { id: r.id, weight };
  });
}

// Rolls a rarity id. options: { depth, source, minRarity }.
function rollRarity(rng, options = {}) {
  const depth = options.depth === undefined ? 0 : options.depth;
  const source = options.source === undefined ? "chest" : options.source;
  const minRarity = options.minRarity === undefined ? null : options.minRarity;
  return weightedPick(rarityWeights(depth, source, minRarity), rng).id;
}

// True for rare, epic and legendary.
function isRareOrBetter(rarityId) {
  return rarityIndex(rarityId) >= rarityIndex("rare");
}
