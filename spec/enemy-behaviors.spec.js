// Enemy behaviors: wandering, keeping distance, shooting, hops, melee, facing, tile walking and pits.
// Shared helpers (placePlayerRightOf, makeRng, tryAttackThroughWindup, wallWithGap...) live in helpers.js.

describe("Ghoul wandering (wanderChase)", function () {
  let room;
  let zombie;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 320, 320);
    zombie = createEnemy("Ghoul", 160, 160);
    player = new Player(288, 16); // about 190 px away, outside the Ghoul's 160 range
  });

  it("starts out of sight of the player", function () {
    expect(zombie.canSee(player)).toBe(false);
  });

  it("ambles at its wander speed in the direction it rolled", function () {
    zombie.rng = () => 0; // angle 0 is straight right
    zombie.update(player, room);
    expect(zombie.pos.x).toBeCloseTo(160 + ENEMY_TYPES.Ghoul.wanderSpeed, 5);
    expect(zombie.pos.y).toBeCloseTo(160, 5);
  });

  it("walks down when the roll is a quarter turn", function () {
    zombie.rng = () => 0.25;
    zombie.update(player, room);
    expect(zombie.pos.y).toBeCloseTo(160 + ENEMY_TYPES.Ghoul.wanderSpeed, 5);
  });

  it("keeps one direction for a while, then rolls a new one", function () {
    let rolls = 0;
    zombie.rng = function () {
      rolls++;
      return 0;
    };
    for (let i = 0; i < 100; i++) {
      zombie.update(player, room);
    }
    expect(rolls).toBe(1);
    for (let i = 0; i < ENEMY_WANDER_FRAMES; i++) {
      zombie.update(player, room);
    }
    expect(rolls).toBe(2);
  });

  it("picks a new direction right away when it hits a wall", function () {
    zombie.pos.set(16, 160); // touching the left wall
    const rolls = [0.5, 0]; // first left (blocked), then right
    let next = 0;
    zombie.rng = () => rolls[next++];
    zombie.update(player, room);
    expect(zombie.pos.x).toBe(16);
    zombie.update(player, room);
    expect(zombie.pos.x).toBeCloseTo(16 + ENEMY_TYPES.Ghoul.wanderSpeed, 5);
  });

  it("only ever walks in straight horizontal or vertical lines", function () {
    zombie.detectionRange = 0;
    zombie.rng = makeRng(3);
    for (let frame = 0; frame < 600; frame++) {
      const x = zombie.pos.x;
      const y = zombie.pos.y;
      zombie.update(player, room);
      expect(zombie.pos.x === x || zombie.pos.y === y).toBe(true);
    }
  });

  it("never leaves the room while wandering", function () {
    zombie.detectionRange = 0; // never sees the player, so this is wandering only
    zombie.rng = makeRng(7);
    for (let frame = 0; frame < 3000; frame++) {
      zombie.update(player, room);
      expect(room.collidesWithWall(zombie.getBounds())).toBe(false);
    }
  });

  it("speeds up to its sight speed while it can see the player", function () {
    zombie.faceDirection(1, 0);
    placePlayerRightOf(zombie, player, 100);
    zombie.update(player, room);
    expect(zombie.pos.x).toBeCloseTo(160 + ENEMY_TYPES.Ghoul.sightSpeed, 5);
  });

  it("is faster hunting than wandering, and faster again in sight", function () {
    expect(ENEMY_TYPES.Ghoul.wanderSpeed).toBeLessThan(ENEMY_TYPES.Ghoul.speed);
    expect(ENEMY_TYPES.Ghoul.speed).toBeLessThan(ENEMY_TYPES.Ghoul.sightSpeed);
  });

  it("slows back to its hunting speed when the player slips out of sight", function () {
    zombie.faceDirection(1, 0);
    placePlayerRightOf(zombie, player, 100);
    zombie.update(player, room); // sees the player, notes where they are
    player.pos.set(288, 16); // gone, far out of range
    const before = zombie.pos.x;
    zombie.update(player, room); // still hunting the last known spot
    expect(zombie.pos.x - before).toBeCloseTo(ENEMY_TYPES.Ghoul.speed, 5);
  });

  it("does not wander when dead", function () {
    zombie.takeDamage(zombie.maxHealth);
    zombie.update(player, room);
    expect(zombie.pos.x).toBe(160);
    expect(zombie.pos.y).toBe(160);
  });
});

describe("Skeleton keeping its distance (keepDistance)", function () {
  let room;
  let skeleton;
  let player;
  const keep = ENEMY_TYPES.Skeleton.keepRange;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 320);
    skeleton = createEnemy("Skeleton", 160, 160);
    player = new Player(0, 0);
  });

  it("walks toward a player who is far away but in range", function () {
    placePlayerRightOf(skeleton, player, keep + 100);
    skeleton.update(player, room);
    expect(skeleton.pos.x).toBeCloseTo(160 + skeleton.speed, 5);
  });

  it("backs away from a player who is too close", function () {
    placePlayerRightOf(skeleton, player, keep - 60);
    skeleton.update(player, room);
    expect(skeleton.pos.x).toBeCloseTo(160 - skeleton.speed, 5);
  });

  it("holds still at its preferred range", function () {
    placePlayerRightOf(skeleton, player, keep);
    skeleton.update(player, room);
    expect(skeleton.pos.x).toBe(160);
  });

  it("does nothing when the player is out of range", function () {
    placePlayerRightOf(skeleton, player, ENEMY_TYPES.Skeleton.detectionRange + 40);
    skeleton.update(player, room);
    expect(skeleton.pos.x).toBe(160);
  });

  it("stops against a wall when backing off instead of walking through it", function () {
    skeleton.pos.set(16, 160); // against the left wall, player on its right and close
    placePlayerRightOf(skeleton, player, 30);
    for (let i = 0; i < 20; i++) {
      skeleton.update(player, room);
    }
    expect(skeleton.pos.x).toBe(16);
    expect(room.collidesWithWall(skeleton.getBounds())).toBe(false);
  });
});

