describe("class loadouts", function () {
  it("gives each class a common melee and a common ranged weapon of its element", function () {
    for (const mageClass of MAGE_CLASSES) {
      const loadout = createLoadout(mageClass, createRng(4));
      expect(loadout.melee instanceof MeleeWeapon).toBe(true);
      expect(loadout.ranged instanceof ProjectileWeapon).toBe(true);
      for (const weapon of [loadout.melee, loadout.ranged]) {
        expect(weapon.element).toBe(mageClass);
        expect(weapon.rarity).toBe("common");
        expect(weapon.affixes).toEqual([]);
        expect(weapon.name.startsWith(mageClass + " ")).toBe(true);
      }
    }
  });

  it("is repeatable for the same seed and varies between seeds", function () {
    const a = createLoadout("Fire", createRng(8));
    const b = createLoadout("Fire", createRng(8));
    expect(a.melee.name).toBe(b.melee.name);
    expect(a.ranged.damage).toBe(b.ranged.damage);
    const names = new Set();
    for (let seed = 1; seed <= 40; seed++) {
      names.add(createLoadout("Ice", createRng(seed)).melee.name);
    }
    expect(names.size).toBeGreaterThan(2);
  });

  it("equips both weapons on the player", function () {
    for (const mageClass of MAGE_CLASSES) {
      const player = new Player(10, 10, mageClass, "Wizard");
      const loadout = giveLoadout(player, createRng(2));
      expect(player.inventory.getEquipped("melee")).toBe(loadout.melee);
      expect(player.inventory.getEquipped("projectile")).toBe(loadout.ranged);
      expect(player.inventory.getEquipped("melee").element).toBe(mageClass);
    }
  });
});
