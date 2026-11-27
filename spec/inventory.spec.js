// Items and inventory: item data, inventory rules, the player inventory, drops and the inventory screen.
// Shared helpers live in helpers.js.

// ===== from items.spec.js =====
describe("Item hierarchy", () => {
  it("uses the requested inheritance relationships", () => {
    const weapon = new Weapon({ id: "sword", name: "Sword" });
    const armor = new Armor({ id: "robe", name: "Robe" });

    expect(weapon instanceof Item).toBe(true);
    expect(armor instanceof Item).toBe(true);
    expect(new MeleeWeapon({ id: "axe", name: "Axe" }) instanceof Weapon).toBe(true);
    expect(new ProjectileWeapon({ id: "bow", name: "Bow" }) instanceof Weapon).toBe(true);
    expect(new Helmet({ id: "hat", name: "Hat" }) instanceof Armor).toBe(true);
    expect(new ChestArmor({ id: "coat", name: "Coat" }) instanceof Armor).toBe(true);
    expect(new LegArmor({ id: "boots", name: "Boots" }) instanceof Armor).toBe(true);
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

  it("stores armor defense on specialized armor subclasses", () => {
    const armor = new ChestArmor({ id: "robe", name: "Robe", defense: 4 });
    expect(armor.defense).toBe(4);
    expect(armor.maxStackSize).toBe(1);
  });

  it("stores consumable descriptions and healing effects", () => {
    const potion = new Consumable({
      id: "potion",
      name: "Potion",
      description: "Restores a little health.",
      healthRestore: 2
    });
    const target = { health: 2, maxHealth: 5 };

    expect(potion.description).toBe("Restores a little health.");
    expect(potion.canUse(target)).toBe(true);
    expect(potion.applyTo(target)).toBe(true);
    expect(target.health).toBe(4);
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


// ===== from inventory.spec.js =====
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


// ===== from player-inventory.spec.js =====
describe("PlayerInventory", () => {
  function makeEquipment() {
    return {
      melee: new MeleeWeapon({ id: "sword", name: "Sword" }),
      projectile: new ProjectileWeapon({ id: "wand", name: "Wand" }),
      head: new Helmet({ id: "hat", name: "Hat" }),
      body: new ChestArmor({ id: "robe", name: "Robe" }),
      legs: new LegArmor({ id: "boots", name: "Boots" })
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
    const sword = makeEquipment().melee;
    expect(() => inventory.equip(sword)).toThrow();
    expect(inventory.getEquipped("melee")).toBeNull();
  });

  it("enforces the concrete type for every equipment slot", () => {
    const inventory = new PlayerInventory(2);
    const genericWeapon = new Weapon({ id: "generic", name: "Generic Weapon" });
    const genericArmor = new Armor({ id: "generic-armor", name: "Generic Armor" });
    inventory.add(genericWeapon);
    inventory.add(genericArmor);

    expect(() => inventory.equip(genericWeapon)).toThrow();
    expect(() => inventory.equip(genericArmor)).toThrow();
    expect(inventory.quantityOf(genericWeapon)).toBe(1);
    expect(inventory.quantityOf(genericArmor)).toBe(1);
  });

  it("unequips an item back into the bag", () => {
    const inventory = new PlayerInventory(1);
    const sword = makeEquipment().melee;
    inventory.add(sword);
    inventory.equip(sword);

    expect(inventory.unequip("melee")).toBe(sword);
    expect(inventory.getEquipped("melee")).toBeNull();
    expect(inventory.quantityOf(sword)).toBe(1);
  });

  it("swaps occupied equipment without duplication or loss", () => {
    const inventory = new PlayerInventory(1);
    const first = new MeleeWeapon({ id: "first", name: "First Sword" });
    const second = new MeleeWeapon({ id: "second", name: "Second Sword" });
    inventory.add(first);
    inventory.equip(first);
    inventory.add(second);

    inventory.equip(second);

    expect(inventory.getEquipped("melee")).toBe(second);
    expect(inventory.quantityOf(first)).toBe(1);
    expect(inventory.quantityOf(second)).toBe(0);
    expect(inventory.contents().length).toBe(1);
  });

  it("keeps an equipped item in place when the bag cannot accept it", () => {
    const inventory = new PlayerInventory(1);
    const sword = makeEquipment().melee;
    inventory.add(sword);
    inventory.equip(sword);
    inventory.add(new Consumable({ id: "potion", name: "Potion" }));

    expect(inventory.unequip("melee")).toBeNull();
    expect(inventory.getEquipped("melee")).toBe(sword);
    expect(inventory.quantityOf(sword)).toBe(0);
  });

  it("exposes read-only equipment inspection", () => {
    const inventory = new PlayerInventory(1);
    const sword = makeEquipment().melee;
    inventory.add(sword);
    inventory.equip(sword);

    expect(inventory.equipment.melee.item).toBe(sword);
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

  it("consumes exactly one healing item and applies its real effect", () => {
    const inventory = new PlayerInventory(1);
    const potion = new Consumable({
      id: "potion",
      name: "Potion",
      maxStackSize: 5,
      healthRestore: 2
    });
    const target = { health: 1, maxHealth: 5 };
    inventory.add(potion, 3);

    expect(inventory.consume(potion, target)).toBe(true);
    expect(target.health).toBe(3);
    expect(inventory.quantityOf(potion)).toBe(2);
  });

  it("does not consume an item when its effect cannot be applied", () => {
    const inventory = new PlayerInventory(1);
    const potion = new Consumable({
      id: "potion",
      name: "Potion",
      healthRestore: 2
    });
    const target = { health: 5, maxHealth: 5 };
    inventory.add(potion, 2);

    expect(inventory.consume(potion, target)).toBe(false);
    expect(target.health).toBe(5);
    expect(inventory.quantityOf(potion)).toBe(2);
  });
});


// ===== from item-drop.spec.js =====
describe("ItemDrop", () => {
  it("stores a validated item stack at a world position", () => {
    const potion = new Consumable({ id: "potion", name: "Potion" });
    const drop = new ItemDrop(20, 30, potion, 3);

    expect(drop.item).toBe(potion);
    expect(drop.quantity).toBe(3);
    expect(drop.getBounds()).toEqual({
      x: 20,
      y: 30,
      w: ITEM_DROP_SIZE,
      h: ITEM_DROP_SIZE
    });
  });

  it("uses ItemStack validation for its item and quantity", () => {
    const weapon = new Weapon({ id: "wand", name: "Wand" });
    expect(() => new ItemDrop(0, 0, weapon, 2)).toThrow();
    expect(() => new ItemDrop(0, 0, {}, 1)).toThrow();
    expect(() => new ItemDrop(Infinity, 0, weapon)).toThrow();
  });

  it("advances a bounded floating animation offset", () => {
    const drop = new ItemDrop(0, 0, new Gold(), 5);
    expect(drop.age).toBe(0);
    expect(drop.bobOffset).toBe(0);

    for (let frame = 0; frame < 30; frame++) {
      drop.update();
      expect(Math.abs(drop.bobOffset)).toBeLessThanOrEqual(ITEM_DROP_BOB_HEIGHT);
    }
    expect(drop.age).toBe(30);
  });
});


// ===== from inventory-ui.spec.js =====
describe("Inventory controls and context actions", () => {
  function playingGame() {
    const game = new Game();
    game.selectModel("Tall");
    game.selectClass("Fire");
    game.finishCustomization();
    return game;
  }

  it("uses the same state transition for the keyboard and HUD button controls", () => {
    const game = playingGame();
    expect(toggleInventoryFromControl(game)).toBe(true);
    expect(game.isInventory()).toBe(true);
    expect(toggleInventoryFromControl(game)).toBe(true);
    expect(game.isPlaying()).toBe(true);
    expect(inventoryHudButtonAt(
      INVENTORY_HUD_BUTTON.x + 1,
      INVENTORY_HUD_BUTTON.y + 1
    )).toBe(true);
  });

  it("reads the gameplay gold label directly from PlayerInventory", () => {
    const inventory = new PlayerInventory();
    expect(goldHudText(inventory)).toBe("Gold: 0");
    inventory.add(new Gold(), 12);
    expect(goldHudText(inventory)).toBe("Gold: 12");
    inventory.remove("gold", 5);
    expect(goldHudText(inventory)).toBe("Gold: 7");
  });

  it("preserves drag-and-drop equipping for typed slots", () => {
    const inventory = new PlayerInventory(2);
    const sword = new MeleeWeapon({ id: "sword", name: "Sword" });
    inventory.add(sword);
    const layout = inventoryUiLayout(inventory);
    const bag = layout.bagSlots[0];
    const melee = layout.equipmentSlots.find((slot) => slot.equipmentName === "melee");
    const drag = beginInventoryDrag(inventory, bag.x + 2, bag.y + 2);

    expect(finishInventoryDrag(inventory, drag, melee.x + 2, melee.y + 2)).toBe(true);
    expect(inventory.getEquipped("melee")).toBe(sword);
    expect(inventory.quantityOf(sword)).toBe(0);
  });

  it("rejects dragging an item into an incompatible equipment slot", () => {
    const inventory = new PlayerInventory(2);
    const sword = new MeleeWeapon({ id: "sword", name: "Sword" });
    inventory.add(sword);
    const layout = inventoryUiLayout(inventory);
    const bag = layout.bagSlots[0];
    const head = layout.equipmentSlots.find((slot) => slot.equipmentName === "head");
    const drag = beginInventoryDrag(inventory, bag.x + 2, bag.y + 2);

    expect(finishInventoryDrag(inventory, drag, head.x + 2, head.y + 2)).toBe(false);
    expect(inventory.quantityOf(sword)).toBe(1);
    expect(inventory.getEquipped("head")).toBeNull();
  });

  it("offers and performs context actions for weapons", () => {
    const inventory = new PlayerInventory(2);
    const player = { health: 3, maxHealth: 5 };
    const wand = new ProjectileWeapon({
      id: "wand",
      name: "Ice Wand",
      damage: 4,
      element: "Ice"
    });
    inventory.add(wand);
    const bag = inventoryUiLayout(inventory).bagSlots[0];
    const selection = inventorySelectionAt(inventory, bag.x + 2, bag.y + 2);

    expect(inventoryContextActions(inventory, player, selection).map((a) => a.id))
      .toEqual(["equip", "view"]);
    const info = performInventoryContextAction(inventory, player, selection, "view");
    expect(info.infoLines).toContain("Damage: 4");
    expect(info.infoLines).toContain("Element: Ice");
    expect(info.infoLines).toContain("Attack: Projectile");
    expect(performInventoryContextAction(inventory, player, selection, "equip").success)
      .toBe(true);
    expect(inventory.getEquipped("projectile")).toBe(wand);
  });

  it("consumes one item through its context action and disables invalid use", () => {
    const inventory = new PlayerInventory(1);
    const player = { health: 1, maxHealth: 5 };
    const potion = new Consumable({
      id: "potion",
      name: "Potion",
      maxStackSize: 5,
      healthRestore: 4,
      description: "Bright red medicine."
    });
    inventory.add(potion, 2);
    const bag = inventoryUiLayout(inventory).bagSlots[0];
    const selection = inventorySelectionAt(inventory, bag.x + 2, bag.y + 2);

    expect(performInventoryContextAction(inventory, player, selection, "consume").success)
      .toBe(true);
    expect(player.health).toBe(5);
    expect(inventory.quantityOf(potion)).toBe(1);
    expect(inventoryContextActions(inventory, player, selection)[0].enabled).toBe(false);
    expect(performInventoryContextAction(inventory, player, selection, "consume").success)
      .toBe(false);
    expect(inventory.quantityOf(potion)).toBe(1);
  });

  it("does not duplicate or lose an item across context-menu swaps", () => {
    const inventory = new PlayerInventory(1);
    const player = { health: 5, maxHealth: 5 };
    const first = new Helmet({ id: "first", name: "First Hat" });
    const second = new Helmet({ id: "second", name: "Second Hat" });
    inventory.add(first);
    inventory.equip(first);
    inventory.add(second);
    const bag = inventoryUiLayout(inventory).bagSlots[0];
    const selection = inventorySelectionAt(inventory, bag.x + 2, bag.y + 2);

    expect(performInventoryContextAction(inventory, player, selection, "equip").success)
      .toBe(true);
    expect(inventory.getEquipped("head")).toBe(second);
    expect(inventory.quantityOf(first)).toBe(1);
    expect(inventory.quantityOf(second)).toBe(0);
  });
});
