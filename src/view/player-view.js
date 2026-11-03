// Drawing code for the player. Reads the model, never changes it.

function drawPlayer(player) {
  noStroke();
  fill(80, 160, 255);
  rect(player.pos.x, player.pos.y, player.size, player.size);
}
