// Bag tools used from the inventory screen. The controller changes the model; views only draw.

// Equips a bag item, or unequips an equipped one. Returns true if something changed.
function equipSelected(inventory, selection) {
  if (selection === null) {
    return false;
  }
  try {
    if (selection.sourceKind === "equipment") {
      return inventory.unequip(selection.equipmentName) !== null;
    }
    if (equipmentNameForItem(selection.item) === null) {
      return false;
    }
    inventory.equip(selection.item);
    return true;
  } catch (error) {
    return false;
  }
}

// Flips the keep flag on the selected item. A locked item is never dropped or sold in bulk.
function toggleLock(selection) {
  if (selection === null) {
    return false;
  }
  selection.item.locked = !selection.item.locked;
  return true;
}

// Puts a bag item on the floor at the player's feet. Locked items stay. Returns true if dropped.
function dropBagItem(player, room, selection) {
  if (selection === null || selection.sourceKind !== "bag" || selection.item.locked) {
    return false;
  }
  const grid = player.inventory.grid;
  const entry = grid.itemAt(selection.index % INVENTORY_BAG_COLUMNS,
    Math.floor(selection.index / INVENTORY_BAG_COLUMNS));
  if (entry === null || entry.item !== selection.item) {
    return false;
  }
  const quantity = entry.quantity; // only the selected stack, not every stack of the item
  grid.removeEntry(entry);
  dropItemAtFeet(player, room, selection.item, quantity);
  return true;
}

function dropItemAtFeet(player, room, item, quantity) {
  const center = player.getCenter();
  const drop = new ItemDrop(
    center.x - ITEM_DROP_SIZE / 2,
    center.y - ITEM_DROP_SIZE / 2,
    item,
    quantity
  );
  drop.justDropped = true;
  room.items.push(drop);
}

// Picking items up and putting them down. A held item is { item, quantity, col, row } (col and
// row are where it came from). It is out of the bag while held, and follows the pointer.

// Takes the item covering a bag cell into the hand, or null when the cell is empty.
function pickUpFromBag(inventory, col, row) {
  const entry = inventory.grid.itemAt(col, row);
  if (entry === null) {
    return null;
  }
  inventory.grid.removeEntry(entry);
  return { item: entry.item, quantity: entry.quantity, col: entry.col, row: entry.row };
}

// Puts the held item down with its top left on (col, row), kept inside the grid. A stack of
// the same potion merges. An item that covers exactly one other item swaps with it and that
// item is now held. Anything else changes nothing. Returns what is held afterwards.
function placeHeld(inventory, held, col, row) {
  const grid = inventory.grid;
  const size = BagGrid.itemSize(held.item);
  const left = Math.max(0, Math.min(col, grid.columns - size.w));
  const top = Math.max(0, Math.min(row, grid.rows - size.h));
  if (size.w > grid.columns || size.h > grid.rows) {
    return held;
  }
  const covered = grid.entriesIn(left, top, size.w, size.h);
  if (covered.length === 0) {
    grid.place(held.item, left, top, held.quantity);
    return null;
  }
  if (covered.length > 1) {
    return held;
  }
  const other = covered[0];
  if (held.item.stackable && other.item.isStackCompatible(held.item)) {
    const moved = Math.min(held.quantity, other.item.maxStackSize - other.quantity);
    other.quantity += moved;
    if (moved === held.quantity) {
      return null;
    }
    return { ...held, quantity: held.quantity - moved };
  }
  grid.removeEntry(other);
  grid.place(held.item, left, top, held.quantity);
  return { item: other.item, quantity: other.quantity, col: left, row: top };
}

// Puts the held item on an equipment slot. The item it replaces is held instead. A piece that
// does not belong in that slot changes nothing.
function equipHeld(inventory, held, equipmentName) {
  if (!(held.item instanceof PLAYER_EQUIPMENT_TYPES[equipmentName])) {
    return held;
  }
  const previous = inventory.swapEquipped(held.item);
  if (previous === null) {
    return null;
  }
  return { item: previous, quantity: 1, col: held.col, row: held.row };
}

