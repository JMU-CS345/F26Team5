function buildRoomGraphic(room) {
  const g = createGraphics(room.width, room.height);
  g.noStroke();
  g.fill(150);
  for (let y = 0; y < room.tileGrid.length; y++) {
    for (let x = 0; x < room.tileGrid[y].length; x++) {
      if (room.tileGrid[y][x] === 1) {
        g.rect(x * room.tileSize, y * room.tileSize, room.tileSize, room.tileSize);
      }
    }
  }
  return g;
}

// Draws the room, doesn't modify the room's state.
function drawRoom(room, graphic) {
  image(graphic, room.x, room.y);
}
