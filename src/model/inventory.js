// Generic item storage. This file depends only on the item models.

function requirePositiveQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new TypeError("quantity must be a positive integer");
  }
}

class ItemStack {
  constructor(item, quantity = 1) {
    if (!(item instanceof Item)) {
      throw new TypeError("item must be an Item");
    }
    requirePositiveQuantity(quantity);
    if (!item.stackable && quantity !== 1) {
      throw new RangeError("non-stackable items must have a quantity of one");
    }
    if (quantity > item.maxStackSize) {
      throw new RangeError("quantity exceeds the item's maximum stack size");
    }
    this.item = item;
    this.quantity = quantity;
  }

  get spaceRemaining() {
    return this.item.maxStackSize - this.quantity;
  }

  canStackWith(itemOrStack) {
    const item = itemOrStack instanceof ItemStack ? itemOrStack.item : itemOrStack;
    return item instanceof Item && this.item.isStackCompatible(item);
  }

  add(quantity) {
    requirePositiveQuantity(quantity);
    if (quantity > this.spaceRemaining) {
      throw new RangeError("quantity exceeds the item's maximum stack size");
    }
    this.quantity += quantity;
    return this.quantity;
  }

  remove(quantity) {
    requirePositiveQuantity(quantity);
    if (quantity > this.quantity) {
      throw new RangeError("cannot remove more items than the stack contains");
    }
    this.quantity -= quantity;
    return new ItemStack(this.item, quantity);
  }

  clone() {
    return new ItemStack(this.item, this.quantity);
  }
}

class InventorySlot {
  constructor(acceptedType = Item, options = {}) {
    if (typeof acceptedType !== "function"
        || !(acceptedType === Item || acceptedType.prototype instanceof Item)) {
      throw new TypeError("acceptedType must be Item or an Item subclass");
    }
    this.acceptedType = acceptedType;
    this.hidden = options.hidden === true;
    this._stack = null;
  }

  get empty() {
    return this._stack === null;
  }

  get stack() {
    return this._stack === null ? null : this._stack.clone();
  }

  accepts(itemOrStack) {
    const item = itemOrStack instanceof ItemStack ? itemOrStack.item : itemOrStack;
    return item instanceof this.acceptedType;
  }

  canInsert(stack) {
    if (!(stack instanceof ItemStack) || !this.accepts(stack)) {
      return false;
    }
    if (this._stack === null) {
      return true;
    }
    return this._stack.canStackWith(stack)
      && stack.quantity <= this._stack.spaceRemaining;
  }

  insert(stack) {
    if (!(stack instanceof ItemStack)) {
      throw new TypeError("stack must be an ItemStack");
    }
    if (!this.accepts(stack)) {
      throw new TypeError("this slot does not accept that item type");
    }
    if (!this.canInsert(stack)) {
      throw new RangeError("the stack does not fit in this slot");
    }
    if (this._stack === null) {
      this._stack = stack.clone();
    } else {
      this._stack.add(stack.quantity);
    }
    return this.stack;
  }

  remove(quantity = null) {
    if (this._stack === null) {
      throw new RangeError("cannot remove from an empty slot");
    }
    const amount = quantity === null ? this._stack.quantity : quantity;
    requirePositiveQuantity(amount);
    if (amount > this._stack.quantity) {
      throw new RangeError("cannot remove more items than the slot contains");
    }
    const removed = this._stack.remove(amount);
    if (this._stack.quantity === 0) {
      this._stack = null;
    }
    return removed;
  }

  inspect() {
    if (this._stack === null) {
      return null;
    }
    return Object.freeze({
      item: this._stack.item,
      quantity: this._stack.quantity,
      hidden: this.hidden,
      acceptedType: this.acceptedType
    });
  }

  clone() {
    const copy = new InventorySlot(this.acceptedType, { hidden: this.hidden });
    if (this._stack !== null) {
      copy._stack = this._stack.clone();
    }
    return copy;
  }
}

