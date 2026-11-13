describe("Item hierarchy", () => {
  it("uses the requested inheritance relationships", () => {
    const weapon = new Weapon({ id: "sword", name: "Sword" });
    const armor = new Armor({ id: "robe", name: "Robe" });

    expect(weapon instanceof Item).toBe(true);
    expect(armor instanceof Item).toBe(true);
    expect(new Consumable({ id: "potion", name: "Potion" }) instanceof Item).toBe(true);
    expect(new Gold() instanceof Item).toBe(true);
  });

  it("stores shared and specialized properties", () => {
    const wand = new Weapon({
      id: "fire-wand",
      name: "Fire Wand",
      value: 25,
      damage: 8,
      element: "Fire"
    });

    expect(wand.id).toBe("fire-wand");
    expect(wand.name).toBe("Fire Wand");
    expect(wand.value).toBe(25);
    expect(wand.damage).toBe(8);
    expect(wand.element).toBe("Fire");
    expect(wand.elementalType).toBe("Fire");
  });

  it("gives ordinary items a configurable stack limit", () => {
    const ordinary = new Item({ id: "herb", name: "Herb" });
    const limited = new Consumable({
      id: "potion",
      name: "Potion",
      maxStackSize: 5
    });

    expect(ordinary.maxStackSize).toBe(DEFAULT_MAX_STACK_SIZE);
    expect(ordinary.stackable).toBe(true);
    expect(ordinary.isStackable).toBe(true);
    expect(limited.maxStackSize).toBe(5);
  });

  it("never allows weapons or armor to stack", () => {
    const weapon = new Weapon({
      id: "sword",
      name: "Sword",
      maxStackSize: 20
    });
    const armor = new Armor({
      id: "robe",
      name: "Robe",
      maxStackSize: 20
    });

    expect(weapon.maxStackSize).toBe(1);
    expect(weapon.stackable).toBe(false);
    expect(armor.maxStackSize).toBe(1);
    expect(armor.stackable).toBe(false);
  });

  it("gives separate non-stackable instances unique identities", () => {
    const first = new Weapon({ id: "sword", name: "Sword" });
    const second = new Weapon({ id: "sword", name: "Sword" });

    expect(first.id).toBe(second.id);
    expect(first.instanceId).not.toBe(second.instanceId);
    expect(first.isStackCompatible(second)).toBe(false);
  });

  it("stacks definitions only when their type and ID match", () => {
    const first = new Consumable({ id: "potion", name: "Potion" });
    const second = new Consumable({ id: "potion", name: "Red Potion" });
    const differentId = new Consumable({ id: "ether", name: "Ether" });
    const differentType = new Item({ id: "potion", name: "Potion" });

    expect(first.isStackCompatible(second)).toBe(true);
    expect(first.isStackCompatible(differentId)).toBe(false);
    expect(first.isStackCompatible(differentType)).toBe(false);
  });

  it("makes gold an unlimited stack with a stable definition ID", () => {
    const gold = new Gold({ id: "not-gold", name: "Coins" });

    expect(gold.id).toBe("gold");
    expect(gold.name).toBe("Coins");
    expect(gold.maxStackSize).toBe(Infinity);
    expect(gold.stackable).toBe(true);
  });

  it("stores armor defense without specialized armor subclasses", () => {
    const armor = new Armor({ id: "robe", name: "Robe", defense: 4 });
    expect(armor.defense).toBe(4);
    expect(armor.maxStackSize).toBe(1);
  });

  it("rejects invalid shared item properties", () => {
    expect(() => new Item({ id: "", name: "Bad" })).toThrow();
    expect(() => new Item({ id: "bad", name: "", value: 1 })).toThrow();
    expect(() => new Item({ id: "bad", name: "Bad", value: -1 })).toThrow();
    expect(() => new Item({
      id: "bad",
      name: "Bad",
      maxStackSize: 1.5
    })).toThrow();
  });
});
