describe("bag", function () {
  function makeRoom() {
    return new TemplateRoom(0, 0, parseRoomTemplate({
      name: "t",
      role: "normal",
      rows: [
        "################",
        "#..............#",
        "#..............#",
        "#..............#",
        "+..............#",
        "+..............#",
        "#..............#",
        "#..............#",
        "#..............#",
        "################"
      ]
    }));
  }

  function sword(name, rarity = "common") {
    return new MeleeWeapon({ id: "s-" + name, name: name, rarity: rarity });
  }

  function newPlayer() {
    return new Player(80, 80, "Fire", "Tall");
  }

  function fillBag(player, count) {
    for (let i = 0; i < count; i++) {
      player.inventory.add(sword("Filler " + i));
    }
  }

  function selectionOf(inventory, item) {
    const slot = inventoryUiLayout(inventory).bagSlots.find((s) => s.item === item);
    return inventorySelectionFromSlot(slot);
  }

  describe("capacity", function () {
    it("is a grid of 60 cells, 10 by 6", function () {
      const player = newPlayer();
      expect(player.inventory.capacity).toBe(60);
      expect(INVENTORY_BAG_COLUMNS).toBe(10);
      expect(INVENTORY_BAG_ROWS).toBe(6);
      expect(inventoryUiLayout(player.inventory).bagSlots.length).toBe(60);
    });

    it("refuses a 21st sword but still takes gold", function () {
      const player = newPlayer();
      fillBag(player, 20); // a sword is 1 by 3, so the grid holds 20
      expect(player.inventory.canAdd(sword("Extra"))).toBe(false);
      expect(() => player.inventory.add(sword("Extra"))).toThrow();
      expect(player.inventory.canAdd(new Gold(), 10)).toBe(true);
    });

    it("keeps every bag slot inside the inventory panel", function () {
      const slots = inventoryUiLayout(newPlayer().inventory).bagSlots;
      for (const slot of slots) {
        expect(slot.x + slot.w).toBeLessThanOrEqual(INVENTORY_PANEL.x + INVENTORY_PANEL.w);
        expect(slot.y + slot.h).toBeLessThanOrEqual(INVENTORY_PANEL.y + INVENTORY_PANEL.h);
      }
    });
  });

  describe("picking up floor weapons", function () {
    let room;
    let player;
    let drop;

    beforeEach(function () {
      room = makeRoom();
      drop = new ItemDrop(80, 80, sword("Floor Blade", "rare"));
      room.items.push(drop);
      player = newPlayer();
    });

    it("puts the weapon in the bag without equipping it", function () {
      const old = sword("Old");
      player.inventory.add(old);
      player.inventory.equip(old);
      expect(useWeaponDrop(player, room, drop)).toBe("picked");
      expect(player.inventory.getEquipped("melee")).toBe(old);
      expect(player.inventory.quantityOf(drop.item)).toBe(1);
      expect(room.items.length).toBe(0);
    });

    it("swaps with the equipped weapon when the bag is full", function () {
      const old = sword("Old");
      player.inventory.add(old);
      player.inventory.equip(old);
      fillBag(player, 20);
      expect(player.inventory.canAdd(drop.item)).toBe(false);
      expect(useWeaponDrop(player, room, drop)).toBe("swapped");
      expect(player.inventory.getEquipped("melee")).toBe(drop.item);
      expect(room.items.length).toBe(1);
      expect(room.items[0].item).toBe(old);
      expect(player.inventory.size).toBe(20);
    });

    it("leaving the weapon changes nothing", function () {
      fillBag(player, 20);
      expect(player.inventory.size).toBe(20);
      expect(room.items).toEqual([drop]);
      expect(pickupItemDrops(player, room)).toEqual([]);
      expect(room.items).toEqual([drop]);
    });

    it("does nothing for a drop that is gone", function () {
      room.items = [];
      expect(pickUpWeaponDrop(player, room, drop)).toBe(false);
      expect(useWeaponDrop(player, room, drop)).toBeNull();
    });

    it("does not pick up the same drop twice", function () {
      expect(pickUpWeaponDrop(player, room, drop)).toBe(true);
      expect(pickUpWeaponDrop(player, room, drop)).toBe(false);
      expect(player.inventory.quantityOf(drop.item)).toBe(1);
    });
  });

  describe("equip with Enter", function () {
    it("equips the selected bag item", function () {
      const player = newPlayer();
      const blade = sword("Blade");
      player.inventory.add(blade);
      expect(equipSelected(player.inventory, selectionOf(player.inventory, blade))).toBe(true);
      expect(player.inventory.getEquipped("melee")).toBe(blade);
    });

    it("unequips a selected equipped item, and ignores no selection", function () {
      const player = newPlayer();
      const blade = sword("Blade");
      player.inventory.add(blade);
      player.inventory.equip(blade);
      const layout = inventoryUiLayout(player.inventory);
      const slot = layout.equipmentSlots.find((s) => s.equipmentName === "melee");
      expect(equipSelected(player.inventory, inventorySelectionFromSlot(slot))).toBe(true);
      expect(player.inventory.getEquipped("melee")).toBeNull();
      expect(equipSelected(player.inventory, null)).toBe(false);
    });

    it("does not equip a potion", function () {
      const player = newPlayer();
      const potion = makePotion();
      player.inventory.add(potion);
      expect(equipSelected(player.inventory, selectionOf(player.inventory, potion))).toBe(false);
    });
  });

  describe("sort, lock and drop", function () {
    it("sorts weapons by rarity, best first, then armor, then potions", function () {
      const player = newPlayer();
      const potion = makePotion();
      const robe = new ChestArmor({ id: "robe", name: "Robe" });
      const common = sword("Common");
      const epic = sword("Epic", "epic");
      const rare = sword("Rare", "rare");
      for (const item of [potion, common, robe, rare, epic]) {
        player.inventory.add(item);
      }
      player.inventory.sortBag();
      const order = player.inventory.grid.entries()
        .sort((a, b) => a.col - b.col || a.row - b.row)
        .map((e) => e.item);
      expect(order).toEqual([epic, rare, common, robe, potion]);
      expect(player.inventory.contents()[0].slotIndex).toBe(0);
    });

    it("keeps stack counts when sorting", function () {
      const player = newPlayer();
      player.inventory.add(makePotion(), 3);
      player.inventory.add(sword("Blade"));
      player.inventory.sortBag();
      expect(player.inventory.quantityOf("health-potion")).toBe(3);
      expect(player.inventory.size).toBe(2);
    });

    it("locks and unlocks an item", function () {
      const player = newPlayer();
      const blade = sword("Blade");
      player.inventory.add(blade);
      const selection = selectionOf(player.inventory, blade);
      expect(blade.locked).toBe(false);
      toggleLock(selection);
      expect(blade.locked).toBe(true);
      toggleLock(selection);
      expect(blade.locked).toBe(false);
    });

    it("drops a bag item at the player's feet and does not grab it right back", function () {
      const room = makeRoom();
      const player = newPlayer();
      const blade = sword("Blade");
      const robe = new ChestArmor({ id: "robe", name: "Robe" });
      player.inventory.add(blade);
      player.inventory.add(robe);
      expect(dropBagItem(player, room, selectionOf(player.inventory, robe))).toBe(true);
      expect(player.inventory.quantityOf(robe)).toBe(0);
      expect(room.items.length).toBe(1);
      expect(pickupItemDrops(player, room)).toEqual([]);
      player.pos.set(300, 100);
      expect(pickupItemDrops(player, room)).toEqual([]);
      player.pos.set(80, 80);
      expect(pickupItemDrops(player, room).length).toBe(1);
    });

    it("keeps a locked item", function () {
      const room = makeRoom();
      const player = newPlayer();
      const blade = sword("Blade");
      blade.locked = true;
      player.inventory.add(blade);
      expect(dropBagItem(player, room, selectionOf(player.inventory, blade))).toBe(false);
      expect(player.inventory.quantityOf(blade)).toBe(1);
      expect(room.items.length).toBe(0);
    });

    it("does not drop equipped gear", function () {
      const room = makeRoom();
      const player = newPlayer();
      const blade = sword("Blade");
      player.inventory.add(blade);
      player.inventory.equip(blade);
      const slot = inventoryUiLayout(player.inventory).equipmentSlots
        .find((s) => s.equipmentName === "melee");
      expect(dropBagItem(player, room, inventorySelectionFromSlot(slot))).toBe(false);
    });
  });

  describe("moving the selection with the arrow keys", function () {
    it("starts on the first item and steps over empty slots", function () {
      const player = newPlayer();
      const a = sword("A");
      const b = sword("B");
      player.inventory.add(a);
      player.inventory.add(b);
      let selection = moveBagSelection(player.inventory, null, 1, 0);
      expect(selection.item).toBe(a);
      selection = moveBagSelection(player.inventory, selection, 0, 1); // a covers 3 cells
      expect(selection.item).toBe(b);
      selection = moveBagSelection(player.inventory, selection, 0, 1);
      expect(selection.item).toBe(b);
      selection = moveBagSelection(player.inventory, selection, 0, -1);
      expect(selection.item).toBe(a);
      selection = moveBagSelection(player.inventory, selection, 1, 0);
      expect(selection.item).toBe(a);
    });

    it("returns null for an empty bag", function () {
      expect(moveBagSelection(newPlayer().inventory, null, 1, 0)).toBeNull();
    });
  });

  describe("sell value and borders", function () {
    it("shows the sell value on the item card lines", function () {
      const blade = generateWeapon(createRng(3), { rarity: "rare", kind: "melee" });
      const lines = inventoryItemInformation(blade);
      expect(lines).toContain("Sell value: " + blade.value + " gold");
      expect(lines).toContain("Rarity: Rare");
      expect(inventoryItemInformation(makePotion())).toContain("Sell value: 5 gold");
    });

    it("has a border color for every rarity", function () {
      for (const id of RARITY_IDS) {
        expect(getRarity(id).color.length).toBe(3);
      }
    });
  });
});
