describe("rectsOverlap", function () {
  const a = { x: 0, y: 0, w: 10, h: 10 };

  it("is true for overlapping rects", function () {
    expect(rectsOverlap(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });
  it("is true when one rect contains the other", function () {
    expect(rectsOverlap(a, { x: 2, y: 2, w: 2, h: 2 })).toBe(true);
  });
  it("is false when rects only touch edges", function () {
    expect(rectsOverlap(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(rectsOverlap(a, { x: 0, y: 10, w: 10, h: 10 })).toBe(false);
  });
  it("is false when separated", function () {
    expect(rectsOverlap(a, { x: 50, y: 50, w: 10, h: 10 })).toBe(false);
  });
});

describe("projectileHitsPlayer", function () {
  let player;

  beforeEach(function () {
    player = new Player(100, 100);
  });

  it("hurts the player and uses up the projectile on a hit", function () {
    const center = player.getCenter();
    const shot = new Projectile(center.x, center.y, new p5.Vector(1, 0), 2);
    expect(projectileHitsPlayer(shot, player)).toBe(true);
    expect(player.health).toBe(player.maxHealth - 2);
    expect(shot.alive).toBe(false);
  });

  it("does nothing on a miss", function () {
    const shot = new Projectile(10, 10, new p5.Vector(1, 0));
    expect(projectileHitsPlayer(shot, player)).toBe(false);
    expect(player.health).toBe(player.maxHealth);
    expect(shot.alive).toBe(true);
  });

  it("hits only once", function () {
    const center = player.getCenter();
    const shot = new Projectile(center.x, center.y, new p5.Vector(1, 0));
    projectileHitsPlayer(shot, player);
    expect(projectileHitsPlayer(shot, player)).toBe(false);
    expect(player.health).toBe(player.maxHealth - 1);
  });

  it("does not hurt a dead player", function () {
    player.takeDamage(player.maxHealth);
    const center = player.getCenter();
    const shot = new Projectile(center.x, center.y, new p5.Vector(1, 0));
    expect(projectileHitsPlayer(shot, player)).toBe(false);
    expect(shot.alive).toBe(true);
  });
});
