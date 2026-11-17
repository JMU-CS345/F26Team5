describe("Holding melee", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(200, 200, "Fire");
    player.setAim(new p5.Vector(1, 0));
  });

  function hold(frames, steps) {
    for (let i = 0; i < frames; i++) {
      player.update(room, { meleeHeld: true });
      if (player.attack !== null && steps[steps.length - 1] !== player.attack.step) {
        steps.push(player.attack.step);
      }
      if (player.attack !== null) {
        expect(player.attack.kind).toBe("swing");
      }
    }
  }

  it("keeps swinging through the combo while held", function () {
    const steps = [];
    hold(120, steps);
    expect(steps.slice(0, 4)).toEqual([0, 1, 2, 0]);
  });

  it("never starts a spin while held, however long", function () {
    hold(300, []);
    expect(player.attack.kind).toBe("swing");
  });

  it("does not attack again when the key is released", function () {
    hold(60, []);
    for (let i = 0; i < 60; i++) {
      player.update(room, { meleeHeld: false });
    }
    expect(player.attack).toBeNull();
    player.update(room, { meleeHeld: false });
    expect(player.attack).toBeNull();
  });

  it("does not spin on release of a long hold from a standing start", function () {
    for (let i = 0; i < 40; i++) {
      player.update(room, { meleeHeld: true });
    }
    let sawSpin = false;
    for (let i = 0; i < 40; i++) {
      player.update(room, { meleeHeld: false });
      if (player.attack !== null && player.attack.kind === "spin") {
        sawSpin = true;
      }
    }
    expect(sawSpin).toBe(false);
  });

  it("does not swing when dead", function () {
    player.takeDamage(player.maxHealth);
    player.update(room, { meleeHeld: true });
    expect(player.attack).toBeNull();
  });
});

describe("Spin plan", function () {
  it("reaches farther and hits harder than a normal swing", function () {
    const stats = getMeleeStats(null);
    const swingPlan = makeSwingPlan(stats, 0);
    const spinPlan = makeSpinPlan(stats);
    expect(spinPlan.reach).toBeGreaterThan(swingPlan.reach);
    expect(spinPlan.damage).toBeGreaterThan(swingPlan.damage);
    expect(spinPlan.arc).toBe(360);
  });
});
