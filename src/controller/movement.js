function moveWithCollision(entity, dx, dy, room) {
  const ts = room.tileSize;

  // X axis
  entity.pos.x += dx;
  if (room.collidesWithWall(entity.getBounds())) {
    const b = entity.getBounds();
    if (dx > 0) {
      // Moving right: put the right edge against the left side of the wall tile.
      const col = Math.floor((b.x + b.w - 1 - room.x) / ts);
      entity.pos.x = room.x + col * ts - b.w;
    } else if (dx < 0) {
      // Moving left: put the left edge against the right side of the wall tile.
      const col = Math.floor((b.x - room.x) / ts);
      entity.pos.x = room.x + (col + 1) * ts;
    }
  }

  // Y axis
  entity.pos.y += dy;
  if (room.collidesWithWall(entity.getBounds())) {
    const b = entity.getBounds();
    if (dy > 0) {
      const row = Math.floor((b.y + b.h - 1 - room.y) / ts);
      entity.pos.y = room.y + row * ts - b.h;
    } else if (dy < 0) {
      const row = Math.floor((b.y - room.y) / ts);
      entity.pos.y = room.y + (row + 1) * ts;
    }
  }
}