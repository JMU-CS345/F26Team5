// Soul Knight style auto-aim. Pure model code, no p5 drawing calls.

const AIM_RANGE = 240; // pixels from the player to an enemy the aim can lock on
const SHOT_TURN_DEG = 4; // most a homing shot turns per frame
const MELEE_SNAP_PAD = 24; // a swing snaps to a target this far past its reach

// The nearest living, visible enemy in range, or null.
function findAimTarget(player, enemies, room, range = AIM_RANGE) {
  const from = player.getCenter();
  let best = null;
  let bestDist = Infinity;
  for (const enemy of enemies) {
    if (enemy.isDead() || enemy.isSpawning()) {
      continue;
    }
    const to = enemy.getCenter();
    const dist = from.dist(to);
    if (dist > range || dist >= bestDist) {
      continue;
    }
    if (room.hasLineOfSight(from.x, from.y, to.x, to.y)) {
      best = enemy;
      bestDist = dist;
    }
  }
  return best;
}

// Once per frame: stores the target, and points a held fire key at it.
function applyAutoAim(player, input, room) {
  input.aimTarget = findAimTarget(player, room.enemies, room);
  player.aimTarget = input.aimTarget;
  if (input.aimTarget !== null && input.fireDir.magSq() > 0) {
    input.fireDir = input.aimTarget.getCenter().sub(player.getCenter()).normalize();
  }
}

// The swing direction: toward the target when it is within reach + MELEE_SNAP_PAD,
// else the normal aim.
function meleeSwingDir(player, reach) {
  const target = player.aimTarget;
  if (target === null || target.isDead()) {
    return player.aim;
  }
  const toTarget = target.getCenter().sub(player.getCenter());
  if (toTarget.mag() > reach + MELEE_SNAP_PAD || toTarget.magSq() === 0) {
    return player.aim;
  }
  return toTarget.normalize();
}

// Turns a shot toward its living target, at most SHOT_TURN_DEG per frame.
function steerShot(shot) {
  if (shot.target === null || shot.target.isDead()) {
    return;
  }
  const bounds = shot.getBounds();
  const toTarget = shot.target.getCenter().sub(
    new p5.Vector(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2)
  );
  if (toTarget.magSq() === 0) {
    return;
  }
  const limit = (SHOT_TURN_DEG * Math.PI) / 180;
  const turn = p5.Vector.angleBetween(shot.vel, toTarget);
  shot.vel.rotate(constrainNumber(turn, -limit, limit));
}

// A swing's active frames destroy enemy shots inside the arc.
function slashEnemyShots(player, shots) {
  const attack = player.attack;
  if (attack === null || attack.phase() !== "active" || attack.hitbox === null) {
    return;
  }
  for (const shot of shots) {
    if (shot.alive && attack.hitbox.overlaps(shot)) {
      shot.alive = false;
    }
  }
}
