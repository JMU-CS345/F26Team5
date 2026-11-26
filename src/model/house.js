// A house you can walk into from the overworld: a small room of its own, with one door back out
// and NPCs inside. No p5 drawing calls, so Jasmine can test it without a canvas.
// Load after room.js, tile-types.js and npc.js, and before overworld.js.
//
// A house is drawn as text, like a room template (see overworld-map.js for the houses):
//   #  wall     .  floor     x  furniture (an obstacle)
//   +  the door, on the outer wall, always 2 tiles side by side, with plain floor just inside

const HOUSE_CHARS = Object.freeze({
  "#": TILE.WALL,
  ".": TILE.FLOOR,
  x: TILE.INTERIOR_WALL,
  "+": TILE.HOUSE_DOOR
});

// Which wall of the room a tile on the outer ring is on.
function houseWallSide(cols, rows, col, row) {
  if (row === 0) return "N";
  if (row === rows - 1) return "S";
  if (col === 0) return "W";
  if (col === cols - 1) return "E";
  return null;
}

// Reads one house drawing into { id, name, cols, rows, grid, door, npcs }.
//   id    the digit the house's door is drawn with on the overworld map, as text
//   door  { side, tiles: [{ col, row }, ...] } the tiles of the way out
// Assumes the template already passed validateHouseTemplate.
function parseHouseTemplate(template) {
  const text = template.rows;
  const parsed = {
    id: String(template.id),
    name: template.name,
    cols: text[0].length,
    rows: text.length,
    grid: [],
    door: { side: null, tiles: [] },
    npcs: template.npcs || []
  };
  for (let row = 0; row < parsed.rows; row++) {
    const tiles = [];
    for (let col = 0; col < parsed.cols; col++) {
      const ch = text[row][col];
      tiles.push(HOUSE_CHARS[ch]);
      if (ch === "+") {
        parsed.door.tiles.push({ col, row });
      }
    }
    parsed.grid.push(tiles);
  }
  if (parsed.door.tiles.length > 0) {
    const first = parsed.door.tiles[0];
    parsed.door.side = houseWallSide(parsed.cols, parsed.rows, first.col, first.row);
  }
  return parsed;
}

// The NPC problems shared by houses and the overworld: every NPC needs a name, whole-number tile
// position on plain floor, and no two may share a tile. isFloor(col, row) says what plain floor is.
function validateNpcList(npcs, isFloor, bad) {
  const taken = new Set();
  npcs.forEach((n, i) => {
    const label = "NPC #" + (i + 1) + (n && n.name ? " (" + n.name + ")" : "");
    if (!n || typeof n.name !== "string" || n.name === "") {
      bad("NPC #" + (i + 1) + " needs a name");
      return;
    }
    if (!Number.isInteger(n.col) || !Number.isInteger(n.row)) {
      bad(label + " needs a whole-number col and row");
      return;
    }
    if (!isFloor(n.col, n.row)) {
      bad(label + " is not standing on plain floor (column " + n.col + ", row " + n.row + ")");
    }
    const key = n.row * 10000 + n.col;
    if (taken.has(key)) {
      bad(label + " is on the same tile as another NPC");
    }
    taken.add(key);
  });
}

