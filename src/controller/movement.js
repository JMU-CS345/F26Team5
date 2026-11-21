// True if the entity's box now covers a pit tile it did not cover before. Only matters for an
// entity with avoidsPits. It may stay on a pit tile it already overlaps, so one that ended a shove
// half over a pit edge can still walk off it, but it cannot step further in.
function wouldEnterPit(entity, room, oldBounds) {
  if (!entity.avoidsPits) {
    return false;
  }
  const now = room.pitTilesUnder(entity.getBounds());
  if (now.length === 0) {
    return false;
  }
  const before = room.pitTilesUnder(oldBounds);
  return now.some((tile) => !before.includes(tile));
}

function moveWithCollision(entity, dx, dy, room) {
  const ts = room.tileSize;

  // X axis
  const startX = entity.pos.x;
  const startBounds = entity.getBounds();
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

  if (wouldEnterPit(entity, room, startBounds)) {
    entity.pos.x = startX;
  }

  // Y axis
  const startY = entity.pos.y;
  const midBounds = entity.getBounds();
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
  if (wouldEnterPit(entity, room, midBounds)) {
    entity.pos.y = startY;
  }
}
