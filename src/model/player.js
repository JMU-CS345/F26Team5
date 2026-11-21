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

  fire(dir) {
    this.holding = !this.isDead() && dir.magSq() > 0;
    if (this.isDead() || this.isFalling() || this.fireCooldown > 0 || dir.magSq() === 0) {
      return null; // can't shoot yet, so don't turn either
    }
    this.faceToward(dir);
    this.fireCooldown = FIRE_COOLDOWN;
    return new Projectile(
      this.pos.x + this.length / 2,
      this.pos.y + this.width / 2,
      dir,
      this.getDamage(PROJECTILE_DAMAGE, this.mageClass)
    );
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
    if (amount > 0 && fromDir && fromDir.magSq() > 0 && !this.isDead()) {
      this.knockback = fromDir.copy().setMag(PLAYER_KNOCKBACK_SPEED);
      this.knockbackTimer = PLAYER_KNOCKBACK_FRAMES;
    }
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
    }
    if (this.fireCooldown > 0) {
      this.fireCooldown--;
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
    if (!this.isArmUp()) {
      this.faceToward(dir); // keep the shot direction while the arm is up
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
