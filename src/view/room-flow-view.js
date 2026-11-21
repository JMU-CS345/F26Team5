// Drawing for sealed rooms: closed doors, the next-wave marker and the lost-enemy arrow.
// Call inside the zoomed world, after drawRoom. Never changes the model.

function drawRoomFlow(room, player) {
  const ts = room.tileSize;
  for (const exit of room.exits) {
    for (const tile of exit.tiles) {
      if (room.getTile(tile.col, tile.row) === TILE.DOOR_CLOSED) {
        image(tileImages.doorClosed, room.x + tile.col * ts, room.y + tile.row * ts);
      }
    }
  }

  if (waveMarkerShows(room)) {
    const size = map(room.waveTimer, WAVE_GAP_FRAMES - WAVE_MARKER_FRAMES, WAVE_GAP_FRAMES, 6, 18);
    push();
    noFill();
    stroke(PALETTE.fire);
    strokeWeight(2);
    for (const spawn of room.pendingWave) {
      ellipse(room.x + (spawn.col + 0.5) * ts, room.y + (spawn.row + 0.5) * ts, size, size);
    }
    pop();
  }

  const targets = softlockTargets(room);
  if (targets.length > 0) {
    const from = player.getCenter();
    targets.sort((a, b) => from.dist(a.getCenter()) - from.dist(b.getCenter()));
    const dir = p5.Vector.sub(targets[0].getCenter(), from);
    push();
    translate(from.x, from.y);
    rotate(dir.heading());
    fill(PALETTE.goldLight);
    noStroke();
    triangle(30, 0, 22, -5, 22, 5);
    pop();
  }
}
