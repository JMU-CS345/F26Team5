describe("rng", function () {
  it("gives the same numbers for the same seed", function () {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });

  it("gives numbers in [0, 1)", function () {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const n = rng();
      expect(n >= 0 && n < 1).toBe(true);
    }
  });

  it("shuffle keeps every item and does not change the input", function () {
    const items = [1, 2, 3, 4, 5];
    const out = shuffle(items, createRng(3));
    expect(items).toEqual([1, 2, 3, 4, 5]);
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("randInt stays inside the range and reaches both ends", function () {
    const rng = createRng(5);
    const seen = new Set();
    for (let i = 0; i < 500; i++) {
      const n = randInt(rng, 2, 5);
      expect(n >= 2 && n <= 5).toBe(true);
      seen.add(n);
    }
    expect(seen.size).toBe(4);
  });

  it("pick returns an item from the list and throws on an empty list", function () {
    const rng = createRng(9);
    expect(["a", "b", "c"]).toContain(pick(["a", "b", "c"], rng));
    expect(() => pick([], rng)).toThrowError(RangeError);
  });

  it("weightedPick follows the weights", function () {
    const rng = createRng(11);
    const entries = [{ id: "a", weight: 9 }, { id: "b", weight: 1 }, { id: "c", weight: 0 }];
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 5000; i++) {
      counts[weightedPick(entries, rng).id]++;
    }
    expect(counts.c).toBe(0);
    expect(counts.a).toBeGreaterThan(counts.b * 5);
  });

  it("weightedPick rejects a zero total", function () {
    expect(() => weightedPick([{ weight: 0 }], createRng(1))).toThrowError(RangeError);
  });
});
