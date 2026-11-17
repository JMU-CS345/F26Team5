// Player model. No p5 drawing calls, so Jasmine can test it without a canvas.

const PLAYER_LENGTH = 16;
const PLAYER_WIDTH = 16;
const FIRE_COOLDOWN = 30; // frames between default shots, slower than melee on purpose
const HIT_IFRAMES = 45; // invulnerable frames after being hurt
const MIN_HIT_DAMAGE = 0.5; // armor never cuts a hit below this
const PLAYER_KNOCKBACK_SPEED = 4; // pixels per frame at the start of a shove
const PLAYER_KNOCKBACK_FRAMES = 6;
const PLAYER_KNOCKBACK_DECAY = 0.8;
const DEATH_FRAMES = 48; // death animation length (0.8 s at 60 fps)

class Player {
  // mageClass is "Fire", "Ice" or "Mind". It picks the starting stats (see player-stats.js).
  constructor(x, y, mageClass = null, modelName = "Tall") {
    this.pos = new p5.Vector(x, y);
    this.mageClass = mageClass;
    this.modelName = modelName;
    this.length = PLAYER_LENGTH;
    this.width = PLAYER_WIDTH;
    this.stats = getStatsForClass(mageClass);
    this.speed = this.stats.speed;
    this.maxHealth = this.stats.health;
    this.health = this.maxHealth;
    this.inventory = new PlayerInventory();
    this.deathFrames = 0; // frames spent dead
    this.fireCooldown = 0; // frames until the player can fire again
    this.iFrames = 0; // frames left of invulnerability after a hit
    this.knockback = new p5.Vector(0, 0); // pixels per frame, shrinks as the shove fades
    this.knockbackTimer = 0;

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
    if (this.isDead() || this.fireCooldown > 0 || dir.magSq() === 0) {
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

  isInvulnerable() {
    return this.iFrames > 0;
  }

  // Total defense of the armor being worn.
  getDefense() {
    let total = 0;
    for (const slot of ["head", "body", "legs"]) {
      const armor = this.inventory.getEquipped(slot);
      if (armor) {
        total += armor.defense;
      }
    }
    return total;
  }

  // Enemies and hazards should call this instead of changing health directly.
  // fromDir is the way the hit travels, used for the shove. Returns true if damage landed.
  takeDamage(amount, fromDir) {
    if (this.isDead() || this.isInvulnerable() || amount <= 0) {
      return false; // a negative hit must never heal
    }
    const reduced = Math.max(MIN_HIT_DAMAGE, amount - this.getDefense());
    this.health = Math.max(0, this.health - Math.min(amount, reduced));
    this.iFrames = HIT_IFRAMES;
    if (fromDir && fromDir.magSq() > 0) {
      this.knockback = fromDir.copy().setMag(PLAYER_KNOCKBACK_SPEED);
      this.knockbackTimer = PLAYER_KNOCKBACK_FRAMES;
    }
    playCombatSfx("hurt");
    return true;
  }

  // Call once per frame. Counts the timers down. Pass the room so a shove can move us.
  update(room) {
    if (this.isDead()) {
      this.deathFrames = Math.min(this.deathFrames + 1, DEATH_FRAMES);
    }
    if (this.fireCooldown > 0) {
      this.fireCooldown--;
    }
    if (this.iFrames > 0) {
      this.iFrames--;
    }
    if (this.knockbackTimer > 0) {
      if (room) {
        moveWithCollision(this, this.knockback.x, this.knockback.y, room);
      }
      this.knockback.mult(PLAYER_KNOCKBACK_DECAY);
      this.knockbackTimer--;
    }
  }

  // The death screen shows after the animation finishes.
  showDeathScreen() {
    return this.deathFrames >= DEATH_FRAMES;
  }

  move(dir, room) {
    if (this.isDead() || dir.magSq() === 0 || this.knockbackTimer > 0) {
      this.walkFrames = 0;
      return;
    }
    if (!this.isArmUp()) {
      this.faceToward(dir); // keep the shot direction while the arm is up
    }
    this.walkFrames++;
    const step = dir.copy().setMag(this.speed);
    moveWithCollision(this, step.x, step.y, room);
  }

  getBounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.length, h: this.width };
  }

  getCenter() {
    return new p5.Vector(this.pos.x + this.length / 2, this.pos.y + this.width / 2);
  }
}
