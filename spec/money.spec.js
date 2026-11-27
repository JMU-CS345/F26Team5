// Specs for money: the five kinds, what monsters pay, where it lands and how it is picked up.
describe("MONEY_TYPES", function () {
  it("has the five kinds, with the values and sizes from the design", function () {
    const summary = MONEY_IDS.map((id) => [id, MONEY_TYPES[id].value, MONEY_TYPES[id].w, MONEY_TYPES[id].h]);
    expect(summary).toEqual([
      ["greenGem", 250, 16, 16],
      ["redGem", 100, 16, 16],
      ["blueGem", 50, 16, 16],
      ["ingot", 25, 16, 8],
      ["coin", 10, 8, 8]
    ]);
  });

  it("has a picture row for every kind, the same size as the kind", function () {
    for (const id of MONEY_IDS) {
      expect(MONEY_ART[id].w).toBe(MONEY_TYPES[id].w);
      expect(MONEY_ART[id].h).toBe(MONEY_TYPES[id].h);
    }
  });

  it("no longer has the old single gold coin drop size", function () {
    expect(new MoneyDrop(0, 0, "coin").getBounds()).toEqual({ x: 0, y: 0, w: 8, h: 8 });
    expect(new MoneyDrop(0, 0, "ingot").getBounds()).toEqual({ x: 0, y: 0, w: 16, h: 8 });
    expect(new MoneyDrop(0, 0, "greenGem").getBounds()).toEqual({ x: 0, y: 0, w: 16, h: 16 });
  });
});

describe("makeChange", function () {
  const total = (ids) => ids.reduce((sum, id) => sum + MONEY_TYPES[id].value, 0);

  it("uses the fewest pieces, biggest first", function () {
    expect(makeChange(0)).toEqual([]);
    expect(makeChange(10)).toEqual(["coin"]);
    expect(makeChange(30)).toEqual(["coin", "coin", "coin"]);
    expect(makeChange(60)).toEqual(["blueGem", "coin"]);
    expect(makeChange(75)).toEqual(["blueGem", "ingot"]);
    expect(makeChange(250)).toEqual(["greenGem"]);
    expect(makeChange(350)).toEqual(["greenGem", "redGem"]);
  });

  it("always adds up exactly for every multiple of 10 a monster can pay", function () {
    for (let amount = 10; amount <= 1000; amount += 10) {
      expect(total(makeChange(amount))).toBe(amount);
    }
  });

  it("refuses an amount that cannot be made, or that is not a whole number", function () {
    expect(() => makeChange(5)).toThrow();
    expect(() => makeChange(15)).toThrow();
    expect(() => makeChange(-10)).toThrow();
    expect(() => makeChange(12.5)).toThrow();
  });
});