describe("Bat zigzag (erratic)", function () {
  let room;
  let bat;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 320);
    bat = createEnemy("Bat", 100, 150);
    player = new Player(0, 0);
    placePlayerRightOf(bat, player, 200);
  });

  it("moves at its speed each frame", function () {
    const before = bat.pos.copy();
    bat.update(player, room);
    expect(p5.Vector.dist(before, bat.pos)).toBeCloseTo(bat.speed, 5);
  });

  it("does not fly in a straight line to the player", function () {
    for (let i = 0; i < 40; i++) {
      bat.update(player, room);
    }
    expect(Math.abs(bat.pos.y - 150)).toBeGreaterThan(5);
  });

  it("is repeatable: two bats do the same thing", function () {
    const other = createEnemy("Bat", 100, 150);
    for (let i = 0; i < 60; i++) {
      bat.update(player, room);
      other.update(player, room);
    }
    expect(bat.pos.x).toBeCloseTo(other.pos.x, 5);
    expect(bat.pos.y).toBeCloseTo(other.pos.y, 5);
  });

  it("stays still when the player is out of range", function () {
    placePlayerRightOf(bat, player, ENEMY_TYPES.Bat.detectionRange + 50);
    bat.update(player, room);
    expect(bat.pos.x).toBe(100);
    expect(bat.pos.y).toBe(150);
  });

  it("is faster than the Jelly but slower than the player", function () {
    expect(ENEMY_TYPES.Bat.speed).toBeGreaterThan(ENEMY_TYPES.Jelly.speed);
    expect(ENEMY_TYPES.Bat.speed).toBeLessThan(player.speed);
  });
});

describe("Shooting (shoot attack)", function () {
  let skeleton;
  let player;

  beforeEach(function () {
    skeleton = createEnemy("Skeleton", 100, 100);
    player = new Player(0, 0);
    skeleton.attackTimer = 0;
  });

  it("aims at the player: right", function () {
    placePlayerRightOf(skeleton, player, 100);
    const shot = tryAttackThroughWindup(skeleton, player)[0];
    expect(shot.vel.x).toBeGreaterThan(0);
    expect(shot.vel.y).toBeCloseTo(0, 5);
  });

  it("aims at the player: down", function () {
    const center = skeleton.getCenter();
    player.pos.set(center.x - 8, center.y + 100 - 8);
    const shot = tryAttackThroughWindup(skeleton, player)[0];
    expect(shot.vel.y).toBeGreaterThan(0);
    expect(shot.vel.x).toBeCloseTo(0, 5);
  });

  it("uses the attack's damage, speed and color", function () {
    placePlayerRightOf(skeleton, player, 100);
    const attack = ENEMY_TYPES.Skeleton.attack;
    const shot = tryAttackThroughWindup(skeleton, player)[0];
    expect(shot.damage).toBe(attack.damage);
    expect(shot.vel.mag()).toBeCloseTo(attack.speed, 5);
    expect(shot.color).toEqual(attack.color);
  });

  it("starts from the middle of the enemy", function () {
    placePlayerRightOf(skeleton, player, 100);
    const shot = tryAttackThroughWindup(skeleton, player)[0];
    const center = skeleton.getCenter();
    expect(shot.pos.x + shot.length / 2).toBeCloseTo(center.x, 5);
    expect(shot.pos.y + shot.width / 2).toBeCloseTo(center.y, 5);
  });

  it("waits for the cooldown and counts it down with update", function () {
    skeleton.attackTimer = ENEMY_TYPES.Skeleton.attack.cooldown;
    const room = new NormalRoom(0, 0, 640, 320);
    placePlayerRightOf(skeleton, player, ENEMY_TYPES.Skeleton.keepRange);
    for (let i = 0; i < ENEMY_TYPES.Skeleton.attack.cooldown - 1; i++) {
      skeleton.update(player, room);
      expect(skeleton.tryAttack(player)).toEqual([]);
    }
    skeleton.update(player, room);
    expect(tryAttackThroughWindup(skeleton, player).length).toBe(1);
  });

  it("does not fire or lose its charge when the player is out of range", function () {
    placePlayerRightOf(skeleton, player, ENEMY_TYPES.Skeleton.detectionRange + 40);
    expect(skeleton.tryAttack(player)).toEqual([]);
    expect(skeleton.attackTimer).toBe(0);
  });

  it("fires the moment the player comes into range", function () {
    placePlayerRightOf(skeleton, player, ENEMY_TYPES.Skeleton.detectionRange + 40);
    skeleton.tryAttack(player);
    placePlayerRightOf(skeleton, player, 100);
    expect(tryAttackThroughWindup(skeleton, player).length).toBe(1);
  });

  it("does not aim when the player is exactly on top of it", function () {
    player.pos.set(skeleton.getCenter().x - 8, skeleton.getCenter().y - 8);
    expect(skeleton.tryAttack(player)).toEqual([]);
  });

  it("fires nothing for enemies without an attack", function () {
    const jelly = createEnemy("Jelly", 100, 100);
    placePlayerRightOf(jelly, player, 50);
    expect(jelly.tryAttack(player)).toEqual([]);
  });

  it("fires a fan for count above 1, spread degrees apart", function () {
    const eye = createEnemy("PeeperJr", 100, 100);
    eye.attackTimer = 0;
    placePlayerRightOf(eye, player, 120);
    const shots = tryAttackThroughWindup(eye, player);
    const spread = (ENEMY_TYPES.PeeperJr.attack.spread * Math.PI) / 180;
    expect(shots.length).toBe(3);
    const angles = shots.map((s) => s.vel.heading());
    expect(angles[0]).toBeCloseTo(-spread, 5);
    expect(angles[1]).toBeCloseTo(0, 5);
    expect(angles[2]).toBeCloseTo(spread, 5);
  });

  it("does not change the type table when it fires", function () {
    placePlayerRightOf(skeleton, player, 100);
    const before = JSON.stringify(ENEMY_TYPES.Skeleton);
    skeleton.tryAttack(player);
    expect(JSON.stringify(ENEMY_TYPES.Skeleton)).toBe(before);
  });
});

