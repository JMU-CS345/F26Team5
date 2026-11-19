// Line of sight, hunting memory, knockback on contact, hit pause, interrupts, melee cooldown,
// separation and telegraphed shots. Uses placePlayerRightOf and tryAttackThroughWindup from
// enemy.spec.js, which loads first in SpecRunner.html.

// A solid wall from the top border to the bottom border, one tile thick, down the middle.
function wallDownTheMiddle(room) {
  const col = room.cols / 2;
  for (let row = 1; row < room.rows - 1; row++) {
    room.setTile(col, row, TILE.INTERIOR_WALL);
  }
}

// A Jelly-based type that swings, with short frame counts so specs stay small.
function meleeType(overrides = {}) {
  return {
    ...ENEMY_TYPES.Jelly,
    move: "hopSwing",
    hopRest: 2,
    hopFrames: 5,
    hopSpeed: 2,
    attack: { kind: "melee", cooldown: 100, damage: 1, reach: 26, windup: 2, recover: 2 },
    ...overrides
  };
}

describe("Line of sight", function () {
  let room;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
  });

  it("is clear across open floor and blocked by a wall", function () {
    expect(room.hasLineOfSight(100, 200, 500, 200)).toBe(true);
    wallDownTheMiddle(room);
    expect(room.hasLineOfSight(100, 200, 500, 200)).toBe(false);
    expect(room.hasLineOfSight(100, 200, 300, 200)).toBe(true); // both on one side
  });

  it("makes canSee false behind a wall even inside detection range", function () {
    const enemy = createEnemy("Skeleton", 250, 200);
    const player = new Player(0, 0);
    placePlayerRightOf(enemy, player, 120);
    expect(enemy.canSee(player, room)).toBe(true);
    wallDownTheMiddle(room);
    expect(enemy.canSee(player, room)).toBe(false);
    expect(enemy.canSee(player)).toBe(true); // with no room it is just the range check
  });

  it("stops shooters firing through a wall", function () {
    const skeleton = createEnemy("Skeleton", 250, 200);
    const player = new Player(0, 0);
    placePlayerRightOf(skeleton, player, 120);
    skeleton.attackTimer = 0;
    wallDownTheMiddle(room);
    expect(tryAttackThroughWindup(skeleton, player, room)).toEqual([]);
    expect(skeleton.state).toBe("idle"); // no telegraph either
    room = new NormalRoom(0, 0, 640, 400);
    expect(tryAttackThroughWindup(skeleton, player, room).length).toBe(1);
  });

  it("keeps a walker from heading straight into a wall it has no way around", function () {
    const enemy = new Enemy(240, 192);
    enemy.type = { ...ENEMY_TYPES.Jelly, move: "chase" };
    enemy.speed = 1;
    const player = new Player(0, 0);
    placePlayerRightOf(enemy, player, 120);
    wallDownTheMiddle(room); // no gap at all
    for (let i = 0; i < 10; i++) {
      enemy.update(player, room);
    }
    expect(enemy.pos.x).toBe(240);
    expect(enemy.pos.y).toBe(192);
  });
});

describe("Hunting the last known spot", function () {
  let room;
  let enemy;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    enemy = new Enemy(96, 192); // on the tile grid
    enemy.type = { ...ENEMY_TYPES.Jelly, move: "chase" };
    enemy.speed = 1;
    player = new Player(0, 0);
    placePlayerRightOf(enemy, player, 150);
  });

  it("keeps walking to where the player was after losing them", function () {
    enemy.update(player, room); // sees the player and notes the spot
    const seen = enemy.pos.x;
    player.pos.set(600, 360); // far out of range
    enemy.update(player, room);
    expect(enemy.pos.x).toBeGreaterThan(seen);
    expect(enemy.alertTimer).toBeGreaterThan(0);
  });

  it("gives up once the memory runs out", function () {
    enemy.update(player, room);
    player.pos.set(600, 360);
    for (let i = 0; i < ENEMY_ALERT_FRAMES + 5; i++) {
      enemy.update(player, room);
    }
    expect(enemy.alertTimer).toBe(0);
    expect(enemy.lastKnown).toBe(null);
    const stopped = enemy.pos.x;
    enemy.update(player, room);
    expect(enemy.pos.x).toBe(stopped);
  });

  it("stops on the last known spot instead of jittering over it", function () {
    enemy.speed = 3;
    enemy.update(player, room);
    player.pos.set(600, 360);
    for (let i = 0; i < 80; i++) {
      enemy.update(player, room);
    }
    expect(enemy.lastKnown).toBe(null); // arrived, so the memory cleared
  });

  it("never chases a player it has not seen", function () {
    player.pos.set(600, 360);
    enemy.update(player, room);
    expect(enemy.pos.x).toBe(96);
  });
});

