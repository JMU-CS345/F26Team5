// One run: the room the player is in, the player, and the shots in flight, plus the rules that
// move all of it forward by one frame. A run either sits in one dungeon, or (when it is given an
// overworld) starts in the overworld and goes into a dungeon through one of its entrances, or into
// a house through one of its doors. Given a list of overworlds it goes on from there: the door in
// a boss room (open once the boss is dead) leads on to the next overworld, and past the last
// one's dungeon to the final room. It
// draws nothing and reads no keys, so Jasmine can play it. The sketch tells it what the player is
// doing each frame (update) and draws whatever it holds.
// Load this after dungeon-generator.js, overworld.js, player.js, enemy.js and collision.js.

// The living enemy closest to a shot, or null. Seeking shots steer toward it.
function nearestEnemy(enemies, shot) {
  let best = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    if (e.isDead() || e.isSpawning()) {
      continue;
    }
    const c = e.getCenter();
    const d = (c.x - shot.pos.x) ** 2 + (c.y - shot.pos.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }
  return best;
}

class Run {
  // With just a dungeon, the run starts in the dungeon's start room. With an overworld it starts
  // there instead, and dungeon may be null: dungeonFactory(entrance, overworld) makes the dungeon
  // when the player walks onto an entrance (see enterDungeon). overworld can also be a list of
  // overworlds, in the order the player reaches them; the run starts in the first. finalRoom is
  // where the boss room of the last overworld's dungeon leads (see advance).
  constructor(dungeon, mageClass, modelName, appearance, overworld = null, dungeonFactory = null, finalRoom = null) {
    this.dungeon = dungeon;
    this.overworlds = Array.isArray(overworld) ? overworld : overworld ? [overworld] : [];
    this.stage = 0; // which of the overworlds the player is on (or has just come out of)
    this.overworld = this.overworlds[0] || null;
    this.finalRoom = finalRoom;
    this.dungeonFactory = dungeonFactory;
    this.dungeons = new Map(); // overworld id and entrance id -> the dungeon made for it, kept while the run lasts
    this.overworldReturn = null; // where the player stands when they come back out of a dungeon
    this.houseReturn = null; // and where when they come back out of a house
    this.room = null;
    this.projectiles = []; // the player's shots
    this.enemyProjectiles = [];
    this.enterRoom(this.overworld || dungeon.start);
    const spawn = this.room.getPlayerSpawn(); // the @ in the start room's (or overworld's) drawing
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

  // True while the player is out in the overworld, not inside a dungeon.
  inOverworld() {
    return this.overworld !== null && this.room === this.overworld;
  }

  // True while the player is in the final room, after the last dungeon.
  inFinalRoom() {
    return this.finalRoom !== null && this.room === this.finalRoom;
  }

  // True while the player is inside a house.
  inHouse() {
    return this.room !== null && this.room.isHouse === true;
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

  // Walks the player from the overworld into a dungeon through an entrance, and remembers where
  // to put them when they come back out. The first time through an entrance the dungeon is made
  // (by dungeonFactory); after that it is the same dungeon, as the player left it. The player
  // comes in through the start room's way out to the overworld. Does nothing (and returns false)
  // when the player is not in the overworld or the run has no way to make a dungeon.
  enterDungeon(entrance) {
    if (!this.inOverworld()) {
      return false;
    }
    const key = this.overworld.id + ":" + entrance.id;
    let dungeon = this.dungeons.get(key);
    if (!dungeon) {
      if (typeof this.dungeonFactory !== "function") {
        return false;
      }
      dungeon = this.dungeonFactory(entrance, this.overworld);
      this.dungeons.set(key, dungeon);
    }
    this.overworldReturn = this.overworld.getEntranceLanding(entrance);
    this.dungeon = dungeon;
    this.enterRoom(dungeon.start);
    this.placePlayer(this.room.getOverworldExitEntry() || this.room.getPlayerSpawn());
    return true;
  }

  // Walks the player out of the dungeon and back onto the overworld, just outside the entrance
  // they went in by. The dungeon is kept, so going back in carries on where they left off. Does nothing (and returns false) when they are not in a dungeon.
  leaveDungeon() {
    if (this.overworld === null || this.dungeon === null) {
      return false;
    }
    const spot = this.overworldReturn || this.overworld.getPlayerSpawn();
    this.dungeon = null;
    this.enterRoom(this.overworld);
    this.placePlayer(spot);
    return true;
  }

  // Walks the player through the boss room's door to the next area: the next overworld, arriving
  // on its @, or, after the last dungeon, the final room. Does nothing (and returns false) when
  // the player is not in a boss room with such a door, or there is nowhere further to go.
  advance() {
    if (this.dungeon === null || !this.room.onwardDoor) {
      return false;
    }
    const next = this.overworlds[this.stage + 1];
    if (next) {
      this.stage += 1;
      this.overworld = next;
      this.dungeon = null; // the dungeon is behind them now
      this.enterRoom(next);
      this.placePlayer(next.getPlayerSpawn());
      return true;
    }
    if (this.finalRoom) {
      this.dungeon = null;
      this.enterRoom(this.finalRoom);
      this.placePlayer(this.finalRoom.getEntryPoint());
      return true;
    }
    return false;
  }

  // Walks the player from the overworld into a house, and remembers where to put them when they
  // come back out. Does nothing (and returns false) when the player is not in the overworld.
  enterHouse(house) {
    if (!this.inOverworld()) {
      return false;
    }
    this.houseReturn = this.overworld.getHouseLanding(house);
    this.enterRoom(house);
    this.placePlayer(house.getEntryPoint());
    return true;
  }

  // Walks the player out of a house and back onto the overworld, just south of its door. Does
  // nothing (and returns false) when they are not in a house.
  leaveHouse() {
    if (!this.inHouse() || this.overworld === null) {
      return false;
    }
    this.enterRoom(this.overworld);
    this.placePlayer(this.houseReturn || this.overworld.getPlayerSpawn());
    return true;
  }

  // Puts the middle of the player on a spot, which is also where a fall into a pit sends them back.
  placePlayer(spot) {
    this.entrySpot = spot;
    this.player.pos.set(spot.x - this.player.length / 2, spot.y - this.player.width / 2);
    this.player.vel.set(0, 0);
  }

  // Hurts every enemy the sword touches this frame, once per enemy per swing.
  resolveSlash() {
    const player = this.player;
    const hitbox = player.getSlashHitbox();
    if (hitbox === null) {
      return;
    }
    const sword = player.getMeleeWeapon();
    for (const e of this.room.enemies) {
      if (!player.slashHits.includes(e)
          && e.damageFromSlash(hitbox, player.getSlashDamage(), player.facingVector(), sword.element)) {
        player.slashHits.push(e);
      }
    }
  }

  // The player walks into enemies with the sword held out: each one touched is hurt and shoved
  // away, and the player is shoved back the other way.
  resolveRam() {
    const player = this.player;
    const hitbox = player.getRamHitbox();
    if (hitbox === null) {
      return;
    }
    const sword = player.getMeleeWeapon();
    const dir = player.facingVector();
    let bounced = false;
    for (const e of this.room.enemies) {
      if (e.damageFromRam(hitbox, player.getRamDamage(), dir, sword.element, sword.ram.cooldown)) {
        bounced = true;
      }
    }
    if (bounced) {
      player.shove(dir.copy().mult(-1));
    }
  }

  // Plays one frame. input is what the player is doing:
  //   move    p5.Vector, the direction to walk
  //   fire    p5.Vector, the direction to attack: shoots the projectile weapon or swings the melee
  //           weapon that way, whichever the player has out (see Player.switchWeapon)
  //   frozen  true while something (a dialogue) has the player's attention: no walking or shooting
  // Returns the enemies that died this frame, so the view can play their death.
  update({ move, fire, frozen = false }) {
    const player = this.player;

    // Standing in a door tile means the player is leaving the room (or, in a house, going back
    // outside). Standing on a dungeon entrance or a house door in the overworld means they are
    // going in. Standing on a dungeon start room's way out means they are going back to the
    // overworld, whether or not the rooms around have been cleared. Standing in a boss room's
    // door to the next area (it can only be open once the boss is dead) means they are going on.
    if (!player.isDead()) {
      const center = player.getCenter();
      const entrance = this.inOverworld() ? this.room.getEntranceAt(center.x, center.y) : null;
      const house = this.inOverworld() ? this.room.getHouseAt(center.x, center.y) : null;
      const exit = this.room.getExitAt(center.x, center.y);
      if (entrance) {
        this.enterDungeon(entrance);
      } else if (house) {
        this.enterHouse(house);
      } else if (exit && this.inHouse()) {
        this.leaveHouse();
      } else if (exit) {
        this.useExit(exit);
      } else if (this.dungeon !== null && this.room.getOverworldExitAt(center.x, center.y)) {
        this.leaveDungeon();
      } else if (this.dungeon !== null && this.room.getOnwardDoorAt(center.x, center.y)) {
        this.advance();
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
    this.resolveSlash();
    this.resolveRam();
    if (player.hasFinishedFalling() && !player.isDead()) {
      player.respawnAt(this.entrySpot.x, this.entrySpot.y); // back at the door they came in through
    }

    for (const p of this.projectiles) {
      if (p.homing > 0) {
        const target = nearestEnemy(room.enemies, p);
        if (target !== null) {
          p.steerToward(target.getCenter());
        }
      }
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
