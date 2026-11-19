describe("Melee", function () {
  let room;
  let player;
  const right = new p5.Vector(1, 0);

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(100, 100, "Fire");
    player.setAim(right);
  });

  function enemyAt(x, y) {
    const enemy = new Enemy(x, y, "Demon"); // lots of health, so it survives the combo
    room.enemies.push(enemy);
    return enemy;
  }

  function run(frames) {
    for (let i = 0; i < frames; i++) {
      player.update(room);
    }
  }

  function equip(weapon) {
    player.inventory.add(weapon);
    player.inventory.equip(weapon);
  }

  function swing() {
    player.bufferMelee();
    player.update(room);
  }

  it("uses the starter dagger with no melee weapon", function () {
    swing();
    expect(player.attack.stats.reach).toBe(MELEE_DEFAULTS.reach);
    expect(player.attack.stats.weapon).toBeNull();
  });

  it("takes its stats from the equipped weapon", function () {
    equip(new MeleeWeapon({
      id: "axe", name: "Axe", damage: 6, reach: 50, swingFrames: 20, knockback: 24, arc: 160
    }));
    swing();
    expect(player.attack.plan.reach).toBe(50);
    expect(player.attack.plan.total).toBe(20);
    expect(player.attack.plan.arc).toBe(160);
    expect(player.attack.plan.knockback).toBe(2); // 24 against the default 12
    expect(player.attack.stats.damage).toBe(6);
  });

  it("goes through windup, active and recovery", function () {
    swing();
    const seen = [player.attack.phase()];
    while (player.attack !== null) {
      player.update(room);
      if (player.attack !== null && seen[seen.length - 1] !== player.attack.phase()) {
        seen.push(player.attack.phase());
      }
    }
    expect(seen).toEqual(["windup", "active", "recovery"]);
  });

  it("hurts an enemy in front, once per swing", function () {
    const enemy = enemyAt(120, 92);
    swing();
    run(20);
    const dealt = enemy.maxHealth - enemy.health;
    expect(dealt).toBeGreaterThan(0);
    // One hit of the dagger, scaled by the class: never two hits worth.
    expect(dealt).toBeLessThan(MELEE_DEFAULTS.damage * 2);
  });

  it("does not hurt an enemy behind the player", function () {
    const enemy = enemyAt(60, 92);
    swing();
    run(20);
    expect(enemy.health).toBe(enemy.maxHealth);
  });

  it("does not hurt an enemy out of reach", function () {
    const enemy = enemyAt(300, 92);
    swing();
    run(20);
    expect(enemy.health).toBe(enemy.maxHealth);
  });

  it("swings toward the aim direction", function () {
    player.setAim(new p5.Vector(0, -1));
    const above = enemyAt(100, 70);
    const right = enemyAt(130, 100);
    swing();
    run(20);
    expect(above.health).toBeLessThan(above.maxHealth);
    expect(right.health).toBe(right.maxHealth);
    expect(player.facing).toBe("up");
  });

  it("chains a 3 hit combo from buffered presses", function () {
    swing();
    expect(player.attack.step).toBe(0);
    player.bufferMelee();
    while (player.attack.step === 0) {
      player.update(room);
    }
    expect(player.attack.step).toBe(1);
    player.bufferMelee();
    while (player.attack.step === 1) {
      player.update(room);
    }
    expect(player.attack.step).toBe(2);
  });

  it("makes the finisher hit harder and knock back more", function () {
    const stats = getMeleeStats(null);
    const first = makeSwingPlan(stats, 0);
    const last = makeSwingPlan(stats, 2);
    expect(last.damage).toBeGreaterThan(first.damage);
    expect(last.knockback).toBeGreaterThan(first.knockback);
    expect(last.total).toBeGreaterThan(first.total);
  });

  it("starts the combo over after the finisher", function () {
    swing();
    for (let step = 1; step <= 3; step++) {
      player.bufferMelee();
      let guard = 0;
      while (player.attack !== null && player.attack.step === (step - 1) % 3 && guard++ < 60) {
        player.update(room);
      }
    }
    expect(player.attack.step).toBe(0);
  });

  it("resets the combo after waiting too long", function () {
    swing();
    run(60);
    expect(player.attack).toBeNull();
    expect(player.comboStep).toBe(0);
    swing();
    expect(player.attack.step).toBe(0);
  });

  it("moves on to step 1 if the next press comes soon enough", function () {
    swing();
    run(MELEE_DEFAULTS.swingFrames + 2);
    expect(player.attack).toBeNull();
    swing();
    expect(player.attack.step).toBe(1);
  });

  it("drops a press that waited longer than the buffer", function () {
    equip(new MeleeWeapon({ id: "slow", name: "Slow", damage: 3, swingFrames: 40 }));
    swing();
    player.bufferMelee();
    run(MELEE_BUFFER_FRAMES + 1);
    expect(player.meleeBuffer).toBe(0);
    run(45);
    expect(player.attack).toBeNull();
  });

  // Speed of a walk step in the given swing phase, from a standing start.
  function stepInPhase(name) {
    swing();
    player.lunge.set(0, 0);
    while (player.attack.phase() !== name) {
      player.update(room);
    }
    player.velocity.set(0, 0);
    const before = player.pos.x;
    player.move(right, room);
    return (player.pos.x - before) / MOVE_ACCEL;
  }

  it("walks at 0.8 speed in windup", function () {
    expect(stepInPhase("windup")).toBeCloseTo(player.speed * SWING_SPEED_WINDUP, 5);
  });

  it("walks at 0.8 speed in the active frames", function () {
    expect(stepInPhase("active")).toBeCloseTo(player.speed * SWING_SPEED_ACTIVE, 5);
  });

  it("walks at full speed in recovery", function () {
    expect(stepInPhase("recovery")).toBeCloseTo(player.speed, 5);
  });

  it("uses the 0.8 and 1.0 tuning values", function () {
    expect(SWING_SPEED_WINDUP).toBe(0.8);
    expect(SWING_SPEED_ACTIVE).toBe(0.8);
    expect(SWING_SPEED_RECOVERY).toBe(1);
  });

  it("cannot swing once dead", function () {
    player.takeDamage(player.maxHealth);
    player.bufferMelee();
    player.update(room);
    expect(player.attack).toBeNull();
  });

  it("calls the weapon onHit hook with the target", function () {
    const calls = [];
    equip(new MeleeWeapon({
      id: "hook", name: "Hook", damage: 2, onHit: (ctx) => calls.push(ctx)
    }));
    const enemy = enemyAt(120, 92);
    swing();
    run(20);
    expect(calls.length).toBe(1);
    expect(calls[0].target).toBe(enemy);
    expect(calls[0].player).toBe(player);
  });
});

