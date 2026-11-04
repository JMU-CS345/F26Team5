describe("Player movement", function () {
  const bounds = { width: 100, height: 100 };
  let player;

  beforeEach(function () {
    player = new Player(50, 50);
  });

  it("moves in the direction it is given", function () {
    player.move(new p5.Vector(1, 0), bounds);
    expect(player.pos.x).toBe(50 + player.speed);
    expect(player.pos.y).toBe(50);
    player.move(new p5.Vector(0, 1), bounds);
    expect(player.pos.y).toBe(50 + player.speed);
    player.move(new p5.Vector(-1, 0), bounds);
    expect(player.pos.x).toBe(50);
    player.move(new p5.Vector(0, -1), bounds);
    expect(player.pos.y).toBe(50);
  });

  it("does not move with no direction", function () {
    player.move(new p5.Vector(0, 0), bounds);
    expect(player.pos.x).toBe(50);
    expect(player.pos.y).toBe(50);
  });

  it("moves diagonals at the same speed as straight lines", function () {
    player.move(new p5.Vector(1, 1), bounds);
    const distance = Math.hypot(player.pos.x - 50, player.pos.y - 50);
    expect(distance).toBeCloseTo(player.speed, 5);
  });

  it("does not change the direction vector it is given", function () {
    const dir = new p5.Vector(1, 1);
    player.move(dir, bounds);
    expect(dir.x).toBe(1);
    expect(dir.y).toBe(1);
  });

  it("stops at every edge when keys keep pushing", function () {
    for (let i = 0; i < 100; i++) player.move(new p5.Vector(-1, 0), bounds);
    expect(player.pos.x).toBe(0);
    for (let i = 0; i < 100; i++) player.move(new p5.Vector(0, -1), bounds);
    expect(player.pos.y).toBe(0);
    for (let i = 0; i < 100; i++) player.move(new p5.Vector(1, 0), bounds);
    expect(player.pos.x).toBe(100 - player.size);
    for (let i = 0; i < 100; i++) player.move(new p5.Vector(0, 1), bounds);
    expect(player.pos.y).toBe(100 - player.size);
  });

  it("pulls a player that starts outside back inside", function () {
    const outside = new Player(500, -20);
    outside.move(new p5.Vector(1, -1), bounds);
    expect(outside.pos.x).toBe(100 - outside.size);
    expect(outside.pos.y).toBe(0);
  });
});

describe("getMoveDirection", function () {
  // 87 W, 65 A, 68 D, 40 down arrow, 39 right arrow
  const held = (...codes) => (code) => codes.includes(code);

  it("maps WASD and arrow keys", function () {
    expect(getMoveDirection(held(87))).toEqual(new p5.Vector(0, -1));
    expect(getMoveDirection(held(40))).toEqual(new p5.Vector(0, 1));
    expect(getMoveDirection(held(65))).toEqual(new p5.Vector(-1, 0));
    expect(getMoveDirection(held(39))).toEqual(new p5.Vector(1, 0));
  });

  it("cancels opposite keys and combines diagonals", function () {
    expect(getMoveDirection(held(65, 68)).magSq()).toBe(0);
    expect(getMoveDirection(held(87, 39))).toEqual(new p5.Vector(1, -1));
  });

  it("returns no movement when nothing is held", function () {
    expect(getMoveDirection(held()).magSq()).toBe(0);
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
    player.takeDamage(player.maxHealth);
    player.move(new p5.Vector(1, 0), { width: 100, height: 100 });
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