describe("what monsters pay", function () {
  const middle = () => 0.5; // no extra or missing gold: exactly the base pay
  const pay = (typeName, rng = middle) => rollGoldDrop(new Enemy(0, 0, typeName), rng);

  it("scores an enemy type by health, contact damage, attack and shield", function () {
    expect(enemyPower(ENEMY_TYPES.Jelly)).toBe(5);
    expect(enemyPower(ENEMY_TYPES.Bat)).toBe(4);
    expect(enemyPower(ENEMY_TYPES.Skeleton)).toBe(6);
    expect(enemyPower(ENEMY_TYPES.PeeperJr)).toBe(9); // three shots at a time
    expect(enemyPower(ENEMY_TYPES.Blockette)).toBe(8); // the shield counts
    expect(enemyPower(ENEMY_TYPES.DemonKnight)).toBe(47); // its best phase is a spread of three
  });

  it("pays a weak monster in coins and a strong one in gems", function () {
    expect(pay("Bat")).toBe(20);
    expect(makeChange(pay("Bat"))).toEqual(["coin", "coin"]);
    expect(pay("Jelly")).toBe(30);
    expect(pay("PeeperJr")).toBeGreaterThanOrEqual(50);
    expect(makeChange(pay("PeeperJr"))).toContain("blueGem");
  });

  it("pays a stronger monster more than a weaker one", function () {
    expect(pay("Bat")).toBeLessThan(pay("Ghoul"));
    expect(pay("Skeleton")).toBeLessThan(pay("PeeperJr"));
    expect(pay("ShadowWizardPurple")).toBeLessThan(pay("ShadowWizardGreen"));
    for (const name of ENEMY_TYPE_NAMES) {
      if (name !== "DemonKnight") {
        expect(pay(name)).toBeLessThan(pay("DemonKnight"));
      }
    }
  });

  it("pays the boss three times its power, enough for green gems", function () {
    expect(pay("DemonKnight")).toBe(710);
    expect(makeChange(pay("DemonKnight"))).toContain("greenGem");
  });

  it("pays more for an enemy a room spawned with extra health", function () {
    const tough = new Enemy(0, 0, "Jelly");
    tough.maxHealth *= 3;
    expect(rollGoldDrop(tough, middle)).toBeGreaterThan(pay("Jelly"));
  });

  it("varies by a quarter either way, always in tens and never under 10", function () {
    expect(pay("Ghoul", () => 0)).toBeLessThan(pay("Ghoul", () => 1));
    for (const name of ENEMY_TYPE_NAMES) {
      const base = enemyPower(ENEMY_TYPES[name]) * GOLD_PER_POWER * (name === "DemonKnight" ? 3 : 1);
      for (const roll of [0, 0.25, 0.5, 0.75, 1]) {
        const gold = pay(name, () => roll);
        expect(gold % 10).toBe(0);
        expect(gold).toBeGreaterThanOrEqual(10);
        expect(gold).toBeGreaterThanOrEqual(base * 0.75 - 5);
        expect(gold).toBeLessThanOrEqual(base * 1.25 + 5);
      }
    }
  });
});

// Runs a drop's fall to the end, like frames of the game. Returns how many frames it took.
function settle(drop, room) {
  let frames = 0;
  while (!drop.landed && frames < 500) {
    drop.update(room);
    frames++;
  }
  return frames;
}

describe("dropMoneyFor", function () {
  let room;
  beforeEach(function () {
    room = new NormalRoom(0, 0, 160, 160);
  });

  it("drops gold worth what the monster pays, as money drops", function () {
    const enemy = new Enemy(64, 64, "Ghoul");
    const drops = dropMoneyFor(enemy, room, () => 0.5);
    expect(drops.length).toBeGreaterThan(0);
    expect(drops.every((drop) => drop instanceof MoneyDrop)).toBe(true);
    expect(drops.reduce((sum, drop) => sum + drop.quantity, 0)).toBe(40);
  });

  it("starts every piece in the air on the enemy's middle", function () {
    const enemy = new Enemy(64, 64, "Ghoul");
    for (const drop of dropMoneyFor(enemy, room, () => 0.5)) {
      expect(drop.landed).toBe(false);
      expect(drop.z).toBeGreaterThan(0);
      expect(drop.x + drop.money.w / 2).toBe(enemy.getCenter().x);
      expect(drop.y + drop.money.h / 2).toBe(enemy.getCenter().y);
    }
  });

  it("tosses a single piece straight up, so it lands where the enemy died", function () {
    const enemy = new Enemy(64, 64, "PeeperJr"); // 45 pays 50, one blue gem
    const [gem] = dropMoneyFor(enemy, room, () => 0.5);
    const start = { x: gem.x, y: gem.y };
    expect(gem.money.id).toBe("blueGem");
    settle(gem, room);
    expect(gem.landed).toBe(true);
    expect({ x: gem.x, y: gem.y }).toEqual(start);
  });

  it("tosses a pile outward, so the pieces land apart from each other and from the start", function () {
    const enemy = new Enemy(64, 64, "Ghoul");
    const drops = dropMoneyFor(enemy, room, () => 0.5);
    const start = { x: drops[0].x, y: drops[0].y };
    drops.forEach((drop) => settle(drop, room));
    expect(new Set(drops.map((drop) => drop.x + "," + drop.y)).size).toBe(drops.length);
    expect(drops.some((drop) => Math.hypot(drop.x - start.x, drop.y - start.y) > 8)).toBe(true);
  });

  it("never carries money into a wall, in the air or after landing", function () {
    const enemy = new Enemy(16, 16, "Ghoul"); // in the corner, against the wall ring
    for (const drop of dropMoneyFor(enemy, room, () => 0.5)) {
      for (let frame = 0; frame < 100; frame++) {
        drop.update(room);
        const b = drop.getBounds();
        expect(room.isWallAt(b.x, b.y)).toBe(false);
        expect(room.isWallAt(b.x + b.w - 1, b.y + b.h - 1)).toBe(false);
      }
      expect(drop.landed).toBe(true);
    }
  });

  it("leaves nothing when the enemy fell into a pit", function () {
    const enemy = new Enemy(64, 64, "Jelly");
    enemy.fell = true;
    expect(dropMoneyFor(enemy, room)).toEqual([]);
  });
});

