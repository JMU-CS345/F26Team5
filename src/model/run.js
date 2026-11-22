// One run through a dungeon: the dungeon, the room the player is in, the player, and the shots in
// flight, plus the rules that move all of it forward by one frame. It draws nothing and reads no
// keys, so Jasmine can play it. The sketch tells it what the player is doing each frame (update)
// and draws whatever it holds.
// Load this after dungeon-generator.js, player.js, enemy.js and collision.js.

class Run {
  constructor(dungeon, mageClass, modelName, appearance) {
    this.dungeon = dungeon;
    this.room = null;
    this.projectiles = []; // the player's shots
    this.enemyProjectiles = [];
    this.enterRoom(dungeon.start);
    const spawn = this.room.getPlayerSpawn(); // the @ in the start room's drawing
    this.player = new Player(
      spawn.x - PLAYER_LENGTH / 2,
      spawn.y - PLAYER_WIDTH / 2,
      mageClass,
      modelName,
      appearance
    );
    // Where the player stands after coming through the door (or starting). A fall into a pit
    // respawns them here.
    this.entrySpot = { x: spawn.x, y: spawn.y };
  }

  // Moves the run into a room. Shots in flight don't follow the player through a door.
  enterRoom(room) {
    this.room = room;
    this.projectiles = [];
    this.enemyProjectiles = [];
    room.onEnter();
    room.startEnemyDelay(); // enemies by the door hold still a moment, so they cannot hit on arrival
  }

  // Walks the player through an exit into the next room.
  useExit(exit) {
    const next = this.dungeon.rooms[exit.toId];
    const spot = this.dungeon.entryPoint(this.room, exit);
    this.enterRoom(next);
    this.entrySpot = spot;
    this.player.pos.set(spot.x - this.player.length / 2, spot.y - this.player.width / 2);
  }

  // Plays one frame. input is what the player is doing:
  //   move    p5.Vector, the direction to walk
  //   fire    p5.Vector, the direction to shoot
  //   frozen  true while something (a dialogue) has the player's attention: no walking or shooting
  // Returns the enemies that died this frame, so the view can play their death.
  update({ move, fire, frozen = false }) {
    const player = this.player;

    // Standing in a door tile means the player is leaving the room.
    if (!player.isDead()) {
      const center = player.getCenter();
      const exit = this.room.getExitAt(center.x, center.y);
      if (exit) {
        this.useExit(exit);
      }
    }
    const room = this.room;

    if (frozen) {
      player.walkFrames = 0;
    } else {
      player.move(move, room);
    }
    for (const drop of room.items) {
      drop.update();
    }
    pickupItemDrops(player, room);

    if (!player.isDead()) {
      for (const e of room.enemies) {
        e.update(player, room);
        e.damagePlayer(player);
        e.meleeHit(player);
        for (const shot of e.tryAttack(player, room)) {
          this.enemyProjectiles.push(shot);
        }
      }
    }

    if (!frozen) {
      const shot = player.fire(fire);
      if (shot) {
        this.projectiles.push(shot);
      }
    }
    player.update(room);
    if (player.hasFinishedFalling() && !player.isDead()) {
      player.respawnAt(this.entrySpot.x, this.entrySpot.y); // back at the door they came in through
    }

    for (const p of this.projectiles) {
      p.update(room);
      for (const e of room.enemies) {
        e.damageFromProjectile(p);
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);

    for (const p of this.enemyProjectiles) {
      p.update(room);
      projectileHitsPlayer(p, player);
    }
    this.enemyProjectiles = this.enemyProjectiles.filter((p) => p.alive);

    const dead = removeDeadEnemies(room);
    if (findDeadBosses(dead).length > 0) {
      room.bossDefeated = true;
    }
    if (!room.cleared && room.enemies.every((e) => e.isDead())) {
      room.onClear(); // opens the doors
    }
    return dead;
  }
}
