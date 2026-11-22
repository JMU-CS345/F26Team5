// Dungeon generation. No p5 drawing calls, so Jasmine can test it without a canvas.
// Load after rng.js, tile-types.js, room.js, template-room.js and room-templates.js, and before sketch.js.
//
// Every room comes from the pre-made list in room-templates.js, and each drawing decides its
// own size and where its doors are. This file decides which rooms are used, in what order,
// and where they sit in the dungeon:
//  - The dungeon is a map measured in tiles. Each room is a rectangle on it, and no two
//    rectangles may overlap. Rooms may touch.
//  - A new room is placed against a door of a room that is already there, so that one of its
//    own doors sits straight across. The two doors are then opened and lead to each other.
//  - Any rooms that end up touching with doors straight across can get extra doors between
//    them. That is how two doors on one wall can lead to the same room or to different rooms.
//  - Doors nobody uses stay walls.
// The player only ever sees one room at a time, centered on the screen; the map is for
// keeping rooms from overlapping and for the minimap.

const SCREEN_COLS = 40; // one screen is 640x400 pixels, in tiles
const SCREEN_ROWS = 25;

// dx, dy: which way the next room lies when you go out through that wall.
const SIDES = Object.freeze({
  N: { dx: 0, dy: -1, opposite: "S" },
  E: { dx: 1, dy: 0, opposite: "W" },
  S: { dx: 0, dy: 1, opposite: "N" },
  W: { dx: -1, dy: 0, opposite: "E" }
});
const SIDE_NAMES = Object.freeze(Object.keys(SIDES));

// A room on the dungeon map: { template, wx, wy } where wx, wy is its top-left tile.
function boxesOverlap(a, b) {
  return (
    a.wx < b.wx + b.template.cols &&
    b.wx < a.wx + a.template.cols &&
    a.wy < b.wy + b.template.rows &&
    b.wy < a.wy + a.template.rows
  );
}

// Where the top-left tile of a room made from template tb must be so that its door db sits
// straight across from door da of the placed room a (touching, with the doors lined up).
function originAcross(a, da, tb, db) {
  const along = da.start - db.start;
  if (da.side === "E") return { wx: a.wx + a.template.cols, wy: a.wy + along };
  if (da.side === "W") return { wx: a.wx - tb.cols, wy: a.wy + along };
  if (da.side === "S") return { wx: a.wx + along, wy: a.wy + a.template.rows };
  return { wx: a.wx + along, wy: a.wy - tb.rows }; // N
}

// True if door da of placed room a and door db of placed room b are straight across.
function doorsMeet(a, da, b, db) {
  if (SIDES[da.side].opposite !== db.side) {
    return false;
  }
  const o = originAcross(a, da, b.template, db);
  return o.wx === b.wx && o.wy === b.wy;
}

// How many doors away every room is from the start room (an array indexed by room id).
// edgesOf says how to find a room's neighbors; the default reads room.exits.
function doorDistances(rooms, startId, edgesOf = (r) => r.exits) {
  const dist = new Array(rooms.length).fill(-1);
  dist[startId] = 0;
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.shift();
    for (const edge of edgesOf(rooms[id])) {
      if (dist[edge.toId] === -1) {
        dist[edge.toId] = dist[id] + 1;
        queue.push(edge.toId);
      }
    }
  }
  return dist;
}

class Dungeon {
  constructor(seed, rooms) {
    this.seed = seed;
    this.rooms = rooms;
    this.start = rooms[0];
    this.boss = rooms.find((r) => r.role === "boss") || null;
  }

  // Where the center of the player should be after walking out of fromRoom through exit:
  // on the floor just inside the door it leads to.
  entryPoint(fromRoom, exit) {
    const dest = this.rooms[exit.toId];
    const back = dest.exits.find((e) => e.doorIndex === exit.toDoor);
    const ts = dest.tileSize;
    const first = back.tiles[0];
    const last = back.tiles[back.tiles.length - 1];
    let x = dest.x + ((first.col + last.col) / 2 + 0.5) * ts;
    let y = dest.y + ((first.row + last.row) / 2 + 0.5) * ts;
    if (back.side === "N") y += ts;
    if (back.side === "S") y -= ts;
    if (back.side === "W") x += ts;
    if (back.side === "E") x -= ts;
    return { x, y };
  }
}

