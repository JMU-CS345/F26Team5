// Weapon hooks: plain functions that turn "something happened" into a list of effects.
// Model code: no p5 calls and no changes to game state, so Jasmine can test them directly.
// Load before affixes.js and legendaries.js.
//
// A hook receives one plain ctx object and returns a list of effects (an empty list for
// "nothing happens"). The same ctx always gives the same list. The combat code builds the
// ctx, calls weapon.onHit(ctx) after a hit and weapon.onFire(ctx) after a shot, and then
// carries the effects out. It only calls a hook if the weapon has one.
//
// ctx = {
//   weapon: { damage, element, shotSpeed, range },  // numbers from the weapon (all optional)
//   source: { x, y },       // the attacker's center, in pixels
//   angle: radians,         // the direction of the attack
//   damage: number,         // damage this hit or shot deals
//   count: number,          // hits (onHit) or shots (onFire) made with this weapon so far,
//                           // counting this one. The caller keeps this counter.
//   target: { x, y, health, maxHealth } or null,  // onHit only: the enemy hit, with its
//                           // health after the hit (health <= 0 means the hit killed it)
//   enemies: [{ x, y }]     // other living enemies near the target (optional)
// }
//
// Effects (every position is in pixels, delayFrames is optional and defaults to 0):
//   { type: "projectile", x, y, angle, damage, speed, range, pierce, element, delayFrames }
//   { type: "heal", amount }
//   { type: "area", x, y, radius, damage, element, delayFrames }
//   { type: "pull", x, y, radius, strength }   pulls enemies toward x, y

const DEFAULT_HOOK_SHOT_SPEED = 5;
const DEFAULT_HOOK_RANGE = 120;

function projectileEffect(x, y, angle, damage, options = {}) {
  return {
    type: "projectile",
    x: x,
    y: y,
    angle: angle,
    damage: damage,
    speed: options.speed === undefined ? DEFAULT_HOOK_SHOT_SPEED : options.speed,
    range: options.range === undefined ? DEFAULT_HOOK_RANGE : options.range,
    pierce: options.pierce === undefined ? 0 : options.pierce,
    element: options.element === undefined ? null : options.element,
    delayFrames: options.delayFrames === undefined ? 0 : options.delayFrames
  };
}

function healEffect(amount) {
  return { type: "heal", amount: amount };
}

function areaEffect(x, y, radius, damage, options = {}) {
  return {
    type: "area",
    x: x,
    y: y,
    radius: radius,
    damage: damage,
    element: options.element === undefined ? null : options.element,
    delayFrames: options.delayFrames === undefined ? 0 : options.delayFrames
  };
}

function pullEffect(x, y, radius, strength) {
  return { type: "pull", x: x, y: y, radius: radius, strength: strength };
}

// The weapon numbers a hook may read, with defaults for a missing weapon.
function hookWeapon(ctx) {
  const weapon = ctx.weapon || {};
  return {
    element: weapon.element === undefined ? null : weapon.element,
    shotSpeed: weapon.shotSpeed === undefined ? DEFAULT_HOOK_SHOT_SPEED : weapon.shotSpeed,
    range: weapon.range === undefined ? DEFAULT_HOOK_RANGE : weapon.range
  };
}

// The enemy in ctx.enemies nearest to a point, within maxDistance, or null.
function nearestEnemy(ctx, x, y, maxDistance) {
  let best = null;
  let bestDistance = maxDistance;
  for (const enemy of ctx.enemies || []) {
    const distance = Math.hypot(enemy.x - x, enemy.y - y);
    if (distance <= bestDistance) {
      best = enemy;
      bestDistance = distance;
    }
  }
  return best;
}

// The angle from one point to another, in radians.
function angleBetween(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

// One hook that runs several hooks and joins their effects.
function composeHooks(hooks) {
  if (hooks.length === 0) {
    return undefined;
  }
  if (hooks.length === 1) {
    return hooks[0];
  }
  return function (ctx) {
    const effects = [];
    for (const hook of hooks) {
      effects.push(...hook(ctx));
    }
    return effects;
  };
}

// True on every nth count (n, 2n, 3n...).
function everyNth(count, n) {
  return count > 0 && count % n === 0;
}
