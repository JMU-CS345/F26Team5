
describe("Projectile", function () {
  const room = new NormalRoom(0, 0, 160, 160); // floor spans 16 to 144
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
    p.update(room);
    expect(p.pos.x).toBeCloseTo(startX + PROJECTILE_SPEED, 5);
    expect(p.pos.y).toBeCloseTo(startY, 5);
  });

  it("does not change the direction vector it is given", function () {
    const dir = new p5.Vector(1, 0);
    new Projectile(50, 50, dir);
    expect(dir.x).toBe(1);
    expect(dir.y).toBe(0);
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

  it("stays alive on open floor", function () {
    const p = new Projectile(80, 80, right);
    p.update(room);
    expect(p.alive).toBe(true);
  });

  it("stays alive when it stops just short of a wall", function () {
    const nearMisses = [
      new Projectile(25, 80, left),
      new Projectile(135, 80, right),
      new Projectile(80, 25, up),
      new Projectile(80, 135, down)
    ];
    for (const p of nearMisses) {
      p.update(room);
      expect(p.alive).toBe(true);
    }
  });

  it("dies when it hits any of the four walls", function () {
    const hits = [
      new Projectile(24, 80, left),
      new Projectile(136, 80, right),
      new Projectile(80, 24, up),
      new Projectile(80, 136, down)
    ];
    for (const p of hits) {
      p.update(room);
      expect(p.alive).toBe(false);
    }
  });

  it("dies if it ends up outside the room", function () {
    const p = new Projectile(-100, 80, left);
    p.update(room);
    expect(p.alive).toBe(false);
  });
});
