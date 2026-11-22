describe("item save", function () {
  function roundTrip(item) {
    return deserializeItem(JSON.parse(JSON.stringify(serializeItem(item))));
  }

  function expectSameWeapon(copy, original) {
    expect(copy.constructor).toBe(original.constructor);
    expect(copy.name).toBe(original.name);
    expect(copy.rarity).toBe(original.rarity);
    expect(copy.affixes).toEqual(original.affixes);
    expect(copy.baseId).toBe(original.baseId);
    expect(copy.uniqueId).toBe(original.uniqueId);
    expect(copy.element).toBe(original.element);
    expect(copy.value).toBe(original.value);
    expect(copy.damage).toBe(original.damage);
    expect(typeof copy.onHit).toBe(typeof original.onHit);
    expect(typeof copy.onFire).toBe(typeof original.onFire);
  }

  it("round trips every weapon base at every rarity", function () {
    const rng = createRng(31);
    for (const base of WEAPON_BASES) {
      for (const rarity of RARITY_IDS) {
        const weapon = generateWeapon(rng, { rarity: rarity, kind: base.kind });
        const copy = roundTrip(weapon);
        expect(copy).not.toBeNull();
        expectSameWeapon(copy, weapon);
        for (const stat of statNamesFor(base.kind)) {
          expect(copy[stat]).toBe(weapon[stat]);
        }
      }
    }
  });

  it("round trips every legendary and keeps its hooks working", function () {
    for (const legendary of LEGENDARIES) {
      const made = generateLegendaryFor(legendary);
      const copy = roundTrip(made);
      expect(copy.uniqueId).toBe(legendary.id);
      expectSameWeapon(copy, made);
      const hook = copy.onHit || copy.onFire;
      expect(typeof hook).toBe("function");
    }
  });

  // Rolls weapons until one is this legendary (the generator picks one at random).
  function generateLegendaryFor(legendary) {
    const kind = getWeaponBase(legendary.baseId).kind;
    const rng = createRng(1);
    for (let i = 0; i < 2000; i++) {
      const weapon = generateWeapon(rng, { rarity: "legendary", kind: kind });
      if (weapon.uniqueId === legendary.id) {
        return weapon;
      }
    }
    throw new Error("never rolled " + legendary.id);
  }

  it("round trips armor, potions and gold", function () {
    const items = [
      new Helmet({ id: "cap", name: "Cap", block: 6, rarity: "uncommon", value: 3 }),
      new ChestArmor({ id: "robe", name: "Robe", hearts: 2 }),
      new LegArmor({ id: "pants", name: "Pants", block: 5 }),
      new Consumable({ id: "potion", name: "Potion", healthRestore: 2, maxStackSize: 5 }),
      new Gold()
    ];
    for (const item of items) {
      const copy = roundTrip(item);
      expect(copy.constructor).toBe(item.constructor);
      expect(copy.id).toBe(item.id);
      expect(copy.name).toBe(item.name);
      expect(copy.value).toBe(item.value);
      expect(copy.maxStackSize).toBe(item.maxStackSize);
    }
    expect(roundTrip(items[0]).block).toBe(6);
    expect(roundTrip(items[0]).rarity).toBe("uncommon");
    expect(roundTrip(items[1]).hearts).toBe(2);
    expect(roundTrip(items[2]).block).toBe(5);
    expect(roundTrip(items[3]).healthRestore).toBe(2);
  });

  it("keeps the lock flag", function () {
    const sword = generateWeapon(createRng(2), { rarity: "rare", kind: "melee" });
    sword.locked = true;
    expect(roundTrip(sword).locked).toBe(true);
    sword.locked = false;
    expect(roundTrip(sword).locked).toBe(false);
  });

  it("stores plain data with no functions", function () {
    const weapon = generateWeapon(createRng(9), { rarity: "epic", kind: "ranged" });
    const data = serializeItem(weapon);
    expect(data.v).toBe(ITEM_SAVE_VERSION);
    expect(JSON.stringify(data)).toBe(JSON.stringify(JSON.parse(JSON.stringify(data))));
    for (const value of Object.values(data)) {
      expect(typeof value).not.toBe("function");
    }
  });

  it("returns null instead of throwing for bad data", function () {
    const good = serializeItem(generateWeapon(createRng(3), { rarity: "uncommon" }));
    const bad = [
      null, undefined, 5, "text", [], {},
      { ...good, v: 99 },
      { ...good, type: "banana" },
      { ...good, affixes: ["not-an-affix"] },
      { ...good, uniqueId: "not-a-legendary" },
      { ...good, stats: { damage: "lots" } },
      { ...good, id: "" }
    ];
    for (const data of bad) {
      expect(deserializeItem(data)).toBeNull();
    }
    expect(serializeItem({})).toBeNull();
    expect(serializeItem(null)).toBeNull();
  });

  it("skips unknown entries when loading a list", function () {
    const sword = serializeItem(generateWeapon(createRng(3), { rarity: "rare" }));
    const items = deserializeItems([sword, { v: 1, type: "mystery" }, null, sword]);
    expect(items.length).toBe(2);
    expect(deserializeItems("nope")).toEqual([]);
  });
});
