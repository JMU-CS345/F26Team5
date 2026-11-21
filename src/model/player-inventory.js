// Player-specific storage built from the generic inventory and slot models.

const PLAYER_EQUIPMENT_TYPES = Object.freeze({
  melee: MeleeWeapon,
  projectile: ProjectileWeapon,
  head: Helmet,
  body: ChestArmor,
  legs: LegArmor
});

// Sort key for the bag: weapons by rarity (best first), then armor, then everything else.
function bagSortRank(item) {
  if (item instanceof Weapon) {
    return 10 + rarityIndex(item.rarity);
  }
  if (item instanceof Armor) {
    return 5;
  }
  return 0;
}

// The bag is a BagGrid (see bag-grid.js). Equipped gear and gold are kept apart from it.
class PlayerInventory extends Inventory {
  constructor(options = {}) {
    super({ capacity: 0 });
    this.grid = new BagGrid(options.columns, options.rows);
    this.capacity = this.grid.columns * this.grid.rows; // cells, shown as used/total
    this._equipmentSlots = {};
    for (const [name, acceptedType] of Object.entries(PLAYER_EQUIPMENT_TYPES)) {
      this._equipmentSlots[name] = new InventorySlot(acceptedType);
    }
    this._goldSlot = new InventorySlot(Gold, { hidden: true });
  }

  get size() {
    return this.grid.entries().length;
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
    const columns = this.grid.columns;
    const bagContents = this.grid.entries().map((e) => Object.freeze({
      slotIndex: e.row * columns + e.col,
      item: e.item,
      quantity: e.quantity,
      hidden: false,
      col: e.col,
      row: e.row
    }));
    if (options.includeHidden !== true || this._goldSlot.empty) {
      return Object.freeze(bagContents);
    }
    return Object.freeze([...bagContents, Object.freeze({
      slotIndex: "gold",
      item: this._goldSlot._stack.item,
      quantity: this._goldSlot._stack.quantity,
      hidden: true
    })]);
  }

  // Adds to a grid (the real one or a trial copy): tops up stacks, then autoPlaces the rest.
  // False when it does not all fit.
  _addTo(grid, item, quantity) {
    let remaining = quantity;
    for (const entry of grid.entries()) {
      if (item.stackable && entry.item.isStackCompatible(item)) {
        const amount = Math.min(remaining, entry.item.maxStackSize - entry.quantity);
        entry.quantity += amount;
        remaining -= amount;
      }
    }
    while (remaining > 0) {
      const amount = Math.min(remaining, item.maxStackSize);
      if (grid.autoPlace(item, amount) === null) {
        return false;
      }
      remaining -= amount;
    }
    return true;
  }

