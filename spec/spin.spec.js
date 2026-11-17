describe("Tap to swing, hold to spin", function () {
  let room;
  let player;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 400);
    player = new Player(200, 200, "Fire");
    player.setAim(new p5.Vector(1, 0));
  });

  // Runs frames and returns the kinds of the attacks that started, in order.
  function run(frames, held) {
    const kinds = [];
    let last = null;
    for (let i = 0; i < frames; i++) {
      player.update(room, { meleeHeld: held });
      if (player.attack !== null && player.attack !== last) {
        kinds.push(player.attack.kind);
      }
      last = player.attack;
    }
    return kinds;
  }

  it("a short tap makes one normal swing when the key comes up", function () {
    expect(run(3, true)).toEqual([]);
    expect(run(30, false)).toEqual(["swing"]);
  });

  it("a press that is gone within one frame still swings", function () {
    player.pressMelee();
    expect(run(30, false)).toEqual(["swing"]);
  });

  it("holding spins once and does not swing first", function () {
    const kinds = run(SPIN_HOLD_FRAMES + 60, true);
    expect(kinds).toEqual(["spin"]);
  });

  it("does not swing or spin again when the key is released after a spin", function () {
    run(SPIN_HOLD_FRAMES + 40, true);
    expect(run(60, false)).toEqual([]);
  });

  it("can spin again after the key comes up and goes down", function () {
    run(SPIN_HOLD_FRAMES + 40, true);
    run(30, false);
    expect(run(SPIN_HOLD_FRAMES + 5, true)).toEqual(["spin"]);
  });

  it("two quick taps chain into the combo", function () {
    const steps = [];
    for (let tap = 0; tap < 2; tap++) {
      for (let i = 0; i < 20; i++) {
        player.update(room, { meleeHeld: i < 3 });
        if (player.attack !== null && steps[steps.length - 1] !== player.attack.step) {
          steps.push(player.attack.step);
        }
      }
    }
    expect(steps).toEqual([0, 1]);
  });

  it("does not swing or spin when dead", function () {
    player.takeDamage(player.maxHealth);
    player.pressMelee();
    expect(run(SPIN_HOLD_FRAMES + 10, true)).toEqual([]);
    expect(run(30, false)).toEqual([]);
  });
});
