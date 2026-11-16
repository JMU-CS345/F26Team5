// Slot-based inventory overlay. Reads inventory and drag state without changing them.

function drawInventorySlot(slot, drag, selection = null) {
  const isDragged = drag !== null
    && drag.item === slot.item
    && drag.sourceKind === slot.kind
    && (slot.kind !== "equipment" || drag.equipmentName === slot.equipmentName);
  const isSelected = selection !== null
    && selection.item === slot.item
    && selection.sourceKind === slot.kind
    && (slot.kind !== "equipment" || selection.equipmentName === slot.equipmentName);

  push();
  stroke(255);
  strokeWeight(isSelected ? 3 : 1);
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

function drawInventoryContextMenu(inventory, player, selection) {
  const menu = inventoryContextMenuLayout(inventory, player, selection);
  if (menu === null) {
    return;
  }
  push();
  fill(0);
  stroke(255);
  strokeWeight(1);
  rect(menu.x, menu.y, menu.w, menu.h);
  for (const action of menu.actions) {
    if (action.y > menu.y) {
      line(action.x, action.y, action.x + action.w, action.y);
    }
    noStroke();
    fill(action.enabled ? 255 : 110);
    textAlign(LEFT, CENTER);
    textSize(11);
    text(action.label, action.x + 8, action.y + action.h / 2);
    stroke(255);
  }
  pop();
}

function drawInventoryInformation(infoLines) {
  if (infoLines.length === 0) {
    return;
  }
  const box = { x: 74, y: 334, w: 220, h: 92 };
  push();
  fill(0);
  stroke(255);
  strokeWeight(1);
  rect(box.x, box.y, box.w, box.h);
  noStroke();
  fill(255);
  textAlign(LEFT, TOP);
  textSize(11);
  for (let index = 0; index < infoLines.length; index++) {
    text(infoLines[index], box.x + 8, box.y + 8 + index * 16, box.w - 16);
  }
  pop();
}

function drawInventoryMenu(
  inventory,
  player,
  drag = null,
  selection = null,
  infoLines = [],
  pointerX = 0,
  pointerY = 0
) {
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
  const visibleDrag = inventoryDragMoved(drag, pointerX, pointerY) ? drag : null;
  for (const slot of layout.equipmentSlots) {
    fill(255);
    textAlign(CENTER, BOTTOM);
    textSize(12);
    text(slot.label, slot.x + slot.w / 2, slot.y - 8);
    drawInventorySlot(slot, visibleDrag, selection);
  }

  fill(255);
  textAlign(LEFT, TOP);
  textSize(16);
  text("Bag", 320, panelY + 88);
  fill(255);
  textSize(11);
  text("Drag items to equip, or click for options", 320, panelY + 116);
  for (const slot of layout.bagSlots) {
    drawInventorySlot(slot, visibleDrag, selection);
  }
  drawInventoryInformation(infoLines);
  drawInventoryContextMenu(inventory, player, selection);
  drawDraggedInventoryItem(visibleDrag, pointerX, pointerY);
}
