// Pre-made rooms: turns the text drawings in room-templates.js into real rooms.
// No p5 drawing calls, so Jasmine can test it without a canvas.
// Load after room.js and enemy-types.js.

// What each character in a template means. Enemy letters stand on floor. A + is a door:
// it is a wall until the generator opens it.
const ROOM_CHARS = Object.freeze({
  "#": TILE.WALL,
  ".": TILE.FLOOR,
  o: TILE.PIT,
  x: TILE.INTERIOR_WALL,
  "+": TILE.WALL
});
const ENEMY_CHARS = Object.freeze({
  J: "Jelly",
  Z: "Zombie",
  S: "Skeleton",
  B: "Bat",
  E: "Eyeball",
  D: "Demon"
});
const DOOR_CHAR = "+";
const CHEST_CHAR = "C"; // a treasure chest standing on floor
const PLAYER_START_CHAR = "@";
const ROOM_ROLES = Object.freeze(["start", "normal", "boss"]);
const SIDE_LABELS = Object.freeze({ N: "north", E: "east", S: "south", W: "west" });
const DOOR_WIDTH = 2; // tiles. Every door is this wide so any two doors can meet.

function isWalkableChar(ch) {
  return ch === "." || ch === PLAYER_START_CHAR || ch === CHEST_CHAR
    || ENEMY_CHARS[ch] !== undefined;
}

// Finds every run of + along the four outer walls. Returns a list of
//   { side, start, length }
// where start is the tile number along the wall (the column for N and S, the row for E and W)
// where the run begins. A + anywhere else is ignored here; the validator reports it.
function findDoorRuns(text) {
  const rows = text.length;
  const cols = text[0].length;
  const runs = [];
  const scan = (side, length, charAt) => {
    let start = null;
    for (let i = 0; i <= length; i++) {
      const isDoor = i < length && charAt(i) === DOOR_CHAR;
      if (isDoor && start === null) {
        start = i;
      } else if (!isDoor && start !== null) {
        runs.push({ side, start, length: i - start });
        start = null;
      }
    }
  };
  scan("N", cols, (i) => text[0][i]);
  scan("E", rows, (i) => text[i][cols - 1]);
  scan("S", cols, (i) => text[rows - 1][i]);
  scan("W", rows, (i) => text[i][0]);
  return runs;
}

// The tiles of a door: its wall tiles and the tiles just inside them, as { col, row }.
function doorTiles(cols, rows, side, start) {
  const wall = [];
  const inside = [];
  for (let i = 0; i < DOOR_WIDTH; i++) {
    const along = start + i;
    if (side === "N") {
      wall.push({ col: along, row: 0 });
      inside.push({ col: along, row: 1 });
    } else if (side === "S") {
      wall.push({ col: along, row: rows - 1 });
      inside.push({ col: along, row: rows - 2 });
    } else if (side === "W") {
      wall.push({ col: 0, row: along });
      inside.push({ col: 1, row: along });
    } else {
      wall.push({ col: cols - 1, row: along });
      inside.push({ col: cols - 2, row: along });
    }
  }
  return { wall, inside };
}

// Reads one template into the shape the generator and TemplateRoom use:
//   { name, role, text, cols, rows, grid, spawns, chests, player, doors }
//   grid    tile types, row by row (doors are walls until opened)
//   spawns  [{ type, col, row }] one per enemy letter
//   chests  [{ col, row }] one per C
//   player  { col, row } where @ is, or null
//   doors   [{ index, side, start, tiles: [{col, row}, ...] }] one per drawn door
// Assumes the template already passed validateRoomTemplates.
function parseRoomTemplate(template) {
  const text = template.rows;
  const parsed = {
    name: template.name,
    role: template.role || "normal",
    text,
    cols: text[0].length,
    rows: text.length,
    grid: [],
    spawns: [],
    chests: [],
    player: null,
    doors: []
  };
  for (let row = 0; row < parsed.rows; row++) {
    const tiles = [];
    for (let col = 0; col < parsed.cols; col++) {
      const ch = text[row][col];
      if (ENEMY_CHARS[ch] !== undefined) {
        parsed.spawns.push({ type: ENEMY_CHARS[ch], col, row });
        tiles.push(TILE.FLOOR);
      } else if (ch === CHEST_CHAR) {
        parsed.chests.push({ col, row });
        tiles.push(TILE.FLOOR);
      } else if (ch === PLAYER_START_CHAR) {
        parsed.player = { col, row };
        tiles.push(TILE.FLOOR);
      } else {
        tiles.push(ROOM_CHARS[ch]);
      }
    }
    parsed.grid.push(tiles);
  }
  findDoorRuns(text).forEach((run, index) => {
    parsed.doors.push({
      index,
      side: run.side,
      start: run.start,
      tiles: doorTiles(parsed.cols, parsed.rows, run.side, run.start).wall
    });
  });
  return parsed;
}

