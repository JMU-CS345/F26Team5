describe("tile types", () => {
  it("has properties for every tile type", () => {
    for (const type of Object.values(TILE)) {
      expect(TILE_PROPERTIES[type]).toBeDefined();
    }
  });

  it("keeps floor as 0 and wall as 1, which existing rooms use", () => {
    expect(TILE.FLOOR).toBe(0);
    expect(TILE.WALL).toBe(1);
  });
});

describe("room tiles", () => {
  let room;
  beforeEach(() => {
    room = new NormalRoom(0, 0, 160, 160); // 10x10 tiles with a wall border
  });

  it("has walls on the border and floor inside", () => {
    expect(room.getTile(0, 0)).toBe(TILE.WALL);
    expect(room.getTile(9, 9)).toBe(TILE.WALL);
    expect(room.getTile(1, 1)).toBe(TILE.FLOOR);
  });

  it("counts anything outside the room as wall", () => {
    expect(room.getTile(-1, 3)).toBe(TILE.WALL);
    expect(room.getTile(3, 99)).toBe(TILE.WALL);
  });

  it("finds the tile under a pixel position", () => {
    expect(room.tileAtPixel(24, 24)).toBe(TILE.FLOOR);
    expect(room.tileAtPixel(4, 4)).toBe(TILE.WALL);
  });

  it("blocks walking on walls, pits, closed doors and interior walls only", () => {
    room.tileGrid[3][3] = TILE.PIT;
    room.tileGrid[3][4] = TILE.DOOR_CLOSED;
    room.tileGrid[3][5] = TILE.DOOR_OPEN;
    room.tileGrid[3][6] = TILE.INTERIOR_WALL;
    expect(room.isWallAt(3 * 16, 3 * 16)).toBe(true);
    expect(room.isWallAt(4 * 16, 3 * 16)).toBe(true);
    expect(room.isWallAt(5 * 16, 3 * 16)).toBe(false);
    expect(room.isWallAt(6 * 16, 3 * 16)).toBe(true);
    expect(room.isWallAt(2 * 16, 3 * 16)).toBe(false);
  });
});