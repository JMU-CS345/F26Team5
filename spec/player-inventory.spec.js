describe("PlayerInventory", () => {
  function makeEquipment() {
    return {
      weapon: new Weapon({ id: "sword", name: "Sword" }),
      armor: new Armor({ id: "robe", name: "Robe" })
    };
  }

  it("is a reusable specialization of Inventory", () => {
    expect(new PlayerInventory() instanceof Inventory).toBe(true);
  });

  it("routes all incoming gold to one hidden slot", () => {
    const inventory = new PlayerInventory(1);
    inventory.add(new Gold(), 100);
    inventory.add(new Gold(), 50);

    expect(inventory.gold).toBe(150);
    expect(inventory.contents().length).toBe(0);
    expect(inventory.contents({ includeHidden: true })[0].hidden).toBe(true);
  });

  it("keeps gold out of the bag even when the bag is full", () => {
    const inventory = new PlayerInventory(1);
    inventory.add(new Consumable({ id: "potion", name: "Potion" }));
    inventory.add(new Gold(), 10);

    expect(inventory.goldQuantity).toBe(10);
    expect(inventory.slots[0].inspect().item instanceof Consumable).toBe(true);
  });

  it("equips each supported item into its specialized slot", () => {
    const inventory = new PlayerInventory(5);
    const equipment = makeEquipment();
    for (const item of Object.values(equipment)) {
      inventory.add(item);
      inventory.equip(item);
    }

    for (const [slotName, item] of Object.entries(equipment)) {
      expect(inventory.getEquipped(slotName)).toBe(item);
      expect(inventory.quantityOf(item)).toBe(0);
    }
  });

  it("rejects attempts to equip an unsupported item", () => {
    const inventory = new PlayerInventory(1);
    const potion = new Consumable({ id: "potion", name: "Potion" });
    inventory.add(potion);

    expect(() => inventory.equip(potion)).toThrow();
    expect(inventory.quantityOf(potion)).toBe(1);
  });

  it("requires the equipped item to be in the bag", () => {
    const inventory = new PlayerInventory(1);
    const sword = makeEquipment().weapon;
    expect(() => inventory.equip(sword)).toThrow();
    expect(inventory.getEquipped("weapon")).toBeNull();
  });

  it("unequips an item back into the bag", () => {
    const inventory = new PlayerInventory(1);
    const sword = makeEquipment().weapon;
    inventory.add(sword);
    inventory.equip(sword);

    expect(inventory.unequip("weapon")).toBe(sword);
    expect(inventory.getEquipped("weapon")).toBeNull();
    expect(inventory.quantityOf(sword)).toBe(1);
  });

  it("swaps occupied equipment without duplication or loss", () => {
    const inventory = new PlayerInventory(1);
    const first = new Weapon({ id: "first", name: "First Sword" });
    const second = new Weapon({ id: "second", name: "Second Sword" });
    inventory.add(first);
    inventory.equip(first);
    inventory.add(second);

    inventory.equip(second);

    expect(inventory.getEquipped("weapon")).toBe(second);
    expect(inventory.quantityOf(first)).toBe(1);
    expect(inventory.quantityOf(second)).toBe(0);
    expect(inventory.contents().length).toBe(1);
  });

  it("keeps an equipped item in place when the bag cannot accept it", () => {
    const inventory = new PlayerInventory(1);
    const sword = makeEquipment().weapon;
    inventory.add(sword);
    inventory.equip(sword);
    inventory.add(new Consumable({ id: "potion", name: "Potion" }));

    expect(inventory.unequip("weapon")).toBeNull();
    expect(inventory.getEquipped("weapon")).toBe(sword);
    expect(inventory.quantityOf(sword)).toBe(0);
  });

  it("exposes read-only equipment inspection", () => {
    const inventory = new PlayerInventory(1);
    const sword = makeEquipment().weapon;
    inventory.add(sword);
    inventory.equip(sword);

    expect(inventory.equipment.weapon.item).toBe(sword);
    expect(Object.isFrozen(inventory.equipment)).toBe(true);
  });

  it("transfers gold to a generic inventory", () => {
    const player = new PlayerInventory();
    const chest = new Inventory(1);
    player.add(new Gold(), 30);

    expect(player.transferTo(chest, "gold", 12)).toBe(true);
    expect(player.gold).toBe(18);
    expect(chest.quantityOf("gold")).toBe(12);
  });

  it("automatically routes transferred gold into another player's hidden slot", () => {
    const first = new PlayerInventory();
    const second = new PlayerInventory();
    first.add(new Gold(), 30);

    expect(first.transferTo(second, Gold, 12)).toBe(true);
    expect(first.gold).toBe(18);
    expect(second.gold).toBe(12);
    expect(second.contents().length).toBe(0);
  });

  it("routes gold transferred from a generic inventory into the hidden slot", () => {
    const chest = new Inventory();
    const player = new PlayerInventory(0);
    chest.add(new Gold(), 25);

    expect(chest.transferTo(player, "gold", 10)).toBe(true);
    expect(chest.quantityOf("gold")).toBe(15);
    expect(player.gold).toBe(10);
    expect(player.contents().length).toBe(0);
  });

  it("preserves gold on a failed transfer", () => {
    const player = new PlayerInventory();
    const weaponOnly = new Inventory({ capacity: 1, acceptedType: Weapon });
    player.add(new Gold(), 30);

    expect(player.transferTo(weaponOnly, "gold", 12)).toBe(false);
    expect(player.gold).toBe(30);
    expect(weaponOnly.contents().length).toBe(0);
  });

  it("removes gold only from the hidden gold slot", () => {
    const player = new PlayerInventory(1);
    player.add(new Gold(), 20);
    const removed = player.remove("gold", 7);

    expect(removed.quantity).toBe(7);
    expect(player.gold).toBe(13);
    expect(player.contents().length).toBe(0);
  });
});
