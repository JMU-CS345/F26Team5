describe("EnemyClock", function () {
  it("runs exactly one update every frame at normal speed", function () {
    const clock = new EnemyClock();
    for (let i = 0; i < 1000; i++) {
      expect(clock.steps(1)).toBe(1);
    }
  });

  it("runs about 35 updates in 100 frames at the dodge speed", function () {
    const clock = new EnemyClock();
    let total = 0;
    for (let i = 0; i < 100; i++) {
      total += clock.steps(DODGE_ENEMY_SPEED);
    }
    expect(total).toBeGreaterThanOrEqual(34);
    expect(total).toBeLessThanOrEqual(35);
  });

  it("never runs more than one update in a frame", function () {
    const clock = new EnemyClock();
    for (let i = 0; i < 100; i++) {
      expect(clock.steps(0.9)).toBeLessThan(2);
    }
  });

  it("returns to one update per frame right after a slow spell", function () {
    const clock = new EnemyClock();
    for (let i = 0; i < 7; i++) {
      clock.steps(DODGE_ENEMY_SPEED);
    }
    for (let i = 0; i < 50; i++) {
      expect(clock.steps(1)).toBe(1);
    }
  });

  it("a player who never dodges always has a normal time scale", function () {
    const room = new NormalRoom(0, 0, 640, 400);
    const player = new Player(100, 100, "Fire");
    const clock = new EnemyClock();
    for (let i = 0; i < 300; i++) {
      player.update(room, { move: new p5.Vector(1, 0) });
      expect(clock.steps(player.getEnemyTimeScale())).toBe(1);
    }
  });

  it("slows a real enemy update to the dodge share", function () {
    const room = new NormalRoom(0, 0, 640, 400);
    const player = new Player(300, 200, "Fire");
    const fast = new Enemy(100, 200, "Zombie");
    const slow = new Enemy(100, 200, "Zombie");
    const clock = new EnemyClock();
    for (let i = 0; i < 100; i++) {
      fast.update(player, room);
      for (let n = clock.steps(DODGE_ENEMY_SPEED); n > 0; n--) {
        slow.update(player, room);
      }
    }
    expect(slow.age).toBeGreaterThanOrEqual(34);
    expect(slow.age).toBeLessThanOrEqual(35);
    expect(fast.age).toBe(100);
  });
});
