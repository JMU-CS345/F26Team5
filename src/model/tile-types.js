// Tile types: what each tile IS. Which sprite it gets is decided by the view.
// No p5 drawing calls, so Jasmine can test it without a canvas.

// The grid already uses 0 for floor and 1 for wall, so existing rooms keep working.
const TILE = Object.freeze({
  FLOOR: 0,
  WALL: 1,
  PIT: 2,
  DOOR_CLOSED: 3,
  DOOR_OPEN: 4,
  INTERIOR_WALL: 5,
  DUNGEON_ENTRANCE: 6, // overworld only: walking onto it leads into a dungeon
  HOUSE: 7, // overworld only: the roof and walls of a house
  HOUSE_DOOR: 8, // a house's door, outside or inside: walking onto it goes through
  OVERWORLD_EXIT: 9 // a start room's way out to the overworld: always open
});

// solid: blocks walking, shots and sight.
// hazard: a pit. Walkers that end up over it fall in, but shots and sight pass over it, and
// enemies keep out of it on their own. Only a shove (or a flier) takes anything over one.
// partOfWall: counts as part of the outer wall when working out edges and corners.
// To add a tile type, add it to TILE and give it an entry here.
const TILE_PROPERTIES = Object.freeze({
  [TILE.FLOOR]: { solid: false, partOfWall: false },
  [TILE.WALL]: { solid: true, partOfWall: true },
  [TILE.PIT]: { solid: false, partOfWall: false, hazard: true },
  [TILE.DOOR_CLOSED]: { solid: true, partOfWall: true },
  [TILE.DOOR_OPEN]: { solid: false, partOfWall: true },
  [TILE.INTERIOR_WALL]: { solid: true, partOfWall: false },
  [TILE.DUNGEON_ENTRANCE]: { solid: false, partOfWall: false },
  [TILE.HOUSE]: { solid: true, partOfWall: false },
  [TILE.HOUSE_DOOR]: { solid: false, partOfWall: false },
  [TILE.OVERWORLD_EXIT]: { solid: false, partOfWall: true } // set in the outer wall, like an open door
});