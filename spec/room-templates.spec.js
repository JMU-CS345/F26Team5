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
      { type: "Zombie", col: 2, row: 6 }
    ]);
    expect(parsed.player).toEqual({ col: 7, row: 4 });
    expect(room.getPlayerSpawn()).toEqual({ x: 32 + 7.5 * 16, y: 64 + 4.5 * 16 });
  });

  it("makes no enemies until spawnEnemies, and only once", function () {
    expect(room.enemies.length).toBe(0);
    room.spawnEnemies();
    room.spawnEnemies();
    expect(room.enemies.length).toBe(1); // the first wave, the second waits
    expect(room.pendingWave.length).toBe(1);
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
    expect(room.enemies.length).toBe(1); // first wave; the second follows (see room-flow.spec.js)
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
    enterRoomFlow({}, room); // the room flow seals the doors, not onEnter
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
    enterRoomFlow({}, room);
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
