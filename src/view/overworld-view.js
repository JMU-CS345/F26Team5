// How the overworld's tiles (and the inside of its houses) look. Drawing only, never changes the
// model. The dungeon has tile art in assets/; the overworld has none yet, so its tiles are drawn
// with plain shapes (grass, trees, rock, a cave mouth, houses and wooden floors). To use art
// instead, load it like tile-art.js does and draw it here.

const OVERWORLD_ROCK_DISTANCE = 5; // trees this close to a dungeon entrance are drawn as rock

// The colors each overworld is drawn in, picked by the theme in its drawing (see overworld-map.js).
// Each color is [r, g, b]. An unknown theme, or a dungeon room (the way out of a start room opens
// onto grass), uses the meadow.
const OVERWORLD_THEMES = Object.freeze({
  meadow: {
    grass: [88, 150, 74], blade: [64, 120, 56], flower: [240, 230, 120],
    forest: [28, 72, 44], leafDark: [40, 96, 56], leafLight: [52, 116, 66],
    trunk: [96, 66, 40], canopy: [34, 100, 54], canopyLight: [52, 130, 70]
  },
  autumn: {
    grass: [152, 130, 72], blade: [122, 98, 50], flower: [216, 104, 44],
    forest: [88, 42, 24], leafDark: [124, 60, 28], leafLight: [164, 88, 34],
    trunk: [84, 56, 34], canopy: [178, 86, 32], canopyLight: [224, 142, 54]
  },
  ashen: {
    grass: [108, 108, 116], blade: [80, 80, 92], flower: [204, 204, 218],
    forest: [36, 38, 50], leafDark: [52, 54, 70], leafLight: [72, 76, 96],
    trunk: [70, 58, 52], canopy: [64, 72, 92], canopyLight: [94, 106, 130]
  }
});

function overworldTheme(room) {
  return OVERWORLD_THEMES[room.theme] || OVERWORLD_THEMES.meadow;
}

// A number from 0 up to (but not counting) range, that is always the same for the same tile, so
// the grass looks scattered but never flickers or changes when the picture is rebuilt.
function tileNoise(col, row, range) {
  return (((col * 73856093) ^ (row * 19349663)) >>> 0) % range;
}

// True when the tile is within a few tiles of a dungeon entrance.
function isNearEntrance(room, col, row) {
  return room.entrances.some((e) => e.tiles.some((t) =>
    Math.abs(t.col - col) <= OVERWORLD_ROCK_DISTANCE && Math.abs(t.row - row) <= OVERWORLD_ROCK_DISTANCE
  ));
}

function drawGrass(g, x, y, ts, col, row, theme = OVERWORLD_THEMES.meadow) {
  const shade = (col + row) % 2 === 0 ? 0 : 6; // a faint checkerboard, so scrolling is visible
  g.fill(theme.grass[0] - shade, theme.grass[1] - shade, theme.grass[2] - shade);
  g.rect(x, y, ts, ts);
  // A few darker blades, in a spot that depends on the tile.
  g.fill(...theme.blade);
  const n = tileNoise(col, row, 64);
  g.rect(x + (n % 12) + 1, y + ((n >> 2) % 12) + 1, 1, 3);
  g.rect(x + ((n >> 1) % 11) + 2, y + ((n >> 3) % 11) + 2, 1, 2);
  if (tileNoise(row, col, 9) === 0) {
    g.fill(...theme.flower); // the odd flower
    g.rect(x + (n % 13) + 1, y + ((n >> 3) % 13) + 1, 2, 2);
  }
}

function drawOverworldTile(g, room, col, row) {
  const ts = room.tileSize;
  const x = col * ts;
  const y = row * ts;
  const type = room.getTile(col, row);
  const theme = overworldTheme(room);

  if (type === TILE.WALL) {
    // The forest edge: dark canopy with lighter leaves on top.
    g.fill(...theme.forest);
    g.rect(x, y, ts, ts);
    g.fill(...theme.leafDark);
    g.circle(x + 4 + tileNoise(col, row, 5), y + 4 + tileNoise(row, col, 5), 9);
    g.fill(...theme.leafLight);
    g.circle(x + 8 + tileNoise(row, col, 4), y + 6 + tileNoise(col, row, 4), 6);
  } else if (type === TILE.INTERIOR_WALL) {
    drawGrass(g, x, y, ts, col, row, theme);
    if (isNearEntrance(room, col, row)) {
      g.fill(112, 108, 120); // rock
      g.rect(x, y, ts, ts);
      g.fill(138, 134, 146);
      g.rect(x, y, ts, 3);
      g.fill(86, 82, 94);
      g.rect(x + 2 + tileNoise(col, row, 8), y + 7, 4, 2);
    } else {
      g.fill(...theme.trunk);
      g.rect(x + 6, y + 9, 4, 7);
      g.fill(...theme.canopy);
      g.circle(x + 8, y + 7, 15);
      g.fill(...theme.canopyLight);
      g.circle(x + 6, y + 5, 6);
    }
  } else if (type === TILE.HOUSE) {
    drawHouseOutside(g, room, col, row, x, y, ts);
  } else if (type === TILE.HOUSE_DOOR) {
    drawGrass(g, x, y, ts, col, row, theme);
    g.fill(70, 44, 26); // the door frame
    g.rect(x, y, ts, ts);
    g.fill(128, 84, 48); // the planks
    g.rect(x + 1, y + 1, ts - 2, ts - 1);
    g.fill(92, 60, 34);
    g.rect(x + 7, y + 1, 2, ts - 1);
    if (room.getTile(col + 1, row) === TILE.HOUSE_DOOR && room.getTile(col - 1, row) !== TILE.HOUSE_DOOR) {
      g.fill(236, 200, 90); // a knob, on the left-hand tile only
      g.rect(x + 12, y + 8, 2, 2);
    }
  } else if (type === TILE.DUNGEON_ENTRANCE) {
    g.fill(18, 12, 26); // the dark mouth of the cave
    g.rect(x, y, ts, ts);
    if (room.getTile(col, row - 1) !== TILE.DUNGEON_ENTRANCE) {
      g.fill(112, 108, 120); // a stone lip along the top
      g.rect(x, y, ts, 3);
    }
  } else {
    drawGrass(g, x, y, ts, col, row, theme);
  }
}