describe("PeeperJr turret (none)", function () {
  it("never moves but still shoots", function () {
    const room = new NormalRoom(0, 0, 640, 320);
    const eye = createEnemy("PeeperJr", 100, 100);
    const player = new Player(0, 0);
    placePlayerRightOf(eye, player, 150);
    for (let i = 0; i < ENEMY_TYPES.PeeperJr.attack.cooldown; i++) {
      eye.update(player, room);
    }
    expect(eye.pos.x).toBe(100);
    expect(eye.pos.y).toBe(100);
    expect(tryAttackThroughWindup(eye, player).length).toBe(3);
  });
});


// Enemy state and timer, the hop move, the melee attack, and the table checks for them.
// Uses placePlayerRightOf from enemy.spec.js.
describe("Enemy state", function () {
  const room = new NormalRoom(0, 0, 640, 400);

  it("starts idle with no time left", function () {
    const enemy = new Enemy(100, 100);
    expect(enemy.state).toBe("idle");
    expect(enemy.stateTimer).toBe(0);
  });

  it("setState sets the name and the frames", function () {
    const enemy = new Enemy(100, 100);
    enemy.setState("windup", 3);
    expect(enemy.state).toBe("windup");
    expect(enemy.stateTimer).toBe(3);
  });

  it("counts the timer down each update and stops at zero", function () {
    const enemy = new Enemy(100, 100);
    const player = new Player(600, 350); // out of sight
    enemy.setState("recover", 2);
    enemy.update(player, room);
    expect(enemy.stateTimer).toBe(1);
    enemy.update(player, room);
    enemy.update(player, room);
    expect(enemy.stateTimer).toBe(0);
  });
});

describe("Hop move", function () {
  // A local hop type, so these specs do not depend on which rows use hop.
  let room;
  let enemy;
  let player;

  // Runs one update and says whether the enemy moved.
  function stepMoved() {
    const before = enemy.pos.copy();
    enemy.update(player, room);
    return p5.Vector.dist(before, enemy.pos) > 0;
  }

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    enemy = new Enemy(100, 100);
    enemy.type = { ...ENEMY_TYPES.Jelly, move: "hop", hopRest: 40, hopFrames: 14, hopSpeed: 2.2 };
    enemy.rng = makeRng(7);
    player = new Player(0, 0);
    placePlayerRightOf(enemy, player, 150);
  });

  it("dashes for hopFrames, rests for hopRest, then dashes again", function () {
    const type = enemy.type;
    for (let i = 0; i < type.hopFrames; i++) {
      expect(stepMoved()).withContext("dash frame " + i).toBe(true);
    }
    for (let i = 0; i < type.hopRest; i++) {
      expect(stepMoved()).withContext("rest frame " + i).toBe(false);
      expect(enemy.state).toBe("idle");
    }
    expect(stepMoved()).toBe(true);
    expect(enemy.state).toBe("hop");
  });

  it("dashes toward the player at hopSpeed", function () {
    const start = enemy.pos.copy();
    for (let i = 0; i < enemy.type.hopFrames; i++) {
      enemy.update(player, room);
    }
    const expected = enemy.type.hopFrames * enemy.type.hopSpeed;
    expect(enemy.pos.x - start.x).toBeCloseTo(expected, 3);
    expect(enemy.pos.y).toBeCloseTo(start.y, 3);
  });

  it("keeps the direction it locked even if the player moves mid-dash", function () {
    enemy.update(player, room);
    player.pos.set(player.pos.x, player.pos.y + 200);
    const before = enemy.pos.copy();
    enemy.update(player, room);
    expect(enemy.pos.y).toBeCloseTo(before.y, 3);
    expect(enemy.pos.x).toBeGreaterThan(before.x);
  });

  it("does not hop when it cannot see the player", function () {
    placePlayerRightOf(enemy, player, enemy.detectionRange + 50);
    for (let i = 0; i < 100; i++) {
      expect(stepMoved()).toBe(false);
    }
    expect(enemy.state).toBe("idle");
  });

  it("is stopped by a wall", function () {
    const small = new NormalRoom(0, 0, 320, 160); // floor spans 16 to 304
    enemy.pos.set(280, 60);
    player.pos.set(300, 60);
    for (let i = 0; i < enemy.type.hopFrames; i++) {
      enemy.update(player, small);
    }
    expect(enemy.pos.x).toBeLessThanOrEqual(304 - enemy.length);
    expect(small.collidesWithWall(enemy.getBounds())).toBe(false);
  });
});

