// Overworld, houses, leaving the overworld and the campaign.
// Shared helpers live in helpers.js.

// ===== from overworld.spec.js =====
// Specs for the overworld: the map, its entrances, and walking from it into a dungeon.
describe("overworld map", function () {
  it("passes validation", function () {
    expect(validateOverworldTemplate(OVERWORLD_TEMPLATE)).toEqual([]);
  });

  it("is bigger than one screen, so the camera has something to do", function () {
    const parsed = parseOverworldTemplate(OVERWORLD_TEMPLATE);
    expect(parsed.cols * TILE_SIZE).toBeGreaterThan(1280);
    expect(parsed.rows * TILE_SIZE).toBeGreaterThan(720);
  });

  describe("shape", function () {
    const parsed = parseOverworldTemplate(OVERWORLD_TEMPLATE);
    const radius = parsed.cols / 2;
    const open = [];
    parsed.grid.forEach((row, r) => row.forEach((type, c) => {
      if (type !== TILE.WALL) open.push({ c, r, d: Math.hypot(c + 0.5 - radius, r + 0.5 - radius) });
    }));

    it("is square, so the clearing can be a circle", function () {
      expect(parsed.cols).toBe(parsed.rows);
    });

    it("keeps everything that is not forest inside the circle", function () {
      expect(Math.max(...open.map((t) => t.d))).toBeLessThanOrEqual(radius);
    });

    it("fills the circle: it reaches near the edge in every direction", function () {
      const reach = (pick) => Math.max(...open.filter(pick).map((t) => t.d));
      const nearEdge = radius - 8;
      expect(reach((t) => t.r < radius - 10 && Math.abs(t.c - radius) < 10)).toBeGreaterThan(nearEdge); // north
      expect(reach((t) => t.r > radius + 10 && Math.abs(t.c - radius) < 10)).toBeGreaterThan(nearEdge); // south
      expect(reach((t) => t.c < radius - 10 && Math.abs(t.r - radius) < 10)).toBeGreaterThan(nearEdge); // west
      expect(reach((t) => t.c > radius + 10 && Math.abs(t.r - radius) < 10)).toBeGreaterThan(nearEdge); // east
    });

    it("has forest in all four corners", function () {
      const last = parsed.cols - 1;
      for (const [c, r] of [[0, 0], [last, 0], [0, last], [last, last], [8, 8], [last - 8, last - 8]]) {
        expect(parsed.grid[r][c]).toBe(TILE.WALL);
      }
    });
  });

  describe("validateOverworldTemplate", function () {
    const small = (edit) => {
      const rows = [
        "##########",
        "#........#",
        "#..@.....#",
        "#........#",
        "#...DD...#",
        "#...DD...#",
        "#........#",
        "##########"
      ];
      return { name: "tiny", rows: edit ? edit(rows.slice()) : rows };
    };

    it("accepts a small good map", function () {
      expect(validateOverworldTemplate(small())).toEqual([]);
    });

    it("needs exactly one start", function () {
      const none = small((r) => r.map((line) => line.replace("@", ".")));
      expect(validateOverworldTemplate(none).join()).toContain("exactly one @");
      const two = small((r) => { r[1] = "#@.......#"; return r; });
      expect(validateOverworldTemplate(two).join()).toContain("exactly one @");
    });

    it("needs a wall all the way around", function () {
      const open = small((r) => { r[2] = "...@.....#"; return r; });
      expect(validateOverworldTemplate(open).join()).toContain("outer ring");
    });

    it("needs an entrance", function () {
      const none = small((r) => r.map((line) => line.replace(/D/g, ".")));
      expect(validateOverworldTemplate(none).join()).toContain("dungeon entrance");
    });

    it("needs grass just south of an entrance", function () {
      const blocked = small((r) => { r[6] = "#...xx...#"; return r; });
      expect(validateOverworldTemplate(blocked).join()).toContain("just south");
    });

    it("needs the grass to be in one piece", function () {
      const split = small((r) => {
        r[3] = "#xxxxxxxx#";
        r[2] = "#..@.....#";
        return r;
      });
      expect(validateOverworldTemplate(split).join()).toContain("separate parts");
    });

    it("needs every house door on the map to have a house, and every house a door", function () {
      const noHouse = small((r) => { r[2] = "#..@..77.#"; r[3] = "#........#"; return r; });
      expect(validateOverworldTemplate(noHouse).join()).toContain("no house with that id");
      const house = { id: "1", name: "Hut", rows: ["########", "#......#", "#......#", "#......#", "#......#", "###++###"] };
      const noDoor = Object.assign(small(), { houses: [house] });
      expect(validateOverworldTemplate(noDoor).join()).toContain("has no door on the map");
    });

    it("needs a house door to be two side by side with grass just south of it", function () {
      const house = { id: "1", name: "Hut", rows: ["########", "#......#", "#......#", "#......#", "#......#", "###++###"] };
      const good = Object.assign(small((r) => { r[2] = "#..@..hh.#"; r[3] = "#.....11.#"; return r; }), { houses: [house] });
      expect(validateOverworldTemplate(good)).toEqual([]);
      const blocked = Object.assign(small((r) => { r[2] = "#..@..hh.#"; r[3] = "#.....11.#"; r[4] = "#...DDxx.#"; return r; }), { houses: [house] });
      expect(validateOverworldTemplate(blocked).join()).toContain("just south");
      const single = Object.assign(small((r) => { r[2] = "#..@..hh.#"; r[3] = "#.....1..#"; return r; }), { houses: [house] });
      expect(validateOverworldTemplate(single).join()).toContain("two 1 side by side");
    });

    it("needs NPCs to stand on grass, on their own tile", function () {
      const onWall = Object.assign(small(), { npcs: [{ name: "A", col: 0, row: 0, dialogue: ["hi"] }] });
      expect(validateOverworldTemplate(onWall).join()).toContain("not standing on plain floor");
      const twins = Object.assign(small(), {
        npcs: [{ name: "A", col: 2, row: 1, dialogue: ["hi"] }, { name: "B", col: 2, row: 1, dialogue: ["hi"] }]
      });
      expect(validateOverworldTemplate(twins).join()).toContain("same tile");
    });

    it("rejects unknown characters and ragged rows", function () {
      expect(validateOverworldTemplate(small((r) => { r[1] = "#...?....#"; return r; })).join())
        .toContain("unknown character");
      expect(validateOverworldTemplate(small((r) => { r[1] = "#....#"; return r; })).join())
        .toContain("same length");
    });
  });

  describe("parseOverworldTemplate", function () {
    it("reads tiles, the start and one entrance per touching group of D", function () {
      const parsed = parseOverworldTemplate({
        name: "t",
        rows: [
          "############",
          "#..@.......#",
          "#.xx.......#",
          "#.DD....DD.#",
          "#.DD....DD.#",
          "#..........#",
          "############"
        ]
      });
      expect(parsed.player).toEqual({ col: 3, row: 1 });
      expect(parsed.grid[1][3]).toBe(TILE.FLOOR); // the @ stands on grass
      expect(parsed.grid[2][2]).toBe(TILE.INTERIOR_WALL);
      expect(parsed.grid[3][2]).toBe(TILE.DUNGEON_ENTRANCE);
      expect(parsed.entrances.length).toBe(2);
      expect(parsed.entrances[0].tiles.length).toBe(4);
    });
  });
});

