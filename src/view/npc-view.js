// Drawing code for NPCs. Reads the model, never changes it.

let npcSpriteImage = null;

// Call once in setup(), with await.
async function loadNPCAssets() {
  try {
    npcSpriteImage = await loadImage("assets/npc/npc.png");
  } catch (e) {
    console.warn("Could not load NPC sprite image:", e);
  }
}

function drawNPC(npc) {
  push();
  if (npcSpriteImage) {
    // 16x32 sprite, bottom-aligned with 16x16 hitbox
    if (npc.facing === "left") {
      translate(npc.pos.x + npc.length, npc.pos.y - (32 - npc.width));
      scale(-1, 1);
      image(npcSpriteImage, 0, 0, npc.length, 32);
    } else {
      image(
        npcSpriteImage,
        npc.pos.x,
        npc.pos.y - (32 - npc.width),
        npc.length,
        32
      );
    }
  } else {
    // Fallback: green rectangle
    noStroke();
    fill(80, 200, 120);
    rect(npc.pos.x, npc.pos.y, npc.length, npc.width);
  }
  pop();
}

// Draws a floating prompt when the player is close enough to interact.
function drawInteractionPrompt(npc, player) {
  if (!npc || npc.isTalking || !player || !npc.canInteract(player)) return;

  const promptX = npc.pos.x + npc.length / 2;
  const promptY = npc.pos.y - (npcSpriteImage ? 18 : 8);

  push();
  rectMode(CENTER);
  noStroke();
  fill(0, 0, 0, 180);
  rect(promptX, promptY, 52, 16, 4);

  fill(255, 230, 140);
  textSize(10);
  textAlign(CENTER, CENTER);
  text("[E] Talk", promptX, promptY);
  pop();
}

// Draws a dialogue box at the bottom of the screen with the current line and speaker info.
function drawDialogueBox(npc) {
  if (!npc || !npc.isTalking) return;

  const boxX = 40;
  const boxY = CANVAS_HEIGHT - 105;
  const boxW = CANVAS_WIDTH - 80;
  const boxH = 90;

  push();
  // Semi-transparent panel with subtle golden border
  fill(16, 18, 28, 235);
  stroke(218, 165, 32);
  strokeWeight(2);
  rect(boxX, boxY, boxW, boxH, 8);

  // Speaker name tag
  const speakerName = npc.name || "NPC";
  noStroke();
  fill(255, 215, 0);
  textSize(13);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(speakerName, boxX + 14, boxY + 10);

  // Page counter if sequential dialogue is multi-page
  if (npc.dialogue && npc.dialogue.length > 1 && !npc.choiceResponse && !npc.hasChoices()) {
    fill(170, 175, 190);
    textSize(11);
    textStyle(NORMAL);
    textAlign(RIGHT, TOP);
    text(`(${npc.currentLine + 1}/${npc.dialogue.length})`, boxX + boxW - 14, boxY + 10);
  }

  // Dialogue message text
  fill(245, 245, 250);
  textSize(14);
  textStyle(NORMAL);
  textAlign(LEFT, TOP);
  text(npc.getCurrentText(), boxX + 14, boxY + 30, boxW - 28, 38);

  // Choices or progress hint at the bottom
  if (npc.hasChoices && npc.hasChoices()) {
    const choices = npc.getCurrentChoices();
    fill(120, 215, 255);
    textSize(12);
    textAlign(LEFT, BOTTOM);
    const choiceString = choices.map((c, i) => `[${i + 1}] ${c}`).join("    ");
    text(choiceString, boxX + 14, boxY + boxH - 8);
  } else {
    textSize(11);
    fill(180, 180, 190);
    textAlign(RIGHT, BOTTOM);
    const isEnd = npc.choiceResponse !== null || npc.currentLine >= npc.dialogue.length - 1;
    text(isEnd ? "Press E to close" : "Press E to continue", boxX + boxW - 14, boxY + boxH - 8);
  }
  pop();
}
