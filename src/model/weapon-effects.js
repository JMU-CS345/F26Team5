// Connects the weapon hooks (weapon-hooks.js) to combat. Combat builds the ctx a hook reads,
// queues the effects it returns and carries each one out when it is due. No p5 drawing calls.

// A point and health numbers for a hook, taken from an enemy.
function hookTarget(enemy) {
  const center = enemy.getCenter();
  return { x: center.x, y: center.y, health: enemy.health, maxHealth: enemy.maxHealth };
}

// Builds the ctx described in weapon-hooks.js. kind is "hit" or "fire" and keeps its own
// counter per weapon. options: weapon, angle, damage, target (an Enemy or null), enemies.
function makeHookContext(player, kind, options) {
  const weapon = options.weapon || {};
  const center = player.getCenter();
  const enemies = [];
  for (const enemy of options.enemies || []) {
    if (!enemy.isDead() && enemy !== options.target) {
      enemies.push(hookTarget(enemy));
    }
  }
  const target = options.target || null;
  const ctx = {
    weapon: {
      damage: weapon.damage,
      element: weapon.element,
      shotSpeed: weapon.shotSpeed,
      range: weapon.range
    },
    source: { x: center.x, y: center.y },
    angle: options.angle,
    damage: options.damage,
    count: player.countHook(kind, weapon.id),
    target: null,
    enemies: enemies
  };
  if (target !== null) {
    ctx.target = hookTarget(target);
  }
  return ctx;
}

// Runs a weapon's hook (if it has one) and queues the effects on the player.
function runWeaponHook(player, hook, kind, options) {
  if (typeof hook !== "function") {
    return;
  }
  const effects = hook(makeHookContext(player, kind, options));
  if (Array.isArray(effects)) {
    player.queueEffects(effects);
  }
}

function enemiesInRadius(room, x, y, radius) {
  return room.enemies.filter((enemy) => {
    const center = enemy.getCenter();
    return !enemy.isDead() && Math.hypot(center.x - x, center.y - y) <= radius;
  });
}

// Carries out one due effect. A projectile effect returns the new Projectile, the rest
// change the player or the enemies directly and return null.
function applyWeaponEffect(effect, player, room) {
  if (effect.type === "projectile") {
    const dir = p5.Vector.fromAngle(effect.angle);
    const shot = new Projectile(effect.x, effect.y, dir, effect.damage, effect.speed, {
      range: effect.range, pierce: effect.pierce
    });
    shot.element = effect.element; // no owner, so these shots never run hooks again
    return shot;
  }
  if (effect.type === "heal") {
    player.health = Math.min(player.maxHealth, player.health + effect.amount);
  }
  if (effect.type === "area") {
    for (const enemy of enemiesInRadius(room, effect.x, effect.y, effect.radius)) {
      enemy.takeDamage(effect.damage, null);
    }
  }
  if (effect.type === "pull") {
    for (const enemy of enemiesInRadius(room, effect.x, effect.y, effect.radius)) {
      const pull = new p5.Vector(effect.x, effect.y).sub(enemy.getCenter());
      pull.setMag(Math.min(effect.strength, pull.mag()));
      moveWithCollision(enemy, pull.x, pull.y, room);
    }
  }
  return null;
}
