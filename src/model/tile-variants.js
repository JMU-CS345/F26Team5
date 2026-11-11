// Works out which wall sprite a wall tile needs from its neighbors.
// No p5 drawing calls, so Jasmine can test it without a canvas.

// True when the neighbor at offset (dc, dr) is open, meaning not part of a wall.
// Outside the room counts as wall.
function isOpenAt(room, col, row, dc, dr) {
  return !TILE_PROPERTIES[room.getTile(col + dc, row + dr)].partOfWall;
}

// Returns a variant name for the wall tile at (col, row):
//   "open-n", "open-e", "open-s", "open-w"       floor on one side (a straight wall)
//   "open-nw", "open-ne", "open-sw", "open-se"   floor on two sides (a corner sticking out)
//   "diag-nw", "diag-ne", "diag-sw", "diag-se"   floor only diagonally (the corner of a room)
//   "solid"                                      no floor around it (ceiling)
function getWallVariant(room, col, row) {
  const n = isOpenAt(room, col, row, 0, -1);
  const s = isOpenAt(room, col, row, 0, 1);
  const e = isOpenAt(room, col, row, 1, 0);
  const w = isOpenAt(room, col, row, -1, 0);

  if (n && w) return "open-nw";
  if (n && e) return "open-ne";
  if (s && w) return "open-sw";
  if (s && e) return "open-se";
  if (n) return "open-n";
  if (s) return "open-s";
  if (e) return "open-e";
  if (w) return "open-w";

  if (isOpenAt(room, col, row, 1, 1)) return "diag-se";
  if (isOpenAt(room, col, row, -1, 1)) return "diag-sw";
  if (isOpenAt(room, col, row, 1, -1)) return "diag-ne";
  if (isOpenAt(room, col, row, -1, -1)) return "diag-nw";
  return "solid";
}