describe("Melee lunge", function () {
  let room;
  let player;
  const right = new p5.Vector(1, 0);

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(100, 100, "Fire");
    player.setAim(right);
  });

  function lungeDistance(step) {
    const x = player.pos.x;
    player.comboStep = step - 1;
    player.comboTimer = 10;
    player.bufferMelee();
    for (let i = 0; i < 20; i++) {
      player.update(room);
    }
    return player.pos.x - x;
  }

  it("steps forward 5 px on a normal swing", function () {
    expect(lungeDistance(0)).toBeCloseTo(LUNGE_SWING, 0);
    expect(LUNGE_SWING).toBe(5);
  });

  it("steps forward 9 px on the finisher", function () {
    expect(lungeDistance(2)).toBeCloseTo(LUNGE_FINISHER, 0);
    expect(LUNGE_FINISHER).toBe(9);
  });

  it("does not lunge on a spin", function () {
    expect(makeSpinPlan(getMeleeStats(null)).lunge).toBe(0);
  });

  it("eases out, so the first frame is the biggest", function () {
    player.bufferMelee();
    player.update(room);
    const first = player.pos.x - 100;
    player.update(room);
    const second = player.pos.x - 100 - first;
    expect(first).toBeGreaterThan(second);
    expect(second).toBeGreaterThan(0);
  });

  it("stops at a wall", function () {
    player.pos.x = room.x + room.width - room.tileSize - player.length - 1;
    player.bufferMelee();
    for (let i = 0; i < 20; i++) {
      player.update(room);
    }
    expect(room.collidesWithWall(player.getBounds())).toBe(false);
    expect(player.pos.x).toBeLessThanOrEqual(room.x + room.width - room.tileSize - player.length);
    expect(player.lunge.magSq()).toBe(0);
  });

  it("lunges along the aim, diagonals included", function () {
    player.setAim(new p5.Vector(1, 1));
    player.bufferMelee();
    for (let i = 0; i < 20; i++) {
      player.update(room);
    }
    expect(player.pos.x - 100).toBeCloseTo(LUNGE_SWING * Math.SQRT1_2, 0);
    expect(player.pos.y - 100).toBeCloseTo(LUNGE_SWING * Math.SQRT1_2, 0);
  });
});

describe("Melee aim per combo step", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(300, 200, "Fire");
  });

  function swingToward(dir) {
    player.setAim(dir);
    player.bufferMelee();
    player.update(room);
    return player.attack.dir.copy();
  }

  it("reads the aim again at each combo step", function () {
    expect(swingToward(new p5.Vector(1, 0))).toEqual(new p5.Vector(1, 0));
    while (player.attack.phase() !== "recovery") {
      player.update(room);
    }
    const second = swingToward(new p5.Vector(-1, 0));
    expect(second).toEqual(new p5.Vector(-1, 0));
    expect(player.attack.step).toBe(1);
  });

  it("swings along an 8-way diagonal", function () {
    const dir = swingToward(new p5.Vector(-1, -1));
    expect(dir.heading()).toBeCloseTo(-3 * Math.PI / 4, 5);
  });

  it("hits an enemy on the diagonal and misses one off to the side", function () {
    const near = new Enemy(300 + 20, 200 + 20, "Demon");
    const side = new Enemy(300 + 28, 200 - 8, "Demon");
    room.enemies.push(near, side);
    player.setAim(new p5.Vector(1, 1));
    player.bufferMelee();
    for (let i = 0; i < 12; i++) {
      player.update(room);
    }
    expect(near.health).toBeLessThan(near.maxHealth);
    expect(side.health).toBe(side.maxHealth);
  });
});
