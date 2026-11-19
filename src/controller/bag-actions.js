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
  const inventory = player.inventory;
  const quantity = inventory.quantityOf(selection.item);
  if (quantity < 1) {
    return false;
  }
  inventory.remove(selection.item, quantity);
  const center = player.getCenter();
  const drop = new ItemDrop(
    center.x - ITEM_DROP_SIZE / 2,
    center.y - ITEM_DROP_SIZE / 2,
    selection.item,
    quantity
  );
  drop.justDropped = true;
  room.items.push(drop);
  return true;
}

// The selection one step from the current one, skipping empty slots. With no selection it
// picks the first item in the bag. Returns the same selection when nothing lies that way.
function moveBagSelection(inventory, selection, columnStep, rowStep) {
  const slots = inventoryUiLayout(inventory).bagSlots;
  const first = slots.find((slot) => slot.item !== null);
  if (selection === null || selection.sourceKind !== "bag") {
    if (first === undefined) {
      return null;
    }
    return inventorySelectionFromSlot(first);
  }
  let column = selection.index % INVENTORY_BAG_COLUMNS;
  let row = Math.floor(selection.index / INVENTORY_BAG_COLUMNS);
  while (true) {
    column += columnStep;
    row += rowStep;
    if (column < 0 || column >= INVENTORY_BAG_COLUMNS || row < 0 || row >= INVENTORY_BAG_ROWS) {
      return selection;
    }
    const slot = slots[row * INVENTORY_BAG_COLUMNS + column];
    if (slot.item !== null) {
      return inventorySelectionFromSlot(slot);
    }
  }
}
