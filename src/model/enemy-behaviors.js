// Movement and attack behaviors, looked up by name from enemy-types.js.
// Model code: no p5 drawing calls. To add a behavior, add one function here and name it
// in a type's row. A behavior uses only the enemy, player and room it is given.

// Moves that go straight at the player and ignore walls: the enemy hops at the player whenever
// it is in detection range, and a wall just stops the hop. Add a hopping move's name here.
// Every other move walks whole tiles around walls. Walkers notice the player anywhere in
// detection range, but shooting and sight speed need a clear line of sight.
const ENEMY_DIRECT_MOVES = Object.freeze(["hop", "hopSwing", "bounce"]);

// A move runs once per frame while the enemy is alive and not frozen by a hit.
const ENEMY_MOVES = Object.freeze({
  // Stands still, for turrets.
  none: function (enemy, player, room) {},

  // Follows the tiles to the player in straight lines, around walls, once the player is in range.
  chase: function (enemy, player, room) {
    enemy.moveAlongTiles(player, room);
  },

  // Ambles along a straight line in a random direction until the player is noticed, then follows
  // the tiles to them. It speeds up to type.sightSpeed while the player is in its line of sight.
  // With type.vision "line" it only notices the player along the row or column it faces, runs to
  // the spot where it saw them even if they step away, then goes back to ambling.
  wanderChase: function (enemy, player, room) {
    if (enemy.getTarget(player, room)) {
      enemy.moveAlongTiles(player, room, enemy.canSee(player, room) ? enemy.getSightSpeed() : undefined);
      return;
    }
    enemy.wanderTimer--;
    if (enemy.wanderTimer <= 0 || !enemy.wanderDir) {
      const roll = Math.floor(enemy.rng() * 4); // right, down, left or up
      enemy.wanderDir = p5.Vector.fromAngle((roll * Math.PI) / 2);
      enemy.wanderDir.set(Math.round(enemy.wanderDir.x), Math.round(enemy.wanderDir.y));
      enemy.wanderTimer = ENEMY_WANDER_FRAMES;
    }
    enemy.faceDirection(enemy.wanderDir.x, enemy.wanderDir.y); // look where it is stumbling
    const before = enemy.pos.copy();
    const dx = enemy.wanderDir.x * enemy.type.wanderSpeed;
    const dy = enemy.wanderDir.y * enemy.type.wanderSpeed;
    moveWithCollision(enemy, dx, dy, room);
    // A wall clips one axis even when it only slides along it, so check both axes.
    const clippedX = Math.abs(enemy.pos.x - before.x - dx) > 0.000001;
    const clippedY = Math.abs(enemy.pos.y - before.y - dy) > 0.000001;
    if (clippedX || clippedY) {
      enemy.wanderTimer = 0; // hit a wall, pick a new direction next frame
    }
  },

  // Follows the tiles toward the player until keepRange away and backs off along a straight line
  // when closer. For shooters. (Standing still for a shot is handled by Enemy.update.)
  keepDistance: function (enemy, player, room) {
    const target = enemy.getTarget(player, room);
    if (!target) {
      return;
    }
    const distance = target.dist(enemy.getCenter());
    const keepRange = enemy.type.keepRange;
    const inSight = enemy.canSee(player, room);
    if (distance > keepRange + ENEMY_KEEP_SLACK || (!inSight && distance >= 2)) {
      enemy.walkTileRoute(target, room); // out of sight, close in on the last known spot
    } else if (inSight && distance < keepRange - ENEMY_KEEP_SLACK) {
      backAway(enemy, target, room);
    }
  },

  // Zigzags toward the player. enemy.age counts frames, so the wobble is repeatable.
  erratic: function (enemy, player, room) {
    const target = enemy.getTarget(player, room);
    if (!target) {
      return;
    }
    const step = target.sub(enemy.getCenter()).setMag(enemy.getSpeed());
    step.rotate(Math.sin(enemy.age / ENEMY_WOBBLE_TIME) * ENEMY_WOBBLE_ANGLE);
    moveWithCollision(enemy, step.x, step.y, room);
  },

  // Rests, then dashes in a straight line toward where the player was when the dash began.
  hop: function (enemy, player, room) {
    hopStep(enemy, player, room, "hop");
  },

  // Bounces after the player the whole time, in the four cardinal directions only, and swings
  // the moment the player is in front of it (inside the swing box, attack.reach from its
  // center). It never rests, and like the hoppers it ignores walls and sight.
  bounce: function (enemy, player, room) {
    const attack = enemy.getAttack();
    if (enemy.state === "windup" && enemy.stateTimer === 0) {
      enemy.setState("attack", ENEMY_SWING_FRAMES); // meleeHit can hurt during this state
      enemy.swingHit = false;
    } else if (enemy.state === "attack" && enemy.stateTimer === 0) {
      enemy.setState("recover", attack.recover);
    } else if (enemy.state === "recover" && enemy.stateTimer === 0) {
      enemy.setState("idle", 0);
    }
    if (enemy.state === "windup" || enemy.state === "attack" || enemy.state === "recover") {
      return; // it stands still for the swing
    }
    if (enemy.attackTimer === 0 && rectsOverlap(enemy.getSwingBox(attack.reach), player.getBounds())) {
      enemy.setState("windup", attack.windup);
      enemy.attackTimer = attack.cooldown;
      return;
    }
    bounceStep(enemy, player, room);
  },

  // Hops like hop, but swings when the player is within attack.reach at the end of a rest.
  // attack.cooldown is the least time between the starts of two swings.
  hopSwing: function (enemy, player, room) {
    const attack = enemy.getAttack();
    if (enemy.state === "windup" && enemy.stateTimer === 0) {
      enemy.setState("attack", ENEMY_SWING_FRAMES); // meleeHit can hurt during this state
      enemy.swingHit = false;
    } else if (enemy.state === "attack" && enemy.stateTimer === 0) {
      enemy.setState("recover", attack.recover);
    } else if (enemy.state === "recover" && enemy.stateTimer === 0) {
      enemy.setState("idle", enemy.type.hopRest);
    } else if (enemy.state === "idle" && enemy.stateTimer === 0) {
      const inSight = enemy.canSee(player, room);
      const distance = player.getCenter().sub(enemy.getCenter()).mag();
      if (inSight && distance <= attack.reach) {
        if (enemy.attackTimer === 0) {
          enemy.setState("windup", attack.windup);
          enemy.attackTimer = attack.cooldown;
        } // else the swing is still cooling down, so stand ready
      } else {
        hopStep(enemy, player, room, "hop");
      }
    } else if (enemy.state === "hop") {
      hopStep(enemy, player, room, "hop");
    }
  }
});