describe("MoneyDrop falling", function () {
  let room;
  beforeEach(function () {
    room = new NormalRoom(0, 0, 160, 160);
  });

  it("arcs up and comes down within about half a second, then stays put", function () {
    const drop = new MoneyDrop(80, 80, "coin", { vx: 1, vy: 0 });
    let highest = 0;
    let frames = 0;
    while (!drop.landed && frames < 500) {
      drop.update(room);
      highest = Math.max(highest, drop.z);
      frames++;
    }
    expect(highest).toBeGreaterThan(MONEY_START_HEIGHT);
    expect(frames).toBeGreaterThan(10);
    expect(frames).toBeLessThan(40);
    expect(drop.z).toBe(0);
    const spot = { x: drop.x, y: drop.y };
    for (let i = 0; i < 30; i++) {
      drop.update(room);
    }
    expect({ x: drop.x, y: drop.y }).toEqual(spot);
  });

  it("does not float: money on the floor never bobs, in the air or landed", function () {
    const placed = new MoneyDrop(80, 80, "ingot");
    const thrown = new MoneyDrop(80, 80, "ingot", { vx: 0.5, vy: 0.5 });
    for (let i = 0; i < 60; i++) {
      placed.update(room);
      thrown.update(room);
      expect(placed.bobOffset).toBe(0);
      expect(thrown.bobOffset).toBe(0);
    }
    expect(placed.z).toBe(0);
    expect(placed.landed).toBe(true);
  });

  it("stops against a wall and drops straight down", function () {
    const drop = new MoneyDrop(20, 80, "coin", { vx: -3, vy: 0 }); // the wall ring is at x < 16
    settle(drop, room);
    expect(drop.x).toBeGreaterThanOrEqual(16);
  });

  it("cannot be picked up until it has landed", function () {
    const player = new Player(50, 50);
    const drop = new MoneyDrop(52, 52, "coin", { vx: 0, vy: 0 });
    room.items = [drop];
    expect(drop.collectible).toBe(false);
    expect(pickupItemDrops(player, room)).toEqual([]);
    expect(player.inventory.gold).toBe(0);
    settle(drop, room);
    expect(pickupItemDrops(player, room).length).toBe(1);
    expect(player.inventory.gold).toBe(10);
  });
});

