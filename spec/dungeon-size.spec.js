// The generator's default size and reachability.
describe("dungeon size and reachability", function () {
  const SEEDS = [];
  for (let s = 1; s <= 60; s++) {
    SEEDS.push(s);
  }

  it("builds 6 to 8 rooms when no count is given", function () {
    for (const seed of SEEDS) {
      const count = generateDungeon({ seed: seed }).rooms.length;
      expect(count).toBeGreaterThanOrEqual(6);
      expect(count).toBeLessThanOrEqual(8);
    }
  });

  it("uses all of 6, 7 and 8 across seeds", function () {
    const counts = new Set(SEEDS.map((seed) => generateDungeon({ seed: seed }).rooms.length));
    expect(counts.has(6)).toBe(true);
    expect(counts.has(7)).toBe(true);
    expect(counts.has(8)).toBe(true);
  });

  it("gives the same size for the same seed", function () {
    const a = generateDungeon({ seed: 9 }).rooms.length;
    expect(generateDungeon({ seed: 9 }).rooms.length).toBe(a);
  });

  it("still honours an explicit room count", function () {
    expect(generateDungeon({ seed: 3, roomCount: 10 }).rooms.length).toBe(10);
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
