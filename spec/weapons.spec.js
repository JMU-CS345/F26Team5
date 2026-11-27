// Weapons: the catalog, starting loadouts, shots, the sword swing and elemental weak spots.
// Shared helpers live in helpers.js.

describe("Weapon catalog", function () {
  it("builds every weapon with the right class, and its art exists in WEAPON_ART", function () {
    for (const [name, def] of Object.entries(WEAPON_DEFS)) {
      const weapon = createWeapon(name);
      expect(weapon instanceof def.type).toBe(true);
      expect(typeof WEAPON_ART[weapon.art].icon).toBe("string");
    }
  });

  it("gives every ranged weapon a shot picture and the sword a swing", function () {
    for (const name of Object.keys(WEAPON_DEFS)) {
      const weapon = createWeapon(name);
      if (weapon instanceof ProjectileWeapon) {
        expect(typeof WEAPON_ART[weapon.art].projectile.sheet).toBe("string");
      } else {
        expect(weapon.swing.reaches.length).toBeGreaterThan(0);
      }
    }
  });

  it("gives the Dreamcatcher an animated shot and the others a single picture", function () {
    expect(WEAPON_ART.dreamcatcher.projectile.frames).toBe(2);
    expect(WEAPON_ART.fireballer.projectile.frames).toBe(1);
    expect(WEAPON_ART.freezer.projectile.frames).toBe(1);
  });

  it("turns only the fireball to point the way it flies", function () {
    expect(WEAPON_ART.fireballer.projectile.directional).toBe(true);
    expect(WEAPON_ART.freezer.projectile.directional).toBeFalsy();
    expect(WEAPON_ART.dreamcatcher.projectile.directional).toBeFalsy();
    const fireball = WEAPON_ART.fireballer.projectile;
    expect(getShotAngle(fireball, new p5.Vector(5, 0))).toBe(0); // the picture faces right
    expect(getShotAngle(fireball, new p5.Vector(0, 5))).toBeCloseTo(Math.PI / 2);
    expect(getShotAngle(fireball, new p5.Vector(-5, 0))).toBeCloseTo(Math.PI);
    expect(getShotAngle(fireball, new p5.Vector(0, -5))).toBeCloseTo(-Math.PI / 2);
    expect(getShotAngle(WEAPON_ART.freezer.projectile, new p5.Vector(0, 5))).toBe(0);
  });

  it("gives the Fireballer a big picture for the charged fireball, facing right like the small one", function () {
    const big = WEAPON_ART.fireballer.chargedProjectile;
    expect(big.frameW).toBe(32);
    expect(big.frameH).toBe(32);
    expect(big.directional).toBe(true);
    expect(WEAPON_ART.freezer.chargedProjectile).toBeUndefined();
    expect(WEAPON_ART.dreamcatcher.chargedProjectile).toBeUndefined();
  });

  it("draws a charged fireball with the big picture at its own size, and every other shot as before", function () {
    const art = WEAPON_ART.fireballer;
    const normal = new Projectile(0, 0, new p5.Vector(1, 0), 1);
    const charged = new Projectile(0, 0, new p5.Vector(1, 0), 1);
    applyChargeEffect(charged, "power");
    expect(getShotArt(art, normal)).toBe(art.projectile);
    expect(getShotArt(art, charged)).toBe(art.chargedProjectile);
    expect(getShotDrawScale(art, normal)).toBe(1);
    expect(getShotDrawScale(art, charged)).toBe(1); // already big: not scaled again
    const spark = new Projectile(0, 0, new p5.Vector(1, 0), 1);
    applyChargeEffect(spark, "pierce");
    expect(getShotArt(WEAPON_ART.freezer, spark)).toBe(WEAPON_ART.freezer.projectile);
  });

  it("falls back to the normal picture, scaled, when a charged shot has no charged picture", function () {
    const art = { projectile: { frameW: 16 } };
    const shot = new Projectile(0, 0, new p5.Vector(1, 0), 1);
    shot.charged = true;
    shot.scale = 2;
    expect(getShotArt(art, shot)).toBe(art.projectile);
    expect(getShotDrawScale(art, shot)).toBe(2);
  });

  it("marks only the shot a full charge makes as charged", function () {
    const shot = new Projectile(0, 0, new p5.Vector(1, 0), 1);
    expect(shot.charged).toBe(false);
    applyChargeEffect(shot, "seek");
    expect(shot.charged).toBe(true);
  });

  it("picks the frame of an animated shot from its age", function () {
    const shot = WEAPON_ART.dreamcatcher.projectile;
    expect(getShotFrame(shot, 0)).toBe(0);
    expect(getShotFrame(shot, shot.frameTime)).toBe(1);
    expect(getShotFrame(shot, shot.frameTime * 2)).toBe(0);
  });

  it("throws for an unknown weapon", function () {
    expect(() => createWeapon("Banana")).toThrow();
  });

  it("makes a new copy every time", function () {
    expect(createWeapon("Freezer")).not.toBe(createWeapon("Freezer"));
  });
});

describe("Starting weapons", function () {
  const expected = { Fire: "fireballer", Ice: "freezer", Mind: "dreamcatcher" };

  for (const [mageClass, id] of Object.entries(expected)) {
    it(`gives the ${mageClass} mage the default sword and a ${id}`, function () {
      const player = new Player(0, 0, mageClass);
      expect(player.getMeleeWeapon().id).toBe("default-sword");
      expect(player.getRangedWeapon().id).toBe(id);
      expect(player.getRangedWeapon().element).toBe(mageClass);
    });
  }

  it("leaves the bag empty once the weapons are equipped", function () {
    expect(new Player(0, 0, "Fire").inventory.contents().length).toBe(0);
  });

  it("gives a player with no class no weapons", function () {
    const player = new Player(0, 0);
    expect(player.getMeleeWeapon()).toBeNull();
    expect(player.getRangedWeapon()).toBeNull();
  });
});

describe("Firing the equipped weapon", function () {
  it("shoots with the weapon's element and picture", function () {
    const shot = shootTap(new Player(0, 0, "Ice"), new p5.Vector(1, 0));
    expect(shot.element).toBe("Ice");
    expect(shot.art).toBe("freezer");
  });

  it("scales the damage by the stat for the weapon's element", function () {
    const player = new Player(0, 0, "Fire");
    const shot = player.fire(new p5.Vector(1, 0));
    expect(shot.damage).toBeCloseTo(scaleDamage(1, "Fire", player.stats));
  });

  it("uses the weapon's cooldown", function () {
    const player = new Player(0, 0, "Mind");
    shootTap(player, new p5.Vector(1, 0));
    expect(player.fireCooldown).toBe(player.getRangedWeapon().cooldown);
  });

  it("still shoots a plain bolt with no weapon equipped", function () {
    const shot = new Player(0, 0).fire(new p5.Vector(1, 0));
    expect(shot.art).toBeNull();
    expect(shot.damage).toBe(PROJECTILE_DAMAGE);
  });
});

