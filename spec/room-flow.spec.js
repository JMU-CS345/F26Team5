// Sealed rooms, waves, last kill spot and the anti-softlock timer.
describe("room flow", function () {
  const ROWS = [
    "####++####",
    "#........#",
    "#.J....Z.#",
    "#........#",
    "#........#",
    "#..B.....#",
    "#........#",
    "#........#",
    "#........#",
    "####++####"
  ];
  const BOSS_ROWS = ROWS.map((row) => row.replace("J", "B").replace("Z", "D"));

  function makeRoom(role, rows = ROWS) {
    const template = parseRoomTemplate({ name: "t", role: role, rows: rows });
    const room = new TemplateRoom(0, 0, template);
    room.id = 1;
    room.role = role;
    room.openDoor(template.doors[0], 0, 0);
    room.openDoor(template.doors[1], 2, 0);
    return room;
  }

  function makeDungeon(room) {
    return { rooms: [room], currentId: null };
  }

  function enter(room) {
    const dungeon = makeDungeon(room);
    room.onEnter();
    enterRoomFlow(dungeon, room);
    return dungeon;
  }

  function killAll(room) {
    for (const e of room.enemies) {
      e.health = 0;
    }
    return removeDeadEnemies(room);
  }

  function doorTypes(room) {
    return room.exits.flatMap((x) => x.tiles).map((t) => room.getTile(t.col, t.row));
  }

  describe("sealing", function () {
    it("starts unvisited with open doors", function () {
      const room = makeRoom("normal");
      expect(room.state).toBe("unvisited");
      expect(room.visited).toBe(false);
      expect(doorTypes(room).every((t) => t === TILE.DOOR_OPEN)).toBe(true);
    });

    it("seals every door when the player enters a combat room", function () {
      const room = makeRoom("normal");
      enter(room);
      expect(room.state).toBe("active");
      expect(room.visited).toBe(true);
      expect(doorTypes(room).length).toBe(4);
      expect(doorTypes(room).every((t) => t === TILE.DOOR_CLOSED)).toBe(true);
      expect(room.isWallAt(room.x + 4.5 * 16, room.y + 8)).toBe(true);
    });

    it("opens the doors again on clear and marks the room cleared", function () {
      const room = makeRoom("normal");
      enter(room);
      room.onClear();
      expect(room.state).toBe("cleared");
      expect(doorTypes(room).every((t) => t === TILE.DOOR_OPEN)).toBe(true);
    });

    it("never seals the start room", function () {
      const room = makeRoom("start", ROWS.map((r) => r.replace("B", "@")));
      enter(room);
      expect(room.state).toBe("active");
      expect(doorTypes(room).every((t) => t === TILE.DOOR_OPEN)).toBe(true);
    });

    it("does not seal a room with no enemies", function () {
      const room = makeRoom("normal", ROWS.map((r) => r.replace(/[JZB]/g, ".")));
      enter(room);
      expect(doorTypes(room).every((t) => t === TILE.DOOR_OPEN)).toBe(true);
    });

    it("does not seal a room that was already cleared", function () {
      const room = makeRoom("normal");
      enter(room);
      room.onClear();
      enterRoomFlow(makeDungeon(room), room);
      expect(room.state).toBe("cleared");
      expect(doorTypes(room).every((t) => t === TILE.DOOR_OPEN)).toBe(true);
    });

    it("keeps the enemy grace delay on entry", function () {
      const room = makeRoom("normal");
      enter(room);
      expect(room.enemies.every((e) => e.graceTimer > 0)).toBe(true);
    });

    it("records the room as the dungeon's current room", function () {
      const room = makeRoom("normal");
      const dungeon = enter(room);
      expect(dungeon.currentId).toBe(1);
    });
  });

  describe("waves", function () {
    it("spawns only the first group at first", function () {
      const room = makeRoom("normal");
      room.spawnEnemies();
      expect(room.enemies.length).toBe(2);
      expect(room.pendingWave.length).toBe(1);
      expect(room.hasPendingWave()).toBe(true);
    });

    it("keeps a single-enemy room to one wave", function () {
      const room = makeRoom("normal", ROWS.map((r) => r.replace(/[JZ]/g, ".")));
      room.spawnEnemies();
      expect(room.enemies.length).toBe(1);
      expect(room.hasPendingWave()).toBe(false);
    });

    it("does not clear while the second wave is waiting", function () {
      const room = makeRoom("normal");
      enter(room);
      killAll(room);
      expect(roomWaveDone(room)).toBe(false);
    });

    it("spawns the second wave 45 frames after the first is dead, not before", function () {
      const room = makeRoom("normal");
      enter(room);
      killAll(room);
      for (let i = 0; i < WAVE_GAP_FRAMES - 1; i++) {
        updateRoomFlow(room);
      }
      expect(room.enemies.length).toBe(0);
      updateRoomFlow(room);
      expect(room.enemies.length).toBe(1);
      expect(room.hasPendingWave()).toBe(false);
    });

    it("waits while any first-wave enemy is alive", function () {
      const room = makeRoom("normal");
      enter(room);
      room.enemies[0].health = 0;
      removeDeadEnemies(room);
      for (let i = 0; i < 100; i++) {
        updateRoomFlow(room);
      }
      expect(room.hasPendingWave()).toBe(true);
      expect(room.waveTimer).toBe(0);
    });

    it("shows the floor marker only in the last 30 frames of the gap", function () {
      const room = makeRoom("normal");
      enter(room);
      expect(waveMarkerShows(room)).toBe(false);
      killAll(room);
      for (let i = 0; i < WAVE_GAP_FRAMES - WAVE_MARKER_FRAMES - 1; i++) {
        updateRoomFlow(room);
      }
      expect(waveMarkerShows(room)).toBe(false);
      updateRoomFlow(room);
      expect(waveMarkerShows(room)).toBe(true);
      for (let i = 0; i < WAVE_MARKER_FRAMES; i++) {
        updateRoomFlow(room);
      }
      expect(waveMarkerShows(room)).toBe(false);
    });

    it("fires the clear only after the last wave is beaten", function () {
      const room = makeRoom("normal");
      enter(room);
      killAll(room);
      for (let i = 0; i < WAVE_GAP_FRAMES; i++) {
        updateRoomFlow(room);
      }
      expect(roomWaveDone(room)).toBe(false);
      killAll(room);
      expect(roomWaveDone(room)).toBe(true);
    });

    it("keeps the doors shut between waves", function () {
      const room = makeRoom("normal");
      enter(room);
      killAll(room);
      expect(doorTypes(room).every((t) => t === TILE.DOOR_CLOSED)).toBe(true);
    });

    it("gives a boss room only its boss", function () {
      const room = makeRoom("boss", BOSS_ROWS);
      room.spawnEnemies();
      expect(room.enemies.length).toBe(1);
      expect(room.enemies[0].type.boss).toBe(true);
      expect(room.hasPendingWave()).toBe(false);
    });

    it("spawns every enemy of a boss room that has no boss", function () {
      const room = makeRoom("boss");
      room.spawnEnemies();
      expect(room.enemies.length + room.pendingWave.length).toBe(3);
    });

    it("does nothing for a room that is not active", function () {
      const room = makeRoom("normal");
      room.spawnEnemies();
      killAll(room);
      updateRoomFlow(room);
      expect(room.waveTimer).toBe(0);
      expect(room.activeFrames).toBe(0);
    });
  });

  describe("lastKillPos", function () {
    it("is null until something dies", function () {
      expect(makeRoom("normal").lastKillPos).toBe(null);
    });

    it("holds the centre of the last enemy that died", function () {
      const room = makeRoom("normal");
      enter(room);
      const first = room.enemies[0];
      const second = room.enemies[1];
      recordKill(room, first);
      recordKill(room, second);
      const centre = second.getCenter();
      expect(room.lastKillPos).toEqual({ x: centre.x, y: centre.y });
    });

    it("is a copy, so a moving corpse does not change it", function () {
      const room = makeRoom("normal");
      enter(room);
      const enemy = room.enemies[0];
      recordKill(room, enemy);
      const x = room.lastKillPos.x;
      enemy.pos.x += 50;
      expect(room.lastKillPos.x).toBe(x);
    });
  });

  describe("anti-softlock", function () {
    function activeFor(room, frames) {
      for (let i = 0; i < frames; i++) {
        updateRoomFlow(room);
      }
    }

    it("shows no target before 60 seconds", function () {
      const room = makeRoom("normal");
      enter(room);
      killAll(room);
      room.pendingWave = [];
      room.enemies.push(createEnemy("Bat", 100, 100));
      activeFor(room, SOFTLOCK_FRAMES - 1);
      expect(softlockTargets(room)).toEqual([]);
    });

    it("points at one or two enemies after 60 seconds", function () {
      const room = makeRoom("normal");
      enter(room);
      activeFor(room, SOFTLOCK_FRAMES);
      expect(softlockTargets(room).length).toBe(2);
      room.enemies.pop();
      expect(softlockTargets(room).length).toBe(1);
    });

    it("stays quiet with three or more enemies left", function () {
      const room = makeRoom("normal");
      enter(room);
      room.enemies.push(createEnemy("Bat", 100, 100));
      activeFor(room, SOFTLOCK_FRAMES);
      expect(room.enemies.length).toBe(3);
      expect(softlockTargets(room)).toEqual([]);
    });

    it("stays quiet when no enemy is left", function () {
      const room = makeRoom("normal", ROWS.map((r) => r.replace(/[JZB]/g, ".")));
      enter(room);
      activeFor(room, SOFTLOCK_FRAMES);
      expect(softlockTargets(room)).toEqual([]);
    });

    it("stays quiet in a cleared room", function () {
      const room = makeRoom("normal");
      enter(room);
      room.activeFrames = SOFTLOCK_FRAMES;
      room.onClear();
      expect(softlockTargets(room)).toEqual([]);
    });

    it("F3 then K clears the room and its doors open", function () {
      const room = makeRoom("normal");
      enter(room);
      clearRoomDebug(room, new Player(100, 100, "Fire"), []);
      expect(roomWaveDone(room)).toBe(true);
      room.onClear();
      expect(doorTypes(room).every((t) => t === TILE.DOOR_OPEN)).toBe(true);
    });
  });
});
