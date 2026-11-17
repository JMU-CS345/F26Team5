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
    textSize(16);
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
    textSize(16);
    text(action.label, action.x + 12, action.y + action.h / 2);
    stroke(255);
  }
  pop();
}

function drawInventoryInformation(infoLines) {
  if (infoLines.length === 0) {
    return;
  }
  const box = { x: 210, y: 500, w: 316, h: 140 };
  push();
  fill(0);
  stroke(255);
  strokeWeight(1);
  rect(box.x, box.y, box.w, box.h);
  noStroke();
  fill(255);
  textAlign(LEFT, TOP);
  textSize(16);
  for (let index = 0; index < infoLines.length; index++) {
    text(infoLines[index], box.x + 12, box.y + 12 + index * 24, box.w - 24);
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
  textSize(42);
  text("Inventory", panelX + 40, panelY + 28);
  textSize(18);
  fill(255);
  text("Press I to resume", panelX + 40, panelY + 82);

  fill(255);
  textAlign(RIGHT, TOP);
  textSize(24);
  text(`Gold: ${inventory.gold}`, panelX + panelWidth - 40, panelY + 42);

  fill(255);
  textAlign(LEFT, TOP);
  textSize(26);
  text("Equipment", 210, panelY + 138);

  const layout = inventoryUiLayout(inventory);
  const visibleDrag = inventoryDragMoved(drag, pointerX, pointerY) ? drag : null;
  for (const slot of layout.equipmentSlots) {
    fill(255);
    textAlign(CENTER, BOTTOM);
    textSize(18);
    text(slot.label, slot.x + slot.w / 2, slot.y - 12);
    drawInventorySlot(slot, visibleDrag, selection);
  }

  fill(255);
  textAlign(LEFT, TOP);
  textSize(26);
  text("Bag", 650, panelY + 138);
  fill(255);
  textSize(16);
  text("Drag to equip, or click for options", 650, panelY + 176);
  for (const slot of layout.bagSlots) {
    drawInventorySlot(slot, visibleDrag, selection);
  }
  drawInventoryInformation(infoLines);
  drawInventoryContextMenu(inventory, player, selection);
  drawDraggedInventoryItem(visibleDrag, pointerX, pointerY);
}
