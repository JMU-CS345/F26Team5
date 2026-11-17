// A keyboard menu. No p5 calls, so Jasmine can test it without a canvas.
// Each item looks like { label, action, enabled, adjust }. The label can be a string or a
// function that returns one, so a settings row can show its current value.

class Menu {
  constructor(items, onBack = null) {
    this.items = items;
    this.onBack = onBack;
    this.index = 0;
    this.skipToEnabled(1);
  }

  isEmpty() {
    return this.items.length === 0;
  }

  isEnabled(item) {
    return item.enabled !== false;
  }

  hasEnabledItem() {
    return this.items.some((item) => this.isEnabled(item));
  }

  // Moves from the current index toward direction (1 or -1) until it lands on an enabled
  // item, wrapping around the ends. Does nothing when every item is disabled.
  skipToEnabled(direction) {
    if (!this.hasEnabledItem()) {
      return;
    }
    while (!this.isEnabled(this.items[this.index])) {
      this.index = (this.index + direction + this.items.length) % this.items.length;
    }
  }

  next() {
    this.step(1);
  }

  previous() {
    this.step(-1);
  }

  step(direction) {
    if (!this.hasEnabledItem()) {
      return;
    }
    this.index = (this.index + direction + this.items.length) % this.items.length;
    this.skipToEnabled(direction);
  }

  selectedItem() {
    if (this.isEmpty()) {
      return null;
    }
    return this.items[this.index];
  }

  labelOf(item) {
    if (typeof item.label === "function") {
      return item.label();
    }
    return item.label;
  }

  // Runs the selected item's action. Returns false when there is nothing to run.
  confirm() {
    const item = this.selectedItem();
    if (item === null || !this.isEnabled(item) || typeof item.action !== "function") {
      return false;
    }
    item.action();
    return true;
  }

  // Left (-1) or right (1) on a row that changes a value, like a volume.
  adjust(direction) {
    const item = this.selectedItem();
    if (item === null || !this.isEnabled(item) || typeof item.adjust !== "function") {
      return false;
    }
    item.adjust(direction);
    return true;
  }

  back() {
    if (typeof this.onBack !== "function") {
      return false;
    }
    this.onBack();
    return true;
  }

  reset() {
    this.index = 0;
    this.skipToEnabled(1);
  }
}
