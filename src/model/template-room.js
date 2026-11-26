// Pre-made rooms: turns the text drawings in room-templates.js into real rooms.
// No p5 drawing calls, so Jasmine can test it without a canvas.
// Load after room.js and enemy-types.js.

// What each character in a template means. Enemy letters stand on floor. A + is a door:
// it is a wall until the generator opens it. A = is the way out to the overworld (start rooms
// only): it is open from the start, and never needs another room next to it. A > is the door to
// the next area (boss rooms only): it is shut until the room is cleared, and no other room is
// ever placed against it.
const ROOM_CHARS = Object.freeze({
  "#": TILE.WALL,
  ".": TILE.FLOOR,
  o: TILE.PIT,
  x: TILE.INTERIOR_WALL,
  "+": TILE.WALL,
  "=": TILE.OVERWORLD_EXIT,
  ">": TILE.DOOR_CLOSED
});
const ENEMY_CHARS = Object.freeze({
  J: "Jelly",
  Z: "Ghoul",
  S: "Skeleton",
  B: "Bat",
  E: "PeeperJr",
  K: "Bouncer",
  T: "SparkBark",
  D: "DemonKnight",
  L: "Blockette",
  P: "ShadowWizardPurple",
  Y: "ShadowWizardYellow",
  G: "ShadowWizardGreen"
});
const DOOR_CHAR = "+";
const OVERWORLD_EXIT_CHAR = "=";
const ONWARD_DOOR_CHAR = ">";
const PLAYER_START_CHAR = "@";
const ROOM_ROLES = Object.freeze(["start", "normal", "boss"]);
const SIDE_LABELS = Object.freeze({ N: "north", E: "east", S: "south", W: "west" });
const DOOR_WIDTH = 2; // tiles. Every door is this wide so any two doors can meet.

function isWalkableChar(ch) {
  return ch === "." || ch === PLAYER_START_CHAR || ch === OVERWORLD_EXIT_CHAR || ENEMY_CHARS[ch] !== undefined;
}

