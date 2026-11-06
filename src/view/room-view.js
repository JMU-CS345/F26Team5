// draws the room
// doesnt modify the room state
function drawRoom(room) {
  noStroke();
  fill(150);

  for (let y = 0; y < room.tileGrid.length; y++) {
    for (let x = 0; x < room.tileGrid[y].length; x++) {
      if (room.tileGrid[y][x] === 1) {
        rect(
          ROOM_X + x * room.tileSize,
          ROOM_Y + y * room.tileSize,
          room.tileSize,
          room.tileSize
        );
      }
    }
  }
}

