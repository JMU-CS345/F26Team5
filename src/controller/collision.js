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
  player.takeDamage(projectile.damage);
  projectile.alive = false;
  return true;
}
