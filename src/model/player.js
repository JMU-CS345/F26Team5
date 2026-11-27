// Player model. No p5 drawing calls, so Jasmine can test it without a canvas.

const PLAYER_LENGTH = 16;
const PLAYER_WIDTH = 16;
const FIRE_COOLDOWN = 15; // frames between shots
const DEATH_FRAMES = 48; // death animation length (0.8 s at 60 fps)
const PLAYER_KNOCKBACK_SPEED = 3.5; // pixels per frame at the start of a shove
const PLAYER_KNOCKBACK_FRAMES = 8; // the player cannot steer for this long after a hit
const PLAYER_KNOCKBACK_DECAY = 0.8; // the shove keeps this much of its speed each frame
const PLAYER_FALL_FRAMES = 40; // how long the fall into a pit lasts before the respawn
const PIT_FALL_DAMAGE = 1; // health lost by falling into a pit

class Player {
  // mageClass is "Fire", "Ice" or "Mind". It picks the starting stats (see player-stats.js).
  // appearance is the look from the customization screen (see appearance.js). Cosmetic only.
  constructor(x, y, mageClass = null, modelName = "Tall", appearance = DEFAULT_APPEARANCE) {
    this.pos = new p5.Vector(x, y);
    this.mageClass = mageClass;
    this.modelName = modelName;
    this.appearance = makeAppearance(appearance);
    this.length = PLAYER_LENGTH;
    this.width = PLAYER_WIDTH;
    this.stats = getStatsForClass(mageClass);
    this.speed = this.stats.speed;
    this.maxHealth = this.stats.health;
    this.health = this.maxHealth;
    this.inventory = new PlayerInventory();
    giveStartingWeapons(this.inventory, mageClass);
    this.deathFrames = 0; // frames spent dead
    this.fireCooldown = 0; // frames until the player can fire again
    this.vel = new p5.Vector(0, 0); // pixels moved by the last walk step, for enemies that lead shots
    this.knockback = new p5.Vector(0, 0); // pixels per frame, shrinks as the shove fades
    this.knockbackTimer = 0; // frames of shove left
    this.fallFrames = 0; // frames spent falling into a pit, 0 when not falling

    // Animation state. The view reads these to pick a sprite frame.
    this.facing = "down"; // "down", "up", "left" or "right"
    this.walkFrames = 0; // frames spent walking, 0 when standing still
    this.holding = false; // a fire key is held
    this.chargeFrames = 0; // frames of charge built up (only once the key has been held a while), 0 when not charging
    this.holdFrames = 0; // frames the fire key has been held since the shot it started
    this.shotLatch = false; // true once this key press has shot, until the key is let go
    this.chargeDir = null; // the way the player was last aiming while charging
    this.activeSlot = "projectile"; // the weapon that is out: "projectile" or "melee". Q swaps.
    this.slashFrames = 0; // which frame of a sword swing it is (1 and up), 0 when not swinging
    this.slashHits = []; // enemies this swing already hit, so one swing hurts each only once
    this.slashKind = "slash"; // "slash" or "spin": which attack slashFrames is counting
    this.spinStart = "down"; // the way the player faced when a spin began
    this.swordCharge = 0; // frames the attack key has been held after a swing, charging the spin
    this.swordLatch = false; // true once this key press has swung the sword, until it is let go
  }

  // The equipped sword (or other melee weapon) and ranged weapon, or null.
  getMeleeWeapon() {
    const slot = this.inventory.equipment.melee;
    return slot === null ? null : slot.item;
  }

  getRangedWeapon() {
    const slot = this.inventory.equipment.projectile;
    return slot === null ? null : slot.item;
  }

  // True when the melee weapon is the one out (and the player actually has one).
  isMeleeActive() {
    return this.activeSlot === "melee" && this.getMeleeWeapon() !== null;
  }

  // The weapon that is out, or null when the player has none.
  getActiveWeapon() {
    return this.isMeleeActive() ? this.getMeleeWeapon() : this.getRangedWeapon();
  }