describe("Melee attack and bounce", function () {
  let room;
  let enemy;
  let player;
  const swingType = SWING_TYPE;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    enemy = new Enemy(100, 100);
    enemy.type = swingType;
    enemy.rng = makeRng(3);
    player = new Player(0, 0);
  });

  it("winds up when the player is in reach, with no damage until the attack", function () {
    placePlayerRightOf(enemy, player, 20);
    const before = player.health;
    const start = enemy.pos.copy();
    enemy.update(player, room);
    expect(enemy.state).toBe("windup");
    for (let i = 0; i < swingType.attack.windup - 2; i++) {
      expect(enemy.meleeHit(player)).toBe(false);
      enemy.update(player, room);
      expect(enemy.state).toBe("windup");
    }
    expect(player.health).toBe(before);
    expect(enemy.pos.x).toBe(start.x);
    expect(enemy.pos.y).toBe(start.y);
  });

  it("hits once in the attack state, then recovers and goes back to bouncing", function () {
    placePlayerRightOf(enemy, player, 20);
    const before = player.health;
    let hits = 0;
    for (let frame = 0; frame < 120; frame++) {
      enemy.update(player, room);
      if (enemy.meleeHit(player)) {
        hits++;
        expect(enemy.state).toBe("attack"); // the sword stays out after the hit
      }
      if (hits > 0 && enemy.state === "bounce") {
        break; // the swing is over, before the next one starts
      }
    }
    expect(hits).toBe(1);
    expect(enemy.state).toBe("bounce");
    expect(player.health).toBe(before - swingType.attack.damage);
    expect(enemy.tryAttack(player)).toEqual([]);
  });

  it("bounces toward the player instead of winding up when the player is out of reach", function () {
    placePlayerRightOf(enemy, player, 100);
    enemy.update(player, room);
    expect(enemy.state).toBe("bounce");
    expect(enemy.pos.x).toBeGreaterThan(100);
  });

  it("does not hit a player out of reach", function () {
    placePlayerRightOf(enemy, player, 80);
    enemy.setState("attack", 5);
    expect(enemy.meleeHit(player)).toBe(false);
  });

  it("only hits in the facing direction", function () {
    placePlayerRightOf(enemy, player, 20);
    enemy.facingDir = "left";
    enemy.setState("attack", 5);
    expect(enemy.meleeHit(player)).toBe(false);
    enemy.facingDir = "right";
    expect(enemy.meleeHit(player)).toBe(true);
  });

  it("swings up and down too, matching the four way art", function () {
    const reach = enemy.getAttack().reach;
    const c = enemy.getCenter();
    const above = new Player(c.x - player.length / 2, c.y - reach + 2 - player.width / 2);
    const below = new Player(c.x - player.length / 2, c.y + reach - 2 - player.width / 2);
    enemy.setState("attack", 5);
    enemy.facingDir = "up";
    expect(enemy.meleeHit(below)).toBe(false);
    expect(enemy.meleeHit(above)).toBe(true);
    enemy.damageCooldown = 0;
    enemy.swingHit = false;
    enemy.facingDir = "down";
    expect(enemy.meleeHit(above)).toBe(false);
    expect(enemy.meleeHit(below)).toBe(true);
  });

  it("does not hit outside the attack state", function () {
    placePlayerRightOf(enemy, player, 20);
    for (const name of ["idle", "windup", "recover"]) {
      enemy.setState(name, 5);
      expect(enemy.meleeHit(player)).toBe(false);
    }
  });

  it("respects the damage cooldown", function () {
    placePlayerRightOf(enemy, player, 20);
    enemy.setState("attack", 5);
    enemy.damageCooldown = 3;
    expect(enemy.meleeHit(player)).toBe(false);
    enemy.damageCooldown = 0;
    expect(enemy.meleeHit(player)).toBe(true);
    expect(enemy.damageCooldown).toBe(ENEMY_DAMAGE_COOLDOWN);
  });

  it("does nothing for enemies with a shoot attack or none", function () {
    const skeleton = createEnemy("Skeleton", 100, 100);
    skeleton.setState("attack", 5);
    placePlayerRightOf(skeleton, player, 10);
    expect(skeleton.meleeHit(player)).toBe(false);
    expect(new Enemy(100, 100).meleeHit(player)).toBe(false);
  });
});

describe("validateEnemyTypes for hop, bounce and melee", function () {
  const melee = { kind: "melee", cooldown: 60, damage: 1, reach: 26, windup: 20, recover: 24 };

  function tableWith(changes) {
    return { Test: { ...ENEMY_TYPES.Jelly, ...changes } };
  }

  function swinger(changes) {
    return tableWith({ move: "bounce", speed: 1, attack: melee, ...changes });
  }

  const hop = { move: "hop", hopRest: 40, hopFrames: 14, hopSpeed: 2.2 };

  it("accepts the current table, a hop type and a bounce type", function () {
    expect(validateEnemyTypes()).toEqual([]);
    expect(validateEnemyTypes(tableWith(hop))).toEqual([]);
    expect(validateEnemyTypes(swinger({}))).toEqual([]);
  });

  it("rejects a hop type missing hopSpeed", function () {
    const problems = validateEnemyTypes(tableWith({ ...hop, hopSpeed: undefined }));
    expect(problems).toEqual(["Test: hop needs hopSpeed above 0"]);
  });

  it("rejects a bounce without a melee attack", function () {
    expect(validateEnemyTypes(swinger({ attack: null }))).toEqual([
      "Test: bounce needs a melee attack"
    ]);
    const shoot = { kind: "shoot", cooldown: 50, damage: 1, speed: 2, color: [1, 2, 3] };
    expect(validateEnemyTypes(swinger({ attack: shoot }))).toEqual([
      "Test: bounce needs a melee attack"
    ]);
  });

  it("rejects a bounce with no speed", function () {
    expect(validateEnemyTypes(swinger({ speed: 0 }))).toEqual(["Test: bounce needs speed above 0"]);
  });

  it("rejects a melee attack missing reach", function () {
    const problems = validateEnemyTypes(swinger({ attack: { ...melee, reach: undefined } }));
    expect(problems).toEqual(["Test: attack.reach must be a number above 0"]);
  });

  it("still requires speed and color for a shoot attack", function () {
    const shoot = { kind: "shoot", cooldown: 50, damage: 1 };
    expect(validateEnemyTypes(tableWith({ attack: shoot })).length).toBe(2);
  });

  it("checks sprite frame sizes and state frames", function () {
    const frame = { sheet: "a.png", x: 0, y: 0 };
    const sprite = { frameTime: 5, frames: [frame] };
    const types = tableWith({});
    const artWith = (changes) => ({ Test: { sprite: { ...sprite, ...changes } } });
    expect(validateEnemyArt(artWith({ frames: [{ ...frame, w: 32 }] }), types)).toEqual([]);
    expect(validateEnemyArt(artWith({ frames: [{ ...frame, w: 0 }] }), types))
      .toEqual(["Test: sprite frame w must be at least 1"]);
    expect(validateEnemyArt(artWith({ states: { windup: [frame] } }), types)).toEqual([]);
    expect(validateEnemyArt(artWith({ states: { attack: [] } }), types))
      .toEqual(["Test: sprite.states.attack must be a non-empty list"]);
  });
});

