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

  it("waits for the cooldown before the next dash", function () {
    dash(right);
    run(DASH_FRAMES);
    const after = player.pos.x;
    dash(right); // too soon
    run(5);
    expect(player.isDashing()).toBe(false);
    expect(player.pos.x).toBe(after);
    run(DASH_COOLDOWN);
    dash(right);
    expect(player.isDashing()).toBe(true);
  });

  it("starts a buffered dash as soon as the cooldown ends", function () {
    dash(right);
    run(DASH_COOLDOWN - DASH_BUFFER_FRAMES + 2);
    player.bufferDash();
    run(DASH_BUFFER_FRAMES, right);
    expect(player.dashCooldown).toBeGreaterThan(0);
    expect(player.dashFrames + player.dashIFrames).toBeGreaterThan(0);
  });

  it("drops a press that waited longer than the buffer", function () {
    dash(right);
    run(10);
    player.bufferDash();
    run(DASH_BUFFER_FRAMES + 1);
    run(DASH_COOLDOWN);
    expect(player.isDashing()).toBe(false);
  });

  it("does not dash into a wall", function () {
    player.pos.set(room.x + room.tileSize, 200); // touching the left wall
    dash(new p5.Vector(-1, 0));
    expect(player.isDashing()).toBe(false);
    expect(player.dashCooldown).toBe(0);
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
});