describe("Sword swing", function () {
  let player;
  let swing;

  // Plays frames until the swing reaches the given frame number.
  const advanceTo = (frame) => {
    while (player.slashFrames < frame) {
      player.update();
    }
  };

  beforeEach(function () {
    player = new Player(100, 100, "Fire");
    swing = player.getMeleeWeapon().swing;
  });

  it("starts a swing, and ignores a second start until it is over", function () {
    expect(player.startSlash()).toBe(true);
    expect(player.startSlash()).toBe(false);
    expect(player.isSlashing()).toBe(true);
  });

  it("goes through windup, active and recover, then ends", function () {
    const phases = [];
    player.startSlash();
    while (player.isSlashing()) {
      phases.push(player.getSlashPhase());
      player.update();
    }
    expect(phases.filter((p) => p === "windup").length).toBe(swing.windup);
    expect(phases.filter((p) => p === "active").length).toBe(swing.reaches.length);
    expect(phases.filter((p) => p === "recover").length).toBe(swing.recover);
    expect(player.getSlashPhase()).toBeNull();
    expect(player.startSlash()).toBe(true);
  });

  it("only hurts during the active part", function () {
    player.startSlash();
    expect(player.getSlashHitbox()).toBeNull();
    advanceTo(swing.windup + 1);
    expect(player.getSlashHitbox()).not.toBeNull();
    advanceTo(swing.windup + swing.reaches.length + 1);
    expect(player.getSlashPhase()).toBe("recover");
    expect(player.getSlashHitbox()).toBeNull();
  });

  it("puts the hitbox in front of the player for each facing", function () {
    const bounds = player.getBounds();
    const expected = {
      right: (h) => h.x === bounds.x + bounds.w && h.w === swing.reaches[0] && h.h === swing.thickness,
      left: (h) => h.x + h.w === bounds.x && h.w === swing.reaches[0] && h.h === swing.thickness,
      down: (h) => h.y === bounds.y + bounds.h && h.h === swing.reaches[0] && h.w === swing.thickness,
      up: (h) => h.y + h.h === bounds.y && h.h === swing.reaches[0] && h.w === swing.thickness
    };
    for (const facing of Object.keys(expected)) {
      const p = new Player(100, 100, "Fire");
      p.facing = facing;
      p.startSlash();

      while (p.slashFrames < swing.windup + 1) {
        p.update();
      }
      expect(expected[facing](p.getSlashHitbox())).toBe(true, facing);
    }
  });

  it("changes the hitbox size from frame to frame", function () {
    player.facing = "right";
    player.startSlash();
    const reaches = [];
    while (player.isSlashing()) {
      const hitbox = player.getSlashHitbox();
      if (hitbox) {
        reaches.push(hitbox.w);
      }
      player.update();
    }
    expect(reaches).toEqual(swing.reaches.slice());
  });

  it("keeps the facing while swinging, even when walking another way", function () {
    const room = new NormalRoom(0, 0, 640, 400);
    player.facing = "right";
    player.startSlash();
    player.move(new p5.Vector(0, 1), room);
    expect(player.facing).toBe("right");
  });

  it("cannot shoot while swinging", function () {
    player.startSlash();
    expect(player.fire(new p5.Vector(1, 0))).toBeNull();
  });

  it("does not start when dead, falling or without a sword", function () {
    const dead = new Player(0, 0, "Fire");
    dead.takeDamage(999);
    expect(dead.startSlash()).toBe(false);
    const falling = new Player(0, 0, "Fire");
    falling.startFall();
    expect(falling.startSlash()).toBe(false);
    expect(new Player(0, 0).startSlash()).toBe(false);
  });

  it("ends the swing when the player dies or falls", function () {
    player.startSlash();
    player.takeDamage(999);
    player.update();
    expect(player.isSlashing()).toBe(false);
    const other = new Player(0, 0, "Fire");
    other.startSlash();
    other.startFall();
    expect(other.isSlashing()).toBe(false);
  });

  it("does a plain, unscaled hit with the sword's damage", function () {
    expect(player.getSlashDamage()).toBe(player.getMeleeWeapon().damage);
  });

  it("faces the way it swings with a vector", function () {
    player.facing = "left";
    expect(player.facingVector().x).toBe(-1);
    player.facing = "up";
    expect(player.facingVector().y).toBe(-1);
  });
});

describe("Sword swing frames", function () {
  it("turns first, then raises the weapon arm, for every facing", function () {
    for (const model of PLAYER_MODEL_NAMES) {
      for (const facing of ["down", "up", "right", "left"]) {
        const player = new Player(0, 0, "Fire", model);
        player.facing = facing;
        player.startSlash();
        expect(getPlayerFrame(player)).toEqual({ row: TURN_ROW, col: TURN_COLUMN[facing] });
        while (player.getSlashPhase() === "windup") {
          player.update();
        }
        expect(getPlayerFrame(player)).toEqual({ row: FACING_ROW[facing] + WEAPON_ROW_OFFSET, col: 0 });
      }
    }
  });

  it("draws the slash effect at 16x16 beside the blade", function () {
    expect(SLASH_EFFECT.size).toBe(16);
    expect(SLASH_EFFECT.offset.x).toBeGreaterThanOrEqual(0); // on the sweeping side of the blade
  });
});

describe("Held weapon", function () {
  let player;

  beforeEach(function () {
    player = new Player(100, 100, "Fire");
  });

  it("has a hand position for every model and facing", function () {
    for (const model of PLAYER_MODEL_NAMES) {
      for (const facing of Object.keys(FACING_ANGLE)) {
        const hand = PLAYER_ART[model].hand[facing];
        expect(typeof hand.x).toBe("number", model + " " + facing);
        expect(typeof hand.y).toBe("number", model + " " + facing);
      }
    }
  });

  it("places the hand relative to the middle of the hitbox", function () {
    player.facing = "right";
    const hand = getHandPosition(player);
    const hitboxCenter = player.getCenter();
    expect(hand.x - hitboxCenter.x).toBe(PLAYER_ART[player.modelName].hand.right.x);
  });

  it("holds nothing when idle and the projectile weapon with the arm up", function () {
    expect(getHeldWeapon(player)).toBeNull();
    player.fire(new p5.Vector(1, 0));
    expect(getHeldWeapon(player).id).toBe("fireballer");
  });

  it("holds the sword for the whole swing, starting on the turning frame", function () {
    const swinger = new Player(0, 0, "Fire");
    swinger.startSlash();
    expect(swinger.getSlashPhase()).toBe("windup");
    while (swinger.isSlashing()) {
      expect(getHeldWeapon(swinger).id).toBe("default-sword");
      swinger.update();
    }
  });

  it("holds nothing when dead or falling", function () {
    player.fire(new p5.Vector(1, 0));
    player.takeDamage(999);
    expect(getHeldWeapon(player)).toBeNull();
    const falling = new Player(0, 0, "Fire");
    falling.fire(new p5.Vector(1, 0));
    falling.startFall();
    expect(getHeldWeapon(falling)).toBeNull();
  });

  it("points a projectile weapon the way the player faces", function () {
    for (const facing of Object.keys(FACING_ANGLE)) {
      player.facing = facing;
      expect(getHeldWeaponAngle(player)).toBe(FACING_ANGLE[facing]);
    }
  });

  it("starts the sword where another facing would put it, on the turning frame", function () {
    expect(WINDUP_FACING).toEqual({ left: "up", down: "left", right: "down", up: "right" });
    for (const [facing, start] of Object.entries(WINDUP_FACING)) {
      const swinger = new Player(0, 0, "Fire");
      swinger.facing = facing;
      swinger.startSlash();
      expect(getHeldWeaponFacing(swinger)).toBe(start);
      expect(getHeldWeaponAngle(swinger)).toBe(FACING_ANGLE[start]);
      const hand = PLAYER_ART[swinger.modelName].hand[start];
      expect(getHandPosition(swinger).x - swinger.getCenter().x).toBe(hand.x);
      expect(getHandPosition(swinger).y - swinger.getCenter().y).toBe(hand.y);
    }
  });

  it("holds the sword straight out in front from the first active frame to the end", function () {
    for (const facing of Object.keys(FACING_ANGLE)) {
      const swinger = new Player(0, 0, "Fire");
      swinger.facing = facing;
      swinger.startSlash();
      while (swinger.isSlashing()) {
        if (swinger.getSlashPhase() !== "windup") {
          expect(getHeldWeaponFacing(swinger)).toBe(facing);
          expect(getHeldWeaponAngle(swinger)).toBe(FACING_ANGLE[facing]);
        }
        swinger.update();
      }
    }
  });

  it("keeps the slash effect off the blade, which is 4 pixels wide", function () {
    expect(SLASH_EFFECT.offset.x).toBeGreaterThanOrEqual(HELD_WEAPON.grip.x - 8 + 2);
  });

  it("gives every weapon an icon, which is what the hand holds", function () {
    for (const name of Object.keys(WEAPON_DEFS)) {
      expect(WEAPON_ART[createWeapon(name).art].icon).toBeDefined();
    }
  });
});