// The melee version of the contract checks in enemy-contract.spec.js.
describe("Every melee enemy type", function () {
  for (const name of ENEMY_TYPE_NAMES) {
    const type = ENEMY_TYPES[name];
    if (!type.attack || type.attack.kind !== "melee") {
      continue;
    }
    describe(name, function () {
      it("has reach, windup and recover above 0", function () {
        expect(type.attack.reach).toBeGreaterThan(0);
        expect(type.attack.windup).toBeGreaterThan(0);
        expect(type.attack.recover).toBeGreaterThan(0);
      });

      it("hurts a player in reach exactly once per swing", function () {
        const enemy = createEnemy(name, 100, 100);
        const player = new Player(0, 0);
        const center = enemy.getCenter();
        player.pos.set(center.x + 4, center.y - player.width / 2);
        const before = player.health;
        enemy.setState("attack", ENEMY_SWING_FRAMES);
        expect(enemy.meleeHit(player)).toBe(true);
        expect(enemy.meleeHit(player)).toBe(false);
        expect(player.health).toBe(before - type.attack.damage);
      });
    });
  }
});


// Which way an enemy faces, the swing staying visible after a hit, and picking art by direction.
// Uses placePlayerRightOf from enemy.spec.js.
describe("Enemy facing", function () {
  let room;
  let enemy;
  let player;

  // Puts the player dx and dy pixels from the enemy center, then updates once.
  function lookAt(dx, dy) {
    const center = enemy.getCenter();
    player.pos.set(center.x + dx - player.length / 2, center.y + dy - player.width / 2);
    enemy.update(player, room);
  }

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    enemy = new Enemy(300, 200, "PeeperJr"); // stands still
    player = new Player(0, 0);
  });

  it("starts facing down", function () {
    expect(enemy.facingDir).toBe("down");
  });

  it("picks the dominant axis", function () {
    lookAt(60, 20);
    expect(enemy.facingDir).toBe("right");
    lookAt(-60, 20);
    expect(enemy.facingDir).toBe("left");
    lookAt(20, 60);
    expect(enemy.facingDir).toBe("down");
    lookAt(20, -60);
    expect(enemy.facingDir).toBe("up");
  });

  it("gives a tie to left or right", function () {
    lookAt(40, 40);
    expect(enemy.facingDir).toBe("right");
    lookAt(-40, -40);
    expect(enemy.facingDir).toBe("left");
  });

  it("sets facingAngle from the vector to the player", function () {
    lookAt(0, 50);
    expect(enemy.facingAngle).toBeCloseTo(Math.PI / 2, 5);
    lookAt(-50, 0);
    expect(Math.abs(enemy.facingAngle)).toBeCloseTo(Math.PI, 5);
    lookAt(50, 0);
    expect(enemy.facingAngle).toBeCloseTo(0, 5);
  });

  it("keeps the old facing while the player is out of range", function () {
    lookAt(-60, 0);
    lookAt(enemy.detectionRange + 100, 0);
    expect(enemy.facingDir).toBe("left");
    expect(enemy.facingLeft).toBe(true);
  });
});

describe("Melee swing", function () {
  let room;
  let enemy;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    enemy = new Enemy(100, 100);
    enemy.type = SWING_TYPE;
    player = new Player(0, 0);
    placePlayerRightOf(enemy, player, 20);
  });

  it("hits once per swing and again on the next swing", function () {
    let hits = 0;
    let swings = 0;
    let wasSwinging = false;
    for (let frame = 0; frame < 150; frame++) {
      enemy.update(player, room);
      if (enemy.state === "attack" && !wasSwinging) {
        swings++;
      }
      wasSwinging = enemy.state === "attack";
      if (enemy.meleeHit(player)) {
        hits++;
      }
      player.health = 99; // so the player stays alive and in reach
    }
    expect(swings).toBeGreaterThan(1);
    expect(hits).toBe(swings);
  });

  it("keeps the attack state after a hit, then recovers, then goes back to bouncing", function () {
    let sawAttackAfterHit = false;
    let hitFrame = -1;
    for (let frame = 0; frame < 120; frame++) {
      enemy.update(player, room);
      if (hitFrame < 0 && enemy.meleeHit(player)) {
        hitFrame = frame;
      }
      if (hitFrame >= 0 && frame === hitFrame + 3) {
        sawAttackAfterHit = enemy.state === "attack";
      }
      if (hitFrame >= 0 && frame === hitFrame + ENEMY_HIT_PAUSE_FRAMES + 2) {
        expect(enemy.state).toBe("recover"); // not stuck once the hit pause ends
      }
      if (hitFrame >= 0 && frame === hitFrame + ENEMY_HIT_PAUSE_FRAMES + 12) {
        expect(enemy.state).toBe("bounce");
        break;
      }
    }
    expect(hitFrame).toBeGreaterThan(0);
    expect(sawAttackAfterHit).toBe(true);
  });
});

