describe("loot slots", function () {
  function fakeDungeon(roles) {
    return {
      rooms: roles.map((role, id) => ({
        id: id, role: role, x: 0, y: 0, width: 640, height: 400
      }))
    };
  }

  const PLAIN = ["start", "normal", "normal", "normal", "normal", "normal", "normal", "normal",
    "normal", "boss"];
  const WITH_TREASURE = ["start", "normal", "normal", "normal", "treasure", "normal", "normal",
    "normal", "normal", "boss"];

  function count(slots) {
    let total = 0;
    for (const kinds of Object.values(slots)) {
      total += kinds.length;
    }
    return total;
  }

  describe("gear budget", function () {
    it("is always 5 to 8 pieces, whatever the seed", function () {
      const seen = new Set();
      for (let seed = 1; seed <= 500; seed++) {
        const run = new LootRun(seed, []);
        expect(run.gearTarget).toBeGreaterThanOrEqual(5);
        expect(run.gearTarget).toBeLessThanOrEqual(8);
        seen.add(run.gearTarget);
      }
      expect(seen.size).toBe(4);
    });

    it("is the same for the same seed", function () {
      expect(new LootRun(12, []).gearTarget).toBe(new LootRun(12, []).gearTarget);
    });
  });

  describe("assignLootSlots", function () {
    it("fills the whole budget on a dungeon without a treasure room", function () {
      for (let target = 5; target <= 8; target++) {
        const slots = assignLootSlots(fakeDungeon(PLAIN), createRng(target), target);
        expect(count(slots)).toBe(target);
      }
    });

    it("puts one boss piece in the boss room", function () {
      const slots = assignLootSlots(fakeDungeon(PLAIN), createRng(1), 6);
      expect(slots[9]).toEqual(["boss"]);
    });

    it("puts two pieces in a treasure room as soon as one exists", function () {
      for (let target = 5; target <= 8; target++) {
        const slots = assignLootSlots(fakeDungeon(WITH_TREASURE), createRng(2), target);
        expect(slots[4]).toEqual(["chest", "chest"]);
        expect(slots[9]).toEqual(["boss"]);
        expect(count(slots)).toBe(target);
      }
    });

    it("never gives the start room a slot", function () {
      for (let seed = 1; seed <= 200; seed++) {
        const slots = assignLootSlots(fakeDungeon(WITH_TREASURE), createRng(seed));
        expect(slots[0]).toBeUndefined();
      }
    });

    it("gives a combat room at most one piece", function () {
      for (let seed = 1; seed <= 200; seed++) {
        const slots = assignLootSlots(fakeDungeon(PLAIN), createRng(seed));
        for (let id = 1; id <= 8; id++) {
          if (slots[id] !== undefined) {
            expect(slots[id]).toEqual(["clear"]);
          }
        }
      }
    });

    it("works with no boss and no combat rooms", function () {
      expect(assignLootSlots(fakeDungeon(["start"]), createRng(1), 6)).toEqual({});
      expect(count(assignLootSlots(fakeDungeon(["start", "boss"]), createRng(1), 6))).toBe(1);
    });

    it("is repeatable for the same seed", function () {
      const a = assignLootSlots(fakeDungeon(PLAIN), createRng(8));
      const b = assignLootSlots(fakeDungeon(PLAIN), createRng(8));
      expect(a).toEqual(b);
    });

    it("works on a real generated dungeon", function () {
      for (let seed = 1; seed <= 20; seed++) {
        const dungeon = generateDungeon({ roomCount: 10, seed: seed });
        const run = new LootRun(seed, []);
        run.assign(dungeon);
        expect(count(run.slots)).toBe(run.gearTarget);
        expect(run.slots[dungeon.start.id]).toBeUndefined();
        expect(run.slots[dungeon.boss.id]).toEqual(["boss"]);
      }
    });
  });

  describe("dropping gear", function () {
    function runFor(roles, seed) {
      const dungeon = fakeDungeon(roles);
      const run = new LootRun(seed, []);
      run.assign(dungeon);
      return { run: run, rooms: dungeon.rooms };
    }

    it("drops a piece when a room with a clear slot is cleared, once", function () {
      const { run, rooms } = runFor(PLAIN, 3);
      const withSlot = rooms.find((r) => run.hasSlot(r, "clear"));
      const drops = rollClearDrops(withSlot, run);
      expect(drops.length).toBe(1);
      expect(drops[0].item instanceof Weapon).toBe(true);
      expect(rollClearDrops(withSlot, run)).toEqual([]);
      expect(run.gearDropped).toBe(1);
    });

    it("drops nothing from a room without a slot", function () {
      const { run, rooms } = runFor(PLAIN, 3);
      const without = rooms.find((r) => r.role === "normal" && !run.hasSlot(r, "clear"));
      if (without !== undefined) {
        expect(rollClearDrops(without, run)).toEqual([]);
      }
      expect(rollClearDrops(rooms[0], run)).toEqual([]);
    });

    it("never drops more than the budget", function () {
      for (let seed = 1; seed <= 50; seed++) {
        const { run, rooms } = runFor(WITH_TREASURE, seed);
        for (const room of rooms) {
          rollClearDrops(room, run);
          run.rollChestLoot(room);
          run.rollChestLoot(room);
          run.rollChestLoot(room);
        }
        run.rollBossGear(rooms[9]);
        expect(run.gearDropped).toBeLessThanOrEqual(run.gearTarget);
        expect(run.gearDropped).toBe(run.gearTarget);
      }
    });

    it("drops no more gear once the budget is spent", function () {
      const { run, rooms } = runFor(PLAIN, 5);
      run.gearDropped = run.gearTarget;
      for (const room of rooms) {
        expect(rollClearDrops(room, run)).toEqual([]);
      }
      expect(run.takeSlot(rooms[9], "boss")).toBe(false);
    });

    it("keeps the rarity floor for the boss piece", function () {
      for (let seed = 1; seed <= 100; seed++) {
        const { run, rooms } = runFor(PLAIN, seed);
        const weapons = run.rollBossGear(rooms[9]);
        expect(weapons.length).toBe(1);
        expect(isRareOrBetter(weapons[0].rarity)).toBe(true);
      }
    });
  });

  describe("clear bonus", function () {
    function clearRooms(run, rooms, howMany) {
      const combat = rooms.filter((r) => r.role === "normal");
      for (let i = 0; i < howMany; i++) {
        rollClearDrops(combat[i], run);
      }
    }

    it("adds a bonus piece at 75% of combat rooms cleared", function () {
      const dungeon = fakeDungeon(PLAIN);
      const run = new LootRun(7, []);
      run.assign(dungeon);
      clearRooms(run, dungeon.rooms, 6);
      expect(run.clearRatio()).toBe(0.75);
      const weapons = run.rollBossGear(dungeon.rooms[9]);
      expect(weapons.length).toBe(2);
      expect(weapons.every((w) => isRareOrBetter(w.rarity))).toBe(true);
    });

    it("gives no bonus below 75%", function () {
      const dungeon = fakeDungeon(PLAIN);
      const run = new LootRun(7, []);
      run.assign(dungeon);
      clearRooms(run, dungeon.rooms, 5);
      expect(run.rollBossGear(dungeon.rooms[9]).length).toBe(1);
    });

    it("does not count a room twice", function () {
      const dungeon = fakeDungeon(PLAIN);
      const run = new LootRun(7, []);
      run.assign(dungeon);
      rollClearDrops(dungeon.rooms[1], run);
      rollClearDrops(dungeon.rooms[1], run);
      expect(run.clearedRoomIds.size).toBe(1);
    });

    it("gives the bonus once and keeps it outside the budget", function () {
      const dungeon = fakeDungeon(PLAIN);
      const run = new LootRun(7, []);
      run.assign(dungeon);
      clearRooms(run, dungeon.rooms, 8);
      const before = run.gearDropped;
      run.rollBossGear(dungeon.rooms[9]);
      expect(run.gearDropped).toBe(before + 1);
      expect(run.rollBossGear(dungeon.rooms[9])).toEqual([]);
    });

    it("rolls better rarity the more rooms were cleared", function () {
      function rareShare(cleared) {
        let rares = 0;
        for (let seed = 1; seed <= 400; seed++) {
          const run = new LootRun(seed, []);
          for (let id = 0; id < cleared; id++) {
            run.clearedRoomIds.add(id);
          }
          if (isRareOrBetter(run.rollGear({ id: 99 }, "chest").rarity)) {
            rares++;
          }
        }
        return rares;
      }
      expect(rareShare(8)).toBeGreaterThan(rareShare(0));
    });
  });
});