describe("Sword hits in a run", function () {
  let run;
  let enemy;

  // Starts a swing and plays it to the first active frame.
  const swingToActive = () => {
    const player = run.player;
    player.startSlash();
    while (player.getSlashPhase() !== "active") {
      player.update();
    }
  };

  beforeEach(function () {
    const dungeon = generateDungeon({ seed: 3, roomCount: 8, screenX: 320, screenY: 160 });
    run = new Run(dungeon, "Fire", PLAYER_MODEL_NAMES[0], makeAppearance());
    run.player.facing = "right";
    enemy = createEnemy("Jelly", run.player.pos.x + PLAYER_LENGTH + 2, run.player.pos.y);
    run.room.enemies = [enemy];
  });

  it("hurts an enemy in front of the player", function () {
    swingToActive();
    run.resolveSlash();
    expect(enemy.health).toBe(enemy.type.maxHealth - run.player.getMeleeWeapon().damage);
  });

  it("hurts each enemy only once per swing", function () {
    swingToActive();
    run.resolveSlash();
    const health = enemy.health;
    run.player.update();
    run.resolveSlash();
    expect(enemy.health).toBe(health);
  });

  it("misses an enemy behind the player", function () {
    run.player.facing = "left";
    swingToActive();
    run.resolveSlash();
    expect(enemy.health).toBe(enemy.type.maxHealth);
  });

  it("swings the sword toward the arrow keys when the sword is out", function () {
    run.player.switchWeapon();
    run.update({ move: new p5.Vector(0, 0), fire: new p5.Vector(1, 0) });
    expect(run.player.isSlashing()).toBe(true);
    expect(run.player.facing).toBe("right");
    expect(run.projectiles.length).toBe(0);
  });

  it("shoots instead of swinging when the projectile weapon is out", function () {
    run.room.enemies = []; // or the shot would hit the enemy standing in front of the player
    run.update({ move: new p5.Vector(0, 0), fire: new p5.Vector(1, 0) });
    expect(run.player.isSlashing()).toBe(false);
    expect(run.projectiles.length).toBe(1);
  });

  it("does not swing while frozen", function () {
    run.player.switchWeapon();
    run.update({ move: new p5.Vector(0, 0), fire: new p5.Vector(1, 0), frozen: true });
    expect(run.player.isSlashing()).toBe(false);
  });

  it("reads Q as the weapon switch key", function () {
    expect(isWeaponSwitchKey("q")).toBe(true);
    expect(isWeaponSwitchKey("Q")).toBe(true);
    expect(isWeaponSwitchKey("w")).toBe(false);
    expect(isGameplayInputHeld((code) => code === 81)).toBe(false);
  });
});

describe("Holding two weapons", function () {
  let player;
  const right = () => new p5.Vector(1, 0);

  beforeEach(function () {
    player = new Player(100, 100, "Mind");
  });

  it("starts with the projectile weapon out", function () {
    expect(player.isMeleeActive()).toBe(false);
    expect(player.getActiveWeapon().id).toBe("dreamcatcher");
  });

  it("swaps between the two weapons", function () {
    expect(player.switchWeapon()).toBe(true);
    expect(player.getActiveWeapon().id).toBe("default-sword");
    expect(player.switchWeapon()).toBe(true);
    expect(player.getActiveWeapon().id).toBe("dreamcatcher");
  });

  it("cannot swap without both weapons, mid-swing, dead or falling", function () {
    expect(new Player(0, 0).switchWeapon()).toBe(false);
    const swinging = new Player(0, 0, "Fire");
    swinging.switchWeapon();
    swinging.fire(right());
    expect(swinging.switchWeapon()).toBe(false);
    const dead = new Player(0, 0, "Fire");
    dead.takeDamage(999);
    expect(dead.switchWeapon()).toBe(false);
    const falling = new Player(0, 0, "Fire");
    falling.startFall();
    expect(falling.switchWeapon()).toBe(false);
  });

  it("falls back to the projectile weapon if the sword is taken off", function () {
    player.switchWeapon();
    player.inventory.unequip("melee");
    expect(player.isMeleeActive()).toBe(false);
    expect(player.fire(right())).not.toBeNull();
  });

  it("swings toward the arrow direction and returns no shot with the sword out", function () {
    player.switchWeapon();
    expect(player.fire(new p5.Vector(-1, 0))).toBeNull();
    expect(player.facing).toBe("left");
    expect(player.isSlashing()).toBe(true);
  });

  it("raises the weapon arm while the attack key is held, and lowers it for the sword when let go", function () {
    player.fire(right());
    expect(player.isArmUp()).toBe(true);
    const sword = new Player(0, 0, "Mind");
    sword.switchWeapon();
    sword.fire(right());
    expect(sword.isArmUp()).toBe(true); // the sword stays out while the key is held on
    sword.fire(new p5.Vector(0, 0));
    expect(sword.isArmUp()).toBe(false); // the swing's own pose plays on, but the arm is not held up
  });

  it("ignores the projectile cooldown when swinging", function () {
    player.fireCooldown = 30; // the projectile weapon is still cooling down
    player.switchWeapon();
    player.fire(right());
    expect(player.isSlashing()).toBe(true);
  });

  it("lists both weapons for the HUD, marking the one that is out", function () {
    let slots = getWeaponHudSlots(player);
    expect(slots.map((s) => s.slot)).toEqual(["melee", "projectile"]);
    expect(slots.map((s) => s.item.id)).toEqual(["default-sword", "dreamcatcher"]);
    expect(slots.map((s) => s.active)).toEqual([false, true]);
    player.switchWeapon();
    slots = getWeaponHudSlots(player);
    expect(slots.map((s) => s.active)).toEqual([true, false]);
  });

  it("shows empty slots for a player with no weapons", function () {
    const slots = getWeaponHudSlots(new Player(0, 0));
    expect(slots.map((s) => s.item)).toEqual([null, null]);
  });
});

