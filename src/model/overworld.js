// The overworld: a big outdoor area the player starts in and walks out of into dungeons and
// houses. It is a Room, so walking, collision, shots and NPCs work in it just like in a dungeon
// room, but it is much bigger than the screen (see camera.js) and has dungeon entrances and
// house doors instead of doors between rooms. No p5 drawing calls, so Jasmine can test it
// without a canvas.
// Load after room.js, tile-types.js, template-room.js (for PLAYER_START_CHAR), npc.js and
// house.js, and before run.js.

const OVERWORLD_CHARS = Object.freeze({
  "#": TILE.WALL,
  ".": TILE.FLOOR,
  x: TILE.INTERIOR_WALL,
  D: TILE.DUNGEON_ENTRANCE,
  h: TILE.HOUSE
});
const ENTRANCE_CHAR = "D";
const HOUSE_DOOR_CHARS = "123456789"; // each digit is the door of the house with that id

function isHouseDoorChar(ch) {
  return typeof ch === "string" && ch.length === 1 && HOUSE_DOOR_CHARS.includes(ch);
}

// Groups the tiles that touch (up, down, left or right) and share a character, for the characters
// accepted by wanted(ch). Returns [{ ch, tiles: [{ col, row }] }].
function groupTouchingTiles(text, wanted) {
  const rows = text.length;
  const cols = text[0].length;
  const seen = new Set();
  const groups = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ch = text[row][col];
      if (!wanted(ch) || seen.has(row * cols + col)) {
        continue;
      }
      const tiles = [];
      const stack = [{ col, row }];
      seen.add(row * cols + col);
      while (stack.length > 0) {
        const tile = stack.pop();
        tiles.push(tile);
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const c = tile.col + dc;
          const r = tile.row + dr;
          if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
          if (text[r][c] !== ch || seen.has(r * cols + c)) continue;
          seen.add(r * cols + c);
          stack.push({ col: c, row: r });
        }
      }
      groups.push({ ch, tiles });
    }
  }
  return groups;
}

// Reads an overworld drawing (see overworld-map.js) into:
//   { name, theme, cols, rows, grid, player, entrances, houseDoors, npcs, houses }
//   grid        tile types, row by row
//   player      { col, row } where @ is, or null
//   entrances   [{ id, tiles: [{ col, row }] }], one per touching group of D
//   houseDoors  { "1": [{ col, row }, ...], ... } the door tiles of each house, by its digit
//   npcs        the template's npcs, as written
//   houses      the template's houses, read by parseHouseTemplate
// Assumes the template already passed validateOverworldTemplate.
function parseOverworldTemplate(template) {
  const text = template.rows;
  const parsed = {
    name: template.name,
    theme: template.theme || "meadow",
    cols: text[0].length,
    rows: text.length,
    grid: [],
    player: null,
    entrances: [],
    houseDoors: {},
    npcs: template.npcs || [],
    houses: (template.houses || []).map(parseHouseTemplate)
  };
  for (let row = 0; row < parsed.rows; row++) {
    const tiles = [];
    for (let col = 0; col < parsed.cols; col++) {
      const ch = text[row][col];
      if (ch === PLAYER_START_CHAR) {
        parsed.player = { col, row };
        tiles.push(TILE.FLOOR);
      } else if (isHouseDoorChar(ch)) {
        tiles.push(TILE.HOUSE_DOOR);
        (parsed.houseDoors[ch] = parsed.houseDoors[ch] || []).push({ col, row });
      } else {
        tiles.push(OVERWORLD_CHARS[ch]);
      }
    }
    parsed.grid.push(tiles);
  }
  for (const group of groupTouchingTiles(text, (ch) => ch === ENTRANCE_CHAR)) {
    parsed.entrances.push({ id: parsed.entrances.length, tiles: group.tiles });
  }
  return parsed;
}

