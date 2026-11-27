// Where the dungeon tile art is on its sheets. The tile logic that decides WHICH piece a tile
// needs (getWallVariant, getDoorPiece and getPitVariant) is in model/tile-variants.js. This file
// draws nothing, so Jasmine can load it.

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

// Where each door piece is on DungeonDoor.png, as [column, row] in 16x16 cells. See getDoorPiece
// for what side, closed and index mean.
const DOOR_ART = Object.freeze({
  N: { closed: [[0, 1], [2, 1]], open: [[4, 1], [6, 1]] },
  S: { closed: [[3, 0], [1, 0]], open: [[7, 0], [5, 0]] },
  E: { closed: [[0, 0], [2, 0]], open: [[4, 0], [6, 0]] },
  W: { closed: [[3, 1], [1, 1]], open: [[7, 1], [5, 1]] }
});

// The [column, row] on DungeonDoor.png for a door piece from getDoorPiece.
function doorArtCell(piece) {
  return DOOR_ART[piece.side][piece.closed ? "closed" : "open"][piece.index];
}
