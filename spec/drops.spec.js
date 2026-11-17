describe("enemy drops", function () {
  const room = { id: 0 };

  function enemyOf(typeName) {
    return createEnemy(typeName, 100, 100);
  }

  it("only names loot tables that exist", function () {
    for (const name of ENEMY_TYPE_NAMES) {
      const table = ENEMY_TYPES[name].lootTable;
      if (table !== undefined) {
        expect(LOOT_TABLES[table]).toBeDefined();
      }
    }
  });

  it("uses the boss table for the Demon and gives weak enemies nothing", function () {
    expect(ENEMY_TYPES.Demon.lootTable).toBe("boss");
    for (const name of ["Jelly", "Skeleton", "Bat", "Eyeball"]) {
      expect(lootTableFor(ENEMY_TYPES[name])).toBeNull();
      const drops = rollEnemyDrops(enemyOf(name), new LootRun(1, []), room);
      expect(drops).toEqual([]);
    }
  });

  it("always drops a rare-or-better weapon and gold from a boss", function () {
    for (let seed = 1; seed <= 200; seed++) {
      const drops = rollEnemyDrops(enemyOf("Demon"), new LootRun(seed, []), room);
      const weapon = drops.find((d) => d.item instanceof Weapon);
      expect(weapon).toBeDefined();
      expect(isRareOrBetter(weapon.item.rarity)).toBe(true);
      expect(drops.some((d) => d.item instanceof Gold)).toBe(true);
    }
  });

  it("drops from elites only some of the time", function () {
    let weapons = 0;
    const run = new LootRun(4, []);
    for (let i = 0; i < 1000; i++) {
      const drops = rollEnemyDrops(enemyOf("Zombie"), run, room);
      if (drops.length > 0) {
        weapons++;
      }
    }
    expect(weapons).toBeGreaterThan(200);
    expect(weapons).toBeLessThan(400);
  });

  it("places the drops where the enemy died", function () {
    const drops = rollEnemyDrops(enemyOf("Demon"), new LootRun(1, []), room);
    for (const drop of drops) {
      expect(Math.abs(drop.x - 116)).toBeLessThan(30);
      expect(Math.abs(drop.y - 116)).toBeLessThan(30);
    }
  });

  it("is repeatable for the same seed", function () {
    const a = rollEnemyDrops(enemyOf("Demon"), new LootRun(12, []), room);
    const b = rollEnemyDrops(enemyOf("Demon"), new LootRun(12, []), room);
    expect(a[0].item.name).toBe(b[0].item.name);
    expect(a[1].quantity).toBe(b[1].quantity);
  });
});
