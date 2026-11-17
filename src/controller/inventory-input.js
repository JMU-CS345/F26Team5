// Inventory slot layout and drag interactions. Rendering stays in inventory-view.js.

const INVENTORY_PANEL = Object.freeze({ x: 140, y: 50, w: 1000, h: 620 });
const INVENTORY_SLOT_SIZE = 76;
const INVENTORY_SLOT_GAP = 16;
const INVENTORY_BAG_COLUMNS = 4;
const INVENTORY_BAG_ROWS = 4;
const INVENTORY_DRAG_THRESHOLD = 5;
const INVENTORY_CONTEXT_WIDTH = 210;
const INVENTORY_CONTEXT_ROW_HEIGHT = 34;
const INVENTORY_HUD_BUTTON = Object.freeze({ x: 1040, y: 650, w: 220, h: 50 });
const PLAYER_EQUIPMENT_LABELS = Object.freeze({
  melee: "Melee",
  projectile: "Projectile",
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

function inventoryUiLayout(inventory) {
  const equipmentPositions = {
    melee: { x: 210, y: 245 },
    projectile: { x: 330, y: 245 },
    head: { x: 210, y: 385 },
    body: { x: 330, y: 385 },
    legs: { x: 450, y: 385 }
  };
  const equipmentSlots = Object.keys(PLAYER_EQUIPMENT_TYPES).map((equipmentName) => ({
    kind: "equipment",
    equipmentName,
    label: PLAYER_EQUIPMENT_LABELS[equipmentName],
    item: inventory.getEquipped(equipmentName),
    quantity: 1,
    ...equipmentPositions[equipmentName],
    w: INVENTORY_SLOT_SIZE,
    h: INVENTORY_SLOT_SIZE
  }));

  const contents = inventory.contents();
  const bagSlots = [];
  const bagX = 650;
  const bagY = 245;
  const slotStep = INVENTORY_SLOT_SIZE + INVENTORY_SLOT_GAP;
  const slotCount = INVENTORY_BAG_COLUMNS * INVENTORY_BAG_ROWS;
  for (let index = 0; index < slotCount; index++) {
    const entry = contents[index] === undefined ? null : contents[index];
    bagSlots.push({
      kind: "bag",
      index,
      entry,
      item: entry === null ? null : entry.item,
      quantity: entry === null ? 0 : entry.quantity,
      x: bagX + (index % INVENTORY_BAG_COLUMNS) * slotStep,
      y: bagY + Math.floor(index / INVENTORY_BAG_COLUMNS) * slotStep,
      w: INVENTORY_SLOT_SIZE,
      h: INVENTORY_SLOT_SIZE
    });
  }
  return { equipmentSlots, bagSlots };
}

function inventorySlotAt(inventory, x, y) {
  const layout = inventoryUiLayout(inventory);
  return [...layout.equipmentSlots, ...layout.bagSlots]
    .find((slot) => inventoryPointInRect(x, y, slot)) || null;
}

function beginInventoryDrag(inventory, x, y) {
  const slot = inventorySlotAt(inventory, x, y);
  if (slot === null || slot.item === null) {
    return null;
  }
  return {
    sourceKind: slot.kind,
    equipmentName: slot.equipmentName || null,
    item: slot.item,
    quantity: slot.quantity || 1,
    startX: x,
    startY: y
  };
}

function inventoryDragMoved(drag, x, y) {
  if (drag === null) {
    return false;
  }
  return Math.hypot(x - drag.startX, y - drag.startY) >= INVENTORY_DRAG_THRESHOLD;
}

function finishInventoryDrag(inventory, drag, x, y) {
  if (drag === null) {
    return false;
  }
  const target = inventorySlotAt(inventory, x, y);
  if (target === null) {
    return false;
  }

  if (drag.sourceKind === "bag" && target.kind === "equipment") {
    const acceptedType = PLAYER_EQUIPMENT_TYPES[target.equipmentName];
    if (!(drag.item instanceof acceptedType)) {
      return false;
    }
    try {
      inventory.equip(drag.item);
      return true;
    } catch (error) {
      return false;
    }
  }

  if (drag.sourceKind === "equipment" && target.kind === "bag") {
    return inventory.unequip(drag.equipmentName) !== null;
  }
  return false;
}

function inventorySelectionAt(inventory, x, y) {
  return inventorySelectionFromSlot(inventorySlotAt(inventory, x, y));
}

function inventorySelectionFromSlot(slot) {
  if (slot === null || slot.item === null) {
    return null;
  }
  return Object.freeze({
    sourceKind: slot.kind,
    equipmentName: slot.equipmentName || null,
    item: slot.item,
    quantity: slot.quantity || 1,
    x: slot.x,
    y: slot.y,
    w: slot.w,
    h: slot.h
  });
}

function equipmentNameForItem(item) {
  for (const [equipmentName, acceptedType] of Object.entries(PLAYER_EQUIPMENT_TYPES)) {
    if (item instanceof acceptedType) {
      return equipmentName;
    }
  }
  return null;
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
    lines.push(`Damage: ${item.damage}`);
    lines.push(`Element: ${item.elementalType || "None"}`);
    lines.push(`Attack: ${item.attackType}`);
  } else if (item instanceof Armor) {
    lines.push(`Defense: ${item.defense}`);
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

// Arrows or WASD. Returns true when the key moved the cursor.
function moveInventoryCursorForKey(cursor, code) {
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
  cursor.move(step[0], step[1]);
  return true;
}

// Enter: equip, unequip or consume the item under the cursor. An item with nothing to do
// shows its info instead. Returns { success, infoLines }.
function useInventoryCursorItem(inventory, player, cursor) {
  const selection = inventorySelectionFromSlot(inventoryCursorSlot(inventory, cursor));
  const actions = inventoryContextActions(inventory, player, selection);
  const usable = actions.find((action) => action.id !== "view" && action.enabled);
  if (selection === null || actions.length === 0) {
    return Object.freeze({ success: false, infoLines: Object.freeze([]) });
  }
  if (usable === undefined) {
    return performInventoryContextAction(inventory, player, selection, "view");
  }
  return performInventoryContextAction(inventory, player, selection, usable.id);
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
    }
    inventory.remove(slot.item, quantity);
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