// Checks one house drawing and returns a list of problems (empty if all is well).
function validateHouseTemplate(template) {
  const problems = [];
  const label = "house " + (template && template.name ? template.name : "#" + (template && template.id));
  const bad = (message) => problems.push(label + ": " + message);

  if (!/^[1-9]$/.test(String(template.id))) {
    bad("id must be a digit from 1 to 9 (it is the digit the door is drawn with on the map)");
  }
  if (typeof template.name !== "string" || template.name === "") {
    bad("needs a name");
  }
  if (!Array.isArray(template.rows) || template.rows.length === 0 ||
      template.rows.some((r) => typeof r !== "string")) {
    bad("rows must be a list of text lines");
    return problems;
  }
  const rows = template.rows.length;
  const cols = template.rows[0].length;
  if (template.rows.some((r) => r.length !== cols)) {
    bad("every row must be the same length");
    return problems;
  }
  if (cols < 6 || rows < 6 || cols > SCREEN_COLS || rows > SCREEN_ROWS) {
    bad("size " + cols + "x" + rows + " must be 6 to " + SCREEN_COLS + " wide and 6 to " + SCREEN_ROWS + " tall");
    return problems;
  }
  const unknown = new Set();
  for (const row of template.rows) {
    for (const ch of row) {
      if (HOUSE_CHARS[ch] === undefined) unknown.add(ch);
    }
  }
  if (unknown.size > 0) {
    bad("unknown character " + [...unknown].map((c) => '"' + c + '"').join(" "));
    return problems;
  }

  let ringOk = true;
  let looseDoor = false;
  const door = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = template.rows[r][c];
      const onRing = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
      const onCorner = (r === 0 || r === rows - 1) && (c === 0 || c === cols - 1);
      if (onRing && ch !== "#" && ch !== "+") ringOk = false;
      if (onCorner && ch !== "#") ringOk = false;
      if (!onRing && ch === "+") looseDoor = true;
      if (ch === "+") door.push({ col: c, row: r });
    }
  }
  if (!ringOk) bad("the outer ring must be all # or + (corners must be #)");
  if (looseDoor) bad("the + door can only go on the outer wall");

  const side = door.length > 0 ? houseWallSide(cols, rows, door[0].col, door[0].row) : null;
  const sameWall = door.every((t) => houseWallSide(cols, rows, t.col, t.row) === side);
  const alongOf = (t) => (side === "N" || side === "S" ? t.col : t.row);
  const along = door.map(alongOf);
  if (door.length !== 2 || !sameWall || Math.abs(along[0] - along[1]) !== 1) {
    bad("needs exactly one door: two + side by side on the outer wall");
  } else {
    const inside = door.map((t) => ({
      col: t.col + (side === "W" ? 1 : side === "E" ? -1 : 0),
      row: t.row + (side === "N" ? 1 : side === "S" ? -1 : 0)
    }));
    if (inside.some((t) => template.rows[t.row][t.col] !== ".")) {
      bad("the door needs plain floor (.) just inside it");
    }
  }

  // Every floor tile (and the door) must be reachable from every other one.
  const open = (c, r) => template.rows[r] && (template.rows[r][c] === "." || template.rows[r][c] === "+");
  let total = 0;
  let first = null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (open(c, r)) {
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
        if (!open(nc, nr) || seen.has(nr * cols + nc)) continue;
        seen.add(nr * cols + nc);
        stack.push({ c: nc, r: nr });
      }
    }
    if (seen.size !== total) bad("the floor is split into separate parts, so some of it can't be reached");
  }

  validateNpcList(template.npcs || [], (c, r) => template.rows[r] && template.rows[r][c] === ".", bad);
  return problems;
}

// The inside of a house, as a Room. Its only exit is the door, which the run reads through
// getExitAt like a dungeon door. x, y is where its top-left corner sits on the screen.
class House extends Room {
  constructor(x, y, template) {
    super(x, y, template.cols * TILE_SIZE, template.rows * TILE_SIZE);
    this.template = template;
    this.id = "house-" + template.id; // never clashes with a dungeon room's number
    this.name = template.name;
    this.role = "house";
    this.isHouse = true; // the view reads this to draw wood and furniture
    this.tileGrid = [];
    this.generateLayout();
    this.exits = [{ side: template.door.side, tiles: template.door.tiles, toId: "overworld" }];
    this.npcs = template.npcs.map(
      (n) => new Npc(this.x + n.col * this.tileSize, this.y + n.row * this.tileSize, n.name, n.dialogue)
    );
    // Filled in by the Overworld: the door tiles outside, on the overworld map.
    this.outsideDoorTiles = [];
  }

  generateLayout() {
    this.tileGrid = this.template.grid.map((row) => row.slice());
  }

  // Where the middle of the player stands on coming in: on the floor just inside the door.
  getEntryPoint() {
    const ts = this.tileSize;
    const tiles = this.template.door.tiles;
    const first = tiles[0];
    const last = tiles[tiles.length - 1];
    let x = this.x + ((first.col + last.col) / 2 + 0.5) * ts;
    let y = this.y + ((first.row + last.row) / 2 + 0.5) * ts;
    const side = this.template.door.side;
    if (side === "N") y += ts;
    if (side === "S") y -= ts;
    if (side === "W") x += ts;
    if (side === "E") x -= ts;
    return { x, y };
  }

  // The player's spawn, so a House answers the same question the other rooms do.
  getPlayerSpawn() {
    return this.getEntryPoint();
  }
}