describe("Overworld", function () {
  let overworld;
  beforeEach(function () {
    overworld = new Overworld(0, 0, { screenX: 320, screenY: 160 });
  });

  it("has NPCs standing on grass, where the map says, ready to talk", function () {
    expect(overworld.npcs.length).toBe(OVERWORLD_TEMPLATE.npcs.length);
    expect(overworld.npcs.length).toBeGreaterThan(0);
    OVERWORLD_TEMPLATE.npcs.forEach((def, i) => {
      const npc = overworld.npcs[i];
      expect(npc.name).toBe(def.name);
      expect(npc.pos.x).toBe(def.col * TILE_SIZE);
      expect(npc.pos.y).toBe(def.row * TILE_SIZE);
      expect(npc.getDialoguePages()).toEqual(def.dialogue);
      const c = npc.getCenter();
      expect(overworld.isWallAt(c.x, c.y)).toBe(false);
    });
  });

  it("has a house for every door on the map, each with its door outside", function () {
    expect(overworld.houses.length).toBe(OVERWORLD_TEMPLATE.houses.length);
    expect(overworld.houses.length).toBeGreaterThan(1);
    for (const house of overworld.houses) {
      expect(house.outsideDoorTiles.length).toBe(2);
      const t = house.outsideDoorTiles[0];
      expect(overworld.getHouseAt((t.col + 0.5) * TILE_SIZE, (t.row + 0.5) * TILE_SIZE)).toBe(house);
      expect(overworld.getTile(t.col, t.row)).toBe(TILE.HOUSE_DOOR);
    }
  });

  it("makes houses solid, except for the door", function () {
    const house = overworld.houses[0];
    const door = house.outsideDoorTiles[0];
    expect(overworld.isWallAt((door.col + 0.5) * TILE_SIZE, (door.row + 0.5) * TILE_SIZE)).toBe(false);
    expect(overworld.getTile(door.col, door.row - 1)).toBe(TILE.HOUSE);
    expect(overworld.isWallAt((door.col + 0.5) * TILE_SIZE, (door.row - 0.5) * TILE_SIZE)).toBe(true);
  });

  it("finds no house away from a house door", function () {
    const spawn = overworld.getPlayerSpawn();
    expect(overworld.getHouseAt(spawn.x, spawn.y)).toBe(null);
  });

  it("gives a landing spot on grass just south of each house door", function () {
    for (const house of overworld.houses) {
      const landing = overworld.getHouseLanding(house);
      const bottom = house.outsideDoorTiles[0].row;
      expect(Math.floor(landing.y / TILE_SIZE)).toBe(bottom + 1);
      expect(overworld.getHouseAt(landing.x, landing.y)).toBe(null);
      const half = PLAYER_LENGTH / 2;
      expect(overworld.collidesWithWall({ x: landing.x - half, y: landing.y - half, w: PLAYER_LENGTH, h: PLAYER_WIDTH }))
        .toBe(false);
    }
  });

  it("is a Room, so walking and shots treat it like any other", function () {
    expect(overworld instanceof Room).toBe(true);
    expect(overworld.isWallAt(0, 0)).toBe(true); // the forest edge
    expect(overworld.exits).toEqual([]);
  });

  it("has an id that no dungeon room can have", function () {
    expect(overworld.id).toBe("overworld-1");
  });

  it("puts the player spawn on grass", function () {
    const spawn = overworld.getPlayerSpawn();
    expect(overworld.isWallAt(spawn.x, spawn.y)).toBe(false);
    expect(overworld.getEntranceAt(spawn.x, spawn.y)).toBe(null);
  });

  it("finds an entrance by pixel, and nothing anywhere else", function () {
    const entrance = overworld.entrances[0];
    const tile = entrance.tiles[0];
    const px = (tile.col + 0.5) * TILE_SIZE;
    const py = (tile.row + 0.5) * TILE_SIZE;
    expect(overworld.getEntranceAt(px, py)).toBe(entrance);
    const spawn = overworld.getPlayerSpawn();
    expect(overworld.getEntranceAt(spawn.x, spawn.y)).toBe(null);
  });

  it("does not block walking onto an entrance", function () {
    const tile = overworld.entrances[0].tiles[0];
    expect(overworld.isWallAt((tile.col + 0.5) * TILE_SIZE, (tile.row + 0.5) * TILE_SIZE)).toBe(false);
  });

  it("gives a landing spot on grass, just south of the entrance", function () {
    const entrance = overworld.entrances[0];
    const landing = overworld.getEntranceLanding(entrance);
    const bottom = Math.max(...entrance.tiles.map((t) => t.row));
    expect(Math.floor(landing.y / TILE_SIZE)).toBe(bottom + 1);
    expect(overworld.getEntranceAt(landing.x, landing.y)).toBe(null);
    const half = PLAYER_LENGTH / 2;
    const box = { x: landing.x - half, y: landing.y - half, w: PLAYER_LENGTH, h: PLAYER_WIDTH };
    expect(overworld.collidesWithWall(box)).toBe(false);
  });
});

