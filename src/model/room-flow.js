// Soul Knight style rooms: doors seal while enemies fight, and more waves follow the first.
// No p5 drawing calls, so Jasmine can test it without a canvas.
// Load after room.js, template-room.js and enemy.js, before sketch.js.

const WAVE_GAP_FRAMES = 45; // after a wave is dead, the next one spawns this much later
const WAVE_MARKER_FRAMES = 30; // the floor marker shows for the last frames of that gap
const SOFTLOCK_FRAMES = 3600; // 60 s at 60 fps in an active room before the arrow shows

// Call when the player walks into a room, after room.onEnter() made the enemies.
function enterRoomFlow(dungeon, room) {
  room.visited = true;
  dungeon.currentId = room.id;
  if (room.cleared) {
    return;
  }
  room.state = "active";
  room.activeFrames = 0;
  const hasEnemies = room.enemies.some((e) => !e.isDead());
  if (room.role !== "start" && hasEnemies) {
    room.sealDoors();
  }
}

// True when nothing is alive and no wave is waiting, so the room can be cleared.
function roomWaveDone(room) {
  return room.enemies.every((e) => e.isDead()) && !room.hasPendingWave();
}

// Call once per simulated frame, after dead enemies were removed.
function updateRoomFlow(room) {
  if (room.state !== "active") {
    return;
  }
  room.activeFrames++;
  const alive = room.enemies.some((e) => !e.isDead());
  if (!room.hasPendingWave() || alive) {
    return;
  }
  room.waveTimer++;
  if (room.waveTimer >= WAVE_GAP_FRAMES) {
    room.spawnPendingWave();
    room.waveTimer = 0;
  }
}

// True while the floor marker for the next wave should show.
function waveMarkerShows(room) {
  return room.hasPendingWave() && room.waveTimer >= WAVE_GAP_FRAMES - WAVE_MARKER_FRAMES;
}

// Remembers where the last enemy died, other code reads room.lastKillPos.
function recordKill(room, enemy) {
  const centre = enemy.getCenter();
  room.lastKillPos = { x: centre.x, y: centre.y };
}

// The one or two enemies the player may be stuck finding, or [] when no arrow is needed.
function softlockTargets(room) {
  const alive = room.enemies.filter((e) => !e.isDead());
  const stuck = room.state === "active" && room.activeFrames >= SOFTLOCK_FRAMES;
  if (stuck && alive.length >= 1 && alive.length <= 2) {
    return alive;
  }
  return [];
}

// Debug key (F3 then K): removes every enemy and wave. The normal clear check does the rest.
// Also drops every lock-on to the removed enemies, so nothing keeps homing on a ghost.
function clearRoomDebug(room, player, shots) {
  room.enemies = [];
  if (room.role === "boss") {
    room.bossDefeated = true; // so the stairs or the victory can follow
  }
  room.pendingWaves = [];
  player.aimTarget = null;
  for (const shot of shots) {
    shot.target = null;
  }
}

// Marks a finished room cleared. It counts toward the run only the first time and only when the
// player emptied it, so a debug-spawned enemy cannot make one room count twice.
function markRoomCleared(room, deadCount, runStats) {
  const firstClear = room.state !== "cleared";
  room.onClear();
  if (firstClear && deadCount > 0) {
    runStats.recordRoomCleared();
  }
}