// Finds every run of + (or of another character, such as the = of the overworld exit) along the
// four outer walls. Returns a list of
//   { side, start, length }
// where start is the tile number along the wall (the column for N and S, the row for E and W)
// where the run begins. The character anywhere else is ignored here; the validator reports it.
function findDoorRuns(text, doorChar = DOOR_CHAR) {
  const rows = text.length;
  const cols = text[0].length;
  const runs = [];
  const scan = (side, length, charAt) => {
    let start = null;
    for (let i = 0; i <= length; i++) {
      const isDoor = i < length && charAt(i) === doorChar;
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
//   { name, role, text, cols, rows, grid, spawns, player, doors, overworldExit }
//   grid    tile types, row by row (doors are walls until opened)
//   spawns  [{ type, col, row }] one per enemy letter
//   player  { col, row } where @ is, or null
//   doors   [{ index, side, start, tiles: [{col, row}, ...] }] one per drawn door
//   overworldExit  { side, start, tiles, inside } for the = way out (tiles in the wall, inside the two
//           floor tiles next to them), or null
//   onwardDoor     the same for the > door to the next area, or null
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
    player: null,
    doors: [],
    overworldExit: null,
    onwardDoor: null
  };
  for (let row = 0; row < parsed.rows; row++) {
    const tiles = [];
    for (let col = 0; col < parsed.cols; col++) {
      const ch = text[row][col];
      if (ENEMY_CHARS[ch] !== undefined) {
        parsed.spawns.push({ type: ENEMY_CHARS[ch], col, row });
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
  const exitRun = findDoorRuns(text, OVERWORLD_EXIT_CHAR)[0];
  if (exitRun) {
    const { wall, inside } = doorTiles(parsed.cols, parsed.rows, exitRun.side, exitRun.start);
    parsed.overworldExit = { side: exitRun.side, start: exitRun.start, tiles: wall, inside };
  }
  const onwardRun = findDoorRuns(text, ONWARD_DOOR_CHAR)[0];
  if (onwardRun) {
    const { wall, inside } = doorTiles(parsed.cols, parsed.rows, onwardRun.side, onwardRun.start);
    parsed.onwardDoor = { side: onwardRun.side, start: onwardRun.start, tiles: wall, inside };
  }
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
        if (ROOM_CHARS[ch] === undefined && ENEMY_CHARS[ch] === undefined && ch !== PLAYER_START_CHAR) {
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
    let looseExit = false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = t.rows[r][c];
        const onRing = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
        const onCorner = (r === 0 || r === rows - 1) && (c === 0 || c === cols - 1);
        if (onRing && ch !== "#" && ch !== DOOR_CHAR && ch !== OVERWORLD_EXIT_CHAR && ch !== ONWARD_DOOR_CHAR) ringOk = false;
        if (onCorner && ch !== "#") ringOk = false;
        if (!onRing && ch === DOOR_CHAR) looseDoor = true;
        if (!onRing && (ch === OVERWORLD_EXIT_CHAR || ch === ONWARD_DOOR_CHAR)) looseExit = true;
      }
    }
    if (!ringOk) {
      bad("the outer ring must be all #, +, = or > (corners must be #)");
    }
    if (looseDoor) {
      bad("a + door can only go on the outer wall");
    }
    if (looseExit) {
      bad("the = way out and the > door can only go on the outer wall");
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

    // The way out to the overworld: a start room can have one (the ones in room-templates.js all
    // do, and a spec checks that), DOOR_WIDTH tiles wide, with plain floor just inside it and a
    // wall tile between it and any door. No other room can have one.
    const exits = findDoorRuns(t.rows, OVERWORLD_EXIT_CHAR);
    if (role !== "start" && exits.length > 0) {
      bad("only a start room can have a = way out to the overworld");
    }
    if (role === "start" && exits.length > 1) {
      bad("a start room can have only one way out to the overworld; it has " + exits.length);
    }
    for (const run of role === "start" ? exits : []) {
      const where = SIDE_LABELS[run.side] + " wall, tile " + run.start;
      if (run.length !== DOOR_WIDTH) {
        bad("the way out on the " + where + " is " + run.length + " tiles wide; it must be " + DOOR_WIDTH);
        continue;
      }
      const { inside } = doorTiles(cols, rows, run.side, run.start);
      if (inside.some((p) => t.rows[p.row][p.col] !== ".")) {
        bad("the way out on the " + where + " needs plain floor (.) just inside it");
      }
      const touching = runs.some((d) => d.side === run.side &&
        d.start < run.start + run.length + 1 && run.start < d.start + d.length + 1);
      if (touching) {
        bad("the way out on the " + where + " is touching a door; leave a wall tile between them");
      }
    }

    // The door to the next area: a boss room can have one, built like a door, with plain floor
    // just inside it and a wall tile between it and any other door or way out. No other room can.
    const onward = findDoorRuns(t.rows, ONWARD_DOOR_CHAR);
    if (role !== "boss" && onward.length > 0) {
      bad("only a boss room can have a > door to the next area");
    }
    if (role === "boss" && onward.length > 1) {
      bad("a boss room can have only one > door to the next area; it has " + onward.length);
    }
    for (const run of role === "boss" ? onward : []) {
      const where = SIDE_LABELS[run.side] + " wall, tile " + run.start;
      if (run.length !== DOOR_WIDTH) {
        bad("the > door on the " + where + " is " + run.length + " tiles wide; it must be " + DOOR_WIDTH);
        continue;
      }
      const { inside } = doorTiles(cols, rows, run.side, run.start);
      if (inside.some((p) => t.rows[p.row][p.col] !== ".")) {
        bad("the > door on the " + where + " needs plain floor (.) just inside it");
      }
      const touching = runs.concat(exits).some((d) => d.side === run.side &&
        d.start < run.start + run.length + 1 && run.start < d.start + d.length + 1);
      if (touching) {
        bad("the > door on the " + where + " is touching another door; leave a wall tile between them");
      }
    }

    // A # inside the room is wall sticking out of the outer wall. Its art has sloped corners,
    // so it must be at least 2 tiles thick: floor on both sides of one tile cannot be drawn.
    const isFloorSide = (r, c) => t.rows[r][c] !== "#" && t.rows[r][c] !== DOOR_CHAR && t.rows[r][c] !== OVERWORLD_EXIT_CHAR && t.rows[r][c] !== ONWARD_DOOR_CHAR;
    let thinWall = null;
    for (let r = 1; r < rows - 1 && !thinWall; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (t.rows[r][c] !== "#") continue;
        const acrossRow = isFloorSide(r, c - 1) && isFloorSide(r, c + 1);
        const acrossColumn = isFloorSide(r - 1, c) && isFloorSide(r + 1, c);
        if (acrossRow || acrossColumn) {
          thinWall = { c, r };
          break;
        }
      }
    }
    if (thinWall) {
      bad("the # at column " + thinWall.c + ", row " + thinWall.r + " is a wall only 1 tile thick; walls inside the room must be at least 2 tiles thick (use x for a 1 tile obstacle)");
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
    this.overworldExit = template.overworldExit; // null unless this is a start room
    this.onwardDoor = template.onwardDoor; // null unless this is a boss room with a > door
    this.spawned = false;
    this.tileGrid = [];
    this.generateLayout();
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
  spawnEnemies() {
    if (this.spawned) {
      return;
    }
    this.spawned = true;
    for (const spawn of this.template.spawns) {
      const type = ENEMY_TYPES[spawn.type];
      const centerX = this.x + (spawn.col + 0.5) * this.tileSize;
      const centerY = this.y + (spawn.row + 0.5) * this.tileSize;
      const enemy = createEnemy(spawn.type, centerX - type.length / 2, centerY - type.width / 2);
      // Later dungeons are tougher: their enemies start with more health.
      enemy.maxHealth = Math.max(1, Math.round(type.maxHealth * this.healthScale));
      enemy.health = enemy.maxHealth;
      this.enemies.push(enemy);
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

  // Spawns the enemies the first time. The doors shut while any enemy is alive, and onClear
  // opens them again. A room that is already cleared, or has no enemies, keeps its doors open.
  onEnter() {
    this.spawnEnemies();
    if (!this.cleared && this.enemies.some((enemy) => !enemy.isDead())) {
      this.closeDoors();
    }
  }
}