describe("Weapon combat stats", () => {
  it("gives melee weapons defaults and accepts stats", () => {
    const plain = new MeleeWeapon({ id: "m", name: "M" });
    expect(plain.reach).toBeGreaterThan(0);
    expect(plain.arc).toBe(MELEE_DEFAULTS.arc);
    expect(plain.rarity).toBe("common");
    expect(plain.affixes).toEqual([]);
    expect(plain.onHit).toBeNull();

    const axe = new MeleeWeapon({
      id: "a", name: "A", reach: 30, swingFrames: 20, knockback: 7, arc: 150, rarity: "rare",
      affixes: ["heavy"]
    });
    expect(axe.reach).toBe(30);
    expect(axe.swingFrames).toBe(20);
    expect(axe.knockback).toBe(7);
    expect(axe.arc).toBe(150);
    expect(axe.rarity).toBe("rare");
    expect(axe.affixes).toEqual(["heavy"]);
  });

  it("gives ranged weapons defaults and accepts stats", () => {
    const plain = new ProjectileWeapon({ id: "p", name: "P" });
    expect(plain.projectileCount).toBe(1);
    expect(plain.pierce).toBe(0);
    const tome = new ProjectileWeapon({
      id: "t", name: "T", fireRate: 25, shotSpeed: 5, range: 180, projectileCount: 3,
      spread: 30, pierce: 1, element: "Mind"
    });
    expect(tome.fireRate).toBe(25);
    expect(tome.projectileCount).toBe(3);
    expect(tome.spread).toBe(30);
    expect(tome.element).toBe("Mind");
  });

  it("rejects bad values", () => {
    expect(() => new MeleeWeapon({ id: "m", name: "M", reach: -1 })).toThrowError(TypeError);
    expect(() => new MeleeWeapon({ id: "m", name: "M", arc: 400 })).toThrowError(TypeError);
    expect(() => new ProjectileWeapon({ id: "p", name: "P", projectileCount: 0 }))
      .toThrowError(TypeError);
    expect(() => new ProjectileWeapon({ id: "p", name: "P", pierce: 1.5 }))
      .toThrowError(TypeError);
    expect(() => new Weapon({ id: "w", name: "W", rarity: "mythic" })).toThrowError(TypeError);
    expect(() => new Weapon({ id: "w", name: "W", element: "Lava" })).toThrowError(TypeError);
    expect(() => new Weapon({ id: "w", name: "W", onHit: 5 })).toThrowError(TypeError);
    expect(() => new Weapon({ id: "w", name: "W", affixes: "swift" })).toThrowError(TypeError);
  });

  it("keeps hooks only when they are given", () => {
    const hook = () => [];
    const weapon = new MeleeWeapon({ id: "m", name: "M", onHit: hook });
    expect(weapon.onHit).toBe(hook);
    expect(weapon.onFire).toBeNull();
  });
});
