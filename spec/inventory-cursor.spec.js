describe("InventoryCursor", function () {
  let cursor;

  beforeEach(function () {
    cursor = new InventoryCursor();
  });

  it("starts on the first bag slot", function () {
    expect(cursor.section).toBe("bag");
    expect(cursor.index).toBe(0);
  });

  it("moves through the bag grid and stops at the edges", function () {
    cursor.move(1, 0);
    cursor.move(0, 1);
    expect(cursor.index).toBe(5);
    cursor.move(1, 0);
    cursor.move(1, 0);
    cursor.move(1, 0);
    expect(cursor.index).toBe(7);
    cursor.move(0, 1);
    cursor.move(0, 1);
    cursor.move(0, 1);
    expect(cursor.index).toBe(15);
    cursor.move(0, 1);
    expect(cursor.index).toBe(15);
  });

  it("does not move above the top row", function () {
    cursor.move(0, -1);
    expect(cursor.index).toBe(0);
  });

  it("crosses from the bag to the equipment and back", function () {
    cursor.move(-1, 0);
    expect(cursor.section).toBe("equipment");
    expect(cursor.index).toBe(1); // projectile, the last slot of the top row
    cursor.move(1, 0);
    expect(cursor.section).toBe("bag");
    expect(cursor.index).toBe(0);
  });

  it("enters the second equipment row from the second bag row", function () {
    cursor.move(0, 1);
    cursor.move(-1, 0);
    expect(cursor.section).toBe("equipment");
    expect(cursor.index).toBe(4); // legs
  });

  it("moves between equipment rows and keeps the column inside the row", function () {
    cursor.move(-1, 0);
    cursor.move(0, 1);
    expect(cursor.index).toBe(3); // body, under projectile
    cursor.move(1, 0);
    expect(cursor.index).toBe(4);
    cursor.move(0, -1);
    expect(cursor.index).toBe(1); // legs has nothing above, so it lands on projectile
    cursor.move(0, -1);
    expect(cursor.index).toBe(1);
  });

  it("stops at the left edge of the equipment", function () {
    cursor.move(-1, 0);
    cursor.move(-1, 0);
    cursor.move(-1, 0);
    expect(cursor.index).toBe(0);
    expect(cursor.section).toBe("equipment");
  });

  it("maps arrow keys and WASD to moves", function () {
    expect(moveInventoryCursorForKey(cursor, 39)).toBe(true);
    expect(moveInventoryCursorForKey(cursor, 83)).toBe(true);
    expect(cursor.index).toBe(5);
    expect(moveInventoryCursorForKey(cursor, 65)).toBe(true);
    expect(moveInventoryCursorForKey(cursor, 38)).toBe(true);
    expect(cursor.index).toBe(0);
    expect(moveInventoryCursorForKey(cursor, 81)).toBe(false);
  });
});

describe("keyboard inventory actions", function () {
  let player;
  let inventory;
  let cursor;

  beforeEach(function () {
    player = new Player(50, 50, "Fire", "Tall");
    inventory = player.inventory;
    cursor = new InventoryCursor();
  });

  it("equips a weapon with Enter", function () {
    const wand = new ProjectileWeapon({ id: "wand", name: "Wand", damage: 3 });
    inventory.add(wand);
    const result = useInventoryCursorItem(inventory, player, cursor);
    expect(result.success).toBe(true);
    expect(inventory.getEquipped("projectile")).toBe(wand);
  });

  it("unequips an equipped item with Enter", function () {
    const robe = new ChestArmor({ id: "robe", name: "Robe", defense: 1 });
    inventory.add(robe);
    inventory.equip(robe);
    cursor.section = "equipment";
    cursor.index = 3;
    expect(useInventoryCursorItem(inventory, player, cursor).success).toBe(true);
    expect(inventory.getEquipped("body")).toBeNull();
    expect(inventory.quantityOf(robe)).toBe(1);
  });

  it("uses a potion with Enter when hurt", function () {
    const potion = new Consumable({ id: "potion", name: "Potion", healthRestore: 2 });
    inventory.add(potion);
    player.health = 1;
    const result = useInventoryCursorItem(inventory, player, cursor);
    expect(result.success).toBe(true);
    expect(player.health).toBe(3);
    expect(inventory.quantityOf(potion)).toBe(0);
  });

  it("shows item info with Enter when there is nothing to use it for", function () {
    inventory.add(new Item({ id: "gem", name: "Gem", value: 4 }));
    const result = useInventoryCursorItem(inventory, player, cursor);
    expect(result.infoLines).toContain("Gem");
  });

  it("does nothing with Enter on an empty slot", function () {
    const result = useInventoryCursorItem(inventory, player, cursor);
    expect(result.success).toBe(false);
    expect(result.infoLines.length).toBe(0);
  });

  it("drops the item under the cursor with X", function () {
    const gem = new Item({ id: "gem", name: "Gem", value: 4 });
    inventory.add(gem);
    const drop = dropInventoryCursorItem(inventory, player, cursor);
    expect(drop.item).toBe(gem);
    expect(inventory.quantityOf(gem)).toBe(0);
    expect(drop.pickupDelay).toBeGreaterThan(0);
  });

  it("drops a whole stack with X", function () {
    const potion = new Consumable({ id: "potion", name: "Potion", maxStackSize: 5 });
    inventory.add(potion, 3);
    const drop = dropInventoryCursorItem(inventory, player, cursor);
    expect(drop.quantity).toBe(3);
    expect(inventory.quantityOf(potion)).toBe(0);
  });

  it("drops an equipped item with X", function () {
    const robe = new ChestArmor({ id: "robe", name: "Robe", defense: 1 });
    inventory.add(robe);
    inventory.equip(robe);
    cursor.section = "equipment";
    cursor.index = 3;
    const drop = dropInventoryCursorItem(inventory, player, cursor);
    expect(drop.item).toBe(robe);
    expect(inventory.getEquipped("body")).toBeNull();
    expect(inventory.quantityOf(robe)).toBe(0);
  });

  it("drops nothing from an empty slot", function () {
    expect(dropInventoryCursorItem(inventory, player, cursor)).toBeNull();
  });

  it("is not picked up again until the pickup delay is over", function () {
    const room = new NormalRoom(0, 0, 160, 160);
    const gem = new Item({ id: "gem", name: "Gem", value: 4 });
    inventory.add(gem);
    const drop = dropInventoryCursorItem(inventory, player, cursor);
    room.items = [drop];
    expect(pickupItemDrops(player, room).length).toBe(0);
    for (let frame = 0; frame < ITEM_DROP_PICKUP_DELAY; frame++) {
      drop.update();
    }
    expect(pickupItemDrops(player, room).length).toBe(1);
  });
});
