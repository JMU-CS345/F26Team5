// Specs for the debug menu: its keys, its lists, and what each kind of entry does to the run.
describe("debug menu keys", function () {
  it("maps the movement keys, arrows, Enter, Space and the close keys", function () {
    expect(getDebugMenuAction("w", 87)).toEqual({ type: "row", step: -1 });
    expect(getDebugMenuAction("ArrowDown", 40)).toEqual({ type: "row", step: 1 });
    expect(getDebugMenuAction("PageDown", 34)).toEqual({ type: "row", step: 8 });
    expect(getDebugMenuAction("a", 65)).toEqual({ type: "tab", step: -1 });
    expect(getDebugMenuAction("ArrowRight", 39)).toEqual({ type: "tab", step: 1 });
    expect(getDebugMenuAction("Enter", 13)).toEqual({ type: "activate" });
    expect(getDebugMenuAction(" ", 32)).toEqual({ type: "activate" });
    expect(getDebugMenuAction("Escape", 27)).toEqual({ type: "close" });
    expect(getDebugMenuAction("`", 192)).toEqual({ type: "close" });
    expect(getDebugMenuAction("F4", 115)).toEqual({ type: "close" });
  });

  it("ignores other keys, so the game's keys do nothing while it is open", function () {
    expect(getDebugMenuAction("q", 81)).toBeNull();
    expect(getDebugMenuAction("e", 69)).toBeNull();
    expect(getDebugMenuAction("i", 73)).toBeNull();
  });

  it("opens and closes with F4 or the backtick", function () {
    expect(isDebugMenuToggleKey("F4", 115)).toBe(true);
    expect(isDebugMenuToggleKey("`", 192)).toBe(true);
    expect(isDebugMenuToggleKey("e", 69)).toBe(false);
  });
});

describe("DebugMenu", function () {
  let menu;
  beforeEach(function () {
    menu = new DebugMenu();
  });

  it("starts closed and toggles", function () {
    expect(menu.open).toBe(false);
    menu.toggle();
    expect(menu.open).toBe(true);
    menu.close();
    expect(menu.open).toBe(false);
  });

  it("has an Enemies, Money, Items and Player & Room category, none of them empty", function () {
    expect(menu.categories.map((c) => c.name)).toEqual(["Enemies", "Money", "Items", "Player & Room"]);
    for (const category of menu.categories) {
      expect(category.entries.length).toBeGreaterThan(0);
    }
  });

  it("lists every enemy type, every kind of money and every weapon", function () {
    const labels = (name) => menu.categories.find((c) => c.name === name).entries.map(debugEntryLabel);
    expect(labels("Enemies")).toEqual(ENEMY_TYPE_NAMES);
    for (const id of MONEY_IDS) {
      expect(labels("Money").some((label) => label.startsWith(MONEY_TYPES[id].name))).toBe(true);
    }
    for (const name of Object.keys(WEAPON_DEFS)) {
      expect(labels("Items")).toContain(WEAPON_DEFS[name].options.name);
    }
  });

  it("moves the pick and wraps round both ends", function () {
    const count = menu.entries.length;
    menu.moveRow(-1);
    expect(menu.row).toBe(count - 1);
    menu.moveRow(1);
    expect(menu.row).toBe(0);
    menu.moveRow(8);
    expect(menu.row).toBe(8 % count);
  });

  it("changes category, wraps, and remembers the pick in each", function () {
    menu.moveRow(3);
    menu.moveTab(1);
    expect(menu.tab).toBe(1);
    expect(menu.row).toBe(0);
    menu.moveTab(-1);
    expect(menu.row).toBe(3);
    menu.moveTab(-1);
    expect(menu.tab).toBe(menu.categories.length - 1);
    menu.moveTab(1);
    expect(menu.tab).toBe(0);
  });

  it("keeps the message of the entry it ran", function () {
    const ctx = { run: fakeRun(), dialogue: new DialogueBox() };
    expect(menu.activate(ctx)).toBe("Spawned " + ENEMY_TYPE_NAMES[0]);
    expect(menu.message).toBe("Spawned " + ENEMY_TYPE_NAMES[0]);
  });
});

