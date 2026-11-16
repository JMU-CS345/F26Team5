// Drawing code for NPCs. Reads the model, never changes it.

const NPC_COLOR = [240, 220, 60]; // yellow, friendly and distinct from enemies

function drawNpc(npc) {
  // Body: a yellow rectangle.
  noStroke();
  fill(NPC_COLOR[0], NPC_COLOR[1], NPC_COLOR[2]);
  rect(npc.pos.x, npc.pos.y, npc.length, npc.width);

  // Name label above the NPC.
  fill(255);
  noStroke();
  textSize(8);
  textAlign(CENTER, BOTTOM);
  text(npc.name, npc.pos.x + npc.length / 2, npc.pos.y - 2);
}