const ENEMY_BOUNCE_SLACK = 12; // pixels the other axis must be ahead before a bouncer switches to it
const ENEMY_SIDESTEP_FRAMES = 40; // how long a bouncer keeps edging around something that blocked it

// Moves a bouncer one step along (stepX, stepY) and makes it face that way. False if it is blocked.
function bounceMove(enemy, stepX, stepY, room) {
  const x = enemy.pos.x;
  const y = enemy.pos.y;
  const speed = enemy.getSpeed();
  moveWithCollision(enemy, stepX * speed, stepY * speed, room);
  if (enemy.pos.x === x && enemy.pos.y === y) {
    return false;
  }
  enemy.faceDirection(stepX, stepY); // look where it is bouncing
  return true;
}

// One step of a bouncer toward its target: along one axis, switching axis only when the other
// is clearly further, so it does not zigzag. When something blocks the way it edges around it
// (toward the player's side, or a remembered side if they are straight behind it) for a while.
function bounceStep(enemy, player, room) {
  const target = enemy.getTarget(player, room);
  if (!target) {
    enemy.setState("idle", 0);
    enemy.bounceAxis = null;
    return;
  }
  enemy.setState("bounce", 0); // the sprite bounces while it is in this state
  const center = enemy.getCenter();
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const speed = enemy.getSpeed();
  if (Math.abs(dx) < speed && Math.abs(dy) < speed) {
    return; // on top of the target
  }
  if (enemy.sidestepFrames > 0) {
    enemy.sidestepFrames--;
    if (bounceMove(enemy, enemy.sidestepX, enemy.sidestepY, room)) {
      return;
    }
    enemy.sidestepFrames = 0;
    enemy.sidestepSide = -enemy.sidestepSide; // blocked that way too, so try the other way next
  }
  let horizontal = enemy.bounceAxis === "x";
  if (
    enemy.bounceAxis === null ||
    (horizontal && Math.abs(dy) > Math.abs(dx) + ENEMY_BOUNCE_SLACK) ||
    (!horizontal && Math.abs(dx) > Math.abs(dy) + ENEMY_BOUNCE_SLACK)
  ) {
    horizontal = Math.abs(dx) >= Math.abs(dy);
  }
  if (horizontal && Math.abs(dx) < speed) {
    horizontal = false; // lined up on this axis, so close in along the other
  } else if (!horizontal && Math.abs(dy) < speed) {
    horizontal = true;
  }
  enemy.bounceAxis = horizontal ? "x" : "y";
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  if (bounceMove(enemy, horizontal ? sx : 0, horizontal ? 0 : sy, room)) {
    return;
  }
  const sideX = horizontal ? 0 : sx || enemy.sidestepSide;
  const sideY = horizontal ? sy || enemy.sidestepSide : 0;
  if (bounceMove(enemy, sideX, sideY, room)) {
    enemy.sidestepX = sideX;
    enemy.sidestepY = sideY;
    enemy.sidestepFrames = ENEMY_SIDESTEP_FRAMES;
  } else {
    enemy.sidestepSide = -enemy.sidestepSide;
  }
}

