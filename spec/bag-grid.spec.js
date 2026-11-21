describe("BagGrid", function () {
  const sword = () => new MeleeWeapon({ id: "sword", name: "Sword", baseId: "sword" });
  const potion = () => new Consumable({ id: "potion", name: "Potion", maxStackSize: 5 });

  describe("itemSize", function () {
    const sizeOf = (item) => BagGrid.itemSize(item);

    it("sizes weapons by base id", function () {
      const melee = (baseId) => new MeleeWeapon({ id: baseId, name: baseId, baseId: baseId });
      const ranged = (baseId) => new ProjectileWeapon({ id: baseId, name: baseId, baseId: baseId });
      expect(sizeOf(melee("dagger"))).toEqual({ w: 1, h: 2 });
      expect(sizeOf(ranged("wand"))).toEqual({ w: 1, h: 2 });
      expect(sizeOf(melee("sword"))).toEqual({ w: 1, h: 3 });
      expect(sizeOf(melee("axe"))).toEqual({ w: 1, h: 3 });
      expect(sizeOf(ranged("staff"))).toEqual({ w: 1, h: 3 });
      expect(sizeOf(melee("spear"))).toEqual({ w: 1, h: 4 });
      expect(sizeOf(melee("hammer"))).toEqual({ w: 2, h: 3 });
    });

    it("gives any other weapon 1 by 3", function () {
      expect(sizeOf(new ProjectileWeapon({ id: "tome", name: "Tome", baseId: "tome" })))
        .toEqual({ w: 1, h: 3 });
      expect(sizeOf(new MeleeWeapon({ id: "x", name: "No base" }))).toEqual({ w: 1, h: 3 });
    });

    it("sizes armor by piece", function () {
      expect(sizeOf(new Helmet({ id: "h", name: "H" }))).toEqual({ w: 2, h: 2 });
      expect(sizeOf(new ChestArmor({ id: "c", name: "C" }))).toEqual({ w: 2, h: 3 });
      expect(sizeOf(new LegArmor({ id: "l", name: "L" }))).toEqual({ w: 2, h: 2 });
    });

    it("gives potions and other items one cell", function () {
      expect(sizeOf(potion())).toEqual({ w: 1, h: 1 });
      expect(sizeOf(new Item({ id: "gem", name: "Gem" }))).toEqual({ w: 1, h: 1 });
    });
  });

  describe("place and canPlace", function () {
    it("is 10 columns by 6 rows by default", function () {
      const grid = new BagGrid();
      expect(grid.columns).toBe(10);
      expect(grid.rows).toBe(6);
    });

    it("places an item and finds it in every cell it covers", function () {
      const grid = new BagGrid();
      const blade = sword();
      expect(grid.place(blade, 2, 1)).toBe(true);
      for (const row of [1, 2, 3]) {
        expect(grid.itemAt(2, row).item).toBe(blade);
      }
      expect(grid.itemAt(2, 4)).toBeNull();
      expect(grid.itemAt(3, 1)).toBeNull();
    });

    it("refuses an overlap, and the grid is unchanged", function () {
      const grid = new BagGrid();
      grid.place(sword(), 0, 0);
      expect(grid.canPlace(sword(), 0, 2)).toBe(false);
      expect(grid.place(sword(), 0, 2)).toBe(false);
      expect(grid.entries().length).toBe(1);
    });

    it("allows an item right next to another", function () {
      const grid = new BagGrid();
      grid.place(sword(), 0, 0);
      expect(grid.place(sword(), 1, 0)).toBe(true);
      expect(grid.place(sword(), 0, 3)).toBe(true);
    });

    it("refuses cells out of bounds, including negative and fractional ones", function () {
      const grid = new BagGrid();
      expect(grid.canPlace(sword(), 0, 4)).toBe(false); // 3 tall from row 4 leaves the grid
      expect(grid.canPlace(sword(), 10, 0)).toBe(false);
      expect(grid.canPlace(sword(), -1, 0)).toBe(false);
      expect(grid.canPlace(sword(), 0, -1)).toBe(false);
      expect(grid.canPlace(sword(), 0.5, 0)).toBe(false);
      expect(grid.canPlace(new Helmet({ id: "h", name: "H" }), 9, 0)).toBe(false);
      expect(grid.canPlace(new Helmet({ id: "h", name: "H" }), 8, 4)).toBe(true);
    });

    it("refuses to place the same gear twice", function () {
      const grid = new BagGrid();
      const blade = sword();
      grid.place(blade, 0, 0);
      expect(grid.place(blade, 5, 0)).toBe(false);
    });
  });

  describe("remove and itemAt", function () {
    it("removes an item and frees its cells", function () {
      const grid = new BagGrid();
      const blade = sword();
      grid.place(blade, 0, 0);
      expect(grid.remove(blade).item).toBe(blade);
      expect(grid.itemAt(0, 0)).toBeNull();
      expect(grid.place(sword(), 0, 0)).toBe(true);
    });

    it("returns null when removing an item that is not there", function () {
      expect(new BagGrid().remove(sword())).toBeNull();
    });

    it("returns null for a cell outside the grid", function () {
      expect(new BagGrid().itemAt(-1, 0)).toBeNull();
      expect(new BagGrid().itemAt(20, 20)).toBeNull();
    });
  });

  describe("autoPlace", function () {
    it("fills column by column, top to bottom", function () {
      const grid = new BagGrid();
      const first = grid.autoPlace(sword());
      const second = grid.autoPlace(sword());
      const third = grid.autoPlace(sword());
      expect([first.col, first.row]).toEqual([0, 0]);
      expect([second.col, second.row]).toEqual([0, 3]);
      expect([third.col, third.row]).toEqual([1, 0]);
    });

    it("uses a gap left by a removed item before a later column", function () {
      const grid = new BagGrid();
      const first = sword();
      grid.autoPlace(first);
      grid.autoPlace(sword());
      grid.remove(first);
      expect(grid.autoPlace(potion())).not.toBeNull();
      expect(grid.itemAt(0, 0).item.id).toBe("potion");
    });

    it("returns null when nothing fits and leaves the grid alone", function () {
      const grid = new BagGrid(1, 3);
      expect(grid.autoPlace(sword())).not.toBeNull();
      expect(grid.autoPlace(potion())).toBeNull();
      expect(grid.entries().length).toBe(1);
    });

    it("finds a gap a big item cannot use but a small one can", function () {
      const grid = new BagGrid(2, 3);
      grid.place(sword(), 0, 0);
      grid.place(potion(), 1, 0);
      expect(grid.autoPlace(sword())).toBeNull();
      expect(grid.autoPlace(potion())).not.toBeNull();
    });

    it("holds 20 swords in a full grid and no more", function () {
      const grid = new BagGrid();
      for (let i = 0; i < 20; i++) {
        expect(grid.autoPlace(sword())).not.toBeNull();
      }
      expect(grid.autoPlace(potion())).toBeNull();
    });
  });

  describe("entries and clone", function () {
    it("lists entries top to bottom, left to right", function () {
      const grid = new BagGrid();
      grid.place(potion(), 3, 1);
      grid.place(potion(), 5, 0);
      grid.place(potion(), 1, 1);
      expect(grid.entries().map((e) => [e.col, e.row])).toEqual([[5, 0], [1, 1], [3, 1]]);
    });

    it("clones without sharing entries", function () {
      const grid = new BagGrid();
      grid.place(potion(), 0, 0, 3);
      const copy = grid.clone();
      copy.itemAt(0, 0).quantity = 1;
      copy.autoPlace(sword());
      expect(grid.itemAt(0, 0).quantity).toBe(3);
      expect(grid.entries().length).toBe(1);
    });

    it("clear empties the grid", function () {
      const grid = new BagGrid();
      grid.autoPlace(sword());
      grid.clear();
      expect(grid.entries()).toEqual([]);
    });
  });
});
