describe("GameFeel", function () {
  let feel;
  let enemy;
  const on = { controls: "classic", musicVolume: 0.5, sfxVolume: 0.7, screenShake: true,
    damageNumbers: true };

  beforeEach(function () {
    feel = new GameFeel({ ...on });
    enemy = new Enemy(100, 100, "Jelly");
  });

  const right = new p5.Vector(1, 0);

  it("freezes the game for 2 frames on a normal melee hit", function () {
    feel.onHit({ target: enemy, damage: 2, attack: "swing", finisher: false, dir: right },
      "melee");
    expect(feel.hitstop).toBe(2);
    expect(feel.consumeHitstop()).toBe(true);
    expect(feel.consumeHitstop()).toBe(true);
    expect(feel.consumeHitstop()).toBe(false);
  });

  it("freezes 5 frames on a finisher and 4 on a spin", function () {
    feel.onHit({ target: enemy, damage: 2, attack: "swing", finisher: true, dir: right },
      "melee");
    expect(feel.hitstop).toBe(5);
    feel.reset();
    feel.onHit({ target: enemy, damage: 2, attack: "spin", finisher: false, dir: right },
      "melee");
    expect(feel.hitstop).toBe(4);
  });

  it("falls back to the normal freeze for a hit with no swing details", function () {
    feel.onHit({ target: enemy, damage: 2 }, "melee");
    expect(feel.hitstop).toBe(HITSTOP_NORMAL_FRAMES);
  });

  it("shakes along the swing direction, 2 px and 4 px on a finisher", function () {
    feel.onHit({ target: enemy, damage: 2, attack: "swing", finisher: false, dir: right },
      "melee");
    const offset = feel.getShakeOffset();
    expect(offset.y).toBeCloseTo(0, 5);
    expect(Math.abs(offset.x)).toBeCloseTo(SHAKE_MELEE, 5);
    feel.reset();
    feel.onHit({ target: enemy, damage: 2, attack: "swing", finisher: true, dir: right },
      "melee");
    expect(Math.abs(feel.getShakeOffset().x)).toBeCloseTo(4, 5);
  });

  it("shakes back and forth along the line, fading out", function () {
    feel.onHit({ target: enemy, damage: 2, attack: "swing", dir: new p5.Vector(0, 1) },
      "melee");
    const first = feel.getShakeOffset();
    feel.update();
    const second = feel.getShakeOffset();
    expect(first.y * second.y).toBeLessThan(0);
    expect(Math.abs(second.y)).toBeLessThan(Math.abs(first.y));
    expect(first.x).toBeCloseTo(0, 5);
  });

  it("a hit with no direction still shakes at random", function () {
    feel.onHit({ target: enemy, damage: 2 }, "melee");
    expect(feel.shakeDir).toBeNull();
    expect(feel.shakeFrames).toBeGreaterThan(0);
  });

  it("does not freeze the game on a ranged hit", function () {
    feel.onHit({ target: enemy, damage: 1 }, "ranged");
    expect(feel.hitstop).toBe(0);
    expect(feel.consumeHitstop()).toBe(false);
  });

  it("shakes the screen on a hit, then settles", function () {
    feel.onHit({ target: enemy, damage: 2 }, "melee");
    expect(feel.shakeFrames).toBeGreaterThan(0);
    for (let i = 0; i < SHAKE_FRAMES; i++) {
      feel.update();
    }
    expect(feel.getShakeOffset()).toEqual({ x: 0, y: 0 });
  });

  it("keeps the shake light", function () {
    feel.onHit({ target: enemy, damage: 2 }, "melee");
    for (let i = 0; i < 50; i++) {
      const offset = feel.getShakeOffset();
      expect(Math.abs(offset.x)).toBeLessThanOrEqual(SHAKE_MELEE);
      expect(Math.abs(offset.y)).toBeLessThanOrEqual(SHAKE_MELEE);
    }
  });

  it("does not shake when the setting is off", function () {
    feel = new GameFeel({ ...on, screenShake: false });
    feel.onHit({ target: enemy, damage: 2, attack: "swing", dir: right }, "melee");
    feel.onPlayerHurt();
    expect(feel.shakeFrames).toBe(0);
    expect(feel.getShakeOffset()).toEqual({ x: 0, y: 0 });
    expect(feel.hitstop).toBe(HITSTOP_NORMAL_FRAMES); // hitstop is not a shake
  });

  it("adds a damage number above the target", function () {
    feel.onHit({ target: enemy, damage: 2.5 }, "melee");
    expect(feel.numbers.length).toBe(1);
    expect(feel.numbers[0].text).toBe("2.5");
    expect(feel.numbers[0].y).toBe(enemy.getBounds().y);
  });

  it("adds no damage numbers when the setting is off", function () {
    feel = new GameFeel({ ...on, damageNumbers: false });
    feel.onHit({ target: enemy, damage: 2 }, "melee");
    expect(feel.numbers.length).toBe(0);
  });

  it("removes a damage number after it floats away", function () {
    feel.onHit({ target: enemy, damage: 2 }, "melee");
    for (let i = 0; i < NUMBER_FRAMES; i++) {
      feel.update();
    }
    expect(feel.numbers.length).toBe(0);
  });

  it("rounds long damage values", function () {
    expect(formatDamage(1.25)).toBe("1.3");
    expect(formatDamage(3)).toBe("3");
  });

  it("flashes an enemy white-hot through its hurt timer", function () {
    enemy.takeDamage(1);
    expect(enemy.hurtTimer).toBeGreaterThan(0);
  });

  it("reads the saved settings when refreshed", function () {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ screenShake: false }));
    feel.refreshSettings();
    localStorage.removeItem(SETTINGS_KEY);
    expect(feel.settings.screenShake).toBe(false);
  });

  it("clears everything on reset", function () {
    feel.onHit({ target: enemy, damage: 2 }, "melee");
    feel.reset();
    expect(feel.hitstop).toBe(0);
    expect(feel.numbers.length).toBe(0);
    expect(feel.shakeFrames).toBe(0);
  });
});