// A run with just a room and a player, which is all the menu uses.
function fakeRun(room = new NormalRoom(0, 0, 320, 320)) {
  const player = new Player(150, 150);
  return { room, player };
}

function entryNamed(menu, category, label) {
  const entries = menu.categories.find((c) => c.name === category).entries;
  const entry = entries.find((e) => debugEntryLabel(e) === label || debugEntryLabel(e).startsWith(label));
  expect(entry).toBeDefined();
  return entry;
}

describe("debug menu spawning", function () {
  let run;
  let menu;
  let ctx;
  beforeEach(function () {
    run = fakeRun();
    menu = new DebugMenu();
    ctx = { run, dialogue: new DialogueBox() };
  });

  it("finds a free spot beside the player, in front first", function () {
    run.player.facing = "right";
    const spot = findDebugSpawnSpot(run, 16, 16);
    const center = run.player.getCenter();
    expect(spot.x + 8).toBeGreaterThan(center.x + 40);
    expect(Math.abs(spot.y + 8 - center.y)).toBeLessThan(1);
  });

  it("finds no spot in a room with no free floor", function () {
    const tiny = new NormalRoom(0, 0, 48, 48); // one floor tile inside the walls
    expect(findDebugSpawnSpot(fakeRun(tiny), 16, 16)).toBeNull();
  });

  it("spawns every enemy type as a harmless, appearing enemy clear of walls, pits and the player", function () {
    for (const name of ENEMY_TYPE_NAMES) {
      run.room.enemies = [];
      const message = entryNamed(menu, "Enemies", name).run(ctx);
      expect(message).toBe("Spawned " + name);
      expect(run.room.enemies.length).toBe(1);
      const enemy = run.room.enemies[0];
      expect(enemy.typeName).toBe(name);
      expect(enemy.isSpawning()).toBe(true);
      expect(run.room.collidesWithWall(enemy.getBounds())).toBe(false);
      expect(run.room.overlapsPit(enemy.getBounds())).toBe(false);
      expect(rectsOverlap(enemy.getBounds(), run.player.getBounds())).toBe(false);
    }
  });

  it("does not stack a second enemy on the first", function () {
    entryNamed(menu, "Enemies", "Jelly").run(ctx);
    entryNamed(menu, "Enemies", "Jelly").run(ctx);
    const [a, b] = run.room.enemies;
    expect(rectsOverlap(a.getBounds(), b.getBounds())).toBe(false);
  });

  it("says so when there is no room for an enemy", function () {
    ctx.run = fakeRun(new NormalRoom(0, 0, 48, 48));
    expect(entryNamed(menu, "Enemies", "Jelly").run(ctx)).toContain("No free spot");
    expect(ctx.run.room.enemies).toEqual([]);
  });

  it("marks the room not cleared when an enemy is spawned into it", function () {
    run.room.cleared = true;
    entryNamed(menu, "Enemies", "Bat").run(ctx);
    expect(run.room.cleared).toBe(false);
  });

  it("drops one piece of money, falling, worth its value", function () {
    entryNamed(menu, "Money", "Blue Gem").run(ctx);
    expect(run.room.items.length).toBe(1);
    const drop = run.room.items[0];
    expect(drop instanceof MoneyDrop).toBe(true);
    expect(drop.money.id).toBe("blueGem");
    expect(drop.quantity).toBe(50);
    expect(drop.landed).toBe(false);
  });

  it("drops a gold shower worth exactly what it says", function () {
    entryNamed(menu, "Money", "Gold shower").run(ctx);
    expect(run.room.items.length).toBeGreaterThan(1);
    expect(run.room.items.reduce((sum, drop) => sum + drop.quantity, 0)).toBe(DEBUG_SHOWER_GOLD);
  });

  it("gives weapons and armor to the player's bag", function () {
    entryNamed(menu, "Items", "Freezer").run(ctx);
    entryNamed(menu, "Items", "Iron Helm").run(ctx);
    expect(run.player.inventory.quantityOf("freezer")).toBe(1);
    expect(run.player.inventory.quantityOf("iron-helm")).toBe(1);
    expect(run.room.items).toEqual([]);
  });

  it("gives potions as a stack", function () {
    entryNamed(menu, "Items", "Health Potion x5").run(ctx);
    expect(run.player.inventory.quantityOf("health-potion")).toBe(5);
  });

  it("drops an item on the floor when the bag is full", function () {
    run.player.inventory = new PlayerInventory(2); // a small bag, filled up
    run.player.inventory.add(createWeapon("Freezer"));
    run.player.inventory.add(createWeapon("Fireballer"));
    const message = entryNamed(menu, "Items", "Dreamcatcher").run(ctx);
    expect(message).toContain("dropped");
    expect(run.room.items.length).toBe(1);
    expect(run.room.items[0].item.id).toBe("dreamcatcher");
  });
});