// One frame of the hop cycle. dashState is the state name used while dashing.
function hopStep(enemy, player, room, dashState) {
  const type = enemy.type;
  if (enemy.state === dashState) {
    if (enemy.stateTimer > 0) {
      hopMove(enemy, room);
    } else {
      enemy.hopDir = null;
      enemy.setState("idle", type.hopRest);
    }
    return;
  }
  const target = enemy.stateTimer > 0 ? null : enemy.getTarget(player, room);
  if (!target) {
    return;
  }
  const toTarget = target.sub(enemy.getCenter());
  if (toTarget.magSq() === 0) {
    return; // no direction to dash in
  }
  enemy.hopDir = toTarget.setMag(1);
  enemy.setState(dashState, type.hopFrames);
  hopMove(enemy, room);
}

function hopMove(enemy, room) {
  const speed = enemy.type.hopSpeed;
  moveWithCollision(enemy, enemy.hopDir.x * speed, enemy.hopDir.y * speed, room);
}

const ENEMY_MAX_LEAD_FRAMES = 45; // a shot never leads the player by more than this many frames
const ENEMY_WANDER_FRAMES = 120; // how long a wandering enemy keeps one direction
const ENEMY_KEEP_SLACK = 8; // pixels of give around keepRange so shooters do not jitter
const ENEMY_WOBBLE_TIME = 8; // bigger is a slower zigzag
const ENEMY_WOBBLE_ANGLE = 1.2; // radians, the widest swing to either side of the player

// One frame of backing straight away from a point: along the longer axis, or the other one when
// a wall blocks that.
function backAway(enemy, from, room) {
  const c = enemy.getCenter();
  const sx = Math.sign(c.x - from.x) || 1;
  const sy = Math.sign(c.y - from.y) || 1;
  const speed = enemy.getSpeed();
  const horizontalFirst = Math.abs(c.x - from.x) >= Math.abs(c.y - from.y);
  const tries = horizontalFirst ? [[sx, 0], [0, sy]] : [[0, sy], [sx, 0]];
  for (const [dx, dy] of tries) {
    const x = enemy.pos.x;
    const y = enemy.pos.y;
    moveWithCollision(enemy, dx * speed, dy * speed, room);
    if (enemy.pos.x !== x || enemy.pos.y !== y) {
      return;
    }
  }
}

