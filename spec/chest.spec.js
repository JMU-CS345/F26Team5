describe("chest", function () {
  function playerAt(x, y) {
    return new Player(x - PLAYER_LENGTH / 2, y - PLAYER_WIDTH / 2, "Fire", "Tall");
  }

  function smallTemplate(rows) {
    return parseRoomTemplate({ name: "t", role: "normal", rows: rows });
  }

  const CHEST_ROOM = [
    "################",
    "#..............#",
    "#.....C........#",
    "#..............#",
    "+..............#",
    "+..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "################"
  ];

  describe("template letter", function () {
    it("parses C as a floor tile plus a chest spot", function () {
      const parsed = smallTemplate(CHEST_ROOM);
      expect(parsed.chests).toEqual([{ col: 6, row: 2 }]);
      expect(parsed.grid[2][6]).toBe(TILE.FLOOR);
    });

    it("passes the template validator", function () {
      const problems = validateRoomTemplates([
        { name: "chest-room", role: "normal", rows: CHEST_ROOM }
      ], []);
      expect(problems).toEqual([]);
    });

    it("puts a chest in the middle of its tile in a TemplateRoom", function () {
      const room = new TemplateRoom(100, 50, smallTemplate(CHEST_ROOM));
      expect(room.chests.length).toBe(1);
      expect(room.chests[0].x).toBe(100 + 6.5 * TILE_SIZE);
      expect(room.chests[0].y).toBe(50 + 2.5 * TILE_SIZE);
      expect(room.chests[0].opened).toBe(false);
    });

    it("is only used by treasure rooms, a combat room clear drops a reward instead", function () {
      const withChests = ROOM_TEMPLATES.filter((t) => t.rows.some((r) => r.includes("C")));
      expect(withChests.length).toBeGreaterThan(0);
      expect(withChests.every((t) => t.role === "treasure")).toBe(true);
    });
  });

  describe("opening", function () {
    let room;
    let lootRun;

    beforeEach(function () {
      room = new TemplateRoom(0, 0, smallTemplate(CHEST_ROOM));
      room.id = 3;
      lootRun = new LootRun(5, []);
    });

    it("needs the player to be close", function () {
      const chest = room.chests[0];
      expect(chest.canOpen(playerAt(chest.x + 10, chest.y))).toBe(true);
      expect(chest.canOpen(playerAt(chest.x + 100, chest.y))).toBe(false);
      expect(tryOpenChest(playerAt(chest.x + 100, chest.y), room, lootRun)).toBe(false);
      expect(room.items.length).toBe(0);
    });

    it("drops a generated weapon with a rarity and some gold", function () {
      const chest = room.chests[0];
      expect(tryOpenChest(playerAt(chest.x, chest.y + 8), room, lootRun)).toBe(true);
      expect(chest.opened).toBe(true);
      expect(room.items.length).toBe(2);
      const weaponDrop = room.items.find((d) => d.item instanceof Weapon);
      const goldDrop = room.items.find((d) => d.item instanceof Gold);
      expect(RARITY_IDS).toContain(weaponDrop.item.rarity);
      expect(chest.rarity).toBe(weaponDrop.item.rarity);
      expect(goldDrop.quantity).toBeGreaterThanOrEqual(10);
    });

    it("cannot be opened twice", function () {
      const chest = room.chests[0];
      const player = playerAt(chest.x, chest.y + 8);
      expect(tryOpenChest(player, room, lootRun)).toBe(true);
      expect(tryOpenChest(player, room, lootRun)).toBe(false);
      expect(chest.open(lootRun, room)).toEqual([]);
      expect(room.items.length).toBe(2);
    });

    it("rolls the same loot for the same seed", function () {
      const other = new TemplateRoom(0, 0, smallTemplate(CHEST_ROOM));
      other.id = 3;
      const runA = new LootRun(77, []);
      const runB = new LootRun(77, []);
      const a = room.chests[0].open(runA, room);
      const b = other.chests[0].open(runB, other);
      expect(a[0].item.name).toBe(b[0].item.name);
      expect(a[0].item.damage).toBe(b[0].item.damage);
      expect(a[1].quantity).toBe(b[1].quantity);
    });

    it("gives more gold deeper in the dungeon", function () {
      room.id = 1;
      const deep = new LootRun(9, [0, 6]);
      const shallow = new LootRun(9, [0, 0]);
      const deepGold = deep.rollChestLoot(room).gold;
      const shallowGold = shallow.rollChestLoot(room).gold;
      expect(deepGold).toBeGreaterThan(shallowGold);
    });

    it("animates: lid and beam follow openFrames", function () {
      const chest = room.chests[0];
      expect(chest.lidProgress).toBe(0);
      expect(chest.beamStrength).toBe(0);
      chest.open(lootRun, room);
      for (let i = 0; i < CHEST_LID_FRAMES; i++) {
        chest.update();
      }
      expect(chest.lidProgress).toBe(1);
      expect(chest.beamStrength).toBeGreaterThan(0);
      for (let i = 0; i < CHEST_BEAM_FRAMES; i++) {
        chest.update();
      }
      expect(chest.beamStrength).toBe(0);
    });
  });
});
