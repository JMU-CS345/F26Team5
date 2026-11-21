// The Diablo-style bag: a grid of cells where every item covers a rectangle. Pure model, no
// p5 calls. Load after items.js.
//
// An entry is { item, quantity, col, row, w, h }. Potions stack in one cell, so quantity is
// only above 1 for stackable items.

const BAG_COLUMNS = 10;
const BAG_ROWS = 6;

// Cells (width, height) by weapon base id. Any other weapon is 1x3.
const WEAPON_CELLS = Object.freeze({
  dagger: { w: 1, h: 2 },
  wand: { w: 1, h: 2 },
  spear: { w: 1, h: 4 },
  hammer: { w: 2, h: 3 }
});

class BagGrid {
  constructor(columns = BAG_COLUMNS, rows = BAG_ROWS) {
    this.columns = columns;
    this.rows = rows;
    this._entries = [];
  }

  // The cells an item covers: { w, h }.
  static itemSize(item) {
    if (item instanceof Weapon) {
      return WEAPON_CELLS[item.baseId] || { w: 1, h: 3 };
    }
    if (item instanceof Helmet || item instanceof LegArmor) {
      return { w: 2, h: 2 };
    }
    if (item instanceof ChestArmor) {
      return { w: 2, h: 3 };
    }
    return { w: 1, h: 1 };
  }

  // True when the item fits at (col, row) without leaving the grid or touching another item.
  canPlace(item, col, row) {
    const size = BagGrid.itemSize(item);
    if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || row < 0) {
      return false;
    }
    if (col + size.w > this.columns || row + size.h > this.rows) {
      return false;
    }
    return this.entriesIn(col, row, size.w, size.h).length === 0;
  }

  // The entries that touch a rectangle of cells.
  entriesIn(col, row, w, h) {
    return this._entries.filter((e) => (
      e.col < col + w && col < e.col + e.w && e.row < row + h && row < e.row + e.h
    ));
  }

  // Puts an item down. False when it does not fit, or when a gear piece is already in the
  // grid (only stackable items may sit in several cells, one per stack).
  place(item, col, row, quantity = 1) {
    if ((!item.stackable && this.entryOf(item) !== null) || !this.canPlace(item, col, row)) {
      return false;
    }
    const size = BagGrid.itemSize(item);
    this._entries.push({ item, quantity, col, row, w: size.w, h: size.h });
    return true;
  }

  // Takes an item out and returns its entry, or null when it is not here.
  remove(item) {
    const entry = this.entryOf(item);
    if (entry !== null) {
      this.removeEntry(entry);
    }
    return entry;
  }

  // Takes out one entry. Use it for a stackable item, which can sit in several cells.
  removeEntry(entry) {
    this._entries.splice(this._entries.indexOf(entry), 1);
  }

  entryOf(item) {
    return this._entries.find((e) => e.item === item) || null;
  }

  // The entry covering a cell, or null.
  itemAt(col, row) {
    return this.entriesIn(col, row, 1, 1)[0] || null;
  }

  // First spot that fits, going down each column before the next one, like Diablo.
  // Returns the entry, or null when nothing fits.
  autoPlace(item, quantity = 1) {
    for (let col = 0; col < this.columns; col++) {
      for (let row = 0; row < this.rows; row++) {
        if (this.place(item, col, row, quantity)) {
          return this._entries[this._entries.length - 1];
        }
      }
    }
    return null;
  }

  // Every entry, top to bottom, left to right.
  entries() {
    return this._entries.slice().sort((a, b) => a.row - b.row || a.col - b.col);
  }

  clear() {
    this._entries = [];
  }

  clone() {
    const copy = new BagGrid(this.columns, this.rows);
    copy._entries = this._entries.map((e) => ({ ...e }));
    return copy;
  }
}