// Options (all optional):
//   roomCount    how many rooms, counting the start and boss rooms (default 9 to 11, from the
//                seed). One treasure room is added on top when the room list has one.
//   seed         whole number; the same seed always gives the same dungeon
//   tier         dungeon number 1 to 3 (default 1): bigger fights in later dungeons
//   loopChance   0..1, chance that two doors that happen to meet get opened (default 0.5)
//   branchiness  0..1, low = long winding path, high = bushy (default 0.5)
//   screenX/Y    pixel position of the top-left corner of a screen (default 0, 0)
//   templates    the room list to use (default ROOM_TEMPLATES)
//   sizeClasses  the sizes normal rooms must have (default ROOM_SIZE_CLASSES, [] allows any)
function generateDungeon(options = {}) {
  const {
    roomCount: askedCount,
    seed = Math.floor(Math.random() * 4294967296),
    loopChance = 0.5,
    branchiness = 0.5,
    screenX = 0,
    screenY = 0,
    templates = ROOM_TEMPLATES,
    sizeClasses = ROOM_SIZE_CLASSES,
    tier = 1
  } = options;

  const problems = validateRoomTemplates(templates, sizeClasses);
  if (problems.length > 0) {
    throw new Error("Bad room templates:\n" + problems.join("\n"));
  }

  const rng = createRng(seed);
  let roomCount = askedCount;
  if (roomCount === undefined) {
    roomCount = 9 + Math.floor(rng() * 3); // 9 to 11
  }
  const library = templates.map(parseRoomTemplate);
  const poolFor = (role) => {
    const pool = library.filter((t) => t.role === role);
    return pool.length > 0 ? pool : library.filter((t) => t.role === "normal");
  };

  // One attempt at placing every room. Returns the placements, or null if it got stuck
  // (every open door was blocked by other rooms), in which case the caller tries again.
  function tryLayout() {
    const placed = [];
    const used = new Map(library.map((t) => [t.name, 0]));
    const openDoors = (p) => p.template.doors.filter((d) => !p.usedDoors.has(d.index));

    function place(template, wx, wy, role) {
      const p = { id: placed.length, template, wx, wy, role, links: [], usedDoors: new Set() };
      placed.push(p);
      used.set(template.name, used.get(template.name) + 1);
      return p;
    }

    function connect(a, da, b, db) {
      a.usedDoors.add(da.index);
      b.usedDoors.add(db.index);
      a.links.push({ toId: b.id, doorIndex: da.index, toDoor: db.index });
      b.links.push({ toId: a.id, doorIndex: db.index, toDoor: da.index });
    }

    // Tries to put a new room from pool against one of room a's unused doors. Rooms used
    // least so far go first. Returns the new room, or null if nothing fits without overlap.
    function attach(a, pool, role) {
      for (const da of shuffle(openDoors(a), rng)) {
        const candidates = shuffle(pool, rng).sort((x, y) => used.get(x.name) - used.get(y.name));
        for (const tb of candidates) {
          const facing = tb.doors.filter((d) => d.side === SIDES[da.side].opposite);
          for (const db of shuffle(facing, rng)) {
            const origin = originAcross(a, da, tb, db);
            const box = { template: tb, wx: origin.wx, wy: origin.wy };
            if (placed.some((p) => boxesOverlap(p, box))) {
              continue;
            }
            const b = place(tb, origin.wx, origin.wy, role);
            connect(a, da, b, db);
            return b;
          }
        }
      }
      return null;
    }

    // The start room sits at the middle of the map.
    place(shuffle(poolFor("start"), rng)[0], 0, 0, "start");

    // Grow outward: pick a room that still has a free door and hang a new room off it.
    const normalCount = Math.max(0, roomCount - 2);
    const normals = poolFor("normal");
    const stuck = new Set(); // rooms where nothing fits any more
    while (placed.length - 1 < normalCount) {
      const choices = placed.filter((p) => !stuck.has(p.id) && openDoors(p).length > 0);
      if (choices.length === 0) {
        return null;
      }
      const a = rng() < branchiness
        ? choices[Math.floor(rng() * choices.length)]
        : choices[choices.length - 1];
      if (!attach(a, normals, "normal")) {
        stuck.add(a.id);
      }
    }

    // The treasure room hangs off any room with a free door. It is a dead end.
    const hasTreasure = library.some((t) => t.role === "treasure") && roomCount >= 3;
    if (hasTreasure) {
      const hosts = shuffle(placed.filter((p) => openDoors(p).length > 0), rng);
      if (!hosts.some((a) => attach(a, library.filter((t) => t.role === "treasure"), "treasure"))) {
        return null;
      }
    }

    // The boss room goes on the room farthest from the start that it fits against.
    if (roomCount >= 2) {
      const dist = doorDistances(placed, 0, (p) => p.links);
      const farthestFirst = placed.slice().sort((x, y) => dist[y.id] - dist[x.id]);
      if (!farthestFirst.some((a) => attach(a, poolFor("boss"), "boss"))) {
        return null;
      }
    }

    // Open extra doors wherever two rooms touch with doors straight across. The boss room
    // keeps just the one door it was placed on.
    for (const a of placed) {
      for (const b of placed) {
        if (a.id >= b.id || a.role === "boss" || b.role === "boss") {
          continue;
        }
        for (const da of a.template.doors) {
          for (const db of b.template.doors) {
            if (a.usedDoors.has(da.index) || b.usedDoors.has(db.index)) continue;
            if (doorsMeet(a, da, b, db) && rng() < loopChance) {
              connect(a, da, b, db);
            }
          }
        }
      }
    }
    return placed;
  }

  let layout = null;
  for (let attempt = 0; attempt < 200 && layout === null; attempt++) {
    layout = tryLayout();
  }
  if (layout === null) {
    throw new Error(
      "Could not fit " + roomCount + " rooms together. Try fewer rooms, or add rooms with " +
      "doors on more walls."
    );
  }

  // Build the real rooms, each centered on the screen, and open the doors that are used.
  const rooms = layout.map((p) => {
    const col = Math.floor((SCREEN_COLS - p.template.cols) / 2);
    const row = Math.floor((SCREEN_ROWS - p.template.rows) / 2);
    const roomSeed = (seed ^ Math.imul(p.id + 1, 0x9e3779b1)) >>> 0; // its own enemy mix
    const room = new TemplateRoom(
      screenX + col * TILE_SIZE,
      screenY + row * TILE_SIZE,
      p.template,
      { tier, seed: roomSeed }
    );
    return Object.assign(room, { id: p.id, role: p.role, worldCol: p.wx, worldRow: p.wy });
  });
  for (const p of layout) {
    for (const link of p.links) {
      rooms[p.id].openDoor(p.template.doors[link.doorIndex], link.toId, link.toDoor);
    }
  }

  return new Dungeon(seed, rooms);
}