describe("Elemental weak spots", function () {
  const jelly = () => createEnemy("Jelly", 100, 100); // weak to Ice, resists Fire

  it("doubles damage from an element the enemy is weak to", function () {
    const enemy = jelly();
    enemy.takeDamage(1, null, "Ice");
    expect(enemy.health).toBe(enemy.type.maxHealth - ELEMENT_WEAK_MULTIPLIER);
  });

  it("halves damage from an element the enemy resists", function () {
    const enemy = jelly();
    enemy.takeDamage(1, null, "Fire");
    expect(enemy.health).toBe(enemy.type.maxHealth - ELEMENT_RESIST_MULTIPLIER);
  });

  it("does normal damage for other elements and for neutral hits", function () {
    const mind = jelly();
    mind.takeDamage(1, null, "Mind");
    const neutral = jelly();
    neutral.takeDamage(1);
    expect(mind.health).toBe(mind.type.maxHealth - 1);
    expect(neutral.health).toBe(neutral.type.maxHealth - 1);
  });

  it("applies the multiplier to a weapon's shot", function () {
    const enemy = jelly();
    const shot = new Projectile(enemy.pos.x + 8, enemy.pos.y + 8, new p5.Vector(1, 0), 1);
    shot.element = "Ice";
    expect(enemy.damageFromProjectile(shot)).toBe(true);
    expect(enemy.health).toBe(enemy.type.maxHealth - ELEMENT_WEAK_MULTIPLIER);
  });

  it("gives every enemy type at least one weakness, and none in both lists", function () {
    for (const name of ENEMY_TYPE_NAMES) {
      const type = ENEMY_TYPES[name];
      expect(type.weakTo.length).toBeGreaterThan(0, name);
      expect(type.weakTo.some((e) => (type.resists || []).includes(e))).toBe(false, name);
    }
  });

  it("rejects bad weakTo and resists lists", function () {
    const bad = (extra) => validateEnemyTypes({ Jelly: { ...ENEMY_TYPES.Jelly, ...extra } });
    expect(bad({ weakTo: ["Water"] }).length).toBeGreaterThan(0);
    expect(bad({ resists: "Fire" }).length).toBeGreaterThan(0);
    expect(bad({ weakTo: ["Fire"], resists: ["Fire"] }).length).toBeGreaterThan(0);
    expect(bad({ weakTo: ["Fire"], resists: ["Ice"] }).length).toBe(0);
  });
});

describe("Charging a shot", function () {
  let player;
  const right = () => new p5.Vector(1, 0);
  const none = () => new p5.Vector(0, 0);
  // Holds the key for some frames, updating the player each frame, and returns every shot made.
  const hold = (frames, dir = right()) => {
    const shots = [];
    for (let i = 0; i < frames; i++) {
      const shot = player.fire(dir);
      if (shot) {
        shots.push(shot);
      }
      player.update();
    }
    return shots;
  };
  const charge = () => player.getRangedWeapon().charge;
  // Holds long enough for a full charge.
  const holdToFull = () => hold(1 + charge().delay + charge().frames);

  beforeEach(function () {
    player = new Player(100, 100, "Fire");
  });

  it("gives all three starter weapons a charge, a delay and a longer cooldown than before", function () {
    for (const mageClass of ["Fire", "Ice", "Mind"]) {
      const weapon = new Player(0, 0, mageClass).getRangedWeapon();
      expect(weapon.charge).not.toBeNull();
      expect(weapon.charge.delay).toBeGreaterThan(0);
      expect(weapon.cooldown).toBeGreaterThan(15);
      expect(CHARGE_EFFECTS[weapon.charge.effect]).toEqual(jasmine.any(Function));
    }
  });

  it("gives each starter weapon its own effect", function () {
    const effects = ["Fire", "Ice", "Mind"].map((c) => new Player(0, 0, c).getRangedWeapon().charge.effect);
    expect(new Set(effects).size).toBe(3);
  });

  it("shoots a normal shot as soon as the key is pressed", function () {
    const shot = player.fire(right());
    expect(shot).not.toBeNull();
    expect(shot.scale).toBe(1);
    expect(shot.pierce).toBe(0);
    expect(shot.homing).toBe(0);
    expect(player.fireCooldown).toBe(player.getRangedWeapon().cooldown);
  });

  it("shows no charge for a tap or a short hold", function () {
    hold(1);
    expect(player.isCharging()).toBe(false);
    hold(charge().delay - 2);
    expect(player.isCharging()).toBe(false);
    expect(player.getChargeRatio()).toBe(0);
  });

  it("starts charging only after the key has been held past the delay", function () {
    hold(charge().delay + 1);
    expect(player.isCharging()).toBe(false);
    hold(1);
    expect(player.isCharging()).toBe(true);
    expect(player.chargeFrames).toBe(1);
  });

  it("never rapid fires: holding the key makes one shot and then only a charged one on release", function () {
    const shots = hold(400);
    expect(shots.length).toBe(1);
  });

  it("stops charging at the weapon's maximum", function () {
    hold(1 + charge().delay + charge().frames + 40);
    expect(player.chargeFrames).toBe(charge().frames);
    expect(player.getChargeRatio()).toBe(1);
  });

  it("shoots nothing more when the key is let go before the charge is full", function () {
    hold(1 + charge().delay + charge().frames - 5);
    expect(player.isCharging()).toBe(true);
    expect(player.fire(none())).toBeNull();
    expect(player.isCharging()).toBe(false);
  });

  it("shoots a charged shot with the weapon's effect when let go at a full charge", function () {
    holdToFull();
    const shot = player.fire(none());
    expect(shot).not.toBeNull();
    expect(shot.scale).toBe(2); // the Fireballer's effect: bigger
    expect(player.isCharging()).toBe(false);
    expect(player.fireCooldown).toBe(player.getRangedWeapon().cooldown);
  });

  it("applies the effect only to the full charge, not to the shot made by the press", function () {
    const shots = hold(1 + charge().delay + charge().frames);
    const full = player.fire(none());
    expect(shots[0].damage).toBeLessThan(full.damage);
  });

  it("cannot turn while the key is held on after the shot, and the charged shot keeps the way it was pressed", function () {
    hold(2);
    hold(1 + charge().delay + charge().frames, new p5.Vector(0, -1)); // a different arrow while holding
    expect(player.facing).toBe("right");
    const shot = player.fire(none());
    expect(shot.vel.x).toBeGreaterThan(0);
    expect(shot.vel.y).toBeCloseTo(0);
  });

  it("cannot turn by walking while charging", function () {
    const room = new NormalRoom(0, 0, 640, 400);
    hold(charge().delay + 5);
    player.move(new p5.Vector(0, -1), room);
    expect(player.facing).toBe("right");
  });

  it("can turn for the next shot once the key is let go", function () {
    hold(3);
    player.fire(none());
    for (let i = 0; i < player.getRangedWeapon().cooldown; i++) {
      player.update();
    }
    expect(player.fire(new p5.Vector(0, -1))).not.toBeNull();
    expect(player.facing).toBe("up");
  });

  it("makes a new shot for a new press, and not before the cooldown is over", function () {
    shootTap(player, right());
    expect(player.fire(right())).toBeNull(); // still cooling down
    for (let i = 0; i < player.getRangedWeapon().cooldown; i++) {
      player.update();
    }
    expect(player.fire(right())).not.toBeNull(); // the waiting press shoots
    expect(player.fire(right())).toBeNull(); // and the same press does not shoot again
  });

  it("is broken by a hit, a pit, switching weapons and dying, and the key must be let go to shoot again", function () {
    const broken = (action) => {
      const p = new Player(100, 100, "Fire");
      for (let i = 0; i < 1 + charge().delay + 10; i++) {
        p.fire(right());
      }
      action(p);
      return p.isCharging();
    };
    expect(broken((p) => p.takeDamage(1, right()))).toBe(false);
    expect(broken((p) => p.startFall())).toBe(false);
    expect(broken((p) => p.switchWeapon())).toBe(false);
    expect(broken((p) => p.takeDamage(999))).toBe(false);
  });

  it("does not shoot a charged shot if the charge was broken", function () {
    holdToFull();
    player.takeDamage(1, right());
    expect(player.fire(none())).toBeNull();
  });

  it("is not broken by a hit that does no damage", function () {
    hold(charge().delay + 5);
    player.takeDamage(0);
    expect(player.isCharging()).toBe(true);
  });

  it("shows the weapon in hand while charging", function () {
    hold(charge().delay + 5);
    expect(getHeldWeapon(player).id).toBe("fireballer");
    expect(player.isArmUp()).toBe(true);
  });

  it("still shoots a plain bolt at once with no weapon", function () {
    expect(new Player(0, 0).fire(right())).not.toBeNull();
  });
});

