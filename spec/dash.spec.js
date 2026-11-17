describe("Dash", function () {
  let room;
  let player;
  const right = new p5.Vector(1, 0);
  const none = new p5.Vector(0, 0);

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(100, 200, "Fire");
  });

  function dash(moveDir) {
    player.bufferDash();
    player.update(room, { move: moveDir });
  }

  function run(frames, moveDir = none) {
    for (let i = 0; i < frames; i++) {
      player.update(room, { move: moveDir });
    }
  }

  it("covers its full distance in the movement direction", function () {
    dash(right);
    run(DASH_FRAMES);
    expect(player.pos.x).toBeCloseTo(100 + DASH_FRAMES * DASH_SPEED, 5);
    expect(player.pos.y).toBe(200);
  });

  it("dashes faster than walking", function () {
    expect(DASH_SPEED).toBeGreaterThan(player.speed);
  });

  it("dashes the way the player faces when standing still", function () {
    player.facing = "up";
    dash(none);
    run(DASH_FRAMES);
    expect(player.pos.y).toBeLessThan(200);
    expect(player.pos.x).toBe(100);
  });

  it("is invulnerable for the dash i-frames", function () {
    dash(right);
    expect(player.takeDamage(1)).toBe(false);
    run(DASH_IFRAMES - 2);
    expect(player.isInvulnerable()).toBe(true);
    run(2);
    expect(player.isInvulnerable()).toBe(false);
    expect(player.takeDamage(1)).toBe(true);
  });

  it("has two charges, a 10 frame spacing and a 50 frame recharge", function () {
    expect(DASH_CHARGES).toBe(2);
    expect(DASH_SPACING_FRAMES).toBe(10);
    expect(DASH_RECHARGE_FRAMES).toBe(50);
    expect(DASH_IFRAMES).toBe(12);
  });

  it("chains a second dash once the spacing is over", function () {
    dash(right);
    run(DASH_SPACING_FRAMES - 1);
    expect(player.canDash()).toBe(false);
    run(1);
    dash(right);
    expect(player.isDashing()).toBe(true);
    expect(player.dashCharges).toBe(0);
  });

  it("refuses a dash while the spacing runs", function () {
    dash(right);
    run(DASH_FRAMES);
    const after = player.pos.x;
    dash(right); // 9 frames after the start, spacing is 10
    expect(player.pos.x).toBeLessThanOrEqual(after + DASH_SPEED);
  });

  it("refuses a third dash until a charge comes back", function () {
    dash(right);
    run(DASH_SPACING_FRAMES);
    dash(right);
    run(DASH_SPACING_FRAMES + DASH_FRAMES);
    const x = player.pos.x;
    player.bufferDash();
    run(DASH_BUFFER_FRAMES, none);
    expect(player.pos.x).toBe(x);
    expect(player.dashCharges).toBe(0);
  });

  it("gets one charge back 50 frames after the first dash", function () {
    dash(right);
    run(DASH_RECHARGE_FRAMES - 1);
    expect(player.dashCharges).toBe(1);
    run(1);
    expect(player.dashCharges).toBe(2);
    expect(player.dashRecharge).toBe(0);
  });

  it("recharges charges one at a time", function () {
    dash(right);
    run(DASH_SPACING_FRAMES);
    dash(right);
    expect(player.dashCharges).toBe(0);
    run(DASH_RECHARGE_FRAMES);
    expect(player.dashCharges).toBe(1);
    run(DASH_RECHARGE_FRAMES);
    expect(player.dashCharges).toBe(2);
  });

  it("starts a buffered dash as soon as the spacing ends", function () {
    dash(right);
    run(DASH_SPACING_FRAMES - DASH_BUFFER_FRAMES + 2);
    player.bufferDash();
    run(DASH_BUFFER_FRAMES, right);
    expect(player.dashCharges).toBe(0);
  });

  it("drops a press that waited longer than the buffer", function () {
    dash(right);
    run(DASH_SPACING_FRAMES);
    dash(right);
    run(DASH_FRAMES);
    player.bufferDash();
    run(DASH_BUFFER_FRAMES + 1);
    run(DASH_RECHARGE_FRAMES);
    expect(player.isDashing()).toBe(false);
  });

  it("steers during the first 3 frames only", function () {
    dash(right);
    player.update(room, { move: new p5.Vector(0, 1) });
    expect(player.dashDir.y).toBeCloseTo(1, 5);
    player.update(room, { move: right });
    player.update(room, { move: new p5.Vector(0, -1) }); // 4th frame, too late
    expect(player.dashDir.y).toBeCloseTo(0, 5);
    expect(player.dashDir.x).toBeCloseTo(1, 5);
  });

  it("does not dash into a wall", function () {
    player.pos.set(room.x + room.tileSize, 200); // touching the left wall
    dash(new p5.Vector(-1, 0));
    expect(player.isDashing()).toBe(false);
    expect(player.dashCharges).toBe(DASH_CHARGES);
    expect(player.dashIFrames).toBe(0);
  });

  it("stops against a wall partway through", function () {
    player.pos.set(room.x + room.width - room.tileSize - player.length - 10, 200);
    dash(right);
    run(DASH_FRAMES);
    expect(player.pos.x).toBe(room.x + room.width - room.tileSize - player.length);
  });

  it("cancels a swing in progress", function () {
    player.bufferMelee();
    player.update(room, { move: none });
    expect(player.attack).not.toBeNull();
    dash(right);
    expect(player.attack).toBeNull();
  });

  it("goes before a buffered swing", function () {
    player.bufferMelee();
    player.bufferDash();
    player.update(room, { move: right });
    expect(player.isDashing()).toBe(true);
    expect(player.attack).toBeNull();
  });

  it("cannot walk while dashing", function () {
    dash(right);
    const x = player.pos.x;
    player.move(new p5.Vector(0, 1), room);
    expect(player.pos.x).toBe(x);
    expect(player.pos.y).toBe(200);
  });

  it("cannot dash once dead", function () {
    player.takeDamage(player.maxHealth);
    dash(right);
    expect(player.isDashing()).toBe(false);
  });

  it("keeps a buffered melee press through a dash", function () {
    player.bufferMelee();
    player.bufferDash();
    player.update(room, { move: right });
    expect(player.meleeBuffer).toBeGreaterThan(0);
    run(DASH_FRAMES - 1, right);
    expect(player.attack).not.toBeNull(); // the swing starts when the dash ends
  });
});

