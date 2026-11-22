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

const CLEAR_GEAR_CHANCE = 0.3;
const CLEAR_POTION_CHANCE = 0.35; // the rest of the rolls (35%) is a gold pile
const CLEAR_GOLD_BASE = [15, 30];
const CLEAR_GOLD_PER_TIER = 8;
const WAVE_GOLD_CHANCE = 0.15; // each wave after the first may drop a gold pile

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
    maxStackSize: 3,
    healthRestore: 2,
    description: "A small restorative potion."
  });
}

// Moves a drop onto the nearest floor so it never sits in a wall or over a pit. Falls back to
// (homeX, homeY), the death point, when no floor is within 3 tiles. A room without tiles is
// left alone.
function settleDrop(drop, room, homeX, homeY) {
  if (typeof room.collidesWithWall !== "function") {
    return;
  }
  const size = drop.size;
  const box = { x: drop.x, y: drop.y, w: size, h: size };
  if (!room.collidesWithWall(box) && !room.overlapsPit(box)) {
    return; // clear of walls and pits
  }
  const ts = room.tileSize;
  const col = Math.floor((drop.x + size / 2 - room.x) / ts);
  const row = Math.floor((drop.y + size / 2 - room.y) / ts);
  let best = null;
  let bestDist = Infinity;
  for (let r = row - 3; r <= row + 3; r++) {
    for (let c = col - 3; c <= col + 3; c++) {
      if (!room.canStandAt(c, r)) {
        continue;
      }
      // The spot in that tile closest to where the drop was.
      const x = constrainNumber(drop.x, room.x + c * ts, room.x + (c + 1) * ts - size);
      const y = constrainNumber(drop.y, room.y + r * ts, room.y + (r + 1) * ts - size);
      const dist = Math.hypot(x - drop.x, y - drop.y);
      if (dist < bestDist) {
        best = { x: x, y: y };
        bestDist = dist;
      }
    }
  }
  if (best === null) {
    best = { x: homeX, y: homeY };
  }
  drop.x = best.x;
  drop.y = best.y;
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
  for (const drop of drops) {
    settleDrop(drop, room, x, y);
  }
  return drops;
}

// The one drop a cleared combat room gives, centered on (x, y): 30% gear (40% of it armor),
// 35% health potion, 35% gold. tier is the dungeon number and defaults to the room's own.
// Returns the ItemDrop, or null for a room that is not a combat room or was already cleared.
function rollClearReward(room, lootRun, x, y, tier = roomTier(room)) {
  if (room.role !== "normal" || lootRun.clearedRoomIds.has(room.id)) {
    return null;
  }
  lootRun.clearedRoomIds.add(room.id);
  const left = x - ITEM_DROP_SIZE / 2;
  const top = y - ITEM_DROP_SIZE / 2;
  const roll = lootRun.rng();
  if (roll < CLEAR_GEAR_CHANCE) {
    return new ItemDrop(left, top, lootRun.rollGearPiece(room, "chest"));
  }
  if (roll < CLEAR_GEAR_CHANCE + CLEAR_POTION_CHANCE) {
    return new ItemDrop(left, top, makePotion());
  }
  return new ItemDrop(left, top, new Gold(), rollClearGold(lootRun, tier));
}

function rollClearGold(lootRun, tier) {
  return randInt(lootRun.rng, CLEAR_GOLD_BASE[0], CLEAR_GOLD_BASE[1]) + CLEAR_GOLD_PER_TIER * tier;
}

// Call once when a wave's last enemy dies. A wave after the first may drop one gold pile
// beside (x, y), and a wave rolls only once. Returns the ItemDrop or null.
function rollWaveGold(room, lootRun, x, y, tier = roomTier(room)) {
  if (room.role !== "normal" || room.waveNumber < 2 || room.goldRolledWave === room.waveNumber) {
    return null;
  }
  room.goldRolledWave = room.waveNumber;
  if (lootRun.rng() >= WAVE_GOLD_CHANCE) {
    return null;
  }
  const left = x - ITEM_DROP_SIZE / 2 - DROP_SPACING;
  const drop = new ItemDrop(left, y - ITEM_DROP_SIZE / 2, new Gold(), rollClearGold(lootRun, tier));
  settleDrop(drop, room, left, y - ITEM_DROP_SIZE / 2);
  return drop;
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
