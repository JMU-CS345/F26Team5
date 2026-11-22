// Drawing for the run loop: the stairs in a boss room and the victory screen.

function drawStairs(stairs) {
  noStroke();
  fill(20, 18, 34);
  rect(stairs.x - STAIRS_SIZE / 2, stairs.y - STAIRS_SIZE / 2, STAIRS_SIZE, STAIRS_SIZE);
  fill(...SKIN_GOLD);
  for (let step = 0; step < 4; step++) {
    const w = STAIRS_SIZE - step * 5;
    rect(stairs.x - w / 2, stairs.y - STAIRS_SIZE / 2 + step * 6, w, 3);
  }
}

// The hint above stairs the player stands on, so the descent is a choice.
function drawStairsPrompt(stairs) {
  push();
  textAlign(CENTER, CENTER);
  textSize(10);
  noStroke();
  fill(0, 0, 0, 170);
  rect(stairs.x - 36, stairs.y - STAIRS_SIZE / 2 - 20, 72, 14, 3);
  fill(255);
  text("E: Descend", stairs.x, stairs.y - STAIRS_SIZE / 2 - 13);
  pop();
}

// Shown after the last boss. Enter goes back to the title.
function drawVictoryScreen(stats) {
  noStroke();
  fill(0, 0, 0, 170);
  rect(0, 0, width, height);
  const w = 560;
  const h = 320;
  const x = width / 2 - w / 2;
  const y = height / 2 - h / 2;
  drawPanel(x, y, w, h);
  const inner = panelContentRect(x, y, w, h, SKIN_PAD);
  drawPixelText("Victory", width / 2, inner.y, 48, UI_COLORS.goldLight, "center");
  drawPixelText("Rooms cleared: " + stats.roomsCleared, inner.x, inner.y + 90, 24, UI_COLORS.white);
  drawPixelText(
    "Enemies killed: " + stats.enemiesKilled, inner.x, inner.y + 130, 24, UI_COLORS.white
  );
  drawPixelText("Best item: " + stats.bestItemName(), inner.x, inner.y + 170, 24, UI_COLORS.white);
  drawPixelText(
    "Press Enter for the title", width / 2, inner.y + inner.h - 24, 16, UI_COLORS.goldLight,
    "center"
  );
}
