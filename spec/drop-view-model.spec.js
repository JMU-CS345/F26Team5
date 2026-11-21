describe("drop moment", function () {
  const potionDrop = () => new ItemDrop(0, 0, new Consumable({ id: "p", name: "P" }));

  it("hops up when it lands, then settles", function () {
    const drop = potionDrop();
    expect(drop.bounceOffset).toBeCloseTo(0); // age 0 is the start of the hop
    let highest = 0;
    for (let frame = 0; frame < ITEM_DROP_BOUNCE_FRAMES; frame++) {
      drop.update();
      highest = Math.min(highest, drop.bounceOffset);
      expect(drop.bounceOffset).toBeLessThanOrEqual(0);
    }
    expect(highest).toBeLessThan(-4);
    expect(drop.bounceOffset).toBe(0);
    for (let frame = 0; frame < 100; frame++) {
      drop.update();
      expect(drop.bounceOffset).toBe(0);
    }
  });

  it("hops lower each time", function () {
    const first = potionDrop();
    const late = potionDrop();
    first.age = 7; // top of the first hop
    late.age = 22; // top of the second hop
    expect(Math.abs(late.bounceOffset)).toBeLessThan(Math.abs(first.bounceOffset));
  });
});

describe("clearRewardPoint", function () {
  const room = { x: 100, y: 100, width: 200, height: 160 };

  it("uses room.lastKillPos when the room tracks it", function () {
    const point = clearRewardPoint({ ...room, lastKillPos: { x: 150, y: 120 } }, { x: 1, y: 1 });
    expect(point).toEqual({ x: 150, y: 120 });
  });

  it("falls back to the last kill the caller saw", function () {
    expect(clearRewardPoint(room, { x: 220, y: 200 })).toEqual({ x: 220, y: 200 });
  });

  it("uses the middle of the room with no kill, or a kill from another room", function () {
    expect(clearRewardPoint(room, null)).toEqual({ x: 200, y: 180 });
    expect(clearRewardPoint(room, { x: 5, y: 5 })).toEqual({ x: 200, y: 180 });
    expect(clearRewardPoint(room, { x: 500, y: 150 })).toEqual({ x: 200, y: 180 });
  });
});
