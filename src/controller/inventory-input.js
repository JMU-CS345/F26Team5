// Inventory slot layout and drag interactions. Rendering stays in inventory-view.js.

const INVENTORY_PANEL = Object.freeze({ x: 140, y: 50, w: 1000, h: 620 });
const INVENTORY_SLOT_SIZE = 76;
const INVENTORY_SLOT_GAP = 16;
const INVENTORY_BAG_CELL = 48; // one grid cell, items cover several
const INVENTORY_BAG_COLUMNS = 10;
const INVENTORY_BAG_ROWS = 6;
const INVENTORY_BAG_X = 640;
const INVENTORY_BAG_Y = 240;
const INVENTORY_CONTEXT_WIDTH = 210;
const INVENTORY_CONTEXT_ROW_HEIGHT = 34;
const INVENTORY_HUD_BUTTON = Object.freeze({ x: 1040, y: 674, w: 220, h: 40 }); // below the panel
const PLAYER_EQUIPMENT_LABELS = Object.freeze({
  melee: "Melee",
  projectile: "Magic",
  head: "Head",
  body: "Body",
  legs: "Legs"
});

function inventoryPointInRect(x, y, rectangle) {
  return x >= rectangle.x
    && x <= rectangle.x + rectangle.w
    && y >= rectangle.y
    && y <= rectangle.y + rectangle.h;
}

// The paper doll: Head over Body over Legs, Melee on the left and Magic on the right.
const INVENTORY_DOLL_SLOTS = Object.freeze({
  head: { x: 330, y: 230 },
  body: { x: 330, y: 330 },
  legs: { x: 330, y: 430 },
  melee: { x: 210, y: 330 },
  projectile: { x: 450, y: 330 }
});

// The equipment boxes, and one cell for each spot of the bag grid (row by row). A cell holds
// the item covering it; itemRect is the whole item's rectangle, cell is just this square.
function inventoryUiLayout(inventory) {
  const equipmentSlots = Object.keys(PLAYER_EQUIPMENT_TYPES).map((equipmentName) => ({
    kind: "equipment",
    equipmentName,
    label: PLAYER_EQUIPMENT_LABELS[equipmentName],
    item: inventory.getEquipped(equipmentName),
    quantity: 1,
    ...INVENTORY_DOLL_SLOTS[equipmentName],
    w: INVENTORY_SLOT_SIZE,
    h: INVENTORY_SLOT_SIZE
  }));

  const bagSlots = [];
  const cell = INVENTORY_BAG_CELL;
  for (let index = 0; index < INVENTORY_BAG_COLUMNS * INVENTORY_BAG_ROWS; index++) {
    const col = index % INVENTORY_BAG_COLUMNS;
    const row = Math.floor(index / INVENTORY_BAG_COLUMNS);
    const entry = inventory.grid.itemAt(col, row);
    const slot = {
      kind: "bag",
      index,
      col,
      row,
      entry,
      item: null,
      quantity: 0,
      x: INVENTORY_BAG_X + col * cell,
      y: INVENTORY_BAG_Y + row * cell,
      w: cell,
      h: cell
    };
    slot.itemRect = { x: slot.x, y: slot.y, w: cell, h: cell };
    if (entry !== null) {
      slot.item = entry.item;
      slot.quantity = entry.quantity;
      slot.itemRect = {
        x: INVENTORY_BAG_X + entry.col * cell,
        y: INVENTORY_BAG_Y + entry.row * cell,
        w: entry.w * cell,
        h: entry.h * cell
      };
    }
    bagSlots.push(slot);
  }
  return { equipmentSlots, bagSlots };
}

function inventorySlotAt(inventory, x, y) {
  const layout = inventoryUiLayout(inventory);
  return [...layout.equipmentSlots, ...layout.bagSlots]
    .find((slot) => inventoryPointInRect(x, y, slot)) || null;
}

function inventorySelectionAt(inventory, x, y) {
  return inventorySelectionFromSlot(inventorySlotAt(inventory, x, y));
}

function inventorySelectionFromSlot(slot) {
  if (slot === null || slot.item === null) {
    return null;
  }
  const rect = slot.itemRect || slot;
  return Object.freeze({
    sourceKind: slot.kind,
    index: slot.index,
    equipmentName: slot.equipmentName || null,
    item: slot.item,
    quantity: slot.quantity || 1,
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h
  });
}

