describe("enemy drops", function () {
  const BOSS_ROOM = { id: 2, role: "boss" };

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

  it("has no elite table, so normal enemies drop nothing", function () {
    expect(LOOT_TABLES.elite).toBeUndefined();
    for (const name of ENEMY_TYPE_NAMES) {
      if (name === "Demon") {
        continue;
      }
      expect(lootTableFor(ENEMY_TYPES[name])).toBeNull();
      for (let seed = 1; seed <= 20; seed++) {
        expect(rollEnemyDrops(enemyOf(name), new LootRun(seed, []), { id: 1 })).toEqual([]);
      }
    }
  });

  it("uses the boss table for the Demon", function () {
    expect(ENEMY_TYPES.Demon.lootTable).toBe("boss");
  });

  it("always drops a rare-or-better weapon and gold from a boss", function () {
    for (let seed = 1; seed <= 200; seed++) {
      const drops = rollEnemyDrops(enemyOf("Demon"), new LootRun(seed, []), BOSS_ROOM);
      const weapon = drops.find((d) => d.item instanceof Weapon);
      expect(weapon).toBeDefined();
      expect(isRareOrBetter(weapon.item.rarity)).toBe(true);
      expect(drops.some((d) => d.item instanceof Gold)).toBe(true);
    }
  });

  it("places the boss drops where it died", function () {
    const drops = rollEnemyDrops(enemyOf("Demon"), new LootRun(1, []), BOSS_ROOM);
    for (const drop of drops) {
      expect(Math.abs(drop.x - 116)).toBeLessThan(40);
      expect(Math.abs(drop.y - 116)).toBeLessThan(40);
    }
  });

  it("is repeatable for the same seed", function () {
    const a = rollEnemyDrops(enemyOf("Demon"), new LootRun(12, []), BOSS_ROOM);
    const b = rollEnemyDrops(enemyOf("Demon"), new LootRun(12, []), BOSS_ROOM);
    const weaponA = a.find((d) => d.item instanceof Weapon);
    const weaponB = b.find((d) => d.item instanceof Weapon);
    expect(weaponA.item.name).toBe(weaponB.item.name);
    expect(a.length).toBe(b.length);
  });
});

describe("rollClearReward", function () {
  function rewardsFor(count, depth) {
    const run = new LootRun(7, [0, depth]);
    const drops = [];
    for (let i = 0; i < count; i++) {
      run.clearedRoomIds.clear(); // a fresh room each roll
      drops.push(rollClearReward({ id: 1, role: "normal" }, run, 200, 300));
    }
    return drops;
  }

  it("mixes 25% gear, 45% potion and 30% gold over 1000 rolls", function () {
    const drops = rewardsFor(1000, 0);
    const isGear = (d) => d.item instanceof Weapon || d.item instanceof Armor;
    const gear = drops.filter(isGear).length / 10;
    const potions = drops.filter((d) => d.item instanceof Consumable).length / 10;
    const gold = drops.filter((d) => d.item instanceof Gold).length / 10;
    expect(Math.abs(gear - 25)).toBeLessThan(5);
    expect(Math.abs(potions - 45)).toBeLessThan(5);
    expect(Math.abs(gold - 30)).toBeLessThan(5);
  });

  it("gives gold of 10 to 25 plus 5 per depth", function () {
    for (const drop of rewardsFor(300, 3).filter((d) => d.item instanceof Gold)) {
      expect(drop.quantity).toBeGreaterThanOrEqual(25);
      expect(drop.quantity).toBeLessThanOrEqual(40);
    }
  });

  it("centers the drop on the given point", function () {
    const drop = rewardsFor(1, 0)[0];
    expect(drop.x + ITEM_DROP_SIZE / 2).toBe(200);
    expect(drop.y + ITEM_DROP_SIZE / 2).toBe(300);
  });

  it("gives a room only one reward", function () {
    const run = new LootRun(3, []);
    const room = { id: 4, role: "normal" };
    expect(rollClearReward(room, run, 0, 0)).not.toBeNull();
    expect(rollClearReward(room, run, 0, 0)).toBeNull();
  });

  it("gives nothing for start, boss and treasure rooms", function () {
    const run = new LootRun(3, []);
    for (const role of ["start", "boss", "treasure"]) {
      expect(rollClearReward({ id: 9, role: role }, run, 0, 0)).toBeNull();
    }
  });

  it("is repeatable for the same seed", function () {
    const a = rollClearReward({ id: 1, role: "normal" }, new LootRun(5, []), 10, 10);
    const b = rollClearReward({ id: 1, role: "normal" }, new LootRun(5, []), 10, 10);
    expect(a.item.name).toBe(b.item.name);
    expect(a.quantity).toBe(b.quantity);
  });

  it("keeps bad-luck protection for gear rolls", function () {
    const run = new LootRun(1, []);
    run.chestsWithoutRare = BAD_LUCK_LIMIT;
    const weapon = run.rollGear({ id: 1, role: "normal" }, "chest");
    expect(isRareOrBetter(weapon.rarity)).toBe(true);
  });
});