describe("Run in the overworld", function () {
  const none = () => new p5.Vector(0, 0);
  const frame = (run, input = {}) => run.update({ move: none(), fire: none(), ...input });
  let overworld;
  let dungeon;
  let factoryCalls;
  let run;

  const standOn = (run, spot) =>
    run.player.pos.set(spot.x - run.player.length / 2, spot.y - run.player.width / 2);
  const middleOfTile = (room, tile) => ({
    x: room.x + (tile.col + 0.5) * TILE_SIZE,
    y: room.y + (tile.row + 0.5) * TILE_SIZE
  });
  const entranceMiddle = (entrance) => {
    const t = entrance.tiles[0];
    return { x: (t.col + 0.5) * TILE_SIZE, y: (t.row + 0.5) * TILE_SIZE };
  };

  beforeEach(function () {
    overworld = new Overworld(0, 0, { screenX: 320, screenY: 160 });
    dungeon = generateDungeon({ seed: 3, roomCount: 8, screenX: 320, screenY: 160 });
    factoryCalls = [];
    run = new Run(null, "Fire", PLAYER_MODEL_NAMES[0], makeAppearance(), overworld, (entrance) => {
      factoryCalls.push(entrance);
      return dungeon;
    });
  });

  it("starts in the overworld, at its spawn, with no dungeon yet", function () {
    const spawn = overworld.getPlayerSpawn();
    expect(run.inOverworld()).toBe(true);
    expect(run.room).toBe(overworld);
    expect(run.dungeon).toBe(null);
    expect(run.player.getCenter().x).toBe(spawn.x);
    expect(run.player.getCenter().y).toBe(spawn.y);
    expect(run.entrySpot).toEqual({ x: spawn.x, y: spawn.y });
  });

  it("stays in the overworld while the player walks around on grass", function () {
    frame(run, { move: new p5.Vector(1, 0) });
    expect(run.inOverworld()).toBe(true);
    expect(factoryCalls.length).toBe(0);
  });

  it("walks the player into a new dungeon when they step onto an entrance", function () {
    const entrance = overworld.entrances[0];
    standOn(run, entranceMiddle(entrance));
    frame(run);
    expect(factoryCalls).toEqual([entrance]);
    expect(run.inOverworld()).toBe(false);
    expect(run.dungeon).toBe(dungeon);
    expect(run.room).toBe(dungeon.start);
    // They come in through the start room's way out to the overworld.
    const entry = dungeon.start.getOverworldExitEntry();
    expect(run.player.getCenter().x).toBe(entry.x);
    expect(run.player.getCenter().y).toBe(entry.y);
    expect(run.entrySpot).toEqual(entry);
    expect(dungeon.start.getOverworldExitAt(entry.x, entry.y)).toBe(null); // not standing in it
  });

  it("makes the dungeon only once, not every frame", function () {
    standOn(run, entranceMiddle(overworld.entrances[0]));
    frame(run);
    frame(run);
    frame(run);
    expect(factoryCalls.length).toBe(1);
  });

  it("drops the shots in flight when it goes into a dungeon", function () {
    run.projectiles.push(new Projectile(0, 0, new p5.Vector(1, 0)));
    standOn(run, entranceMiddle(overworld.entrances[0]));
    frame(run);
    expect(run.projectiles.length).toBe(0);
  });

  it("does not enter anything when the player is dead", function () {
    standOn(run, entranceMiddle(overworld.entrances[0]));
    run.player.health = 0;
    frame(run);
    expect(run.inOverworld()).toBe(true);
  });

  it("stays put on an entrance when the run has no way to make a dungeon", function () {
    const bare = new Run(null, "Fire", PLAYER_MODEL_NAMES[0], makeAppearance(), overworld);
    standOn(bare, entranceMiddle(overworld.entrances[0]));
    frame(bare);
    expect(bare.inOverworld()).toBe(true);
  });

  it("keeps working inside the dungeon: its doors take the player between rooms", function () {
    standOn(run, entranceMiddle(overworld.entrances[0]));
    frame(run);
    const exit = run.room.exits[0];
    run.useExit(exit);
    expect(run.room.id).toBe(exit.toId);
    expect(run.inOverworld()).toBe(false);
  });

  it("brings the player back out just south of the entrance they went in by", function () {
    const entrance = overworld.entrances[0];
    standOn(run, entranceMiddle(entrance));
    frame(run);
    expect(run.leaveDungeon()).toBe(true);
    const landing = overworld.getEntranceLanding(entrance);
    expect(run.inOverworld()).toBe(true);
    expect(run.dungeon).toBe(null);
    expect(run.player.getCenter().x).toBe(landing.x);
    expect(run.player.getCenter().y).toBe(landing.y);
    expect(run.entrySpot).toEqual(landing);
    frame(run); // standing on the landing does not send them straight back in
    expect(run.inOverworld()).toBe(true);
    expect(factoryCalls.length).toBe(1);
  });

  it("keeps the dungeon when the player leaves, so going back in carries on", function () {
    const entrance = overworld.entrances[0];
    standOn(run, entranceMiddle(entrance));
    frame(run);
    run.leaveDungeon();
    standOn(run, entranceMiddle(entrance));
    frame(run);
    expect(factoryCalls.length).toBe(1);
    expect(run.dungeon).toBe(dungeon);
    expect(run.room).toBe(dungeon.start);
  });

  it("walks the player out to the overworld when they step onto the start room's way out", function () {
    const entrance = overworld.entrances[0];
    standOn(run, entranceMiddle(entrance));
    frame(run);
    const exit = dungeon.start.overworldExit;
    standOn(run, middleOfTile(dungeon.start, exit.tiles[0]));
    frame(run);
    const landing = overworld.getEntranceLanding(entrance);
    expect(run.inOverworld()).toBe(true);
    expect(run.dungeon).toBe(null);
    expect(run.player.getCenter().x).toBe(landing.x);
    expect(run.player.getCenter().y).toBe(landing.y);
    frame(run); // standing outside the entrance does not send them back in
    expect(run.inOverworld()).toBe(true);
  });

  it("lets the player in and out as often as they like", function () {
    const entrance = overworld.entrances[0];
    for (let trip = 0; trip < 3; trip++) {
      standOn(run, entranceMiddle(entrance));
      frame(run);
      expect(run.room).toBe(dungeon.start);
      standOn(run, middleOfTile(dungeon.start, dungeon.start.overworldExit.tiles[1]));
      frame(run);
      expect(run.inOverworld()).toBe(true);
    }
    expect(factoryCalls.length).toBe(1);
  });

  it("only lets the player out through the way out in the start room", function () {
    standOn(run, entranceMiddle(overworld.entrances[0]));
    frame(run);
    const other = dungeon.rooms.find((r) => r !== dungeon.start);
    run.enterRoom(other);
    standOn(run, { x: other.x + other.width / 2, y: other.y + other.height / 2 });
    frame(run);
    expect(run.inOverworld()).toBe(false);
    expect(run.dungeon).toBe(dungeon);
  });

  it("brings the player back to the start room, as they left it, with the pickups still gone", function () {
    standOn(run, entranceMiddle(overworld.entrances[0]));
    frame(run);
    dungeon.start.items = [];
    standOn(run, middleOfTile(dungeon.start, dungeon.start.overworldExit.tiles[0]));
    frame(run);
    standOn(run, entranceMiddle(overworld.entrances[0]));
    frame(run);
    expect(run.room.items).toEqual([]);
  });

  it("cannot leave a dungeon it is not in, or a run that has no overworld", function () {
    expect(run.leaveDungeon()).toBe(false); // already out in the overworld
    const plain = new Run(dungeon, "Fire", PLAYER_MODEL_NAMES[0], makeAppearance());
    expect(plain.inOverworld()).toBe(false);
    expect(plain.leaveDungeon()).toBe(false);
  });

  it("walls stop the player in the overworld just like in a room", function () {
    // The leftmost grass on the middle row, against the forest edge of the round clearing.
    const row = overworld.template.rows / 2 | 0;
    let col = 0;
    while (overworld.getTile(col, row) === TILE.WALL) col++;
    standOn(run, { x: (col + 0.5) * TILE_SIZE, y: (row + 0.5) * TILE_SIZE });
    for (let i = 0; i < 30; i++) {
      frame(run, { move: new p5.Vector(-1, 0) });
    }
    expect(run.player.pos.x).toBeGreaterThanOrEqual(col * TILE_SIZE);
    expect(run.inOverworld()).toBe(true);
  });
});

