// What each weapon looks like, keyed by a weapon's `art` (see WEAPON_DEFS in model/weapons.js).
// This file draws nothing, so Jasmine can load it. Put the pictures in assets/weapon/.
//
//   icon         the 16x16 picture in the inventory and on the ground
//   projectile   a ranged weapon's shot: a sheet of `frames` pictures side by side, each
//                frameW x frameH, changing every frameTime game frames. It is drawn centered on
//                the shot's hitbox, so it can be bigger than the hitbox. directional: true means
//                the picture faces right and is turned to point the way the shot flies (the
//                fireball). Left out, the picture is drawn the same way up whatever the direction.
//   chargedProjectile  optional: the picture for the shot a full charge makes, in the same format.
//                a shot with one is drawn with it at its own size. Without one, the charged shot
//                uses the projectile picture, drawn as much bigger as the shot is.
const WEAPON_ART = Object.freeze({
  defaultSword: { icon: "assets/weapon/Default Sword.png" },
  fireballer: {
    icon: "assets/weapon/Fireballer.png",
    projectile: { sheet: "assets/weapon/Fireballer Fireball.png", frameW: 16, frameH: 16, frames: 1, frameTime: 1, directional: true },
    chargedProjectile: { sheet: "assets/weapon/Fireballer Big Fireball.png", frameW: 32, frameH: 32, frames: 1, frameTime: 1, directional: true }
  },
  freezer: {
    icon: "assets/weapon/Freezer.png",
    projectile: { sheet: "assets/weapon/Freezer Spark.png", frameW: 16, frameH: 16, frames: 1, frameTime: 1 }
  },
  dreamcatcher: {
    icon: "assets/weapon/Dreamcatcher.png",
    projectile: { sheet: "assets/weapon/Dreamcatcher PSI.png", frameW: 16, frameH: 16, frames: 2, frameTime: 8 }
  }
});

// How a weapon is held while it is used: the weapon's 16x16 picture points up, and it is turned
// around its grip, which is drawn at the player's hand (PLAYER_ART[model].hand), so it points
// straight out in front of the player. The same grip is used for every weapon.
const HELD_WEAPON = Object.freeze({
  grip: Object.freeze({ x: 8, y: 13 })
});

// Angle of "up" for each facing, in degrees clockwise.
const FACING_ANGLE = Object.freeze({ up: 0, right: 90, down: 180, left: 270 });

// The sword's slash effect: one 16x16 arc that bulges toward its top right corner. It is drawn
// in the sword's own frame (turned with the sword) on its right side, next to the blade and not on
// it: its top left is `offset` from the grip. The arc starts just above the blade tip and curves
// down the blade's side, so the effect lands on a different diagonal for each facing.
const SLASH_EFFECT = Object.freeze({
  sheet: "assets/weapon/Default Sword Slash Effect.png",
  size: 16,
  offset: Object.freeze({ x: 3, y: -16 })
});

// On the turning frame the sword is not out in front yet: it starts where it would be if the
// player faced another way, then the swing brings it to the facing. Slashing left starts it
// behind the player (as if facing up), forwards starts it on the left, right starts it in front
// (as if facing down) and backwards starts it on the right.
const WINDUP_FACING = Object.freeze({ left: "up", down: "left", right: "down", up: "right" });

// The facing the held weapon is drawn for: a different one on the turning frame, the player's own
// from then on.
function getHeldWeaponFacing(player) {
  return player.getSlashPhase() === "windup" ? WINDUP_FACING[player.facing] : player.facing;
}

// Degrees clockwise the held weapon is turned: straight out from the hand, for its facing.
function getHeldWeaponAngle(player) {
  return FACING_ANGLE[getHeldWeaponFacing(player)];
}

// How far through its showing the slash effect is, from 0 to just under 1, or null when it is not
// showing: during the active part of a swing, and during every quarter turn of a spin (where it
// starts over for each direction).
function getSlashEffectProgress(player) {
  const phase = player.getSlashPhase();
  const sword = player.getMeleeWeapon();
  if (phase === "active") {
    return (player.slashFrames - sword.swing.windup - 1) / sword.swing.reaches.length;
  }
  if (phase === "spin") {
    const per = sword.spin.framesPerDirection;
    return ((player.slashFrames - 1) % per) / per;
  }
  return null;
}

// Where the hand is, in the world.
function getHandPosition(player) {
  const hand = PLAYER_ART[player.modelName].hand[getHeldWeaponFacing(player)];
  const c = player.getCenter();
  return { x: c.x + hand.x, y: c.y + hand.y };
}

// The picture description for a shot: the charged picture for a charged shot of a weapon that has
// one, else the normal one.
function getShotArt(weaponArt, shot) {
  return shot.charged && weaponArt.chargedProjectile ? weaponArt.chargedProjectile : weaponArt.projectile;
}

// How much bigger than its sheet's pictures a shot is drawn. A shot with a charged picture is
// drawn at that picture's own size. Otherwise it follows the shot's scale (a bigger charged shot).
function getShotDrawScale(weaponArt, shot) {
  return getShotArt(weaponArt, shot) === weaponArt.chargedProjectile ? 1 : shot.scale;
}

// Radians clockwise the shot's picture is turned: 0 for a picture that is not directional, else the
// angle of the way the shot flies (a picture facing right is 0, down is a quarter turn).
function getShotAngle(shotArt, vel) {
  return shotArt.directional ? Math.atan2(vel.y, vel.x) : 0;
}

// Which picture of an animated shot to show at a given age (frames flown).
function getShotFrame(shotArt, age) {
  return Math.floor(age / shotArt.frameTime) % shotArt.frames;
}

// The colour (red, green, blue) of each element, used for the charge bar.
const SWORD_CHARGE_COLOR = Object.freeze([150, 190, 255]); // the bar while the sword charges a spin
const ELEMENT_COLORS = Object.freeze({
  Fire: Object.freeze([255, 140, 40]),
  Ice: Object.freeze([120, 210, 255]),
  Mind: Object.freeze([230, 110, 230])
});

// The charge bar under the player: how wide it is and how far below the hitbox it sits.
const CHARGE_BAR = Object.freeze({ width: 24, height: 4, gap: 3 });
