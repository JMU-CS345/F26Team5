// Slot-based inventory overlay. Reads inventory and drag state without changing them.

function drawInventorySlot(slot, drag) {
  const isDragged = drag !== null
    && drag.item === slot.item
    && drag.sourceKind === slot.kind
    && (slot.kind !== "equipment" || drag.equipmentName === slot.equipmentName);

  push();
  stroke(255);
  strokeWeight(1);
  fill(0);
  rect(slot.x, slot.y, slot.w, slot.h);
  if (slot.item === null || isDragged) {
    pop();
    return;
  }

  drawItemSprite(slot.item, slot.x + 10, slot.y + 8, slot.w - 20);
  if (slot.quantity > 1) {
    noStroke();
    fill(255);
    textAlign(RIGHT, BOTTOM);
    textSize(11);
    text(slot.quantity, slot.x + slot.w - 5, slot.y + slot.h - 3);
  }
  pop();
}

function drawDraggedInventoryItem(drag, pointerX, pointerY) {
  if (drag === null) {
    return;
  }
  drawItemSprite(
    drag.item,
    pointerX - INVENTORY_SLOT_SIZE / 2,
    pointerY - INVENTORY_SLOT_SIZE / 2,
    INVENTORY_SLOT_SIZE
  );
}

function drawInventoryMenu(inventory, drag = null, pointerX = 0, pointerY = 0) {
  noStroke();
  fill(0, 0, 0, 210);
  rect(0, 0, width, height);

  const panelX = INVENTORY_PANEL.x;
  const panelY = INVENTORY_PANEL.y;
  const panelWidth = INVENTORY_PANEL.w;
  const panelHeight = INVENTORY_PANEL.h;
  fill(0);
  stroke(255);
  strokeWeight(1);
  rect(panelX, panelY, panelWidth, panelHeight);
  noStroke();

  fill(255);
  textAlign(LEFT, TOP);
  textSize(28);
  text("Inventory", panelX + 24, panelY + 20);
  textSize(12);
  fill(255);
  text("Press I to resume", panelX + 24, panelY + 56);

  fill(255);
  textAlign(RIGHT, TOP);
  textSize(14);
  text(`Gold: ${inventory.gold}`, panelX + panelWidth - 24, panelY + 28);

  fill(255);
  textAlign(LEFT, TOP);
  textSize(16);
  text("Equipment", panelX + 36, panelY + 88);

  const layout = inventoryUiLayout(inventory);
  for (const slot of layout.equipmentSlots) {
    fill(255);
    textAlign(CENTER, BOTTOM);
    textSize(12);
    text(slot.label, slot.x + slot.w / 2, slot.y - 8);
    drawInventorySlot(slot, drag);
  }

  fill(255);
  textAlign(LEFT, TOP);
  textSize(16);
  text("Bag", 300, panelY + 88);
  fill(255);
  textSize(11);
  text("Drag weapon or armor to equip", 300, panelY + 116);
  for (const slot of layout.bagSlots) {
    drawInventorySlot(slot, drag);
  }
  drawDraggedInventoryItem(drag, pointerX, pointerY);
}
