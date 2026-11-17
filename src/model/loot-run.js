// Loot state for one run. Model code: no p5 drawing calls.
// Load after weapon-generator.js.
//
// One LootRun lives as long as a dungeon. It owns the loot rng (so the same dungeon seed gives
// the same loot in the same order) and knows how deep each room is.
//
// The run also holds the gear budget (gearTarget pieces, see loot-slots.js) and the slots that
// say which rooms drop them. Once the budget is spent, nothing else drops gear.
//
// Bad-luck protection: after BAD_LUCK_LIMIT gear pieces in a row with nothing rare or better,
// the next piece is guaranteed to be rare or better, and the counter starts over.

const BAD_LUCK_LIMIT = 4;
const BAD_LUCK_RARITY = "rare";
const CLEAR_BONUS_RATIO = 0.75; // share of combat rooms to clear for the boss bonus piece
const CLEAR_DEPTH_STEP = 0.25; // rarity rolls act this much deeper for each room cleared

class LootRun {
  // depths: how many doors each room is from the start, indexed by room id.
  constructor(seed = 1, depths = []) {
    this.rng = createRng(seed);
    this.depths = depths;
    this.chestsWithoutRare = 0;
    this.gearTarget = rollGearTarget(this.rng);
    this.gearDropped = 0;
    this.slots = {};
    this.combatRoomCount = 0;
    this.clearedRoomIds = new Set();
    this.bonusGiven = false;
  }

  // Fixes where this run's gear will drop. Call it once, right after the dungeon is made.
  assign(dungeon) {
    this.slots = assignLootSlots(dungeon, this.rng, this.gearTarget);
    this.combatRoomCount = dungeon.rooms.filter((r) => r.role === "normal").length;
  }

  gearLeft() {
    return this.gearTarget - this.gearDropped;
  }

  hasSlot(room, kind) {
    const list = this.slots[room.id];
    return list !== undefined && list.includes(kind);
  }

  // Uses up one slot of this kind in the room. False if there is none or the budget is spent.
  takeSlot(room, kind) {
    if (!this.hasSlot(room, kind) || this.gearLeft() <= 0) {
      return false;
    }
    const list = this.slots[room.id];
    list.splice(list.indexOf(kind), 1);
    this.gearDropped++;
    return true;
  }

  // The share of combat rooms cleared so far, 0 to 1.
  clearRatio() {
    if (this.combatRoomCount === 0) {
      return 0;
    }
    return this.clearedRoomIds.size / this.combatRoomCount;
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

  // Call when a combat room is cleared. Returns the weapon its slot holds, or null.
  rollClearGear(room) {
    if (room.role !== "normal" || this.clearedRoomIds.has(room.id)) {
      return null;
    }
    this.clearedRoomIds.add(room.id);
    if (!this.takeSlot(room, "clear")) {
      return null;
    }
    return this.rollGear(room, "chest");
  }

  // Call when the boss dies. Returns its weapon, plus a bonus piece (outside the budget) if
  // enough combat rooms were cleared.
  rollBossGear(room) {
    const weapons = [];
    if (this.takeSlot(room, "boss")) {
      weapons.push(this.rollGear(room, "boss"));
    }
    if (!this.bonusGiven && this.clearRatio() >= CLEAR_BONUS_RATIO) {
      this.bonusGiven = true;
      weapons.push(this.rollGear(room, "boss"));
    }
    return weapons;
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

  // What a chest in this room holds: { weapon, gold }. The weapon is null when the room has
  // no chest slot left, so only treasure rooms hand out gear.
  rollChestLoot(room) {
    const depth = this.depthOf(room);
    let weapon = null;
    if (this.takeSlot(room, "chest")) {
      weapon = this.rollGear(room, "chest");
    }
    const gold = randInt(this.rng, 10, 25) + depth * 5;
    return { weapon: weapon, gold: gold };
  }
}
