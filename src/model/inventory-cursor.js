// Where the keyboard cursor sits in the inventory screen. No p5 calls.
// The doll has five slots and the bag is a 10 by 6 grid. The cursor stops at the edges instead
// of wrapping. Equipment indexes follow PLAYER_EQUIPMENT_TYPES: melee, projectile, head, body, legs.

const CURSOR_EQUIPMENT_NAMES = Object.freeze(["melee", "projectile", "head", "body", "legs"]);
const CURSOR_BAG_COLUMNS = 10; // same grid as INVENTORY_BAG_COLUMNS in inventory-input.js
const CURSOR_BAG_ROWS = 6;

// Which slot each arrow reaches from each doll slot, matching INVENTORY_DOLL_SLOTS on screen.
// Right from projectile (Magic) leaves the doll for the bag, so it is not listed.
const CURSOR_DOLL_MOVES = Object.freeze({
  head: { left: "melee", right: "projectile", down: "body" },
  body: { left: "melee", right: "projectile", up: "head", down: "legs" },
  legs: { left: "melee", right: "projectile", up: "body" },
  melee: { right: "body" },
  projectile: { left: "body" }
});

class InventoryCursor {
  constructor() {
    this.section = "bag";
    this.index = 0;
    this.lastBag = 0; // where Tab returns to
    this.lastEquipment = 3; // the body slot
  }

  // Tab: jump to the other side and land where the cursor last was there.
  switchSection() {
    if (this.section === "bag") {
      this.lastBag = this.index;
      this.section = "equipment";
      this.index = this.lastEquipment;
      return;
    }
    this.lastEquipment = this.index;
    this.section = "bag";
    this.index = this.lastBag;
  }

  setBag(row, column) {
    this.section = "bag";
    this.index = row * CURSOR_BAG_COLUMNS + column;
  }

  // dx and dy are -1, 0 or 1. Pass the bag grid to skip ahead to the next different item or
  // empty cell; without it the cursor steps one cell.
  move(dx, dy, grid = null) {
    if (this.section === "bag") {
      this.moveInBag(dx, dy, grid);
    } else {
      this.moveInEquipment(dx, dy);
    }
  }

  moveInBag(dx, dy, grid) {
    const column = this.index % CURSOR_BAG_COLUMNS;
    const row = Math.floor(this.index / CURSOR_BAG_COLUMNS);
    if (dx < 0 && column === 0) {
      this.enterDoll(row);
      return;
    }
    let newColumn = Math.min(Math.max(column + dx, 0), CURSOR_BAG_COLUMNS - 1);
    let newRow = Math.min(Math.max(row + dy, 0), CURSOR_BAG_ROWS - 1);
    if (grid !== null) {
      const start = grid.itemAt(column, row);
      while (grid.itemAt(newColumn, newRow) === start) {
        const nextColumn = newColumn + dx;
        const nextRow = newRow + dy;
        if (nextColumn < 0 || nextColumn >= CURSOR_BAG_COLUMNS) {
          break;
        }
        if (nextRow < 0 || nextRow >= CURSOR_BAG_ROWS) {
          break;
        }
        newColumn = nextColumn;
        newRow = nextRow;
      }
    }
    this.setBag(newRow, newColumn);
  }

  // The doll slot closest to this bag row (INVENTORY_DOLL_SLOTS, INVENTORY_BAG_* are in
  // inventory-input.js).
  enterDoll(bagRow) {
    const bagX = INVENTORY_BAG_X + INVENTORY_BAG_CELL / 2;
    const bagY = INVENTORY_BAG_Y + bagRow * INVENTORY_BAG_CELL + INVENTORY_BAG_CELL / 2;
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < CURSOR_EQUIPMENT_NAMES.length; i++) {
      const spot = INVENTORY_DOLL_SLOTS[CURSOR_EQUIPMENT_NAMES[i]];
      const half = INVENTORY_SLOT_SIZE / 2;
      const distance = Math.hypot(bagX - (spot.x + half), bagY - (spot.y + half));
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    this.lastBag = this.index;
    this.section = "equipment";
    this.index = bestIndex;
  }

  moveInEquipment(dx, dy) {
    const name = CURSOR_EQUIPMENT_NAMES[this.index];
    if (dx > 0 && name === "projectile") {
      this.enterBag();
      return;
    }
    let direction = "";
    if (dx < 0) {
      direction = "left";
    } else if (dx > 0) {
      direction = "right";
    } else if (dy < 0) {
      direction = "up";
    } else if (dy > 0) {
      direction = "down";
    }
    const target = CURSOR_DOLL_MOVES[name][direction];
    if (target !== undefined) {
      this.index = CURSOR_EQUIPMENT_NAMES.indexOf(target);
    }
  }

  // Right from Magic: column 0 of the bag row level with the Magic slot.
  enterBag() {
    const spot = INVENTORY_DOLL_SLOTS.projectile;
    const middle = spot.y + INVENTORY_SLOT_SIZE / 2;
    const row = Math.floor((middle - INVENTORY_BAG_Y) / INVENTORY_BAG_CELL);
    this.lastEquipment = this.index;
    this.setBag(Math.min(Math.max(row, 0), CURSOR_BAG_ROWS - 1), 0);
  }
}
