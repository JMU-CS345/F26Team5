// Loot state for one run. Model code: no p5 drawing calls.
// Load after weapon-generator.js.
//
// One LootRun lives as long as a dungeon. It owns the loot rng (so the same dungeon seed gives
// the same loot in the same order) and knows how deep each room is.

class LootRun {
  // depths: how many doors each room is from the start, indexed by room id.
  constructor(seed = 1, depths = []) {
    this.rng = createRng(seed);
    this.depths = depths;
  }

  depthOf(room) {
    if (room && room.id !== null && this.depths[room.id] !== undefined) {
      return Math.max(0, this.depths[room.id]);
    }
    return 0;
  }

  // The weapon and gold inside a chest in this room: { weapon, gold }.
  rollChestLoot(room) {
    const depth = this.depthOf(room);
    const weapon = generateWeapon(this.rng, {
      depth: depth,
      source: "chest"
    });
    const gold = randInt(this.rng, 10, 25) + depth * 5;
    return { weapon: weapon, gold: gold };
  }
}
