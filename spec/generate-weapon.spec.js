describe("generateWeapon", function () {
  // Fields that make two weapons the same weapon (instanceId and hooks differ by object).
  function summary(weapon) {
    const copy = { ...weapon };
    delete copy.instanceId;
    delete copy.onHit;
    delete copy.onFire;
    copy.hasOnHit = typeof weapon.onHit === "function";
    copy.hasOnFire = typeof weapon.onFire === "function";
    return copy;
  }

  it("gives the same weapon for the same seed, depth and source", function () {
    for (let seed = 1; seed <= 50; seed++) {
      const a = generateWeapon(createRng(seed), { depth: 3, source: "elite" });
      const b = generateWeapon(createRng(seed), { depth: 3, source: "elite" });
      expect(summary(a)).toEqual(summary(b));
    }
  });

  it("gives different weapons for different seeds", function () {
    const names = new Set();
    for (let seed = 1; seed <= 100; seed++) {
      names.add(generateWeapon(createRng(seed)).name);
    }
    expect(names.size).toBeGreaterThan(30);
  });

  it("returns a real MeleeWeapon or ProjectileWeapon matching its base", function () {
    const seen = { melee: 0, ranged: 0 };
    for (let seed = 1; seed <= 200; seed++) {
      const weapon = generateWeapon(createRng(seed));
      const base = getWeaponBase(weapon.baseId);
      if (base.kind === "melee") {
        expect(weapon instanceof MeleeWeapon).toBe(true);
        seen.melee++;
      } else {
        expect(weapon instanceof ProjectileWeapon).toBe(true);
        seen.ranged++;
      }
      expect(RARITY_IDS).toContain(weapon.rarity);
    }
    expect(seen.melee).toBeGreaterThan(40);
    expect(seen.ranged).toBeGreaterThan(40);
  });

  it("keeps common weapons inside their base ranges", function () {
    for (let seed = 1; seed <= 300; seed++) {
      const weapon = generateWeapon(createRng(seed), { rarity: "common" });
      const base = getWeaponBase(weapon.baseId);
      expect(weapon.affixes).toEqual([]);
      for (const name of Object.keys(base.stats)) {
        const range = base.stats[name];
        // Rounding can land half a step outside.
        expect(weapon[name]).not.toBeLessThan(range[0] - 0.06);
        expect(weapon[name]).not.toBeGreaterThan(range[1] + 0.06);
      }
    }
  });

  it("keeps every weapon within a sane band of its base", function () {
    for (let seed = 1; seed <= 500; seed++) {
      const weapon = generateWeapon(createRng(seed), { depth: 5 });
      const base = getWeaponBase(weapon.baseId);
      for (const name of Object.keys(base.stats)) {
        if (name === "projectileCount" || name === "pierce" || name === "spread") {
          continue;
        }
        expect(weapon[name]).not.toBeLessThan(base.stats[name][0] * 0.5);
        expect(weapon[name]).not.toBeGreaterThan(base.stats[name][1] * 2);
      }
    }
  });

  it("gives as many affixes as the rarity says and builds the name from them", function () {
    for (const rarity of ["common", "uncommon", "rare", "epic"]) {
      const weapon = generateWeapon(createRng(7), { rarity: rarity });
      expect(weapon.affixes.length).toBe(getRarity(rarity).affixCount);
      const base = getWeaponBase(weapon.baseId);
      expect(weapon.name).toBe(buildWeaponName(base.name, weapon.affixes.map(getAffix)));
    }
  });

  it("sets the element from an elemental prefix or from the options", function () {
    let found = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const weapon = generateWeapon(createRng(seed), { rarity: "epic" });
      const prefix = weapon.affixes.map(getAffix).find((a) => a.element);
      if (prefix) {
        expect(weapon.element).toBe(prefix.element);
        found++;
      } else {
        expect(weapon.element).toBeNull();
      }
    }
    expect(found).toBeGreaterThan(0);
    const fire = generateWeapon(createRng(3), { rarity: "epic", element: "Fire" });
    expect(fire.element).toBe("Fire");
    expect(fire.affixes.map(getAffix).filter((a) => a.element).length).toBe(0);
  });

  it("can ask for a kind", function () {
    for (let seed = 1; seed <= 40; seed++) {
      expect(generateWeapon(createRng(seed), { kind: "ranged" }) instanceof ProjectileWeapon)
        .toBe(true);
      expect(generateWeapon(createRng(seed), { kind: "melee" }) instanceof MeleeWeapon)
        .toBe(true);
    }
  });

  it("spreads rarity sensibly over 10000 chest rolls and respects the boss floor", function () {
    const rng = createRng(99);
    const counts = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    for (let i = 0; i < 10000; i++) {
      counts[generateWeapon(rng, { depth: 0, source: "chest" }).rarity]++;
    }
    expect(counts.common).toBeGreaterThan(counts.uncommon);
    expect(counts.uncommon).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(counts.epic);
    const bossRng = createRng(5);
    for (let i = 0; i < 500; i++) {
      expect(isRareOrBetter(generateWeapon(bossRng, { source: "boss" }).rarity)).toBe(true);
    }
  });

  it("lets affix hooks reach the weapon", function () {
    let withHooks = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const weapon = generateWeapon(createRng(seed), { rarity: "epic" });
      const ids = weapon.affixes;
      const wantsHit = ids.some((id) => ["vampiric", "ricochet", "splitting"].includes(id));
      if (wantsHit) {
        expect(typeof weapon.onHit).toBe("function");
        withHooks++;
      }
    }
    expect(withHooks).toBeGreaterThan(0);
  });
});
