describe("moveWithCollision", function () {
  let room;

  beforeEach(function () {
    room = new NormalRoom(32, 64, 160, 160); // floor: x 48-176, y 80-208
  });

  it("moves freely on open floor", function () {
    const p = new Player(100, 100);
    moveWithCollision(p, 2, -3, room);
    expect(p.pos.x).toBe(102);
    expect(p.pos.y).toBe(97);
  });

  it("snaps against the right wall", function () {
    const p = new Player(159, 100);
    moveWithCollision(p, 2, 0, room);
    expect(p.pos.x).toBe(160);
  });

  it("snaps against the left wall", function () {
    const p = new Player(49, 100);
    moveWithCollision(p, -2, 0, room);
    expect(p.pos.x).toBe(48);
  });

  it("snaps against the top wall", function () {
    const p = new Player(100, 81);
    moveWithCollision(p, 0, -2, room);
    expect(p.pos.y).toBe(80);
  });

  it("snaps against the bottom wall", function () {
    const p = new Player(100, 191);
    moveWithCollision(p, 0, 2, room);
    expect(p.pos.y).toBe(192);
  });

  it("slides along a wall on diagonal movement", function () {
    const p = new Player(159, 100);
    moveWithCollision(p, 2, 2, room);
    expect(p.pos.x).toBe(160);
    expect(p.pos.y).toBe(102);
  });

  it("is not colliding after it snaps", function () {
    const p = new Player(159, 100);
    moveWithCollision(p, 2, 0, room);
    expect(room.collidesWithWall(p.getBounds())).toBe(false);
  });

  it("handles non-square entities", function () {
    const e = new Enemy(140, 100);
    e.length = 32;
    e.width = 16;
    moveWithCollision(e, 5, 0, room);
    expect(e.pos.x).toBe(144); // 176 - 32
  });
});