// A start room's way out to the overworld: a gap in the dungeon wall that opens onto grass, with
// a stone step on the side that faces into the room. Drawn in place of the dungeon's own tile art.
function drawOverworldExitTile(g, room, col, row) {
  const ts = room.tileSize;
  const x = col * ts;
  const y = row * ts;
  drawGrass(g, x, y, ts, col, row);
  g.fill(138, 134, 146);
  const side = room.overworldExit ? room.overworldExit.side : "S";
  const step = 3;
  if (side === "N") g.rect(x, y + ts - step, ts, step);
  if (side === "S") g.rect(x, y, ts, step);
  if (side === "W") g.rect(x + ts - step, y, step, ts);
  if (side === "E") g.rect(x, y, step, ts);
}

// A house seen from outside: a roof over the upper rows, and a plain front wall with windows
// along the bottom row, where the door is.
function drawHouseOutside(g, room, col, row, x, y, ts) {
  const isHouse = (c, r) => room.getTile(c, r) === TILE.HOUSE;
  if (isHouse(col, row + 1)) {
    g.fill(150, 60, 50); // roof shingles
    g.rect(x, y, ts, ts);
    g.fill(124, 46, 40);
    g.rect(x, y + 4, ts, 1);
    g.rect(x, y + 10, ts, 1);
    g.rect(x + (row % 2 === 0 ? 4 : 10), y, 1, 4);
    g.rect(x + (row % 2 === 0 ? 10 : 4), y + 5, 1, 5);
    if (!isHouse(col, row - 1)) {
      g.fill(96, 34, 32); // the top edge of the roof
      g.rect(x, y, ts, 2);
    }
  } else {
    g.fill(214, 196, 160); // the front wall
    g.rect(x, y, ts, ts);
    g.fill(160, 142, 108);
    g.rect(x, y + ts - 2, ts, 2);
    if ((col + row) % 2 === 0) {
      g.fill(70, 44, 26); // a window with its frame
      g.rect(x + 3, y + 3, 10, 8);
      g.fill(150, 200, 230);
      g.rect(x + 4, y + 4, 8, 6);
      g.fill(70, 44, 26);
      g.rect(x + 7, y + 4, 2, 6);
    }
  }
  if (!isHouse(col - 1, row)) {
    g.fill(96, 34, 32);
    g.rect(x, y, 1, ts); // the left edge of the building
  }
  if (!isHouse(col + 1, row)) {
    g.fill(96, 34, 32);
    g.rect(x + ts - 1, y, 1, ts); // and the right edge
  }
}

// The inside of a house: wooden floor and walls, furniture, and a mat at the door.
function drawHouseTile(g, room, col, row) {
  const ts = room.tileSize;
  const x = col * ts;
  const y = row * ts;
  const type = room.getTile(col, row);

  if (type === TILE.WALL) {
    g.fill(70, 46, 30);
    g.rect(x, y, ts, ts);
    g.fill(54, 34, 22);
    g.rect(x, y + 7, ts, 1);
    g.rect(x + (row % 2 === 0 ? 5 : 11), y, 1, 7);
    g.rect(x + (row % 2 === 0 ? 11 : 5), y + 8, 1, 8);
  } else if (type === TILE.HOUSE_DOOR) {
    g.fill(176, 140, 92); // the doormat on the floor
    g.rect(x, y, ts, ts);
    g.fill(140, 106, 66);
    g.rect(x + 1, y + 1, ts - 2, ts - 2);
  } else {
    g.fill(row % 2 === 0 ? 168 : 156, row % 2 === 0 ? 128 : 118, row % 2 === 0 ? 82 : 76); // wooden planks
    g.rect(x, y, ts, ts);
    g.fill(124, 92, 58);
    g.rect(x, y + ts - 1, ts, 1);
    g.rect(x + ((col * 7 + row * 3) % 14) + 1, y, 1, ts - 1);
    if (type === TILE.INTERIOR_WALL) {
      g.fill(96, 62, 36); // a table or shelf
      g.rect(x, y + 1, ts, ts - 1);
      g.fill(130, 88, 52);
      g.rect(x, y + 1, ts, 5);
      g.fill(70, 44, 26);
      g.rect(x, y + ts - 2, ts, 2);
    }
  }
}
