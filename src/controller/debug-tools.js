// Testing aids for the sketch, kept out of the game code: press E to spawn enemies, N to put a
// test NPC in the room, F3 to toggle the enemy debug overlay. Load this after enemy-types.js.

const debugTools = {
  overlay: false, // F3: hitboxes and detection circles for enemies
  nextSpawnIndex: 0,

  // Called when a run starts. The first spawn is the boss, so it is easy to test.
  reset() {
    this.nextSpawnIndex = ENEMY_TYPE_NAMES.indexOf("Demon");
  }
};

// Press E: spawns the next enemy type somewhere on the floor, away from the player.
function spawnNextEnemy(run) {
  const room = run.room;
  const typeName = ENEMY_TYPE_NAMES[debugTools.nextSpawnIndex % ENEMY_TYPE_NAMES.length];
  debugTools.nextSpawnIndex++;
  for (let tries = 0; tries < 50; tries++) {
    const enemy = createEnemy(
      typeName,
      random(room.x, room.x + room.width),
      random(room.y, room.y + room.height),
      true
    );
    const far = p5.Vector.dist(enemy.getCenter(), run.player.getCenter()) > 150;
    if (far && !room.collidesWithWall(enemy.getBounds()) && !room.overlapsPit(enemy.getBounds())) {
      room.enemies.push(enemy);
      room.cleared = false;
      return;
    }
  }
}

// Press N: puts the test Elder NPC in the top right of the room, or takes it away again.
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
