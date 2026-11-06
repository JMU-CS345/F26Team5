
describe("Projectile", function () {
  const bounds = { width: 100, height: 100 };
  const right = new p5.Vector(1, 0);
  const left = new p5.Vector(-1, 0);
  const up = new p5.Vector(0, -1);
  const down = new p5.Vector(0, 1);

  it("is centered on the point it spawns at", function () {
    const p = new Projectile(50, 60, right);
    expect(p.pos.x).toBe(50 - p.length / 2);
    expect(p.pos.y).toBe(60 - p.width / 2);
    expect(p.alive).toBe(true);
  });

  it("travels at PROJECTILE_SPEED no matter how long the direction vector is", function () {
    const p = new Projectile(50, 50, new p5.Vector(10, 0));
    expect(p.vel.mag()).toBeCloseTo(PROJECTILE_SPEED, 5);
    expect(p.vel.x).toBeGreaterThan(0);
  });

  it("moves by its velocity each update", function () {
    const p = new Projectile(50, 50, right);
    const startX = p.pos.x;
    const startY = p.pos.y;
    p.update(bounds);
    expect(p.pos.x).toBeCloseTo(startX + PROJECTILE_SPEED, 5);
    expect(p.pos.y).toBeCloseTo(startY, 5);
  });

  it("does not change the direction vector it is given", function () {
    const dir = new p5.Vector(1, 0);
    new Projectile(50, 50, dir);
    expect(dir.x).toBe(1);
    expect(dir.y).toBe(0);
  });

  it("stays alive while it is inside the bounds", function () {
    const p = new Projectile(50, 50, right);
    p.update(bounds);
    expect(p.alive).toBe(true);
  });

  it("stays alive while any part of it is still on screen", function () {
    // Each starts with its edge at the bounds, then moves 5 pixels past, leaving 3 pixels visible.
    const edges = [
      new Projectile(4, 50, left),
      new Projectile(96, 50, right),
      new Projectile(50, 4, up),
      new Projectile(50, 96, down)
    ];
    for (const p of edges) {
      p.update(bounds);
      expect(p.alive).toBe(true);
    }
  });

  it("dies once it has fully left through any edge", function () {
    const gone = [
      new Projectile(-100, 50, left),
      new Projectile(200, 50, right),
      new Projectile(50, -100, up),
      new Projectile(50, 200, down)
    ];
    for (const p of gone) {
      p.update(bounds);
      expect(p.alive).toBe(false);
    }
  });

  it("reports its bounds as position plus length and width", function () {
    const p = new Projectile(50, 50, right);
    expect(p.getBounds()).toEqual({
      x: p.pos.x,
      y: p.pos.y,
      w: p.length,
      h: p.width
    });
  });
});