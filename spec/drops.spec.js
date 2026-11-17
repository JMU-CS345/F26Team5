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

  const BOSS_ROOM = { id: 2, role: "boss" };
  const DUNGEON = {
    rooms: [
      { id: 0, role: "start" },
      { id: 1, role: "normal" },
      BOSS_ROOM
    ]
  };

  function runWithSlots(seed) {
    const run = new LootRun(seed, []);
    run.assign(DUNGEON);
    return run;
  }

  it("always drops a rare-or-better weapon and gold from a boss", function () {
    for (let seed = 1; seed <= 200; seed++) {
      const drops = rollEnemyDrops(enemyOf("Demon"), runWithSlots(seed), BOSS_ROOM);
      const weapon = drops.find((d) => d.item instanceof Weapon);
      expect(weapon).toBeDefined();
      expect(isRareOrBetter(weapon.item.rarity)).toBe(true);
      expect(drops.some((d) => d.item instanceof Gold)).toBe(true);
    }
  });

  it("drops the boss weapon only once", function () {
    const run = runWithSlots(3);
    const first = rollEnemyDrops(enemyOf("Demon"), run, BOSS_ROOM);
    const second = rollEnemyDrops(enemyOf("Demon"), run, BOSS_ROOM);
    expect(first.some((d) => d.item instanceof Weapon)).toBe(true);
    expect(second.some((d) => d.item instanceof Weapon)).toBe(false);
  });

  it("never drops a weapon from elites, only gold and potions some of the time", function () {
    let gold = 0;
    let potions = 0;
    const run = runWithSlots(4);
    for (let i = 0; i < 1000; i++) {
      for (const drop of rollEnemyDrops(enemyOf("Zombie"), run, { id: 1, role: "normal" })) {
        expect(drop.item instanceof Weapon).toBe(false);
        if (drop.item instanceof Gold) {
          gold++;
        }
        if (drop.item instanceof Consumable) {
          potions++;
        }
      }
    }
    expect(gold).toBeGreaterThan(350);
    expect(gold).toBeLessThan(650);
    expect(potions).toBeGreaterThan(40);
    expect(potions).toBeLessThan(200);
  });

  it("places the drops where the enemy died", function () {
    const drops = rollEnemyDrops(enemyOf("Demon"), runWithSlots(1), BOSS_ROOM);
    for (const drop of drops) {
      expect(Math.abs(drop.x - 116)).toBeLessThan(40);
      expect(Math.abs(drop.y - 116)).toBeLessThan(40);
    }
  });

  it("is repeatable for the same seed", function () {
    const a = rollEnemyDrops(enemyOf("Demon"), runWithSlots(12), BOSS_ROOM);
    const b = rollEnemyDrops(enemyOf("Demon"), runWithSlots(12), BOSS_ROOM);
    const weaponA = a.find((d) => d.item instanceof Weapon);
    const weaponB = b.find((d) => d.item instanceof Weapon);
    expect(weaponA.item.name).toBe(weaponB.item.name);
    expect(a.length).toBe(b.length);
  });
});
