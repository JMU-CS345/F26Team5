// Inventory slot layout and drag interactions. Rendering stays in inventory-view.js.

const INVENTORY_PANEL = Object.freeze({ x: 55, y: 35, w: 530, h: 410 });
const INVENTORY_SLOT_SIZE = 52;
const INVENTORY_SLOT_GAP = 9;
const INVENTORY_BAG_COLUMNS = 4;
const INVENTORY_BAG_ROWS = 4;

function inventoryPointInRect(x, y, rectangle) {
  return x >= rectangle.x
    && x <= rectangle.x + rectangle.w
    && y >= rectangle.y
    && y <= rectangle.y + rectangle.h;
}

function inventoryUiLayout(inventory) {
  const equipmentSlots = [
    {
      kind: "equipment",
      equipmentName: "weapon",
      label: "Weapon",
      item: inventory.getEquipped("weapon"),
      x: 92,
      y: 170,
      w: INVENTORY_SLOT_SIZE,
      h: INVENTORY_SLOT_SIZE
    },
    {
      kind: "equipment",
      equipmentName: "armor",
      label: "Armor",
      item: inventory.getEquipped("armor"),
      x: 174,
      y: 170,
      w: INVENTORY_SLOT_SIZE,
      h: INVENTORY_SLOT_SIZE
    }
  ];

  const contents = inventory.contents();
  const bagSlots = [];
  const bagX = 300;
  const bagY = 170;
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
    quantity: slot.quantity || 1
  };
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
