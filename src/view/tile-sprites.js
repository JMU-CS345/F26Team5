// Which picture each tile type uses. No p5 calls at load, so Jasmine can read it.
// To give a tile type new art: add the PNG to TILE_IMAGE_FILES and point the type at it.

// Image key -> file. loadTileImages() in room-view.js loads every entry.
const TILE_IMAGE_FILES = Object.freeze({
  floor: "assets/tiles/dungeon/stone-floor.png",
  ceiling: "assets/tiles/dungeon/stone-ceiling.png",
  interiorWall: "assets/tiles/dungeon/stone-interior-wall.png",
  walls: "assets/tiles/dungeon/stone-walls.png",
  pit: "assets/tiles/dungeon/pit.png",
  doorClosed: "assets/tiles/dungeon/door-closed.png",
  doorOpen: "assets/tiles/dungeon/door-open.png"
});

// Tile type -> image key. Wall tiles pick between "walls" and "ceiling" by neighbors.
const TILE_SPRITE_KEYS = Object.freeze({
  [TILE.FLOOR]: "floor",
  [TILE.WALL]: "walls",
  [TILE.PIT]: "pit",
  [TILE.DOOR_CLOSED]: "doorClosed",
  [TILE.DOOR_OPEN]: "doorOpen",
  [TILE.INTERIOR_WALL]: "interiorWall"
});