describe("Choosing sprite frames", function () {
  const SHEET_SIZES = {
    "assets/enemy/Bouncer.png": { w: 149, h: 288 },
    "assets/enemy/Spark Bark.png": { w: 128, h: 80 }
  };

  it("maps angles to the 8 aim frames", function () {
    const degrees = { 90: 0, 135: 1, 180: 2, "-135": 3, "-90": 4, "-45": 5, 0: 6, 45: 7 };
    for (const key of Object.keys(degrees)) {
      const angle = (Number(key) * Math.PI) / 180;
      expect(aimFrameIndex(angle, 8)).withContext(key + " degrees").toBe(degrees[key]);
    }
  });

  it("keeps the aim frame inside the list for any angle", function () {
    for (let angle = -7; angle <= 7; angle += 0.37) {
      const index = aimFrameIndex(angle, 8);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(8);
    }
  });

  it("shows the Spark Bark aim frame for where the player is", function () {
    const bark = new Enemy(0, 0, "SparkBark");
    const sprite = ENEMY_ART.SparkBark.sprite;
    bark.facingAngle = Math.PI / 2;
    expect(enemySpriteFrame(bark, sprite, 0)).toBe(sprite.aimFrames[0]);
    bark.facingAngle = -Math.PI / 2;
    expect(enemySpriteFrame(bark, sprite, 999)).toBe(sprite.aimFrames[4]);
  });

  it("shows the Bouncer art for its direction and state", function () {
    const bouncer = new Enemy(0, 0, "Bouncer");
    const sprite = ENEMY_ART.Bouncer.sprite;
    const left = sprite.directions.left;
    bouncer.facingDir = "left";
    expect(enemySpriteFrame(bouncer, sprite, 0)).toBe(left.hop[0]);
    bouncer.setState("windup", 5);
    expect(enemySpriteFrame(bouncer, sprite, 50)).toBe(left.hop[0]);
    bouncer.setState("hop", 5);
    expect(enemySpriteFrame(bouncer, sprite, 0)).toBe(left.hop[0]);
    expect(enemySpriteFrame(bouncer, sprite, sprite.frameTime)).toBe(left.hop[1]);
    bouncer.setState("attack", 5);
    expect(enemySpriteFrame(bouncer, sprite, 0)).toBe(left.attack[0]);
  });

  it("keeps every direction, aim and fallback frame inside its sheet", function () {
    for (const name of ["Bouncer", "SparkBark"]) {
      for (const frame of allSpriteFrames(ENEMY_ART[name].sprite)) {
        const size = SHEET_SIZES[frame.sheet];
        expect(size).withContext(frame.sheet).toBeDefined();
        expect(frame.x + (frame.w || ENEMY_SPRITE_SIZE)).toBeLessThanOrEqual(size.w);
        expect(frame.y + (frame.h || ENEMY_SPRITE_SIZE)).toBeLessThanOrEqual(size.h);
      }
    }
  });

  it("validates directions and aimFrames", function () {
    const frame = { sheet: "a.png", x: 0, y: 0 };
    const set = { hop: [frame], attack: [frame] };
    const dirs = { down: set, up: set, left: set, right: set };
    const types = { Test: { ...ENEMY_TYPES.Jelly } };
    const withSprite = (extra) => ({
      Test: { sprite: { frameTime: 5, frames: [frame], ...extra } }
    });
    expect(validateEnemyArt(withSprite({ directions: dirs, aimFrames: [frame] }), types)).toEqual([]);
    const missing = { ...dirs, up: { hop: [frame], attack: [] } };
    expect(validateEnemyArt(withSprite({ directions: missing }), types)).toEqual([
      "Test: sprite.directions.up.attack must be a non-empty list"
    ]);
    expect(validateEnemyArt(withSprite({ aimFrames: [] }), types)).toEqual([
      "Test: sprite.aimFrames must be a non-empty list"
    ]);
  });
});


describe("Tile routes (Room.findTilePath)", function () {
  let room;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
  });

  it("runs straight along an open row", function () {
    const path = room.findTilePath(3, 5, 1, 1, 8 * 16 + 8, 5 * 16 + 8);
    expect(path.length).toBe(5);
    expect(path.every((step) => step.row === 5 && step.horizontal)).toBe(true);
  });

  it("is empty when the start already covers the goal", function () {
    expect(room.findTilePath(8, 5, 1, 1, 8 * 16 + 8, 5 * 16 + 8)).toEqual([]);
  });

  it("goes around a wall through the gap, one whole tile at a time", function () {
    wallWithGap(room, [12]);
    const goalX = 30 * 16 + 8;
    const goalY = 5 * 16 + 8;
    const path = room.findTilePath(10, 5, 1, 1, goalX, goalY);
    expect(path).not.toBe(null);
    expect(path.some((step) => step.col === 20 && step.row === 12)).toBe(true);
    let prev = { col: 10, row: 5 };
    for (const step of path) {
      const moved = Math.abs(step.col - prev.col) + Math.abs(step.row - prev.row);
      expect(moved).toBe(1); // never a diagonal, never a jump
      expect(room.canStandAt(step.col, step.row)).toBe(true);
      prev = step;
    }
    expect(prev.col).toBe(30);
    expect(prev.row).toBe(5);
  });

  it("returns null when a wall seals the goal off", function () {
    wallWithGap(room, []);
    expect(room.findTilePath(10, 5, 1, 1, 30 * 16 + 8, 5 * 16 + 8)).toBe(null);
  });

  it("will not fit a two tile enemy through a one tile gap", function () {
    wallWithGap(room, [12]);
    expect(room.findTilePath(10, 4, 2, 2, 30 * 16 + 8, 5 * 16 + 8)).toBe(null);
    room = new NormalRoom(0, 0, 640, 400);
    wallWithGap(room, [12, 13]);
    expect(room.findTilePath(10, 4, 2, 2, 30 * 16 + 8, 5 * 16 + 8)).not.toBe(null);
  });
});

describe("Walking the tiles", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(480, 80);
  });

  function walker(name, x, y) {
    const enemy = createEnemy(name, x, y);
    enemy.spawnTimer = 0;
    enemy.detectionRange = 1000;
    enemy.speed = 1;
    enemy.type = { ...enemy.type, move: "chase", speed: 1, phases: undefined, vision: undefined };
    return enemy;
  }

  it("settles onto a row or column of the grid and stays on one", function () {
    const enemy = walker("Ghoul", 100, 70);
    player.pos.set(400, 300);
    for (let frame = 0; frame < 400; frame++) {
      enemy.update(player, room);
      if (frame > 20) {
        expect(onTheGrid(enemy.pos.x) || onTheGrid(enemy.pos.y)).toBe(true);
      }
    }
  });

  it("goes around a wall through the gap and reaches the player", function () {
    wallWithGap(room, [12]);
    const enemy = walker("Ghoul", 96, 80);
    enemy.speed = 2;
    enemy.type = { ...enemy.type, speed: 2 };
    for (let frame = 0; frame < 700; frame++) {
      enemy.update(player, room);
      expect(room.collidesWithWall(enemy.getBounds())).toBe(false);
    }
    expect(rectsOverlap(enemy.getBounds(), player.getBounds())).toBe(true);
  });

  it("takes a two tile chaser through a gap it fits", function () {
    wallWithGap(room, [12, 13]);
    const demon = createEnemy("DemonKnight", 96, 80);
    demon.spawnTimer = 0;
    demon.length = 32; // a boss shrunk to two tiles, the width of the gap
    demon.width = 32;
    demon.speed = 2;
    demon.type = { ...demon.type, length: 32, width: 32, speed: 2, phases: undefined };
    for (let frame = 0; frame < 900; frame++) {
      demon.update(player, room);
      expect(room.collidesWithWall(demon.getBounds())).toBe(false);
    }
    expect(rectsOverlap(demon.getBounds(), player.getBounds())).toBe(true);
  });

  it("notices a player through a wall, but cannot see them", function () {
    wallWithGap(room, [12]);
    const skeleton = createEnemy("Skeleton", 256, 96); // row 6, well away from the gap in row 12
    player.pos.set(352, 96);
    expect(skeleton.isAware(player, room)).toBe(true);
    expect(skeleton.canSee(player, room)).toBe(false);
  });
});