// A click or Enter on a slot from inventoryUiLayout. Returns what is held afterwards: with an
// empty hand a bag item is picked up and an equipped one goes to the bag; with a full hand the
// item is placed or equipped.
function activateInventorySlot(inventory, held, slot) {
  if (slot === null) {
    return held;
  }
  if (slot.kind === "equipment") {
    if (held !== null) {
      return equipHeld(inventory, held, slot.equipmentName);
    }
    inventory.unequip(slot.equipmentName);
    return null;
  }
  if (held !== null) {
    return placeHeld(inventory, held, slot.col, slot.row);
  }
  return pickUpFromBag(inventory, slot.col, slot.row);
}

// Space (and Enter with a full hand): pick up, place, equip onto a doll slot or unequip. Returns
// { held, message } with the new hand and a short note for the player ("" when it worked).
function spaceInventorySlot(inventory, held, slot) {
  if (slot === null) {
    return { held, message: "" };
  }
  const after = activateInventorySlot(inventory, held, slot);
  let message = "";
  if (slot.kind === "equipment" && held !== null && after === held) {
    message = "Wrong slot";
  } else if (slot.kind === "equipment" && held === null && slot.item !== null
      && inventory.getEquipped(slot.equipmentName) !== null) {
    message = "Bag full";
  } else if (slot.kind === "bag" && held !== null && after === held) {
    message = "Can't place there";
  }
  return { held: after, message };
}

// Enter: gear in the bag goes straight to its slot, a potion is drunk, anything else acts like
// Space. The piece it replaces takes the freed cells, or the first free spot, or the floor.
function enterInventorySlot(player, room, held, slot) {
  if (held !== null || slot === null || slot.kind !== "bag" || slot.item === null) {
    return spaceInventorySlot(player.inventory, held, slot);
  }
  if (slot.item instanceof Consumable) {
    if (player.inventory.consume(slot.item, player)) {
      return { held, message: "" };
    }
    return { held, message: "Can't use that now" };
  }
  if (equipmentNameForItem(slot.item) === null) {
    return { held, message: "Can't equip that" };
  }
  return { held, message: equipFromBag(player, room, slot.entry) };
}

function equipFromBag(player, room, entry) {
  const inventory = player.inventory;
  const grid = inventory.grid;
  const item = entry.item;
  const old = inventory.getEquipped(equipmentNameForItem(item));
  grid.removeEntry(entry);
  let message = "";
  if (old !== null && !grid.place(old, entry.col, entry.row) && grid.autoPlace(old) === null) {
    if (old.locked) {
      grid.place(item, entry.col, entry.row, entry.quantity);
      return "Bag full";
    }
    dropItemAtFeet(player, room, old, 1);
    message = "Bag full, dropped " + old.name;
  }
  inventory.swapEquipped(item);
  return message;
}

// Puts a held item back in the bag (where it came from if that is free). Returns the held
// item when the bag has no room for it, so the caller can drop it, otherwise null.
function releaseHeld(inventory, held) {
  if (held === null) {
    return null;
  }
  const grid = inventory.grid;
  if (grid.place(held.item, held.col, held.row, held.quantity)
      || grid.autoPlace(held.item, held.quantity) !== null) {
    return null;
  }
  return held;
}

// Q: drinks the health potion in the slot the cursor is on, or else the first one in the bag.
// False when there is none or health is full.
function drinkBagPotion(player, slot = null) {
  const isPotion = (e) => e.item instanceof Consumable && e.item.healthRestore > 0;
  let entry = null;
  if (slot !== null && slot.kind === "bag" && slot.entry !== null && isPotion(slot.entry)) {
    entry = slot.entry;
  } else {
    entry = player.inventory.grid.entries().find(isPotion);
  }
  if (entry === undefined || entry === null) {
    return false;
  }
  return player.inventory.consume(entry.item, player);
}