// Checks a list of templates and returns a list of problems (empty if all is well). Each
// problem starts with the room's name. Same idea as validateEnemyTypes.
function validateRoomTemplates(templates = ROOM_TEMPLATES) {
  const problems = [];
  const names = new Set();
  let normalCount = 0;

  for (const [letter, type] of Object.entries(ENEMY_CHARS)) {
    if (!ENEMY_TYPE_NAMES.includes(type)) {
      problems.push("enemy letter " + letter + " uses an enemy type that does not exist: " + type);
    }
  }

  templates.forEach((t, i) => {
    const hasName = t && typeof t.name === "string" && t.name !== "";
    const label = hasName ? t.name : "template #" + (i + 1);
    const bad = (message) => problems.push(label + ": " + message);

    if (!hasName) {
      bad("needs a name");
    } else if (names.has(t.name)) {
      bad("the name is used by another room too");
    } else {
      names.add(t.name);
    }

    const role = t.role === undefined ? "normal" : t.role;
    if (!ROOM_ROLES.includes(role)) {
      bad("role must be one of " + ROOM_ROLES.join(", "));
    }
    if (role === "normal") {
      normalCount++;
    }

    if (!Array.isArray(t.rows) || t.rows.length === 0 || t.rows.some((r) => typeof r !== "string")) {
      bad("rows must be a list of text lines");
      return;
    }
    const cols = t.rows[0].length;
    const rows = t.rows.length;
    if (t.rows.some((r) => r.length !== cols)) {
      bad("every row must be the same length");
      return;
    }
    if (cols < 8 || rows < 8 || cols > SCREEN_COLS || rows > SCREEN_ROWS) {
      bad("size " + cols + "x" + rows + " must be 8 to " + SCREEN_COLS + " wide and 8 to " + SCREEN_ROWS + " tall");
      return;
    }

    const unknown = new Set();
    let starts = 0;
    for (const row of t.rows) {
      for (const ch of row) {
        if (ROOM_CHARS[ch] === undefined && ENEMY_CHARS[ch] === undefined
            && ch !== PLAYER_START_CHAR && ch !== CHEST_CHAR) {
          unknown.add(ch);
        }
        if (ch === PLAYER_START_CHAR) {
          starts++;
        }
      }
    }
    if (unknown.size > 0) {
      bad("unknown character " + [...unknown].map((c) => '"' + c + '"').join(" "));
      return;
    }

    if (role === "start" && starts !== 1) {
      bad("a start room needs exactly one @ (it has " + starts + ")");
    }
    if (role !== "start" && starts > 0) {
      bad("only a start room can have an @");
    }

    // The outer ring is wall or door. Corners are always wall. Doors only go on the ring.
    let ringOk = true;
    let looseDoor = false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = t.rows[r][c];
        const onRing = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
        const onCorner = (r === 0 || r === rows - 1) && (c === 0 || c === cols - 1);
        if (onRing && ch !== "#" && ch !== DOOR_CHAR) ringOk = false;
        if (onCorner && ch !== "#") ringOk = false;
        if (!onRing && ch === DOOR_CHAR) looseDoor = true;
      }
    }
    if (!ringOk) {
      bad("the outer ring must be all # or + (corners must be #)");
    }
    if (looseDoor) {
      bad("a + door can only go on the outer wall");
    }

    // Doors: each is exactly DOOR_WIDTH tiles, with plain floor just inside, and every room
    // needs at least one.
    const runs = findDoorRuns(t.rows);
    if (runs.length === 0) {
      bad("needs at least one door (draw two + side by side on the outer wall)");
    }
    for (const run of runs) {
      const where = SIDE_LABELS[run.side] + " wall, tile " + run.start;
      if (run.length !== DOOR_WIDTH) {
        bad("the door on the " + where + " is " + run.length + " tiles wide; doors must be " + DOOR_WIDTH);
        continue;
      }
      const { inside } = doorTiles(cols, rows, run.side, run.start);
      if (inside.some((p) => t.rows[p.row][p.col] !== ".")) {
        bad("the door on the " + where + " needs plain floor (.) just inside it");
      }
    }

    // Every walkable tile must be reachable from every other one.
    let total = 0;
    let first = null;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (isWalkableChar(t.rows[r][c])) {
          total++;
          first = first || { c, r };
        }
      }
    }
    if (total === 0) {
      bad("has no floor");
    } else {
      const seen = new Set([first.r * cols + first.c]);
      const stack = [first];
      while (stack.length > 0) {
        const { c, r } = stack.pop();
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          if (!isWalkableChar(t.rows[nr][nc]) || seen.has(nr * cols + nc)) continue;
          seen.add(nr * cols + nc);
          stack.push({ c: nc, r: nr });
        }
      }
      if (seen.size !== total) {
        bad("the floor is split into separate parts, so some of it can't be reached");
      }
    }
  });

  if (normalCount === 0) {
    problems.push("at least one normal room is needed");
  }
  return problems;
}

