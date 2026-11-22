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
const TIER_DEPTH_STEP = 3; // each later dungeon rolls loot as if its rooms were this much deeper
const ARMOR_GEAR_SHARE = 0.4; // share of room and chest gear that is armor, the rest is weapons

// The dungeon number of a room, 1 when it has none.
function roomTier(room) {
  if (room && room.tier >= 1) {
    return room.tier;
  }
  return 1;
}

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
    const weapon = generateWeapon(this.rng, this.gearOptions(room, source));
    this.recordChestRarity(weapon.rarity);
    return weapon;
  }

  // Same as rollGear, but a helmet, chest piece or leg armor. Shares the bad-luck counter.
  rollArmor(room, source) {
    const armor = generateArmor(this.rng, this.gearOptions(room, source));
    this.recordChestRarity(armor.rarity);
    return armor;
  }

  // The gear a room or chest gives: armor ARMOR_GEAR_SHARE of the time, else a weapon.
  rollGearPiece(room, source) {
    if (this.rng() < ARMOR_GEAR_SHARE) {
      return this.rollArmor(room, source);
    }
    return this.rollGear(room, source);
  }

  gearOptions(room, source) {
    return {
      depth: this.lootDepth(room) + this.clearedRoomIds.size * CLEAR_DEPTH_STEP,
      source: source,
      minRarity: this.nextChestMinRarity() || undefined
    };
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

  // How deep the rarity rolls act: the room's depth plus a step for each dungeon after the first.
  // tier is the dungeon number, and defaults to the room's own tier (1 for a room without one).
  lootDepth(room, tier = roomTier(room)) {
    return this.depthOf(room) + TIER_DEPTH_STEP * (tier - 1);
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

  // What a chest in this room holds: { weapon, gold }. The weapon is any gear piece, armor too.
  rollChestLoot(room) {
    const depth = this.lootDepth(room);
    const weapon = this.rollGearPiece(room, "chest");
    const gold = randInt(this.rng, 10, 25) + depth * 5;
    return { weapon: weapon, gold: gold };
  }
}
