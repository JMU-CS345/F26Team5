// Tile art, loaded once in setup().
const tileImages = {};

async function loadTileImages() {
  tileImages.floor = await loadImage("assets/tiles/dungeon/DungeonFloor.png");
  tileImages.ceiling = await loadImage("assets/tiles/dungeon/DungeonCeiling.png");
  tileImages.interiorWall = await loadImage("assets/tiles/dungeon/DungeonInteriorWall.png");
  tileImages.walls = await loadImage("assets/tiles/dungeon/DungeonWalls.png");
}

// Where each wall variant is on DungeonWalls.png, as [column, row] in 16x16 tiles.
const WALL_SPRITES = {
  // Straight walls. The gold rim is on the outer edge, away from the floor.
  "open-s": [0, 1], // floor to the south: the north wall (gold on top)
  "open-n": [1, 0], // floor to the north: the south wall (gold on the bottom)
  "open-e": [1, 1], // floor to the east: the west wall (gold on the left)
  "open-w": [0, 0], // floor to the west: the east wall (gold on the right)

  // Inside corners: the room's own corners (gold on the two outer sides).
  "diag-se": [2, 0], // northwest corner
  "diag-sw": [3, 0], // northeast corner
  "diag-ne": [2, 1], // southwest corner
  "diag-nw": [3, 1], // southeast corner

  // Outside corners: a wall sticking out into the room. Each tile is a quarter of a
  // pyramid, with the apex (the gold square) pointing into the wall and the low edges
  // on the floor sides.
  "open-nw": [4, 0],
  "open-ne": [5, 0],
  "open-sw": [4, 1],
  "open-se": [5, 1]
};

// Placeholder colors for tiles with no art yet.
const TILE_COLORS = {
  [TILE.PIT]: [60, 20, 80],
  [TILE.DOOR_CLOSED]: [150, 100, 50],
  [TILE.DOOR_OPEN]: [90, 60, 30]
};

function drawTile(g, room, col, row) {
  const ts = room.tileSize;
  const dx = col * ts;
  const dy = row * ts;
  const type = room.getTile(col, row);

  if (type === TILE.FLOOR) {
    g.image(tileImages.floor, dx, dy);
  } else if (type === TILE.INTERIOR_WALL) {
    g.image(tileImages.interiorWall, dx, dy);
  } else if (type === TILE.WALL) {
    const variant = getWallVariant(room, col, row);
    if (variant === "solid") {
      g.image(tileImages.ceiling, dx, dy);
    } else {
      const [sc, sr] = WALL_SPRITES[variant];
      g.image(tileImages.walls, dx, dy, ts, ts, sc * ts, sr * ts, ts, ts);
    }
  } else {
    g.fill(...TILE_COLORS[type]);
    g.rect(dx, dy, ts, ts);
  }
}

function buildRoomGraphic(room) {
  const g = createGraphics(room.width, room.height);
  g.noSmooth();
  g.noStroke();
  for (let row = 0; row < room.tileGrid.length; row++) {
    for (let col = 0; col < room.tileGrid[row].length; col++) {
      drawTile(g, room, col, row);
    }
  }
  return g;
}

// Draws the room, doesn't modify the room's state.
function drawRoom(room, graphic) {
  image(graphic, room.x, room.y);
}
