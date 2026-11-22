describe("holding items in the bag", function () {
  let inventory;
  const sword = (name = "Sword") => new MeleeWeapon({ id: name, name: name, baseId: "sword" });
  const potion = () => new Consumable({
    id: "health-potion", name: "Health Potion", maxStackSize: 5, healthRestore: 2
  });
  const cell = (col, row) => {
    return inventoryUiLayout(inventory).bagSlots[row * INVENTORY_BAG_COLUMNS + col];
  };

  beforeEach(function () {
    inventory = new PlayerInventory();
  });

  describe("pick up and place", function () {
    it("picks an item up from any cell it covers", function () {
      const blade = sword();
      inventory.add(blade);
      const held = pickUpFromBag(inventory, 0, 2);
      expect(held.item).toBe(blade);
      expect([held.col, held.row]).toEqual([0, 0]);
      expect(inventory.size).toBe(0);
    });

    it("picks up nothing from an empty cell", function () {
      expect(pickUpFromBag(inventory, 4, 4)).toBeNull();
    });

    it("places a held item on free cells", function () {
      const blade = sword();
      inventory.add(blade);
      const held = pickUpFromBag(inventory, 0, 0);
      expect(placeHeld(inventory, held, 5, 1)).toBeNull();
      expect(inventory.grid.itemAt(5, 3).item).toBe(blade);
    });

    it("keeps an item inside the grid when placed near the edge", function () {
      const blade = sword();
      inventory.add(blade);
      const held = pickUpFromBag(inventory, 0, 0);
      expect(placeHeld(inventory, held, 9, 5)).toBeNull();
      expect([inventory.grid.entryOf(blade).col, inventory.grid.entryOf(blade).row])
        .toEqual([9, 3]);
    });

    it("swaps when the item covers exactly one other item", function () {
      const a = sword("A");
      const b = sword("B");
      inventory.add(a);
      inventory.add(b); // B at (0,3)
      const held = pickUpFromBag(inventory, 0, 0);
      const now = placeHeld(inventory, held, 0, 3);
      expect(now.item).toBe(b);
      expect(inventory.grid.entryOf(a).row).toBe(3);
      expect(inventory.grid.entryOf(b)).toBeNull();
    });

    it("does nothing when the item would cover two items", function () {
      const blade = sword("B");
      inventory.add(blade);
      const flask = potion();
      inventory.grid.place(flask, 1, 1);
      const hammer = new MeleeWeapon({ id: "hammer", name: "Hammer", baseId: "hammer" });
      const held = { item: hammer, quantity: 1, col: 5, row: 0 };
      expect(placeHeld(inventory, held, 0, 0)).toBe(held);
      expect(inventory.grid.entryOf(hammer)).toBeNull();
      expect(inventory.grid.entryOf(blade)).not.toBeNull();
      expect(inventory.grid.entryOf(flask)).not.toBeNull();
    });

    it("merges a held potion into a stack with room", function () {
      inventory.add(potion(), 3);
      inventory.add(sword());
      const stackSpot = inventory.grid.entries().find((e) => e.item instanceof Consumable);
      const held = { item: potion(), quantity: 1, col: 9, row: 0 };
      expect(placeHeld(inventory, held, stackSpot.col, stackSpot.row)).toBeNull();
      expect(inventory.quantityOf("health-potion")).toBe(4);
    });

    it("keeps the leftover in hand when a stack fills up", function () {
      inventory.add(potion(), 4);
      const spot = inventory.grid.entries()[0];
      const held = { item: potion(), quantity: 3, col: 9, row: 0 };
      const rest = placeHeld(inventory, held, spot.col, spot.row);
      expect(rest.quantity).toBe(2);
      expect(inventory.quantityOf("health-potion")).toBe(5);
    });

    it("does not place anything bigger than the grid", function () {
      const tiny = new PlayerInventory({ columns: 1, rows: 2 });
      const held = { item: sword(), quantity: 1, col: 0, row: 0 };
      expect(placeHeld(tiny, held, 0, 0)).toBe(held);
    });
  });

  describe("equipping a held item", function () {
    it("equips on the matching slot and holds the old piece", function () {
      const old = sword("Old");
      const next = sword("Next");
      inventory.add(old);
      inventory.equip(old);
      const held = { item: next, quantity: 1, col: 3, row: 0 };
      const now = equipHeld(inventory, held, "melee");
      expect(inventory.getEquipped("melee")).toBe(next);
      expect(now.item).toBe(old);
    });

    it("rejects a piece that does not belong in the slot", function () {
      const held = { item: sword(), quantity: 1, col: 0, row: 0 };
      expect(equipHeld(inventory, held, "head")).toBe(held);
      expect(equipHeld(inventory, held, "projectile")).toBe(held);
      expect(inventory.getEquipped("head")).toBeNull();
    });
  });

  describe("activateInventorySlot", function () {
    it("picks up with an empty hand and places with a full one", function () {
      const blade = sword();
      inventory.add(blade);
      let held = activateInventorySlot(inventory, null, cell(0, 1));
      expect(held.item).toBe(blade);
      held = activateInventorySlot(inventory, held, cell(4, 0));
      expect(held).toBeNull();
      expect(inventory.grid.entryOf(blade).col).toBe(4);
    });

    it("sends an equipped item to the bag when clicked with an empty hand", function () {
      const blade = sword();
      inventory.add(blade);
      inventory.equip(blade);
      const slot = inventoryUiLayout(inventory).equipmentSlots
        .find((s) => s.equipmentName === "melee");
      expect(activateInventorySlot(inventory, null, slot)).toBeNull();
      expect(inventory.getEquipped("melee")).toBeNull();
      expect(inventory.quantityOf(blade)).toBe(1);
    });

    it("ignores a click on nothing", function () {
      const held = { item: sword(), quantity: 1, col: 0, row: 0 };
      expect(activateInventorySlot(inventory, held, null)).toBe(held);
      expect(activateInventorySlot(inventory, null, null)).toBeNull();
    });
  });

  describe("releaseHeld", function () {
    it("puts the item back where it was", function () {
      const blade = sword();
      inventory.add(blade);
      inventory.add(sword("Other"));
      const held = pickUpFromBag(inventory, 0, 3);
      expect(releaseHeld(inventory, held)).toBeNull();
      expect(inventory.grid.entryOf(blade).row).toBe(0);
    });

    it("autoplaces when the old spot is taken", function () {
      const held = { item: sword(), quantity: 1, col: 0, row: 0 };
      inventory.add(sword("Taken"));
      expect(releaseHeld(inventory, held)).toBeNull();
      expect(inventory.size).toBe(2);
    });

    it("hands the item back when the bag is full, and ignores an empty hand", function () {
      for (let i = 0; i < 20; i++) {
        inventory.add(sword("S" + i));
      }
      const held = { item: sword("Late"), quantity: 1, col: 0, row: 0 };
      expect(releaseHeld(inventory, held)).toBe(held);
      expect(releaseHeld(inventory, null)).toBeNull();
    });
  });

  describe("drinkBagPotion", function () {
    it("drinks a potion and frees the cell with the last one", function () {
      const player = new Player(0, 0, "Fire");
      player.health = 1;
      player.inventory.add(potion());
      expect(drinkBagPotion(player)).toBe(true);
      expect(player.health).toBe(3);
      expect(player.inventory.size).toBe(0);
    });

    it("does nothing at full health, or with no potion", function () {
      const player = new Player(0, 0, "Fire");
      expect(drinkBagPotion(player)).toBe(false);
      player.inventory.add(potion());
      expect(drinkBagPotion(player)).toBe(false);
      expect(player.inventory.size).toBe(1);
    });
  });

  describe("spaceInventorySlot", function () {
    it("explains a wrong slot", function () {
      const held = { item: sword(), quantity: 1, col: 0, row: 0 };
      const head = inventoryUiLayout(inventory).equipmentSlots
        .find((s) => s.equipmentName === "head");
      const result = spaceInventorySlot(inventory, held, head);
      expect(result.held).toBe(held);
      expect(result.message).toBe("Wrong slot");
    });

    it("explains a spot that is taken", function () {
      inventory.add(sword("A"), 1);
      inventory.add(sword("B"), 1);
      const held = pickUpFromBag(inventory, 0, 0);
      inventory.grid.place(potion(), 0, 0);
      inventory.grid.place(potion(), 0, 1);
      const result = spaceInventorySlot(inventory, held, cell(0, 0));
      expect(result.message).toBe("Can't place there");
      expect(result.held).toBe(held);
    });

    it("says the bag is full when unequipping cannot fit the piece", function () {
      const blade = sword();
      inventory.swapEquipped(blade);
      for (let col = 0; col < INVENTORY_BAG_COLUMNS; col++) {
        for (let row = 0; row < INVENTORY_BAG_ROWS; row++) {
          inventory.grid.place(new Item({ id: "g", name: "G" }), col, row);
        }
      }
      const melee = inventoryUiLayout(inventory).equipmentSlots
        .find((s) => s.equipmentName === "melee");
      const result = spaceInventorySlot(inventory, null, melee);
      expect(result.message).toBe("Bag full");
      expect(inventory.getEquipped("melee")).toBe(blade);
    });

    it("gives no message when the pick up works", function () {
      inventory.add(sword());
      const result = spaceInventorySlot(inventory, null, cell(0, 0));
      expect(result.held).not.toBeNull();
      expect(result.message).toBe("");
    });
  });

  describe("enterInventorySlot", function () {
    let player;
    let room;

    beforeEach(function () {
      player = new Player(80, 80, "Fire", "Tall");
      inventory = player.inventory;
      room = { items: [] };
      inventory.grid.clear();
    });

    it("equips bag gear and puts the old piece in the freed cells", function () {
      const old = sword("Old");
      const next = sword("Next");
      inventory.swapEquipped(old);
      inventory.grid.place(next, 3, 1);
      const result = enterInventorySlot(player, room, null, cell(3, 2));
      expect(result.message).toBe("");
      expect(inventory.getEquipped("melee")).toBe(next);
      expect(inventory.grid.itemAt(3, 1).item).toBe(old);
      expect(inventory.grid.entryOf(next)).toBeNull();
    });

    it("equips into an empty slot and frees the cells", function () {
      const next = sword("Next");
      inventory.grid.place(next, 0, 0);
      enterInventorySlot(player, room, null, cell(0, 0));
      expect(inventory.getEquipped("melee")).toBe(next);
      expect(inventory.size).toBe(0);
    });

    it("puts the old piece in the first free spot when it does not fit the freed cells", function () {
      const old = new MeleeWeapon({ id: "h", name: "Hammer", baseId: "hammer" }); // 2x3
      const next = sword("Next"); // 1x3
      inventory.swapEquipped(old);
      inventory.grid.place(next, 9, 0); // a 2 wide piece does not fit the last column
      enterInventorySlot(player, room, null, cell(9, 0));
      expect(inventory.grid.entryOf(old)).not.toBeNull();
      expect(inventory.grid.entryOf(old).col).toBe(0);
      expect(room.items.length).toBe(0);
    });

    function fillBagExcept(freeItem) {
      for (let col = 0; col < INVENTORY_BAG_COLUMNS; col++) {
        for (let row = 0; row < INVENTORY_BAG_ROWS; row++) {
          inventory.grid.place(new Item({ id: "g", name: "G" }), col, row);
        }
      }
      const entry = inventory.grid.entryOf(freeItem);
      return entry;
    }

    it("drops the old piece on the floor when the bag has no room", function () {
      const old = new MeleeWeapon({ id: "h", name: "Hammer", baseId: "hammer" });
      const next = sword("Next");
      inventory.swapEquipped(old);
      inventory.grid.place(next, 0, 0);
      fillBagExcept(next);
      const result = enterInventorySlot(player, room, null, cell(0, 0));
      expect(inventory.getEquipped("melee")).toBe(next);
      expect(room.items.length).toBe(1);
      expect(room.items[0].item).toBe(old);
      expect(result.message).toContain("dropped");
    });

    it("refuses when the old piece is locked and has no room", function () {
      const old = new MeleeWeapon({ id: "h", name: "Hammer", baseId: "hammer" });
      old.locked = true;
      const next = sword("Next");
      inventory.swapEquipped(old);
      inventory.grid.place(next, 0, 0);
      fillBagExcept(next);
      const result = enterInventorySlot(player, room, null, cell(0, 0));
      expect(result.message).toBe("Bag full");
      expect(inventory.getEquipped("melee")).toBe(old);
      expect(inventory.grid.itemAt(0, 0).item).toBe(next);
      expect(room.items.length).toBe(0);
    });

    it("drinks a potion", function () {
      player.health = 1;
      inventory.grid.place(potion(), 2, 2, 2);
      const result = enterInventorySlot(player, room, null, cell(2, 2));
      expect(player.health).toBe(3);
      expect(result.message).toBe("");
      expect(inventory.grid.itemAt(2, 2).quantity).toBe(1);
    });

    it("says so when a potion cannot be used", function () {
      inventory.grid.place(potion(), 2, 2);
      const result = enterInventorySlot(player, room, null, cell(2, 2));
      expect(result.message).toBe("Can't use that now");
      expect(inventory.size).toBe(1);
    });

    it("says so for an item that cannot be worn", function () {
      inventory.grid.place(new Item({ id: "gem", name: "Gem" }), 1, 1);
      expect(enterInventorySlot(player, room, null, cell(1, 1)).message)
        .toBe("Can't equip that");
    });

    it("unequips from a doll slot and does nothing on an empty cell", function () {
      const blade = sword();
      inventory.swapEquipped(blade);
      const melee = inventoryUiLayout(inventory).equipmentSlots
        .find((s) => s.equipmentName === "melee");
      enterInventorySlot(player, room, null, melee);
      expect(inventory.getEquipped("melee")).toBeNull();
      expect(inventory.quantityOf(blade)).toBe(1);
      expect(enterInventorySlot(player, room, null, cell(9, 5)).held).toBeNull();
    });

    it("acts like Space when the hand is full", function () {
      const next = sword("Next");
      inventory.grid.place(next, 0, 0);
      const held = pickUpFromBag(inventory, 0, 0);
      const result = enterInventorySlot(player, room, held, cell(4, 0));
      expect(result.held).toBeNull();
      expect(inventory.grid.entryOf(next).col).toBe(4);
    });
  });

  describe("drinkBagPotion with a slot", function () {
    it("drinks the potion under the cursor before the first one", function () {
      const player = new Player(0, 0, "Fire");
      player.health = 1;
      const strong = new Consumable({
        id: "big", name: "Big", maxStackSize: 5, healthRestore: 2
      });
      player.inventory.grid.place(potion(), 0, 0);
      player.inventory.grid.place(strong, 3, 0);
      const slot = inventoryUiLayout(player.inventory).bagSlots[3];
      expect(drinkBagPotion(player, slot)).toBe(true);
      expect(player.inventory.grid.entryOf(strong)).toBeNull();
      expect(player.inventory.grid.entryOf(player.inventory.grid.itemAt(0, 0).item)).not.toBeNull();
    });
  });
});
