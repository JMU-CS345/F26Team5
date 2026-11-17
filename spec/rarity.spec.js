describe("rarity", function () {
  function tally(options, rolls) {
    const rng = createRng(2024);
    const counts = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    for (let i = 0; i < rolls; i++) {
      counts[rollRarity(rng, options)]++;
    }
    return counts;
  }

  it("has the five tiers in order, each with a color", function () {
    expect(RARITY_IDS).toEqual(["common", "uncommon", "rare", "epic", "legendary"]);
    for (const r of RARITIES) {
      expect(r.color.length).toBe(3);
    }
  });

  it("gives 0, 1, 2, 3 affixes and 2 for legendary", function () {
    expect(RARITIES.map((r) => r.affixCount)).toEqual([0, 1, 2, 3, 2]);
  });

  it("makes high tiers likelier with depth and common rarer", function () {
    const shallow = rarityWeights(0, "chest");
    const deep = rarityWeights(8, "chest");
    expect(deep[0].weight).toBeLessThan(shallow[0].weight);
    expect(deep[2].weight).toBeGreaterThan(shallow[2].weight);
    expect(deep[4].weight).toBeGreaterThan(shallow[4].weight);
  });

  it("makes elites and bosses better than chests", function () {
    const chest = rarityWeights(2, "chest");
    const elite = rarityWeights(2, "elite");
    expect(elite[2].weight).toBeGreaterThan(chest[2].weight);
    expect(elite[0].weight).toBeLessThan(chest[0].weight);
  });

  it("never drops a boss below rare over 10000 rolls", function () {
    const counts = tally({ depth: 0, source: "boss" }, 10000);
    expect(counts.common).toBe(0);
    expect(counts.uncommon).toBe(0);
    expect(counts.rare).toBeGreaterThan(0);
  });

  it("has a sensible chest spread over 10000 rolls", function () {
    const counts = tally({ depth: 0, source: "chest" }, 10000);
    expect(counts.common).toBeGreaterThan(counts.uncommon);
    expect(counts.uncommon).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(counts.epic);
    expect(counts.epic).toBeGreaterThan(counts.legendary);
    expect(counts.legendary).toBeGreaterThan(0);
    expect(counts.legendary).toBeLessThan(150);
  });

  it("is repeatable for the same seed", function () {
    expect(tally({ depth: 3, source: "elite" }, 500))
      .toEqual(tally({ depth: 3, source: "elite" }, 500));
  });

  it("honors a raised floor", function () {
    const counts = tally({ source: "chest", minRarity: "epic" }, 2000);
    expect(counts.common + counts.uncommon + counts.rare).toBe(0);
  });

  it("rejects an unknown source", function () {
    expect(() => rollRarity(createRng(1), { source: "trap" })).toThrowError(RangeError);
  });

  it("reports rare or better", function () {
    expect(isRareOrBetter("uncommon")).toBe(false);
    expect(isRareOrBetter("rare")).toBe(true);
    expect(isRareOrBetter("legendary")).toBe(true);
  });
});
