// The hand-made test rooms are tiny, so they skip the size class check.
function validateSmall(templates) {
  return validateRoomTemplates(templates, []);
}

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

  describe("size classes", function () {
    const normals = ROOM_TEMPLATES.filter((t) => t.role === "normal");
    const byClass = (name) => normals.filter((t) => roomSizeName(t.rows[0].length, t.rows.length) === name);

    it("puts every normal and treasure room in one of the three sizes", function () {
      for (const t of ROOM_TEMPLATES) {
        if (t.role === "normal" || t.role === "treasure") {
          expect(roomSizeName(t.rows[0].length, t.rows.length)).withContext(t.name).not.toBe(null);
        }
      }
    });

    it("has the three sizes at 22x13, 28x17 and 36x21", function () {
      expect(ROOM_SIZE_CLASSES.map((s) => s.cols + "x" + s.rows)).toEqual(["22x13", "28x17", "36x21"]);
    });

    it("has at least 6 different layouts in each size", function () {
      for (const name of ["small", "medium", "large"]) {
        expect(byClass(name).length).withContext(name).toBeGreaterThanOrEqual(6);
      }
    });

    it("fits every room, start and boss rooms too, in the 40x22 tiles the camera shows", function () {
      const viewCols = 1280 / WORLD_ZOOM / TILE_SIZE; // the game screen is 1280x720
      const viewRows = Math.floor(720 / WORLD_ZOOM / TILE_SIZE);
      for (const t of ROOM_TEMPLATES) {
        expect(t.rows[0].length).withContext(t.name).toBeLessThanOrEqual(viewCols);
        expect(t.rows.length).withContext(t.name).toBeLessThanOrEqual(viewRows);
      }
    });

    it("draws at least 4 melee spots and 3 ranged spots in every normal room, none by a door", function () {
      for (const t of normals) {
        const parsed = parseRoomTemplate(t);
        expect(parsed.spots.melee.length).withContext(t.name).toBeGreaterThanOrEqual(4);
        expect(parsed.spots.ranged.length).withContext(t.name).toBeGreaterThanOrEqual(3);
        for (const spot of parsed.spots.melee.concat(parsed.spots.ranged)) {
          const layout = buildEncounterLayout(parsed);
          expect(doorDistance(layout, spot)).withContext(t.name).toBeGreaterThanOrEqual(2.5);
        }
      }
    });

    it("draws no fixed enemies in normal rooms, the mix comes from the recipes", function () {
      for (const t of normals) {
        expect(parseRoomTemplate(t).spawns).withContext(t.name).toEqual([]);
      }
    });

    it("keeps start rooms free of enemies", function () {
      for (const t of ROOM_TEMPLATES.filter((r) => r.role === "start")) {
        const parsed = parseRoomTemplate(t);
        expect(parsed.spawns.length + parsed.spots.melee.length + parsed.spots.ranged.length).toBe(0);
      }
    });

    it("makes treasure rooms small dead ends with one chest and no enemies", function () {
      const vaults = ROOM_TEMPLATES.filter((t) => t.role === "treasure");
      expect(vaults.length).toBeGreaterThanOrEqual(4);
      for (const t of vaults) {
        const parsed = parseRoomTemplate(t);
        expect(parsed.cols + "x" + parsed.rows).toBe("22x13");
        expect(parsed.doors.length).toBe(1);
        expect(parsed.chests.length).toBe(1);
        expect(parsed.spawns.length + parsed.spots.melee.length + parsed.spots.ranged.length).toBe(0);
      }
      const sides = vaults.map((t) => parseRoomTemplate(t).doors[0].side).sort();
      expect(sides).toEqual(["E", "N", "S", "W"]);
    });
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

describe("validateRoomTemplates size classes", function () {
  const rowsOf = (cols, rows) => {
    const list = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        line += (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) ? "#" : ".";
      }
      list.push(line);
    }
    list[0] = list[0].slice(0, 4) + "++" + list[0].slice(6);
    return list;
  };
  const room = (role, cols, rows) => [{ name: "size-test", role, rows: rowsOf(cols, rows) }];
  const withNormal = (extra) => [...extra, { name: "ok", role: "normal", rows: rowsOf(22, 13) }];

  it("accepts the three sizes", function () {
    expect(validateRoomTemplates(room("normal", 22, 13))).toEqual([]);
    expect(validateRoomTemplates(room("normal", 28, 17))).toEqual([]);
    expect(validateRoomTemplates(room("normal", 36, 21))).toEqual([]);
  });

  it("rejects a normal room of any other size and lists the sizes", function () {
    const problems = validateRoomTemplates(room("normal", 30, 15));
    expect(problems.length).toBe(1);
    expect(problems[0]).toContain("size-test");
    expect(problems[0]).toContain("small 22x13, medium 28x17, large 36x21");
  });

  it("rejects a treasure room that is not a size class", function () {
    const vault = room("treasure", 16, 10);
    vault[0].rows[5] = vault[0].rows[5].slice(0, 5) + "C" + vault[0].rows[5].slice(6);
    expect(validateRoomTemplates(withNormal(vault)).length).toBe(1);
  });

  it("needs a chest in a treasure room", function () {
    const problems = validateRoomTemplates(withNormal(room("treasure", 22, 13)));
    expect(problems).toEqual(["size-test: a treasure room needs a chest (C)"]);
  });

  it("lets start and boss rooms be any size that fits the screen", function () {
    expect(validateRoomTemplates(withNormal(room("boss", 30, 15)))).toEqual([]);
    expect(validateRoomTemplates(withNormal(room("boss", 40, 22)))).toEqual([]);
  });

  it("rejects any room taller than the 22 rows the camera shows", function () {
    expect(validateRoomTemplates(withNormal(room("boss", 36, 23))).length).toBe(1);
    expect(validateRoomTemplates(withNormal(room("boss", 41, 13))).length).toBe(1);
  });

  it("skips the size check when told to", function () {
    expect(validateRoomTemplates(room("normal", 30, 15), [])).toEqual([]);
  });

  it("accepts m and r as floor and keeps them off the door tiles", function () {
    const rows = rowsOf(22, 13);
    rows[3] = rows[3].slice(0, 6) + "m" + rows[3].slice(7, 9) + "r" + rows[3].slice(10);
    expect(validateRoomTemplates(withNormal([{ name: "spots", role: "normal", rows }]))).toEqual([]);
    const blocked = rowsOf(22, 13);
    blocked[1] = blocked[1].slice(0, 4) + "m" + blocked[1].slice(5);
    expect(validateRoomTemplates(withNormal([{ name: "blocked", role: "normal", rows: blocked }])).length)
      .toBe(1);
  });
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
    expect(validateSmall([good])).toEqual([]);
  });

  it("names the room in every problem", function () {
    const problems = validateSmall(withRow(4, "#...?....#"));
    expect(problems.length).toBe(1);
    expect(problems[0]).toContain("test");
  });

  it("catches rows of different lengths", function () {
    expect(validateSmall(withRow(4, "#.......#")).length).toBe(1);
  });

  it("catches a room that is too small or too big", function () {
    expect(validateSmall(with_({ rows: ["##++", "#..#", "#..#", "####"] })).length).toBe(1);
    const huge = good.rows.map((r) => r + r + r + r + r);
    expect(validateSmall(with_({ rows: huge })).length).toBe(1);
  });

  it("catches an unknown character", function () {
    expect(validateSmall(withRow(4, "#...?....#")).length).toBe(1);
  });

  it("catches a hole in the outer wall", function () {
    expect(validateSmall(withRow(5, ".........#")).length).toBe(1);
  });

  it("catches floor that is cut off from the rest", function () {
    const rows = good.rows.slice();
    rows[1] = "#.x......#";
    rows[2] = "#xx......#";
    expect(validateSmall(with_({ rows })).length).toBe(1);
  });

  it("needs at least one door", function () {
    expect(validateSmall(withRow(0, "##########")).length).toBe(1);
  });

  it("catches a door that is not 2 tiles wide", function () {
    expect(validateSmall(withRow(0, "####+#####")).length).toBe(1);
    expect(validateSmall(withRow(0, "###+++####")).length).toBe(1);
    expect(validateSmall(withRow(0, "###++++###")).length).toBe(1);
  });

  it("catches a door with something in front of it", function () {
    expect(validateSmall(withRow(1, "#...xx...#")).length).toBe(1);
    expect(validateSmall(withRow(1, "#...JJ...#")).length).toBe(1);
  });

  it("catches a door that is not on the outer wall", function () {
    expect(validateSmall(withRow(4, "#...+....#")).length).toBe(1);
  });

  it("allows several doors on a wall, and doors on other walls", function () {
    const two = ["##++##++##", ...good.rows.slice(1)];
    expect(validateSmall(with_({ rows: two }))).toEqual([]);
    const west = good.rows.slice();
    west[4] = "+........#";
    west[5] = "+........#";
    expect(validateSmall(with_({ rows: west }))).toEqual([]);
  });

  it("catches a bad role and a duplicate or missing name", function () {
    expect(validateSmall(with_({ role: "shop" })).length).toBeGreaterThan(0);
    expect(validateSmall([good, good]).length).toBe(1);
    expect(validateSmall(with_({ name: "" })).length).toBe(1);
  });

  it("wants exactly one @ in a start room and none anywhere else", function () {
    const noStart = [...with_({ role: "start" }), { ...good, name: "other" }];
    expect(validateSmall(noStart).length).toBe(1);
    expect(validateSmall(withRow(4, "#...@....#")).length).toBe(1);
    const start = with_({ role: "start", rows: good.rows.map((r, i) => (i === 4 ? "#...@....#" : r)) });
    expect(validateSmall([...start, { ...good, name: "other" }])).toEqual([]);
  });

  it("needs at least one normal room", function () {
    const boss = with_({ role: "boss" });
    expect(validateSmall(boss).length).toBe(1);
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
    expect(room.pendingWaves.length).toBe(1);
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
    expect(validateSmall([room(rows)])).toEqual([]);
  });

  it("rejects a wall only 1 tile thick and says where", function () {
    const rows = withRows({ 1: "#..#.....#", 2: "#..#.....#" });
    expect(validateSmall([room(rows)])).toEqual([
      "walls: the # at column 3, row 1 is a wall only 1 tile thick; walls inside the room must be at least 2 tiles thick (use x for a 1 tile obstacle)"
    ]);
  });

  it("rejects a 1 tile thick wall that runs sideways too", function () {
    const rows = withRows({ 4: "#.#####..#" });
    expect(validateSmall([room(rows)]).length).toBe(1);
  });

  it("is fine with the walls and pillars that rooms already use", function () {
    expect(validateSmall()).toEqual([]);
  });
});
