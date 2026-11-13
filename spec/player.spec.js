describe("Player movement", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 160, 160); // floor spans 16 to 144
    player = new Player(50, 50);
  });

  it("moves in the direction it is given", function () {
    player.move(new p5.Vector(1, 0), room);
    expect(player.pos.x).toBe(50 + player.speed);
    expect(player.pos.y).toBe(50);
    player.move(new p5.Vector(0, 1), room);
    expect(player.pos.y).toBe(50 + player.speed);
    player.move(new p5.Vector(-1, 0), room);
    expect(player.pos.x).toBe(50);
    player.move(new p5.Vector(0, -1), room);
    expect(player.pos.y).toBe(50);
  });

  it("does not move with no direction", function () {
    player.move(new p5.Vector(0, 0), room);
    expect(player.pos.x).toBe(50);
    expect(player.pos.y).toBe(50);
  });

  it("moves diagonals at the same speed as straight lines", function () {
    player.move(new p5.Vector(1, 1), room);
    const distance = Math.hypot(player.pos.x - 50, player.pos.y - 50);
    expect(distance).toBeCloseTo(player.speed, 5);
  });

  it("does not change the direction vector it is given", function () {
    const dir = new p5.Vector(1, 1);
    player.move(dir, room);
    expect(dir.x).toBe(1);
    expect(dir.y).toBe(1);
  });

  it("stops perfectly against every wall when keys keep pushing", function () {
    for (let i = 0; i < 100; i++) player.move(new p5.Vector(-1, 0), room);
    expect(player.pos.x).toBe(room.x + room.tileSize);
    for (let i = 0; i < 100; i++) player.move(new p5.Vector(0, -1), room);
    expect(player.pos.y).toBe(room.y + room.tileSize);
    for (let i = 0; i < 100; i++) player.move(new p5.Vector(1, 0), room);
    expect(player.pos.x).toBe(room.x + room.width - room.tileSize - player.length);
    for (let i = 0; i < 100; i++) player.move(new p5.Vector(0, 1), room);
    expect(player.pos.y).toBe(room.y + room.height - room.tileSize - player.width);
  });

  it("slides along a wall when moving diagonally into it", function () {
    player.pos.set(128, 50);          // already squished against the right wall
    player.move(new p5.Vector(1, 1), room);
    expect(player.pos.x).toBe(128);   // blocked on x
    expect(player.pos.y).toBeGreaterThan(50); // still free on y
  });

  it("reports its bounds as position plus length and width", function () {
    expect(player.getBounds()).toEqual({
      x: 50,
      y: 50,
      w: player.length,
      h: player.width
    });
  });

  it("reports its center", function () {
    const p = new Player(10, 20);
    expect(p.getCenter().x).toBe(10 + p.length / 2);
    expect(p.getCenter().y).toBe(20 + p.width / 2);
  });
});

describe("getMoveDirection", function () {
  // 87 W, 65 A, 83 S, 68 D, 40 down arrow, 39 right arrow
  const held = (...codes) => (code) => codes.includes(code);

  it("maps WASD", function () {
    expect(getMoveDirection(held(87))).toEqual(new p5.Vector(0, -1));
    expect(getMoveDirection(held(83))).toEqual(new p5.Vector(0, 1));
    expect(getMoveDirection(held(65))).toEqual(new p5.Vector(-1, 0));
    expect(getMoveDirection(held(68))).toEqual(new p5.Vector(1, 0));
  });

  it("ignores the arrow keys, which fire instead", function () {
    expect(getMoveDirection(held(37)).magSq()).toBe(0);
    expect(getMoveDirection(held(38)).magSq()).toBe(0);
    expect(getMoveDirection(held(39)).magSq()).toBe(0);
    expect(getMoveDirection(held(40)).magSq()).toBe(0);
  });

  it("cancels opposite keys and combines diagonals", function () {
    expect(getMoveDirection(held(65, 68)).magSq()).toBe(0);
    expect(getMoveDirection(held(87, 68))).toEqual(new p5.Vector(1, -1));
  });

  it("returns no movement when nothing is held", function () {
    expect(getMoveDirection(held()).magSq()).toBe(0);
  });
});

describe("Player animation state", () => {
  const room = new NormalRoom(0, 0, 640, 400);
  const right = new p5.Vector(1, 0);
  const none = new p5.Vector(0, 0);
  let player;
  beforeEach(() => {
    player = new Player(100, 100, "Fire");
  });

  it("faces the direction it moves", () => {
    player.move(right, room);
    expect(player.facing).toBe("right");
    player.move(new p5.Vector(0, -1), room);
    expect(player.facing).toBe("up");
  });

  it("counts walk frames while moving and resets when standing still", () => {
    player.move(right, room);
    player.move(right, room);
    expect(player.walkFrames).toBe(2);
    player.move(none, room);
    expect(player.walkFrames).toBe(0);
  });

  it("faces the fire direction and holds the weapon while a fire key is held", () => {
    player.fire(right);
    expect(player.holding).toBe(true);
    expect(player.isArmUp()).toBe(true);
    expect(player.facing).toBe("right");
  });

  it("keeps the arm up for the cooldown after a quick tap", () => {
    player.fire(right); // tap
    player.fire(none); // key released
    expect(player.holding).toBe(false);
    expect(player.isArmUp()).toBe(true);
    for (let i = 0; i < FIRE_COOLDOWN; i++) {
      player.update();
    }
    expect(player.isArmUp()).toBe(false);
  });

  it("keeps facing the shot direction while moving during the cooldown", () => {
    player.fire(right);
    player.fire(none);
    player.move(new p5.Vector(0, 1), room);
    expect(player.facing).toBe("right");
  });

  it("does not turn toward another fire key during the cooldown", () => {
    const up = new p5.Vector(0, -1);
    player.fire(right);
    expect(player.fire(up)).toBeNull(); // still cooling down
    expect(player.facing).toBe("right");
    for (let i = 0; i < FIRE_COOLDOWN; i++) {
      player.update();
    }
    expect(player.fire(up)).not.toBeNull();
    expect(player.facing).toBe("up");
  });
});

