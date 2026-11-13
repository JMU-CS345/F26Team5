describe("ItemStack", () => {
  let potion;

  beforeEach(() => {
    potion = new Consumable({
      id: "potion",
      name: "Potion",
      maxStackSize: 10
    });
  });

  it("stores an item and positive integer quantity", () => {
    const stack = new ItemStack(potion, 3);
    expect(stack.item).toBe(potion);
    expect(stack.quantity).toBe(3);
    expect(stack.spaceRemaining).toBe(7);
  });

  it("adds and removes valid quantities", () => {
    const stack = new ItemStack(potion, 3);
    stack.add(2);
    const removed = stack.remove(4);

    expect(stack.quantity).toBe(1);
    expect(removed.quantity).toBe(4);
    expect(removed.item).toBe(potion);
  });

  it("rejects invalid quantities and stack overflow", () => {
    expect(() => new ItemStack(potion, 0)).toThrow();
    expect(() => new ItemStack(potion, 1.5)).toThrow();
    expect(() => new ItemStack(potion, 11)).toThrow();
    expect(() => new ItemStack(
      new Weapon({ id: "sword", name: "Sword" }),
      2
    )).toThrow();
  });

  it("recognizes only compatible stackable items", () => {
    const stack = new ItemStack(potion, 1);
    expect(stack.canStackWith(new Consumable({
      id: "potion",
      name: "Another Potion"
    }))).toBe(true);
    expect(stack.canStackWith(new Consumable({
      id: "ether",
      name: "Ether"
    }))).toBe(false);
  });
});

describe("InventorySlot", () => {
  it("accepts Item and every subclass by default", () => {
    const slot = new InventorySlot();
    expect(slot.accepts(new Gold())).toBe(true);
    expect(slot.accepts(new Armor({ id: "robe", name: "Robe" }))).toBe(true);
  });

  it("uses inheritance for restricted slot types", () => {
    const weaponSlot = new InventorySlot(Weapon);
    const weapon = new Weapon({ id: "sword", name: "Sword" });
    const armor = new Armor({ id: "robe", name: "Robe" });

    expect(weaponSlot.accepts(weapon)).toBe(true);
    expect(weaponSlot.accepts(armor)).toBe(false);
  });

  it("inserts, inspects, merges, and removes stacks", () => {
    const potion = new Consumable({
      id: "potion",
      name: "Potion",
      maxStackSize: 10
    });
    const slot = new InventorySlot();
    slot.insert(new ItemStack(potion, 3));
    slot.insert(new ItemStack(potion, 2));

    expect(slot.inspect().quantity).toBe(5);
    expect(slot.remove(2).quantity).toBe(2);
    expect(slot.inspect().quantity).toBe(3);
  });

  it("reports hidden slots without changing their storage behavior", () => {
    const slot = new InventorySlot(Gold, { hidden: true });
    slot.insert(new ItemStack(new Gold(), 20));
    expect(slot.hidden).toBe(true);
    expect(slot.inspect().quantity).toBe(20);
  });

  it("rejects incompatible types and overflow without changing contents", () => {
    const slot = new InventorySlot(Weapon);
    const sword = new Weapon({ id: "sword", name: "Sword" });
    slot.insert(new ItemStack(sword));

    expect(() => slot.insert(new ItemStack(
      new Armor({ id: "robe", name: "Robe" })
    ))).toThrow();
    expect(slot.inspect().item).toBe(sword);
    expect(slot.inspect().quantity).toBe(1);
  });

  it("does not expose its mutable internal stack", () => {
    const potion = new Consumable({ id: "potion", name: "Potion" });
    const slot = new InventorySlot();
    slot.insert(new ItemStack(potion, 2));

    const inspectedStack = slot.stack;
    inspectedStack.add(1);
    expect(slot.inspect().quantity).toBe(2);
  });
});

