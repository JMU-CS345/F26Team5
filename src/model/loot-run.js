// Loot state for one run. Model code: no p5 drawing calls.
// Load after weapon-generator.js.
//
// One LootRun lives as long as a dungeon. It owns the loot rng (so the same dungeon seed gives
// the same loot in the same order) and knows how deep each room is.
//
// Bad-luck protection: after BAD_LUCK_LIMIT gear pieces in a row with nothing rare or better,
// the next piece is guaranteed to be rare or better, and the counter starts over.

const BAD_LUCK_LIMIT = 4;
const BAD_LUCK_RARITY = "rare";
const CLEAR_DEPTH_STEP = 0.25; // rarity rolls act this much deeper for each room cleared

class LootRun {
  // depths: how many doors each room is from the start, indexed by room id.
  constructor(seed = 1, depths = []) {
    this.rng = createRng(seed);
    this.depths = depths;
    this.chestsWithoutRare = 0;
    this.clearedRoomIds = new Set();
  }

  // Rolls a gear piece for a room. Every cleared room nudges the rarity up a little.
  rollGear(room, source) {
    const depth = this.depthOf(room) + this.clearedRoomIds.size * CLEAR_DEPTH_STEP;
    const weapon = generateWeapon(this.rng, {
      depth: depth,
      source: source,
      minRarity: this.nextChestMinRarity() || undefined
    });
    this.recordChestRarity(weapon.rarity);
    return weapon;
  }

  // Call when the boss dies. Returns its weapon (rare or better) in a list.
  rollBossGear(room) {
    return [this.rollGear(room, "boss")];
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

  // What a chest in this room holds: { weapon, gold }.
  rollChestLoot(room) {
    const depth = this.depthOf(room);
    const weapon = this.rollGear(room, "chest");
    const gold = randInt(this.rng, 10, 25) + depth * 5;
    return { weapon: weapon, gold: gold };
  }
}