describe("debug menu player and room entries", function () {
  let run;
  let menu;
  let ctx;
  beforeEach(function () {
    run = fakeRun();
    menu = new DebugMenu();
    ctx = { run, dialogue: new DialogueBox() };
    debugTools.invincible = false;
    debugTools.overlay = false;
  });
  afterEach(function () {
    debugTools.invincible = false;
    debugTools.overlay = false;
  });

  it("heals the player to full", function () {
    run.player.health = 1;
    entryNamed(menu, "Player & Room", "Heal to full").run(ctx);
    expect(run.player.health).toBe(run.player.maxHealth);
  });

  it("adds gold", function () {
    entryNamed(menu, "Player & Room", "Add 100 gold").run(ctx);
    entryNamed(menu, "Player & Room", "Add 1000 gold").run(ctx);
    expect(run.player.inventory.gold).toBe(1100);
  });

  it("toggles invincibility and shows the state in its label", function () {
    const entry = entryNamed(menu, "Player & Room", "Invincible");
    expect(debugEntryLabel(entry)).toBe("Invincible: OFF");
    entry.run(ctx);
    expect(debugTools.invincible).toBe(true);
    expect(debugEntryLabel(entry)).toBe("Invincible: ON");
    entry.run(ctx);
    expect(debugTools.invincible).toBe(false);
  });

  it("toggles the enemy hitbox overlay", function () {
    const entry = entryNamed(menu, "Player & Room", "Enemy hitboxes");
    entry.run(ctx);
    expect(debugTools.overlay).toBe(true);
    expect(debugEntryLabel(entry)).toBe("Enemy hitboxes: ON");
  });

  it("kills every enemy in the room, so the next frame removes them and drops their money", function () {
    run.room.enemies = [new Enemy(40, 40, "Jelly"), new Enemy(80, 80, "Ghoul")];
    expect(entryNamed(menu, "Player & Room", "Kill all enemies").run(ctx)).toBe("Killed 2 enemies");
    expect(run.room.enemies.every((enemy) => enemy.isDead())).toBe(true);
    const dead = removeDeadEnemies(run.room);
    expect(dead.length).toBe(2);
    expect(dropMoneyFor(dead[0], run.room).length).toBeGreaterThan(0);
  });

  it("clears the room", function () {
    run.room.cleared = false;
    entryNamed(menu, "Player & Room", "Clear room").run(ctx);
    expect(run.room.cleared).toBe(true);
  });

  it("adds and removes the Elder NPC", function () {
    const entry = entryNamed(menu, "Player & Room", "Toggle Elder NPC");
    expect(entry.run(ctx)).toBe("Elder added");
    expect(run.room.npcs.length).toBe(1);
    expect(entry.run(ctx)).toBe("Elder removed");
    expect(run.room.npcs.length).toBe(0);
  });
});