describe("Charge effects", function () {
  const makeShot = () => new Projectile(100, 100, new p5.Vector(1, 0), 1, 5);

  it("throws for an unknown effect", function () {
    expect(() => applyChargeEffect(makeShot(), "nope")).toThrow();
  });

  it("power: triples the damage and doubles the size, around the same middle", function () {
    const shot = makeShot();
    const cx = shot.pos.x + shot.length / 2;
    applyChargeEffect(shot, "power");
    expect(shot.damage).toBeCloseTo(3);
    expect(shot.length).toBe(PROJECTILE_LENGTH * 2);
    expect(shot.scale).toBe(2);
    expect(shot.pos.x + shot.length / 2).toBeCloseTo(cx);
  });

  it("pierce: faster, a bit stronger and passes through three enemies", function () {
    const shot = makeShot();
    applyChargeEffect(shot, "pierce");
    expect(shot.vel.mag()).toBeCloseTo(7.5);
    expect(shot.damage).toBeCloseTo(1.5);
    expect(shot.pierce).toBe(3);
  });

  it("pierce: hurts each enemy once and keeps going, then stops when it runs out", function () {
    const shot = makeShot();
    shot.pierce = 1;
    const first = createEnemy("Jelly", shot.pos.x - 4, shot.pos.y - 4);
    const second = createEnemy("Jelly", shot.pos.x - 4, shot.pos.y - 4);
    expect(first.damageFromProjectile(shot)).toBe(true);
    expect(shot.alive).toBe(true);
    expect(first.damageFromProjectile(shot)).toBe(false); // not hurt twice
    expect(second.damageFromProjectile(shot)).toBe(true);
    expect(shot.alive).toBe(false);
  });

  it("a normal shot is used up by the first enemy", function () {
    const shot = makeShot();
    const enemy = createEnemy("Jelly", shot.pos.x - 4, shot.pos.y - 4);
    enemy.damageFromProjectile(shot);
    expect(shot.alive).toBe(false);
  });

  it("seek: sets how sharply the shot can turn", function () {
    const shot = makeShot();
    applyChargeEffect(shot, "seek");
    expect(shot.homing).toBeCloseTo(CHARGE_MAX_HOMING);
  });

  it("steers toward a target by at most its turn rate, keeping its speed", function () {
    const shot = makeShot();
    shot.homing = 0.05;
    shot.steerToward(new p5.Vector(shot.pos.x, shot.pos.y + 500)); // straight down
    expect(Math.atan2(shot.vel.y, shot.vel.x)).toBeCloseTo(0.05);
    expect(shot.vel.mag()).toBeCloseTo(5);
  });

  it("steers the short way round and stops turning once it points at the target", function () {
    const shot = makeShot();
    shot.homing = 1;
    shot.steerToward(new p5.Vector(shot.pos.x + shot.length / 2, shot.pos.y - 100 + shot.width / 2));
    expect(shot.vel.y).toBeLessThan(0); // up is a quarter turn the other way, not three the long way
  });

  it("a shot that does not home ignores the target", function () {
    const shot = makeShot();
    shot.steerToward(new p5.Vector(0, 500));
    expect(shot.vel.y).toBe(0);
  });

  it("picks the nearest living enemy for a seeking shot", function () {
    const shot = makeShot();
    const near = createEnemy("Jelly", shot.pos.x + 20, shot.pos.y);
    const far = createEnemy("Jelly", shot.pos.x + 200, shot.pos.y);
    const dead = createEnemy("Jelly", shot.pos.x + 5, shot.pos.y);
    dead.health = 0;
    expect(nearestEnemy([far, dead, near], shot)).toBe(near);
    expect(nearestEnemy([], shot)).toBeNull();
  });

  it("a run steers a seeking shot toward an enemy", function () {
    const dungeon = generateDungeon({ seed: 3, roomCount: 8, screenX: 320, screenY: 160 });
    const run = new Run(dungeon, "Mind", PLAYER_MODEL_NAMES[0], makeAppearance());
    const shot = new Projectile(run.player.pos.x, run.player.pos.y, new p5.Vector(1, 0), 1, 3);
    shot.homing = 0.05;
    run.projectiles = [shot];
    const enemy = createEnemy("Jelly", run.player.pos.x + 60, run.player.pos.y + 100);
    run.room.enemies = [enemy];
    run.update({ move: new p5.Vector(0, 0), fire: new p5.Vector(0, 0) });
    expect(shot.vel.y).toBeGreaterThan(0);
  });

  it("makes shots start at normal size, with no piercing or homing", function () {
    const shot = makeShot();
    expect(shot.scale).toBe(1);
    expect(shot.pierce).toBe(0);
    expect(shot.homing).toBe(0);
  });
});

