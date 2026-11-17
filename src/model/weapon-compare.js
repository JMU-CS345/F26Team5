// Stat differences between a weapon on the floor and the one equipped. Model code: no p5 calls.
// Load after items.js and affixes.js.

// Which stats to show, in order. higher: true if a bigger number is better.
const COMPARE_STATS = Object.freeze({
  melee: [
    { key: "damage", label: "Damage", higher: true },
    { key: "reach", label: "Reach", higher: true },
    { key: "swingFrames", label: "Swing time", higher: false },
    { key: "knockback", label: "Knockback", higher: true },
    { key: "arc", label: "Arc", higher: true }
  ],
  ranged: [
    { key: "damage", label: "Damage", higher: true },
    { key: "fireRate", label: "Shot delay", higher: false },
    { key: "shotSpeed", label: "Shot speed", higher: true },
    { key: "range", label: "Range", higher: true },
    { key: "projectileCount", label: "Projectiles", higher: true },
    { key: "pierce", label: "Pierce", higher: true }
  ]
});

// True for weapons the player can equip. These wait on the floor for E instead of being
// picked up by walking over them.
function isEquippableWeapon(item) {
  return item instanceof MeleeWeapon || item instanceof ProjectileWeapon;
}

// "melee" or "ranged", the equipment slot kind a weapon belongs to.
function weaponKind(weapon) {
  if (weapon instanceof ProjectileWeapon) {
    return "ranged";
  }
  return "melee";
}

// The equipment slot name (see PLAYER_EQUIPMENT_TYPES) for a weapon.
function weaponSlotName(weapon) {
  if (weapon instanceof ProjectileWeapon) {
    return "projectile";
  }
  return "melee";
}

// Compares a weapon with the equipped one of the same kind (or null for an empty slot).
// Returns a list of rows:
//   { label, value, equippedValue, diff, verdict }
// verdict is "up" (better), "down" (worse), "same", or "none" when nothing is equipped.
function compareWeapons(candidate, equipped) {
  const stats = COMPARE_STATS[weaponKind(candidate)];
  const comparable = equipped !== null && weaponKind(equipped) === weaponKind(candidate);
  return stats.map((stat) => {
    const value = candidate[stat.key];
    if (!comparable) {
      return { label: stat.label, value: value, equippedValue: null, diff: 0, verdict: "none" };
    }
    const equippedValue = equipped[stat.key];
    const diff = Math.round((value - equippedValue) * 100) / 100;
    let verdict = "same";
    if (diff !== 0) {
      const better = stat.higher ? diff > 0 : diff < 0;
      verdict = better ? "up" : "down";
    }
    return { label: stat.label, value: value, equippedValue: equippedValue, diff: diff,
      verdict: verdict };
  });
}

// The card lines for a weapon's modifiers: its affix texts and a legendary's unique power.
function weaponEffectLines(weapon) {
  const lines = [];
  const kind = weaponKind(weapon);
  for (const id of weapon.affixes) {
    const affix = getAffix(id);
    if (affix !== null && affix[kind] !== undefined) {
      lines.push(affix[kind].text);
    }
  }
  const unique = weapon.uniqueId === null ? null : getLegendary(weapon.uniqueId);
  if (unique !== null) {
    lines.unshift(unique.power);
  }
  return lines;
}
