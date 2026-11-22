describe("Armor stats on the player", function () {
  let player;
  const room = new NormalRoom(0, 0, 160, 160);

  beforeEach(function () {
    player = new Player(50, 50, "Fire");
  });

  function wear(armor) {
    player.inventory.add(armor);
    player.inventory.equip(armor);
  }

  function hurtOnce(roll) {
    player.blockRng = () => roll;
    player.iFrames = 0;
    return player.takeDamage(1);
  }

  it("has no block and no bonus hearts without armor", function () {
    expect(player.getBlockChance()).toBe(0);
    expect(player.getBonusHearts()).toBe(0);
    expect(hurtOnce(0)).toBe(true);
    expect(player.health).toBe(player.maxHealth - 1);
  });

  it("adds helmet and leg block together", function () {
    wear(new Helmet({ id: "h", name: "H", block: 9 }));
    wear(new LegArmor({ id: "l", name: "L", block: 7 }));
    expect(player.getBlockChance()).toBe(16);
  });

  it("caps block at ARMOR_BLOCK_CAP", function () {
    wear(new Helmet({ id: "h", name: "H", block: 30 }));
    wear(new LegArmor({ id: "l", name: "L", block: 30 }));
    expect(player.getBlockChance()).toBe(ARMOR_BLOCK_CAP);
    expect(ARMOR_BLOCK_CAP).toBe(40);
  });

  it("blocks when the roll is under the chance and hurts when it is not", function () {
    wear(new Helmet({ id: "h", name: "H", block: 20 }));
    const start = player.health;
    hurtOnce(0.19);
    expect(player.health).toBe(start);
    expect(player.blockCount).toBe(1);
    hurtOnce(0.2);
    expect(player.health).toBe(start - 1);
    expect(player.blockCount).toBe(1);
  });

  it("gives i-frames on a block", function () {
    wear(new Helmet({ id: "h", name: "H", block: 20 }));
    hurtOnce(0);
    expect(player.iFrames).toBe(HIT_IFRAMES);
    expect(player.takeDamage(1)).toBe(false);
  });

  it("blocks about the right share of hits with a seeded roll", function () {
    wear(new Helmet({ id: "h", name: "H", block: 15 }));
    wear(new LegArmor({ id: "l", name: "L", block: 10 }));
    player.blockRng = createRng(7);
    for (let i = 0; i < 2000; i++) {
      player.iFrames = 0;
      player.takeDamage(0.001);
    }
    expect(player.blockCount).toBeGreaterThan(400);
    expect(player.blockCount).toBeLessThan(600);
  });

  it("a hit that is not blocked does its full damage", function () {
    wear(new ChestArmor({ id: "c", name: "C", hearts: 3 }));
    player.syncArmorHearts();
    const start = player.health;
    player.takeDamage(0.25);
    expect(player.health).toBe(start - 0.25);
  });

  it("re-equipping chest armor does not heal a hurt player", function () {
    const chest = new ChestArmor({ id: "c", name: "C", hearts: 2 });
    wear(chest);
    player.syncArmorHearts();
    player.health = 1;
    player.inventory.unequip("body");
    player.syncArmorHearts();
    player.inventory.equip(chest);
    player.syncArmorHearts();
    expect(player.health).toBe(1);
  });

  it("adds hearts and full health when chest armor goes on", function () {
    const start = player.maxHealth;
    wear(new ChestArmor({ id: "c", name: "C", hearts: 2 }));
    player.update(room);
    expect(player.maxHealth).toBe(start + 2);
    expect(player.health).toBe(start + 2);
  });

  it("leaves a hurt player's health alone when hearts are added", function () {
    player.takeDamage(2);
    const hurt = player.health;
    wear(new ChestArmor({ id: "c", name: "C", hearts: 1 }));
    player.update(room);
    expect(player.health).toBe(hurt);
  });

  it("clamps health when the chest armor comes off", function () {
    const start = player.maxHealth;
    wear(new ChestArmor({ id: "c", name: "C", hearts: 3 }));
    player.update(room);
    player.inventory.unequip("body");
    player.update(room);
    expect(player.maxHealth).toBe(start);
    expect(player.health).toBe(start);
  });

  it("swapping chest armor changes hearts by the difference", function () {
    const start = player.maxHealth;
    const robe = new ChestArmor({ id: "r", name: "R", hearts: 1 });
    const plate = new ChestArmor({ id: "p", name: "P", hearts: 3 });
    wear(robe);
    player.update(room);
    wear(plate);
    player.update(room);
    expect(player.maxHealth).toBe(start + 3);
    expect(player.health).toBe(start + 3);
  });

  it("does not revive a dead player when hearts are added", function () {
    player.health = 0;
    wear(new ChestArmor({ id: "c", name: "C", hearts: 2 }));
    player.update(room);
    expect(player.isDead()).toBe(true);
  });
});

