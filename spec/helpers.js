// Shared spec helpers. Loaded before the specs.

// Tries to attack and, if the enemy only started its shot flash, lets the flash end and
// tries again. Gives the shots an enemy fires once it is ready.
function shootNow(enemy, player) {
  const first = enemy.tryAttack(player);
  if (first.length > 0 || !enemy.shotFlashing) {
    return first;
  }
  enemy.shotFlash = 0;
  return enemy.tryAttack(player);
}