describe("Hoppers ignore walls", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    wallWithGap(room, []); // a solid wall down column 20
    player = new Player(352, 192); // right behind it
  });

  for (const name of ["Jelly", "Bouncer"]) {
    it(`lets the ${name} see and hop at a player behind a wall, with no way round`, function () {
      const enemy = createEnemy(name, 272, 192);
      enemy.spawnTimer = 0;
      expect(enemy.canSee(player, room)).toBe(true);
      const start = enemy.pos.x;
      for (let frame = 0; frame < 200; frame++) {
        enemy.update(player, room);
        expect(room.collidesWithWall(enemy.getBounds())).toBe(false);
      }
      expect(enemy.pos.x).toBeGreaterThan(start + 10); // it hopped at the wall
      expect(enemy.pos.x).toBeLessThanOrEqual(320 - enemy.length); // and stopped against it
    });
  }

  it("does not give a walker that sight", function () {
    const zombie = createEnemy("Ghoul", 272, 192);
    expect(zombie.canSee(player, room)).toBe(false);
  });
});

describe("Skeleton stopping for a shot", function () {
  let room;
  let skeleton;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    skeleton = createEnemy("Skeleton", 320, 192);
    skeleton.spawnTimer = 0;
    player = new Player(0, 0);
  });

  it("stands still through the whole windup, then moves on after firing", function () {
    placePlayerRightOf(skeleton, player, ENEMY_TYPES.Skeleton.keepRange + 100); // it wants to approach
    skeleton.attackTimer = 0;
    expect(skeleton.tryAttack(player, room)).toEqual([]);
    expect(skeleton.state).toBe("windup");
    const planted = skeleton.pos.copy();
    for (let i = 0; i < ENEMY_TYPES.Skeleton.attack.windup - 1; i++) {
      skeleton.update(player, room);
      expect(skeleton.pos.x).toBe(planted.x);
      expect(skeleton.pos.y).toBe(planted.y);
    }
    skeleton.stateTimer = 0;
    expect(skeleton.tryAttack(player, room).length).toBe(1);
    skeleton.update(player, room);
    expect(skeleton.pos.x).toBeGreaterThan(planted.x); // walking again
  });

  it("faces the player while it stands there", function () {
    placePlayerRightOf(skeleton, player, -(ENEMY_TYPES.Skeleton.keepRange + 100)); // player on its left
    skeleton.attackTimer = 0;
    skeleton.tryAttack(player, room);
    skeleton.update(player, room);
    expect(skeleton.facingLeft).toBe(true);
    placePlayerRightOf(skeleton, player, ENEMY_TYPES.Skeleton.keepRange + 100); // now on its right
    skeleton.update(player, room);
    expect(skeleton.facingLeft).toBe(false);
  });

  it("does not freeze a hopper in its windup", function () {
    const bouncer = createEnemy("Bouncer", 320, 192);
    bouncer.spawnTimer = 0;
    placePlayerRightOf(bouncer, player, 10);
    let swung = false;
    for (let i = 0; i < 120; i++) {
      bouncer.update(player, room);
      swung = swung || bouncer.state === "attack";
      expect(bouncer.isPlanted()).toBe(false);
    }
    expect(swung).toBe(true); // its windup ran on into the swing
  });
});

describe("Ghoul sight speed", function () {
  let room;
  let zombie;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    zombie = createEnemy("Ghoul", 256, 96);
    zombie.spawnTimer = 0;
    player = new Player(0, 0);
  });

  it("is quicker while it sees the player than while running to where it saw them", function () {
    zombie.faceDirection(1, 0);
    placePlayerRightOf(zombie, player, 60); // ahead in its row, clear floor between
    const sight = zombie.pos.copy();
    zombie.update(player, room);
    const fast = p5.Vector.dist(sight, zombie.pos);

    player.pos.set(zombie.pos.x + 60, zombie.pos.y - 48); // steps out of the row
    const hidden = zombie.pos.copy();
    zombie.update(player, room); // runs on toward the spot it saw them
    const slow = p5.Vector.dist(hidden, zombie.pos);

    expect(fast).toBeCloseTo(ENEMY_TYPES.Ghoul.sightSpeed, 5);
    expect(slow).toBeCloseTo(ENEMY_TYPES.Ghoul.speed, 5);
    expect(fast).toBeGreaterThan(slow);
  });

  it("needs a sight speed that is at least its speed", function () {
    expect(validateEnemyTypes({ Ghoul: ENEMY_TYPES.Ghoul })).toEqual([]);
    const bad = { ...ENEMY_TYPES.Ghoul, sightSpeed: ENEMY_TYPES.Ghoul.speed / 2 };
    expect(validateEnemyTypes({ Ghoul: bad }).length).toBeGreaterThan(0);
  });
});

