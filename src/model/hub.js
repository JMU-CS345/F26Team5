// The hub between dungeons: its room, the shopkeeper and the storyteller. A stub that the real
// overworld replaces later. No p5 drawing calls, so Jasmine can test it without a canvas.
// Load after template-room.js, room-templates.js, npc.js, armor-generator.js, loot-drops.js and
// run-tier.js.

const SHOP_POTION_PRICE = 30;
const SHOP_ARMOR_PRICE = 90;
const SHOP_CHOICES = Object.freeze([
  { id: "potion", label: "Buy Potion (" + SHOP_POTION_PRICE + "g)" },
  { id: "armor", label: "Buy Armor (" + SHOP_ARMOR_PRICE + "g)" },
  { id: "sell", label: "Sell unlocked gear" },
  { id: "leave", label: "Leave" }
]);

// Placeholder story text for the team to replace, one list per dungeon.
const STORY_LINES = Object.freeze([
  [
    "You made it out of the first dungeon. The stairs led here.",
    "Three dungeons lie between us and the old tower."
  ],
  [
    "Two dungeons down. The monsters are stronger the deeper you go.",
    "Spend your gold, then take the door on the south wall."
  ],
  [
    "One dungeon left, and then the final fight.",
    "Whatever waits at the bottom, you have come a long way."
  ]
]);

const HUB_SHOPKEEPER_TILE = { col: 6, row: 5 };
const HUB_STORYTELLER_TILE = { col: 21, row: 5 };

function makeShopkeeper(x, y) {
  return new Npc(x, y, "Shopkeeper", ["Welcome! What can I get you?"], SHOP_CHOICES);
}

function makeStoryteller(x, y, tier) {
  return new Npc(x, y, "Storyteller", STORY_LINES[tier - 1]);
}

// Builds the hub for the dungeon the player just finished, centered on the screen like the
// dungeon rooms. Its one door is open and leads nowhere in a dungeon: the sketch calls
// leaveHub() when the player walks into it.
function makeHubRoom(screenX, screenY, tier) {
  const template = parseRoomTemplate(HUB_TEMPLATE);
  const col = Math.floor((SCREEN_COLS - template.cols) / 2);
  const row = Math.floor((SCREEN_ROWS - template.rows) / 2);
  const hub = new TemplateRoom(
    screenX + col * TILE_SIZE, screenY + row * TILE_SIZE, template, { tier: tier }
  );
  hub.id = "hub";
  hub.cleared = true; // nothing to fight, so no clear reward and no sealed doors
  hub.state = "cleared";
  hub.openDoor(template.doors[0], -1, 0);
  hub.npcs.push(makeShopkeeper(
    hub.x + HUB_SHOPKEEPER_TILE.col * TILE_SIZE, hub.y + HUB_SHOPKEEPER_TILE.row * TILE_SIZE
  ));
  hub.npcs.push(makeStoryteller(
    hub.x + HUB_STORYTELLER_TILE.col * TILE_SIZE, hub.y + HUB_STORYTELLER_TILE.row * TILE_SIZE,
    tier
  ));
  return hub;
}

// Pays for an item and puts it in the bag. Returns what the shopkeeper says.
function buyItem(player, item, price) {
  const inventory = player.inventory;
  if (inventory.gold < price) {
    return "Not enough gold.";
  }
  if (!inventory.canAdd(item)) {
    return "Your bag is full.";
  }
  inventory.remove("gold", price);
  inventory.add(item);
  return "Bought " + item.name + ".";
}

function buyPotion(player) {
  return buyItem(player, makePotion(), SHOP_POTION_PRICE);
}

// One armor piece, rolled as deep as the current dungeon.
function buyArmor(player, lootRun, tier) {
  const armor = generateArmor(lootRun.rng, { depth: tierLootDepth(tier), source: "chest" });
  return buyItem(player, armor, SHOP_ARMOR_PRICE);
}

// Sells every unlocked weapon and armor piece in the bag for its value. Worn gear, potions and
// locked items stay.
function sellUnlockedGear(player) {
  const inventory = player.inventory;
  let total = 0;
  let count = 0;
  for (const entry of inventory.grid.entries()) {
    const isGear = entry.item instanceof Weapon || entry.item instanceof Armor;
    if (isGear && !entry.item.locked) {
      total += entry.item.value * entry.quantity;
      count++;
      inventory.grid.removeEntry(entry);
    }
  }
  if (count === 0) {
    return "Nothing to sell. Locked gear stays.";
  }
  if (total > 0) {
    inventory.add(new Gold(), total);
  }
  return "Sold " + count + " for " + total + " gold.";
}

// Runs one shop choice and returns the shopkeeper's answer, with the gold left.
function shopChoose(choiceId, player, lootRun, tier) {
  let answer = "";
  if (choiceId === "potion") {
    answer = buyPotion(player);
  } else if (choiceId === "armor") {
    answer = buyArmor(player, lootRun, tier);
  } else if (choiceId === "sell") {
    answer = sellUnlockedGear(player);
  }
  return answer + " Gold: " + player.inventory.gold;
}
