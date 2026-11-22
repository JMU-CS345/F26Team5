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

  it("blocks walking on walls, closed doors and interior walls only", () => {
    room.tileGrid[3][3] = TILE.PIT;
    room.tileGrid[3][4] = TILE.DOOR_CLOSED;
    room.tileGrid[3][5] = TILE.DOOR_OPEN;
    room.tileGrid[3][6] = TILE.INTERIOR_WALL;
    expect(room.isWallAt(3 * 16, 3 * 16)).toBe(false); // a pit is not a wall, you fall into it
    expect(room.isWallAt(4 * 16, 3 * 16)).toBe(true);
    expect(room.isWallAt(5 * 16, 3 * 16)).toBe(false);
    expect(room.isWallAt(6 * 16, 3 * 16)).toBe(true);
    expect(room.isWallAt(2 * 16, 3 * 16)).toBe(false);
  });
});

describe("getPitVariant", () => {
  let room;
  beforeEach(() => {
    room = new NormalRoom(0, 0, 160, 160);
  });

  it("gives a lip on both edges to a pit with nothing above or below it", () => {
    room.setTile(4, 4, TILE.PIT);
    expect(getPitVariant(room, 4, 4)).toBe(3);
  });

  it("gives only a top lip when there is pit below", () => {
    room.setTile(4, 4, TILE.PIT);
    room.setTile(4, 5, TILE.PIT);
    expect(getPitVariant(room, 4, 4)).toBe(1);
  });

  it("gives only a bottom lip when there is pit above", () => {
    room.setTile(4, 4, TILE.PIT);
    room.setTile(4, 3, TILE.PIT);
    expect(getPitVariant(room, 4, 4)).toBe(2);
  });

  it("gives no lip in the middle of a pit", () => {
    for (const row of [3, 4, 5]) {
      room.setTile(4, row, TILE.PIT);
    }
    expect(getPitVariant(room, 4, 4)).toBe(0);
  });

  it("ignores pit to the left and right", () => {
    room.setTile(3, 4, TILE.PIT);
    room.setTile(4, 4, TILE.PIT);
    room.setTile(5, 4, TILE.PIT);
    expect(getPitVariant(room, 4, 4)).toBe(3);
  });
});

describe("getDoorSprite", () => {
  let room;
  const addDoor = (side, tiles, type) => {
    for (const t of tiles) {
      room.setTile(t.col, t.row, type);
    }
    room.exits.push({ side, tiles, toId: 1, doorIndex: 0, toDoor: 0 });
  };
  beforeEach(() => {
    room = new NormalRoom(0, 0, 160, 160);
  });

  it("gives the left and right pieces of an open north door", () => {
    addDoor("N", [{ col: 4, row: 0 }, { col: 5, row: 0 }], TILE.DOOR_OPEN);
    expect(getDoorSprite(room, 4, 0)).toEqual({ col: 4, row: 1 });
    expect(getDoorSprite(room, 5, 0)).toEqual({ col: 6, row: 1 });
  });

  it("gives the closed pieces once the door is shut", () => {
    addDoor("N", [{ col: 4, row: 0 }, { col: 5, row: 0 }], TILE.DOOR_OPEN);
    room.closeDoors();
    expect(getDoorSprite(room, 4, 0)).toEqual({ col: 0, row: 1 });
    expect(getDoorSprite(room, 5, 0)).toEqual({ col: 2, row: 1 });
  });

  it("gives the top and bottom pieces of an east door, whatever order the tiles are listed in", () => {
    addDoor("E", [{ col: 9, row: 5 }, { col: 9, row: 4 }], TILE.DOOR_CLOSED);
    expect(getDoorSprite(room, 9, 4)).toEqual({ col: 0, row: 0 });
    expect(getDoorSprite(room, 9, 5)).toEqual({ col: 2, row: 0 });
  });

  it("has a different set of pieces for each of the four sides", () => {
    const seen = new Set();
    for (const side of ["N", "S", "E", "W"]) {
      for (const state of ["closed", "open"]) {
        for (const piece of DOOR_SPRITES[side][state]) {
          seen.add(piece.join(","));
        }
      }
    }
    expect(seen.size).toBe(16); // every cell of the 8x2 sheet is used once
  });

  it("gives nothing for walls or for door tiles that lead nowhere", () => {
    expect(getDoorSprite(room, 0, 0)).toBeNull();
    room.setTile(4, 0, TILE.DOOR_OPEN); // no exit recorded for it
    expect(getDoorSprite(room, 4, 0)).toBeNull();
  });
});

describe("pits", () => {
  let room;
  beforeEach(() => {
    room = new NormalRoom(0, 0, 160, 160);
    room.setTile(4, 4, TILE.PIT); // pixels 64 to 79
  });

  it("are hazards, not walls", () => {
    expect(TILE_PROPERTIES[TILE.PIT].solid).toBe(false);
    expect(TILE_PROPERTIES[TILE.PIT].hazard).toBe(true);
    expect(room.isWallAt(70, 70)).toBe(false);
    expect(room.isPitAt(70, 70)).toBe(true);
    expect(room.isPitAt(50, 70)).toBe(false);
  });

  it("are not somewhere a thing can stand", () => {
    expect(room.canStandAt(4, 4)).toBe(false);
    expect(room.canStandAt(3, 4)).toBe(true);
    expect(room.canStandAt(3, 3, 2, 2)).toBe(false); // a 2x2 thing that covers the pit
  });

  it("are listed for a box that covers them", () => {
    expect(room.pitTilesUnder({ x: 60, y: 60, w: 16, h: 16 })).toEqual(["4,4"]);
    expect(room.overlapsPit({ x: 60, y: 60, w: 16, h: 16 })).toBe(true);
    expect(room.overlapsPit({ x: 40, y: 40, w: 16, h: 16 })).toBe(false);
  });

  it("do not block line of sight", () => {
    expect(room.hasLineOfSight(40, 72, 120, 72)).toBe(true);
  });
});