describe("Run with houses", function () {
  const none = () => new p5.Vector(0, 0);
  const frame = (run, input = {}) => run.update({ move: none(), fire: none(), ...input });
  let overworld;
  let dungeon;
  let run;
  let house;

  const standOn = (run, spot) =>
    run.player.pos.set(spot.x - run.player.length / 2, spot.y - run.player.width / 2);
  const doorMiddle = (tile) => ({ x: (tile.col + 0.5) * TILE_SIZE, y: (tile.row + 0.5) * TILE_SIZE });
  const middleOf = (room, tile) => ({
    x: room.x + (tile.col + 0.5) * TILE_SIZE,
    y: room.y + (tile.row + 0.5) * TILE_SIZE
  });

  beforeEach(function () {
    overworld = new Overworld(0, 0, { screenX: 320, screenY: 160 });
    dungeon = generateDungeon({ seed: 3, roomCount: 8, screenX: 320, screenY: 160 });
    run = new Run(null, "Fire", PLAYER_MODEL_NAMES[0], makeAppearance(), overworld, () => dungeon);
    house = overworld.houses[0];
  });

  it("walks the player into a house when they step onto its door", function () {
    standOn(run, doorMiddle(house.outsideDoorTiles[0]));
    frame(run);
    const entry = house.getEntryPoint();
    expect(run.room).toBe(house);
    expect(run.inHouse()).toBe(true);
    expect(run.inOverworld()).toBe(false);
    expect(run.dungeon).toBe(null);
    expect(run.player.getCenter().x).toBe(entry.x);
    expect(run.player.getCenter().y).toBe(entry.y);
    expect(run.entrySpot).toEqual(entry);
  });

  it("does not bounce the player straight back out when they come in", function () {
    standOn(run, doorMiddle(house.outsideDoorTiles[0]));
    frame(run);
    frame(run);
    frame(run);
    expect(run.inHouse()).toBe(true);
  });

  it("walks the player back out, just south of the door they went in by", function () {
    standOn(run, doorMiddle(house.outsideDoorTiles[0]));
    frame(run);
    standOn(run, middleOf(house, house.template.door.tiles[0]));
    frame(run);
    const landing = overworld.getHouseLanding(house);
    expect(run.inOverworld()).toBe(true);
    expect(run.player.getCenter().x).toBe(landing.x);
    expect(run.player.getCenter().y).toBe(landing.y);
    expect(run.entrySpot).toEqual(landing);
    frame(run); // standing on the landing does not send them back in
    expect(run.inOverworld()).toBe(true);
  });

  it("sends each house's door to that house", function () {
    for (const other of overworld.houses) {
      run.enterRoom(overworld);
      standOn(run, doorMiddle(other.outsideDoorTiles[0]));
      frame(run);
      expect(run.room).toBe(other);
    }
  });

  it("walls and furniture stop the player inside a house", function () {
    run.enterHouse(house);
    for (let i = 0; i < 400; i++) {
      frame(run, { move: new p5.Vector(0, -1) });
    }
    expect(run.player.pos.y).toBeGreaterThanOrEqual(house.y + TILE_SIZE); // stopped by the north wall
    expect(run.inHouse()).toBe(true);
  });

  it("cannot walk into a house from a dungeon, or leave a house it is not in", function () {
    expect(run.leaveHouse()).toBe(false); // out in the overworld
    run.enterDungeon(overworld.entrances[0]);
    expect(run.enterHouse(house)).toBe(false);
    expect(run.leaveHouse()).toBe(false);
  });

  it("does not treat leaving a house as leaving a dungeon", function () {
    run.enterHouse(house);
    expect(run.leaveDungeon()).toBe(false);
    expect(run.inHouse()).toBe(true);
  });
});


// ===== from overworld-exit.spec.js =====
// Specs for the way out to the overworld in the start rooms (the = in a room drawing).
describe("start rooms' way out to the overworld", function () {
  const startTemplates = ROOM_TEMPLATES.filter((t) => t.role === "start");

  it("is in every start room drawing", function () {
    expect(startTemplates.length).toBeGreaterThan(0);
    for (const t of startTemplates) {
      expect(t.rows.join("")).toContain("==", t.name);
      expect(parseRoomTemplate(t).overworldExit).not.toBe(null, t.name);
    }
  });

  it("is in no other room drawing", function () {
    for (const t of ROOM_TEMPLATES.filter((r) => r.role !== "start")) {
      expect(parseRoomTemplate(t).overworldExit).toBe(null, t.name);
    }
  });

  it("is in the start room of every dungeon the generator makes", function () {
    for (let seed = 1; seed <= 25; seed++) {
      const dungeon = generateDungeon({ seed, screenX: 320, screenY: 160 });
      expect(dungeon.start.overworldExit).not.toBe(null);
      expect(dungeon.rooms.filter((r) => r.overworldExit).length).toBe(1);
    }
  });

  describe("reading the drawings", function () {
    const room = (rows, role = "start") => ({
      name: "t",
      role,
      rows: role === "start" ? rows : rows.map((r) => r.replace("@", "."))
    });
    const base = () => [
      "################",
      "#..............#",
      "#..............#",
      "#..............#",
      "#.......@......#",
      "#..............#",
      "#..............#",
      "###==#####++####"
    ];
    const withBottom = (bottom) => { const r = base(); r[7] = bottom; return r; };
    const problems = (t) => validateRoomTemplates([t, { name: "n", role: "normal", rows: normal() }]);
    const normal = () => ["################", ...base().slice(1, 7).map((r) => r.replace("@", ".")), "#######++#######"];

    it("reads where it is, which wall, and the floor just inside", function () {
      const parsed = parseRoomTemplate(room(base()));
      expect(parsed.overworldExit.side).toBe("S");
      expect(parsed.overworldExit.tiles).toEqual([{ col: 3, row: 7 }, { col: 4, row: 7 }]);
      expect(parsed.overworldExit.inside).toEqual([{ col: 3, row: 6 }, { col: 4, row: 6 }]);
      expect(parsed.grid[7][3]).toBe(TILE.OVERWORLD_EXIT);
    });

    it("accepts a good one", function () {
      expect(problems(room(base()))).toEqual([]);
    });

    it("accepts a start room with none, so plain dungeons need no overworld", function () {
      expect(problems(room(withBottom("#######++#######")))).toEqual([]);
    });

    it("rejects one in a room that is not a start room", function () {
      expect(problems(room(withBottom("###==#####++####"), "normal")).join()).toContain("only a start room");
    });

    it("rejects a second one", function () {
      expect(problems(room(withBottom("###==##==##++###"))).join()).toContain("only one way out");
    });

    it("rejects the wrong width", function () {
      expect(problems(room(withBottom("###===####++####"))).join()).toContain("must be 2");
      expect(problems(room(withBottom("###=######++####"))).join()).toContain("must be 2");
    });

    it("needs plain floor just inside", function () {
      const r = base();
      r[6] = "#..xx..........#";
      expect(problems(room(r)).join()).toContain("plain floor");
    });

    it("must not touch a door", function () {
      expect(problems(room(withBottom("###==++#########"))).join()).toContain("touching a door");
      expect(problems(room(withBottom("###==#++########"))).join()).toEqual("");
    });

    it("can only go on the outer wall", function () {
      const r = base();
      r[3] = "#......==......#";
      expect(problems(room(r)).join()).toContain("outer wall");
    });
  });

  describe("in a built room", function () {
    let dungeon;
    let start;
    beforeEach(function () {
      dungeon = generateDungeon({ seed: 5, screenX: 320, screenY: 160 });
      start = dungeon.start;
    });

    it("is open ground in the wall, not a door", function () {
      for (const t of start.overworldExit.tiles) {
        expect(start.getTile(t.col, t.row)).toBe(TILE.OVERWORLD_EXIT);
        expect(start.isWallAt(start.x + (t.col + 0.5) * TILE_SIZE, start.y + (t.row + 0.5) * TILE_SIZE)).toBe(false);
      }
      expect(start.exits.some((e) => e.tiles.some((t) => start.getTile(t.col, t.row) === TILE.OVERWORLD_EXIT)))
        .toBe(false);
    });

    it("is found by pixel, and nowhere else in the room", function () {
      const t = start.overworldExit.tiles[0];
      const px = start.x + (t.col + 0.5) * TILE_SIZE;
      const py = start.y + (t.row + 0.5) * TILE_SIZE;
      expect(start.getOverworldExitAt(px, py)).toBe(start.overworldExit);
      expect(start.getOverworldExitAt(start.x + start.width / 2, start.y + start.height / 2)).toBe(null);
    });

    it("stays open when the room's doors are shut", function () {
      start.closeDoors();
      const t = start.overworldExit.tiles[0];
      expect(start.getTile(t.col, t.row)).toBe(TILE.OVERWORLD_EXIT);
      expect(start.getOverworldExitAt(start.x + (t.col + 0.5) * TILE_SIZE, start.y + (t.row + 0.5) * TILE_SIZE))
        .toBe(start.overworldExit);
    });

    it("has an entry point on the floor just inside, between its two tiles", function () {
      const entry = start.getOverworldExitEntry();
      expect(start.isWallAt(entry.x, entry.y)).toBe(false);
      expect(start.getOverworldExitAt(entry.x, entry.y)).toBe(null);
      const [a, b] = start.overworldExit.tiles;
      expect(entry.x).toBe(start.x + ((a.col + b.col) / 2 + 0.5) * TILE_SIZE);
    });

    it("is not offered by rooms that have none", function () {
      const other = dungeon.rooms.find((r) => r !== start);
      expect(other.getOverworldExitAt(other.x + 40, other.y + 40)).toBe(null);
      expect(other.getOverworldExitEntry()).toBe(null);
    });
  });
});


