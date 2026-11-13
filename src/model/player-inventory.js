// Player-specific storage built from the generic inventory and slot models.

const PLAYER_EQUIPMENT_TYPES = Object.freeze({
  weapon: Weapon,
  armor: Armor
});

class PlayerInventory extends Inventory {
  constructor(capacityOrOptions = {}) {
    super(capacityOrOptions);
    if (this.acceptedType !== Item) {
      throw new TypeError("a player bag must accept all Item types");
    }
    this._equipmentSlots = {};
    for (const [name, acceptedType] of Object.entries(PLAYER_EQUIPMENT_TYPES)) {
      this._equipmentSlots[name] = new InventorySlot(acceptedType);
    }
    this._goldSlot = new InventorySlot(Gold, { hidden: true });
  }

  get gold() {
    return this._goldSlot.empty ? 0 : this._goldSlot._stack.quantity;
  }

  get goldQuantity() {
    return this.gold;
  }

  get equipment() {
    const inspected = {};
    for (const [name, slot] of Object.entries(this._equipmentSlots)) {
      inspected[name] = slot.inspect();
    }
    return Object.freeze(inspected);
  }

  contents(options = {}) {
    const bagContents = super.contents(options);
    if (options.includeHidden !== true || this._goldSlot.empty) {
      return bagContents;
    }
    return Object.freeze([...bagContents, Object.freeze({
      slotIndex: "gold",
      item: this._goldSlot._stack.item,
      quantity: this._goldSlot._stack.quantity,
      hidden: true
    })]);
  }

  findAvailableSpace(item) {
    if (item instanceof Gold) {
      return this._goldSlot.empty
        ? Infinity
        : this._goldSlot._stack.spaceRemaining;
    }
    return super.findAvailableSpace(item);
  }

  canAdd(itemOrStack, quantity) {
    const item = itemOrStack instanceof ItemStack ? itemOrStack.item : itemOrStack;
    if (item instanceof Gold) {
      try {
        const normalized = this._normalizeItemAndQuantity(itemOrStack, quantity);
        return normalized.item instanceof Gold;
      } catch (error) {
        return false;
      }
    }
    return super.canAdd(itemOrStack, quantity);
  }

  add(itemOrStack, quantity) {
    const normalized = this._normalizeItemAndQuantity(itemOrStack, quantity);
    if (!(normalized.item instanceof Gold)) {
      return super.add(normalized.item, normalized.quantity);
    }
    const stack = new ItemStack(normalized.item, normalized.quantity);
    this._goldSlot.insert(stack);
    return true;
  }

  quantityOf(itemOrId) {
    const goldMatches = !this._goldSlot.empty
      && this._matches(this._goldSlot._stack.item, itemOrId);
    return super.quantityOf(itemOrId)
      + (goldMatches ? this._goldSlot._stack.quantity : 0);
  }

  remove(itemOrId, quantity = 1) {
    const goldMatches = !this._goldSlot.empty
      && this._matches(this._goldSlot._stack.item, itemOrId);
    if (!goldMatches) {
      return super.remove(itemOrId, quantity);
    }
    requirePositiveQuantity(quantity);
    if (quantity > this._goldSlot._stack.quantity) {
      throw new RangeError("the inventory does not contain enough matching items");
    }
    return this._goldSlot.remove(quantity);
  }

  findByType(itemType) {
    const matches = [...super.findByType(itemType)];
    if (!this._goldSlot.empty && this._goldSlot._stack.item instanceof itemType) {
      matches.push(Object.freeze({
        slotIndex: "gold",
        item: this._goldSlot._stack.item,
        quantity: this._goldSlot._stack.quantity,
        hidden: true
      }));
    }
    return Object.freeze(matches);
  }

  findById(id) {
    const matches = [...super.findById(id)];
    if (!this._goldSlot.empty && this._goldSlot._stack.item.id === id) {
      matches.push(Object.freeze({
        slotIndex: "gold",
        item: this._goldSlot._stack.item,
        quantity: this._goldSlot._stack.quantity,
        hidden: true
      }));
    }
    return Object.freeze(matches);
  }

  _equipmentNameFor(item) {
    for (const [name, itemType] of Object.entries(PLAYER_EQUIPMENT_TYPES)) {
      if (item instanceof itemType) {
        return name;
      }
    }
    return null;
  }

  equip(itemOrId) {
    const matchingSlot = this._slots.find((slot) => (
      !slot.empty && this._matches(slot._stack.item, itemOrId)
    ));
    if (matchingSlot === undefined) {
      throw new RangeError("the item is not in the player bag");
    }
    const item = matchingSlot._stack.item;
    const equipmentName = this._equipmentNameFor(item);
    if (equipmentName === null) {
      throw new TypeError("that item cannot be equipped");
    }

    const state = this._captureState();
    try {
      super.remove(item, 1);
      const equipmentSlot = this._equipmentSlots[equipmentName];
      if (!equipmentSlot.empty) {
        const previous = equipmentSlot.remove();
        super.add(previous);
      }
      equipmentSlot.insert(new ItemStack(item));
      return item;
    } catch (error) {
      this._restoreState(state);
      throw error;
    }
  }

  unequip(equipmentName) {
    const slot = this._equipmentSlots[equipmentName];
    if (slot === undefined) {
      throw new TypeError("unknown equipment slot");
    }
    if (slot.empty) {
      return null;
    }
    const item = slot._stack.item;
    if (!super.canAdd(item)) {
      return null;
    }

    const state = this._captureState();
    try {
      slot.remove();
      super.add(item);
      return item;
    } catch (error) {
      this._restoreState(state);
      return null;
    }
  }

  getEquipped(equipmentName) {
    const slot = this._equipmentSlots[equipmentName];
    if (slot === undefined) {
      throw new TypeError("unknown equipment slot");
    }
    return slot.empty ? null : slot._stack.item;
  }

  transferTo(destination, itemOrId, quantity = 1) {
    const goldMatches = !this._goldSlot.empty
      && this._matches(this._goldSlot._stack.item, itemOrId);
    if (!goldMatches) {
      return super.transferTo(destination, itemOrId, quantity);
    }
    if (!(destination instanceof Inventory)) {
      throw new TypeError("destination must be an Inventory");
    }
    requirePositiveQuantity(quantity);
    if (this.gold < quantity || !destination.canAdd(this._goldSlot._stack.item, quantity)) {
      return false;
    }

    const sourceState = this._captureState();
    const destinationState = destination._captureState();
    const item = this._goldSlot._stack.item;
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

  _captureState() {
    const state = super._captureState();
    state.equipmentSlots = {};
    for (const [name, slot] of Object.entries(this._equipmentSlots)) {
      state.equipmentSlots[name] = slot.clone();
    }
    state.goldSlot = this._goldSlot.clone();
    return state;
  }

  _restoreState(state) {
    super._restoreState(state);
    if (state.equipmentSlots !== undefined) {
      this._equipmentSlots = {};
      for (const [name, slot] of Object.entries(state.equipmentSlots)) {
        this._equipmentSlots[name] = slot.clone();
      }
    }
    if (state.goldSlot !== undefined) {
      this._goldSlot = state.goldSlot.clone();
    }
  }
}