describe("Dash strike", function () {
  let room;
  let player;
  const right = new p5.Vector(1, 0);

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(100, 200, "Fire");
    player.setAim(right);
  });

  function dashThen(frames) {
    player.bufferDash();
    player.update(room, { move: right });
    for (let i = 0; i < frames; i++) {
      player.update(room, { move: right });
    }
  }

  it("skips the windup and hits 1.2 times as hard", function () {
    dashThen(DASH_FRAMES);
    player.bufferMelee();
    player.update(room, { move: right });
    const plan = player.attack.plan;
    const normal = makeSwingPlan(player.attack.stats, 0);
    expect(plan.strike).toBe(true);
    expect(plan.windup).toBe(0);
    expect(player.attack.phase()).toBe("active");
    expect(plan.damage).toBeCloseTo(normal.damage * 1.2, 5);
    expect(plan.lunge).toBe(normal.lunge + 6);
  });

  it("works when melee was pressed during the dash", function () {
    player.bufferMelee();
    dashThen(DASH_FRAMES);
    expect(player.attack).not.toBeNull();
    expect(player.attack.plan.strike).toBe(true);
  });

  it("is a normal swing when the dash was long ago", function () {
    dashThen(DASH_FRAMES + DASH_STRIKE_FRAMES);
    player.bufferMelee();
    player.update(room, { move: right });
    expect(player.attack.plan.strike).toBeUndefined();
    expect(player.attack.plan.windup).toBeGreaterThan(0);
  });

  it("only the first swing after a dash is a strike", function () {
    dashThen(DASH_FRAMES);
    player.bufferMelee();
    player.update(room, { move: right });
    while (player.attack.phase() !== "recovery") {
      player.update(room, { move: right });
    }
    player.bufferMelee();
    player.update(room, { move: right });
    expect(player.attack.step).toBe(1);
    expect(player.attack.plan.strike).toBeUndefined();
  });
});

