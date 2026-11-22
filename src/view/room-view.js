// Tile art, loaded once in setup(). The files are listed in tile-sprites.js.
const tileImages = {};

async function loadTileImages() {
  for (const key of Object.keys(TILE_IMAGE_FILES)) {
    tileImages[key] = await loadImageFile(TILE_IMAGE_FILES[key]);
  }
  tileImages.pit = await loadImageFile("assets/tiles/dungeon/DungeonPit.png"); // has lip variants
  tileImages.door = await loadImageFile("assets/tiles/dungeon/DungeonDoor.png");
}

// Where each wall variant is on stone-walls.png, as [column, row] in 16x16 tiles.
const WALL_SPRITES = {
  // Straight walls. The ink edge is on the floor side.
  "open-s": [0, 1], // floor to the south: the north wall (brick face)
  "open-n": [1, 0], // floor to the north: the south wall (lit cap)
  "open-e": [1, 1], // floor to the east: the west wall (ink edge on the right)
  "open-w": [0, 0], // floor to the west: the east wall (ink edge on the left)

  // Inside corners: the room's own corners (ink edges on the floor sides).
  "diag-se": [2, 0], // northwest corner
  "diag-sw": [3, 0], // northeast corner
  "diag-ne": [2, 1], // southwest corner
  "diag-nw": [3, 1], // southeast corner

  // Outside corners: a wall sticking out into the room. Floor on two sides, so ink edges
  // on both of those sides.
  "open-nw": [4, 0],
  "open-ne": [5, 0],
  "open-sw": [4, 1],
  "open-se": [5, 1]
};

// Placeholder colors for door tiles that do not lead anywhere, so have no door art.
const TILE_COLORS = {
  [TILE.DOOR_CLOSED]: [150, 100, 50],
  [TILE.DOOR_OPEN]: [90, 60, 30]
};

function drawTile(g, room, col, row) {
  const ts = room.tileSize;
  const dx = col * ts;
  const dy = row * ts;
  const type = room.getTile(col, row);
  const key = TILE_SPRITE_KEYS[type];

  if (type === TILE.WALL) {
    const variant = getWallVariant(room, col, row);
    if (variant === "solid") {
      g.image(tileImages.ceiling, dx, dy);
    } else {
      const [sc, sr] = WALL_SPRITES[variant];
      g.image(tileImages.walls, dx, dy, ts, ts, sc * ts, sr * ts, ts, ts);
    }
  } else if (type === TILE.PIT) {
    g.image(tileImages.pit, dx, dy, ts, ts, getPitVariant(room, col, row) * ts, 0, ts, ts);
  } else {
    if (type === TILE.DOOR_OPEN || type === TILE.DOOR_CLOSED) {
      const door = getDoorSprite(room, col, row);
      if (door) {
        g.image(tileImages.door, dx, dy, ts, ts, door.col * ts, door.row * ts, ts, ts);
      } else {
        g.fill(...TILE_COLORS[type]);
        g.rect(dx, dy, ts, ts);
      }
    } else {
      g.image(tileImages[key], dx, dy);
    }
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
