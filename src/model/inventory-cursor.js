// Where the keyboard cursor sits in the inventory screen. No p5 calls.
// Equipment slots are two rows (melee, projectile / head, body, legs) beside the bag, which
// is a 10 by 6 grid. The cursor stops at the edges instead of wrapping.

const CURSOR_EQUIPMENT_ROW_LENGTHS = Object.freeze([2, 3]);
const CURSOR_BAG_COLUMNS = 10; // same grid as INVENTORY_BAG_COLUMNS in inventory-input.js
const CURSOR_BAG_ROWS = 6;

class InventoryCursor {
  constructor() {
    this.section = "bag";
    this.index = 0;
  }

  // Equipment index to row and column, and back.
  equipmentRow() {
    if (this.index < CURSOR_EQUIPMENT_ROW_LENGTHS[0]) {
      return 0;
    }
    return 1;
  }

  equipmentColumn() {
    if (this.equipmentRow() === 0) {
      return this.index;
    }
    return this.index - CURSOR_EQUIPMENT_ROW_LENGTHS[0];
  }

  setEquipment(row, column) {
    const lastColumn = CURSOR_EQUIPMENT_ROW_LENGTHS[row] - 1;
    const safeColumn = Math.min(column, lastColumn);
    this.section = "equipment";
    this.index = safeColumn;
    if (row === 1) {
      this.index = CURSOR_EQUIPMENT_ROW_LENGTHS[0] + safeColumn;
    }
  }

  setBag(row, column) {
    this.section = "bag";
    this.index = row * CURSOR_BAG_COLUMNS + column;
  }

  // dx and dy are -1, 0 or 1.
  move(dx, dy) {
    if (this.section === "bag") {
      this.moveInBag(dx, dy);
    } else {
      this.moveInEquipment(dx, dy);
    }
  }

  moveInBag(dx, dy) {
    const column = this.index % CURSOR_BAG_COLUMNS;
    const row = Math.floor(this.index / CURSOR_BAG_COLUMNS);
    if (dx < 0 && column === 0) {
      this.setEquipment(Math.min(row, 1), 99); // 99 means the last column of that row
      return;
    }
    const newColumn = Math.min(Math.max(column + dx, 0), CURSOR_BAG_COLUMNS - 1);
    const newRow = Math.min(Math.max(row + dy, 0), CURSOR_BAG_ROWS - 1);
    this.setBag(newRow, newColumn);
  }

  moveInEquipment(dx, dy) {
    const row = this.equipmentRow();
    const column = this.equipmentColumn();
    if (dx > 0 && column === CURSOR_EQUIPMENT_ROW_LENGTHS[row] - 1) {
      this.setBag(row, 0);
      return;
    }
    const newRow = Math.min(Math.max(row + dy, 0), CURSOR_EQUIPMENT_ROW_LENGTHS.length - 1);
    const newColumn = Math.max(column + dx, 0);
    this.setEquipment(newRow, newColumn);
  }
}
