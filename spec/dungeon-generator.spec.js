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

  it("makes the requested number of rooms, plus one treasure room", () => {
    for (const seed of SEEDS) {
      expect(make(seed).rooms.length).toBe(13);
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
      const d = generateDungeon({ seed: 1, roomCount: 2, sizeClasses: [], templates: [start, boss, spare] });
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
        const d = generateDungeon({ seed, roomCount: 3, loopChance: 1, sizeClasses: [], templates: [start, mid, boss] });
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
        const d = generateDungeon({ seed, roomCount: 3, loopChance: 0, sizeClasses: [], templates: [start, mid, boss] });
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
        const d = generateDungeon({ seed, roomCount: 3, sizeClasses: [], templates: [start, a, b] });
        expect(d.start.exits.map((e) => e.side)).toEqual(["E", "E"]);
        expect(new Set(d.start.exits.map((e) => e.toId)).size).toBe(2);
        expect(Math.abs(d.rooms[1].worldRow - d.rooms[2].worldRow)).toBeGreaterThanOrEqual(10);
      }
    });

    it("throws a helpful error when the rooms cannot be fitted together", () => {
      const start = makeTemplate("s", "start", ["N4"]);
      const dead = makeTemplate("d", "normal", ["N4"]);
      expect(() => generateDungeon({ roomCount: 5, sizeClasses: [], templates: [start, dead] })).toThrowError(/Could not fit/);
    });
  });
});