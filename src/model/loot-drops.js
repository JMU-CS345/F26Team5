// What enemies drop when they die. Model code: no p5 drawing calls.
// Load after loot-run.js. An enemy type's lootTable (see enemy-types.js) names a row of
// LOOT_TABLES. Enemies without a lootTable, the weak ones, drop nothing.
//
// Row fields:
//   source   "elite" or "boss": the rarity source handed to generateWeapon (a boss never
//            drops below rare)
//   chance   0 to 1, the chance of a weapon (a boss always drops one)
//   gold     [min, max] gold dropped with it

const LOOT_TABLES = Object.freeze({
  elite: { source: "elite", chance: 0.3, gold: [4, 10] },
  boss: { source: "boss", chance: 1, gold: [30, 60] }
});

// The table an enemy type uses, or null when it drops nothing.
function lootTableFor(enemyType) {
  if (enemyType.lootTable === undefined) {
    return null;
  }
  return LOOT_TABLES[enemyType.lootTable] || null;
}

// Rolls the drops of a dead enemy: a list of ItemDrops centered where it died (empty when it
// drops nothing). The weapon's rarity follows the table's source and the room's depth.
function rollEnemyDrops(enemy, lootRun, room) {
  const table = lootTableFor(enemy.type);
  if (table === null) {
    return [];
  }
  const drops = [];
  const center = enemy.getCenter();
  const x = center.x - ITEM_DROP_SIZE / 2;
  const y = center.y - ITEM_DROP_SIZE / 2;
  const hasWeapon = table.chance >= 1 || lootRun.rng() < table.chance;
  if (hasWeapon) {
    const weapon = generateWeapon(lootRun.rng, {
      depth: lootRun.depthOf(room),
      source: table.source
    });
    drops.push(new ItemDrop(x - ITEM_DROP_SIZE, y, weapon));
    drops.push(new ItemDrop(x + ITEM_DROP_SIZE, y, new Gold(),
      randInt(lootRun.rng, table.gold[0], table.gold[1])));
  }
  return drops;
}
