describe("PlayerInventory bag grid", function () {
  let inventory;
  const sword = (name = "Sword") => new MeleeWeapon({ id: name, name: name, baseId: "sword" });
  const potion = () => new Consumable({
    id: "health-potion", name: "Health Potion", maxStackSize: 5, healthRestore: 2, value: 5
  });

  beforeEach(function () {
    inventory = new PlayerInventory();
  });

  describe("adding", function () {
    it("autoplaces items column by column", function () {
      const a = sword("A");
      const b = sword("B");
      inventory.add(a);
      inventory.add(b);
      expect(inventory.grid.entryOf(a).row).toBe(0);
      expect(inventory.grid.entryOf(b).row).toBe(3);
      expect(inventory.size).toBe(2);
    });

    it("throws and changes nothing when nothing fits", function () {
      for (let i = 0; i < 20; i++) {
        inventory.add(sword("S" + i));
      }
      const extra = sword("Extra");
      expect(inventory.canAdd(extra)).toBe(false);
      expect(() => inventory.add(extra)).toThrow();
      expect(inventory.size).toBe(20);
      expect(inventory.quantityOf(extra)).toBe(0);
    });

    it("reports full once every column is used", function () {
      const small = new PlayerInventory({ columns: 2, rows: 3 });
      small.add(sword());
      expect(small.canAdd(sword("Two"))).toBe(true);
      small.add(sword("Two"));
      expect(small.canAdd(sword("Three"))).toBe(false);
      expect(small.canAdd(potion())).toBe(false);
    });

    it("rejects the same gear piece twice", function () {
      const blade = sword();
      inventory.add(blade);
      expect(inventory.canAdd(blade)).toBe(false);
    });

    it("rejects a non-item and a zero quantity without throwing from canAdd", function () {
      expect(inventory.canAdd({})).toBe(false);
      expect(inventory.canAdd(potion(), 0)).toBe(false);
    });

    it("keeps gold out of the grid", function () {
      inventory.add(new Gold(), 40);
      expect(inventory.gold).toBe(40);
      expect(inventory.size).toBe(0);
    });
  });

  describe("potion stacks", function () {
    it("stacks potions in one cell up to 5", function () {
      inventory.add(potion(), 3);
      inventory.add(potion(), 2);
      expect(inventory.size).toBe(1);
      expect(inventory.quantityOf("health-potion")).toBe(5);
    });

    it("starts a second stack after the fifth potion", function () {
      inventory.add(potion(), 5);
      inventory.add(potion());
      expect(inventory.size).toBe(2);
      expect(inventory.quantityOf("health-potion")).toBe(6);
    });

    it("spreads one big add over several cells", function () {
      inventory.add(potion(), 12);
      expect(inventory.size).toBe(3);
      expect(inventory.quantityOf("health-potion")).toBe(12);
    });

    it("refuses a stack that does not fit and keeps the old counts", function () {
      const small = new PlayerInventory({ columns: 1, rows: 1 });
      small.add(potion(), 4);
      expect(small.canAdd(potion(), 1)).toBe(true); // tops up the stack
      expect(small.canAdd(potion(), 2)).toBe(false); // the second one has no cell
      expect(() => small.add(potion(), 2)).toThrow();
      expect(small.quantityOf("health-potion")).toBe(4);
    });

    it("reports how many potions still fit", function () {
      const small = new PlayerInventory({ columns: 2, rows: 1 });
      small.add(potion(), 3);
      expect(small.findAvailableSpace(potion())).toBe(7);
    });
  });

  describe("consume", function () {
    it("frees the cell when the last potion is drunk", function () {
      const one = potion();
      inventory.add(one);
      const target = { health: 1, maxHealth: 5 };
      expect(inventory.consume(one, target)).toBe(true);
      expect(inventory.grid.itemAt(0, 0)).toBeNull();
      expect(inventory.size).toBe(0);
      expect(target.health).toBe(3);
    });

    it("keeps the cell while potions remain", function () {
      const stack = potion();
      inventory.add(stack, 2);
      inventory.consume(stack, { health: 1, maxHealth: 5 });
      expect(inventory.grid.itemAt(0, 0).quantity).toBe(1);
    });

    it("does not drink at full health", function () {
      const one = potion();
      inventory.add(one);
      expect(inventory.consume(one, { health: 5, maxHealth: 5 })).toBe(false);
      expect(inventory.size).toBe(1);
    });

    it("does not consume a sword or an item that is not in the bag", function () {
      const blade = sword();
      inventory.add(blade);
      expect(inventory.consume(blade, { health: 1, maxHealth: 5 })).toBe(false);
      expect(inventory.consume(potion(), { health: 1, maxHealth: 5 })).toBe(false);
    });
  });

  describe("remove", function () {
    it("frees the cells of a removed sword", function () {
      const blade = sword();
      inventory.add(blade);
      inventory.remove(blade);
      expect(inventory.grid.itemAt(0, 2)).toBeNull();
    });

    it("throws when asked for more than the bag holds", function () {
      inventory.add(potion(), 2);
      expect(() => inventory.remove("health-potion", 3)).toThrowError(RangeError);
      expect(inventory.quantityOf("health-potion")).toBe(2);
    });
  });

  describe("equip and unequip", function () {
    it("puts the replaced weapon where the new one was", function () {
      const old = sword("Old");
      const next = sword("Next");
      inventory.add(old);
      inventory.add(next);
      inventory.equip(old);
      const spot = inventory.grid.entryOf(next);
      inventory.equip(next);
      expect(inventory.getEquipped("melee")).toBe(next);
      const swapped = inventory.grid.entryOf(old);
      expect([swapped.col, swapped.row]).toEqual([spot.col, spot.row]);
    });

    it("rolls back when the replaced item has no room", function () {
      const small = new PlayerInventory({ columns: 3, rows: 3 });
      const old = new MeleeWeapon({ id: "h", name: "Hammer", baseId: "hammer" });
      const next = sword("Next");
      small.add(old);
      small.equip(old);
      small.add(next);
      small.add(potion());
      // The hammer (2x3) cannot return: the potion sits in the way.
      expect(() => small.equip(next)).toThrowError(RangeError);
      expect(small.getEquipped("melee")).toBe(old);
      expect(small.quantityOf(next)).toBe(1);
    });

    it("unequips into the first free spot, or stays equipped when full", function () {
      const small = new PlayerInventory({ columns: 1, rows: 3 });
      const blade = sword();
      small.add(blade);
      small.equip(blade);
      small.add(potion());
      expect(small.unequip("melee")).toBeNull();
      expect(small.getEquipped("melee")).toBe(blade);
    });
  });

  describe("sortBag", function () {
    it("keeps every item and every stack count", function () {
      const items = [sword("A"), potion(), new Helmet({ id: "h", name: "H" }), sword("B")];
      for (const item of items) {
        inventory.add(item, 1);
      }
      inventory.add(potion(), 2);
      inventory.sortBag();
      for (const item of items) {
        expect(inventory.grid.entryOf(item)).not.toBeNull();
      }
      expect(inventory.quantityOf("health-potion")).toBe(3);
      expect(inventory.size).toBe(items.length);
    });

    it("puts better rarity first, then bigger items", function () {
      const common = new MeleeWeapon({ id: "c", name: "Common", baseId: "sword" });
      const rare = new MeleeWeapon({ id: "r", name: "Rare", baseId: "sword", rarity: "rare" });
      inventory.add(potion());
      inventory.add(common);
      inventory.add(rare);
      inventory.sortBag();
      expect(inventory.grid.entryOf(rare).col).toBe(0);
      expect(inventory.grid.entryOf(rare).row).toBe(0);
      expect(inventory.grid.entryOf(common).row).toBe(3);
    });

    it("repacks holes left by removed items", function () {
      const a = sword("A");
      const b = sword("B");
      inventory.add(a);
      inventory.add(b);
      inventory.remove(a);
      inventory.sortBag();
      expect(inventory.grid.entryOf(b).row).toBe(0);
    });

    it("is harmless on an empty bag", function () {
      expect(inventory.sortBag()).toBe(true);
      expect(inventory.size).toBe(0);
    });
  });

  describe("transferTo", function () {
    it("moves a bag item to another inventory and frees its cells", function () {
      const chest = new Inventory();
      const blade = sword();
      inventory.add(blade);
      expect(inventory.transferTo(chest, blade)).toBe(true);
      expect(inventory.size).toBe(0);
      expect(chest.quantityOf(blade)).toBe(1);
    });

    it("fails without changes when the destination is full", function () {
      const full = new Inventory(0);
      const blade = sword();
      inventory.add(blade);
      expect(inventory.transferTo(full, blade)).toBe(false);
      expect(inventory.quantityOf(blade)).toBe(1);
    });
  });

  describe("saving", function () {
    it("round trips items with their cells", function () {
      const rare = generateWeapon(createRng(4), { rarity: "rare", kind: "melee" });
      inventory.add(rare);
      inventory.add(potion(), 3);
      inventory.add(sword("Plain"));
      inventory.grid.remove(inventory.grid.entries()[0].item); // leave a gap at the start
      const spots = inventory.grid.entries().map((e) => [e.item.name, e.col, e.row, e.quantity]);

      const saved = JSON.parse(JSON.stringify(serializeBag(inventory)));
      const loaded = new PlayerInventory();
      expect(loadBag(loaded, saved)).toBe(0);
      const loadedSpots = loaded.grid.entries().map((e) => [e.item.name, e.col, e.row, e.quantity]);
      expect(loadedSpots).toEqual(spots);
    });

    it("keeps weapon stats and affixes through a save", function () {
      const rare = generateWeapon(createRng(9), { rarity: "epic", kind: "ranged" });
      inventory.add(rare);
      const loaded = new PlayerInventory();
      loadBag(loaded, JSON.parse(JSON.stringify(serializeBag(inventory))));
      const back = loaded.grid.entries()[0].item;
      expect(back.damage).toBe(rare.damage);
      expect(back.affixes).toEqual(rare.affixes);
      expect(back.rarity).toBe("epic");
    });

    it("autoplaces items from an old save with no positions", function () {
      const saved = [sword("A"), sword("B")].map((item) => serializeItem(item));
      const loaded = new PlayerInventory();
      expect(loadBag(loaded, saved)).toBe(0);
      expect(loaded.size).toBe(2);
      expect(loaded.grid.entries().map((e) => [e.col, e.row])).toEqual([[0, 0], [0, 3]]);
    });

    it("autoplaces an item whose saved spot is taken or out of range", function () {
      const a = { ...serializeItem(sword("A")), col: 0, row: 0 };
      const b = { ...serializeItem(sword("B")), col: 0, row: 1 }; // overlaps A
      const c = { ...serializeItem(sword("C")), col: 99, row: 99 };
      const loaded = new PlayerInventory();
      expect(loadBag(loaded, [a, b, c])).toBe(0);
      expect(loaded.size).toBe(3);
    });

    it("counts items that no longer fit and skips broken entries", function () {
      const saved = [];
      for (let i = 0; i < 21; i++) {
        saved.push(serializeItem(sword("S" + i)));
      }
      saved.push({ v: 99, type: "melee" });
      saved.push(null);
      const loaded = new PlayerInventory();
      expect(loadBag(loaded, saved)).toBe(1);
      expect(loaded.size).toBe(20);
    });

    it("loads nothing from something that is not a list", function () {
      const loaded = new PlayerInventory();
      expect(loadBag(loaded, undefined)).toBe(0);
      expect(loadBag(loaded, "nope")).toBe(0);
      expect(loaded.size).toBe(0);
    });
  });
});