describe("Spin attack", function () {
  let player;
  let sword;
  const right = () => new p5.Vector(1, 0);
  const none = () => new p5.Vector(0, 0);
  // One frame: the attack key (or nothing), then the player's update.
  const frame = (dir) => {
    player.fire(dir);
    player.update();
  };
  const hold = (frames, dir = right()) => {
    for (let i = 0; i < frames; i++) {
      frame(dir);
    }
  };
  // Presses the key (which swings), waits out the swing still holding it, then holds until full.
  const chargeToFull = () => {
    frame(right());
    while (player.isSlashing()) {
      frame(right());
    }
    hold(sword.spin.chargeFrames);
  };
  const spinFrom = (facing) => {
    player = new Player(100, 100, "Fire");
    player.switchWeapon();
    player.facing = facing;
    player.startSpin();
  };

  beforeEach(function () {
    player = new Player(100, 100, "Fire");
    player.switchWeapon();
    sword = player.getMeleeWeapon();
  });

  it("gives the default sword a spin", function () {
    expect(sword.spin).not.toBeNull();
    expect(sword.spin.reaches.length).toBe(sword.spin.framesPerDirection);
    expect(SPIN_ORDER).toEqual(["down", "right", "up", "left"]);
  });

  it("swings once when the key is pressed and does not swing again while it is held", function () {
    frame(right());
    expect(player.isSlashing()).toBe(true);
    let swings = 1;
    let wasSlashing = true;
    for (let i = 0; i < 120; i++) {
      frame(right());
      if (player.isSlashing() && !wasSlashing) {
        swings++;
      }
      wasSlashing = player.isSlashing();
    }
    expect(swings).toBe(1);
  });

  it("swings again after the key is let go and pressed again", function () {
    frame(right());
    hold(60, none());
    expect(player.isSlashing()).toBe(false);
    frame(right());
    expect(player.isSlashing()).toBe(true);
  });

  it("swings again as soon as the first swing is over when the key is pressed again during it", function () {
    frame(right());
    frame(none()); // let go mid-swing
    for (let i = 0; i < 100 && player.isSlashing(); i++) {
      frame(right()); // pressed again, held
    }
    expect(player.isSlashing()).toBe(false);
    frame(right());
    expect(player.isSlashing()).toBe(true); // the buffered press swings
  });

  it("charges the spin after the swing while the key stays held", function () {
    frame(right());
    while (player.isSlashing()) {
      frame(right());
    }
    expect(player.swordCharge).toBe(0);
    hold(10);
    expect(player.swordCharge).toBe(10);
    expect(player.isCharging()).toBe(true);
    expect(player.getChargeRatio()).toBeCloseTo(10 / sword.spin.chargeFrames);
  });

  it("holds the sword out in front while charging", function () {
    frame(right());
    while (player.isSlashing()) {
      frame(right());
    }
    hold(5);
    expect(player.isArmUp()).toBe(true);
    expect(getHeldWeapon(player).id).toBe("default-sword");
  });

  it("stops charging at full", function () {
    chargeToFull();
    hold(30);
    expect(player.swordCharge).toBe(sword.spin.chargeFrames);
    expect(player.getChargeRatio()).toBe(1);
  });

  it("cannot turn while the spin charges, and spins from the way the swing went", function () {
    frame(right());
    while (player.isSlashing()) {
      frame(right());
    }
    hold(sword.spin.chargeFrames, new p5.Vector(0, -1)); // a different arrow while charging
    expect(player.facing).toBe("right");
    frame(none());
    expect(player.isSpinning()).toBe(true);
    expect(player.spinStart).toBe("right");
  });

  it("does nothing when the key is let go before the charge is full", function () {
    frame(right());
    while (player.isSlashing()) {
      frame(right());
    }
    hold(sword.spin.chargeFrames - 1);
    frame(none());
    expect(player.isSlashing()).toBe(false);
    expect(player.isCharging()).toBe(false);
  });

  it("spins when the key is let go with a full charge", function () {
    chargeToFull();
    frame(none());
    expect(player.isSpinning()).toBe(true);
    expect(player.isCharging()).toBe(false);
  });

  it("turns counterclockwise through all four ways, starting with the next one and ending where it began", function () {
    for (const start of SPIN_ORDER) {
      spinFrom(start);
      const seen = [];
      while (player.isSpinning() && player.getSlashPhase() === "spin") {
        if (seen[seen.length - 1] !== player.facing) {
          seen.push(player.facing);
        }
        player.update();
      }
      const first = SPIN_ORDER.indexOf(start);
      // The first way is the next one round, and the last is the way it began.
      expect(seen).toEqual([1, 2, 3, 4].map((i) => SPIN_ORDER[(first + i) % 4]), start);
    }
  });

  it("shows the first frame of a spin facing the next way round, not the way it began", function () {
    spinFrom("down");
    expect(player.facing).toBe("right");
    expect(player.slashFrames).toBe(1);
    expect(getPlayerFrame(player)).toEqual({ row: TURN_ROW, col: TURN_COLUMN.right });
    expect(getHeldWeaponFacing(player)).toBe("right");
    expect(getSlashEffectProgress(player)).toBe(0);
    expect(player.getSlashHitbox().x).toBe(player.getBounds().x + player.getBounds().w); // in front on the right
  });

  it("spends the same number of frames on each way, then recovers facing where it began", function () {
    spinFrom("left");
    const counts = {};
    let frames = 0;
    while (player.isSpinning()) {
      if (player.getSlashPhase() === "spin") {
        counts[player.facing] = (counts[player.facing] || 0) + 1;
      }
      frames++;
      player.update();
    }
    for (const way of SPIN_ORDER) {
      expect(counts[way]).toBe(sword.spin.framesPerDirection);
    }
    expect(frames).toBe(sword.spin.framesPerDirection * 4 + sword.spin.recover);
    expect(player.facing).toBe("left");
    expect(player.isSlashing()).toBe(false);
  });

  it("holds the sword out at the start facing during the recover", function () {
    spinFrom("down");
    while (player.getSlashPhase() === "spin") {
      player.update();
    }
    expect(player.getSlashPhase()).toBe("recover");
    expect(player.facing).toBe("down");
    expect(getHeldWeapon(player).id).toBe("default-sword");
    expect(player.getSlashHitbox()).toBeNull();
  });

  it("hits in front of whichever way it is facing, with the reach for that frame", function () {
    spinFrom("down");
    const bounds = () => player.getBounds();
    while (player.getSlashPhase() === "spin") {
      const hitbox = player.getSlashHitbox();
      const reach = sword.spin.reaches[(player.slashFrames - 1) % sword.spin.framesPerDirection];
      const b = bounds();
      const inFront = {
        right: hitbox.x === b.x + b.w && hitbox.w === reach,
        left: hitbox.x + hitbox.w === b.x && hitbox.w === reach,
        down: hitbox.y === b.y + b.h && hitbox.h === reach,
        up: hitbox.y + hitbox.h === b.y && hitbox.h === reach
      };
      expect(inFront[player.facing]).toBe(true, player.facing + " frame " + player.slashFrames);
      player.update();
    }
  });

  it("hits harder than a normal swing", function () {
    const normal = player.getSlashDamage();
    spinFrom("down");
    expect(player.getSlashDamage()).toBeCloseTo(normal * sword.spin.damageMultiplier);
  });

  it("uses the turning frame for every quarter turn, then the weapon frame", function () {
    spinFrom("down");
    while (player.getSlashPhase() === "spin") {
      expect(getPlayerFrame(player)).toEqual({ row: TURN_ROW, col: TURN_COLUMN[player.facing] });
      player.update();
    }
    expect(getPlayerFrame(player)).toEqual({ row: FACING_ROW.down + WEAPON_ROW_OFFSET, col: 0 });
  });

  it("shows the slash effect for each way, starting over every quarter turn, and not in the recover", function () {
    spinFrom("down");
    const per = sword.spin.framesPerDirection;
    const starts = [];
    while (player.getSlashPhase() === "spin") {
      const progress = getSlashEffectProgress(player);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThan(1);
      if ((player.slashFrames - 1) % per === 0) {
        starts.push(progress);
      }
      player.update();
    }
    expect(starts).toEqual([0, 0, 0, 0]);
    expect(getSlashEffectProgress(player)).toBeNull();
  });

  it("still shows the effect for a normal swing and not when idle", function () {
    expect(getSlashEffectProgress(player)).toBeNull();
    player.startSlash();
    while (player.getSlashPhase() !== "active") {
      player.update();
    }
    expect(getSlashEffectProgress(player)).toBe(0);
  });

  it("draws the sword out for the way it is facing on each quarter turn", function () {
    spinFrom("down");
    while (player.getSlashPhase() === "spin") {
      expect(getHeldWeaponFacing(player)).toBe(player.facing);
      expect(getHeldWeaponAngle(player)).toBe(FACING_ANGLE[player.facing]);
      player.update();
    }
  });

  it("cannot shoot, swap weapons or start another swing during a spin, and keeps turning", function () {
    spinFrom("down");
    expect(player.switchWeapon()).toBe(false);
    expect(player.startSlash()).toBe(false);
    expect(player.startSpin()).toBe(false);
    player.update();
    player.update();
    frame(new p5.Vector(0, -1)); // another key does not change the way it turns
    expect(player.facing).toBe(SPIN_ORDER[1]); // still the first way of the spin
  });

  it("is broken by a hit while charging, and by swapping weapons", function () {
    chargeToFull();
    player.takeDamage(1, right());
    expect(player.isCharging()).toBe(false);
    chargeToFull();
    player.switchWeapon();
    expect(player.isCharging()).toBe(false);
  });

  it("does not start with no sword, no spin, or when dead or falling", function () {
    const plain = new Player(0, 0);
    expect(plain.startSpin()).toBe(false);
    const dead = new Player(0, 0, "Fire");
    dead.takeDamage(999);
    expect(dead.startSpin()).toBe(false);
    const falling = new Player(0, 0, "Fire");
    falling.startFall();
    expect(falling.startSpin()).toBe(false);
    const noSpin = new Player(0, 0, "Fire");
    noSpin.getMeleeWeapon().spin = null;
    expect(noSpin.startSpin()).toBe(false);
  });

  it("does not charge a spin with the projectile weapon out", function () {
    const mage = new Player(0, 0, "Fire");
    for (let i = 0; i < 100; i++) {
      mage.fire(right());
    }
    expect(mage.swordCharge).toBe(0);
  });
});

