// Which icon cell to draw for an item. Model code: no p5 drawing calls.
// Load this after items.js. Every icon is a 16x16 cell in one of three sheets.

const ICON_SIZE = 16;
const WEAPON_ICON_SHEET = "assets/item/weapon-icons.png";
const ITEM_ICON_SHEET = "assets/item/item-icons.png";
const RARITY_FRAME_SHEET = "assets/item/rarity-frames.png";

// Weapon base ids in sheet order, one icon each.
const MELEE_BASES = Object.freeze(["dagger", "sword", "spear", "axe", "hammer"]);
const RANGED_BASES = Object.freeze(["wand", "staff", "tome", "orb", "scepter"]);
const WEAPON_BASES = Object.freeze(MELEE_BASES.concat(RANGED_BASES));

// Non-weapon kinds in sheet order.
const ITEM_KINDS = Object.freeze(["potion", "coin", "armor"]);

// Rarities from lowest to highest, in frame sheet order.
const ITEM_RARITIES = Object.freeze(["common", "uncommon", "rare", "epic", "legendary"]);

function iconCell(sheet, index) {
  return { sheet: sheet, x: index * ICON_SIZE, y: 0, w: ICON_SIZE, h: ICON_SIZE };
}

// Icon cell for a weapon base id such as "dagger", or null for an unknown id.
function weaponIconCell(baseId) {
  const index = WEAPON_BASES.indexOf(baseId);
  if (index < 0) {
    return null;
  }
  return iconCell(WEAPON_ICON_SHEET, index);
}

// Icon cell for "potion", "coin" or "armor", or null for an unknown kind.
function itemKindIconCell(kind) {
  const index = ITEM_KINDS.indexOf(kind);
  if (index < 0) {
    return null;
  }
  return iconCell(ITEM_ICON_SHEET, index);
}

// Frame cell for a rarity, or null when the rarity is missing or unknown.
function rarityFrameCell(rarity) {
  const index = ITEM_RARITIES.indexOf(rarity);
  if (index < 0) {
    return null;
  }
  return iconCell(RARITY_FRAME_SHEET, index);
}

// The base id of a weapon: its baseId, else a base name found in its id, else a default
// by attack type.
function weaponBaseId(weapon) {
  if (WEAPON_BASES.includes(weapon.baseId)) {
    return weapon.baseId;
  }
  for (const base of WEAPON_BASES) {
    if (weapon.id.includes(base)) {
      return base;
    }
  }
  if (weapon instanceof ProjectileWeapon) {
    return "wand";
  }
  return "sword";
}

// The icon cell for any item, or null when it has none.
function itemIconCell(item) {
  if (item instanceof Weapon) {
    return weaponIconCell(weaponBaseId(item));
  }
  if (item instanceof Armor) {
    return itemKindIconCell("armor");
  }
  if (item instanceof Gold) {
    return itemKindIconCell("coin");
  }
  if (item instanceof Consumable) {
    return itemKindIconCell("potion");
  }
  return null;
}