  // Swaps between the melee weapon and the projectile weapon. Does nothing (and returns false)
  // unless both are equipped, or in the middle of a sword swing, dead or falling.
  switchWeapon() {
    if (this.getMeleeWeapon() === null || this.getRangedWeapon() === null
        || this.isSlashing() || this.isDead() || this.isFalling()) {
      return false;
    }
    this.activeSlot = this.isMeleeActive() ? "projectile" : "melee";
    this.holding = false;
    this.cancelCharge();
    this.swordCharge = 0;
    return true;
  }

  isCharging() {
    return this.chargeFrames > 0 || this.swordCharge > 0;
  }

  // How charged the shot (or the sword's spin) is, from 0 to 1.
  getChargeRatio() {
    if (this.swordCharge > 0) {
      return Math.min(1, this.swordCharge / this.getMeleeWeapon().spin.chargeFrames);
    }
    const weapon = this.getRangedWeapon();
    if (weapon === null || weapon.charge === null || this.chargeFrames === 0) {
      return 0;
    }
    return Math.min(1, this.chargeFrames / weapon.charge.frames);
  }

  // The unit vector of the way the player faces.
  facingVector() {
    const vectors = { down: [0, 1], up: [0, -1], right: [1, 0], left: [-1, 0] };
    const v = vectors[this.facing];
    return new p5.Vector(v[0], v[1]);
  }

  isSlashing() {
    return this.slashFrames > 0;
  }

  // Starts a sword swing the way the player faces. Returns false (and does nothing) when there is
  // no sword, or the player is already swinging, dead or falling.
  startSlash() {
    const sword = this.getMeleeWeapon();
    if (sword === null || sword.swing === null || this.isSlashing()
        || this.isDead() || this.isFalling()) {
      return false;
    }
    this.slashFrames = 1;
    this.slashKind = "slash";
    this.slashHits = [];
    return true;
  }

  // Starts a spin attack from the way the player faces now. Returns false when there is no sword
  // that can spin, or the player is already swinging, dead or falling.
  startSpin() {
    const sword = this.getMeleeWeapon();
    if (sword === null || sword.spin === null || this.isSlashing()
        || this.isDead() || this.isFalling()) {
      return false;
    }
    this.slashFrames = 1;
    this.slashKind = "spin";
    this.spinStart = this.facing;
    this.facing = this.getSpinFacing(); // the very first frame already faces the next way round
    this.slashHits = [];
    return true;
  }

  isSpinning() {
    return this.isSlashing() && this.slashKind === "spin";
  }

  // The way the player faces on a frame of a spin. It turns counterclockwise (see SPIN_ORDER) a
  // quarter turn every framesPerDirection frames and starts with the next way round from where
  // the spin began, not the way it was already facing. Facing right, it goes up, left, down, then
  // right again at the end. For the recover it is back where it began.
  getSpinFacing() {
    const spin = this.getMeleeWeapon().spin;
    const turns = Math.floor((this.slashFrames - 1) / spin.framesPerDirection);
    if (turns > 3) {
      return this.spinStart;
    }
    return SPIN_ORDER[(SPIN_ORDER.indexOf(this.spinStart) + 1 + turns) % 4];
  }

  // "windup" (the turn), "active" (the sword can hurt), "recover", or null when not swinging.
  getSlashPhase() {
    const sword = this.getMeleeWeapon();
    if (!this.isSlashing() || sword === null) {
      return null;
    }
    if (this.slashKind === "spin") {
      return this.slashFrames <= sword.spin.framesPerDirection * 4 ? "spin" : "recover";
    }
    const swing = sword.swing;
    if (this.slashFrames <= swing.windup) {
      return "windup";
    }
    if (this.slashFrames <= swing.windup + swing.reaches.length) {
      return "active";
    }
    return "recover";
  }

  // The area the sword hurts right now in front of the player, or null outside the active part
  // of a swing and the turning part of a spin.
  getSlashHitbox() {
    const phase = this.getSlashPhase();
    if (phase !== "active" && phase !== "spin") {
      return null;
    }
    const sword = this.getMeleeWeapon();
    const swing = phase === "spin" ? sword.spin : sword.swing;
    const frame = phase === "spin"
      ? (this.slashFrames - 1) % swing.framesPerDirection
      : this.slashFrames - swing.windup - 1;
    const reach = swing.reaches[frame];
    const c = this.getCenter();
    const half = swing.thickness / 2;
    switch (this.facing) {
      case "right": return { x: this.pos.x + this.length, y: c.y - half, w: reach, h: swing.thickness };
      case "left": return { x: this.pos.x - reach, y: c.y - half, w: reach, h: swing.thickness };
      case "up": return { x: c.x - half, y: this.pos.y - reach, w: swing.thickness, h: reach };
      default: return { x: c.x - half, y: this.pos.y + this.width, w: swing.thickness, h: reach };
    }
  }

