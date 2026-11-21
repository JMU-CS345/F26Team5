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
});
