// Loot state for one run. Model code: no p5 drawing calls.
// Load after weapon-generator.js.
//
// One LootRun lives as long as a dungeon. It owns the loot rng (so the same dungeon seed gives
// the same loot in the same order) and knows how deep each room is.
//
// Bad-luck protection: after BAD_LUCK_LIMIT chests in a row with nothing rare or better, the
// next chest is guaranteed to hold something rare or better, and the counter starts over.

const BAD_LUCK_LIMIT = 4;
const BAD_LUCK_RARITY = "rare";

class LootRun {
  // depths: how many doors each room is from the start, indexed by room id.
  constructor(seed = 1, depths = []) {
    this.rng = createRng(seed);
    this.depths = depths;
    this.chestsWithoutRare = 0;
  }

  depthOf(room) {
    if (room && room.id !== null && this.depths[room.id] !== undefined) {
      return Math.max(0, this.depths[room.id]);
    }
    return 0;
  }

  // The lowest rarity the next chest may roll: null normally, rare once luck has run out.
  nextChestMinRarity() {
    if (this.chestsWithoutRare >= BAD_LUCK_LIMIT) {
      return BAD_LUCK_RARITY;
    }
    return null;
  }

  // Updates the counter after a chest held a weapon of this rarity.
  recordChestRarity(rarityId) {
    if (isRareOrBetter(rarityId)) {
      this.chestsWithoutRare = 0;
    } else {
      this.chestsWithoutRare++;
    }
  }

  // The weapon and gold inside a chest in this room: { weapon, gold }.
  rollChestLoot(room) {
    const depth = this.depthOf(room);
    const weapon = generateWeapon(this.rng, {
      depth: depth,
      source: "chest",
      minRarity: this.nextChestMinRarity() || undefined
    });
    this.recordChestRarity(weapon.rarity);
    const gold = randInt(this.rng, 10, 25) + depth * 5;
    return { weapon: weapon, gold: gold };
  }
}
