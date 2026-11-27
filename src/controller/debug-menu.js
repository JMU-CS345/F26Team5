// The debug menu: F4 (or `) opens a list of things to spawn or do, for testing. The sketch freezes
// the player while it is open, but the room keeps running, so spawned enemies act and money falls.
// This file is the menu's logic only (no drawing, see view/debug-menu-view.js), so Jasmine can test it.
// Load it after debug-tools.js. To add a thing to the menu, add an entry to a category in
// buildDebugCategories(): { label, run(ctx) }, where label is text or a function giving text, ctx is
// { run, dialogue } and run returns the message to show.

const DEBUG_SPAWN_DISTANCE = 72; // pixels from the player's middle to the first spot tried
const DEBUG_SHOWER_GOLD = 500; // the gold in the "gold shower"

// What a key does in the menu: { type: "row" | "tab" | "activate" | "close", step? }, or null.
// W and S or Up and Down pick an entry, A and D or Left and Right change category, PageUp and PageDown
// jump 8 entries, Enter or Space does it, Escape, F4 and ` close.
function getDebugMenuAction(key, keyCode) {
  const lower = typeof key === "string" ? key.toLowerCase() : "";
  if (keyCode === 38 || lower === "w") {
    return { type: "row", step: -1 };
  }
  if (keyCode === 40 || lower === "s") {
    return { type: "row", step: 1 };
  }
  if (keyCode === 33) {
    return { type: "row", step: -8 };
  }
  if (keyCode === 34) {
    return { type: "row", step: 8 };
  }
  if (keyCode === 37 || lower === "a") {
    return { type: "tab", step: -1 };
  }
  if (keyCode === 39 || lower === "d") {
    return { type: "tab", step: 1 };
  }
  if (keyCode === 13 || keyCode === 32) {
    return { type: "activate" };
  }
  if (keyCode === 27 || isDebugMenuToggleKey(key, keyCode)) {
    return { type: "close" };
  }
  return null;
}

// F4 (115) or the ` key opens and closes the menu.
function isDebugMenuToggleKey(key, keyCode) {
  return keyCode === 115 || key === "`";
}

// The text of an entry, which may be a string or a function (for entries that show an on/off state).
function debugEntryLabel(entry) {
  return typeof entry.label === "function" ? entry.label() : entry.label;
}

class DebugMenu {
  constructor(categories = buildDebugCategories()) {
    this.categories = categories;
    this.open = false;
    this.tab = 0;
    this.rows = categories.map(() => 0); // each category remembers which entry was picked
    this.message = ""; // what the last entry said it did
  }

  toggle() {
    this.open = !this.open;
  }

  close() {
    this.open = false;
  }

  get entries() {
    return this.categories[this.tab].entries;
  }

  get row() {
    return this.rows[this.tab];
  }

  get selected() {
    return this.entries[this.row];
  }

  // Moves the pick up or down, wrapping round the ends.
  moveRow(step) {
    const count = this.entries.length;
    this.rows[this.tab] = (((this.row + step) % count) + count) % count;
  }

  // Moves to the next or previous category, wrapping round the ends.
  moveTab(step) {
    const count = this.categories.length;
    this.tab = (((this.tab + step) % count) + count) % count;
  }

  // Does the picked entry. Returns its message, which the menu also keeps to show.
  activate(ctx) {
    this.message = this.selected.run(ctx);
    return this.message;
  }
}