// Checks an overworld drawing, its NPCs and its houses, and returns a list of problems (empty if
// all is well). Same idea as validateRoomTemplates.
function validateOverworldTemplate(template = OVERWORLD_TEMPLATE) {
  const problems = [];
  const bad = (message) => problems.push((template && template.name || "overworld") + ": " + message);

  if (!Array.isArray(template.rows) || template.rows.length === 0 ||
      template.rows.some((r) => typeof r !== "string")) {
    bad("rows must be a list of text lines");
    return problems;
  }
  const rows = template.rows.length;
  const cols = template.rows[0].length;
  if (template.theme !== undefined && (typeof template.theme !== "string" || template.theme === "")) {
    bad("theme must be a name such as \"meadow\"");
  }
  if (template.rows.some((r) => r.length !== cols)) {
    bad("every row must be the same length");
    return problems;
  }
  if (cols < 8 || rows < 8) {
    bad("size " + cols + "x" + rows + " must be at least 8x8");
    return problems;
  }

  const unknown = new Set();
  let starts = 0;
  for (const row of template.rows) {
    for (const ch of row) {
      if (OVERWORLD_CHARS[ch] === undefined && ch !== PLAYER_START_CHAR && !isHouseDoorChar(ch)) {
        unknown.add(ch);
      }
      if (ch === PLAYER_START_CHAR) {
        starts++;
      }
    }
  }
  if (unknown.size > 0) {
    bad("unknown character " + [...unknown].map((c) => '"' + c + '"').join(" "));
    return problems;
  }
  if (starts !== 1) {
    bad("needs exactly one @ (it has " + starts + ")");
  }

  let ringOk = true;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const onRing = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
      if (onRing && template.rows[r][c] !== "#") ringOk = false;
    }
  }
  if (!ringOk) {
    bad("the outer ring must be all #");
  }

  const walkable = (c, r) => {
    const ch = template.rows[r] && template.rows[r][c];
    return ch === "." || ch === PLAYER_START_CHAR;
  };
  // A way in (an entrance or a house door) needs grass just south of its bottom row.
  const needsGrassBelow = (tiles, where) => {
    const bottom = Math.max(...tiles.map((t) => t.row));
    const bottomCols = tiles.filter((t) => t.row === bottom).map((t) => t.col);
    if (bottomCols.some((c) => !walkable(c, bottom + 1))) {
      bad(where + " needs grass (.) just south of its bottom row, for the player to come out onto");
    }
  };

  const parsed = parseOverworldTemplate({ name: template.name, rows: template.rows });
  if (parsed.entrances.length === 0) {
    bad("needs at least one dungeon entrance (draw a group of D)");
  }
  for (const entrance of parsed.entrances) {
    const bottom = Math.max(...entrance.tiles.map((t) => t.row));
    const left = Math.min(...entrance.tiles.filter((t) => t.row === bottom).map((t) => t.col));
    needsGrassBelow(entrance.tiles, "the entrance at column " + left + ", row " + bottom);
  }

  // Houses: each one needs a valid drawing, a unique id and a door on the map, and each door
  // digit on the map needs a house.
  const houses = Array.isArray(template.houses) ? template.houses : [];
  const ids = new Set();
  for (const house of houses) {
    problems.push(...validateHouseTemplate(house));
    const id = String(house.id);
    if (ids.has(id)) {
      bad("two houses use the id " + id);
    }
    ids.add(id);
    if (!parsed.houseDoors[id]) {
      bad("house " + house.name + " has no door on the map (draw two " + id + " side by side)");
    }
  }
  for (const [id, tiles] of Object.entries(parsed.houseDoors)) {
    if (!ids.has(id)) {
      bad("the door " + id + " on the map has no house with that id");
      continue;
    }
    const sameRow = tiles.every((t) => t.row === tiles[0].row);
    const cols2 = tiles.map((t) => t.col).sort((a, b) => a - b);
    if (tiles.length !== 2 || !sameRow || cols2[1] - cols2[0] !== 1) {
      bad("the door " + id + " must be exactly two " + id + " side by side on one row");
      continue;
    }
    needsGrassBelow(tiles, "the door " + id + " at column " + cols2[0] + ", row " + tiles[0].row);
  }

  validateNpcList(template.npcs || [], walkable, bad);

  // Every grass tile, every entrance, every house door and the start must be reachable from each
  // other.
  const passable = (c, r) => walkable(c, r) || template.rows[r][c] === ENTRANCE_CHAR ||
    isHouseDoorChar(template.rows[r][c]);
  let total = 0;
  let first = null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (passable(c, r)) {
        total++;
        first = first || { c, r };
      }
    }
  }
  if (total === 0) {
    bad("has no grass");
  } else {
    const seen = new Set([first.r * cols + first.c]);
    const stack = [first];
    while (stack.length > 0) {
      const { c, r } = stack.pop();
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        if (!passable(nc, nr) || seen.has(nr * cols + nc)) continue;
        seen.add(nr * cols + nc);
        stack.push({ c: nc, r: nr });
      }
    }
    if (seen.size !== total) {
      bad("the grass is split into separate parts, so some of it can't be reached");
    }
  }
  return problems;
}