describe("Knockback on contact", function () {
  let room;
  let enemy;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    enemy = new Enemy(200, 200);
    enemy.type = { ...ENEMY_TYPES.Jelly, move: "none" };
    player = new Player(210, 200); // overlapping, to the right of the enemy
  });

  it("shoves the player and the enemy apart when contact damage lands", function () {
    expect(enemy.damagePlayer(player)).toBe(true);
    expect(player.knockback.x).toBeGreaterThan(0);
    expect(enemy.knockback.x).toBeLessThan(0);
    const playerStart = player.pos.x;
    const enemyStart = enemy.pos.x;
    for (let i = 0; i < PLAYER_KNOCKBACK_FRAMES; i++) {
      player.update(room);
      enemy.update(player, room);
    }
    expect(player.pos.x).toBeGreaterThan(playerStart + 5);
    expect(enemy.pos.x).toBeLessThan(enemyStart - 5);
  });

  it("only shoves when damage lands, not on every touching frame", function () {
    enemy.damagePlayer(player);
    player.knockback.set(0, 0);
    player.knockbackTimer = 0;
    expect(enemy.damagePlayer(player)).toBe(false); // still cooling down
    expect(player.knockbackTimer).toBe(0);
  });

  it("takes steering away from the player while shoved, then gives it back", function () {
    enemy.damagePlayer(player);
    const before = player.pos.copy();
    player.move(new p5.Vector(-1, 0), room);
    expect(player.pos.x).toBe(before.x);
    for (let i = 0; i < PLAYER_KNOCKBACK_FRAMES; i++) {
      player.update(room);
    }
    const settled = player.pos.x;
    player.move(new p5.Vector(-1, 0), room);
    expect(player.pos.x).toBeLessThan(settled);
  });

  it("stops the player's shove at a wall", function () {
    player.pos.set(room.x + room.width - 16 - player.length - 1, 200); // by the right wall
    enemy.pos.set(player.pos.x - 8, 200);
    enemy.damagePlayer(player);
    for (let i = 0; i < PLAYER_KNOCKBACK_FRAMES; i++) {
      player.update(room);
    }
    expect(room.collidesWithWall(player.getBounds())).toBe(false);
  });

  it("does not shove a dead player", function () {
    player.health = 1;
    enemy.contactDamage = 5;
    enemy.damagePlayer(player);
    expect(player.isDead()).toBe(true);
    expect(player.knockbackTimer).toBe(0);
  });

  it("gives no shove for damage with no direction", function () {
    player.takeDamage(1);
    expect(player.knockbackTimer).toBe(0);
  });

  it("copes with the two centers sitting exactly on each other", function () {
    player.pos.set(enemy.pos.x, enemy.pos.y);
    expect(enemy.damagePlayer(player)).toBe(true);
    expect(Number.isFinite(player.knockback.x)).toBe(true);
    expect(Number.isFinite(player.knockback.y)).toBe(true);
    expect(player.knockback.mag()).toBeCloseTo(PLAYER_KNOCKBACK_SPEED, 5);
  });

  it("recoils a boss half as far", function () {
    const demon = createEnemy("Demon", 200, 200);
    demon.spawnTimer = 0;
    player.pos.set(210, 200);
    expect(demon.damagePlayer(player)).toBe(true);
    expect(demon.knockback.mag()).toBeCloseTo(ENEMY_KNOCKBACK_SPEED / 2, 5);
  });

  it("shoves the player along a projectile's path", function () {
    const shot = new Projectile(0, 0, new p5.Vector(0, 1), 1, 2);
    shot.pos.set(player.pos.x, player.pos.y);
    expect(projectileHitsPlayer(shot, player)).toBe(true);
    expect(player.knockback.y).toBeGreaterThan(0);
    expect(player.knockback.x).toBeCloseTo(0, 5);
  });

  it("shoves the player away from a melee swing", function () {
    const bouncer = new Enemy(200, 200);
    bouncer.type = meleeType();
    placePlayerRightOf(bouncer, player, 18);
    bouncer.facingDir = "right";
    bouncer.setState("attack", 5);
    expect(bouncer.meleeHit(player)).toBe(true);
    expect(player.knockback.x).toBeGreaterThan(0);
  });
});

