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

// Which pit sprite a pit tile needs, from whether there is pit above and below it. Pit art has
// a lip on the top edge and on the bottom edge. Returns a column on DungeonPit.png:
//   0 pit above and below (all void)   1 lip on top   2 lip on the bottom   3 lip on both
function getPitVariant(room, col, row) {
  const lipTop = room.getTile(col, row - 1) !== TILE.PIT;
  const lipBottom = room.getTile(col, row + 1) !== TILE.PIT;
  return (lipTop ? 1 : 0) + (lipBottom ? 2 : 0);
}

// Which piece of a door a door tile is: { side: "N", "S", "E" or "W", closed: true or false,
// index: 0 or 1 }. A door is two tiles. Index 0 is the left tile of a north or south door and the
// top tile of an east or west door, and index 1 is the other one. Returns null if the tile is not
// a door that leads somewhere (the view then falls back to a plain color).
function getDoorPiece(room, col, row) {
  const type = room.getTile(col, row);
  if (type !== TILE.DOOR_OPEN && type !== TILE.DOOR_CLOSED) {
    return null;
  }
  const exit = room.exits.find((e) => e.tiles.some((t) => t.col === col && t.row === row));
  if (!exit) {
    return null;
  }
  const stacked = exit.side === "E" || exit.side === "W"; // these doors run up and down
  const position = (t) => (stacked ? t.row : t.col);
  const here = exit.tiles.find((t) => t.col === col && t.row === row);
  const index = position(here) === Math.min(...exit.tiles.map(position)) ? 0 : 1;
  return { side: exit.side, closed: type === TILE.DOOR_CLOSED, index };
}
