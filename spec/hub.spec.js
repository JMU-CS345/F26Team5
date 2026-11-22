describe("hub room", function () {
  const hubOnly = [HUB_TEMPLATE, ROOM_TEMPLATES.find((t) => t.role === "normal")];

  it("passes the template check and is the medium size", function () {
    expect(validateRoomTemplates(hubOnly)).toEqual([]);
    const medium = ROOM_SIZE_CLASSES.find((s) => s.name === "medium");
    expect(HUB_TEMPLATE.rows.length).toBe(medium.rows);
    expect(HUB_TEMPLATE.rows[0].length).toBe(medium.cols);
  });

  it("is not part of the dungeon room list", function () {
    expect(ROOM_TEMPLATES.some((t) => t.role === "hub")).toBe(false);
  });

  it("has no enemies, one open door, and a shopkeeper and a storyteller", function () {
    const hub = makeHubRoom(0, 0, 1);
    hub.onEnter();
    expect(hub.role).toBe("hub");
    expect(hub.enemies.length).toBe(0);
    expect(hub.cleared).toBe(true);
    expect(hub.exits.length).toBe(1);
    expect(hub.npcs.map((n) => n.name)).toEqual(["Shopkeeper", "Storyteller"]);
    const center = hub.getPlayerSpawn();
    expect(hub.collidesWithWall({ x: center.x - 8, y: center.y - 8, w: 16, h: 16 })).toBe(false);
  });

  it("walking into the door tile finds the exit", function () {
    const hub = makeHubRoom(0, 0, 2);
    const tile = hub.exits[0].tiles[0];
    const px = hub.x + (tile.col + 0.5) * TILE_SIZE;
    const py = hub.y + (tile.row + 0.5) * TILE_SIZE;
    expect(hub.getExitAt(px, py)).not.toBeNull();
  });

  it("tells a different story in each dungeon", function () {
    const lines = [1, 2, 3].map((t) => makeHubRoom(0, 0, t).npcs[1].dialogue[0]);
    expect(new Set(lines).size).toBe(3);
  });

  it("must not be too big for the screen", function () {
    const tall = { name: "big", role: "hub", rows: HUB_TEMPLATE.rows.concat(HUB_TEMPLATE.rows) };
    expect(validateRoomTemplates([tall, hubOnly[1]]).length).toBeGreaterThan(0);
  });
});

describe("shop", function () {
  let player;
  let lootRun;

  function sword(value, locked) {
    const item = new Weapon({ id: "w" + value + locked, name: "Sword", value: value, damage: 3 });
    item.locked = locked;
    return item;
  }

  beforeEach(function () {
    player = new Player(0, 0, "Fire");
    lootRun = new LootRun(7);
  });

  it("lists buy potion, buy armor, sell and leave", function () {
    expect(SHOP_CHOICES.map((c) => c.id)).toEqual(["potion", "armor", "sell", "leave"]);
  });

  it("buys a potion for 30 gold", function () {
    player.inventory.add(new Gold(), 100);
    expect(shopChoose("potion", player, lootRun, 1)).toContain("Bought Health Potion");
    expect(player.inventory.gold).toBe(70);
    expect(player.inventory.quantityOf("health-potion")).toBeGreaterThan(0);
  });

  it("refuses a purchase without enough gold and changes nothing", function () {
    player.inventory.add(new Gold(), 29);
    expect(shopChoose("potion", player, lootRun, 1)).toContain("Not enough gold");
    expect(player.inventory.gold).toBe(29);
    expect(player.inventory.quantityOf("health-potion")).toBe(0);
  });

  it("buys one armor piece for 90 gold", function () {
    player.inventory.add(new Gold(), 100);
    const before = player.inventory.grid.entries().length;
    shopChoose("armor", player, lootRun, 2);
    const bought = player.inventory.grid.entries().filter((e) => e.item instanceof Armor);
    expect(player.inventory.gold).toBe(10);
    expect(player.inventory.grid.entries().length).toBe(before + 1);
    expect(bought.length).toBeGreaterThan(0);
  });

  it("keeps the gold when the bag is full", function () {
    player.inventory.add(new Gold(), 100);
    let n = 0;
    while (player.inventory.canAdd(sword(n, false))) {
      player.inventory.add(sword(n, false));
      n++;
    }
    expect(shopChoose("potion", player, lootRun, 1)).toContain("bag is full");
    expect(player.inventory.gold).toBe(100);
  });

  it("sells unlocked gear for its value and skips locked gear", function () {
    player.inventory.add(sword(10, false));
    player.inventory.add(sword(20, false));
    player.inventory.add(sword(99, true));
    const goldBefore = player.inventory.gold;
    expect(shopChoose("sell", player, lootRun, 1)).toContain("Sold 2 for 30 gold");
    expect(player.inventory.gold).toBe(goldBefore + 30);
    const left = player.inventory.grid.entries().map((e) => e.item.value);
    expect(left).toContain(99);
    expect(left).not.toContain(10);
  });

  it("does not sell potions, and says so when there is nothing to sell", function () {
    player.inventory.add(makePotion());
    const potions = player.inventory.quantityOf("health-potion");
    expect(shopChoose("sell", player, lootRun, 1)).toContain("Nothing to sell");
    expect(player.inventory.quantityOf("health-potion")).toBe(potions);
  });
});