describe("Perfect dodge", function () {
  let room;
  let player;
  const right = new p5.Vector(1, 0);

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(100, 200, "Fire");
    player.bufferDash();
    player.update(room, { move: right });
  });

  function run(frames) {
    for (let i = 0; i < frames; i++) {
      player.update(room, { move: right });
    }
  }

  it("blocks the hit, slows enemies and refunds a charge", function () {
    expect(player.dashCharges).toBe(1);
    expect(player.takeDamage(1)).toBe(false);
    expect(player.dashCharges).toBe(2);
    expect(player.getEnemyTimeScale()).toBe(DODGE_ENEMY_SPEED);
    expect(player.dodgeFlash).toBe(DODGE_FLASH_FRAMES);
    expect(player.health).toBe(player.maxHealth);
  });

  it("only counts in the first 8 i-frames", function () {
    run(PERFECT_DODGE_FRAMES - 1);
    player.takeDamage(1);
    expect(player.getEnemyTimeScale()).toBe(DODGE_ENEMY_SPEED);
    player.dodgeSlow = 0;
    player.dodgedThisDash = false;
    run(1);
    expect(player.takeDamage(1)).toBe(false); // still invulnerable
    expect(player.getEnemyTimeScale()).toBe(1);
  });

  it("refunds a charge only once per dash", function () {
    player.takeDamage(1);
    player.dashCharges = 1;
    player.takeDamage(1);
    expect(player.dashCharges).toBe(1);
  });

  it("ends the slow after 30 frames", function () {
    player.takeDamage(1);
    run(DODGE_SLOW_FRAMES - 1);
    expect(player.getEnemyTimeScale()).toBe(DODGE_ENEMY_SPEED);
    run(1);
    expect(player.getEnemyTimeScale()).toBe(1);
  });

  it("does not trigger from a hit with no dash", function () {
    const other = new Player(0, 0, "Fire");
    expect(other.takeDamage(1)).toBe(true);
    expect(other.getEnemyTimeScale()).toBe(1);
    expect(other.dodgeFlash).toBe(0);
  });

  it("does not trigger on zero damage", function () {
    player.takeDamage(0);
    expect(player.getEnemyTimeScale()).toBe(1);
  });
});

describe("Cancels", function () {
  let room;
  let player;
  const right = new p5.Vector(1, 0);

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(100, 200, "Fire");
    player.setAim(right);
  });

  function toPhase(name) {
    player.bufferMelee();
    player.update(room);
    while (player.attack.phase() !== name) {
      player.update(room);
    }
  }

  it("a shot cancels melee recovery", function () {
    toPhase("recovery");
    expect(player.fire(right)).not.toBeNull();
    expect(player.attack).toBeNull();
  });

  it("a shot does not cancel the active frames", function () {
    toPhase("active");
    player.fire(right);
    expect(player.attack).not.toBeNull();
  });

  it("a swing can still follow a shot-cancelled swing in the combo", function () {
    toPhase("recovery");
    player.fire(right);
    player.bufferMelee();
    player.update(room);
    expect(player.attack.step).toBe(1);
  });

  it("a dash cancels every swing phase", function () {
    for (const name of ["windup", "active", "recovery"]) {
      player = new Player(100, 200, "Fire");
      player.setAim(right);
      toPhase(name);
      player.bufferDash();
      player.update(room, { move: right });
      expect(player.attack).toBeNull();
    }
  });
});
