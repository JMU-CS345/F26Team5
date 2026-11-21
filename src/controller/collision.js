function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
        a.y < b.y + b.h && a.y + a.h > b.y;
}

// Applies an enemy projectile to the player. Returns true on a hit.
function projectileHitsPlayer(projectile, player) {
  if (player.isDead() || player.isFalling() || !projectile.alive) {
    return false;
  }
  if (!rectsOverlap(projectile.getBounds(), player.getBounds())) {
    return false;
  }
  player.takeDamage(projectile.damage, projectile.vel); // the shot shoves the player along its path
  projectile.alive = false;
  return true;
}

// Collects every overlapping drop that fits. Uncollected drops remain in the room.
function pickupItemDrops(player, room) {
  const collected = [];
  const remaining = [];
  for (const drop of room.items) {
    const overlaps = rectsOverlap(player.getBounds(), drop.getBounds());
    if (!overlaps || !player.inventory.canAdd(drop.item, drop.quantity)) {
      remaining.push(drop);
      continue;
    }
    try {
      player.inventory.add(drop.item, drop.quantity);
      collected.push(drop);
    } catch (error) {
      remaining.push(drop);
    }
  }
  room.items = remaining;
  return collected;
}
