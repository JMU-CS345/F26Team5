// The snow behind everything: how flakes are made and how they fall.
// Shared helpers live in helpers.js.

describe("Snow", function () {
  const W = 1280;
  const H = 720;

  it("makes the flakes anywhere on screen, or just above the top", function () {
    const rng = makeRng(7);
    for (let i = 0; i < 200; i++) {
      const flake = makeSnowflake(rng, W, H);
      expect(flake.x).toBeGreaterThanOrEqual(0);
      expect(flake.x).toBeLessThan(W);
      expect(flake.y).toBeGreaterThanOrEqual(0);
      expect(flake.y).toBeLessThan(H);
    }
    expect(makeSnowflake(rng, W, H, false).y).toBeLessThan(0);
  });

  it("makes near flakes faster, bigger and brighter than far ones", function () {
    const rng = makeRng(11);
    const flakes = [];
    for (let i = 0; i < 300; i++) {
      flakes.push(makeSnowflake(rng, W, H));
    }
    flakes.sort((a, b) => a.depth - b.depth);
    const far = flakes[0];
    const near = flakes[flakes.length - 1];
    expect(near.speed).toBeGreaterThan(far.speed);
    expect(near.size).toBeGreaterThanOrEqual(far.size);
    expect(near.alpha).toBeGreaterThan(far.alpha);
    for (const flake of flakes) {
      expect(flake.speed).toBeGreaterThanOrEqual(SNOW.minSpeed);
      expect(flake.speed).toBeLessThanOrEqual(SNOW.maxSpeed);
      expect(flake.alpha).toBeLessThanOrEqual(255);
      expect([1, 2, 3]).toContain(flake.size);
    }
  });

  it("falls straight down at its own speed, whatever the wobble", function () {
    const rng = makeRng(3);
    const flake = makeSnowflake(rng, W, H);
    flake.y = 100;
    stepSnowflake(flake, 0, W, H, rng);
    expect(flake.y).toBeCloseTo(100 + flake.speed);
  });

  it("drifts with the wind on average and wobbles side to side", function () {
    const rng = makeRng(5);
    const flake = makeSnowflake(rng, 100000, 100000);
    flake.x = 50000;
    flake.y = 0;
    const start = flake.x;
    const steps = [];
    for (let frame = 0; frame < 600; frame++) {
      const before = flake.x;
      stepSnowflake(flake, frame, 100000, 100000, rng);
      steps.push(flake.x - before);
    }
    expect(flake.x).toBeGreaterThan(start); // the wind carries it right
    expect(Math.max(...steps)).toBeGreaterThan(Math.min(...steps)); // and it wobbles
  });

  it("comes back in at the top, somewhere new, after falling off the bottom", function () {
    const rng = makeRng(9);
    const flake = makeSnowflake(rng, W, H);
    flake.y = H - 0.1;
    flake.speed = 1;
    const oldX = flake.x;
    stepSnowflake(flake, 0, W, H, rng);
    expect(flake.y).toBeLessThan(0);
    expect(flake.x).not.toBe(oldX);
    expect(flake.x).toBeGreaterThanOrEqual(0);
    expect(flake.x).toBeLessThan(W);
  });

  it("wraps round the sides", function () {
    const rng = makeRng(13);
    const right = makeSnowflake(rng, W, H);
    right.x = W - 0.01;
    right.y = 10;
    stepSnowflake(right, 0, W, H, rng);
    expect(right.x).toBeLessThan(W);
    expect(right.x).toBeGreaterThanOrEqual(0);
    const left = makeSnowflake(rng, W, H);
    left.x = 0;
    left.y = 10;
    left.phase = -Math.PI / 2; // wobbling left, harder than the wind pushes right
    left.depth = 1;
    stepSnowflake(left, 0, W, H, rng);
    expect(left.x).toBeGreaterThanOrEqual(0);
    expect(left.x).toBeLessThan(W);
  });

  it("keeps every flake on screen however long it falls", function () {
    const rng = makeRng(21);
    const flakes = [];
    for (let i = 0; i < SNOW.count; i++) {
      flakes.push(makeSnowflake(rng, W, H));
    }
    for (let frame = 0; frame < 3000; frame++) {
      for (const flake of flakes) {
        stepSnowflake(flake, frame, W, H, rng);
      }
    }
    for (const flake of flakes) {
      expect(flake.x).toBeGreaterThanOrEqual(0);
      expect(flake.x).toBeLessThan(W);
      expect(flake.y).toBeLessThanOrEqual(H);
    }
  });

  it("has a gradient from a darker top to a lighter bottom, both dark blues", function () {
    for (let i = 0; i < 3; i++) {
      expect(BACKGROUND_BOTTOM[i]).toBeGreaterThanOrEqual(BACKGROUND_TOP[i]);
    }
    expect(BACKGROUND_BOTTOM[2]).toBeGreaterThan(BACKGROUND_BOTTOM[0]); // blue, not red
    expect(BACKGROUND_TOP[2]).toBeGreaterThan(BACKGROUND_TOP[0]);
  });
});
