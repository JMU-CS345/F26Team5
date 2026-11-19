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

describe("Melee attack and hopSwing", function () {
  let room;
  let enemy;
  let player;
  const swingType = {
    ...ENEMY_TYPES.Jelly,
    move: "hopSwing",
    hopRest: 10,
    hopFrames: 5,
    hopSpeed: 2,
    attack: { kind: "melee", cooldown: 60, damage: 1, reach: 26, windup: 5, recover: 7 }
  };

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

  it("hits once in the attack state, then recovers and goes idle", function () {
    placePlayerRightOf(enemy, player, 20);
    const before = player.health;
    let hits = 0;
    for (let frame = 0; frame < 120; frame++) {
      enemy.update(player, room);
      if (enemy.meleeHit(player)) {
        hits++;
        expect(enemy.state).toBe("attack"); // the sword stays out after the hit
      }
      if (hits > 0 && enemy.state === "idle") {
        break; // the swing is over, before the next one starts
      }
    }
    expect(hits).toBe(1);
    expect(enemy.state).toBe("idle");
    expect(player.health).toBe(before - swingType.attack.damage);
    expect(enemy.tryAttack(player)).toEqual([]);
  });

  it("hops instead of winding up when the player is out of reach", function () {
    placePlayerRightOf(enemy, player, 100);
    enemy.update(player, room);
    expect(enemy.state).toBe("hop");
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

  it("swings in all four directions", function () {
    const reach = enemy.type.attack.reach;
    const offsets = {
      right: new p5.Vector(reach - 6, 0),
      left: new p5.Vector(-reach + 6, 0),
      up: new p5.Vector(0, -reach + 6),
      down: new p5.Vector(0, reach - 6)
    };
    const opposite = { right: "left", left: "right", up: "down", down: "up" };
    for (const facing of Object.keys(offsets)) {
      for (const side of [facing, opposite[facing]]) {
        const target = new Player(0, 0);
        const c = enemy.getCenter();
        target.pos.set(c.x + offsets[side].x - 8, c.y + offsets[side].y - 8);
        enemy.facingDir = facing;
        enemy.swingHit = false;
        enemy.damageCooldown = 0;
        enemy.setState("attack", 5);
        expect(enemy.meleeHit(target)).withContext(facing + " at " + side)
          .toBe(facing === side);
      }
    }
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

describe("validateEnemyTypes for hop and melee", function () {
  const melee = { kind: "melee", cooldown: 60, damage: 1, reach: 26, windup: 20, recover: 24 };

  function tableWith(changes) {
    return { Test: { ...ENEMY_TYPES.Jelly, ...changes } };
  }

  function swinger(changes) {
    return tableWith({
      move: "hopSwing", hopRest: 50, hopFrames: 14, hopSpeed: 2, attack: melee, ...changes
    });
  }

  const hop = { move: "hop", hopRest: 40, hopFrames: 14, hopSpeed: 2.2 };

  it("accepts the current table, a hop type and a hopSwing type", function () {
    expect(validateEnemyTypes()).toEqual([]);
    expect(validateEnemyTypes(tableWith(hop))).toEqual([]);
    expect(validateEnemyTypes(swinger({}))).toEqual([]);
  });

  it("rejects a hop type missing hopSpeed", function () {
    const problems = validateEnemyTypes(tableWith({ ...hop, hopSpeed: undefined }));
    expect(problems).toEqual(["Test: hop needs hopSpeed above 0"]);
  });

  it("rejects a hopSwing without a melee attack", function () {
    expect(validateEnemyTypes(swinger({ attack: null }))).toEqual([
      "Test: hopSwing needs a melee attack"
    ]);
    const shoot = { kind: "shoot", cooldown: 50, damage: 1, speed: 2, color: [1, 2, 3] };
    expect(validateEnemyTypes(swinger({ attack: shoot }))).toEqual([
      "Test: hopSwing needs a melee attack"
    ]);
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
    expect(validateEnemyTypes(tableWith({ sprite: { ...sprite, frames: [{ ...frame, w: 32 }] } })))
      .toEqual([]);
    expect(validateEnemyTypes(tableWith({ sprite: { ...sprite, frames: [{ ...frame, w: 0 }] } })))
      .toEqual(["Test: sprite frame w must be at least 1"]);
    expect(validateEnemyTypes(tableWith({ sprite: { ...sprite, states: { windup: [frame] } } })))
      .toEqual([]);
    expect(validateEnemyTypes(tableWith({ sprite: { ...sprite, states: { attack: [] } } })))
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
