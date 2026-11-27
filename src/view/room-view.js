// Tile art, loaded once in setup().
const tileImages = {};

async function loadTileImages() {
  tileImages.floor = await loadImageFile("assets/tiles/dungeon/DungeonFloor.png");
  tileImages.ceiling = await loadImageFile("assets/tiles/dungeon/DungeonCeiling.png");
  tileImages.interiorWall = await loadImageFile("assets/tiles/dungeon/DungeonInteriorWall.png");
  tileImages.walls = await loadImageFile("assets/tiles/dungeon/DungeonWalls.png");
  tileImages.pit = await loadImageFile("assets/tiles/dungeon/DungeonPit.png");
  tileImages.door = await loadImageFile("assets/tiles/dungeon/DungeonDoor.png");
}

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
  } else if (type === TILE.PIT) {
    g.image(tileImages.pit, dx, dy, ts, ts, getPitVariant(room, col, row) * ts, 0, ts, ts);
  } else {
    const piece = getDoorPiece(room, col, row);
    if (piece) {
      const [doorCol, doorRow] = doorArtCell(piece);
      g.image(tileImages.door, dx, dy, ts, ts, doorCol * ts, doorRow * ts, ts, ts);
    } else {
      g.fill(...TILE_COLORS[type]);
      g.rect(dx, dy, ts, ts);
    }
  }
}

function buildRoomGraphic(room) {
  const g = createGraphics(room.width, room.height);
  g.noSmooth();
  g.noStroke();
  if (room.tileTint) {
    g.tint(...room.tileTint); // this dungeon's tiles are the usual art in other colors
  }
  for (let row = 0; row < room.tileGrid.length; row++) {
    for (let col = 0; col < room.tileGrid[row].length; col++) {
      if (room.isOverworld) {
        drawOverworldTile(g, room, col, row);
      } else if (room.isHouse) {
        drawHouseTile(g, room, col, row);
      } else if (room.getTile(col, row) === TILE.OVERWORLD_EXIT) {
        drawOverworldExitTile(g, room, col, row);
      } else {
        drawTile(g, room, col, row);
      }
    }
  }
  return g;
}

// Draws the room, doesn't modify the room's state.
function drawRoom(room, graphic) {
  image(graphic, room.x, room.y);
}
