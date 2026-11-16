// Reusable item definitions. These models contain no rendering or gameplay behavior.

const DEFAULT_MAX_STACK_SIZE = 99;
let nextItemInstanceId = 1;

function itemOptions(idOrOptions, name, value, maxStackSize) {
  if (typeof idOrOptions === "object" && idOrOptions !== null) {
    return { ...idOrOptions };
  }
  return { id: idOrOptions, name, value, maxStackSize };
}

function requireNonEmptyString(value, propertyName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${propertyName} must be a non-empty string`);
  }
}

function requireNonNegativeNumber(value, propertyName) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${propertyName} must be a non-negative number`);
  }
}

class Item {
  constructor(idOrOptions, name, value = 0, maxStackSize = DEFAULT_MAX_STACK_SIZE) {
    const options = itemOptions(idOrOptions, name, value, maxStackSize);
    const resolvedValue = options.value === undefined ? 0 : options.value;
    const resolvedMax = options.maxStackSize === undefined
      ? DEFAULT_MAX_STACK_SIZE
      : options.maxStackSize;

    requireNonEmptyString(options.id, "id");
    requireNonEmptyString(options.name, "name");
    requireNonNegativeNumber(resolvedValue, "value");
    if (resolvedMax !== Infinity
        && (!Number.isInteger(resolvedMax) || resolvedMax < 1)) {
      throw new TypeError("maxStackSize must be a positive integer or Infinity");
    }

    this.id = options.id;
    this.name = options.name;
    this.value = resolvedValue;
    this.maxStackSize = resolvedMax;
    this.description = options.description === undefined ? "" : options.description;
    if (typeof this.description !== "string") {
      throw new TypeError("description must be a string");
    }
    this.instanceId = resolvedMax === 1 ? `item-instance-${nextItemInstanceId++}` : null;
  }

  get stackable() {
    return this.maxStackSize > 1;
  }

  get isStackable() {
    return this.stackable;
  }

  isStackCompatible(other) {
    return this.stackable
      && other instanceof Item
      && other.stackable
      && this.constructor === other.constructor
      && this.id === other.id;
  }
}

class Weapon extends Item {
  constructor(options = {}) {
    const resolved = { ...options, maxStackSize: 1 };
    super(resolved);
    const damage = options.damage === undefined ? 0 : options.damage;
    requireNonNegativeNumber(damage, "damage");
    const elementalType = options.elementalType === undefined
      ? options.element
      : options.elementalType;
    if (elementalType !== undefined && elementalType !== null) {
      requireNonEmptyString(elementalType, "elementalType");
    }
    this.damage = damage;
    this.elementalType = elementalType === undefined ? null : elementalType;
    this.element = this.elementalType;
    this.attackType = options.attackType === undefined ? "Weapon" : options.attackType;
    requireNonEmptyString(this.attackType, "attackType");
  }
}

class MeleeWeapon extends Weapon {
  constructor(options = {}) {
    super({ ...options, attackType: options.attackType || "Melee" });
  }
}

class ProjectileWeapon extends Weapon {
  constructor(options = {}) {
    super({ ...options, attackType: options.attackType || "Projectile" });
  }
}

class Armor extends Item {
  constructor(options = {}) {
    const resolved = { ...options, maxStackSize: 1 };
    super(resolved);
    const defense = options.defense === undefined ? 0 : options.defense;
    requireNonNegativeNumber(defense, "defense");
    this.defense = defense;
  }
}

class Helmet extends Armor {}

class ChestArmor extends Armor {}

class LegArmor extends Armor {}

class Consumable extends Item {
  constructor(options = {}) {
    super(options);
    const healthRestore = options.healthRestore === undefined ? 0 : options.healthRestore;
    requireNonNegativeNumber(healthRestore, "healthRestore");
    this.healthRestore = healthRestore;
  }

  canUse(target) {
    return this.healthRestore > 0
      && target !== null
      && typeof target === "object"
      && typeof target.health === "number"
      && typeof target.maxHealth === "number"
      && target.health < target.maxHealth;
  }

  applyTo(target) {
    if (!this.canUse(target)) {
      return false;
    }
    target.health = Math.min(target.maxHealth, target.health + this.healthRestore);
    return true;
  }
}

class Gold extends Item {
  constructor(options = {}) {
    super({
      name: "Gold",
      value: 1,
      ...options,
      id: "gold",
      maxStackSize: Infinity
    });
  }
}
