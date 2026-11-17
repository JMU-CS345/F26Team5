describe("bad-luck protection", function () {
  it("starts at zero with no guarantee", function () {
    const run = new LootRun(1, []);
    expect(run.chestsWithoutRare).toBe(0);
    expect(run.nextChestMinRarity()).toBeNull();
  });

  it("counts gear without a rare or better", function () {
    const run = new LootRun(1, []);
    run.recordChestRarity("common");
    run.recordChestRarity("uncommon");
    expect(run.chestsWithoutRare).toBe(2);
    expect(run.nextChestMinRarity()).toBeNull();
  });

  it("guarantees rare or better after the limit, then resets", function () {
    const run = new LootRun(1, []);
    for (let i = 0; i < BAD_LUCK_LIMIT; i++) {
      run.recordChestRarity("common");
    }
    expect(BAD_LUCK_LIMIT).toBe(4);
    expect(run.nextChestMinRarity()).toBe("rare");
    const weapon = run.rollGear({ id: 0 }, "chest");
    expect(isRareOrBetter(weapon.rarity)).toBe(true);
    expect(run.chestsWithoutRare).toBe(0);
    expect(run.nextChestMinRarity()).toBeNull();
  });

  it("resets when a natural rare shows up", function () {
    const run = new LootRun(1, []);
    run.recordChestRarity("common");
    run.recordChestRarity("common");
    run.recordChestRarity("epic");
    expect(run.chestsWithoutRare).toBe(0);
  });

  it("never lets more than the limit of gear pieces in a row miss rare", function () {
    for (let seed = 1; seed <= 300; seed++) {
      const run = new LootRun(seed, []);
      let misses = 0;
      let worst = 0;
      for (let i = 0; i < 20; i++) {
        if (isRareOrBetter(run.rollGear({ id: 0 }, "chest").rarity)) {
          misses = 0;
        } else {
          misses++;
          worst = Math.max(worst, misses);
        }
      }
      expect(worst).toBeLessThanOrEqual(BAD_LUCK_LIMIT);
    }
  });

  it("is repeatable for the same seed", function () {
    const a = new LootRun(33, []);
    const b = new LootRun(33, []);
    for (let i = 0; i < 10; i++) {
      const first = a.rollGear({ id: 0 }, "chest").name;
      expect(first).toBe(b.rollGear({ id: 0 }, "chest").name);
    }
  });

  it("a fresh run starts with a fresh counter", function () {
    const old = new LootRun(1, []);
    for (let i = 0; i < 3; i++) {
      old.recordChestRarity("common");
    }
    expect(old.chestsWithoutRare).toBe(3);
    expect(new LootRun(1, []).chestsWithoutRare).toBe(0);
  });
});