  // Damage of a sword hit, scaled by the stat for the sword's element (a plain sword has none). A
  // spin hits harder.
  getSlashDamage() {
    const sword = this.getMeleeWeapon();
    if (sword === null) {
      return 0;
    }
    const damage = this.getDamage(sword.damage, sword.element);
    return this.isSpinning() ? damage * sword.spin.damageMultiplier : damage;
  }

  // Sets facing from a direction vector. On an exact diagonal, faces up/down.
  faceToward(dir) {
    if (Math.abs(dir.x) > Math.abs(dir.y)) {
      this.facing = dir.x > 0 ? "right" : "left";
    } else {
      this.facing = dir.y > 0 ? "down" : "up";
    }
  }

  // The weapon is raised while a fire key is held and for the cooldown after a shot.
  isArmUp() {
    return this.holding || this.fireCooldown > 0;
  }

  // Attacks toward dir with the weapon that is out. A melee weapon turns the player and starts a
  // swing, and returns null. A projectile weapon shoots a normal shot as soon as the key is pressed,
  // and only once per press, so there is no rapid fire. One with a charge also builds up if the key
  // is then held on, and shoots a second, charged shot when the key is let go with a full charge.
  fire(dir) {
    const aiming = dir.magSq() > 0;
    const latched = this.shotLatch; // did this key press already shoot?
    if (!aiming) {
      this.shotLatch = false;
    }
    if (this.isDead() || this.isFalling()) {
      this.holding = false;
      this.cancelCharge();
      this.swordCharge = 0;
      return null; // can't attack, so don't turn either
    }
    if (this.isMeleeActive()) {
      this.cancelCharge();
      this.useSword(dir, aiming);
      // The sword stays out, and the player cannot turn, from the swing until the key is let go. The
      // run moves the player before it reads the attack key, so this has to be true on the very
      // frame the swing ends, before the charge has started.
      this.holding = aiming && (this.swordLatch || this.swordCharge > 0);
      return null;
    }
    this.swordCharge = 0;
    this.swordLatch = false;
    this.holding = aiming;
    if (this.isSlashing()) {
      this.cancelCharge();
      return null;
    }
    const weapon = this.getRangedWeapon();
    if (weapon !== null && weapon.charge !== null) {
      return this.chargeShot(dir, weapon, latched);
    }
    if (!aiming || this.fireCooldown > 0) {
      return null; // can't shoot yet, so don't turn either
    }
    this.faceToward(dir);
    this.fireCooldown = weapon === null ? FIRE_COOLDOWN : weapon.cooldown;
    return this.makeShot(dir, weapon);
  }

  // One frame of the attack key with the sword out. Pressing swings the sword toward the key once.
  // Holding it on after the swing charges the spin, and letting go with a full charge spins. Holding
  // does not swing again: let go and press again for that.
  useSword(dir, aiming) {
    const sword = this.getMeleeWeapon();
    if (aiming) {
      if (!this.swordLatch) {
        if (!this.isSlashing()) {
          this.faceToward(dir);
        }
        if (this.startSlash()) {
          this.swordLatch = true;
        }
      } else if (!this.isSlashing() && sword.spin !== null) {
        // The player cannot turn while the spin charges: it starts from the way the swing went.
        this.swordCharge = Math.min(this.swordCharge + 1, sword.spin.chargeFrames);
      }
      return;
    }
    if (sword.spin !== null && this.swordCharge >= sword.spin.chargeFrames) {
      this.startSpin();
    }
    this.swordCharge = 0;
    this.swordLatch = false;
  }