describe("Hit pause", function () {
  it("lets an enemy move again before its damage cooldown ends", function () {
    const room = new NormalRoom(0, 0, 640, 400);
    const enemy = new Enemy(192, 192); // on the tile grid
    enemy.type = { ...ENEMY_TYPES.Jelly, move: "chase" };
    enemy.speed = 1;
    const player = new Player(197, 192);
    expect(enemy.damagePlayer(player)).toBe(true);
    expect(enemy.recoverTimer).toBe(ENEMY_HIT_PAUSE_FRAMES);
    player.pos.set(330, 192); // out of reach, in range, in the same row
    for (let i = 0; i < ENEMY_HIT_PAUSE_FRAMES; i++) {
      enemy.update(player, room);
    }
    expect(enemy.damageCooldown).toBeGreaterThan(0);
    const before = enemy.pos.x;
    enemy.update(player, room);
    expect(enemy.pos.x).toBeGreaterThan(before);
  });
});

describe("Interrupts", function () {
  it("breaks a melee windup into a recovery when the enemy is hit", function () {
    const enemy = new Enemy(200, 200);
    enemy.type = meleeType({ attack: { kind: "melee", cooldown: 100, damage: 1, reach: 26, windup: 20, recover: 9 } });
    enemy.setState("windup", 15);
    enemy.takeDamage(1);
    expect(enemy.state).toBe("recover");
    expect(enemy.stateTimer).toBe(9);
  });

  it("does not cut short a swing that is already out", function () {
    const enemy = new Enemy(200, 200);
    enemy.type = meleeType();
    enemy.setState("attack", 5);
    enemy.takeDamage(1);
    expect(enemy.state).toBe("attack");
  });

  it("ends a dash and sends the enemy back to rest", function () {
    const enemy = new Enemy(200, 200);
    enemy.type = { ...ENEMY_TYPES.Jelly, move: "hop", hopRest: 40, hopFrames: 14, hopSpeed: 2.2 };
    enemy.setState("hop", 10);
    enemy.hopDir = new p5.Vector(1, 0);
    enemy.takeDamage(1);
    expect(enemy.state).toBe("idle");
    expect(enemy.stateTimer).toBe(40);
    expect(enemy.hopDir).toBe(null);
  });

  it("cancels a telegraphed shot and delays the next one", function () {
    const room = new NormalRoom(0, 0, 640, 400);
    const skeleton = createEnemy("Skeleton", 100, 200);
    const player = new Player(0, 0);
    placePlayerRightOf(skeleton, player, 100);
    skeleton.attackTimer = 0;
    expect(skeleton.tryAttack(player, room)).toEqual([]);
    expect(skeleton.state).toBe("windup");
    skeleton.takeDamage(1);
    expect(skeleton.state).toBe("idle");
    expect(skeleton.aimDir).toBe(null);
    expect(skeleton.attackTimer).toBeGreaterThanOrEqual(Math.ceil(ENEMY_TYPES.Skeleton.attack.cooldown / 2));
    expect(skeleton.tryAttack(player, room)).toEqual([]);
    expect(skeleton.state).toBe("idle");
  });

  it("leaves bosses alone, since they are heavy", function () {
    const demon = createEnemy("Demon", 100, 100);
    demon.setState("windup", 5);
    demon.takeDamage(1);
    expect(demon.state).toBe("windup");
  });
});

describe("A phase swapping the move behavior", function () {
  function phasedEnemy() {
    const enemy = new Enemy(200, 200);
    enemy.type = meleeType({ maxHealth: 4, phases: [{ below: 0.5, move: "chase" }] });
    enemy.maxHealth = 4;
    enemy.health = 4;
    return enemy;
  }

  it("resets the state instead of leaving it stuck", function () {
    const room = new NormalRoom(0, 0, 640, 400);
    const player = new Player(500, 350);
    const enemy = phasedEnemy();
    enemy.setState("windup", 10);
    enemy.update(player, room);
    expect(enemy.state).toBe("windup"); // the first update only records the move
    enemy.health = 1; // straight to the phase, with no hit to interrupt it
    enemy.update(player, room);
    expect(enemy.state).toBe("idle");
    expect(enemy.stateTimer).toBe(0);
  });

  it("leaves the state alone while the move stays the same", function () {
    const room = new NormalRoom(0, 0, 640, 400);
    const player = new Player(500, 350);
    const enemy = phasedEnemy();
    enemy.setState("windup", 10);
    enemy.update(player, room);
    enemy.update(player, room);
    expect(enemy.state).toBe("windup");
    expect(enemy.stateTimer).toBe(8);
  });
});

