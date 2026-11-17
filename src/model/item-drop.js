// A collectible item stack placed in the game world.

const ITEM_DROP_SIZE = 12;
const ITEM_DROP_BOB_HEIGHT = 3;
const ITEM_DROP_BOB_SPEED = 0.08;

class ItemDrop {
  constructor(x, y, item, quantity = 1) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new TypeError("item drop coordinates must be finite numbers");
    }
    const stack = new ItemStack(item, quantity);
    this.x = x;
    this.y = y;
    this.item = stack.item;
    this.quantity = stack.quantity;
    this.size = ITEM_DROP_SIZE;
    this.age = 0;
    this.justDropped = false; // set when the player drops it, so it is not grabbed again
  }

  update() {
    this.age++;
  }

  get bobOffset() {
    return Math.sin(this.age * ITEM_DROP_BOB_SPEED) * ITEM_DROP_BOB_HEIGHT;
  }

  getBounds() {
    return { x: this.x, y: this.y, w: this.size, h: this.size };
  }
}
