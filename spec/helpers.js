// Shared spec helpers. Loaded before the specs.

// Tries to attack and, if the enemy only started its windup, lets the windup end and tries
// again. Gives the shots an enemy fires once it is ready.
function shootNow(enemy, player, room) {
  let shots = enemy.tryAttack(player, room);
  if (shots.length === 0 && enemy.state === "windup") {
    enemy.stateTimer = 0;
    shots = enemy.tryAttack(player, room);
  }
  return shots;
}