  // One frame of a charge weapon. Pressing the key shoots a normal shot at once (once the cooldown
  // allows: a press during the cooldown waits for it). Holding the key on after that builds the
  // charge, but only after holding for charge.delay frames, so a tap never shows a bar. Letting go
  // with a full charge shoots the charged shot, with the weapon's effect. Letting go early shoots
  // nothing more.
  chargeShot(dir, weapon, latched) {
    const charge = weapon.charge;
    if (dir.magSq() > 0) {
      if (!latched) {
        if (this.fireCooldown === 0) {
          this.faceToward(dir);
          this.chargeDir = dir.copy(); // the charged shot goes this way, whatever is pressed later
          this.shotLatch = true;
          this.fireCooldown = weapon.cooldown;
          return this.makeShot(dir, weapon);
        }
        return null;
      }
      // Held on after the shot: the player cannot turn now, and the charge keeps the shot's way.
      this.holdFrames++;
      if (this.holdFrames > charge.delay) {
        this.chargeFrames = Math.min(this.chargeFrames + 1, charge.frames);
      }
      return null;
    }
    let shot = null;
    if (latched && this.chargeFrames >= charge.frames && this.fireCooldown === 0) {
      shot = this.makeShot(this.chargeDir, weapon);
      applyChargeEffect(shot, charge.effect);
      this.fireCooldown = weapon.cooldown;
    }
    this.cancelCharge();
    return shot;
  }

  // Throws away the charge built up so far.
  cancelCharge() {
    this.chargeFrames = 0;
    this.holdFrames = 0;
  }

  // A new shot from the player toward dir. The equipped ranged weapon decides its damage, speed,
  // element and picture. With none, the class shoots a plain bolt.
  makeShot(dir, weapon) {
    const shot = new Projectile(
      this.pos.x + this.length / 2,
      this.pos.y + this.width / 2,
      dir,
      weapon === null
        ? this.getDamage(PROJECTILE_DAMAGE, this.mageClass)
        : this.getDamage(weapon.damage, weapon.element),
      weapon === null ? PROJECTILE_SPEED : weapon.projectileSpeed
    );
    shot.element = weapon === null ? this.mageClass : weapon.element;
    shot.art = weapon === null ? null : weapon.art;
    return shot;
  }

  // Damage for an attack of the given element, scaled by the matching stat.
  getDamage(baseDamage, element) {
    return scaleDamage(baseDamage, element, this.stats);
  }

  isDead() {
    return this.health <= 0;
  }

  // Enemies and hazards should call this instead of changing health directly.
  // fromDir is the direction the hit travels. Leave it out for damage with no shove.
  takeDamage(amount, fromDir) {
    this.health = Math.max(0, this.health - amount);
    if (amount > 0) {
      this.cancelCharge(); // a hit breaks the charge
      this.swordCharge = 0;
    }
    if (amount > 0) {
      this.shove(fromDir);
    }
  }

  // Pushes the player along fromDir (any length) with no damage, and takes the steering away until
  // the shove fades. Nothing happens for a zero direction or a dead player.
  shove(fromDir) {
    if (fromDir && fromDir.magSq() > 0 && !this.isDead()) {
      this.knockback = fromDir.copy().setMag(PLAYER_KNOCKBACK_SPEED);
      this.knockbackTimer = PLAYER_KNOCKBACK_FRAMES;
    }
  }

  // True while the sword is held out in front: from the first active frame of a swing or spin to
  // its end, and while a spin charges. Not during the turn before a swing.
  isSwordOutstretched() {
    const phase = this.getSlashPhase();
    return this.getMeleeWeapon() !== null && (
      phase === "active" || phase === "spin" || phase === "recover" || this.swordCharge > 0
    );
  }

  // The area of the outstretched sword that hurts an enemy the player walks into, or null when the
  // sword is not out, the sword cannot ram, or the player is not moving.
  getRamHitbox() {
    const sword = this.getMeleeWeapon();
    if (sword === null || sword.ram === null || !this.isSwordOutstretched()
        || this.vel.magSq() === 0 || this.isDead() || this.isFalling()) {
      return null;
    }
    const { reach, thickness } = sword.ram;
    const c = this.getCenter();
    const half = thickness / 2;
    switch (this.facing) {
      case "right": return { x: this.pos.x + this.length, y: c.y - half, w: reach, h: thickness };
      case "left": return { x: this.pos.x - reach, y: c.y - half, w: reach, h: thickness };
      case "up": return { x: c.x - half, y: this.pos.y - reach, w: thickness, h: reach };
      default: return { x: c.x - half, y: this.pos.y + this.width, w: thickness, h: reach };
    }
  }

