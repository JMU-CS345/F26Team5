describe("affixes", function () {
  const meleeStats = () => ({
    damage: 2, reach: 30, swingFrames: 20, knockback: 4, arc: 100, element: null
  });
  const rangedStats = () => ({
    damage: 1, fireRate: 20, shotSpeed: 5, range: 200, projectileCount: 1, spread: 0,
    pierce: 0, element: null
  });

  it("passes its own validator and has the required affixes", function () {
    expect(validateAffixes()).toEqual([]);
    const prefixes = AFFIXES.filter((a) => a.kind === "prefix").map((a) => a.label);
    const suffixes = AFFIXES.filter((a) => a.kind === "suffix").map((a) => a.label);
    for (const label of ["Swift", "Heavy", "Keen", "Blazing", "Frozen", "Psychic", "Vampiric"]) {
      expect(prefixes).toContain(label);
    }
    for (const label of ["Reach", "the Volley", "Piercing", "Ricochet", "Splitting", "Echoes"]) {
      expect(suffixes).toContain(label);
    }
  });

  it("rolls the number of affixes the rarity asks for", function () {
    for (const kind of ["melee", "ranged"]) {
      for (let count = 0; count <= 3; count++) {
        for (let seed = 1; seed <= 60; seed++) {
          expect(rollAffixes(kind, count, createRng(seed)).length).toBe(count);
        }
      }
    }
  });

  it("never repeats an affix or mixes elements, and respects the limits", function () {
    for (const kind of ["melee", "ranged"]) {
      for (let seed = 1; seed <= 200; seed++) {
        const chosen = rollAffixes(kind, 3, createRng(seed));
        expect(new Set(chosen.map((a) => a.id)).size).toBe(chosen.length);
        expect(chosen.filter((a) => a.element).length).toBeLessThan(2);
        expect(chosen.filter((a) => a.kind === "prefix").length).toBeLessThan(3);
        expect(chosen.filter((a) => a.kind === "suffix").length).toBeLessThan(3);
        for (const a of chosen) {
          expect(a[kind]).toBeDefined();
        }
      }
    }
  });

  it("skips elemental prefixes when the weapon already has an element", function () {
    for (let seed = 1; seed <= 100; seed++) {
      const chosen = rollAffixes("melee", 3, createRng(seed), true);
      expect(chosen.some((a) => a.element)).toBe(false);
    }
  });

  it("builds names like Blazing Spear of Reach", function () {
    const blazing = getAffix("blazing");
    const reach = getAffix("reach");
    expect(buildWeaponName("Spear", [blazing, reach])).toBe("Blazing Spear of Reach");
    expect(buildWeaponName("Wand", [])).toBe("Wand");
    expect(buildWeaponName("Wand", [getAffix("swift"), getAffix("keen"), getAffix("volley")]))
      .toBe("Swift Keen Wand of the Volley");
    expect(buildWeaponName("Staff", [getAffix("piercing"), getAffix("echoes")]))
      .toBe("Staff of Piercing and Echoes");
  });

  it("applies stat changes", function () {
    const melee = meleeStats();
    applyAffixes(melee, "melee", [getAffix("blazing"), getAffix("reach"), getAffix("swift")]);
    expect(melee.element).toBe("Fire");
    expect(melee.damage).toBeCloseTo(2.2, 5);
    expect(melee.reach).toBeCloseTo(39, 5);
    expect(melee.swingFrames).toBeCloseTo(16, 5);

    const ranged = rangedStats();
    applyAffixes(ranged, "ranged", [getAffix("volley"), getAffix("piercing")]);
    expect(ranged.projectileCount).toBe(2);
    expect(ranged.spread).toBeGreaterThanOrEqual(10);
    expect(ranged.pierce).toBe(2);
  });

  it("returns hooks only for affixes that have them", function () {
    const none = applyAffixes(rangedStats(), "ranged", [getAffix("keen")]);
    expect(none.onHit).toBeUndefined();
    expect(none.onFire).toBeUndefined();
    const some = applyAffixes(rangedStats(), "ranged", [getAffix("vampiric"), getAffix("echoes")]);
    expect(typeof some.onHit).toBe("function");
    expect(typeof some.onFire).toBe("function");
  });

  it("vampiric heals on every third hit only", function () {
    const hook = getAffix("vampiric").melee.onHit;
    expect(hook({ count: 1 })).toEqual([]);
    expect(hook({ count: 2 })).toEqual([]);
    expect(hook({ count: 3 })).toEqual([{ type: "heal", amount: 1 }]);
    expect(hook({ count: 4 })).toEqual([]);
  });

  it("splitting makes two shards, ricochet one shot toward a neighbor", function () {
    const ctx = {
      weapon: { shotSpeed: 5, element: "Fire" },
      source: { x: 0, y: 0 },
      angle: 0,
      damage: 2,
      count: 1,
      target: { x: 100, y: 100, health: 1, maxHealth: 3 },
      enemies: [{ x: 160, y: 100 }, { x: 900, y: 900 }]
    };
    const shards = getAffix("splitting").ranged.onHit(ctx);
    expect(shards.length).toBe(2);
    expect(shards[0].damage).toBe(1);
    const bounce = getAffix("ricochet").ranged.onHit(ctx);
    expect(bounce.length).toBe(1);
    expect(bounce[0].angle).toBeCloseTo(0, 5);
    ctx.enemies = [{ x: 900, y: 900 }];
    expect(getAffix("ricochet").ranged.onHit(ctx)).toEqual([]);
  });

  it("echoes repeat a shot once, delayed", function () {
    const effects = getAffix("echoes").ranged.onFire({
      weapon: {}, source: { x: 5, y: 6 }, angle: 1, damage: 4, count: 1
    });
    expect(effects.length).toBe(1);
    expect(effects[0].damage).toBe(2);
    expect(effects[0].delayFrames).toBeGreaterThan(0);
  });
});