describe("picking money up", function () {
  it("adds the money's value to the player's gold, one kind at a time", function () {
    const player = new Player(50, 50);
    const room = new NormalRoom(0, 0, 160, 160);
    room.items = MONEY_IDS.map((id) => new MoneyDrop(52, 52, id));

    const collected = pickupItemDrops(player, room);

    expect(collected.length).toBe(5);
    expect(room.items).toEqual([]);
    expect(player.inventory.gold).toBe(10 + 25 + 50 + 100 + 250);
  });

  it("does not collect money the player is not touching", function () {
    const player = new Player(50, 50);
    const room = new NormalRoom(0, 0, 160, 160);
    room.items = [new MoneyDrop(120, 120, "coin")];
    expect(pickupItemDrops(player, room)).toEqual([]);
    expect(player.inventory.gold).toBe(0);
  });

  it("rejects an unknown kind of money", function () {
    expect(() => new MoneyDrop(0, 0, "penny")).toThrow();
  });
});

describe("Run and money", function () {
  const none = () => new p5.Vector(0, 0);
  let run;

  beforeEach(function () {
    const dungeon = generateDungeon({ seed: 3, roomCount: 8, screenX: 320, screenY: 160 });
    run = new Run(dungeon, "Fire", PLAYER_MODEL_NAMES[0], makeAppearance());
  });

  it("drops money where a killed enemy stood, and the player can pick it up", function () {
    const room = run.room;
    room.items = [];
    const center = run.player.getCenter();
    const enemy = new Enemy(center.x + 40, center.y, "Jelly");
    room.enemies = [enemy];
    enemy.takeDamage(enemy.maxHealth);

    const dead = run.update({ move: none(), fire: none() });

    expect(dead).toEqual([enemy]);
    expect(room.items.every((drop) => !drop.landed)).toBe(true); // still falling out
    for (let i = 0; i < 60; i++) {
      run.update({ move: none(), fire: none() }); // the run falls them with the room
    }
    expect(room.items.every((drop) => drop.landed)).toBe(true);
    expect(room.items.length).toBeGreaterThan(0);
    expect(room.items.every((drop) => drop instanceof MoneyDrop)).toBe(true);
    const worth = room.items.reduce((sum, drop) => sum + drop.quantity, 0);
    expect(worth).toBeGreaterThanOrEqual(20);
    run.player.pos.set(-1000, -1000); // out of the way while it counts
    for (const drop of room.items) {
      run.player.pos.set(drop.x + drop.money.w / 2 - run.player.length / 2,
        drop.y + drop.money.h / 2 - run.player.width / 2);
      pickupItemDrops(run.player, room);
    }
    expect(run.player.inventory.gold).toBe(worth);
  });

  it("drops nothing for an enemy that is still alive", function () {
    const room = run.room;
    room.items = [];
    room.enemies = [new Enemy(200, 100, "Jelly")];
    run.update({ move: none(), fire: none() });
    expect(room.items).toEqual([]);
  });
});

describe("money art", function () {
  it("plays a row's frames in order, looping, one every few game frames", function () {
    const art = { sequence: [3, 1, 2], ticks: 10 };
    expect([0, 9, 10, 19, 20, 29, 30].map((age) => moneyFrameIndex(art, age))).toEqual([3, 3, 1, 1, 2, 2, 3]);
  });

  it("keeps every kind animating, with no frame held still", function () {
    for (const id of MONEY_IDS) {
      const art = MONEY_ART[id];
      const shown = new Set();
      for (let age = 0; age < art.sequence.length * art.ticks; age++) {
        shown.add(moneyFrameIndex(art, age));
      }
      expect(shown.size).toBeGreaterThan(1);
    }
  });

  it("only plays frames that are in the row", function () {
    for (const id of MONEY_IDS) {
      const art = MONEY_ART[id];
      expect(Math.max(...art.sequence)).toBeLessThan(art.frames);
    }
  });
});

describe("enemy loot tables", function () {
  it("accepts a known pool and rejects an unknown one", function () {
    expect(validateEnemyTypes()).toEqual([]);
    expect(validateEnemyTypes({ ...ENEMY_TYPES, Jelly: { ...ENEMY_TYPES.Jelly, lootTable: "treasure" } }))
      .toContain("Jelly: lootTable treasure is not in LOOT_TABLES");
  });
});
