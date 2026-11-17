describe("Charged spin", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(200, 200, "Fire");
    player.setAim(new p5.Vector(1, 0));
  });

  function enemyAt(x, y) {
    const enemy = new Enemy(x, y, "Demon");
    room.enemies.push(enemy);
    return enemy;
  }

  function hold(frames) {
    for (let i = 0; i < frames; i++) {
      player.update(room, { meleeHeld: true });
    }
  }

  function release(frames = 25) {
    for (let i = 0; i < frames; i++) {
      player.update(room, { meleeHeld: false });
    }
  }

  it("charges in 30 frames", function () {
    expect(SPIN_CHARGE_FRAMES).toBe(30);
    hold(30);
    expect(player.isCharged()).toBe(true);
  });

  it("is not charged before the threshold", function () {
    hold(SPIN_CHARGE_FRAMES - 1);
    expect(player.isCharged()).toBe(false);
    hold(1);
    expect(player.isCharged()).toBe(true);
  });

  it("spins when a full charge is released", function () {
    hold(SPIN_CHARGE_FRAMES);
    player.update(room, { meleeHeld: false });
    expect(player.attack).not.toBeNull();
    expect(player.attack.kind).toBe("spin");
    expect(player.chargeFrames).toBe(0);
  });

  it("does not spin on an early release", function () {
    hold(SPIN_CHARGE_FRAMES - 5);
    player.update(room, { meleeHeld: false });
    expect(player.attack).toBeNull();
    expect(player.chargeFrames).toBe(0);
  });

  it("does a normal swing on an early tap", function () {
    player.bufferMelee();
    hold(10);
    release(1);
    expect(player.attack.kind).toBe("swing");
  });

  it("hits enemies all around, front and back", function () {
    const front = enemyAt(222, 192);
    const back = enemyAt(178, 192);
    const above = enemyAt(200, 170);
    hold(SPIN_CHARGE_FRAMES);
    release();
    for (const enemy of [front, back, above]) {
      expect(enemy.health).toBeLessThan(enemy.maxHealth);
    }
  });

  it("hits each enemy once per spin", function () {
    const enemy = enemyAt(222, 192);
    hold(SPIN_CHARGE_FRAMES);
    release();
    const dealt = enemy.maxHealth - enemy.health;
    const spinDamage = player.getDamage(MELEE_DEFAULTS.damage * SPIN_DAMAGE, "Fire");
    expect(dealt).toBeCloseTo(spinDamage, 5);
  });

  it("reaches farther than a normal swing", function () {
    const swingPlan = makeSwingPlan(getMeleeStats(null), 0);
    const spinPlan = makeSpinPlan(getMeleeStats(null));
    expect(spinPlan.reach).toBeGreaterThan(swingPlan.reach);
    expect(spinPlan.arc).toBe(360);
  });

  it("misses enemies outside the spin radius", function () {
    const far = enemyAt(400, 192);
    hold(SPIN_CHARGE_FRAMES);
    release();
    expect(far.health).toBe(far.maxHealth);
  });

  it("hits harder than a normal swing", function () {
    const stats = getMeleeStats(null);
    expect(makeSpinPlan(stats).damage).toBeGreaterThan(makeSwingPlan(stats, 0).damage);
  });

  it("drops the charge if the player dies", function () {
    hold(SPIN_CHARGE_FRAMES);
    player.takeDamage(player.maxHealth);
    player.update(room, { meleeHeld: false });
    expect(player.attack).toBeNull();
  });
});