class Inventory {
  constructor(capacityOrOptions = {}) {
    const options = typeof capacityOrOptions === "number"
      ? { capacity: capacityOrOptions }
      : capacityOrOptions;
    if (options === null || typeof options !== "object") {
      throw new TypeError("inventory options must be an object or a capacity");
    }
    const capacity = options.capacity === undefined ? Infinity : options.capacity;
    const acceptedType = options.acceptedType === undefined ? Item : options.acceptedType;
    if (capacity !== Infinity && (!Number.isInteger(capacity) || capacity < 0)) {
      throw new TypeError("capacity must be a non-negative integer or Infinity");
    }
    if (typeof acceptedType !== "function"
        || !(acceptedType === Item || acceptedType.prototype instanceof Item)) {
      throw new TypeError("acceptedType must be Item or an Item subclass");
    }

    this.capacity = capacity;
    this.acceptedType = acceptedType;
    this._slots = [];
    if (capacity !== Infinity) {
      for (let index = 0; index < capacity; index++) {
        this._slots.push(new InventorySlot(acceptedType));
      }
    }
  }

  get slots() {
    return Object.freeze(this._slots.map((slot) => slot.clone()));
  }

  get size() {
    return this._slots.filter((slot) => !slot.empty).length;
  }

  contents(options = {}) {
    const includeHidden = options.includeHidden === true;
    return Object.freeze(this._slots
      .map((slot, slotIndex) => ({ slot, slotIndex }))
      .filter(({ slot }) => !slot.empty && (includeHidden || !slot.hidden))
      .map(({ slot, slotIndex }) => Object.freeze({
        slotIndex,
        item: slot._stack.item,
        quantity: slot._stack.quantity,
        hidden: slot.hidden
      })));
  }

  _normalizeItemAndQuantity(itemOrStack, quantity) {
    if (itemOrStack instanceof ItemStack) {
      const amount = quantity === undefined ? itemOrStack.quantity : quantity;
      requirePositiveQuantity(amount);
      if (amount > itemOrStack.quantity) {
        throw new RangeError("quantity exceeds the supplied stack");
      }
      return { item: itemOrStack.item, quantity: amount };
    }
    if (!(itemOrStack instanceof Item)) {
      throw new TypeError("item must be an Item or ItemStack");
    }
    const amount = quantity === undefined ? 1 : quantity;
    requirePositiveQuantity(amount);
    if (!itemOrStack.stackable && amount !== 1) {
      throw new RangeError("non-stackable items must have a quantity of one");
    }
    return { item: itemOrStack, quantity: amount };
  }

  _containsInstance(item) {
    return !item.stackable && this._slots.some((slot) => (
      !slot.empty && slot._stack.item === item
    ));
  }

  findAvailableSpace(item) {
    if (!(item instanceof Item)) {
      throw new TypeError("item must be an Item");
    }
    if (!(item instanceof this.acceptedType) || this._containsInstance(item)) {
      return 0;
    }

    let space = 0;
    for (const slot of this._slots) {
      if (!slot.accepts(item)) {
        continue;
      }
      if (slot.empty) {
        space += item.maxStackSize;
      } else if (slot._stack.canStackWith(item)) {
        space += slot._stack.spaceRemaining;
      }
    }
    if (this.capacity === Infinity) {
      return Infinity;
    }
    return space;
  }

  canAdd(itemOrStack, quantity) {
    let normalized;
    try {
      normalized = this._normalizeItemAndQuantity(itemOrStack, quantity);
    } catch (error) {
      return false;
    }
    return normalized.item instanceof this.acceptedType
      && this.findAvailableSpace(normalized.item) >= normalized.quantity;
  }

  add(itemOrStack, quantity) {
    const normalized = this._normalizeItemAndQuantity(itemOrStack, quantity);
    const item = normalized.item;
    let remaining = normalized.quantity;
    if (!(item instanceof this.acceptedType)) {
      throw new TypeError("this inventory does not accept that item type");
    }
    if (!this.canAdd(item, remaining)) {
      throw new RangeError("the inventory does not have enough space");
    }

    for (const slot of this._slots) {
      if (remaining === 0) {
        break;
      }
      if (!slot.empty && slot._stack.canStackWith(item)) {
        const amount = Math.min(remaining, slot._stack.spaceRemaining);
        if (amount > 0) {
          slot._stack.add(amount);
          remaining -= amount;
        }
      }
    }

    for (const slot of this._slots) {
      if (remaining === 0) {
        break;
      }
      if (slot.empty && slot.accepts(item)) {
        const amount = Math.min(remaining, item.maxStackSize);
        slot.insert(new ItemStack(item, amount));
        remaining -= amount;
      }
    }

    while (remaining > 0) {
      const slot = new InventorySlot(this.acceptedType);
      const amount = Math.min(remaining, item.maxStackSize);
      slot.insert(new ItemStack(item, amount));
      this._slots.push(slot);
      remaining -= amount;
    }
    return true;
  }

