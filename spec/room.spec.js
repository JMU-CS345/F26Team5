
describe("NormalRoom", function () {
  let room;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 480);
  });

  it("inherits from Room", function () {
    expect(room instanceof Room).toBe(true);
  });

  it("uses 16x16 tiles", function () {
    expect(room.tileSize).toBe(16);
  });

  it("throws if its size is not a multiple of the tile size", function () {
    expect(() => new NormalRoom(0, 0, 100, 96)).toThrow();
    expect(() => new NormalRoom(0, 0, 96, 100)).toThrow();
  });

  it("creates 30 rows and 40 columns", function () {
    expect(room.tileGrid.length).toBe(30);

    for (const row of room.tileGrid) {
      expect(row.length).toBe(40);
    }
  });

  it("generates walls along all four edges", function () {
    const rows = room.tileGrid.length;
    const columns = room.tileGrid[0].length;

    for (let x = 0; x < columns; x++) {
      expect(room.tileGrid[0][x]).toBe(1);
      expect(room.tileGrid[rows - 1][x]).toBe(1);
    }

    for (let y = 0; y < rows; y++) {
      expect(room.tileGrid[y][0]).toBe(1);
      expect(room.tileGrid[y][columns - 1]).toBe(1);
    }
  });

  it("generates floor tiles inside the room", function () {
    for (let y = 1; y < 29; y++) {
      for (let x = 1; x < 39; x++) {
        expect(room.tileGrid[y][x]).toBe(0);
      }
    }
  });

  it("generates exactly 136 wall tiles", function () {
    const wallCount = room.tileGrid
      .flat()
      .filter((tile) => tile === 1)
      .length;

    expect(wallCount).toBe(136);
  });
});

describe("Room wall collision", function () {
  let room;

  beforeEach(function () {
    room = new NormalRoom(0, 0, 640, 480);
  });

  it("does not collide inside the room", function () {
    const bounds = { x: 100, y: 100, w: 16, h: 16 };

    expect(room.collidesWithWall(bounds)).toBe(false);
  });

  it("detects collisions with all four walls", function () {
    expect(room.collidesWithWall({
      x: 10, y: 100, w: 16, h: 16
    })).toBe(true);

    expect(room.collidesWithWall({
      x: 620, y: 100, w: 16, h: 16
    })).toBe(true);

    expect(room.collidesWithWall({
      x: 100, y: 10, w: 16, h: 16
    })).toBe(true);

    expect(room.collidesWithWall({
      x: 100, y: 460, w: 16, h: 16
    })).toBe(true);
  });

  it("allows objects to touch walls without overlapping", function () {
    expect(room.collidesWithWall({
      x: 16, y: 16, w: 16, h: 16
    })).toBe(false);

    expect(room.collidesWithWall({
      x: 608, y: 448, w: 16, h: 16
    })).toBe(false);
  });

  it("detects projectile-sized collisions", function () {
    const projectile = { x: 12, y: 100, w: 8, h: 8 };

    expect(room.collidesWithWall(projectile)).toBe(true);
  });
});

describe("Room position", function () {
  let room;

  beforeEach(function () {
    room = new NormalRoom(32, 64, 576, 400);
  });

  it("finds walls relative to the room's own position", function () {
    expect(room.isWallAt(32 + 4, 64 + 100)).toBe(true);    // left wall tile
    expect(room.isWallAt(32 + 100, 64 + 100)).toBe(false); // floor
  });

  it("treats anything outside the room as wall", function () {
    expect(room.isWallAt(4, 4)).toBe(true);
    expect(room.isWallAt(32 + 576 + 1, 64 + 100)).toBe(true);
  });
});

describe("Room collision integration", function () {
  let room;

  beforeEach(function () {
    room = new NormalRoom(32, 64, 576, 400);
  });

  it("stops the player at the left wall", function () {
    const player = new Player(48, 100);
    player.move(new p5.Vector(-1, 0), room);
    expect(player.pos.x).toBe(48);
  });

  it("stops the player at the right wall", function () {
    const player = new Player(576, 100);
    player.move(new p5.Vector(1, 0), room);
    expect(player.pos.x).toBe(576);
  });

  it("destroys projectiles when they hit a wall", function () {
    const projectile = new Projectile(55, 100, new p5.Vector(-1, 0));
    projectile.update(room);
    expect(projectile.alive).toBe(false);
  });

  it("keeps projectiles alive inside the room", function () {
    const projectile = new Projectile(320, 240, new p5.Vector(1, 0));
    projectile.update(room);
    expect(projectile.alive).toBe(true);
  });
});