describe("Inventory", () => {
  let potion;

  beforeEach(() => {
    potion = new Consumable({
      id: "potion",
      name: "Potion",
      maxStackSize: 5
    });
  });

  it("splits additions and combines compatible stacks", () => {
    const inventory = new Inventory(3);
    inventory.add(potion, 7);
    inventory.add(new Consumable({
      id: "potion",
      name: "Potion",
      maxStackSize: 5
    }), 3);

    expect(inventory.findById("potion").map((entry) => entry.quantity)).toEqual([5, 5]);
    expect(inventory.size).toBe(2);
  });

  it("uses another slot when a stack reaches its maximum", () => {
    const inventory = new Inventory(2);
    inventory.add(potion, 6);
    expect(inventory.contents().length).toBe(2);
    expect(inventory.contents()[0].quantity).toBe(5);
    expect(inventory.contents()[1].quantity).toBe(1);
  });

  it("enforces capacity without losing an overflowing addition", () => {
    const inventory = new Inventory(1);
    inventory.add(potion, 5);

    expect(() => inventory.add(potion, 1)).toThrow();
    expect(inventory.quantityOf("potion")).toBe(5);
  });

  it("supports inventories without a fixed capacity", () => {
    const inventory = new Inventory();
    inventory.add(potion, 12);
    expect(inventory.contents().map((entry) => entry.quantity)).toEqual([5, 5, 2]);
  });

  it("removes quantities across multiple stacks", () => {
    const inventory = new Inventory(3);
    inventory.add(potion, 12);
    inventory.remove("potion", 8);
    expect(inventory.quantityOf("potion")).toBe(4);
  });

  it("keeps contents unchanged when a removal cannot complete", () => {
    const inventory = new Inventory(2);
    inventory.add(potion, 6);
    expect(() => inventory.remove("potion", 7)).toThrow();
    expect(inventory.quantityOf("potion")).toBe(6);
  });

  it("finds items by type and definition ID", () => {
    const inventory = new Inventory(3);
    inventory.add(potion, 2);
    inventory.add(new Armor({ id: "robe", name: "Robe" }));

    expect(inventory.findByType(Consumable).length).toBe(1);
    expect(inventory.findByType(Armor).length).toBe(1);
    expect(inventory.findById("robe")[0].item instanceof Armor).toBe(true);
  });

  it("reports available storage space", () => {
    const inventory = new Inventory(2);
    inventory.add(potion, 3);
    expect(inventory.findAvailableSpace(potion)).toBe(7);
  });

  it("does not expose mutable slots or content arrays", () => {
    const inventory = new Inventory(1);
    inventory.add(potion, 2);
    const exposedSlot = inventory.slots[0];
    exposedSlot.remove(1);

    expect(inventory.quantityOf("potion")).toBe(2);
    expect(Object.isFrozen(inventory.contents())).toBe(true);
  });

  it("does not allow the same non-stackable instance twice", () => {
    const inventory = new Inventory(2);
    const sword = new Weapon({ id: "sword", name: "Sword" });
    inventory.add(sword);

    expect(() => inventory.add(sword)).toThrow();
    expect(inventory.quantityOf(sword)).toBe(1);
  });

  it("transfers items between inventories", () => {
    const source = new Inventory(2);
    const destination = new Inventory(2);
    source.add(potion, 5);

    expect(source.transferTo(destination, "potion", 3)).toBe(true);
    expect(source.quantityOf("potion")).toBe(2);
    expect(destination.quantityOf("potion")).toBe(3);
  });

  it("keeps both inventories unchanged after a failed transfer", () => {
    const source = new Inventory(1);
    const destination = new Inventory(1);
    source.add(potion, 5);
    destination.add(potion, 5);

    expect(source.transferTo(destination, "potion", 1)).toBe(false);
    expect(source.quantityOf("potion")).toBe(5);
    expect(destination.quantityOf("potion")).toBe(5);
  });

  it("prevents duplication when transferring non-stackable items", () => {
    const source = new Inventory(1);
    const destination = new Inventory(1);
    const sword = new Weapon({ id: "sword", name: "Sword" });
    source.add(sword);

    expect(source.transferTo(destination, sword)).toBe(true);
    expect(source.quantityOf(sword)).toBe(0);
    expect(destination.quantityOf(sword)).toBe(1);
    expect(destination.contents()[0].item).toBe(sword);
  });
});
