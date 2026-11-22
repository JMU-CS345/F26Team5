// Turns items into plain JSON and back. Model code: no p5 drawing calls.
// Load after items.js, weapon-hooks.js, affixes.js and legendaries.js.
//
// Functions are never stored. A weapon keeps its affix ids and unique id, and the hooks are
// attached again from the affix and legendary tables when it is loaded. Anything that cannot
// be rebuilt (a newer version, a missing id, bad numbers) comes back as null.

const ITEM_SAVE_VERSION = 1;

const MELEE_SAVE_STATS = ["damage", "reach", "swingFrames", "knockback", "arc"];
const RANGED_SAVE_STATS = [
  "damage", "fireRate", "shotSpeed", "range", "projectileCount", "spread", "pierce"
];

// The save type name, the class that is built, and the stats kept, for each item kind.
// Order matters: subclasses come before the class they extend.
const ITEM_SAVE_KINDS = [
  { type: "melee", make: MeleeWeapon, stats: MELEE_SAVE_STATS },
  { type: "ranged", make: ProjectileWeapon, stats: RANGED_SAVE_STATS },
  { type: "helmet", make: Helmet, stats: ["block"] },
  { type: "chest", make: ChestArmor, stats: ["hearts"] },
  { type: "legs", make: LegArmor, stats: ["block"] },
  { type: "consumable", make: Consumable, stats: ["healthRestore"] },
  { type: "gold", make: Gold, stats: [] }
];

function saveKindOf(item) {
  return ITEM_SAVE_KINDS.find((kind) => item.constructor === kind.make) || null;
}

// The onHit and onFire hooks a weapon gets from its legendary and affixes, as the generator
// builds them. Returns null when an id is unknown.
function hooksFromIds(weaponKind, affixIds, uniqueId) {
  const onHit = [];
  const onFire = [];
  if (uniqueId !== null) {
    const legendary = getLegendary(uniqueId);
    if (legendary === null) {
      return null;
    }
    if (legendary.onHit) {
      onHit.push(legendary.onHit);
    }
    if (legendary.onFire) {
      onFire.push(legendary.onFire);
    }
  }
  for (const id of affixIds) {
    const affix = getAffix(id);
    if (affix === null || affix[weaponKind] === undefined) {
      return null;
    }
    if (affix[weaponKind].onHit) {
      onHit.push(affix[weaponKind].onHit);
    }
    if (affix[weaponKind].onFire) {
      onFire.push(affix[weaponKind].onFire);
    }
  }
  return { onHit: composeHooks(onHit), onFire: composeHooks(onFire) };
}

// A plain object for one item, or null for a kind that cannot be saved.
function serializeItem(item) {
  if (!(item instanceof Item)) {
    return null;
  }
  const kind = saveKindOf(item);
  if (kind === null) {
    return null;
  }
  const data = {
    v: ITEM_SAVE_VERSION,
    type: kind.type,
    id: item.id,
    name: item.name,
    description: item.description,
    value: item.value,
    locked: item.locked === true,
    stats: {}
  };
  for (const name of kind.stats) {
    data.stats[name] = item[name];
  }
  if (item instanceof Armor) {
    data.rarity = item.rarity;
  }
  if (item instanceof Weapon) {
    data.rarity = item.rarity;
    data.element = item.element;
    data.baseId = item.baseId;
    data.uniqueId = item.uniqueId;
    data.affixes = item.affixes.slice();
  }
  if (item.stackable) {
    data.maxStackSize = item.maxStackSize;
  }
  return data;
}

function buildSavedItem(data) {
  const kind = ITEM_SAVE_KINDS.find((k) => k.type === data.type);
  if (kind === undefined) {
    return null;
  }
  const options = {
    id: data.id,
    name: data.name,
    description: data.description,
    value: data.value,
    ...data.stats
  };
  if (data.maxStackSize !== undefined && data.maxStackSize !== null) {
    options.maxStackSize = data.maxStackSize;
  }
  if (data.type === "helmet" || data.type === "chest" || data.type === "legs") {
    options.rarity = data.rarity; // an older save has none, so armor falls back to common
  }
  if (data.type === "melee" || data.type === "ranged") {
    options.rarity = data.rarity;
    options.element = data.element;
    options.baseId = data.baseId;
    options.uniqueId = data.uniqueId;
    options.affixes = data.affixes;
    const weaponKind = data.type;
    const hooks = hooksFromIds(weaponKind, data.affixes, data.uniqueId);
    if (hooks === null) {
      return null;
    }
    if (hooks.onHit) {
      options.onHit = hooks.onHit;
    }
    if (hooks.onFire) {
      options.onFire = hooks.onFire;
    }
  }
  const item = new kind.make(options);
  item.locked = data.locked === true;
  return item;
}

// The item for a saved object, or null when it is unknown, from another version, or broken.
function deserializeItem(data) {
  try {
    if (data === null || typeof data !== "object" || data.v !== ITEM_SAVE_VERSION) {
      return null;
    }
    return buildSavedItem(data);
  } catch (error) {
    return null;
  }
}

// A list of saved objects as items. Entries that cannot be loaded are left out.
function deserializeItems(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map(deserializeItem).filter((item) => item !== null);
}

// The bag as a list of saved items, each with its column, row and stack size.
function serializeBag(inventory) {
  const saved = [];
  for (const entry of inventory.grid.entries()) {
    const data = serializeItem(entry.item);
    if (data !== null) {
      saved.push({ ...data, col: entry.col, row: entry.row, quantity: entry.quantity });
    }
  }
  return saved;
}

// Puts saved items back in the bag. An item goes where it was saved. One with no position (an
// old save), or a spot that is taken or out of range, is autoplaced. Returns how many items
// were left out because the bag had no room.
function loadBag(inventory, list) {
  let lost = 0;
  if (!Array.isArray(list)) {
    return lost;
  }
  for (const data of list) {
    const item = deserializeItem(data);
    if (item === null) {
      continue;
    }
    let quantity = 1;
    if (Number.isInteger(data.quantity) && data.quantity > 0) {
      quantity = Math.min(data.quantity, item.maxStackSize);
    }
    if (!inventory.grid.place(item, data.col, data.row, quantity)
        && inventory.grid.autoPlace(item, quantity) === null) {
      lost++;
    }
  }
  return lost;
}
