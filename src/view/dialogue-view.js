// Drawing code for the dialogue text box. Reads DialogueBox, never changes it.

function drawDialogueBox(dialogue, roomX, roomY, roomWidth, roomHeight) {
  if (!dialogue || !dialogue.isActive()) {
    return;
  }

  // The box sits at the bottom center of the room.
  const boxWidth = roomWidth - 64;
  const boxHeight = 140;
  const boxX = roomX + 32;
  const boxY = roomY + roomHeight - boxHeight - 16;
  drawPanel(boxX, boxY, boxWidth, boxHeight);

  const inner = panelContentRect(boxX, boxY, boxWidth, boxHeight);
  drawPixelText(dialogue.getSpeakerName(), inner.x, inner.y, 16, UI_COLORS.goldLight);
  let textSize = 16;
  if (inner.w < 400) {
    textSize = 8; // small rooms have a narrow box, so use small text to avoid a fourth line
  }
  drawPixelParagraph(
    dialogue.getCurrentText(), inner.x, inner.y + 28, inner.w, textSize, UI_COLORS.white
  );

  // The advance prompt sits at the bottom right.
  let promptText = "[Space] Next >";
  if (dialogue.isLastPage()) {
    promptText = "[Space] Close";
  }
  drawPixelText(
    promptText, inner.x + inner.w, inner.y + inner.h - 8, 8, UI_COLORS.stoneLight, "right"
  );
}