// ===== from house.spec.js =====
// Specs for houses: the drawings, their validation, and the House room.
describe("house drawings", function () {
  const good = () => ({
    id: "4",
    name: "Hut",
    rows: [
      "############",
      "#..........#",
      "#.xx.......#",
      "#..........#",
      "#..........#",
      "#..........#",
      "#####++#####"
    ],
    npcs: [{ name: "Hermit", col: 6, row: 3, dialogue: ["Hello.", "Goodbye."] }]
  });
  const withRows = (edit) => {
    const t = good();
    t.rows = edit(t.rows.slice());
    return t;
  };

  it("passes validation for every house in the overworld", function () {
    for (const house of OVERWORLD_TEMPLATE.houses) {
      expect(validateHouseTemplate(house)).toEqual([]);
    }
  });

  it("accepts a small good house", function () {
    expect(validateHouseTemplate(good())).toEqual([]);
  });

  it("needs an id that is a digit, and a name", function () {
    expect(validateHouseTemplate(Object.assign(good(), { id: "10" })).join()).toContain("id must be a digit");
    expect(validateHouseTemplate(Object.assign(good(), { name: "" })).join()).toContain("needs a name");
  });

  it("needs walls all the way round, with square corners", function () {
    const open = withRows((r) => { r[2] = "...xx......#"; return r; });
    expect(validateHouseTemplate(open).join()).toContain("outer ring");
  });

  it("needs exactly one door, two tiles wide, with floor just inside", function () {
    const none = withRows((r) => { r[6] = "############"; return r; });
    expect(validateHouseTemplate(none).join()).toContain("exactly one door");
    const wide = withRows((r) => { r[6] = "####+++#####"; return r; });
    expect(validateHouseTemplate(wide).join()).toContain("exactly one door");
    const blocked = withRows((r) => { r[5] = "#....xx....#"; return r; });
    expect(validateHouseTemplate(blocked).join()).toContain("plain floor");
    const loose = withRows((r) => { r[3] = "#....+.....#"; return r; });
    expect(validateHouseTemplate(loose).join()).toContain("outer wall");
  });

  it("needs the floor to be in one piece", function () {
    const split = withRows((r) => { r[3] = "#xxxxxxxxxx#"; return r; });
    expect(validateHouseTemplate(split).join()).toContain("separate parts");
  });

  it("rejects unknown characters, ragged rows and a size that does not fit on the screen", function () {
    expect(validateHouseTemplate(withRows((r) => { r[1] = "#....?.....#"; return r; })).join())
      .toContain("unknown character");
    expect(validateHouseTemplate(withRows((r) => { r[1] = "#...#"; return r; })).join())
      .toContain("same length");
    expect(validateHouseTemplate(Object.assign(good(), { rows: ["###", "###"] })).join()).toContain("size");
  });

  it("needs NPCs on plain floor, each with a name and a tile of their own", function () {
    const onFurniture = Object.assign(good(), { npcs: [{ name: "A", col: 2, row: 2, dialogue: ["x"] }] });
    expect(validateHouseTemplate(onFurniture).join()).toContain("not standing on plain floor");
    const nameless = Object.assign(good(), { npcs: [{ col: 4, row: 3, dialogue: ["x"] }] });
    expect(validateHouseTemplate(nameless).join()).toContain("needs a name");
  });

  it("reads the grid, the door and the NPCs", function () {
    const parsed = parseHouseTemplate(good());
    expect(parsed.id).toBe("4");
    expect(parsed.cols).toBe(12);
    expect(parsed.rows).toBe(7);
    expect(parsed.grid[2][2]).toBe(TILE.INTERIOR_WALL);
    expect(parsed.grid[6][5]).toBe(TILE.HOUSE_DOOR);
    expect(parsed.door.side).toBe("S");
    expect(parsed.door.tiles).toEqual([{ col: 5, row: 6 }, { col: 6, row: 6 }]);
    expect(parsed.npcs.length).toBe(1);
  });
});

describe("House", function () {
  let house;
  beforeEach(function () {
    house = new House(400, 200, parseHouseTemplate({
      id: "4",
      name: "Hut",
      rows: [
        "############",
        "#..........#",
        "#.xx.......#",
        "#..........#",
        "#..........#",
        "#..........#",
        "#####++#####"
      ],
      npcs: [{ name: "Hermit", col: 6, row: 3, dialogue: ["Hello.", "Goodbye."] }]
    }));
  });

  it("is a room with a size from its drawing and an id no dungeon room has", function () {
    expect(house instanceof Room).toBe(true);
    expect(house.width).toBe(12 * TILE_SIZE);
    expect(house.height).toBe(7 * TILE_SIZE);
    expect(house.id).toBe("house-4");
    expect(house.isHouse).toBe(true);
  });

  it("is solid at its walls and furniture, and open at the door", function () {
    expect(house.isWallAt(400 + 4, 200 + 4)).toBe(true);
    expect(house.isWallAt(400 + 2 * TILE_SIZE + 4, 200 + 2 * TILE_SIZE + 4)).toBe(true); // furniture
    expect(house.isWallAt(400 + 5 * TILE_SIZE + 4, 200 + 6 * TILE_SIZE + 4)).toBe(false); // the door
  });

  it("puts its NPC where the drawing says, in screen pixels", function () {
    expect(house.npcs.length).toBe(1);
    expect(house.npcs[0].name).toBe("Hermit");
    expect(house.npcs[0].pos.x).toBe(400 + 6 * TILE_SIZE);
    expect(house.npcs[0].pos.y).toBe(200 + 3 * TILE_SIZE);
    expect(house.npcs[0].getDialoguePages()).toEqual(["Hello.", "Goodbye."]);
  });

  it("has one exit, found by standing in the door", function () {
    expect(house.exits.length).toBe(1);
    const door = house.template.door.tiles[1];
    const inDoor = house.getExitAt(400 + (door.col + 0.5) * TILE_SIZE, 200 + (door.row + 0.5) * TILE_SIZE);
    expect(inDoor).toBe(house.exits[0]);
    expect(house.getExitAt(400 + 3 * TILE_SIZE, 200 + 3 * TILE_SIZE)).toBe(null);
  });

  it("brings the player in on the floor just inside the door", function () {
    const entry = house.getEntryPoint();
    expect(entry.x).toBe(400 + 6 * TILE_SIZE); // between the two door tiles
    expect(entry.y).toBe(200 + 5.5 * TILE_SIZE); // one tile up from the door row
    expect(house.getExitAt(entry.x, entry.y)).toBe(null);
    expect(house.isWallAt(entry.x, entry.y)).toBe(false);
    expect(house.getPlayerSpawn()).toEqual(entry);
  });

  it("starts with no enemies and nothing to clear", function () {
    expect(house.enemies).toEqual([]);
    expect(house.exits[0].toId).toBe("overworld");
  });
});