describe("Ghoul line vision", function () {
  let room;
  let zombie;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    zombie = createEnemy("Ghoul", 96, 96); // on the grid, row 6
    zombie.spawnTimer = 0;
    zombie.rng = () => 0; // when it ambles, it ambles right
    player = new Player(0, 0);
  });

  it("sees the player in the row it faces, ahead of it", function () {
    zombie.faceDirection(1, 0);
    player.pos.set(176, 96);
    expect(zombie.canSee(player, room)).toBe(true);
  });

  it("does not see a player behind it, a row away, or beyond its range", function () {
    zombie.faceDirection(1, 0);
    player.pos.set(48, 96); // behind
    expect(zombie.canSee(player, room)).toBe(false);
    player.pos.set(176, 112); // the next row down
    expect(zombie.canSee(player, room)).toBe(false);
    player.pos.set(96 + ENEMY_TYPES.Ghoul.detectionRange + 40, 96); // too far
    expect(zombie.canSee(player, room)).toBe(false);
  });

  it("sees up and down a column too", function () {
    zombie.faceDirection(0, 1);
    player.pos.set(96, 176);
    expect(zombie.canSee(player, room)).toBe(true);
    player.pos.set(112, 176); // the next column over
    expect(zombie.canSee(player, room)).toBe(false);
  });

  it("does not see through a wall", function () {
    room.setTile(8, 6, TILE.INTERIOR_WALL);
    zombie.faceDirection(1, 0);
    player.pos.set(176, 96);
    expect(zombie.canSee(player, room)).toBe(false);
  });

  it("does not turn to face a player standing beside it", function () {
    zombie.rng = () => 0.25; // it ambles down, the way it already faces
    zombie.faceDirection(0, 1);
    player.pos.set(176, 96); // in its row, but it is facing down
    zombie.update(player, room);
    expect(zombie.facingDir).toBe("down");
    expect(zombie.lastKnown).toBe(null); // and it never noticed them
  });

  it("faces the way it ambles", function () {
    zombie.rng = () => 0.25; // down
    zombie.update(player, room);
    expect(zombie.facingDir).toBe("down");
  });

  it("runs to the spot where it saw the player, even after they step away, then stumbles again", function () {
    zombie.faceDirection(1, 0);
    player.pos.set(176, 96);
    zombie.update(player, room); // spots them
    expect(zombie.lastKnown).not.toBe(null);
    player.pos.set(176, 224); // out of the row, out of sight
    for (let frame = 0; frame < 200 && zombie.lastKnown; frame++) {
      zombie.update(player, room);
    }
    expect(zombie.lastKnown).toBe(null); // it got there
    expect(Math.abs(zombie.pos.x - 176)).toBeLessThanOrEqual(8); // on the tile where it saw them
    expect(zombie.pos.x).toBeGreaterThan(160); // having run a long way from where it started
    const there = zombie.pos.copy();
    zombie.update(player, room);
    expect(p5.Vector.dist(there, zombie.pos)).toBeCloseTo(ENEMY_TYPES.Ghoul.wanderSpeed, 5); // stumbling
  });

  it("follows a player who stays in the row", function () {
    zombie.faceDirection(1, 0);
    player.pos.set(200, 96);
    zombie.update(player, room);
    player.pos.set(240, 96);
    zombie.update(player, room);
    expect(zombie.lastKnown.x).toBeCloseTo(248, 5); // the newest spot
  });

  it("stops hunting a spot it cannot reach", function () {
    zombie.faceDirection(1, 0);
    player.pos.set(176, 96);
    zombie.update(player, room);
    for (let row = 1; row < room.rows - 1; row++) {
      room.setTile(11, row, TILE.INTERIOR_WALL); // seal the spot off
    }
    player.pos.set(176, 224);
    for (let frame = 0; frame < 60; frame++) {
      zombie.update(player, room);
    }
    expect(zombie.alertTimer).toBe(0);
  });
});

describe("Enemies and pits", function () {
  let room;
  let player;

  const makeEnemy = (typeName, x, y) => {
    const enemy = new Enemy(x, y, typeName);
    enemy.spawnTimer = 0;
    enemy.wakeTimer = 0;
    return enemy;
  };

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    room.setTile(10, 5, TILE.PIT); // pixels x 160 to 175, y 80 to 95
    player = new Player(500, 300);
  });

  it("keeps a walking enemy out of a pit", function () {
    const enemy = makeEnemy("Jelly", 140, 80);
    for (let i = 0; i < 20; i++) {
      moveWithCollision(enemy, 2, 0, room);
      expect(room.overlapsPit(enemy.getBounds())).toBe(false);
    }
    expect(enemy.pos.x).toBeGreaterThan(130);
  });

  it("lets a flier cross a pit", function () {
    const bat = makeEnemy("Bat", 140, 80);
    for (let i = 0; i < 30; i++) {
      moveWithCollision(bat, 2, 0, room);
    }
    expect(bat.pos.x).toBe(200);
  });

  it("kills an enemy that a shove carries over a pit", function () {
    const enemy = makeEnemy("Jelly", 150, 80); // middle at x 158, two pixels short of the pit
    enemy.applyKnockback(new p5.Vector(1, 0));
    for (let i = 0; i < 10 && !enemy.isDead(); i++) {
      enemy.update(player, room);
    }
    expect(enemy.isDead()).toBe(true);
    expect(enemy.fell).toBe(true);
  });

  it("does not kill an enemy that is only shoved toward a pit", function () {
    const enemy = makeEnemy("Jelly", 100, 80);
    enemy.applyKnockback(new p5.Vector(1, 0));
    for (let i = 0; i < 10; i++) {
      enemy.update(player, room);
    }
    expect(enemy.isDead()).toBe(false);
  });

  it("does not drop a flier or a boss into a pit", function () {
    const bat = makeEnemy("Bat", 160, 80);
    const demon = makeEnemy("DemonKnight", 152, 72); // 32 wide, its middle is over the pit
    bat.update(player, room);
    demon.update(player, room);
    expect(bat.isDead()).toBe(false);
    expect(demon.isDead()).toBe(false);
  });
});
