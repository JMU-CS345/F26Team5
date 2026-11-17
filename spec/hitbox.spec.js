describe("Hitbox", function () {
  const right = new p5.Vector(1, 0);

  function dummyAt(x, y) {
    return new Enemy(x, y, "Jelly");
  }

  function arcBox(owner, extra = {}) {
    return new Hitbox(owner, {
      shape: "arc", x: 100, y: 100, dir: right, reach: 40, arc: 100, damage: 2, life: 4, ...extra
    });
  }

  it("hits a target in front of it", function () {
    const enemy = dummyAt(120, 92);
    const hits = arcBox(null).resolve([enemy]);
    expect(hits.length).toBe(1);
    expect(enemy.health).toBe(enemy.maxHealth - 2);
  });

  it("misses a target behind it", function () {
    const enemy = dummyAt(60, 92);
    expect(arcBox(null).resolve([enemy]).length).toBe(0);
    expect(enemy.health).toBe(enemy.maxHealth);
  });

  it("misses a target past its reach", function () {
    const enemy = dummyAt(220, 92);
    expect(arcBox(null).resolve([enemy]).length).toBe(0);
  });

  it("hits every side with a 360 degree arc", function () {
    const box = arcBox(null, { arc: 360 });
    const behind = dummyAt(70, 92);
    const front = dummyAt(120, 92);
    expect(box.resolve([behind, front]).length).toBe(2);
  });

  it("hits each enemy at most once", function () {
    const enemy = dummyAt(120, 92);
    const box = arcBox(null);
    box.resolve([enemy]);
    box.resolve([enemy]);
    box.resolve([enemy]);
    expect(enemy.health).toBe(enemy.maxHealth - 2);
  });

  it("hits several enemies in one pass", function () {
    const a = dummyAt(120, 92);
    const b = dummyAt(125, 100);
    expect(arcBox(null).resolve([a, b]).length).toBe(2);
  });

  it("pushes the target away from the origin", function () {
    const enemy = dummyAt(120, 92);
    arcBox(null).resolve([enemy]);
    expect(enemy.knockback.x).toBeGreaterThan(0);
    expect(enemy.knockbackTimer).toBeGreaterThan(0);
  });

  it("shoves harder with more knockback power", function () {
    const soft = dummyAt(120, 92);
    const hard = dummyAt(120, 92);
    arcBox(null).resolve([soft]);
    arcBox(null, { knockback: 2 }).resolve([hard]);
    expect(hard.knockback.mag()).toBeCloseTo(soft.knockback.mag() * 2, 5);
  });

  it("expires after its life", function () {
    const box = arcBox(null, { life: 3 });
    box.update();
    box.update();
    expect(box.alive).toBe(true);
    box.update();
    expect(box.alive).toBe(false);
    expect(box.resolve([dummyAt(120, 92)]).length).toBe(0);
  });

  it("ignores its owner", function () {
    const enemy = dummyAt(120, 92);
    expect(arcBox(enemy).resolve([enemy]).length).toBe(0);
  });

  it("ignores dead and spawning targets", function () {
    const dead = dummyAt(120, 92);
    dead.health = 0;
    const spawning = dummyAt(120, 92);
    spawning.spawnTimer = 10;
    expect(arcBox(null).resolve([dead, spawning]).length).toBe(0);
  });

  it("supports a rectangle shape", function () {
    const box = new Hitbox(null, { shape: "rect", x: 100, y: 100, w: 30, h: 30, damage: 1 });
    expect(box.resolve([dummyAt(110, 110), dummyAt(300, 300)]).length).toBe(1);
  });
});
