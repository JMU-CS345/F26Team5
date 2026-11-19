// Where the gear of one dungeon will drop. Model code: no p5 drawing calls.
// Load after rng.js.
//
// A dungeon holds 5 to 8 pieces of gear. They are fixed up front as slots, so skipping a room
// means missing its piece. Slot kinds:
//   "boss"   the boss room: one piece, rare or better
//   "chest"  a treasure room: two pieces, one per chest
//   "clear"  a combat room (role "normal"): one piece that drops when the room is cleared
// The start room never gets a slot. A dungeon with no treasure room just puts those pieces
// on combat rooms instead; a room with role "treasure" gets its slots on its own.

const GEAR_MIN = 5;
const GEAR_MAX = 8;
const TREASURE_GEAR = 2;

// How many pieces of gear a dungeon holds.
function rollGearTarget(rng) {
  return randInt(rng, GEAR_MIN, GEAR_MAX);
}

// Returns { roomId: [slot kinds] } for a dungeon. The pieces add up to gearTarget unless
// there are not enough rooms to hold them (a room holds at most one "clear" piece).
function assignLootSlots(dungeon, rng, gearTarget = rollGearTarget(rng)) {
  const slots = {};
  let left = gearTarget;

  const boss = dungeon.rooms.find((r) => r.role === "boss");
  if (boss !== undefined && left > 0) {
    slots[boss.id] = ["boss"];
    left--;
  }

  const treasure = dungeon.rooms.find((r) => r.role === "treasure");
  if (treasure !== undefined) {
    const count = Math.min(TREASURE_GEAR, left);
    slots[treasure.id] = [];
    for (let i = 0; i < count; i++) {
      slots[treasure.id].push("chest");
    }
    left -= count;
  }

  const combat = shuffle(dungeon.rooms.filter((r) => r.role === "normal"), rng);
  for (const room of combat.slice(0, Math.max(0, left))) {
    slots[room.id] = ["clear"];
  }
  return slots;
}
