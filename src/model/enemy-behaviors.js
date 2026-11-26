// Movement and attack behaviors, looked up by name from enemy-types.js.
// Model code: no p5 drawing calls. To add a behavior, add one entry here and name it in a type's
// row. A behavior uses only the enemy, player and room it is given.

// A move runs once per frame while the enemy is alive and not frozen by a hit. It is an object:
//   run(enemy, player, room)  the behavior itself
//   direct      true for a move that goes straight at the player and ignores walls and sight: a
//               wall just stops the step. Every other move walks whole tiles around walls. Walkers
//               notice the player anywhere in detection range, but shooting and sight speed need
//               a clear line of sight.
//   dashState   the state it is in while it dashes. Enemies are not pushed apart then, so a
//               dash keeps its line.
//   stationary  true for a move that never moves (turrets), so the enemy is never pushed apart
//   roams       true for a move that ambles about or walks a route and never goes after the player
//   interrupt(enemy)  what a hit, or running into the player, does to it
// Anything a behavior must remember from one frame to the next goes in enemy.memory, which is
// emptied whenever the enemy's move state is reset. Do not add fields to Enemy for it.
const ENEMY_MOVES = Object.freeze({
  // Stands still, for turrets.
  none: {
    stationary: true,
    run: function (enemy, player, room) {}
  },

  // Follows the tiles to the player in straight lines, around walls, once the player is in range.
  chase: {
    run: function (enemy, player, room) {
      enemy.moveAlongTiles(player, room);
    }
  },

  // Ambles along a straight line in a random direction until the player is noticed, then follows
  // the tiles to them. It speeds up to type.sightSpeed while the player is in its line of sight.
  // With type.vision "line" it only notices the player along the row or column it faces, runs to
  // the spot where it saw them even if they step away, then goes back to ambling.
  wanderChase: {
    run: function (enemy, player, room) {
      if (enemy.getTarget(player, room)) {
        enemy.setState("run", 0); // the art runs while it hunts
        enemy.moveAlongTiles(player, room, enemy.canSee(player, room) ? enemy.getSightSpeed() : undefined);
        return;
      }
      enemy.setState("idle", 0);
      wanderStep(enemy, room, enemy.type.wanderSpeed);
    }
  },

  // Ambles along a straight line in a random direction at its speed, and turns when it meets a
  // wall. It never goes after the player. Its attack does the rest. It stands still while it
  // attacks.
  wander: {
    roams: true,
    run: function (enemy, player, room) {
      if (enemy.state === "windup" || enemy.state === "attack" || enemy.state === "recover") {
        return;
      }
      wanderStep(enemy, room, enemy.getSpeed());
    }
  },

  // Walks its patrol route, a loop of tile offsets from where it spawned (type.patrol, or the
  // enemy's own patrolPath). It follows the tiles, faces the way it walks, and ignores the
  // player. A stop it cannot reach is skipped, so it never gets stuck on one.
  patrol: {
    roams: true,
    run: function (enemy, player, room) {
      patrolStep(enemy, room);
    }
  },

  // Follows the tiles toward the player until keepRange away and backs off along a straight line
  // when closer. For shooters. (Standing still for a shot is handled by Enemy.update.)
  keepDistance: {
    run: function (enemy, player, room) {
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
    }
  },

  // Zigzags toward the player. enemy.age counts frames, so the wobble is repeatable.
  erratic: {
    run: function (enemy, player, room) {
      const target = enemy.getTarget(player, room);
      if (!target) {
        return;
      }
      const step = target.sub(enemy.getCenter()).setMag(enemy.getSpeed());
      step.rotate(Math.sin(enemy.age / ENEMY_WOBBLE_TIME) * ENEMY_WOBBLE_ANGLE);
      moveWithCollision(enemy, step.x, step.y, room);
    }
  },

  // Rests, then dashes in a straight line toward where the player was when the dash began.
  hop: {
    direct: true,
    dashState: "hop",
    run: function (enemy, player, room) {
      hopStep(enemy, player, room, "hop");
    },
    // A hit, or running into the player, ends the dash and starts the rest.
    interrupt: function (enemy) {
      if (enemy.state === "hop") {
        enemy.memory.hopDir = null;
        enemy.setState("idle", enemy.type.hopRest || 0);
      }
    }
  },

  // Bounces after the player the whole time, in the four cardinal directions only, and swings
  // the moment the player is in front of it (inside the swing box, attack.reach from its
  // center). It never rests, and like the hoppers it ignores walls and sight.
  bounce: {
    direct: true,
    run: function (enemy, player, room) {
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
    }
  }
});