// A room built from a template. Enemies appear the first time the player walks in.
// Every drawn door starts as wall; openDoor turns one into a way through.
class TemplateRoom extends Room {
  constructor(x, y, template) {
    super(x, y, template.cols * TILE_SIZE, template.rows * TILE_SIZE);
    this.template = template;
    this.doors = template.doors;
    this.spawned = false;
    this.tileGrid = [];
    this.generateLayout();
    // A chest stands in the middle of the tile marked C.
    for (const spot of template.chests) {
      this.chests.push(new Chest(
        this.x + (spot.col + 0.5) * this.tileSize,
        this.y + (spot.row + 0.5) * this.tileSize
      ));
    }
  }

  generateLayout() {
    this.tileGrid = this.template.grid.map((row) => row.slice());
  }

  // Opens one of the template's doors and records the exit. door is an entry of
  // template.doors; toId and toDoor say which room and which of its doors it leads to.
  openDoor(door, toId, toDoor) {
    for (const { col, row } of door.tiles) {
      this.setTile(col, row, TILE.DOOR_OPEN);
    }
    this.exits.push({ side: door.side, tiles: door.tiles, toId, doorIndex: door.index, toDoor });
  }

  // Creates the template's enemies, once. Each stands in the middle of its tile.
  // The first half of the list appears now, the second half later (see room-flow.js). A boss
  // room only gets its boss.
  spawnEnemies() {
    if (this.spawned) {
      return;
    }
    this.spawned = true;
    let spawns = this.template.spawns;
    const bosses = spawns.filter((s) => ENEMY_TYPES[s.type].boss);
    if (this.role === "boss" && bosses.length > 0) {
      spawns = bosses;
    }
    const firstCount = Math.ceil(spawns.length / 2);
    this.addEnemies(spawns.slice(0, firstCount));
    this.pendingWave = spawns.slice(firstCount);
  }

  // Creates the second wave.
  spawnPendingWave() {
    this.addEnemies(this.pendingWave);
    this.pendingWave = [];
  }

  addEnemies(spawns) {
    for (const spawn of spawns) {
      const type = ENEMY_TYPES[spawn.type];
      const centerX = this.x + (spawn.col + 0.5) * this.tileSize;
      const centerY = this.y + (spawn.row + 0.5) * this.tileSize;
      this.enemies.push(createEnemy(spawn.type, centerX - type.length / 2, centerY - type.width / 2));
    }
  }

  // The pixel at the middle of the tile marked @, or the middle of the room if there is none.
  getPlayerSpawn() {
    const p = this.template.player;
    if (!p) {
      return { x: this.x + this.width / 2, y: this.y + this.height / 2 };
    }
    return {
      x: this.x + (p.col + 0.5) * this.tileSize,
      y: this.y + (p.row + 0.5) * this.tileSize
    };
  }

  onEnter() {
    this.spawnEnemies();
    for (const enemy of this.enemies) {
      enemy.graceTimer = ROOM_GRACE_FRAMES; // no cheap hits at the door
    }
  }
}