  addItem(itemOrStack, quantity) {
    return this.add(itemOrStack, quantity);
  }

  _matches(item, itemOrId) {
    if (itemOrId instanceof Item) {
      return item.stackable
        ? item.isStackCompatible(itemOrId)
        : item === itemOrId;
    }
    if (typeof itemOrId === "string") {
      return item.id === itemOrId;
    }
    if (typeof itemOrId === "function") {
      return item instanceof itemOrId;
    }
    throw new TypeError("item selector must be an Item, item ID, or Item subclass");
  }

  quantityOf(itemOrId) {
    return this._slots.reduce((total, slot) => {
      if (slot.empty || !this._matches(slot._stack.item, itemOrId)) {
        return total;
      }
      return total + slot._stack.quantity;
    }, 0);
  }

  remove(itemOrId, quantity = 1) {
    requirePositiveQuantity(quantity);
    if (this.quantityOf(itemOrId) < quantity) {
      throw new RangeError("the inventory does not contain enough matching items");
    }

    let remaining = quantity;
    let removedItem = null;
    for (const slot of this._slots) {
      if (remaining === 0) {
        break;
      }
      if (!slot.empty && this._matches(slot._stack.item, itemOrId)) {
        const amount = Math.min(remaining, slot._stack.quantity);
        const removed = slot.remove(amount);
        if (removedItem === null) {
          removedItem = removed.item;
        }
        remaining -= amount;
      }
    }
    if (quantity <= removedItem.maxStackSize) {
      return new ItemStack(removedItem, quantity);
    }
    const removedStacks = [];
    let unstackedQuantity = quantity;
    while (unstackedQuantity > 0) {
      const amount = Math.min(unstackedQuantity, removedItem.maxStackSize);
      removedStacks.push(new ItemStack(removedItem, amount));
      unstackedQuantity -= amount;
    }
    return Object.freeze(removedStacks);
  }

  removeItem(itemOrId, quantity = 1) {
    return this.remove(itemOrId, quantity);
  }

  findByType(itemType) {
    if (typeof itemType !== "function") {
      throw new TypeError("itemType must be a class");
    }
    return Object.freeze(this.contents({ includeHidden: true })
      .filter((entry) => entry.item instanceof itemType));
  }

  findItemsByType(itemType) {
    return this.findByType(itemType);
  }

  findById(id) {
    requireNonEmptyString(id, "id");
    return Object.freeze(this.contents({ includeHidden: true })
      .filter((entry) => entry.item.id === id));
  }

  findItemsById(id) {
    return this.findById(id);
  }

  _captureState() {
    return { slots: this._slots.map((slot) => slot.clone()) };
  }

  _restoreState(state) {
    this._slots = state.slots.map((slot) => slot.clone());
  }

  transferTo(destination, itemOrId, quantity = 1) {
    if (!(destination instanceof Inventory)) {
      throw new TypeError("destination must be an Inventory");
    }
    requirePositiveQuantity(quantity);
    const sourceMatches = this._slots
      .filter((slot) => !slot.empty && this._matches(slot._stack.item, itemOrId));
    const available = sourceMatches.reduce((total, slot) => total + slot._stack.quantity, 0);
    if (available < quantity) {
      return false;
    }
    const item = sourceMatches[0]._stack.item;
    if (!destination.canAdd(item, quantity)) {
      return false;
    }

    const sourceState = this._captureState();
    const destinationState = destination._captureState();
    try {
      this.remove(itemOrId, quantity);
      destination.add(item, quantity);
      return true;
    } catch (error) {
      this._restoreState(sourceState);
      destination._restoreState(destinationState);
      return false;
    }
  }

  transfer(destination, itemOrId, quantity = 1) {
    return this.transferTo(destination, itemOrId, quantity);
  }
}