// The vector from the enemy to where a shot should go.
function shootAim(enemy, player, attack) {
  const center = enemy.getCenter();
  const point = player.getCenter();
  if (attack.lead && player.vel) {
    const flight = Math.min(point.dist(center) / attack.speed, ENEMY_MAX_LEAD_FRAMES);
    point.add(player.vel.copy().mult(flight * attack.lead));
  }
  const aim = point.sub(center);
  if (attack.aimSteps && aim.magSq() > 0) {
    // Snap to the nearest of aimSteps evenly spaced directions (8 gives the cardinals and diagonals).
    const step = (2 * Math.PI) / attack.aimSteps;
    const angle = Math.round(Math.atan2(aim.y, aim.x) / step) * step;
    return new p5.Vector(Math.cos(angle), Math.sin(angle)).mult(aim.mag());
  }
  return aim;
}

// Builds the projectiles for one volley along aim.
function fireShots(enemy, aim, attack) {
  const center = enemy.getCenter();
  const count = attack.count || 1;
  const step = ((attack.spread || 0) * Math.PI) / 180;
  const shots = [];
  for (let i = 0; i < count; i++) {
    const dir = aim.copy();
    dir.rotate((i - (count - 1) / 2) * step);
    const shot = new Projectile(center.x, center.y, dir, attack.damage, attack.speed);
    shot.color = attack.color.slice(); // a copy, so the table is never shared
    if (attack.projectile) {
      shot.sprite = attack.projectile; // read only, shared. The view animates it from shot.age.
    }
    shots.push(shot);
  }
  return shots;
}

// An attack runs once per frame and returns an array of new projectiles, often empty.
const ENEMY_ATTACKS = Object.freeze({
  // Fires count projectiles at the player, spread degrees apart, once the cooldown is over.
  // Needs a clear line of sight. Optional attack.windup frames telegraph the shot (the enemy
  // shakes and the aim is locked when the windup starts), and attack.lead from 0 to 1 aims
  // ahead of a walking player.
  shoot: function (enemy, player, room) {
    const attack = enemy.getAttack();
    if (enemy.state === "windup" && !(attack.windup > 0)) {
      enemy.setState("idle", 0); // a phase swapped to an attack with no windup
    }
    if (enemy.state === "windup") {
      if (enemy.stateTimer > 0) {
        return [];
      }
      const locked = enemy.aimDir;
      enemy.aimDir = null;
      enemy.setState("idle", 0);
      return locked && locked.magSq() > 0 ? fireShots(enemy, locked, attack) : [];
    }
    const sees = enemy.canSee(player, room);
    if (attack.stare && sees) {
      enemy.stareTimer++;
    } else if (attack.stare) {
      enemy.stareTimer = 0; // staring starts over when sight is lost
    }
    if (enemy.attackTimer > 0 || !sees) {
      return [];
    }
    if (attack.stare && enemy.stareTimer < attack.stare) {
      return [];
    }
    const aim = shootAim(enemy, player, attack);
    if (aim.magSq() === 0) {
      return []; // no direction to aim, and a zero vector would give NaN
    }
    enemy.attackTimer = attack.cooldown;
    enemy.stareTimer = 0;
    if (attack.windup > 0) {
      enemy.aimDir = aim;
      enemy.shotFlash = attack.windup; // the view flashes the enemy while it winds up
      enemy.setState("windup", attack.windup);
      return [];
    }
    return fireShots(enemy, aim, attack);
  },

  // Melee does not fire anything. Enemy.meleeHit hurts the player during the attack state.
  melee: function (enemy, player) {
    return [];
  }
});