// Checks every overworld drawing in a list (OVERWORLD_TEMPLATES by default) and returns a list of
// problems (empty if all is well). Each drawing needs a name of its own.
function validateOverworldTemplates(templates = OVERWORLD_TEMPLATES) {
  const problems = [];
  const names = new Set();
  for (const t of templates) {
    if (names.has(t.name)) {
      problems.push((t.name || "overworld") + ": the name is used by another overworld too");
    }
    names.add(t.name);
    problems.push(...validateOverworldTemplate(t));
  }
  return problems;
}

// The overworld as a Room. Its top-left corner sits at (x, y); the camera does the scrolling, so
// x and y are just where its pixels live in the world (0, 0 in the game).
// options:
//   template  a drawing to use instead of the first of OVERWORLD_TEMPLATES, already read by
//             parseOverworldTemplate
//   index     which overworld this is, 0 for the first (default 0); also its stage in a run
//   screenX, screenY  the top-left of the screen area where house interiors are placed (each is
//             centered in the same 640x400 area a dungeon room is), default 0, 0
class Overworld extends Room {
  constructor(x, y, options = {}) {
    const template = options.template || parseOverworldTemplate(OVERWORLD_TEMPLATE);
    super(x, y, template.cols * TILE_SIZE, template.rows * TILE_SIZE);
    this.template = template;
    this.entrances = template.entrances;
    this.index = options.index || 0;
    this.name = template.name;
    this.theme = template.theme;
    this.id = "overworld-" + (this.index + 1); // dungeon rooms have numbers, so this can never clash with one
    this.role = "overworld";
    this.isOverworld = true; // the view reads this to draw grass instead of dungeon stone
    this.tileGrid = [];
    this.generateLayout();
    this.npcs = template.npcs.map(
      (n) => new Npc(this.x + n.col * this.tileSize, this.y + n.row * this.tileSize, n.name, n.dialogue)
    );
    const screenX = options.screenX || 0;
    const screenY = options.screenY || 0;
    this.houses = template.houses.map((h) => {
      const col = Math.floor((SCREEN_COLS - h.cols) / 2);
      const row = Math.floor((SCREEN_ROWS - h.rows) / 2);
      const house = new House(screenX + col * TILE_SIZE, screenY + row * TILE_SIZE, h);
      house.outsideDoorTiles = template.houseDoors[h.id] || [];
      return house;
    });
  }

  generateLayout() {
    this.tileGrid = this.template.grid.map((row) => row.slice());
  }

  // The pixel at the middle of the tile marked @.
  getPlayerSpawn() {
    const p = this.template.player;
    return {
      x: this.x + (p.col + 0.5) * this.tileSize,
      y: this.y + (p.row + 0.5) * this.tileSize
    };
  }

  // The entrance whose tiles cover this pixel, or null.
  getEntranceAt(px, py) {
    const col = Math.floor((px - this.x) / this.tileSize);
    const row = Math.floor((py - this.y) / this.tileSize);
    return this.entrances.find((e) => e.tiles.some((t) => t.col === col && t.row === row)) || null;
  }

  // The house whose door (on the map) covers this pixel, or null.
  getHouseAt(px, py) {
    const col = Math.floor((px - this.x) / this.tileSize);
    const row = Math.floor((py - this.y) / this.tileSize);
    return this.houses.find((h) => h.outsideDoorTiles.some((t) => t.col === col && t.row === row)) || null;
  }

  // The pixel just south of a group of tiles, centered under its bottom row.
  landingBelow(tiles) {
    const bottom = Math.max(...tiles.map((t) => t.row));
    const bottomCols = tiles.filter((t) => t.row === bottom).map((t) => t.col);
    const middleCol = (Math.min(...bottomCols) + Math.max(...bottomCols)) / 2;
    return {
      x: this.x + (middleCol + 0.5) * this.tileSize,
      y: this.y + (bottom + 1.5) * this.tileSize
    };
  }

  // The pixel where the middle of the player stands after coming out of an entrance: just
  // south of it, centered under its bottom row.
  getEntranceLanding(entrance) {
    return this.landingBelow(entrance.tiles);
  }

  // Where the player stands after coming out of a house: just south of its door.
  getHouseLanding(house) {
    return this.landingBelow(house.outsideDoorTiles);
  }
}

// All the overworlds, in the order the player gets to them: the first one is where a run starts.
// screenX and screenY are where the screen area is, for the interiors of the houses (see Overworld).
function createOverworlds(screenX = 0, screenY = 0) {
  return OVERWORLD_TEMPLATES.map((template, index) =>
    new Overworld(0, 0, { template: parseOverworldTemplate(template), index, screenX, screenY })
  );
}
