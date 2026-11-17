function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
        a.y < b.y + b.h && a.y + a.h > b.y;
}

// Applies an enemy projectile to the player. Returns true on a hit.
function projectileHitsPlayer(projectile, player) {
  if (player.isDead() || !projectile.alive) {
    return false;
  }
  if (!rectsOverlap(projectile.getBounds(), player.getBounds())) {
    return false;
  }
  if (!player.takeDamage(projectile.damage, projectile.vel)) {
    return false; // shots pass through a player in i-frames
  }
  projectile.alive = false;
  return true;
}

// Collects every overlapping drop that fits. Uncollected drops remain in the room. Melee and
// projectile weapons are never collected here: the player swaps them in with E.
function pickupItemDrops(player, room) {
  const collected = [];
  const remaining = [];
  for (const drop of room.items) {
    const overlaps = rectsOverlap(player.getBounds(), drop.getBounds());
    if (drop.justDropped) {
      drop.justDropped = overlaps; // free to pick up again once the player steps off it
      remaining.push(drop);
      continue;
    }
    if (isEquippableWeapon(drop.item)) {
      remaining.push(drop); // weapons wait for E (see weapon-swap.js)
      continue;
    }
    if (!overlaps || drop.pickupDelay > 0 || !player.inventory.canAdd(drop.item, drop.quantity)) {
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