describe("Spin attack hits in a run", function () {
  it("hurts enemies on all four sides once each, and harder than a swing", function () {
    const dungeon = generateDungeon({ seed: 3, roomCount: 8, screenX: 320, screenY: 160 });
    const run = new Run(dungeon, "Fire", PLAYER_MODEL_NAMES[0], makeAppearance());
    const player = run.player;
    player.switchWeapon();
    const gap = 2;
    const spots = [
      [player.pos.x + 16 + gap, player.pos.y],
      [player.pos.x - 16 - gap, player.pos.y],
      [player.pos.x, player.pos.y - 16 - gap],
      [player.pos.x, player.pos.y + 16 + gap]
    ];
    const enemies = spots.map(([x, y]) => {
      const e = createEnemy("Jelly", x, y);
      e.health = 100;
      return e;
    });
    run.room.enemies = enemies;
    player.startSpin();
    while (player.isSlashing()) {
      run.resolveSlash();
      player.update();
    }
    const damage = 2 * player.getMeleeWeapon().spin.damageMultiplier;
    for (const e of enemies) {
      expect(e.health).toBeCloseTo(100 - damage);
    }
    expect(player.slashHits.length).toBe(4);
  });

  it("spins when the attack key is held after the swing and let go at a full charge", function () {
    const dungeon = generateDungeon({ seed: 3, roomCount: 8, screenX: 320, screenY: 160 });
    const run = new Run(dungeon, "Fire", PLAYER_MODEL_NAMES[0], makeAppearance());
    run.room.enemies = [];
    run.player.switchWeapon();
    const input = (fire) => run.update({ move: new p5.Vector(0, 0), fire });
    const sword = run.player.getMeleeWeapon();
    input(new p5.Vector(1, 0));
    for (let i = 0; i < 200 && run.player.swordCharge < sword.spin.chargeFrames; i++) {
      input(new p5.Vector(1, 0));
    }
    expect(run.player.swordCharge).toBe(sword.spin.chargeFrames);
    input(new p5.Vector(0, 0));
    expect(run.player.isSpinning()).toBe(true);
  });
});