describe("generateArmor", function () {
  it("is repeatable for the same seed", function () {
    const a = generateArmor(createRng(3), { depth: 2 });
    const b = generateArmor(createRng(3), { depth: 2 });
    expect(a.constructor).toBe(b.constructor);
    expect(a.name).toBe(b.name);
    expect(a.rarity).toBe(b.rarity);
  });

  it("uses the rarity tables for every slot", function () {
    const head = [4, 6, 9, 12, 15];
    const body = [1, 1, 2, 2, 3];
    const legs = [3, 5, 7, 10, 12];
    RARITY_IDS.forEach((rarity, i) => {
      const rng = createRng(i + 1);
      expect(generateArmor(rng, { rarity: rarity, slot: "helmet" }).block).toBe(head[i]);
      expect(generateArmor(rng, { rarity: rarity, slot: "chest" }).hearts).toBe(body[i]);
      expect(generateArmor(rng, { rarity: rarity, slot: "legs" }).block).toBe(legs[i]);
    });
  });

  it("only gives block to helmets and legs and hearts to chests", function () {
    const rng = createRng(11);
    for (let i = 0; i < 100; i++) {
      const armor = generateArmor(rng);
      if (armor instanceof ChestArmor) {
        expect(armor.hearts).toBeGreaterThan(0);
        expect(armor.block).toBe(0);
      } else {
        expect(armor.block).toBeGreaterThan(0);
        expect(armor.hearts).toBe(0);
      }
    }
  });

  it("rolls all three slots and respects minRarity and source", function () {
    const rng = createRng(5);
    const kinds = new Set();
    for (let i = 0; i < 60; i++) {
      kinds.add(generateArmor(rng).constructor.name);
    }
    expect(kinds.size).toBe(3);
    for (let i = 0; i < 40; i++) {
      expect(isRareOrBetter(generateArmor(rng, { source: "boss" }).rarity)).toBe(true);
      expect(isRareOrBetter(generateArmor(rng, { minRarity: "rare" }).rarity)).toBe(true);
    }
  });

  it("has a name, a value and a bag size", function () {
    const armor = generateArmor(createRng(2), { rarity: "epic" });
    expect(armor.value).toBe(120);
    expect(armor.name).not.toBe("");
    expect(BagGrid.itemSize(armor).w).toBeGreaterThan(0);
  });
});

describe("armor drops", function () {
  it("make about 40 percent of room and chest gear", function () {
    const run = new LootRun(9, []);
    let armor = 0;
    for (let i = 0; i < 1000; i++) {
      if (run.rollGearPiece({ id: 1, role: "normal" }, "chest") instanceof Armor) {
        armor++;
      }
    }
    expect(armor).toBeGreaterThan(340);
    expect(armor).toBeLessThan(460);
  });

  it("can give armor from a cleared room and from a chest", function () {
    let fromRoom = false;
    let fromChest = false;
    for (let seed = 1; seed <= 200; seed++) {
      const drop = rollClearReward({ id: 1, role: "normal" }, new LootRun(seed, []), 0, 0);
      if (drop.item instanceof Armor) {
        fromRoom = true;
      }
      if (new LootRun(seed, []).rollChestLoot({ id: 1 }).weapon instanceof Armor) {
        fromChest = true;
      }
    }
    expect(fromRoom).toBe(true);
    expect(fromChest).toBe(true);
  });

  it("keeps bad-luck protection for armor", function () {
    const run = new LootRun(4, []);
    run.chestsWithoutRare = BAD_LUCK_LIMIT;
    expect(isRareOrBetter(run.rollArmor({ id: 1 }, "chest").rarity)).toBe(true);
    expect(run.chestsWithoutRare).toBe(0);
  });

  it("boss gear stays a weapon", function () {
    const run = new LootRun(4, []);
    expect(run.rollBossGear({ id: 1 })[0] instanceof Weapon).toBe(true);
  });
});

describe("game feel block text", function () {
  it("floats Block when damage numbers are on", function () {
    const feel = new GameFeel({ damageNumbers: true, screenShake: false });
    feel.onBlock(10, 20);
    expect(feel.numbers[0].text).toBe("Block");
  });

  it("stays quiet when damage numbers are off", function () {
    const feel = new GameFeel({ damageNumbers: false, screenShake: false });
    feel.onBlock(10, 20);
    expect(feel.numbers.length).toBe(0);
  });
});