describe("Melee cooldown", function () {
  it("is the least time between swings", function () {
    const room = new NormalRoom(0, 0, 640, 400);
    const enemy = new Enemy(100, 200);
    enemy.type = meleeType();
    const player = new Player(0, 0);
    placePlayerRightOf(enemy, player, 20);
    let swings = 0;
    let wasSwinging = false;
    for (let frame = 0; frame < 150; frame++) {
      enemy.update(player, room);
      if (enemy.state === "attack" && !wasSwinging) {
        swings++;
      }
      wasSwinging = enemy.state === "attack";
    }
    // Without the cooldown this loop would swing about nine times.
    expect(swings).toBe(2);
  });
});

describe("Separation", function () {
  let room;

  function chaser(x, y) {
    const enemy = new Enemy(x, y);
    enemy.type = { ...ENEMY_TYPES.Jelly, move: "chase" };
    return enemy;
  }

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
  });

  it("pushes overlapping enemies apart until they clear each other", function () {
    const a = chaser(200, 200);
    const b = chaser(204, 200);
    room.enemies = [a, b];
    const player = new Player(600, 360); // out of range, so only separation moves them
    for (let i = 0; i < 60; i++) {
      a.update(player, room);
      b.update(player, room);
    }
    const minDist = ((a.length + b.length) / 2) * ENEMY_SEPARATION_FRACTION;
    expect(p5.Vector.dist(a.getCenter(), b.getCenter())).toBeGreaterThanOrEqual(minDist - 0.01);
  });

  it("separates enemies stacked exactly on top of each other", function () {
    const a = chaser(200, 200);
    const b = chaser(200, 200);
    room.enemies = [a, b];
    const player = new Player(600, 360);
    for (let i = 0; i < 60; i++) {
      a.update(player, room);
      b.update(player, room);
    }
    const d = p5.Vector.dist(a.getCenter(), b.getCenter());
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThan(10);
  });

  it("never pushes a turret", function () {
    const eye = createEnemy("Eyeball", 200, 200);
    eye.spawnTimer = 0;
    const walker = chaser(202, 200);
    room.enemies = [eye, walker];
    const player = new Player(600, 360);
    for (let i = 0; i < 30; i++) {
      eye.update(player, room);
      walker.update(player, room);
    }
    expect(eye.pos.x).toBe(200);
    expect(eye.pos.y).toBe(200);
    expect(p5.Vector.dist(eye.getCenter(), walker.getCenter())).toBeGreaterThan(10);
  });

  it("ignores dead neighbors", function () {
    const a = chaser(200, 200);
    const b = chaser(202, 200);
    b.takeDamage(b.maxHealth);
    room.enemies = [a, b];
    a.update(new Player(600, 360), room);
    expect(a.pos.x).toBe(200);
  });
});

describe("Telegraphed shots", function () {
  let room;
  let skeleton;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    skeleton = createEnemy("Skeleton", 100, 200);
    player = new Player(0, 0);
    placePlayerRightOf(skeleton, player, 100);
    skeleton.attackTimer = 0;
  });

  it("starts a windup first, and fires when it runs out", function () {
    const windup = ENEMY_TYPES.Skeleton.attack.windup;
    expect(skeleton.tryAttack(player, room)).toEqual([]);
    expect(skeleton.state).toBe("windup");
    expect(skeleton.stateTimer).toBe(windup);
    expect(skeleton.attackTimer).toBe(ENEMY_TYPES.Skeleton.attack.cooldown);
    let shots = [];
    for (let i = 0; i < windup + 1 && shots.length === 0; i++) {
      skeleton.update(player, room);
      shots = skeleton.tryAttack(player, room);
    }
    expect(shots.length).toBe(1);
    expect(skeleton.state).toBe("idle");
  });

  it("locks the aim when the windup starts", function () {
    skeleton.tryAttack(player, room);
    player.pos.set(skeleton.pos.x, skeleton.pos.y + 150); // the player runs below
    skeleton.stateTimer = 0;
    const shot = skeleton.tryAttack(player, room)[0];
    expect(shot.vel.x).toBeGreaterThan(0);
    expect(shot.vel.y).toBeCloseTo(0, 5);
  });

  it("leads a walking player when the attack has lead", function () {
    skeleton.type = { ...ENEMY_TYPES.Skeleton, attack: { ...ENEMY_TYPES.Skeleton.attack, windup: 0, lead: 0.5 } };
    player.vel.set(0, 2); // walking down
    const led = skeleton.tryAttack(player, room)[0];
    expect(led.vel.y).toBeGreaterThan(0);

    skeleton.attackTimer = 0;
    skeleton.type = { ...ENEMY_TYPES.Skeleton, attack: { ...ENEMY_TYPES.Skeleton.attack, windup: 0, lead: 0 } };
    const plain = skeleton.tryAttack(player, room)[0];
    expect(plain.vel.y).toBeCloseTo(0, 5);
  });

  it("does not get stuck winding up when a phase drops the windup", function () {
    const demon = createEnemy("Demon", 100, 200);
    demon.type = {
      ...ENEMY_TYPES.Demon,
      attack: { ...ENEMY_TYPES.Demon.attack, windup: 5 },
      phases: [{ below: 0.5, attack: { ...ENEMY_TYPES.Demon.attack, windup: 0 } }]
    };
    placePlayerRightOf(demon, player, 100);
    demon.attackTimer = 0;
    demon.setState("windup", 3);
    demon.health = 5; // into the phase with no windup
    demon.tryAttack(player, room);
    expect(demon.state).toBe("idle");
  });

  it("is checked by the table validator", function () {
    const bad = {
      ...ENEMY_TYPES.Skeleton,
      attack: { ...ENEMY_TYPES.Skeleton.attack, windup: -1, lead: 2 }
    };
    expect(validateEnemyTypes({ Bad: bad }).length).toBeGreaterThan(0);
  });
});

