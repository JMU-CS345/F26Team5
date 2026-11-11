// Drawing code for NPCs. Reads the model, never changes it.

function drawNPC(npc) {
  // Draw the NPC sprite (green square for now)
  noStroke();
  fill(80, 200, 120);
  rect(npc.pos.x, npc.pos.y, npc.length, npc.width);
}

// Draws a dialogue box at the bottom of the screen with the current line.
function drawDialogueBox(npc) {
  if (!npc.isTalking) return;

  const boxX = 40;
  const boxY = CANVAS_HEIGHT - 100;
  const boxW = CANVAS_WIDTH - 80;
  const boxH = 80;

  // Semi-transparent background
  fill(0, 0, 0, 200);
  stroke(255);
  strokeWeight(2);
  rect(boxX, boxY, boxW, boxH, 8);

  // Dialogue text
  noStroke();
  fill(255);
  textSize(16);
  textAlign(LEFT, TOP);
  text(npc.getCurrentText(), boxX + 12, boxY + 12, boxW - 24, boxH - 24);

  // "Press E" hint
  textSize(11);
  fill(180);
  textAlign(RIGHT, BOTTOM);
  text("Press E", boxX + boxW - 12, boxY + boxH - 8);
}