// ===== from campaign.spec.js =====
// Specs for the whole game's shape: three fixed overworlds, three dungeons of rising difficulty,
// the boss room's door onward, and the final room.
describe("the three overworlds", function () {
  it("are three, each a good drawing with a name and a look of its own", function () {
    expect(OVERWORLD_TEMPLATES.length).toBe(3);
    expect(validateOverworldTemplates()).toEqual([]);
    expect(new Set(OVERWORLD_TEMPLATES.map((t) => t.name)).size).toBe(3);
    expect(new Set(OVERWORLD_TEMPLATES.map((t) => t.theme)).size).toBe(3);
  });

  it("start with the one the older code calls the overworld", function () {
    expect(OVERWORLD_TEMPLATE).toBe(OVERWORLD_TEMPLATES[0]);
  });

  it("are all round clearings in forest, bigger than the screen", function () {
    for (const template of OVERWORLD_TEMPLATES) {
      const parsed = parseOverworldTemplate(template);
      expect(parsed.cols).toBe(parsed.rows);
      expect(parsed.cols * TILE_SIZE).toBeGreaterThan(1280);
      const radius = parsed.cols / 2;
      parsed.grid.forEach((row, r) => row.forEach((type, c) => {
        if (type !== TILE.WALL) {
          expect(Math.hypot(c + 0.5 - radius, r + 0.5 - radius)).toBeLessThanOrEqual(radius);
        }
      }));
      const last = parsed.cols - 1;
      for (const [c, r] of [[0, 0], [last, 0], [0, last], [last, last]]) {
        expect(parsed.grid[r][c]).toBe(TILE.WALL);
      }
    }
  });

  it("each have one dungeon entrance, some NPCs and some houses to enter", function () {
    for (const template of OVERWORLD_TEMPLATES) {
      const parsed = parseOverworldTemplate(template);
      expect(parsed.entrances.length).toBe(1);
      expect(template.npcs.length).toBeGreaterThanOrEqual(3);
      expect(template.houses.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("are laid out differently: the start and the entrance are in different places", function () {
    const spots = OVERWORLD_TEMPLATES.map((t) => {
      const p = parseOverworldTemplate(t);
      return p.player.col + "," + p.player.row + "/" + p.entrances[0].tiles[0].col + "," + p.entrances[0].tiles[0].row;
    });
    expect(new Set(spots).size).toBe(3);
  });

  describe("created for a run", function () {
    it("are three, numbered in order, with ids that cannot clash", function () {
      const worlds = createOverworlds(320, 160);
      expect(worlds.length).toBe(3);
      expect(worlds.map((w) => w.index)).toEqual([0, 1, 2]);
      expect(worlds.map((w) => w.id)).toEqual(["overworld-1", "overworld-2", "overworld-3"]);
      expect(worlds.every((w) => w.isOverworld)).toBe(true);
    });

    it("are exactly the same every time: same tiles, same start, same NPCs, same houses", function () {
      const a = createOverworlds(320, 160);
      const b = createOverworlds(320, 160);
      a.forEach((world, i) => {
        expect(world.tileGrid).toEqual(b[i].tileGrid);
        expect(world.getPlayerSpawn()).toEqual(b[i].getPlayerSpawn());
        expect(world.entrances.map((e) => e.tiles)).toEqual(b[i].entrances.map((e) => e.tiles));
        expect(world.npcs.map((n) => [n.name, n.pos.x, n.pos.y])).toEqual(b[i].npcs.map((n) => [n.name, n.pos.x, n.pos.y]));
        expect(world.houses.map((h) => [h.name, h.x, h.y])).toEqual(b[i].houses.map((h) => [h.name, h.x, h.y]));
      });
    });

    it("keep their NPCs on grass and every house's door reachable", function () {
      for (const world of createOverworlds(320, 160)) {
        for (const npc of world.npcs) {
          const c = npc.getCenter();
          expect(world.isWallAt(c.x, c.y)).toBe(false);
        }
        for (const house of world.houses) {
          const landing = world.getHouseLanding(house);
          expect(world.isWallAt(landing.x, landing.y)).toBe(false);
        }
      }
    });
  });
});

describe("the three dungeons", function () {
  it("are defined by good definitions", function () {
    expect(DUNGEON_DEFINITIONS.length).toBe(3);
    expect(validateDungeonDefinitions()).toEqual([]);
  });

  it("get bigger, and their enemies tougher, one after the other", function () {
    const [a, b, c] = DUNGEON_DEFINITIONS;
    expect(a.roomCount).toBeLessThan(b.roomCount);
    expect(b.roomCount).toBeLessThan(c.roomCount);
    expect(a.healthScale).toBeLessThan(b.healthScale);
    expect(b.healthScale).toBeLessThan(c.healthScale);
  });

  it("are built from room pools that differ, with a boss room of their own", function () {
    const pools = DUNGEON_DEFINITIONS.map((d) => d.rooms);
    expect(new Set(pools.map((p) => p.slice().sort().join())).size).toBe(3);
    const bosses = DUNGEON_DEFINITIONS.map((d) =>
      templatesForDungeon(d).filter((t) => t.role === "boss").map((t) => t.name).join());
    expect(new Set(bosses).size).toBe(3);
  });

  it("have rooms that get harder on average", function () {
    const average = DUNGEON_DEFINITIONS.map((d) => {
      const normal = templatesForDungeon(d).filter((t) => t.role === "normal").map(roomThreat);
      return normal.reduce((a, b) => a + b, 0) / normal.length;
    });
    expect(average[0]).toBeLessThan(average[1]);
    expect(average[1]).toBeLessThan(average[2]);
  });

  it("have tints that tell them apart", function () {
    expect(DUNGEON_DEFINITIONS[0].tileTint).toBe(null);
    expect(DUNGEON_DEFINITIONS[1].tileTint).not.toEqual(DUNGEON_DEFINITIONS[2].tileTint);
  });

  describe("generateDungeonFor", function () {
    it("makes each dungeon from its own pool, with its own size, strength and look", function () {
      DUNGEON_DEFINITIONS.forEach((definition, stage) => {
        for (let seed = 1; seed <= 25; seed++) {
          const dungeon = generateDungeonFor(stage, { seed, screenX: 320, screenY: 160 });
          expect(dungeon.stage).toBe(stage);
          expect(dungeon.name).toBe(definition.name);
          expect(dungeon.rooms.length).toBe(definition.roomCount);
          for (const room of dungeon.rooms) {
            expect(definition.rooms).toContain(room.template.name);
            expect(room.healthScale).toBe(definition.healthScale);
            expect(room.tileTint).toEqual(definition.tileTint);
          }
          expect(dungeon.start.overworldExit).not.toBe(null);
          expect(dungeon.boss.onwardDoor).not.toBe(null);
        }
      });
    });

    it("makes the same dungeon from the same seed, and different ones from different seeds", function () {
      const names = (d) => d.rooms.map((r) => r.template.name).join();
      expect(names(generateDungeonFor(1, { seed: 9 }))).toBe(names(generateDungeonFor(1, { seed: 9 })));
      const different = new Set();
      for (let seed = 1; seed <= 12; seed++) different.add(names(generateDungeonFor(1, { seed })));
      expect(different.size).toBeGreaterThan(1);
    });

    it("refuses a dungeon that does not exist", function () {
      let message = "";
      try {
        generateDungeonFor(3);
      } catch (e) {
        message = e.message;
      }
      expect(message).toContain("no dungeon number 4");
    });

    it("gives later dungeons enemies with more health, boss included", function () {
      const healthOf = (stage, role) => {
        const dungeon = generateDungeonFor(stage, { seed: 4, screenX: 320, screenY: 160 });
        const room = role === "boss" ? dungeon.boss : dungeon.rooms.find((r) => r.role === "normal" && r.template.rows.join("").match(/[JZSB]/));
        room.spawnEnemies();
        return room.enemies.map((e) => e.maxHealth);
      };
      const demon = ENEMY_TYPES.DemonKnight.maxHealth;
      expect(healthOf(0, "boss")).toContain(demon);
      expect(healthOf(1, "boss")).toContain(Math.round(demon * 1.5));
      expect(healthOf(2, "boss")).toContain(demon * 2);
      for (const e of generateDungeonFor(2, { seed: 4, screenX: 320, screenY: 160 }).boss.enemies) {
        expect(e.health).toBe(e.maxHealth);
      }
    });
  });

  describe("health scaling in a room", function () {
    it("leaves enemies as they are at the default scale", function () {
      const room = generateDungeon({ seed: 6, screenX: 320, screenY: 160 }).boss;
      room.spawnEnemies();
      expect(room.enemies.find((e) => e.typeName === "DemonKnight").maxHealth).toBe(ENEMY_TYPES.DemonKnight.maxHealth);
    });
  });
});

describe("the boss room's door to the next area", function () {
  let dungeon;
  let boss;
  beforeEach(function () {
    dungeon = generateDungeonFor(0, { seed: 8, screenX: 320, screenY: 160 });
    boss = dungeon.boss;
  });

  const tileType = (t) => boss.getTile(t.col, t.row);
  const pixelOf = (t) => ({ x: boss.x + (t.col + 0.5) * TILE_SIZE, y: boss.y + (t.row + 0.5) * TILE_SIZE });

  it("is in every boss room and no other", function () {
    for (const t of ROOM_TEMPLATES) {
      const parsed = parseRoomTemplate(t);
      if (t.role === "boss") {
        expect(parsed.onwardDoor).not.toBe(null, t.name);
        expect(parsed.onwardDoor.tiles.length).toBe(DOOR_WIDTH);
      } else {
        expect(parsed.onwardDoor).toBe(null, t.name);
      }
    }
  });

  it("starts shut, solid like a closed door", function () {
    for (const t of boss.onwardDoor.tiles) {
      expect(tileType(t)).toBe(TILE.DOOR_CLOSED);
      const p = pixelOf(t);
      expect(boss.isWallAt(p.x, p.y)).toBe(true);
    }
  });

  it("is not one of the doors that lead to other rooms", function () {
    const tiles = new Set(boss.exits.flatMap((e) => e.tiles.map((t) => t.col + "," + t.row)));
    for (const t of boss.onwardDoor.tiles) expect(tiles.has(t.col + "," + t.row)).toBe(false);
  });

  it("stays shut while the boss is alive, even with the other doors shut too", function () {
    boss.spawnEnemies();
    boss.closeDoors();
    for (const t of boss.onwardDoor.tiles) expect(tileType(t)).toBe(TILE.DOOR_CLOSED);
  });

  it("opens when the room is cleared, and the player can then stand in it", function () {
    boss.spawnEnemies();
    for (const e of boss.enemies) e.health = 0;
    boss.onClear();
    for (const t of boss.onwardDoor.tiles) {
      expect(tileType(t)).toBe(TILE.DOOR_OPEN);
      const p = pixelOf(t);
      expect(boss.isWallAt(p.x, p.y)).toBe(false);
      expect(boss.getOnwardDoorAt(p.x, p.y)).toBe(boss.onwardDoor);
    }
    expect(boss.getOnwardDoorAt(boss.x + boss.width / 2, boss.y + boss.height / 2)).toBe(null);
  });

  it("is looked up by getDoorPiece like any door, so it is drawn as one", function () {
    const t = boss.onwardDoor.tiles[0];
    expect(getDoorPiece(boss, t.col, t.row)).toBeTruthy();
  });

  describe("drawings", function () {
    const room = (rows, role = "boss") => ({ name: "t", role, rows });
    const base = () => [
      "################",
      "#..............#",
      "#..............#",
      "#.......D......#",
      "#..............#",
      "#..............#",
      "#..............#",
      "#######++#######"
    ];
    const withBottom = (b) => { const r = base(); r[7] = b; return r; };
    const filler = () => ["################", ...base().slice(1, 7), "#######++#######"].map((r) => r.replace("D", "."));
    const problems = (t) => validateRoomTemplates([
      { name: "s", role: "start", rows: filler().map((r, i) => (i === 3 ? "#.......@......#" : r)) },
      t,
      { name: "n", role: "normal", rows: filler() }
    ]);

    it("accepts a good one", function () {
      expect(problems(room(withBottom("###>>####++#####"))).join()).toBe("");
    });

    it("is only allowed in a boss room", function () {
      const normal = { name: "x", role: "normal", rows: withBottom("###>>####++#####").map((r) => r.replace("D", ".")) };
      expect(problems(normal).join()).toContain("only a boss room can have a >");
    });

    it("must be two wide, with floor just inside, not touching another door, and only one", function () {
      expect(problems(room(withBottom("###>>>###++#####"))).join()).toContain("must be 2");
      const blocked = base(); blocked[6] = "#..xx..........#"; blocked[7] = "###>>####++#####";
      expect(problems(room(blocked)).join()).toContain("plain floor");
      expect(problems(room(withBottom("###>>++#########"))).join()).toContain("touching another door");
      expect(problems(room(withBottom("###>>>>>>++#####"))).join().length).toBeGreaterThan(0);
      expect(problems(room(withBottom("#>>###>>##++####"))).join()).toContain("only one >");
    });

    it("can only go on the outer wall", function () {
      const loose = base(); loose[3] = "#......>>.D....#";
      expect(problems(room(loose)).join()).toContain("outer wall");
    });
  });
});

describe("the final room", function () {
  let room;
  beforeEach(function () {
    room = new FinalRoom(320, 160);
  });

  it("is an empty arena: no enemies, nothing in it, and no way out", function () {
    room.spawnEnemies && room.spawnEnemies();
    expect(room.enemies).toEqual([]);
    expect(room.items).toEqual([]);
    expect(room.npcs).toEqual([]);
    expect(room.exits).toEqual([]);
    expect(room.overworldExit).toBe(null);
    expect(room.onwardDoor).toBe(null);
  });

  it("is closed in by walls all round, with open floor inside", function () {
    const grid = room.tileGrid;
    grid.forEach((row, r) => row.forEach((type, c) => {
      const onRing = r === 0 || c === 0 || r === grid.length - 1 || c === row.length - 1;
      expect(type).toBe(onRing ? TILE.WALL : TILE.FLOOR);
    }));
  });

  it("fits on the screen, centered where a dungeon room would be", function () {
    expect(room.width).toBeLessThanOrEqual(SCREEN_COLS * TILE_SIZE);
    expect(room.height).toBeLessThanOrEqual(SCREEN_ROWS * TILE_SIZE);
    expect(room.x + room.width / 2).toBe(320 + (SCREEN_COLS * TILE_SIZE) / 2);
  });

  it("has an entry point and a spot for the final boss, both on open floor", function () {
    for (const spot of [room.getEntryPoint(), room.getBossSpawn()]) {
      expect(room.isWallAt(spot.x, spot.y)).toBe(false);
    }
    expect(room.getPlayerSpawn()).toEqual(room.getEntryPoint());
  });

  it("has an id that no dungeon room, house or overworld has", function () {
    expect(room.id).toBe("final-room");
    expect(room.isFinalRoom).toBe(true);
  });
});

describe("a run through all of it", function () {
  const none = () => new p5.Vector(0, 0);
  const frame = (run) => run.update({ move: none(), fire: none() });
  let worlds;
  let finalRoom;
  let factoryCalls;
  let run;

  const standOn = (run, spot) =>
    run.player.pos.set(spot.x - run.player.length / 2, spot.y - run.player.width / 2);
  const tileMiddle = (room, t) => ({ x: room.x + (t.col + 0.5) * TILE_SIZE, y: room.y + (t.row + 0.5) * TILE_SIZE });

  // Walks into the dungeon of the overworld the run is on, kills the boss and goes through its door.
  const clearDungeon = () => {
    const entrance = run.overworld.entrances[0];
    standOn(run, tileMiddle(run.overworld, entrance.tiles[0]));
    frame(run);
    const dungeon = run.dungeon;
    run.enterRoom(dungeon.boss); // straight to the boss room, which the tests above cover reaching
    for (const e of dungeon.boss.enemies) e.health = 0;
    frame(run); // the room is cleared, and the doors open
    return dungeon;
  };

  beforeEach(function () {
    worlds = createOverworlds(320, 160);
    finalRoom = new FinalRoom(320, 160);
    factoryCalls = [];
    run = new Run(null, "Fire", PLAYER_MODEL_NAMES[0], makeAppearance(), worlds, (entrance, overworld) => {
      factoryCalls.push(overworld.index);
      return generateDungeonFor(overworld.index, { seed: 20 + overworld.index, screenX: 320, screenY: 160 });
    }, finalRoom);
  });

  it("starts in the first overworld", function () {
    expect(run.overworld).toBe(worlds[0]);
    expect(run.room).toBe(worlds[0]);
    expect(run.stage).toBe(0);
    expect(run.inOverworld()).toBe(true);
  });

  it("makes the dungeon that belongs to the overworld the player enters it from", function () {
    standOn(run, tileMiddle(worlds[0], worlds[0].entrances[0].tiles[0]));
    frame(run);
    expect(factoryCalls).toEqual([0]);
    expect(run.dungeon.stage).toBe(0);
  });

  it("keeps the player in the boss room while the boss is alive: the shut door is a wall", function () {
    standOn(run, tileMiddle(worlds[0], worlds[0].entrances[0].tiles[0]));
    frame(run);
    const boss = run.dungeon.boss;
    run.enterRoom(boss);
    const door = boss.onwardDoor;
    const inside = door.inside[0];
    const push = new p5.Vector(door.tiles[0].col - inside.col, door.tiles[0].row - inside.row);
    standOn(run, tileMiddle(boss, inside));
    for (let i = 0; i < 90; i++) {
      run.update({ move: push, fire: none() });
    }
    expect(run.room).toBe(boss);
    expect(run.stage).toBe(0);
  });

  it("goes on to the next overworld when the player walks through the opened door", function () {
    const dungeon = clearDungeon();
    standOn(run, tileMiddle(dungeon.boss, dungeon.boss.onwardDoor.tiles[0]));
    frame(run);
    expect(run.stage).toBe(1);
    expect(run.overworld).toBe(worlds[1]);
    expect(run.inOverworld()).toBe(true);
    expect(run.dungeon).toBe(null);
    const spawn = worlds[1].getPlayerSpawn();
    expect(run.player.getCenter().x).toBe(spawn.x);
    expect(run.player.getCenter().y).toBe(spawn.y);
    expect(run.entrySpot).toEqual(spawn);
  });

  it("leads each overworld's entrance to its own, tougher, dungeon", function () {
    for (let stage = 0; stage < 3; stage++) {
      const dungeon = clearDungeon();
      expect(dungeon.stage).toBe(stage);
      expect(dungeon.name).toBe(DUNGEON_DEFINITIONS[stage].name);
      standOn(run, tileMiddle(dungeon.boss, dungeon.boss.onwardDoor.tiles[0]));
      frame(run);
    }
    expect(factoryCalls).toEqual([0, 1, 2]);
    expect(run.dungeons.size).toBe(3);
  });

  it("ends in the empty final room after the third dungeon", function () {
    for (let stage = 0; stage < 3; stage++) {
      const dungeon = clearDungeon();
      standOn(run, tileMiddle(dungeon.boss, dungeon.boss.onwardDoor.tiles[0]));
      frame(run);
    }
    const entry = finalRoom.getEntryPoint();
    expect(run.room).toBe(finalRoom);
    expect(run.inFinalRoom()).toBe(true);
    expect(run.inOverworld()).toBe(false);
    expect(run.dungeon).toBe(null);
    expect(run.player.getCenter().x).toBe(entry.x);
    expect(run.player.getCenter().y).toBe(entry.y);
    expect(finalRoom.enemies).toEqual([]);
    frame(run);
    frame(run);
    expect(run.inFinalRoom()).toBe(true); // nothing sends the player anywhere from here
  });

  it("does not let the player go back to an earlier overworld's dungeon", function () {
    const dungeon = clearDungeon();
    standOn(run, tileMiddle(dungeon.boss, dungeon.boss.onwardDoor.tiles[0]));
    frame(run);
    expect(run.leaveDungeon()).toBe(false);
    expect(run.stage).toBe(1);
  });

  it("brings the player out of the second dungeon to the second overworld's entrance", function () {
    let dungeon = clearDungeon();
    standOn(run, tileMiddle(dungeon.boss, dungeon.boss.onwardDoor.tiles[0]));
    frame(run);
    standOn(run, tileMiddle(worlds[1], worlds[1].entrances[0].tiles[0]));
    frame(run);
    expect(run.dungeon.stage).toBe(1);
    run.enterRoom(run.dungeon.start);
    standOn(run, tileMiddle(run.room, run.room.overworldExit.tiles[0]));
    frame(run);
    const landing = worlds[1].getEntranceLanding(worlds[1].entrances[0]);
    expect(run.room).toBe(worlds[1]);
    expect(run.player.getCenter().x).toBe(landing.x);
    expect(run.player.getCenter().y).toBe(landing.y);
  });

  it("ignores advancing when not in a boss room, or in a run with nowhere to go", function () {
    expect(run.advance()).toBe(false); // in the overworld
    const single = new Run(generateDungeonFor(0, { seed: 3, screenX: 320, screenY: 160 }), "Fire", PLAYER_MODEL_NAMES[0], makeAppearance());
    single.enterRoom(single.dungeon.boss);
    expect(single.advance()).toBe(false); // no overworld, no final room
    expect(single.dungeon).not.toBe(null);
  });
});
