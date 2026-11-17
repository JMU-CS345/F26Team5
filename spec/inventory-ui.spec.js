describe("Inventory controls and context actions", () => {
  function playingGame() {
    const game = new Game();
    game.startCharacterSelect();
    game.selectClass("Fire");
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
