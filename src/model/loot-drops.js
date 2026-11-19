// What enemies and cleared rooms drop. Model code: no p5 drawing calls.
// Load after loot-run.js. An enemy type's lootTable (see enemy-types.js) names a row of
// LOOT_TABLES. Enemies without a lootTable, the weak ones, drop nothing.
//
// Enemies never drop gear by chance. Gear comes from the slots in loot-slots.js, so the tables
// only hold gold and potions.
//
// Row fields:
//   goldChance    0 to 1, the chance of a gold drop
//   gold          [min, max] gold in it
//   potionChance  0 to 1, the chance of a health potion
//   bossGear      true: the dead enemy also drops the boss slot's weapon (and the bonus piece)

const LOOT_TABLES = Object.freeze({
  elite: { goldChance: 0.5, gold: [4, 10], potionChance: 0.1, bossGear: false },
  boss: { goldChance: 1, gold: [30, 60], potionChance: 0.5, bossGear: true }
});

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

// The gear a combat room drops when it is cleared (empty if it has no slot): ItemDrops in the
// middle of the room.
function rollClearDrops(room, lootRun) {
  const weapon = lootRun.rollClearGear(room);
  if (weapon === null) {
    return [];
  }
  return weaponDropRow(
    [weapon],
    room.x + room.width / 2 - ITEM_DROP_SIZE / 2,
    room.y + room.height / 2 - ITEM_DROP_SIZE / 2
  );
}