// One frame of ambling: keeps going in one of the four directions for a while, and picks another
// when it meets a wall. Both wandering moves use it. enemy.rng picks the direction.
function wanderStep(enemy, room, speed) {
  const wander = wanderMemory(enemy);
  wander.timer--;
  if (wander.timer <= 0 || !wander.dir) {
    const roll = Math.floor(enemy.rng() * 4); // right, down, left or up
    wander.dir = p5.Vector.fromAngle((roll * Math.PI) / 2);
    wander.dir.set(Math.round(wander.dir.x), Math.round(wander.dir.y));
    wander.timer = ENEMY_WANDER_FRAMES;
  }
  enemy.faceDirection(wander.dir.x, wander.dir.y); // look where it is stumbling
  const before = enemy.pos.copy();
  const dx = wander.dir.x * speed;
  const dy = wander.dir.y * speed;
  moveWithCollision(enemy, dx, dy, room);
  // A wall clips one axis even when it only slides along it, so check both axes.
  const clippedX = Math.abs(enemy.pos.x - before.x - dx) > 0.000001;
  const clippedY = Math.abs(enemy.pos.y - before.y - dy) > 0.000001;
  if (clippedX || clippedY) {
    wander.timer = 0; // hit a wall, pick a new direction next frame
  }
}

// The point (the center of a tile) the patrol stop at index lies on.
function patrolStop(enemy, room, index) {
  const path = enemy.patrolPath || enemy.type.patrol;
  const ts = room ? room.tileSize : TILE_SIZE;
  const stop = path[index % path.length];
  const home = enemy.home;
  return new p5.Vector(home.x + enemy.length / 2 + stop.dx * ts, home.y + enemy.width / 2 + stop.dy * ts);
}

// One frame of a patrol: walk toward the current stop and, once there, aim for the next one.
function patrolStep(enemy, room) {
  const path = enemy.patrolPath || enemy.type.patrol;
  if (!Array.isArray(path) || path.length === 0) {
    return;
  }
  const speed = enemy.getSpeed();
  let target = patrolStop(enemy, room, enemy.patrolIndex);
  // At most one lap of stops per frame, so a route of nothing but stops it is already on cannot spin.
  for (let tries = 0; tries < path.length; tries++) {
    const routeDone =
      enemy.route !== null && enemy.route.length === 0 && room && enemy.routeGoal === enemy.tileKey(target, room);
    const closeEnough = target.dist(enemy.getCenter()) < Math.max(1, speed);
    if (!routeDone && !closeEnough) {
      break;
    }
    enemy.patrolIndex = (enemy.patrolIndex + 1) % path.length;
    enemy.route = null;
    target = patrolStop(enemy, room, enemy.patrolIndex);
  }
  enemy.walkTileRoute(target, room, speed);
}

// What a wandering enemy remembers: the way it is going and how long it keeps going that way.
function wanderMemory(enemy) {
  if (!enemy.memory.wander) {
    enemy.memory.wander = { dir: null, timer: 0 };
  }
  return enemy.memory.wander;
}