describe("getFireDirection", function () {
  // 38 up, 40 down, 37 left, 39 right; 87 W, 65 A, 83 S, 68 D
  const held = (...codes) => (code) => codes.includes(code);

  it("maps each arrow key to a cardinal direction", function () {
    expect(getFireDirection(held(38))).toEqual(new p5.Vector(0, -1));
    expect(getFireDirection(held(40))).toEqual(new p5.Vector(0, 1));
    expect(getFireDirection(held(37))).toEqual(new p5.Vector(-1, 0));
    expect(getFireDirection(held(39))).toEqual(new p5.Vector(1, 0));
  });

  it("returns no direction when no arrow is held", function () {
    expect(getFireDirection(held()).magSq()).toBe(0);
  });

  it("ignores WASD, which move instead", function () {
    expect(getFireDirection(held(87, 65, 83, 68)).magSq()).toBe(0);
  });

  it("never fires diagonally, even with several arrows held", function () {
    const combos = [[38, 39], [38, 37], [40, 39], [40, 37], [38, 40], [37, 39], [37, 38, 39, 40]];
    for (const combo of combos) {
      const dir = getFireDirection(held(...combo));
      expect(dir.x * dir.y).toBe(0);
      expect(dir.magSq()).toBe(1);
    }
  });
});

describe("Player firing", function () {
  const up = new p5.Vector(0, -1);
  let player;

  beforeEach(function () {
    player = new Player(50, 50);
  });

  it("fires a projectile from the center of the player", function () {
    const proj = player.fire(up);
    expect(proj).toBeInstanceOf(Projectile);
    const centerX = proj.pos.x + proj.length / 2;
    const centerY = proj.pos.y + proj.width / 2;
    expect(centerX).toBe(50 + player.length / 2);
    expect(centerY).toBe(50 + player.width / 2);
  });

  it("fires in the direction it is given", function () {
    const proj = player.fire(new p5.Vector(1, 0));
    expect(proj.vel.x).toBeGreaterThan(0);
    expect(proj.vel.y).toBeCloseTo(0, 5);
  });

  it("does not fire with no direction", function () {
    expect(player.fire(new p5.Vector(0, 0))).toBeNull();
    expect(player.fireCooldown).toBe(0);
  });

  it("cannot fire again until the cooldown is over", function () {
    expect(player.fire(up)).not.toBeNull();
    expect(player.fire(up)).toBeNull();
    for (let i = 0; i < FIRE_COOLDOWN - 1; i++) player.update();
    expect(player.fire(up)).toBeNull();
    player.update();
    expect(player.fire(up)).not.toBeNull();
  });

  it("does not let the cooldown go below zero", function () {
    for (let i = 0; i < 5; i++) player.update();
    expect(player.fireCooldown).toBe(0);
  });

  it("cannot fire once dead", function () {
    player.takeDamage(player.maxHealth);
    expect(player.fire(up)).toBeNull();
  });

  it("does not change the direction vector it is given", function () {
    const dir = new p5.Vector(0, -1);
    player.fire(dir);
    expect(dir.x).toBe(0);
    expect(dir.y).toBe(-1);
  });
});

describe("Player health and death", function () {
  let player;

  beforeEach(function () {
    player = new Player(50, 50);
  });

  function playDeathAnimation() {
    for (let i = 0; i < DEATH_FRAMES; i++) player.update();
  }

  it("starts at full health, alive", function () {
    expect(player.health).toBe(player.maxHealth);
    expect(player.isDead()).toBe(false);
  });

  it("loses health when damaged", function () {
    player.takeDamage(2);
    expect(player.health).toBe(player.maxHealth - 2);
    expect(player.isDead()).toBe(false);
  });

  it("dies at exactly 0 health and never goes negative", function () {
    player.takeDamage(player.maxHealth + 10);
    expect(player.health).toBe(0);
    expect(player.isDead()).toBe(true);
  });

  it("does not show the death screen while alive", function () {
    playDeathAnimation();
    expect(player.deathFrames).toBe(0);
    expect(player.showDeathScreen()).toBe(false);
  });

  it("plays the death animation before showing the death screen", function () {
    player.takeDamage(player.maxHealth);
    expect(player.showDeathScreen()).toBe(false);
    player.update();
    expect(player.showDeathScreen()).toBe(false);
    playDeathAnimation();
    expect(player.showDeathScreen()).toBe(true);
  });

  it("cannot move once dead", function () {
    const room = new NormalRoom(0, 0, 160, 160);
    player.takeDamage(player.maxHealth);
    player.move(new p5.Vector(1, 0), room);
    expect(player.pos.x).toBe(50);
  });

  it("a new Player (restart) has full health and no death state", function () {
    player.takeDamage(player.maxHealth);
    playDeathAnimation();
    const fresh = new Player(50, 50);
    expect(fresh.isDead()).toBe(false);
    expect(fresh.showDeathScreen()).toBe(false);
  });
});