describe("Delay after the player walks in", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(200, 200);
  });

  it("keeps an enemy from hurting the player until the delay is over", function () {
    const enemy = new Enemy(200, 200); // standing right on the player, like one beside a door
    enemy.type = { ...ENEMY_TYPES.Jelly, move: "chase" };
    enemy.startWakeDelay(ENEMY_WAKE_FRAMES);
    expect(enemy.isWaking()).toBe(true);
    expect(enemy.damagePlayer(player)).toBe(false);
    for (let i = 0; i < ENEMY_WAKE_FRAMES; i++) {
      expect(enemy.damagePlayer(player)).toBe(false);
      enemy.update(player, room);
    }
    expect(enemy.isWaking()).toBe(false);
    expect(enemy.damagePlayer(player)).toBe(true);
  });

  it("holds the enemy still while it waits, then lets it go", function () {
    const enemy = new Enemy(100, 192);
    enemy.type = { ...ENEMY_TYPES.Jelly, move: "chase" };
    enemy.speed = 1;
    player.pos.set(240, 192);
    enemy.startWakeDelay(10);
    for (let i = 0; i < 10; i++) {
      enemy.update(player, room);
    }
    expect(enemy.pos.x).toBe(100);
    enemy.update(player, room);
    expect(enemy.pos.x).toBeGreaterThan(100);
  });

  it("holds fire too", function () {
    const skeleton = createEnemy("Skeleton", 100, 192);
    placePlayerRightOf(skeleton, player, 100);
    skeleton.attackTimer = 0;
    skeleton.startWakeDelay(5);
    expect(tryAttackThroughWindup(skeleton, player, room)).toEqual([]);
    for (let i = 0; i < 5; i++) {
      skeleton.update(player, room);
    }
    expect(tryAttackThroughWindup(skeleton, player, room).length).toBe(1);
  });

  it("makes the enemy forget what it was doing and hunting", function () {
    const enemy = new Enemy(100, 192);
    enemy.type = meleeType();
    enemy.setState("windup", 10);
    enemy.alertTimer = 50;
    enemy.lastKnown = new p5.Vector(300, 300);
    enemy.recoverTimer = 9;
    enemy.startWakeDelay();
    expect(enemy.state).toBe("idle");
    expect(enemy.lastKnown).toBe(null);
    expect(enemy.alertTimer).toBe(0);
    expect(enemy.recoverTimer).toBe(0);
    expect(enemy.wakeTimer).toBe(ENEMY_WAKE_FRAMES);
  });

  it("leaves dead enemies alone", function () {
    const enemy = new Enemy(100, 192);
    enemy.takeDamage(enemy.maxHealth);
    enemy.startWakeDelay();
    expect(enemy.isWaking()).toBe(false);
  });

  it("covers every enemy in the room when the player walks in, each time", function () {
    const a = new Enemy(100, 100);
    const b = new Enemy(300, 100);
    room.enemies = [a, b];
    room.startEnemyDelay();
    expect(a.wakeTimer).toBe(ENEMY_WAKE_FRAMES);
    expect(b.wakeTimer).toBe(ENEMY_WAKE_FRAMES);
    for (let i = 0; i < ENEMY_WAKE_FRAMES; i++) {
      a.update(player, room);
    }
    expect(a.isWaking()).toBe(false);
    room.startEnemyDelay(20); // the player leaves and comes back
    expect(a.wakeTimer).toBe(20);
  });
});
