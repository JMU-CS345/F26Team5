// Tile types: what each tile IS. Which sprite it gets is decided by the view.
// No p5 drawing calls, so Jasmine can test it without a canvas.

// The grid already uses 0 for floor and 1 for wall, so existing rooms keep working.
const TILE = Object.freeze({
  FLOOR: 0,
  WALL: 1,
  PIT: 2,
  DOOR_CLOSED: 3,
  DOOR_OPEN: 4,
  INTERIOR_WALL: 5
});

// solid: blocks walking. Pits are solid for now; this changes when jumping exists.
// partOfWall: counts as part of the outer wall when working out edges and corners.
// To add a tile type, add it to TILE and give it an entry here.
const TILE_PROPERTIES = Object.freeze({
  [TILE.FLOOR]: { solid: false, partOfWall: false },
  [TILE.WALL]: { solid: true, partOfWall: true },
  [TILE.PIT]: { solid: true, partOfWall: false },
  [TILE.DOOR_CLOSED]: { solid: true, partOfWall: true },
  [TILE.DOOR_OPEN]: { solid: false, partOfWall: true },
  [TILE.INTERIOR_WALL]: { solid: true, partOfWall: false }
});