// A free spot near the player for a w by h thing: the way the player faces first, then round the
// compass, near then far. Returns the top left corner as { x, y }, or null when nothing is free.
// Skips walls, pits and other enemies.
function findDebugSpawnSpot(run, w, h, distance = DEBUG_SPAWN_DISTANCE) {
  const room = run.room;
  const center = run.player.getCenter();
  const facing = run.player.facingVector();
  const first = Math.atan2(facing.y, facing.x);
  const turns = [0, 1, -1, 2, -2, 3, -3, 4];
  for (const reach of [distance, distance * 1.6, distance * 0.6]) {
    for (const turn of turns) {
      const angle = first + (turn * Math.PI) / 4;
      const box = {
        x: center.x + Math.cos(angle) * reach - w / 2,
        y: center.y + Math.sin(angle) * reach - h / 2,
        w,
        h
      };
      const free = !room.collidesWithWall(box)
        && !room.overlapsPit(box)
        && !room.enemies.some((enemy) => !enemy.isDead() && rectsOverlap(enemy.getBounds(), box));
      if (free) {
        return { x: box.x, y: box.y };
      }
    }
  }
  return null;
}

function debugSpawnEnemy(ctx, typeName) {
  const type = ENEMY_TYPES[typeName];
  const spot = findDebugSpawnSpot(ctx.run, type.length, type.width, Math.max(DEBUG_SPAWN_DISTANCE, type.length));
  if (spot === null) {
    return "No free spot near the player for " + typeName;
  }
  ctx.run.room.enemies.push(createEnemy(typeName, spot.x, spot.y, true));
  ctx.run.room.cleared = false;
  return "Spawned " + typeName;
}

// Drops one piece of money, falling onto a spot near the player.
function debugDropMoney(ctx, moneyId) {
  const spot = findDebugSpawnSpot(ctx.run, 16, 16);
  if (spot === null) {
    return "No free spot near the player";
  }
  ctx.run.room.items.push(...tossMoney([moneyId], spot.x + 8, spot.y + 8));
  return "Dropped a " + MONEY_TYPES[moneyId].name + " (" + MONEY_TYPES[moneyId].value + " gold)";
}

// Drops a pile of money worth `gold`, tossed out round a spot near the player.
function debugGoldShower(ctx, gold) {
  const spot = findDebugSpawnSpot(ctx.run, 16, 16, DEBUG_SPAWN_DISTANCE * 1.5);
  if (spot === null) {
    return "No free spot near the player";
  }
  const pieces = makeChange(gold);
  ctx.run.room.items.push(...tossMoney(pieces, spot.x + 8, spot.y + 8));
  return "Dropped " + pieces.length + " pieces worth " + gold + " gold";
}

// Puts an item in the player's bag, or on the floor near them when the bag cannot take it.
function debugGiveItem(ctx, item, quantity, label) {
  const inventory = ctx.run.player.inventory;
  if (inventory.canAdd(item, quantity)) {
    inventory.add(item, quantity);
    return "Gave " + label;
  }
  const spot = findDebugSpawnSpot(ctx.run, ITEM_DROP_SIZE, ITEM_DROP_SIZE);
  if (spot === null) {
    return "Bag full and no free spot for " + label;
  }
  ctx.run.room.items.push(new ItemDrop(spot.x, spot.y, item, quantity));
  return "Bag full: dropped " + label + " on the floor";
}

// Armor and potions for the menu. make() builds a fresh item each time it is used.
const DEBUG_ITEMS = Object.freeze([
  { label: "Health Potion", quantity: 1, make: () => debugPotion() },
  { label: "Health Potion x5", quantity: 5, make: () => debugPotion() },
  { label: "Apprentice Hood", quantity: 1, make: () => new Helmet({ id: "apprentice-hood", name: "Apprentice Hood", defense: 1 }) },
  { label: "Apprentice Robe", quantity: 1, make: () => new ChestArmor({ id: "apprentice-robe", name: "Apprentice Robe", defense: 1, description: "A light robe with basic protection." }) },
  { label: "Apprentice Trousers", quantity: 1, make: () => new LegArmor({ id: "apprentice-trousers", name: "Apprentice Trousers", defense: 1 }) },
  { label: "Iron Helm", quantity: 1, make: () => new Helmet({ id: "iron-helm", name: "Iron Helm", defense: 3 }) },
  { label: "Iron Chestplate", quantity: 1, make: () => new ChestArmor({ id: "iron-chestplate", name: "Iron Chestplate", defense: 5 }) },
  { label: "Iron Greaves", quantity: 1, make: () => new LegArmor({ id: "iron-greaves", name: "Iron Greaves", defense: 3 }) }
]);

