// What enemies and cleared rooms drop. Model code: no p5 drawing calls.
// Load after loot-run.js. An enemy type's lootTable (see enemy-types.js) names a row of
// LOOT_TABLES. Only the boss has one.
//
// Normal enemies drop nothing. A cleared room drops one reward where the last enemy died
// (rollClearReward), and a boss drops its gear where it dies.
//
// Row fields:
//   goldChance    0 to 1, the chance of a gold drop
//   gold          [min, max] gold in it
//   potionChance  0 to 1, the chance of a health potion
//   bossGear      true: the dead enemy also drops a rare or better weapon

const LOOT_TABLES = Object.freeze({
  boss: { goldChance: 1, gold: [30, 60], potionChance: 0.5, bossGear: true }
});

const CLEAR_GEAR_CHANCE = 0.25;
const CLEAR_POTION_CHANCE = 0.45; // the rest of the rolls (30%) is a gold pile

const DROP_SPACING = ITEM_DROP_SIZE * 1.5;

// The table an enemy type uses, or null when it drops nothing.
function lootTableFor(enemyType) {
  if (enemyType.lootTable === undefined) {
    return null;
  }
  return LOOT_TABLES[enemyType.lootTable] || null;
}

function makePotion() {
  return new Consumable({
    id: "health-potion",
    name: "Health Potion",
    value: 5,
    maxStackSize: 5,
    healthRestore: 2,
    description: "A small restorative potion."
  });
}

// Weapons laid out in a row centered on (x, y).
function weaponDropRow(weapons, x, y) {
  return weapons.map((weapon, i) => {
    const offset = (i - (weapons.length - 1) / 2) * DROP_SPACING;
    return new ItemDrop(x + offset, y, weapon);
  });
}

// Rolls the drops of a dead enemy: a list of ItemDrops centered where it died (empty when it
// drops nothing). A boss also drops its slot's gear.
function rollEnemyDrops(enemy, lootRun, room) {
  const table = lootTableFor(enemy.type);
  if (table === null) {
    return [];
  }
  const drops = [];
  const center = enemy.getCenter();
  const x = center.x - ITEM_DROP_SIZE / 2;
  const y = center.y - ITEM_DROP_SIZE / 2;
  if (lootRun.rng() < table.goldChance) {
    const gold = randInt(lootRun.rng, table.gold[0], table.gold[1]);
    drops.push(new ItemDrop(x + ITEM_DROP_SIZE, y, new Gold(), gold));
  }
  if (lootRun.rng() < table.potionChance) {
    drops.push(new ItemDrop(x - ITEM_DROP_SIZE, y, makePotion()));
  }
  if (table.bossGear) {
    drops.push(...weaponDropRow(lootRun.rollBossGear(room), x, y - DROP_SPACING));
  }
  return drops;
}

// The one drop a cleared combat room gives, centered on (x, y): 25% gear, 45% health potion,
// 30% gold. Returns the ItemDrop, or null for a room that is not a combat room or was already
// cleared.
function rollClearReward(room, lootRun, x, y) {
  if (room.role !== "normal" || lootRun.clearedRoomIds.has(room.id)) {
    return null;
  }
  lootRun.clearedRoomIds.add(room.id);
  const left = x - ITEM_DROP_SIZE / 2;
  const top = y - ITEM_DROP_SIZE / 2;
  const roll = lootRun.rng();
  if (roll < CLEAR_GEAR_CHANCE) {
    return new ItemDrop(left, top, lootRun.rollGear(room, "chest"));
  }
  if (roll < CLEAR_GEAR_CHANCE + CLEAR_POTION_CHANCE) {
    return new ItemDrop(left, top, makePotion());
  }
  const gold = randInt(lootRun.rng, 10, 25) + lootRun.depthOf(room) * 5;
  return new ItemDrop(left, top, new Gold(), gold);
}

// Where the clear reward lands: room.lastKillPos when the room tracks it, else the last kill
// the caller saw, else the room's middle. A point outside the room (a stale kill) is ignored.
function clearRewardPoint(room, lastKill) {
  const middle = { x: room.x + room.width / 2, y: room.y + room.height / 2 };
  const point = room.lastKillPos || lastKill;
  if (!point) {
    return middle;
  }
  const inside = point.x >= room.x && point.x <= room.x + room.width
    && point.y >= room.y && point.y <= room.y + room.height;
  if (!inside) {
    return middle;
  }
  return point;
}
