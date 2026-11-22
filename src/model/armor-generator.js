// Makes random armor. Model code: no p5 drawing calls.
// Load after items.js, rng.js, rarity.js and weapon-generator.js (it shares RARITY_VALUE).
//
// generateArmor(rng, options) rolls rarity with the same weights as weapons, then a slot.
// Helmets and leg armor give block percent, chest armor gives bonus hearts. Each list is in
// RARITY_IDS order: common, uncommon, rare, epic, legendary.

const ARMOR_SLOTS = Object.freeze([
  {
    id: "helmet",
    make: Helmet,
    stat: "block",
    values: [4, 6, 9, 12, 15],
    names: ["Cloth Cap", "Leather Hood", "Iron Helm", "Runed Helm", "Crown of Embers"]
  },
  {
    id: "chest",
    make: ChestArmor,
    stat: "hearts",
    values: [1, 1, 2, 2, 3],
    names: ["Worn Robe", "Hide Vest", "Chain Mail", "Warded Robe", "Phoenix Mantle"]
  },
  {
    id: "legs",
    make: LegArmor,
    stat: "block",
    values: [3, 5, 7, 10, 12],
    names: ["Cloth Pants", "Leather Greaves", "Iron Greaves", "Runed Greaves", "Ember Greaves"]
  }
]);

// options (all optional): depth, source, minRarity and rarity work as in generateWeapon;
// slot is "helmet", "chest" or "legs" to skip the slot roll.
// Returns a Helmet, ChestArmor or LegArmor.
function generateArmor(rng, options = {}) {
  let rarityId = options.rarity;
  if (rarityId === undefined) {
    rarityId = rollRarity(rng, {
      depth: valueOr(options.depth, 0),
      source: valueOr(options.source, "chest"),
      minRarity: options.minRarity
    });
  }
  const index = RARITY_IDS.indexOf(rarityId);
  let slot = ARMOR_SLOTS.find((s) => s.id === options.slot);
  if (slot === undefined) {
    slot = pick(ARMOR_SLOTS, rng);
  }
  const armorOptions = {
    id: slot.id + "-" + randInt(rng, 0, 999999),
    name: slot.names[index],
    value: RARITY_VALUE[index],
    rarity: rarityId
  };
  armorOptions[slot.stat] = slot.values[index];
  return new slot.make(armorOptions);
}
