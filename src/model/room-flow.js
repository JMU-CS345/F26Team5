// Soul Knight style rooms: doors seal while enemies fight, a second wave follows the first.
// No p5 drawing calls, so Jasmine can test it without a canvas.
// Load after room.js, template-room.js and enemy.js, before sketch.js.

const WAVE_GAP_FRAMES = 45; // after the first wave is dead, the second spawns this much later
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

// True while the floor marker for the second wave should show.
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
function clearRoomDebug(room) {
  room.enemies = [];
  room.pendingWave = [];
}