// A click picks an item, so the keyboard cursor moves there too and L, X and Enter agree.
function syncInventoryCursorToSelection(cursor, inventory, selection) {
  if (selection === null) {
    return;
  }
  if (selection.sourceKind === "equipment") {
    const slots = inventoryUiLayout(inventory).equipmentSlots;
    cursor.section = "equipment";
    cursor.index = slots.findIndex((slot) => slot.equipmentName === selection.equipmentName);
    return;
  }
  cursor.section = "bag";
  cursor.index = selection.index;
}

function equipmentNameForItem(item) {
  for (const [equipmentName, acceptedType] of Object.entries(PLAYER_EQUIPMENT_TYPES)) {
    if (item instanceof acceptedType) {
      return equipmentName;
    }
  }
  return null;
}

// Where the held item and tooltip anchor: the mouse, or the keyboard cursor's slot once the
// keyboard was used last (otherwise they sit at the stale mouse spot).
function inventoryPointerFor(keyboardMode, pointer, slot) {
  if (!keyboardMode || slot === null || slot === undefined) {
    return pointer;
  }
  return { x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 };
}

// What the player wears in the slot this item would go in, or null (potions and gold have no slot).
function equippedForItem(inventory, item) {
  const name = equipmentNameForItem(item);
  if (name === null) {
    return null;
  }
  return inventory.getEquipped(name);
}

function inventoryContextActions(inventory, player, selection) {
  if (selection === null) {
    return Object.freeze([]);
  }
  const item = selection.item;
  const actions = [];
  if (item instanceof Weapon || item instanceof Armor) {
    if (selection.sourceKind === "equipment") {
      actions.push({ id: "unequip", label: "Unequip", enabled: inventory.canAdd(item) });
    } else if (equipmentNameForItem(item) !== null) {
      actions.push({
        id: "equip",
        label: "Equip",
        enabled: inventory.quantityOf(item) > 0
      });
    }
    actions.push({
      id: "view",
      label: item instanceof Weapon ? "View attack data" : "View armor info",
      enabled: true
    });
  } else if (item instanceof Consumable) {
    actions.push({ id: "consume", label: "Consume", enabled: item.canUse(player) });
    actions.push({ id: "view", label: "View description", enabled: true });
  } else {
    actions.push({ id: "view", label: "View item info", enabled: true });
  }
  return Object.freeze(actions.map((action) => Object.freeze(action)));
}

function inventoryItemInformation(item) {
  const lines = [item.name];
  if (item instanceof Weapon) {
    lines.push(`Rarity: ${getRarity(item.rarity).label}`);
    lines.push(`Damage: ${item.damage}`);
    lines.push(`Element: ${item.elementalType || "None"}`);
    lines.push(`Attack: ${item.attackType}`);
    lines.push(`Sell value: ${item.value} gold`);
  } else if (item instanceof Armor) {
    lines.push(`Defense: ${item.defense}`);
    lines.push(`Sell value: ${item.value} gold`);
    const equipmentName = equipmentNameForItem(item);
    if (equipmentName !== null) {
      lines.push(`Slot: ${PLAYER_EQUIPMENT_LABELS[equipmentName]}`);
    }
  } else if (item instanceof Consumable) {
    if (item.description !== "") {
      lines.push(item.description);
    }
    if (item.healthRestore > 0) {
      lines.push(`Restores ${item.healthRestore} health`);
    }
    lines.push(`Sell value: ${item.value} gold`);
  } else {
    if (item.description !== "") {
      lines.push(item.description);
    }
    lines.push(`Value: ${item.value}`);
  }
  return Object.freeze(lines);
}

function performInventoryContextAction(inventory, player, selection, actionId) {
  const action = inventoryContextActions(inventory, player, selection)
    .find((candidate) => candidate.id === actionId);
  if (action === undefined || !action.enabled) {
    return Object.freeze({ success: false, infoLines: Object.freeze([]) });
  }
  if (actionId === "view") {
    return Object.freeze({
      success: true,
      infoLines: inventoryItemInformation(selection.item)
    });
  }
  try {
    if (actionId === "equip") {
      inventory.equip(selection.item);
      return Object.freeze({ success: true, infoLines: Object.freeze([]) });
    }
    if (actionId === "unequip") {
      const item = inventory.unequip(selection.equipmentName);
      return Object.freeze({ success: item !== null, infoLines: Object.freeze([]) });
    }
    if (actionId === "consume") {
      return Object.freeze({
        success: inventory.consume(selection.item, player),
        infoLines: Object.freeze([])
      });
    }
  } catch (error) {
    return Object.freeze({ success: false, infoLines: Object.freeze([]) });
  }
  return Object.freeze({ success: false, infoLines: Object.freeze([]) });
}

