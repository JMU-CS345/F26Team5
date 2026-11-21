// A small map in the top-right corner. Drawing only, never changes the model.

const MINIMAP_MAX = 150; // the map is scaled to fit in this many pixels

// What the minimap may show of one room. Rooms are secret until the player walks in, except
// the ones next to a visited room, which show as dark outlines.
// look: "hidden", "outline", "visited" or "current".
function minimapRoomState(room, dungeon) {
  const isCurrent = dungeon.currentId === room.id;
  const nextToVisited = dungeon.rooms.some((r) => {
    return r.visited && r.exits.some((e) => e.toId === room.id);
  });
  let look = "hidden";
  if (isCurrent) {
    look = "current";
  } else if (room.visited) {
    look = "visited";
  } else if (nextToVisited) {
    look = "outline";
  }
  return {
    look,
    skull: room.visited && room.role === "boss",
    tick: room.visited && room.cleared,
    doors: room.visited
  };
}

function drawMinimap(dungeon, currentRoom) {
  const rooms = dungeon.rooms;
  const minCol = Math.min(...rooms.map((r) => r.worldCol));
  const minRow = Math.min(...rooms.map((r) => r.worldRow));
  const width = Math.max(...rooms.map((r) => r.worldCol + r.cols)) - minCol;
  const height = Math.max(...rooms.map((r) => r.worldRow + r.rows)) - minRow;
  const scale = Math.min(2, MINIMAP_MAX / Math.max(width, height)); // pixels per tile
  const left = CANVAS_WIDTH - 40 - width * scale;
  const top = 40;
  drawPanel(left - 20, top - 20, width * scale + 40, height * scale + 40);

  push();
  noStroke();
  for (const room of rooms) {
    const state = minimapRoomState(room, dungeon);
    if (state.look === "hidden") {
      continue;
    }
    const x = left + (room.worldCol - minCol) * scale;
    const y = top + (room.worldRow - minRow) * scale;
    const w = room.cols * scale - 1;
    const h = room.rows * scale - 1;
    if (state.look === "outline") {
      noFill();
      stroke(PALETTE.stoneDark);
      rect(x, y, w, h);
      noStroke();
      continue;
    }
    if (state.look === "current") fill(PALETTE.white);
    else fill(PALETTE.stoneLight);
    rect(x, y, w, h);

    // A gold mark on every open door of a room the player has seen.
    fill(PALETTE.goldLight);
    for (const exit of room.exits) {
      for (const tile of exit.tiles) {
        rect(x + tile.col * scale, y + tile.row * scale, Math.max(scale, 2), Math.max(scale, 2));
      }
    }
    if (state.skull) {
      fill(PALETTE.fire);
      circle(x + w / 2, y + h / 2, 10);
      fill(PALETTE.ink);
      circle(x + w / 2 - 2, y + h / 2 - 1, 2.5);
      circle(x + w / 2 + 2, y + h / 2 - 1, 2.5);
    }
    if (state.tick) {
      stroke(PALETTE.leaf);
      strokeWeight(2);
      line(x + 3, y + 7, x + 6, y + 10);
      line(x + 6, y + 10, x + 11, y + 4);
      noStroke();
    }
  }
  pop();
}