describe("Running into enemies with the sword out", function () {
  let player;
  let sword;
  const right = () => new p5.Vector(1, 0);

  // Plays frames until the swing reaches the given phase.
  const advanceTo = (phase) => {
    while (player.getSlashPhase() !== phase) {
      player.update();
    }
  };

  beforeEach(function () {
    player = new Player(100, 100, "Fire");
    player.switchWeapon();
    player.facing = "right";
    sword = player.getMeleeWeapon();
    player.vel.set(1, 0); // walking
  });

  it("gives the default sword a ram", function () {
    expect(sword.ram).not.toBeNull();
    expect(sword.ram.cooldown).toBeGreaterThan(0);
  });

  it("is not outstretched when idle or during the turn before a swing", function () {
    expect(player.isSwordOutstretched()).toBe(false);
    player.startSlash();
    expect(player.getSlashPhase()).toBe("windup");
    expect(player.isSwordOutstretched()).toBe(false);
  });

  it("is outstretched for the active part and the recover of a swing", function () {
    player.startSlash();
    advanceTo("active");
    expect(player.isSwordOutstretched()).toBe(true);
    advanceTo("recover");
    expect(player.isSwordOutstretched()).toBe(true);
  });

  it("is outstretched during a spin and while a spin charges", function () {
    player.startSpin();
    expect(player.isSwordOutstretched()).toBe(true);
    const charger = new Player(0, 0, "Fire");
    charger.switchWeapon();
    charger.swordCharge = 5;
    expect(charger.isSwordOutstretched()).toBe(true);
  });

  it("has no ram area when the sword is not out, the player is not moving, or the sword cannot ram", function () {
    expect(player.getRamHitbox()).toBeNull();
    player.startSlash();
    advanceTo("active");
    player.vel.set(0, 0);
    expect(player.getRamHitbox()).toBeNull();
    player.vel.set(1, 0);
    expect(player.getRamHitbox()).not.toBeNull();
    sword.ram = null;
    expect(player.getRamHitbox()).toBeNull();
    expect(player.getRamDamage()).toBe(0);
  });

  it("puts the ram area in front of the player for every facing", function () {
    for (const facing of Object.keys(FACING_ANGLE)) {
      const p = new Player(100, 100, "Fire");
      p.switchWeapon();
      p.facing = facing;
      p.startSpin(); // out from the first frame
      p.facing = facing;
      p.vel.set(1, 1);
      const hitbox = p.getRamHitbox();
      const b = p.getBounds();
      const { reach, thickness } = p.getMeleeWeapon().ram;
      const checks = {
        right: hitbox.x === b.x + b.w && hitbox.w === reach && hitbox.h === thickness,
        left: hitbox.x + hitbox.w === b.x && hitbox.w === reach && hitbox.h === thickness,
        down: hitbox.y === b.y + b.h && hitbox.h === reach && hitbox.w === thickness,
        up: hitbox.y + hitbox.h === b.y && hitbox.h === reach && hitbox.w === thickness
      };
      expect(checks[facing]).toBe(true, facing);
    }
  });

  it("hurts for a fraction of a normal sword hit", function () {
    expect(player.getRamDamage()).toBeCloseTo(player.getSlashDamage() * sword.ram.damageMultiplier);
  });

  it("shoves the player with no damage", function () {
    const health = player.health;
    player.shove(new p5.Vector(-1, 0));
    expect(player.isKnockedBack()).toBe(true);
    expect(player.knockback.x).toBeLessThan(0);
    expect(player.health).toBe(health);
  });

  it("ignores a zero shove, and a shove while dead", function () {
    player.shove(new p5.Vector(0, 0));
    expect(player.isKnockedBack()).toBe(false);
    const dead = new Player(0, 0, "Fire");
    dead.takeDamage(999);
    dead.shove(new p5.Vector(1, 0));
    expect(dead.isKnockedBack()).toBe(false);
  });

  it("still shoves a player who is damaged", function () {
    player.takeDamage(1, new p5.Vector(1, 0));
    expect(player.isKnockedBack()).toBe(true);
  });

  describe("in a run", function () {
    let run;
    let enemy;

    beforeEach(function () {
      const dungeon = generateDungeon({ seed: 3, roomCount: 8, screenX: 320, screenY: 160 });
      run = new Run(dungeon, "Fire", PLAYER_MODEL_NAMES[0], makeAppearance());
      run.player.switchWeapon();
      run.player.facing = "right";
      enemy = createEnemy("Jelly", run.player.pos.x + PLAYER_LENGTH + 4, run.player.pos.y);
      enemy.health = 100;
      run.room.enemies = [enemy];
      run.player.startSlash();
      while (run.player.getSlashPhase() !== "recover") {
        run.player.update(); // out in front, past the part that hurts on its own
      }
      run.player.vel.set(1, 0);
    });

    it("hurts the enemy and shoves both of them apart", function () {
      const health = run.player.health;
      run.resolveRam();
      expect(enemy.health).toBeCloseTo(100 - run.player.getRamDamage());
      expect(enemy.knockbackTimer).toBeGreaterThan(0);
      expect(enemy.knockback.x).toBeGreaterThan(0); // away from the player
      expect(run.player.isKnockedBack()).toBe(true);
      expect(run.player.knockback.x).toBeLessThan(0); // the other way
      expect(run.player.health).toBe(health); // the sword protects the player
    });

    it("does not hit the same enemy again until the ram cooldown is over", function () {
      run.resolveRam();
      const health = enemy.health;
      run.player.vel.set(1, 0);
      run.resolveRam();
      expect(enemy.health).toBe(health);
      for (let i = 0; i < run.player.getMeleeWeapon().ram.cooldown; i++) {
        enemy.update(run.player, run.room);
      }
      expect(enemy.ramCooldown).toBe(0);
    });

    it("does nothing when the player stands still", function () {
      run.player.vel.set(0, 0);
      run.resolveRam();
      expect(enemy.health).toBe(100);
      expect(run.player.isKnockedBack()).toBe(false);
    });

    it("does nothing to an enemy that is not in front", function () {
      enemy.pos.set(run.player.pos.x - 60, run.player.pos.y);
      run.resolveRam();
      expect(enemy.health).toBe(100);
      expect(run.player.isKnockedBack()).toBe(false);
    });

    it("does not break a spin charge", function () {
      run.player.swordCharge = 10;
      run.resolveRam();
      expect(run.player.swordCharge).toBe(10);
    });

    it("leaves an enemy that is still spawning in alone", function () {
      enemy.spawnTimer = 30;
      run.resolveRam();
      expect(enemy.health).toBe(100);
      expect(run.player.isKnockedBack()).toBe(false);
    });
  });
});

describe("Staying turned the way the attack went", function () {
  let run;
  const input = (move, fire) => run.update({ move, fire });
  const up = () => new p5.Vector(0, -1);
  const right = () => new p5.Vector(1, 0);

  beforeEach(function () {
    const dungeon = generateDungeon({ seed: 3, roomCount: 8, screenX: 320, screenY: 160 });
    run = new Run(dungeon, "Fire", PLAYER_MODEL_NAMES[0], makeAppearance());
    run.room.enemies = [];
  });

  it("keeps the sword's way through the swing and into the spin charge while walking another way", function () {
    run.player.switchWeapon();
    input(up(), right()); // press right while walking up: swings right
    expect(run.player.facing).toBe("right");
    let charging = false;
    for (let i = 0; i < 120; i++) {
      input(up(), right());
      expect(run.player.facing).toBe("right", "frame " + i);
      charging = charging || run.player.swordCharge > 0;
    }
    expect(charging).toBe(true); // the test did get as far as the charge starting
  });

  it("keeps the wand's way through the shot and the charge while walking another way", function () {
    input(up(), right());
    const charge = run.player.getRangedWeapon().charge;
    let charging = false;
    for (let i = 0; i < charge.delay + charge.frames + 20; i++) {
      input(up(), right());
      expect(run.player.facing).toBe("right", "frame " + i);
      charging = charging || run.player.isCharging();
    }
    expect(charging).toBe(true);
  });

  it("turns with the walk again once the key is let go", function () {
    run.player.switchWeapon();
    input(up(), right());
    for (let i = 0; i < 60; i++) {
      input(up(), right());
    }
    input(up(), new p5.Vector(0, 0));
    for (let i = 0; i < 40; i++) {
      input(up(), new p5.Vector(0, 0)); // let the swing or spin finish
    }
    expect(run.player.facing).toBe("up");
  });
});