  findAvailableSpace(item) {
    if (item instanceof Gold) {
      if (this._goldSlot.empty) {
        return Infinity;
      }
      return this._goldSlot._stack.spaceRemaining;
    }
    if (!(item instanceof Item)) {
      throw new TypeError("item must be an Item");
    }
    if (!item.stackable && this.grid.entryOf(item) !== null) {
      return 0;
    }
    const trial = this.grid.clone();
    let space = 0;
    while (space < this.capacity * item.maxStackSize && this._addTo(trial, item, 1)) {
      space++;
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
    const item = normalized.item;
    if (item instanceof Gold) {
      return true;
    }
    if (!item.stackable && this.grid.entryOf(item) !== null) {
      return false;
    }
    return this._addTo(this.grid.clone(), item, normalized.quantity);
  }

  // Autoplaces the item. Throws when nothing fits: check canAdd first.
  add(itemOrStack, quantity) {
    const normalized = this._normalizeItemAndQuantity(itemOrStack, quantity);
    if (normalized.item instanceof Gold) {
      this._goldSlot.insert(new ItemStack(normalized.item, normalized.quantity));
      return true;
    }
    if (!this.canAdd(normalized.item, normalized.quantity)) {
      throw new RangeError("the inventory does not have enough space");
    }
    return this._addTo(this.grid, normalized.item, normalized.quantity);
  }

  quantityOf(itemOrId) {
    const bagTotal = this.grid.entries().reduce((total, e) => {
      if (this._matches(e.item, itemOrId)) {
        return total + e.quantity;
      }
      return total;
    }, 0);
    const goldMatches = !this._goldSlot.empty
      && this._matches(this._goldSlot._stack.item, itemOrId);
    if (goldMatches) {
      return bagTotal + this._goldSlot._stack.quantity;
    }
    return bagTotal;
  }

  remove(itemOrId, quantity = 1) {
    const goldMatches = !this._goldSlot.empty
      && this._matches(this._goldSlot._stack.item, itemOrId);
    requirePositiveQuantity(quantity);
    if (goldMatches) {
      if (quantity > this._goldSlot._stack.quantity) {
        throw new RangeError("the inventory does not contain enough matching items");
      }
      return this._goldSlot.remove(quantity);
    }
    if (this.quantityOf(itemOrId) < quantity) {
      throw new RangeError("the inventory does not contain enough matching items");
    }
    let remaining = quantity;
    let removedItem = null;
    for (const entry of this.grid.entries()) {
      if (remaining === 0) {
        break;
      }
      if (!this._matches(entry.item, itemOrId)) {
        continue;
      }
      const amount = Math.min(remaining, entry.quantity);
      removedItem = entry.item;
      entry.quantity -= amount;
      remaining -= amount;
      if (entry.quantity === 0) {
        this.grid.removeEntry(entry); // frees its cells
      }
    }
    if (quantity <= removedItem.maxStackSize) {
      return new ItemStack(removedItem, quantity);
    }
    const stacks = [];
    for (let left = quantity; left > 0; left -= removedItem.maxStackSize) {
      stacks.push(new ItemStack(removedItem, Math.min(left, removedItem.maxStackSize)));
    }
    return Object.freeze(stacks);
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

  // Moves a bag item to its equipment slot. The item it replaces takes the vacated cells,
  // or the first free spot. Throws (and changes nothing) when it has nowhere to go.
  equip(itemOrId) {
    const entry = this.grid.entries().find((e) => this._matches(e.item, itemOrId));
    if (entry === undefined) {
      throw new RangeError("the item is not in the player bag");
    }
    const item = entry.item;
    const equipmentName = this._equipmentNameFor(item);
    if (equipmentName === null) {
      throw new TypeError("that item cannot be equipped");
    }

    const state = this._captureState();
    try {
      this.grid.remove(item);
      const equipmentSlot = this._equipmentSlots[equipmentName];
      if (!equipmentSlot.empty) {
        const previous = equipmentSlot.remove().item;
        const placed = this.grid.place(previous, entry.col, entry.row)
          || this.grid.autoPlace(previous) !== null;
        if (!placed) {
          throw new RangeError("the inventory does not have enough space");
        }
      }
      equipmentSlot.insert(new ItemStack(item));
      return item;
    } catch (error) {
      this._restoreState(state);
      throw error;
    }
  }

  // Puts a weapon or armor that is not in the bag straight into its equipment slot and
  // returns the item it replaces (null if the slot was empty). Works with a full bag.
  swapEquipped(item) {
    const equipmentName = this._equipmentNameFor(item);
    if (equipmentName === null) {
      throw new TypeError("that item cannot be equipped");
    }
    const slot = this._equipmentSlots[equipmentName];
    let previous = null;
    if (!slot.empty) {
      previous = slot.remove().item;
    }
    slot.insert(new ItemStack(item));
    return previous;
  }

  // Repacks the bag: best rarity first, then bigger items, then by name. Equipment and gold
  // stay put. Returns false (and changes nothing) if the repack would lose an item.
  sortBag() {
    const before = this.grid.clone();
    const entries = [];
    for (const entry of this.grid.entries()) {
      let quantity = entry.quantity;
      // Partial stacks of one item top each other up before repacking.
      const open = entries.find((e) => e.item.stackable && e.item.isStackCompatible(entry.item)
        && e.quantity < e.item.maxStackSize);
      if (open !== undefined) {
        const moved = Math.min(quantity, open.item.maxStackSize - open.quantity);
        open.quantity += moved;
        quantity -= moved;
      }
      if (quantity > 0) {
        entries.push({ item: entry.item, quantity: quantity, w: entry.w, h: entry.h });
      }
    }
    entries.sort((a, b) => {
      const byRank = bagSortRank(b.item) - bagSortRank(a.item);
      if (byRank !== 0) {
        return byRank;
      }
      const byArea = b.w * b.h - a.w * a.h;
      if (byArea !== 0) {
        return byArea;
      }
      return a.item.name.localeCompare(b.item.name);
    });
    this.grid.clear();
    for (const entry of entries) {
      if (this.grid.autoPlace(entry.item, entry.quantity) === null) {
        this.grid = before;
        return false;
      }
    }
    return true;
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
    if (!this.canAdd(item)) {
      return null;
    }
    slot.remove();
    this.add(item);
    return item;
  }

  getEquipped(equipmentName) {
    const slot = this._equipmentSlots[equipmentName];
    if (slot === undefined) {
      throw new TypeError("unknown equipment slot");
    }
    return slot.empty ? null : slot._stack.item;
  }

  // Uses one item from the bag on the target. Its stack shrinks, and the cell frees at zero.
  consume(itemOrId, target) {
    const entry = this.grid.entries().find((e) => this._matches(e.item, itemOrId));
    if (entry === undefined || !(entry.item instanceof Consumable)) {
      return false;
    }
    const item = entry.item;
    if (!item.canUse(target)) {
      return false;
    }

    const state = this._captureState();
    const previousHealth = target.health;
    try {
      this.remove(item, 1);
      if (!item.applyTo(target)) {
        throw new Error("the consumable effect could not be applied");
      }
      return true;
    } catch (error) {
      this._restoreState(state);
      target.health = previousHealth;
      return false;
    }
  }

  transferTo(destination, itemOrId, quantity = 1) {
    if (!(destination instanceof Inventory)) {
      throw new TypeError("destination must be an Inventory");
    }
    requirePositiveQuantity(quantity);
    const goldMatches = !this._goldSlot.empty
      && this._matches(this._goldSlot._stack.item, itemOrId);
    let item = null;
    if (goldMatches) {
      item = this._goldSlot._stack.item;
    } else {
      const found = this.grid.entries().find((e) => this._matches(e.item, itemOrId));
      if (found !== undefined) {
        item = found.item;
      }
    }
    if (item === null || this.quantityOf(itemOrId) < quantity
        || !destination.canAdd(item, quantity)) {
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

  _captureState() {
    const state = super._captureState();
    state.grid = this.grid.clone();
    state.equipmentSlots = {};
    for (const [name, slot] of Object.entries(this._equipmentSlots)) {
      state.equipmentSlots[name] = slot.clone();
    }
    state.goldSlot = this._goldSlot.clone();
    return state;
  }

  _restoreState(state) {
    super._restoreState(state);
    if (state.grid !== undefined) {
      this.grid = state.grid.clone();
    }
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
