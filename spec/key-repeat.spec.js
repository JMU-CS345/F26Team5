describe("KeyRepeat", function () {
  // Frames, counted from the first update with the key down, where the move repeats.
  function repeatFrames(repeat, frameCount) {
    const frames = [];
    for (let frame = 0; frame < frameCount; frame++) {
      if (repeat.update(true)) {
        frames.push(frame);
      }
    }
    return frames;
  }

  it("does nothing while the key is up", function () {
    const repeat = new KeyRepeat();
    expect(repeat.update(false)).toBe(false);
    expect(repeat.update(false)).toBe(false);
  });

  it("waits 12 frames, then repeats every 4", function () {
    const frames = repeatFrames(new KeyRepeat(), 30);
    // update number 13 is held = 12, the first repeat
    expect(frames).toEqual([12, 16, 20, 24, 28]);
  });

  it("starts the delay over after the key is released", function () {
    const repeat = new KeyRepeat();
    repeatFrames(repeat, 20);
    repeat.update(false);
    expect(repeatFrames(repeat, 13)).toEqual([12]);
  });

  it("uses the timing it is given", function () {
    expect(repeatFrames(new KeyRepeat(2, 3), 10)).toEqual([2, 5, 8]);
  });

  it("defaults to 12 and 4", function () {
    expect(REPEAT_FIRST_FRAMES).toBe(12);
    expect(REPEAT_EVERY_FRAMES).toBe(4);
  });

  it("walks a long list down at the repeat rate", function () {
    const menu = new Menu(["A", "B", "C", "D", "E", "F"].map((name) => ({ label: name })));
    const repeat = new KeyRepeat();
    for (let frame = 0; frame < 24; frame++) {
      if (repeat.update(true)) {
        menu.next();
      }
    }
    expect(menu.index).toBe(3);
  });
});