function inventoryContextMenuLayout(inventory, player, selection) {
  const actions = inventoryContextActions(inventory, player, selection);
  if (selection === null || actions.length === 0) {
    return null;
  }
  const desiredX = selection.x + selection.w + 4;
  const maxX = INVENTORY_PANEL.x + INVENTORY_PANEL.w - INVENTORY_CONTEXT_WIDTH - 8;
  const x = Math.min(desiredX, maxX);
  const y = Math.min(
    selection.y,
    INVENTORY_PANEL.y + INVENTORY_PANEL.h - actions.length * INVENTORY_CONTEXT_ROW_HEIGHT - 8
  );
  return {
    x,
    y,
    w: INVENTORY_CONTEXT_WIDTH,
    h: actions.length * INVENTORY_CONTEXT_ROW_HEIGHT,
    actions: actions.map((action, index) => ({
      ...action,
      x,
      y: y + index * INVENTORY_CONTEXT_ROW_HEIGHT,
      w: INVENTORY_CONTEXT_WIDTH,
      h: INVENTORY_CONTEXT_ROW_HEIGHT
    }))
  };
}

function inventoryContextActionAt(inventory, player, selection, x, y) {
  const menu = inventoryContextMenuLayout(inventory, player, selection);
  if (menu === null) {
    return null;
  }
  return menu.actions.find((action) => inventoryPointInRect(x, y, action)) || null;
}

function inventoryHudButtonAt(x, y) {
  return inventoryPointInRect(x, y, INVENTORY_HUD_BUTTON);
}

function toggleInventoryFromControl(game) {
  return game.toggleInventory();
}

// The slot the keyboard cursor is on.
function inventoryCursorSlot(inventory, cursor) {
  const layout = inventoryUiLayout(inventory);
  if (cursor.section === "equipment") {
    return layout.equipmentSlots[cursor.index];
  }
  return layout.bagSlots[cursor.index];
}

// Arrows or WASD. Returns true when the key moved the cursor. Pass the bag grid to skip ahead
// to the next different item; leave it out (while holding an item) to step one cell.
function moveInventoryCursorForKey(cursor, code, grid = null) {
  const moves = {
    37: [-1, 0], 65: [-1, 0],
    39: [1, 0], 68: [1, 0],
    38: [0, -1], 87: [0, -1],
    40: [0, 1], 83: [0, 1]
  };
  const step = moves[code];
  if (step === undefined) {
    return false;
  }
  cursor.move(step[0], step[1], grid);
  return true;
}

// One KeyRepeat for each direction, with the key codes that hold it down.
const INVENTORY_REPEAT_KEYS = Object.freeze([[37, 65], [39, 68], [38, 87], [40, 83]]);

// Holding an arrow keeps moving the cursor (keyPressed does the first move). repeats is an
// array of 4 KeyRepeat, isDown(code) says if a key is held. Returns true if the cursor moved.
function repeatInventoryMoves(cursor, repeats, isDown, grid = null) {
  let moved = false;
  for (let i = 0; i < INVENTORY_REPEAT_KEYS.length; i++) {
    const codes = INVENTORY_REPEAT_KEYS[i];
    if (repeats[i].update(isDown(codes[0]) || isDown(codes[1]))) {
      moveInventoryCursorForKey(cursor, codes[0], grid);
      moved = true;
    }
  }
  return moved;
}

// X: takes the item under the cursor out of the inventory and returns it as a drop at the
// player's feet, or null when there is nothing to drop. Gold stays with the player.
function dropInventoryCursorItem(inventory, player, cursor) {
  const slot = inventoryCursorSlot(inventory, cursor);
  if (slot.item === null || slot.item instanceof Gold) {
    return null;
  }
  let quantity = slot.quantity;
  try {
    if (slot.kind === "equipment") {
      if (inventory.unequip(slot.equipmentName) === null) {
        return null;
      }
      quantity = 1;
      inventory.remove(slot.item, quantity); // unequip put it in the bag
    } else {
      inventory.grid.removeEntry(slot.entry); // this stack only
    }
  } catch (error) {
    return null;
  }
  const center = player.getCenter();
  const drop = new ItemDrop(
    center.x - ITEM_DROP_SIZE / 2,
    center.y - ITEM_DROP_SIZE / 2,
    slot.item,
    quantity
  );
  drop.pickupDelay = ITEM_DROP_PICKUP_DELAY;
  return drop;
}
