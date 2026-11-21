// Fixes from the round 5 review: drop placement, homing, stack drops, debug clear, bag sort.

describe("review fixes", function () {
  const right = new p5.Vector(1, 0);
  const potion = () => new Consumable({
    id: "health-potion", name: "Health Potion", maxStackSize: 5, healthRestore: 2, value: 5
  });

  function stackSelection(inventory, entry) {
    const slots = inventoryUiLayout(inventory).bagSlots;
    return inventorySelectionFromSlot(slots[entry.row * INVENTORY_BAG_COLUMNS + entry.col]);
  }

  describe("boss drops", function () {
    it("land on the floor when the boss dies by a wall", function () {
      const room = new NormalRoom(0, 0, 640, 400);
      room.id = 2;
      room.role = "boss";
      room.setTile(13, 1, TILE.INTERIOR_WALL);
      room.setTile(13, 2, TILE.INTERIOR_WALL);
      const boss = createEnemy("Demon", 184, 8); // centre 1.5 tiles from the north wall
      const center = boss.getCenter();
      for (let seed = 1; seed <= 20; seed++) {
        const drops = rollEnemyDrops(boss, new LootRun(seed, []), room);
        expect(drops.length).toBeGreaterThan(1);
        for (const drop of drops) {
          const box = { x: drop.x, y: drop.y, w: drop.size, h: drop.size };
          expect(room.collidesWithWall(box)).toBe(false);
          expect(Math.hypot(drop.x - center.x, drop.y - center.y)).toBeLessThan(60);
        }
      }
    });

    it("fall back to the death point when no floor is near", function () {
      const room = new NormalRoom(0, 0, 640, 400);
      for (let row = 0; row < room.rows; row++) {
        for (let col = 0; col < room.cols; col++) {
          room.setTile(col, row, TILE.INTERIOR_WALL);
        }
      }
      const drop = new ItemDrop(100, 100, new Gold(), 5);
      settleDrop(drop, room, 20, 30);
      expect(drop.x).toBe(20);
      expect(drop.y).toBe(30);
    });
  });

  describe("steerShot", function () {
    let room;
    let target;

    beforeEach(function () {
      room = new NormalRoom(0, 0, 640, 400);
      target = new Enemy(100, 40, "Demon");
      room.enemies.push(target);
    });

    it("stops homing on a target a piercing shot already hit", function () {
      const shot = new Projectile(100, 200, right, 1, 5, { pierce: 2 });
      shot.target = target;
      shot.hitTargets.push(target);
      steerShot(shot);
      expect(shot.vel.heading()).toBeCloseTo(0, 5);
    });

    it("still homes on a target it has not hit", function () {
      const shot = new Projectile(100, 200, right, 1, 5, { pierce: 2 });
      shot.target = target;
      steerShot(shot);
      expect(shot.vel.heading()).not.toBeCloseTo(0, 5);
    });

    it("keeps a zero velocity instead of turning it into NaN", function () {
      const shot = new Projectile(100, 200, right, 1, 5);
      shot.vel.set(0, 0);
      shot.target = target;
      steerShot(shot);
      expect(shot.vel.x).toBe(0);
      expect(shot.vel.y).toBe(0);
    });
  });

  describe("homing pellets", function () {
    let player;
    let target;

    function equip(extra) {
      const wand = new ProjectileWeapon({ id: "wand", name: "Wand", damage: 2, ...extra });
      player.inventory.add(wand);
      player.inventory.equip(wand);
    }

    beforeEach(function () {
      player = new Player(100, 200, "Fire");
      target = new Enemy(300, 100, "Demon");
      player.aimTarget = target;
    });

    it("only a single shot homes", function () {
      equip({});
      expect(player.fireAll(right)[0].target).toBe(target);
    });

    it("a spread volley keeps its spread", function () {
      equip({ projectileCount: 3, spread: 40 });
      for (const shot of player.fireAll(right)) {
        expect(shot.target).toBeNull();
      }
    });
  });

  describe("dropping one stack", function () {
    let player;
    let room;
    let second;

    beforeEach(function () {
      room = new NormalRoom(0, 0, 640, 400);
      player = new Player(50, 50, "Fire", "Tall");
      player.inventory.add(potion(), 8); // a stack of 5 and a stack of 3
      second = player.inventory.grid.entries().find((e) => e.quantity === 3);
    });

    it("dropBagItem drops only the selected stack", function () {
      const selection = stackSelection(player.inventory, second);
      expect(dropBagItem(player, room, selection)).toBe(true);
      expect(room.items[0].quantity).toBe(3);
      expect(player.inventory.quantityOf("health-potion")).toBe(5);
    });

    it("dropInventoryCursorItem drops the stack under the cursor", function () {
      const cursor = new InventoryCursor();
      cursor.section = "bag";
      cursor.index = second.row * INVENTORY_BAG_COLUMNS + second.col;
      const drop = dropInventoryCursorItem(player.inventory, player, cursor);
      expect(drop.quantity).toBe(3);
      const left = player.inventory.grid.entries().map((e) => e.quantity);
      expect(left).toEqual([5]); // the full stack, not two part stacks
    });
  });

  describe("debug room clear", function () {
    it("lets go of every lock-on to the removed enemies", function () {
      const room = new NormalRoom(0, 0, 640, 400);
      const player = new Player(100, 200, "Fire");
      const enemy = new Enemy(300, 100, "Demon");
      room.enemies.push(enemy);
      player.aimTarget = enemy;
      const shot = new Projectile(100, 200, right);
      shot.target = enemy;
      clearRoomDebug(room, player, [shot]);
      expect(room.enemies).toEqual([]);
      expect(player.aimTarget).toBeNull();
      expect(shot.target).toBeNull();
    });
  });

  describe("markRoomCleared", function () {
    it("counts a room once even when it is cleared again", function () {
      const room = new NormalRoom(0, 0, 640, 400);
      const stats = new RunStats();
      markRoomCleared(room, 1, stats);
      room.cleared = false; // what the debug enemy spawn does
      markRoomCleared(room, 1, stats);
      expect(stats.roomsCleared).toBe(1);
    });

    it("does not count a room nobody fought in", function () {
      const room = new NormalRoom(0, 0, 640, 400);
      const stats = new RunStats();
      markRoomCleared(room, 0, stats);
      expect(stats.roomsCleared).toBe(0);
      expect(room.state).toBe("cleared");
    });
  });

  describe("sortBag", function () {
    it("merges partial potion stacks up to the stack size", function () {
      const inventory = new PlayerInventory();
      const p = potion();
      inventory.grid.place(p, 0, 0, 5);
      inventory.grid.place(p, 1, 0, 2);
      inventory.grid.place(p, 2, 0, 1);
      expect(inventory.sortBag()).toBe(true);
      const counts = inventory.grid.entries().map((e) => e.quantity).sort();
      expect(counts).toEqual([3, 5]);
    });
  });
});
