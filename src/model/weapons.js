// The weapons the game ships with, and which ones each class starts with. Model code: no p5
// drawing calls. The pictures are in src/view/weapon-art.js, looked up by each weapon's `art`.
// Load this after items.js and player-inventory.js, before player.js.

// How the sword swings. A swing has three parts, counted in frames, matching the player sheet:
//   windup   the "turning before attack" frame for the way the player faces, sword already out.
//   active   the first "holding a weapon" frame. The sword is out in front, the slash effect shows
//            beside it and the sword can hurt: one entry of `reaches` per frame, in pixels out from
//            the player's hitbox, so the hitbox grows and shrinks.
//   recover  the same holding frame, the sword still held straight out, with no effect and no hit.
// thickness is how wide the hitbox is across the swing.
const SWORD_SWING = Object.freeze({
  windup: 7,
  reaches: Object.freeze([14, 20, 24, 24, 20, 16]),
  recover: 16,
  thickness: 28
});

// The sword's spin attack, like Link's Awakening. After a swing, keep holding the attack key to
// charge (the sword stays out in front). Let go with a full charge and the player turns all the way
// round, one quarter turn at a time, hitting everything around.
//   chargeFrames        frames to hold for a full charge
//   framesPerDirection  frames spent facing each of the four ways: the turning frame for it, the
//                       sword out that way and the slash effect beside it
//   reaches             pixels the hitbox reaches out in each of those frames (one entry per frame)
//   thickness           how wide the hitbox is across
//   recover             frames the sword is held out at the end, back where the spin started
//   damageMultiplier    spin hits hurt this much more than a normal swing
const SWORD_SPIN = Object.freeze({
  chargeFrames: 40,
  framesPerDirection: 5,
  reaches: Object.freeze([16, 24, 24, 20, 16]),
  thickness: 28,
  recover: 10,
  damageMultiplier: 1.5
});

// Running into an enemy with the sword held out in front (see Player.isSwordOutstretched).
//   reach, thickness   how far out from the player and how wide the area that rams is
//   damageMultiplier   a ram hurts this fraction of a normal swing's damage
//   cooldown           frames before the same enemy can be rammed again
const SWORD_RAM = Object.freeze({
  reach: 14,
  thickness: 14,
  damageMultiplier: 0.5,
  cooldown: 24
});

// The order a spin turns through, counterclockwise on screen, starting from whichever way it began.
const SPIN_ORDER = Object.freeze(["down", "right", "up", "left"]);

// What a full charge does to a shot, by a weapon's charge.effect. Each is given the shot. A charge
// that is not full gives no effect. To add an effect, add a row.
const CHARGE_MAX_HOMING = 0.08; // radians per frame a seeking shot can turn
const CHARGE_EFFECTS = Object.freeze({
  // Bigger and much harder hitting: three times the damage and twice the size.
  power: (shot) => {
    shot.damage *= 3;
    shot.resize(2);
  },
  // Faster, a bit stronger, and passes through up to three enemies.
  pierce: (shot) => {
    shot.damage *= 1.5;
    shot.vel.mult(1.5);
    shot.pierce = 3;
  },
  // Curves toward the nearest enemy.
  seek: (shot) => {
    shot.homing = CHARGE_MAX_HOMING;
  }
});

function applyChargeEffect(shot, effect) {
  const apply = CHARGE_EFFECTS[effect];
  if (apply === undefined) {
    throw new RangeError("unknown charge effect: " + effect);
  }
  apply(shot);
  shot.charged = true;
}

// Every weapon: `type` is the item class and `options` its settings. To add a weapon, add a row
// here and an entry with the same `art` key in WEAPON_ART.
const WEAPON_DEFS = Object.freeze({
  DefaultSword: {
    type: MeleeWeapon,
    options: {
      id: "default-sword",
      name: "Default Sword",
      damage: 2,
      element: null, // a sword is not elemental, so nothing is weak to it or strong against it
      art: "defaultSword",
      swing: SWORD_SWING,
      spin: SWORD_SPIN,
      ram: SWORD_RAM,
      description: "A plain sword. Every mage starts with one."
    }
  },
  Fireballer: {
    type: ProjectileWeapon,
    options: {
      id: "fireballer",
      name: "Fireballer",
      damage: 1,
      element: "Fire",
      art: "fireballer",
      projectileSpeed: 5,
      cooldown: 40,
      charge: { frames: 50, delay: 15, effect: "power" },
      description: "Throws fireballs. Hold on after shooting to charge a bigger, harder hitting one. The Fire mage's starting weapon."
    }
  },
  Freezer: {
    type: ProjectileWeapon,
    options: {
      id: "freezer",
      name: "Freezer",
      damage: 1,
      element: "Ice",
      art: "freezer",
      projectileSpeed: 5,
      cooldown: 40,
      charge: { frames: 50, delay: 15, effect: "pierce" },
      description: "Shoots icy sparks. Hold on after shooting to charge a faster spark that pierces enemies. The Ice mage's starting weapon."
    }
  },
  Dreamcatcher: {
    type: ProjectileWeapon,
    options: {
      id: "dreamcatcher",
      name: "Dreamcatcher",
      damage: 1,
      element: "Mind",
      art: "dreamcatcher",
      projectileSpeed: 5,
      cooldown: 40,
      charge: { frames: 50, delay: 15, effect: "seek" },
      description: "Sends out pulsing psychic rings. Hold on after shooting to charge rings that seek out enemies. The Mind mage's starting weapon."
    }
  }
});

// Every class starts with the default sword plus this ranged weapon.
const STARTING_RANGED_WEAPON = Object.freeze({
  Fire: "Fireballer",
  Ice: "Freezer",
  Mind: "Dreamcatcher"
});
const STARTING_MELEE_WEAPON = "DefaultSword";

// Makes a new copy of a weapon from WEAPON_DEFS.
function createWeapon(name) {
  const def = WEAPON_DEFS[name];
  if (def === undefined) {
    throw new RangeError("unknown weapon: " + name);
  }
  return new def.type({ ...def.options });
}

// Puts a class's starting weapons in the bag and equips them. A player with no class (or an
// unknown one) gets nothing.
function giveStartingWeapons(inventory, mageClass) {
  const ranged = STARTING_RANGED_WEAPON[mageClass];
  if (ranged === undefined) {
    return;
  }
  for (const name of [STARTING_MELEE_WEAPON, ranged]) {
    const weapon = createWeapon(name);
    inventory.add(weapon);
    inventory.equip(weapon);
  }
}

// What the weapon HUD shows: the melee slot then the projectile slot, each with its weapon (or
// null when empty) and whether it is the one out. Model code, so Jasmine can check it.
function getWeaponHudSlots(player) {
  return [
    { slot: "melee", item: player.getMeleeWeapon(), active: player.isMeleeActive() },
    { slot: "projectile", item: player.getRangedWeapon(), active: !player.isMeleeActive() }
  ];
}

// The weapon to draw in the player's hand right now, or null. The sword is in hand for the whole
// swing or spin, and while it charges a spin. A projectile weapon is in hand while the arm is up (a
// fire key held, and the cooldown after a shot). Nothing is held when the player is dead or falling.
function getHeldWeapon(player) {
  if (player.isDead() || player.isFalling()) {
    return null;
  }
  if (player.isSlashing()) {
    return player.getMeleeWeapon();
  }
  return player.isArmUp() ? player.getActiveWeapon() : null;
}
