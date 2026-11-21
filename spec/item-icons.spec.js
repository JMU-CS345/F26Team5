describe("item icons", () => {
  it("has an icon for every weapon base id", () => {
    const bases = ["dagger", "sword", "spear", "axe", "hammer",
      "wand", "staff", "tome", "orb", "scepter"];
    for (const base of bases) {
      const cell = weaponIconCell(base);
      expect(cell).not.toBeNull();
      expect(cell.sheet).toBe(WEAPON_ICON_SHEET);
      expect(cell.w).toBe(16);
      expect(cell.h).toBe(16);
    }
  });

  it("gives each weapon base its own cell", () => {
    const xs = ICON_WEAPON_BASES.map((base) => weaponIconCell(base).x);
    expect(new Set(xs).size).toBe(ICON_WEAPON_BASES.length);
  });

  it("has an icon for the potion, coin and armor kinds", () => {
    for (const kind of ["potion", "coin", "armor"]) {
      expect(itemKindIconCell(kind)).not.toBeNull();
    }
  });

  it("returns null for unknown ids", () => {
    expect(weaponIconCell("banana")).toBeNull();
    expect(itemKindIconCell("banana")).toBeNull();
    expect(rarityFrameCell("mythic")).toBeNull();
  });

  it("has a frame for each of the five rarities", () => {
    expect(ITEM_RARITIES.length).toBe(5);
    for (const rarity of ITEM_RARITIES) {
      expect(rarityFrameCell(rarity)).not.toBeNull();
    }
  });

  it("picks an icon for every item class", () => {
    const sword = new MeleeWeapon({ id: "iron-sword", name: "Iron Sword" });
    const wand = new ProjectileWeapon({ id: "training-wand", name: "Training Wand" });
    expect(itemIconCell(sword)).toEqual(weaponIconCell("sword"));
    expect(itemIconCell(wand)).toEqual(weaponIconCell("wand"));
    expect(itemIconCell(new ChestArmor({ id: "robe", name: "Robe" })))
      .toEqual(itemKindIconCell("armor"));
    expect(itemIconCell(new Gold())).toEqual(itemKindIconCell("coin"));
    expect(itemIconCell(new Consumable({ id: "potion", name: "Potion" })))
      .toEqual(itemKindIconCell("potion"));
  });

  it("prefers an explicit baseId and falls back by attack type", () => {
    const axe = new MeleeWeapon({ id: "x1", name: "Thing" });
    axe.baseId = "axe";
    expect(weaponBaseId(axe)).toBe("axe");
    expect(weaponBaseId(new MeleeWeapon({ id: "x2", name: "Thing" }))).toBe("sword");
    expect(weaponBaseId(new ProjectileWeapon({ id: "x3", name: "Thing" }))).toBe("wand");
  });
});
