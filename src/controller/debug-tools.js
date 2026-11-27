// Testing aids for the sketch, kept out of the game code. Everything is reached from the debug
// menu (F4 or `, see debug-menu.js). Load this after enemy-types.js.

const debugTools = {
  overlay: false, // hitboxes and detection circles for enemies, toggled from the debug menu
  invincible: false // the sketch refills the player's health every frame
};

// Debug menu entry: puts the test Elder NPC in the top right of the room, or takes it away again.
function toggleTopRightNpc(run, dialogue) {
  const room = run.room;
  const existingIndex = room.npcs.findIndex((n) => n.name === "Elder");
  if (existingIndex !== -1) {
    room.npcs.splice(existingIndex, 1);
    if (dialogue.isActive() && dialogue.getSpeakerName() === "Elder") {
      dialogue.close();
    }
  } else {
    room.npcs.push(new Npc(room.x + room.width - 48, room.y + 32, "Elder", [
      "Greetings, traveler! The dungeons ahead are perilous.",
      "Keep your distance from skeletons and watch for swift bats.",
      "May your arcane magic guide your journey. Good luck!"
    ]));
  }
}
