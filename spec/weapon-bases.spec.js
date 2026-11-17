describe("weapon bases", function () {
  it("passes its own validator", function () {
    expect(validateWeaponBases()).toEqual([]);
  });

  it("has the five melee and five ranged bases", function () {
    const melee = WEAPON_BASES.filter((b) => b.kind === "melee").map((b) => b.name);
    const ranged = WEAPON_BASES.filter((b) => b.kind === "ranged").map((b) => b.name);
    expect(melee).toEqual(["Dagger", "Sword", "Spear", "Axe", "Hammer"]);
    expect(ranged).toEqual(["Wand", "Staff", "Tome", "Orb", "Scepter"]);
  });

  it("gives every base all of its stat ranges", function () {
    for (const base of WEAPON_BASES) {
      const names = base.kind === "melee" ? MELEE_STAT_NAMES : RANGED_STAT_NAMES;
      for (const name of names) {
        expect(base.stats[name]).toBeDefined();
        expect(base.stats[name].length).toBe(2);
      }
    }
  });

  it("keeps ranged damage and fire rate below melee", function () {
    const best = (kind, stat) => Math.max(
      ...WEAPON_BASES.filter((b) => b.kind === kind).map((b) => b.stats[stat][1])
    );
    expect(best("ranged", "damage")).toBeLessThan(best("melee", "damage"));
    const average = (kind, stat) => {
      const rows = WEAPON_BASES.filter((b) => b.kind === kind);
      let total = 0;
      for (const row of rows) {
        total += (row.stats[stat][0] + row.stats[stat][1]) / 2;
      }
      return total / rows.length;
    };
    expect(average("ranged", "damage")).toBeLessThan(average("melee", "damage"));
    expect(average("ranged", "fireRate")).toBeGreaterThan(average("melee", "swingFrames"));
  });

  it("looks a base up by id", function () {
    expect(getWeaponBase("spear").name).toBe("Spear");
    expect(getWeaponBase("nope")).toBeNull();
  });

  it("reports problems with a bad row", function () {
    const bad = WEAPON_BASES.slice();
    bad.push({ id: "dagger", name: "", kind: "melee", stats: { damage: [3, 1] } });
    const problems = validateWeaponBases(bad);
    expect(problems.some((p) => p.includes("dagger: the id is used"))).toBe(true);
    expect(problems.some((p) => p.includes("needs a name"))).toBe(true);
    expect(problems.some((p) => p.includes("stats.damage has min above max"))).toBe(true);
    expect(problems.some((p) => p.includes("stats.reach must be [min, max]"))).toBe(true);
  });
});
