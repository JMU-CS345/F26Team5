// Rooms, tiles, room templates and dungeon generation.
// Shared helpers live in helpers.js.

// ===== from room.spec.js =====
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

describe("getWallVariant", () => {
  let room;
  beforeEach(() => {
    room = new NormalRoom(0, 0, 160, 160); // 10x10 tiles with a wall border
  });

  it("picks straight walls by which side the floor is on", () => {
    expect(getWallVariant(room, 5, 0)).toBe("open-s");
    expect(getWallVariant(room, 5, 9)).toBe("open-n");
    expect(getWallVariant(room, 0, 5)).toBe("open-e");
    expect(getWallVariant(room, 9, 5)).toBe("open-w");
  });

  it("picks the room's four corners", () => {
    expect(getWallVariant(room, 0, 0)).toBe("diag-se");
    expect(getWallVariant(room, 9, 0)).toBe("diag-sw");
    expect(getWallVariant(room, 0, 9)).toBe("diag-ne");
    expect(getWallVariant(room, 9, 9)).toBe("diag-nw");
  });

  it("picks corners for a block of wall sticking into the room", () => {
    for (let c = 4; c <= 6; c++) {
      for (let r = 4; r <= 5; r++) {
        room.tileGrid[r][c] = TILE.WALL;
      }
    }
    expect(getWallVariant(room, 4, 4)).toBe("open-nw");
    expect(getWallVariant(room, 5, 4)).toBe("open-n");
    expect(getWallVariant(room, 6, 4)).toBe("open-ne");
    expect(getWallVariant(room, 4, 5)).toBe("open-sw");
    expect(getWallVariant(room, 5, 5)).toBe("open-s");
    expect(getWallVariant(room, 6, 5)).toBe("open-se");
  });

  it("is solid when no floor is around it", () => {
    for (let c = 3; c <= 5; c++) {
      for (let r = 3; r <= 5; r++) {
        room.tileGrid[r][c] = TILE.WALL;
      }
    }
    expect(getWallVariant(room, 4, 4)).toBe("solid");
  });

  it("treats doors as part of the wall", () => {
    room.tileGrid[0][5] = TILE.DOOR_CLOSED;
    expect(getWallVariant(room, 4, 0)).toBe("open-s");
  });

  it("treats pits and interior walls as open space", () => {
    room.tileGrid[1][5] = TILE.PIT;
    expect(getWallVariant(room, 5, 0)).toBe("open-s");
    room.tileGrid[1][5] = TILE.INTERIOR_WALL;
    expect(getWallVariant(room, 5, 0)).toBe("open-s");
  });
});

describe("Room tile editing and exits", () => {
  let room;
  beforeEach(() => {
    room = new NormalRoom(32, 64, 160, 160); // 10x10 tiles, drawn at pixel (32, 64)
  });

  it("knows its size in tiles", () => {
    expect(room.cols).toBe(10);
    expect(room.rows).toBe(10);
  });

  it("changes a tile with setTile", () => {
    expect(room.setTile(3, 4, TILE.PIT)).toBe(true);
    expect(room.getTile(3, 4)).toBe(TILE.PIT);
  });

  it("counts tile changes in tileVersion, so the view knows to redraw", () => {
    expect(room.tileVersion).toBe(0);
    room.setTile(3, 4, TILE.PIT);
    expect(room.tileVersion).toBe(1);
    room.setTile(3, 4, TILE.PIT); // the same tile again changes nothing
    expect(room.tileVersion).toBe(1);
  });

  it("ignores setTile outside the room", () => {
    expect(room.setTile(-1, 0, TILE.PIT)).toBe(false);
    expect(room.setTile(0, 10, TILE.PIT)).toBe(false);
    expect(room.setTile(10, 0, TILE.PIT)).toBe(false);
  });

  it("starts with no exits", () => {
    expect(room.exits).toEqual([]);
    expect(room.getExitAt(40, 70)).toBeNull();
  });

  it("finds the exit under a pixel, relative to the room's own position", () => {
    const exit = { side: "N", tiles: [{ col: 4, row: 0 }, { col: 5, row: 0 }], toId: 1, screenStart: 4 };
    room.exits.push(exit);
    expect(room.getExitAt(32 + 4 * 16 + 2, 64 + 3)).toBe(exit); // first door tile
    expect(room.getExitAt(32 + 5 * 16 + 2, 64 + 3)).toBe(exit); // second door tile
    expect(room.getExitAt(32 + 3 * 16 + 2, 64 + 3)).toBeNull(); // wall beside the door
    expect(room.getExitAt(32 + 4 * 16 + 2, 64 + 16 + 3)).toBeNull(); // floor just inside
  });
});