// What a bouncer remembers: the axis it is closing in along, and the sidestep it is in the middle of.
function bounceMemory(enemy) {
  if (!enemy.memory.bounce) {
    enemy.memory.bounce = { axis: null, sidestepFrames: 0, sidestepX: 0, sidestepY: 0, sidestepSide: 1 };
  }
  return enemy.memory.bounce;
}

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
  const bounce = bounceMemory(enemy);
  const target = enemy.getTarget(player, room);
  if (!target) {
    enemy.setState("idle", 0);
    bounce.axis = null;
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
  if (bounce.sidestepFrames > 0) {
    bounce.sidestepFrames--;
    if (bounceMove(enemy, bounce.sidestepX, bounce.sidestepY, room)) {
      return;
    }
    bounce.sidestepFrames = 0;
    bounce.sidestepSide = -bounce.sidestepSide; // blocked that way too, so try the other way next
  }
  let horizontal = bounce.axis === "x";
  if (
    bounce.axis === null ||
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
  bounce.axis = horizontal ? "x" : "y";
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  if (bounceMove(enemy, horizontal ? sx : 0, horizontal ? 0 : sy, room)) {
    return;
  }
  const sideX = horizontal ? 0 : sx || bounce.sidestepSide;
  const sideY = horizontal ? sy || bounce.sidestepSide : 0;
  if (bounceMove(enemy, sideX, sideY, room)) {
    bounce.sidestepX = sideX;
    bounce.sidestepY = sideY;
    bounce.sidestepFrames = ENEMY_SIDESTEP_FRAMES;
  } else {
    bounce.sidestepSide = -bounce.sidestepSide;
  }
}

// One frame of the hop cycle. dashState is the state name used while dashing.
function hopStep(enemy, player, room, dashState) {
  const type = enemy.type;
  if (enemy.state === dashState) {
    if (enemy.stateTimer > 0) {
      hopMove(enemy, room);
    } else {
      enemy.memory.hopDir = null;
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
  enemy.memory.hopDir = toTarget.setMag(1);
  enemy.setState(dashState, type.hopFrames);
  hopMove(enemy, room);
}

function hopMove(enemy, room) {
  const speed = enemy.type.hopSpeed;
  const dir = enemy.memory.hopDir;
  moveWithCollision(enemy, dir.x * speed, dir.y * speed, room);
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

// The { count, spread } of the next volley. An attack with attack.volleys goes through the list
// in turn and starts over at the end. Any other attack always fires attack.count and spread.
function nextVolley(enemy, attack) {
  if (!attack.volleys) {
    return { count: attack.count || 1, spread: attack.spread || 0 };
  }
  const turn = enemy.memory.volleyTurn || 0;
  enemy.memory.volleyTurn = turn + 1;
  return attack.volleys[turn % attack.volleys.length];
}

// Builds the projectiles for one volley along aim.
function fireShots(enemy, aim, attack) {
  const center = enemy.getCenter();
  const volley = nextVolley(enemy, attack);
  const count = volley.count;
  const step = (volley.spread * Math.PI) / 180;
  const shots = [];
  for (let i = 0; i < count; i++) {
    const dir = aim.copy();
    dir.rotate((i - (count - 1) / 2) * step);
    const shot = new Projectile(center.x, center.y, dir, attack.damage, attack.speed);
    shot.color = attack.color.slice(); // a copy, so the table is never shared
    shot.shooter = enemy.typeName; // the view looks up this type's shot art, and animates it from shot.age
    shots.push(shot);
  }
  return shots;
}

// Ends an attack's windup or aftermath: goes to the "recover" state for attack.recover frames
// (the art shows its follow-through then, and the enemy stays put), or straight to idle.
function finishAttack(enemy, attack) {
  if (attack.recover > 0) {
    enemy.setState("recover", attack.recover);
  } else {
    enemy.setState("idle", 0);
  }
}

// Once the "recover" state has run out, goes back to idle. True while it is still going.
function stillRecovering(enemy) {
  if (enemy.state === "recover" && enemy.stateTimer === 0) {
    enemy.setState("idle", 0);
  }
  return enemy.state === "recover";
}

// Turns an enemy that faces the way it walks (type.facing "travel") toward where it is about to
// attack, the nearest of the four sides. Enemies that always face the player need no help.
function faceAttackDirection(enemy, dx, dy) {
  if (enemy.facesTravel() && (dx !== 0 || dy !== 0)) {
    enemy.faceDirection(dx, dy);
  }
}

// An attack is an object:
//   run(enemy, player, room)  runs once per frame and returns an array of new projectiles, often empty
//   interrupt(enemy, attack)  what a hit does to the enemy while it is winding the attack up
const ENEMY_ATTACKS = Object.freeze({
  // Fires count projectiles at the player, spread degrees apart, once the cooldown is over.
  // Needs a clear line of sight. Optional attack.windup frames telegraph the shot (the enemy
  // shakes and the aim is locked when the windup starts), attack.lead from 0 to 1 aims ahead of
  // a walking player, attack.aimSteps snaps the aim to that many directions, and attack.stare
  // makes it wait until the player has stayed in sight that long.
  shoot: {
    run: function (enemy, player, room) {
      const attack = enemy.getAttack();
      const memory = enemy.memory;
      if (enemy.state === "windup" && !(attack.windup > 0)) {
        enemy.setState("idle", 0); // a phase swapped to an attack with no windup
      }
      if (stillRecovering(enemy)) {
        return []; // the follow-through after a shot
      }
      if (enemy.state === "windup") {
        if (enemy.stateTimer > 0) {
          return [];
        }
        const locked = memory.aimDir;
        memory.aimDir = null;
        finishAttack(enemy, attack);
        return locked && locked.magSq() > 0 ? fireShots(enemy, locked, attack) : [];
      }
      const sees = enemy.canSee(player, room);
      if (attack.stare) {
        memory.stareFrames = sees ? (memory.stareFrames || 0) + 1 : 0; // starts over when sight is lost
      }
      if (enemy.attackTimer > 0 || !sees) {
        return [];
      }
      if (attack.stare && (memory.stareFrames || 0) < attack.stare) {
        return [];
      }
      const aim = shootAim(enemy, player, attack);
      if (aim.magSq() === 0) {
        return []; // no direction to aim, and a zero vector would give NaN
      }
      enemy.attackTimer = attack.cooldown;
      memory.stareFrames = 0;
      faceAttackDirection(enemy, aim.x, aim.y);
      if (attack.windup > 0) {
        memory.aimDir = aim;
        enemy.setState("windup", attack.windup);
        return [];
      }
      const shots = fireShots(enemy, aim, attack);
      finishAttack(enemy, attack);
      return shots;
    },

    // A hit breaks the telegraphed shot, and the shooter waits a while before the next.
    interrupt: function (enemy, attack) {
      enemy.setState("idle", 0);
      enemy.memory.aimDir = null;
      enemy.attackTimer = Math.max(enemy.attackTimer, Math.ceil(attack.cooldown / 2));
    }
  },

  // Melee does not fire anything. Enemy.meleeHit hurts the player during the attack state.
  melee: {
    run: function (enemy, player) {
      return [];
    },

    // A broken swing leaves the enemy open.
    interrupt: function (enemy, attack) {
      enemy.setState("recover", attack.recover);
    }
  },

  // Short range lightning. Once the player is in sight (and close, which the type's
  // detectionRange decides) it turns to the nearest of the four sides toward them, winds up, then
  // for attack.active frames (default ENEMY_SWING_FRAMES) there is a bolt attack.reach long in
  // front of it that hurts a player standing in it (Enemy.meleeHit does that part). It fires
  // nothing, like melee. The state goes windup, attack, recover, idle.
  zap: {
    run: function (enemy, player, room) {
      const attack = enemy.getAttack();
      if (enemy.state === "windup" && enemy.stateTimer === 0) {
        enemy.setState("attack", attack.active || ENEMY_SWING_FRAMES);
        enemy.swingHit = false;
      } else if (enemy.state === "attack" && enemy.stateTimer === 0) {
        enemy.setState("recover", attack.recover);
      }
      if (stillRecovering(enemy) || enemy.state === "windup" || enemy.state === "attack") {
        return [];
      }
      if (enemy.attackTimer > 0 || !enemy.canSee(player, room)) {
        return [];
      }
      const toPlayer = enemy.directionTo(player);
      enemy.faceDirection(toPlayer.x, toPlayer.y); // the nearest of the four sides
      enemy.attackTimer = attack.cooldown;
      enemy.setState("windup", attack.windup);
      return [];
    },

    // A hit while it is winding up breaks the bolt.
    interrupt: function (enemy, attack) {
      enemy.setState("idle", 0);
      enemy.attackTimer = Math.max(enemy.attackTimer, Math.ceil(attack.cooldown / 2));
    }
  },

  // Calls lightning down from the sky. When the windup is over, a LightningStrike appears on the
  // spot where the player is standing. It only marks the spot for attack.delay frames, then
  // hurts whoever is there for attack.active frames. It is a projectile, so the run keeps it in
  // enemyProjectiles with the shots.
  strike: {
    run: function (enemy, player, room) {
      const attack = enemy.getAttack();
      if (stillRecovering(enemy)) {
        return [];
      }
      if (enemy.state === "windup") {
        if (enemy.stateTimer > 0) {
          return [];
        }
        finishAttack(enemy, attack);
        const spot = player.getCenter();
        const bolt = new LightningStrike(spot.x, spot.y, attack.damage, attack.delay, attack.active, attack.size);
        bolt.shooter = enemy.typeName; // the view looks up this type's lightning art
        return [bolt];
      }
      if (enemy.attackTimer > 0 || !enemy.canSee(player, room)) {
        return [];
      }
      const toPlayer = enemy.directionTo(player);
      enemy.faceDirection(toPlayer.x, toPlayer.y); // the calling pose faces the player
      enemy.attackTimer = attack.cooldown;
      enemy.setState("windup", attack.windup);
      return [];
    },

    // A hit while it is calling the lightning breaks the spell.
    interrupt: function (enemy, attack) {
      enemy.setState("idle", 0);
      enemy.attackTimer = Math.max(enemy.attackTimer, Math.ceil(attack.cooldown / 2));
    }
  }
});