  // Damage of walking into an enemy with the sword out: a fraction of a normal sword hit.
  getRamDamage() {
    const sword = this.getMeleeWeapon();
    if (sword === null || sword.ram === null) {
      return 0;
    }
    return this.getDamage(sword.damage, sword.element) * sword.ram.damageMultiplier;
  }

  isKnockedBack() {
    return this.knockbackTimer > 0;
  }

  isFalling() {
    return this.fallFrames > 0;
  }

  // Starts falling into a pit. It costs health. While falling the player cannot steer, shoot or be
  // hit. When it is over, hasFinishedFalling() is true and the game calls respawnAt.
  startFall() {
    if (this.isDead() || this.isFalling()) {
      return;
    }
    this.takeDamage(PIT_FALL_DAMAGE);
    this.fallFrames = 1;
    this.knockbackTimer = 0;
    this.slashFrames = 0;
    this.vel.set(0, 0);
    this.walkFrames = 0;
  }

  hasFinishedFalling() {
    return this.fallFrames >= PLAYER_FALL_FRAMES;
  }

  // Puts the player's center at (x, y) and ends the fall.
  respawnAt(x, y) {
    this.pos.set(x - this.length / 2, y - this.width / 2);
    this.fallFrames = 0;
    this.knockbackTimer = 0;
    this.vel.set(0, 0);
  }

  // Call once per frame. Counts the death animation and the fire cooldown, and slides the
  // player along a shove. Pass the room so the shove stops at walls.
  update(room) {
    if (this.isDead()) {
      this.deathFrames = Math.min(this.deathFrames + 1, DEATH_FRAMES);
      this.knockbackTimer = 0;
      this.slashFrames = 0;
    }
    if (this.fireCooldown > 0) {
      this.fireCooldown--;
    }
    if (this.slashFrames > 0) {
      const sword = this.getMeleeWeapon();
      let total = 0;
      if (sword !== null) {
        total = this.slashKind === "spin"
          ? sword.spin.framesPerDirection * 4 + sword.spin.recover
          : sword.swing.windup + sword.swing.reaches.length + sword.swing.recover;
      }
      this.slashFrames = this.slashFrames >= total ? 0 : this.slashFrames + 1;
      if (this.slashKind === "spin") {
        this.facing = this.slashFrames > 0 ? this.getSpinFacing() : this.spinStart; // turns as it spins
      }
    }
    if (this.isFalling()) {
      this.fallFrames = Math.min(this.fallFrames + 1, PLAYER_FALL_FRAMES);
      this.knockbackTimer = 0;
    }
    if (this.knockbackTimer > 0) {
      if (room) {
        moveWithCollision(this, this.knockback.x, this.knockback.y, room);
      }
      this.knockback.mult(PLAYER_KNOCKBACK_DECAY);
      this.knockbackTimer--;
    }
    // Whoever ends up with their middle over a pit falls in, however they got there.
    if (room && typeof room.isPitAt === "function" && !this.isDead() && !this.isFalling()) {
      const center = this.getCenter();
      if (room.isPitAt(center.x, center.y)) {
        this.startFall();
      }
    }
  }

  // The death screen shows after the animation finishes.
  showDeathScreen() {
    return this.deathFrames >= DEATH_FRAMES;
  }

  move(dir, room) {
    this.vel.set(0, 0);
    if (this.isDead() || this.isFalling() || this.isKnockedBack() || dir.magSq() === 0) {
      this.walkFrames = 0; // a shove takes the steering away until it fades
      return;
    }
    if (!this.isArmUp() && !this.isSlashing()) {
      this.faceToward(dir); // keep the shot or swing direction while the arm is up
    }
    this.walkFrames++;
    const step = dir.copy().setMag(this.speed);
    const startX = this.pos.x;
    const startY = this.pos.y;
    moveWithCollision(this, step.x, step.y, room);
    this.vel.set(this.pos.x - startX, this.pos.y - startY);
  }

  getBounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.length, h: this.width };
  }

  getCenter() {
    return new p5.Vector(this.pos.x + this.length / 2, this.pos.y + this.width / 2);
  }
}