// ===== from tiles.spec.js =====
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

describe("getDoorPiece and the door art", () => {
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

  it("names the left and right pieces of an open north door", () => {
    addDoor("N", [{ col: 4, row: 0 }, { col: 5, row: 0 }], TILE.DOOR_OPEN);
    expect(getDoorPiece(room, 4, 0)).toEqual({ side: "N", closed: false, index: 0 });
    expect(getDoorPiece(room, 5, 0)).toEqual({ side: "N", closed: false, index: 1 });
  });

  it("says closed once the door is shut", () => {
    addDoor("N", [{ col: 4, row: 0 }, { col: 5, row: 0 }], TILE.DOOR_OPEN);
    room.closeDoors();
    expect(getDoorPiece(room, 4, 0).closed).toBe(true);
    expect(getDoorPiece(room, 5, 0).closed).toBe(true);
  });

  it("names the top and bottom pieces of an east door, whatever order the tiles are listed in", () => {
    addDoor("E", [{ col: 9, row: 5 }, { col: 9, row: 4 }], TILE.DOOR_CLOSED);
    expect(getDoorPiece(room, 9, 4)).toEqual({ side: "E", closed: true, index: 0 });
    expect(getDoorPiece(room, 9, 5)).toEqual({ side: "E", closed: true, index: 1 });
  });

  it("gives nothing for walls or for door tiles that lead nowhere", () => {
    expect(getDoorPiece(room, 0, 0)).toBeNull();
    room.setTile(4, 0, TILE.DOOR_OPEN); // no exit recorded for it
    expect(getDoorPiece(room, 4, 0)).toBeNull();
  });

  it("finds each door piece on the sheet", () => {
    expect(doorArtCell({ side: "N", closed: false, index: 0 })).toEqual([4, 1]);
    expect(doorArtCell({ side: "N", closed: false, index: 1 })).toEqual([6, 1]);
    expect(doorArtCell({ side: "N", closed: true, index: 0 })).toEqual([0, 1]);
    expect(doorArtCell({ side: "E", closed: true, index: 1 })).toEqual([2, 0]);
  });

  it("uses every cell of the 8x2 door sheet once", () => {
    const seen = new Set();
    for (const side of ["N", "S", "E", "W"]) {
      for (const closed of [true, false]) {
        for (const index of [0, 1]) {
          seen.add(doorArtCell({ side, closed, index }).join(","));
        }
      }
    }
    expect(seen.size).toBe(16);
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


// ===== from room-templates.spec.js =====
describe("ROOM_TEMPLATES (the pre-made rooms)", function () {
  it("has no problems", function () {
    expect(validateRoomTemplates(ROOM_TEMPLATES)).toEqual([]);
  });

  it("has at least one start room, one boss room and a few normal rooms", function () {
    const count = (role) => ROOM_TEMPLATES.filter((t) => t.role === role).length;
    expect(count("start")).toBeGreaterThanOrEqual(1);
    expect(count("boss")).toBeGreaterThanOrEqual(1);
    expect(count("normal")).toBeGreaterThanOrEqual(5);
  });

  it("has doors on every side somewhere, so rooms can be placed in any direction", function () {
    for (const side of ["N", "E", "S", "W"]) {
      const found = ROOM_TEMPLATES.some((t) => parseRoomTemplate(t).doors.some((d) => d.side === side));
      expect(found).withContext(side).toBe(true);
    }
  });

  for (const template of ROOM_TEMPLATES) {
    describe(template.name, function () {
      let room;
      beforeEach(function () {
        room = new TemplateRoom(0, 0, parseRoomTemplate(template));
      });

      it("has at least one door", function () {
        expect(room.doors.length).toBeGreaterThan(0);
      });

      it("has no enemy standing in a wall", function () {
        room.spawnEnemies();
        for (const enemy of room.enemies) {
          expect(room.collidesWithWall(enemy.getBounds()))
            .withContext(enemy.typeName + " at " + enemy.pos.x + "," + enemy.pos.y)
            .toBe(false);
        }
      });

      it("has a start spot on open floor if it is a start room", function () {
        if (template.role !== "start") {
          return;
        }
        const spawn = room.getPlayerSpawn();
        const box = { x: spawn.x - 8, y: spawn.y - 8, w: 16, h: 16 };
        expect(room.collidesWithWall(box)).toBe(false);
      });

      it("has a boss in it if it is a boss room", function () {
        if (template.role === "boss") {
          expect(room.template.spawns.some((s) => ENEMY_TYPES[s.type].boss)).toBe(true);
        }
      });
    });
  }
});

describe("validateRoomTemplates", function () {
  // A small good room to break one thing at a time. Its only door is on the north wall.
  const good = {
    name: "test",
    role: "normal",
    rows: [
      "####++####",
      "#........#",
      "#........#",
      "#........#",
      "#........#",
      "#........#",
      "#........#",
      "#........#",
      "#........#",
      "##########"
    ]
  };
  function with_(changes) {
    return [{ ...good, ...changes }];
  }
  function withRow(index, text) {
    const rows = good.rows.slice();
    rows[index] = text;
    return with_({ rows });
  }

  it("accepts a good room", function () {
    expect(validateRoomTemplates([good])).toEqual([]);
  });

  it("names the room in every problem", function () {
    const problems = validateRoomTemplates(withRow(4, "#...?....#"));
    expect(problems.length).toBe(1);
    expect(problems[0]).toContain("test");
  });

  it("catches rows of different lengths", function () {
    expect(validateRoomTemplates(withRow(4, "#.......#")).length).toBe(1);
  });

  it("catches a room that is too small or too big", function () {
    expect(validateRoomTemplates(with_({ rows: ["##++", "#..#", "#..#", "####"] })).length).toBe(1);
    const huge = good.rows.map((r) => r + r + r + r + r);
    expect(validateRoomTemplates(with_({ rows: huge })).length).toBe(1);
  });

  it("catches an unknown character", function () {
    expect(validateRoomTemplates(withRow(4, "#...?....#")).length).toBe(1);
  });

  it("catches a hole in the outer wall", function () {
    expect(validateRoomTemplates(withRow(5, ".........#")).length).toBe(1);
  });

  it("catches floor that is cut off from the rest", function () {
    const rows = good.rows.slice();
    rows[1] = "#.x......#";
    rows[2] = "#xx......#";
    expect(validateRoomTemplates(with_({ rows })).length).toBe(1);
  });

  it("needs at least one door", function () {
    expect(validateRoomTemplates(withRow(0, "##########")).length).toBe(1);
  });

  it("catches a door that is not 2 tiles wide", function () {
    expect(validateRoomTemplates(withRow(0, "####+#####")).length).toBe(1);
    expect(validateRoomTemplates(withRow(0, "###+++####")).length).toBe(1);
    expect(validateRoomTemplates(withRow(0, "###++++###")).length).toBe(1);
  });

  it("catches a door with something in front of it", function () {
    expect(validateRoomTemplates(withRow(1, "#...xx...#")).length).toBe(1);
    expect(validateRoomTemplates(withRow(1, "#...JJ...#")).length).toBe(1);
  });

  it("catches a door that is not on the outer wall", function () {
    expect(validateRoomTemplates(withRow(4, "#...+....#")).length).toBe(1);
  });

  it("allows several doors on a wall, and doors on other walls", function () {
    const two = ["##++##++##", ...good.rows.slice(1)];
    expect(validateRoomTemplates(with_({ rows: two }))).toEqual([]);
    const west = good.rows.slice();
    west[4] = "+........#";
    west[5] = "+........#";
    expect(validateRoomTemplates(with_({ rows: west }))).toEqual([]);
  });

  it("catches a bad role and a duplicate or missing name", function () {
    expect(validateRoomTemplates(with_({ role: "shop" })).length).toBeGreaterThan(0);
    expect(validateRoomTemplates([good, good]).length).toBe(1);
    expect(validateRoomTemplates(with_({ name: "" })).length).toBe(1);
  });

  it("wants exactly one @ in a start room and none anywhere else", function () {
    const noStart = [...with_({ role: "start" }), { ...good, name: "other" }];
    expect(validateRoomTemplates(noStart).length).toBe(1);
    expect(validateRoomTemplates(withRow(4, "#...@....#")).length).toBe(1);
    const start = with_({ role: "start", rows: good.rows.map((r, i) => (i === 4 ? "#...@....#" : r)) });
    expect(validateRoomTemplates([...start, { ...good, name: "other" }])).toEqual([]);
  });

  it("needs at least one normal room", function () {
    const boss = with_({ role: "boss" });
    expect(validateRoomTemplates(boss).length).toBe(1);
  });
});

describe("parseRoomTemplate and TemplateRoom", function () {
  const template = {
    name: "tiny",
    role: "start",
    rows: [
      "####++####",
      "#........#",
      "#.J..o...#",
      "#........#",
      "+...x..@.#",
      "+........#",
      "#.Z......#",
      "#........#",
      "#........#",
      "####++####"
    ]
  };
  let parsed;
  let room;
  beforeEach(function () {
    parsed = parseRoomTemplate(template);
    room = new TemplateRoom(32, 64, parsed);
  });

  it("reads the size and role", function () {
    expect(parsed.cols).toBe(10);
    expect(parsed.rows).toBe(10);
    expect(parsed.role).toBe("start");
    expect(room.width).toBe(160);
    expect(room.height).toBe(160);
  });

  it("turns characters into tiles", function () {
    expect(room.getTile(0, 0)).toBe(TILE.WALL);
    expect(room.getTile(1, 1)).toBe(TILE.FLOOR);
    expect(room.getTile(5, 2)).toBe(TILE.PIT);
    expect(room.getTile(4, 4)).toBe(TILE.INTERIOR_WALL);
  });

  it("treats enemy letters and @ as floor", function () {
    expect(room.getTile(2, 2)).toBe(TILE.FLOOR);
    expect(room.getTile(7, 4)).toBe(TILE.FLOOR);
  });

  it("finds the enemy spawns and the player start", function () {
    expect(parsed.spawns).toEqual([
      { type: "Jelly", col: 2, row: 2 },
      { type: "Ghoul", col: 2, row: 6 }
    ]);
    expect(parsed.player).toEqual({ col: 7, row: 4 });
    expect(room.getPlayerSpawn()).toEqual({ x: 32 + 7.5 * 16, y: 64 + 4.5 * 16 });
  });

  it("makes no enemies until spawnEnemies, and only once", function () {
    expect(room.enemies.length).toBe(0);
    room.spawnEnemies();
    room.spawnEnemies();
    expect(room.enemies.length).toBe(2);
  });

  it("puts each enemy in the middle of its tile", function () {
    room.spawnEnemies();
    const jelly = room.enemies[0];
    expect(jelly.typeName).toBe("Jelly");
    expect(jelly.getCenter().x).toBeCloseTo(32 + 2.5 * 16, 5);
    expect(jelly.getCenter().y).toBeCloseTo(64 + 2.5 * 16, 5);
  });

  it("spawns its enemies when the player walks in", function () {
    room.onEnter();
    expect(room.enemies.length).toBe(2);
  });

  it("finds every drawn door, in the order north, east, south, west", function () {
    expect(parsed.doors).toEqual([
      { index: 0, side: "N", start: 4, tiles: [{ col: 4, row: 0 }, { col: 5, row: 0 }] },
      { index: 1, side: "S", start: 4, tiles: [{ col: 4, row: 9 }, { col: 5, row: 9 }] },
      { index: 2, side: "W", start: 4, tiles: [{ col: 0, row: 4 }, { col: 0, row: 5 }] }
    ]);
    expect(room.doors).toBe(parsed.doors);
  });

  it("keeps doors shut until they are opened", function () {
    expect(room.getTile(4, 0)).toBe(TILE.WALL);
    expect(room.exits).toEqual([]);
    expect(room.isWallAt(32 + 4 * 16 + 2, 64 + 2)).toBe(true);
  });

  it("opens a door and records where it leads", function () {
    room.openDoor(parsed.doors[0], 3, 1);
    expect(room.getTile(4, 0)).toBe(TILE.DOOR_OPEN);
    expect(room.getTile(5, 0)).toBe(TILE.DOOR_OPEN);
    expect(room.getTile(4, 9)).toBe(TILE.WALL); // the other doors stay shut
    expect(room.exits.length).toBe(1);
    expect(room.exits[0]).toEqual({ side: "N", tiles: parsed.doors[0].tiles, toId: 3, doorIndex: 0, toDoor: 1 });
    expect(room.isWallAt(32 + 4 * 16 + 2, 64 + 2)).toBe(false);
    expect(room.getExitAt(32 + 4 * 16 + 2, 64 + 2)).toBe(room.exits[0]);
  });

  it("does not share its tiles with the template", function () {
    room.setTile(1, 1, TILE.PIT);
    room.openDoor(parsed.doors[0], 3, 1);
    const fresh = parseRoomTemplate(template);
    expect(fresh.grid[1][1]).toBe(TILE.FLOOR);
    expect(fresh.grid[0][4]).toBe(TILE.WALL);
    expect(parsed.grid[0][4]).toBe(TILE.WALL);
  });
});

describe("TemplateRoom doors close while enemies are alive", function () {
  const makeRoom = (enemyChar) => {
    const parsed = parseRoomTemplate({
      name: "doors",
      role: "normal",
      rows: [
        "####++####",
        "#........#",
        "#...%....#".replace("%", enemyChar),
        "#........#",
        "####++####"
      ]
    });
    const room = new TemplateRoom(0, 0, parsed);
    room.openDoor(parsed.doors[0], 1, 0);
    room.openDoor(parsed.doors[1], 2, 0);
    return room;
  };

  it("shuts the doors when the player walks into a room with enemies", function () {
    const room = makeRoom("J");
    expect(room.getTile(4, 0)).toBe(TILE.DOOR_OPEN);
    room.onEnter();
    for (const [col, row] of [[4, 0], [5, 0], [4, 4], [5, 4]]) {
      expect(room.getTile(col, row)).toBe(TILE.DOOR_CLOSED);
    }
    expect(room.isWallAt(4 * 16 + 2, 2)).toBe(true);
  });

  it("opens the doors again when the room is cleared", function () {
    const room = makeRoom("J");
    room.onEnter();
    room.onClear();
    expect(room.cleared).toBe(true);
    expect(room.getTile(4, 0)).toBe(TILE.DOOR_OPEN);
    expect(room.getTile(5, 4)).toBe(TILE.DOOR_OPEN);
  });

  it("keeps the doors open in a room with no enemies", function () {
    const room = makeRoom(".");
    room.onEnter();
    expect(room.getTile(4, 0)).toBe(TILE.DOOR_OPEN);
  });

  it("keeps the doors open when the player comes back to a cleared room", function () {
    const room = makeRoom("J");
    room.onEnter();
    room.onClear();
    room.onEnter();
    expect(room.getTile(4, 0)).toBe(TILE.DOOR_OPEN);
  });

  it("leaves doors that lead nowhere as walls", function () {
    const parsed = parseRoomTemplate({
      name: "doors",
      role: "normal",
      rows: ["####++####", "#........#", "#...J....#", "#........#", "####++####"]
    });
    const room = new TemplateRoom(0, 0, parsed);
    room.openDoor(parsed.doors[0], 1, 0); // only the north door is used
    room.onEnter();
    expect(room.getTile(4, 0)).toBe(TILE.DOOR_CLOSED);
    expect(room.getTile(4, 4)).toBe(TILE.WALL);
  });
});

describe("validateRoomTemplates for walls that stick into the room", function () {
  const room = (rows) => ({ name: "walls", role: "normal", rows });
  const base = [
    "####++####",
    "#........#",
    "#........#",
    "#........#",
    "#........#",
    "#........#",
    "#........#",
    "####++####"
  ];
  const withRows = (changes) => base.map((row, i) => (changes[i] !== undefined ? changes[i] : row));

  it("accepts a wall block 2 tiles thick that is joined to the outer wall", function () {
    const rows = withRows({ 1: "#.....##.#", 2: "#.....##.#" });
    expect(validateRoomTemplates([room(rows)])).toEqual([]);
  });

  it("rejects a wall only 1 tile thick and says where", function () {
    const rows = withRows({ 1: "#..#.....#", 2: "#..#.....#" });
    expect(validateRoomTemplates([room(rows)])).toEqual([
      "walls: the # at column 3, row 1 is a wall only 1 tile thick; walls inside the room must be at least 2 tiles thick (use x for a 1 tile obstacle)"
    ]);
  });

  it("rejects a 1 tile thick wall that runs sideways too", function () {
    const rows = withRows({ 4: "#.#####..#" });
    expect(validateRoomTemplates([room(rows)]).length).toBe(1);
  });

  it("is fine with the walls and pillars that rooms already use", function () {
    expect(validateRoomTemplates()).toEqual([]);
  });
});


// ===== from dungeon-generator.spec.js =====
// Jasmine specs for the dungeon generator. Needs tile-types.js, room.js, template-room.js,
// room-templates.js and dungeon-generator.js loaded first (see SpecRunner.html).

describe("generateDungeon", () => {
  const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
  const signature = (d) =>
    d.rooms
      .map((r) => [r.template.name, r.worldCol, r.worldRow, r.exits.map((e) => e.doorIndex + ">" + e.toId)].join())
      .join("|");

  function make(seed, extra = {}) {
    return generateDungeon({ seed, roomCount: 12, screenX: 320, screenY: 160, ...extra });
  }

  // A tile on the dungeon map, for comparing rooms.
  const worldTile = (room, tile) => ({ col: room.worldCol + tile.col, row: room.worldRow + tile.row });

  it("makes the same dungeon for the same seed", () => {
    expect(signature(make(7))).toBe(signature(make(7)));
  });

  it("makes a different order and layout for different seeds", () => {
    const signatures = new Set(SEEDS.map((seed) => signature(make(seed))));
    expect(signatures.size).toBeGreaterThan(190);
  });

  it("makes the requested number of rooms", () => {
    for (const seed of SEEDS) {
      expect(make(seed).rooms.length).toBe(12);
    }
    expect(make(1, { roomCount: 1 }).rooms.length).toBe(1);
    expect(make(1, { roomCount: 2 }).rooms.length).toBe(2);
  });

  it("only uses rooms from the pre-made list, at the size they were drawn", () => {
    const names = ROOM_TEMPLATES.map((t) => t.name);
    for (const seed of SEEDS) {
      for (const r of make(seed).rooms) {
        expect(names).toContain(r.template.name);
        expect(r.cols).toBe(r.template.cols);
        expect(r.rows).toBe(r.template.rows);
      }
    }
  });

  it("uses a start room first and a boss room last, with one door into the boss room", () => {
    for (const seed of SEEDS) {
      const d = make(seed);
      expect(d.start.template.role).toBe("start");
      expect(d.start.id).toBe(0);
      expect(d.boss.template.role).toBe("boss");
      expect(d.boss.id).toBe(d.rooms.length - 1);
      expect(d.boss.exits.length).toBe(1);
      expect(d.rooms.filter((r) => r.role === "normal").every((r) => r.template.role === "normal"))
        .toBe(true);
    }
  });

  it("never lets two rooms overlap on the dungeon map", () => {
    for (const seed of SEEDS) {
      const rooms = make(seed).rooms;
      for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
          const a = rooms[i];
          const b = rooms[j];
          const overlap =
            a.worldCol < b.worldCol + b.cols &&
            b.worldCol < a.worldCol + a.cols &&
            a.worldRow < b.worldRow + b.rows &&
            b.worldRow < a.worldRow + a.rows;
          expect(overlap).withContext("seed " + seed + ": " + a.template.name + " / " + b.template.name).toBe(false);
        }
      }
    }
  });

  it("lets every room be reached from the start room", () => {
    for (const seed of SEEDS) {
      const d = make(seed);
      expect(doorDistances(d.rooms, 0).every((n) => n >= 0)).toBe(true);
    }
  });

  it("keeps every room inside its screen", () => {
    for (const seed of SEEDS) {
      for (const r of make(seed).rooms) {
        expect(r.x).toBeGreaterThanOrEqual(320);
        expect(r.y).toBeGreaterThanOrEqual(160);
        expect(r.x + r.width).toBeLessThanOrEqual(320 + SCREEN_COLS * TILE_SIZE);
        expect(r.y + r.height).toBeLessThanOrEqual(160 + SCREEN_ROWS * TILE_SIZE);
      }
    }
  });

  it("opens only doors that were drawn, and leaves the rest as wall", () => {
    for (const seed of SEEDS) {
      for (const r of make(seed).rooms) {
        const opened = new Set();
        for (const exit of r.exits) {
          expect(opened.has(exit.doorIndex)).withContext("door used twice").toBe(false);
          opened.add(exit.doorIndex);
          expect(exit.tiles).toEqual(r.template.doors[exit.doorIndex].tiles);
        }
        for (const door of r.template.doors) {
          const expected = opened.has(door.index) ? TILE.DOOR_OPEN : TILE.WALL;
          for (const t of door.tiles) {
            expect(r.getTile(t.col, t.row)).toBe(expected);
          }
        }
      }
    }
  });

  it("makes every door lead to a door straight across from it in the next room", () => {
    for (const seed of SEEDS) {
      const d = make(seed);
      for (const r of d.rooms) {
        for (const exit of r.exits) {
          const other = d.rooms[exit.toId];
          const back = other.exits.find((e) => e.doorIndex === exit.toDoor);
          expect(back).toBeDefined();
          expect(back.toId).toBe(r.id);
          expect(back.toDoor).toBe(exit.doorIndex);
          expect(back.side).toBe(SIDES[exit.side].opposite);
          // Each wall tile of one door is right next to a wall tile of the other.
          const step = SIDES[exit.side];
          exit.tiles.forEach((t, i) => {
            const here = worldTile(r, t);
            const there = worldTile(other, back.tiles[i]);
            expect(there).toEqual({ col: here.col + step.dx, row: here.row + step.dy });
          });
        }
      }
    }
  });

  it("puts the player on open floor when they come through a door", () => {
    for (const seed of SEEDS) {
      const d = make(seed);
      for (const r of d.rooms) {
        for (const exit of r.exits) {
          const spot = d.entryPoint(r, exit);
          const dest = d.rooms[exit.toId];
          const box = { x: spot.x - 8, y: spot.y - 8, w: 16, h: 16 };
          expect(dest.collidesWithWall(box)).toBe(false);
          expect(dest.getExitAt(spot.x, spot.y)).toBeNull();
        }
      }
    }
  });

  it("sometimes puts several doors on one wall, to the same room or to different rooms", () => {
    let sameRoom = 0;
    let differentRooms = 0;
    for (const seed of SEEDS) {
      for (const r of make(seed).rooms) {
        for (const side of ["N", "E", "S", "W"]) {
          const targets = r.exits.filter((e) => e.side === side).map((e) => e.toId);
          if (targets.length >= 2 && new Set(targets).size === 1) sameRoom++;
          if (new Set(targets).size >= 2) differentRooms++;
        }
      }
    }
    expect(sameRoom).toBeGreaterThan(0);
    expect(differentRooms).toBeGreaterThan(0);
  });

  it("refuses a broken room list and says why", () => {
    expect(() => generateDungeon({ templates: [{ name: "bad", rows: ["##"] }] })).toThrowError(/bad/);
  });

  describe("with small hand-made room lists", () => {
    // A plain room (12x12 unless a size is given) with doors drawn from a list like
    // ["E4", "W4"]: the side, then the tile number along that wall.
    function makeTemplate(name, role, doorList, cols = 12, rows = 12) {
      const g = [];
      for (let r = 0; r < rows; r++) {
        g.push([]);
        for (let c = 0; c < cols; c++) {
          g[r].push(r === 0 || c === 0 || r === rows - 1 || c === cols - 1 ? "#" : ".");
        }
      }
      if (role === "start") g[5][5] = "@";
      for (const spec of doorList) {
        const side = spec[0];
        const start = Number(spec.slice(1));
        for (let i = 0; i < 2; i++) {
          if (side === "N") g[0][start + i] = "+";
          if (side === "S") g[rows - 1][start + i] = "+";
          if (side === "W") g[start + i][0] = "+";
          if (side === "E") g[start + i][cols - 1] = "+";
        }
      }
      return { name, role, rows: g.map((r) => r.join("")) };
    }
    const spare = makeTemplate("spare", "normal", ["N4"]);

    it("puts a room straight across the door, with its own door lined up", () => {
      const start = makeTemplate("s", "start", ["E4"]);
      const boss = makeTemplate("b", "boss", ["W6"]);
      const d = generateDungeon({ seed: 1, roomCount: 2, templates: [start, boss, spare] });
      expect(d.rooms[1].worldCol).toBe(12); // right against the start room's east wall
      expect(d.rooms[1].worldRow).toBe(4 - 6); // its door (row 6) is level with the start's (row 4)
    });

    it("can open two doors on one wall to the same room", () => {
      // Both of the start room's doors line up with both of the next room's doors, but only
      // when the pair that gets joined first is the matching one, so look across seeds.
      const start = makeTemplate("s", "start", ["E2", "E7"]);
      const mid = makeTemplate("m", "normal", ["W2", "W7", "E4"]);
      const boss = makeTemplate("b", "boss", ["W4"]);
      let doubled = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const d = generateDungeon({ seed, roomCount: 3, loopChance: 1, templates: [start, mid, boss] });
        if (d.start.exits.length === 2) {
          doubled++;
          expect(d.start.exits.map((e) => e.toId)).toEqual([1, 1]);
          expect(d.rooms[1].exits.filter((e) => e.side === "W").length).toBe(2);
        }
      }
      expect(doubled).toBeGreaterThan(0);
    });

    it("leaves the second door shut when loopChance is 0", () => {
      const start = makeTemplate("s", "start", ["E2", "E7"]);
      const mid = makeTemplate("m", "normal", ["W2", "W7", "E4"]);
      const boss = makeTemplate("b", "boss", ["W4"]);
      for (let seed = 1; seed <= 30; seed++) {
        const d = generateDungeon({ seed, roomCount: 3, loopChance: 0, templates: [start, mid, boss] });
        expect(d.start.exits.length).toBe(1);
      }
    });

    it("can open two doors on one wall to different rooms", () => {
      // The start room is tall, with two doors on its east wall. Two shorter rooms, stacked
      // one above the other, each get one of them.
      const start = makeTemplate("s", "start", ["E1", "E12"], 12, 20);
      const a = makeTemplate("a", "normal", ["W1"], 12, 10);
      const b = makeTemplate("b", "boss", ["W1"], 12, 10);
      for (let seed = 1; seed <= 20; seed++) {
        const d = generateDungeon({ seed, roomCount: 3, templates: [start, a, b] });
        expect(d.start.exits.map((e) => e.side)).toEqual(["E", "E"]);
        expect(new Set(d.start.exits.map((e) => e.toId)).size).toBe(2);
        expect(Math.abs(d.rooms[1].worldRow - d.rooms[2].worldRow)).toBeGreaterThanOrEqual(10);
      }
    });

    it("throws a helpful error when the rooms cannot be fitted together", () => {
      const start = makeTemplate("s", "start", ["N4"]);
      const dead = makeTemplate("d", "normal", ["N4"]);
      expect(() => generateDungeon({ roomCount: 5, templates: [start, dead] })).toThrowError(/Could not fit/);
    });
  });
});
