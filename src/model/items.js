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

const WEAPON_ELEMENTS = Object.freeze(["Fire", "Ice", "Mind"]);

// Reads a number option, falls back to a default, and rejects bad values.
function weaponNumber(options, key, fallback, min, max) {
  const value = options[key] === undefined ? fallback : options[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new TypeError(`${key} must be a number from ${min} to ${max}`);
  }
  return value;
}

function weaponInteger(options, key, fallback, min) {
  const value = weaponNumber(options, key, fallback, min, 1000);
  if (!Number.isInteger(value)) {
    throw new TypeError(`${key} must be a whole number`);
  }
  return value;
}

// Fields shared by every weapon: damage, element, rarity, affixes and optional hooks.
// onHit(ctx) and onFire(ctx) are only set when given. The combat code calls them if present
// and each returns a list of effects (see legendaries.js for the ctx shape).
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
      if (!WEAPON_ELEMENTS.includes(elementalType)) {
        throw new TypeError(`element must be one of ${WEAPON_ELEMENTS.join(", ")} or null`);
      }
    }
    this.damage = damage;
    this.elementalType = elementalType === undefined ? null : elementalType;
    this.element = this.elementalType;
    this.attackType = options.attackType === undefined ? "Weapon" : options.attackType;
    requireNonEmptyString(this.attackType, "attackType");

    const rarity = options.rarity === undefined ? "common" : options.rarity;
    if (!RARITY_IDS.includes(rarity)) {
      throw new TypeError(`rarity must be one of ${RARITY_IDS.join(", ")}`);
    }
    this.rarity = rarity;
    const affixes = options.affixes === undefined ? [] : options.affixes;
    if (!Array.isArray(affixes) || affixes.some((id) => typeof id !== "string")) {
      throw new TypeError("affixes must be a list of affix ids");
    }
    this.affixes = affixes.slice();
    for (const hook of ["onHit", "onFire"]) {
      if (options[hook] !== undefined) {
        if (typeof options[hook] !== "function") {
          throw new TypeError(`${hook} must be a function`);
        }
        this[hook] = options[hook];
      }
    }
    // Which base (Sword, Wand...) and handmade weapon this came from, for the card and art.
    this.baseId = options.baseId === undefined ? null : options.baseId;
    this.uniqueId = options.uniqueId === undefined ? null : options.uniqueId;
  }
}

// Melee stats: reach (px), swingFrames, knockback, arc (degrees).
class MeleeWeapon extends Weapon {
  constructor(options = {}) {
    super({ ...options, attackType: options.attackType || "Melee" });
    this.reach = weaponNumber(options, "reach", 24, 0, 400);
    this.swingFrames = weaponInteger(options, "swingFrames", 14, 1);
    this.knockback = weaponNumber(options, "knockback", 2, 0, 100);
    this.arc = weaponNumber(options, "arc", 90, 1, 360);
  }
}

// Ranged stats: fireRate (frames between shots), shotSpeed (px per frame), range (px),
// projectileCount, spread (degrees across all shots), pierce (extra enemies a shot passes).
class ProjectileWeapon extends Weapon {
  constructor(options = {}) {
    super({ ...options, attackType: options.attackType || "Projectile" });
    this.fireRate = weaponInteger(options, "fireRate", 15, 1);
    this.shotSpeed = weaponNumber(options, "shotSpeed", 5, 0.1, 100);
    this.range = weaponNumber(options, "range", 240, 1, 2000);
    this.projectileCount = weaponInteger(options, "projectileCount", 1, 1);
    this.spread = weaponNumber(options, "spread", 0, 0, 360);
    this.pierce = weaponInteger(options, "pierce", 0, 0);
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