function debugPotion() {
  return new Consumable({
    id: "health-potion",
    name: "Health Potion",
    maxStackSize: 5,
    healthRestore: 2,
    description: "A small restorative potion."
  });
}

// The categories and entries. Enemies, money and weapons come from their own tables (ENEMY_TYPES,
// MONEY_TYPES, WEAPON_DEFS), so a new one shows up here by itself.
function buildDebugCategories() {
  const enemies = ENEMY_TYPE_NAMES.map((name) => ({
    label: name,
    run: (ctx) => debugSpawnEnemy(ctx, name)
  }));

  const moneyIdsSmallestFirst = [...MONEY_IDS].reverse();
  const money = moneyIdsSmallestFirst.map((id) => ({
    label: MONEY_TYPES[id].name + " (" + MONEY_TYPES[id].value + ")",
    run: (ctx) => debugDropMoney(ctx, id)
  }));
  money.push({
    label: "Gold shower (" + DEBUG_SHOWER_GOLD + ")",
    run: (ctx) => debugGoldShower(ctx, DEBUG_SHOWER_GOLD)
  });

  const items = [
    ...Object.keys(WEAPON_DEFS).map((name) => ({
      label: WEAPON_DEFS[name].options.name,
      run: (ctx) => debugGiveItem(ctx, createWeapon(name), 1, WEAPON_DEFS[name].options.name)
    })),
    ...DEBUG_ITEMS.map((spec) => ({
      label: spec.label,
      run: (ctx) => debugGiveItem(ctx, spec.make(), spec.quantity, spec.label)
    }))
  ];

  const playerAndRoom = [
    {
      label: "Heal to full",
      run: (ctx) => {
        ctx.run.player.health = ctx.run.player.maxHealth;
        return "Health is full";
      }
    },
    {
      label: "Add 100 gold",
      run: (ctx) => {
        ctx.run.player.inventory.add(new Gold(), 100);
        return "Added 100 gold";
      }
    },
    {
      label: "Add 1000 gold",
      run: (ctx) => {
        ctx.run.player.inventory.add(new Gold(), 1000);
        return "Added 1000 gold";
      }
    },
    {
      label: () => "Invincible: " + (debugTools.invincible ? "ON" : "OFF"),
      run: () => {
        debugTools.invincible = !debugTools.invincible;
        return debugTools.invincible ? "Invincible on" : "Invincible off";
      }
    },
    {
      label: "Kill all enemies",
      run: (ctx) => {
        const alive = ctx.run.room.enemies.filter((enemy) => !enemy.isDead());
        for (const enemy of alive) {
          enemy.health = 0; // the next frame removes it and drops its money
        }
        return "Killed " + alive.length + (alive.length === 1 ? " enemy" : " enemies");
      }
    },
    {
      label: "Clear room (open doors)",
      run: (ctx) => {
        ctx.run.room.onClear();
        return "Room cleared";
      }
    },
    {
      label: "Toggle Elder NPC",
      run: (ctx) => {
        toggleTopRightNpc(ctx.run, ctx.dialogue);
        return ctx.run.room.npcs.some((npc) => npc.name === "Elder") ? "Elder added" : "Elder removed";
      }
    },
    {
      label: () => "Enemy hitboxes (F3): " + (debugTools.overlay ? "ON" : "OFF"),
      run: () => {
        debugTools.overlay = !debugTools.overlay;
        return debugTools.overlay ? "Hitboxes on" : "Hitboxes off";
      }
    }
  ];

  return [
    { name: "Enemies", entries: enemies },
    { name: "Money", entries: money },
    { name: "Items", entries: items },
    { name: "Player & Room", entries: playerAndRoom }
  ];
}
