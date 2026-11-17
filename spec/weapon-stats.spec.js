describe("weapon stat fields", function () {
  it("keeps the melee stats it is given", function () {
    const sword = new MeleeWeapon({
      id: "sword", name: "Sword", damage: 5, reach: 40, swingFrames: 20, knockback: 20, arc: 150,
      element: "Fire", rarity: "rare", affixes: ["sharp"]
    });
    expect(sword.reach).toBe(40);
    expect(sword.arc).toBe(150);
    expect(sword.element).toBe("Fire");
    expect(sword.rarity).toBe("rare");
    expect(sword.affixes).toEqual(["sharp"]);
  });

  it("keeps the ranged stats it is given", function () {
    const bow = new ProjectileWeapon({
      id: "bow", name: "Bow", fireRate: 10, shotSpeed: 8, range: 300, projectileCount: 3,
      spread: 30, pierce: 2
    });
    expect(bow.fireRate).toBe(10);
    expect(bow.projectileCount).toBe(3);
    expect(bow.pierce).toBe(2);
  });

  it("defaults rarity and affixes, and leaves hooks empty", function () {
    const stick = new MeleeWeapon({ id: "stick", name: "Stick" });
    expect(stick.rarity).toBe("common");
    expect(stick.affixes).toEqual([]);
    expect(stick.onHit).toBeNull();
    expect(stick.onFire).toBeNull();
  });

  it("rejects a negative stat", function () {
    expect(() => new MeleeWeapon({ id: "x", name: "X", reach: -1 })).toThrowError(TypeError);
  });

  it("uses the starter dagger when no melee weapon is equipped", function () {
    const stats = getMeleeStats(null);
    expect(stats.damage).toBe(MELEE_DEFAULTS.damage);
    expect(stats.reach).toBe(MELEE_DEFAULTS.reach);
    expect(stats.weapon).toBeNull();
  });

  it("fills missing melee stats with defaults", function () {
    const stats = getMeleeStats(new MeleeWeapon({ id: "a", name: "A", damage: 7, reach: 50 }));
    expect(stats.damage).toBe(7);
    expect(stats.reach).toBe(50);
    expect(stats.swingFrames).toBe(MELEE_DEFAULTS.swingFrames);
  });

  it("uses the default shot when no projectile weapon is equipped", function () {
    const stats = getRangedStats(null);
    expect(stats.damage).toBe(RANGED_DEFAULTS.damage);
    expect(stats.fireRate).toBe(RANGED_DEFAULTS.fireRate);
  });

  it("makes ranged defaults weaker and slower than melee", function () {
    expect(RANGED_DEFAULTS.damage).toBeLessThan(MELEE_DEFAULTS.damage);
    expect(RANGED_DEFAULTS.fireRate).toBeGreaterThan(MELEE_DEFAULTS.swingFrames);
  });

  it("gives a zero damage weapon the default damage", function () {
    const stats = getRangedStats(new ProjectileWeapon({ id: "w", name: "W" }));
    expect(stats.damage).toBe(RANGED_DEFAULTS.damage);
  });
});
