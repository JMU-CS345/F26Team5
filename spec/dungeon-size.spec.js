// The generator's default size and reachability.
describe("dungeon size and reachability", function () {
  const SEEDS = [];
  for (let s = 1; s <= 60; s++) {
    SEEDS.push(s);
  }

  // 9 to 11 rooms with the start and boss, plus the treasure room.
  it("builds 10 to 12 rooms when no count is given", function () {
    for (const seed of SEEDS) {
      const count = generateDungeon({ seed: seed }).rooms.length;
      expect(count).toBeGreaterThanOrEqual(10);
      expect(count).toBeLessThanOrEqual(12);
    }
  });

  it("uses all of 10, 11 and 12 across seeds", function () {
    const counts = new Set(SEEDS.map((seed) => generateDungeon({ seed: seed }).rooms.length));
    expect(counts.has(10)).toBe(true);
    expect(counts.has(11)).toBe(true);
    expect(counts.has(12)).toBe(true);
  });

  it("has exactly one treasure room, a dead end with a chest and no enemies", function () {
    for (const seed of SEEDS) {
      const d = generateDungeon({ seed: seed });
      const vaults = d.rooms.filter((r) => r.role === "treasure");
      expect(vaults.length).toBe(1);
      expect(vaults[0].exits.length).toBe(1);
      expect(vaults[0].chests.length).toBe(1);
      vaults[0].spawnEnemies();
      expect(vaults[0].enemies.length).toBe(0);
    }
  });

  it("does not seal the treasure room", function () {
    const d = generateDungeon({ seed: 4 });
    const vault = d.rooms.find((r) => r.role === "treasure");
    vault.onEnter();
    enterRoomFlow(d, vault);
    expect(vault.exits.flatMap((x) => x.tiles).every((t) => vault.getTile(t.col, t.row) === TILE.DOOR_OPEN))
      .toBe(true);
  });

  it("fits every room inside the 40x22 tiles the camera shows", function () {
    for (const seed of SEEDS) {
      for (const r of generateDungeon({ seed: seed }).rooms) {
        expect(r.cols).toBeLessThanOrEqual(40);
        expect(r.rows).toBeLessThanOrEqual(22);
      }
    }
  });

  it("gives the same size for the same seed", function () {
    const a = generateDungeon({ seed: 9 }).rooms.length;
    expect(generateDungeon({ seed: 9 }).rooms.length).toBe(a);
  });

  it("still honours an explicit room count (plus the treasure room)", function () {
    expect(generateDungeon({ seed: 3, roomCount: 10 }).rooms.length).toBe(11);
  });

  it("makes every room reachable from the start room through its doors", function () {
    for (const seed of SEEDS) {
      const d = generateDungeon({ seed: seed });
      expect(doorDistances(d.rooms, 0).every((n) => n >= 0)).toBe(true);
    }
  });

  it("has exactly one start and one boss room", function () {
    for (const seed of SEEDS) {
      const d = generateDungeon({ seed: seed });
      expect(d.rooms.filter((r) => r.role === "start").length).toBe(1);
      expect(d.rooms.filter((r) => r.role === "boss").length).toBe(1);
    }
  });
});
