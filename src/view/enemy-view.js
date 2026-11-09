// Drawing code for the enemy. Reads the model, never changes it.

function drawEnemy(enemy) {
  if (enemy.isDead()) {
    return;
  }
  noStroke();
  fill(220, 80, 80);
  rect(enemy.pos.x, enemy.pos.y, enemy.length, enemy.width);
}
