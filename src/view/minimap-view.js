// A small map in the top-right corner. Drawing only, never changes the model.

const MINIMAP_MAX = 150; // the map is scaled to fit in this many pixels

function drawMinimap(dungeon, currentRoom) {
  const rooms = dungeon.rooms;
  const minCol = Math.min(...rooms.map((r) => r.worldCol));
  const minRow = Math.min(...rooms.map((r) => r.worldRow));
  const width = Math.max(...rooms.map((r) => r.worldCol + r.cols)) - minCol;
  const height = Math.max(...rooms.map((r) => r.worldRow + r.rows)) - minRow;
  const scale = Math.min(2, MINIMAP_MAX / Math.max(width, height)); // pixels per tile
  const left = CANVAS_WIDTH - 20 - width * scale;
  const top = 20;

  push();
  noStroke();
  for (const room of rooms) {
    const x = left + (room.worldCol - minCol) * scale;
    const y = top + (room.worldRow - minRow) * scale;
    if (room === currentRoom) fill(PALETTE.white);
    else if (room.role === "boss") fill(PALETTE.fire);
    else if (room.role === "start") fill(PALETTE.leaf);
    else fill(PALETTE.stoneMid);
    rect(x, y, room.cols * scale - 1, room.rows * scale - 1);

    // A gold mark on every open door.
    fill(PALETTE.goldLight);
    for (const exit of room.exits) {
      for (const tile of exit.tiles) {
        rect(x + tile.col * scale, y + tile.row * scale, Math.max(scale, 2), Math.max(scale, 2));
      }
    }
  }
  pop();
}