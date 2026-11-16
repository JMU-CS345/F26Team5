// Drawing code for the dialogue text box. Reads DialogueBox, never changes it.

function drawDialogueBox(dialogue, roomX, roomY, roomWidth, roomHeight) {
  if (!dialogue || !dialogue.isActive()) {
    return;
  }

  // Position dialogue box anchored at the bottom-center of the room viewport
  const boxWidth = roomWidth - 64;
  const boxHeight = 76;
  const boxX = roomX + 32;
  const boxY = roomY + roomHeight - boxHeight - 16;

  push();
  // Dialogue box background
  stroke(220, 220, 240);
  strokeWeight(2);
  fill(18, 20, 30, 235);
  rect(boxX, boxY, boxWidth, boxHeight, 6);

  // Speaker name
  noStroke();
  fill(250, 220, 70);
  textSize(13);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(dialogue.getSpeakerName(), boxX + 16, boxY + 10);

  // Divider line under speaker name
  stroke(100, 110, 140, 180);
  strokeWeight(1);
  line(boxX + 16, boxY + 26, boxX + boxWidth - 16, boxY + 26);

  // Dialogue text message
  noStroke();
  fill(245);
  textSize(11);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  text(dialogue.getCurrentText(), boxX + 16, boxY + 32, boxWidth - 32, boxHeight - 44);

  // Advancement prompt at bottom right
  fill(180, 200, 230);
  textSize(10);
  textAlign(RIGHT, BOTTOM);
  const promptText = dialogue.isLastPage() ? "[Space] Close ✕" : "[Space] Next ▼";
  text(promptText, boxX + boxWidth - 16, boxY + boxHeight - 8);

  pop();
}
