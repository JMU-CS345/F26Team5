describe("InventoryCursor", function () {
  let cursor;
  const MELEE = 0;
  const MAGIC = 1;
  const HEAD = 2;
  const BODY = 3;
  const LEGS = 4;

  function onDoll(index) {
    cursor.section = "equipment";
    cursor.index = index;
  }

  beforeEach(function () {
    cursor = new InventoryCursor();
  });

  it("starts on the first bag slot", function () {
    expect(cursor.section).toBe("bag");
    expect(cursor.index).toBe(0);
  });

  it("steps one cell through the bag and stops at the edges", function () {
    cursor.move(1, 0);
    cursor.move(0, 1);
    expect(cursor.index).toBe(11);
    for (let i = 0; i < 12; i++) {
      cursor.move(1, 0);
    }
    expect(cursor.index).toBe(19); // stops at the last of the 10 columns
    for (let i = 0; i < 6; i++) {
      cursor.move(0, 1);
    }
    expect(cursor.index).toBe(59); // and at the last of the 6 rows
  });

  it("does not move above the top row", function () {
    cursor.move(0, -1);
    expect(cursor.index).toBe(0);
  });

  describe("moving on the doll like the screen layout", function () {
    it("goes Head, Body, Legs with Up and Down", function () {
      onDoll(HEAD);
      cursor.move(0, 1);
      expect(cursor.index).toBe(BODY);
      cursor.move(0, 1);
      expect(cursor.index).toBe(LEGS);
      cursor.move(0, 1);
      expect(cursor.index).toBe(LEGS);
      cursor.move(0, -1);
      cursor.move(0, -1);
      expect(cursor.index).toBe(HEAD);
      cursor.move(0, -1);
      expect(cursor.index).toBe(HEAD);
    });

    it("goes Melee, Body, Magic with Left and Right", function () {
      onDoll(MELEE);
      cursor.move(1, 0);
      expect(cursor.index).toBe(BODY);
      cursor.move(1, 0);
      expect(cursor.index).toBe(MAGIC);
      cursor.move(-1, 0);
      cursor.move(-1, 0);
      expect(cursor.index).toBe(MELEE);
      cursor.move(-1, 0);
      expect(cursor.index).toBe(MELEE);
    });

    it("sends Head and Legs sideways to the weapon slots", function () {
      onDoll(HEAD);
      cursor.move(-1, 0);
      expect(cursor.index).toBe(MELEE);
      onDoll(LEGS);
      cursor.move(1, 0);
      expect(cursor.index).toBe(MAGIC);
    });

    it("does not move up or down from the weapon slots", function () {
      onDoll(MAGIC);
      cursor.move(0, -1);
      cursor.move(0, 1);
      expect(cursor.index).toBe(MAGIC);
    });

    it("leaves Magic for the bag with Right, level with the slot", function () {
      onDoll(MAGIC);
      cursor.move(1, 0);
      expect(cursor.section).toBe("bag");
      expect(cursor.index).toBe(20); // row 2, column 0
    });

    it("enters the doll from bag column 0 with Left", function () {
      cursor.move(-1, 0);
      expect(cursor.section).toBe("equipment");
      expect(cursor.index).toBe(MAGIC);
    });
  });

  describe("Tab", function () {
    it("jumps to the doll and back, each side remembering its cell", function () {
      cursor.setBag(3, 4);
      cursor.switchSection();
      expect(cursor.section).toBe("equipment");
      expect(cursor.index).toBe(BODY);
      cursor.move(0, -1);
      cursor.switchSection();
      expect(cursor.section).toBe("bag");
      expect(cursor.index).toBe(34);
      cursor.switchSection();
      expect(cursor.index).toBe(HEAD);
    });
  });

  describe("skipping over items", function () {
    let grid;
    const gem = (name) => new Item({ id: name, name: name, value: 1 });

    beforeEach(function () {
      grid = new BagGrid();
    });

    it("jumps from an empty cell to the next item", function () {
      grid.place(gem("a"), 5, 0);
      cursor.move(1, 0, grid);
      expect(cursor.index).toBe(5);
    });

    it("jumps from an item to the next empty cell, or the next item", function () {
      grid.place(gem("a"), 0, 0);
      grid.place(gem("b"), 1, 0);
      grid.place(gem("c"), 3, 0);
      cursor.move(1, 0, grid);
      expect(cursor.index).toBe(1); // a different item straight away
      cursor.move(1, 0, grid);
      expect(cursor.index).toBe(2); // then the empty cell
      cursor.move(1, 0, grid);
      expect(cursor.index).toBe(3);
    });

    it("crosses a tall item in one press", function () {
      const blade = new MeleeWeapon({ id: "b", name: "Blade" }); // 1x3
      grid.place(blade, 0, 1);
      cursor.setBag(1, 0);
      cursor.move(0, 1, grid);
      expect(cursor.index).toBe(40); // row 4, below rows 1 to 3
      cursor.move(0, -1, grid);
      expect(cursor.index).toBe(30); // row 3, the blade again
      cursor.move(0, -1, grid);
      expect(cursor.index).toBe(0);
    });

    it("stops at the edge of an empty bag", function () {
      cursor.move(1, 0, grid);
      expect(cursor.index).toBe(9);
      cursor.move(0, 1, grid);
      expect(cursor.index).toBe(59);
    });
  });

  it("maps arrow keys and WASD to moves", function () {
    expect(moveInventoryCursorForKey(cursor, 39)).toBe(true);
    expect(moveInventoryCursorForKey(cursor, 83)).toBe(true);
    expect(cursor.index).toBe(11);
    expect(moveInventoryCursorForKey(cursor, 65)).toBe(true);
    expect(moveInventoryCursorForKey(cursor, 38)).toBe(true);
    expect(cursor.index).toBe(0);
    expect(moveInventoryCursorForKey(cursor, 81)).toBe(false);
  });

  describe("repeatInventoryMoves", function () {
    let repeats;
    beforeEach(function () {
      repeats = [new KeyRepeat(), new KeyRepeat(), new KeyRepeat(), new KeyRepeat()];
    });

    it("moves again after the first delay while an arrow is held", function () {
      const isDown = (code) => code === 39;
      let moves = 0;
      for (let frame = 0; frame < 20; frame++) {
        if (repeatInventoryMoves(cursor, repeats, isDown)) {
          moves++;
        }
      }
      expect(moves).toBe(2); // frames 12 and 16 of the hold
      expect(cursor.index).toBe(2);
    });

    it("does nothing with no key held and restarts the delay on release", function () {
      for (let frame = 0; frame < 10; frame++) {
        repeatInventoryMoves(cursor, repeats, (code) => code === 40);
      }
      repeatInventoryMoves(cursor, repeats, () => false);
      expect(cursor.index).toBe(0);
      expect(repeats[3].held).toBe(-1);
    });

    it("also reads WASD", function () {
      for (let frame = 0; frame < 13; frame++) {
        repeatInventoryMoves(cursor, repeats, (code) => code === 68);
      }
      expect(cursor.index).toBe(1);
    });
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

describe("syncInventoryCursorToSelection", function () {
  it("moves the cursor to a clicked bag item and an equipped item", function () {
    const inventory = new Player(0, 0, "Fire").inventory;
    const cursor = new InventoryCursor();
    syncInventoryCursorToSelection(cursor, inventory, { sourceKind: "bag", index: 5 });
    expect(cursor.section).toBe("bag");
    expect(cursor.index).toBe(5);
    syncInventoryCursorToSelection(cursor, inventory, {
      sourceKind: "equipment", equipmentName: "head"
    });
    expect(cursor.section).toBe("equipment");
    expect(cursor.index).toBe(Object.keys(PLAYER_EQUIPMENT_TYPES).indexOf("head"));
  });

  it("leaves the cursor alone when nothing is selected", function () {
    const cursor = new InventoryCursor();
    cursor.index = 3;
    syncInventoryCursorToSelection(cursor, new Player(0, 0, "Fire").inventory, null);
    expect(cursor.index).toBe(3);
  });
});
