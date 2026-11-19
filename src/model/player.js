// Player model. No p5 drawing calls, so Jasmine can test it without a canvas.

const PLAYER_LENGTH = 16;
const PLAYER_WIDTH = 16;
const FIRE_COOLDOWN = RANGED_DEFAULTS.fireRate; // default shots are slower than melee

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
    this.inventory = new PlayerInventory(BAG_CAPACITY);
    this.deathFrames = 0; // frames spent dead
    this.fireCooldown = 0; // frames until the player can fire again
    this.iFrames = 0; // frames left of invulnerability after a hit
    this.knockback = new p5.Vector(0, 0); // pixels per frame, shrinks as the shove fades
    this.knockbackTimer = 0;
    this.velocity = new p5.Vector(0, 0); // walking speed this frame, eased by move()
    this.lunge = new p5.Vector(0, 0); // forward distance a swing still has to cover

    // Dash state.
    this.dashFrames = 0; // frames of dash movement left
    this.dashIFrames = 0; // frames of dash invulnerability left
    this.dashCharges = DASH_CHARGES; // dashes ready to use
    this.dashRecharge = 0; // frames until the next charge is back
    this.dashSpacing = 0; // frames until another dash can start
    this.dashAge = 1000; // frames since the last dash began
    this.dodgedThisDash = false; // a dash refunds a charge only once
    this.dodgeSlow = 0; // frames enemies stay slow after a perfect dodge
    this.dodgeFlash = 0; // frames left of the dodge flash
    this.dashBuffer = 0; // frames left of a dash press waiting for the cooldown
    this.dashDir = new p5.Vector(0, 0);

    // Melee state. attack is the swing in progress, or null.
    this.attack = null;
    this.comboStep = 0; // the combo step of the last swing
    this.comboTimer = 0; // frames left to keep the combo going after a swing
    this.meleeBuffer = 0; // frames left of a melee press waiting for a swing to end
    this.meleePressed = false; // melee went down since the last update
    this.holdFrames = 0; // frames melee has been down
    this.spinDone = false; // this hold already spun, so wait for the key to come up
    this.aim = new p5.Vector(0, 1); // the way melee and Twin-stick shots point, starts facing
    this.lastHits = []; // melee hits made in the latest update, for the game feel code
    this.room = null; // the room of the latest update, for weapon hooks that look for enemies
    this.hookCounts = {}; // hits and shots made per weapon, for "every 3rd shot" hooks
    this.effectQueue = []; // weapon hook effects waiting for their delay: { frames, effect }

    // Animation state. The view reads these to pick a sprite frame.
    this.facing = "down"; // "down", "up", "left" or "right"
    this.walkFrames = 0; // frames spent walking, 0 when standing still
    this.holding = false; // a fire key is held
  }

  // Sets facing from a direction vector. On an exact diagonal, faces up/down.
  faceToward(dir) {
    if (Math.abs(dir.x) > Math.abs(dir.y)) {
      this.facing = "left";
      if (dir.x > 0) {
        this.facing = "right";
      }
    } else {
      this.facing = "up";
      if (dir.y > 0) {
        this.facing = "down";
      }
    }
  }

  // The weapon is raised while a fire key is held and for the cooldown after a shot.
  isArmUp() {
    return this.holding || this.fireCooldown > 0 || this.attack !== null;
  }

  // Remembers the aim. A zero vector leaves it where it was.
  setAim(dir) {
    if (dir.magSq() > 0) {
      this.aim = dir.copy().normalize();
    }
  }

  // A melee press. It waits in the buffer, so a press just before a swing ends still counts.
  bufferMelee() {
    if (!this.isDead()) {
      this.meleeBuffer = MELEE_BUFFER_FRAMES;
    }
  }

  // The melee key went down. A tap swings when it comes up, a hold spins (see updateMelee).
  pressMelee() {
    if (!this.isDead()) {
      this.meleePressed = true;
    }
  }

  // The swing can be cut short into the next one once its active frames are over.
  canStartSwing() {
    if (this.isDashing()) {
      return false;
    }
    return this.attack === null || this.attack.phase() === "recovery";
  }

  startSwing() {
    let step = 0;
    if (this.comboTimer > 0 || this.attack !== null) {
      step = (this.comboStep + 1) % COMBO_LENGTH;
    }
    const stats = getMeleeStats(this.inventory.getEquipped("melee"));
    const plan = makeSwingPlan(stats, step);
    if (this.dashAge <= DASH_STRIKE_FRAMES) {
      applyDashStrike(plan);
      this.dashAge = 1000; // one strike per dash
    }
    this.beginAttack(new MeleeAttack(this, stats, plan, this.aim));
    this.comboStep = step;
    this.meleeBuffer = 0;
  }

  startSpin() {
    const stats = getMeleeStats(this.inventory.getEquipped("melee"));
    this.beginAttack(new MeleeAttack(this, stats, makeSpinPlan(stats), this.aim));
    this.comboStep = 0;
    this.meleeBuffer = 0;
  }

  beginAttack(attack) {
    this.attack = attack;
    this.lunge = attack.dir.copy().setMag(attack.plan.lunge);
    this.faceToward(attack.dir);
    playCombatSfx("swing");
  }

  // Steps forward a share of the remaining lunge. A wall ends it early.
  updateLunge(room) {
    if (this.lunge.magSq() === 0 || !room) {
      return;
    }
    const step = p5.Vector.lerp(new p5.Vector(0, 0), this.lunge, LUNGE_EASE);
    const before = this.pos.copy();
    moveWithCollision(this, step.x, step.y, room);
    this.lunge.sub(step);
    if (this.lunge.mag() < LUNGE_STOP || this.pos.dist(before) < step.mag() * 0.5) {
      this.lunge.set(0, 0);
    }
  }

  // Share of the walking speed allowed in the current swing phase.
  getSpeedFactor() {
    if (this.attack === null) {
      return 1;
    }
    const phase = this.attack.phase();
    if (phase === "windup") {
      return SWING_SPEED_WINDUP;
    }
    if (phase === "active") {
      return SWING_SPEED_ACTIVE;
    }
    return SWING_SPEED_RECOVERY;
  }

  // Runs the swing, the buffer and the combo timer for one frame.
  updateMelee(room, meleeHeld) {
    const targets = [];
    if (room) {
      targets.push(...room.enemies);
    }
    if (this.attack !== null) {
      this.lastHits.push(...this.attack.update(targets));
      if (this.attack.isDone()) {
        this.attack = null;
        this.comboTimer = COMBO_RESET_FRAMES;
      }
    } else if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer === 0) {
        this.comboStep = 0;
      }
    }
    if (this.meleeBuffer > 0) {
      if (this.canStartSwing()) {
        this.startSwing();
      } else if (!this.isDashing()) {
        this.meleeBuffer--; // a press made during a dash waits for the dash to end
      }
    }
    this.updateLunge(room); // after the swing starts, so the first step is this frame
    // A tap swings when the key comes up. Holding long enough spins once instead.
    const down = meleeHeld || this.meleePressed;
    this.meleePressed = false;
    if (down) {
      this.holdFrames++;
      if (this.holdFrames >= SPIN_HOLD_FRAMES && !this.spinDone && this.canStartSwing()) {
        this.startSpin();
        this.spinDone = true;
      }
    } else {
      if (this.holdFrames > 0 && !this.spinDone) {
        this.bufferMelee();
      }
      this.holdFrames = 0;
      this.spinDone = false;
    }
  }

  // Fires the equipped projectile weapon (or the default shot). Returns the whole volley as
  // an array, empty when nothing was fired.
  fireAll(dir) {
    this.holding = !this.isDead() && dir.magSq() > 0;
    if (this.isDead() || this.fireCooldown > 0 || dir.magSq() === 0) {
      return []; // can't shoot yet, so don't turn either
    }
    const stats = getRangedStats(this.inventory.getEquipped("projectile"));
    this.faceToward(dir);
    this.cancelRecovery();
    this.fireCooldown = stats.fireRate;
    const element = stats.element || this.mageClass;
    let damage = this.getDamage(stats.damage, element);
    const isDefaultShot = stats.weapon === null;
    if (isDefaultShot) {
      damage = classMatchDamage(damage, element, this.mageClass); // elements bonus
    }
    const shots = [];
    for (let i = 0; i < stats.projectileCount; i++) {
      let offset = 0;
      if (stats.projectileCount > 1) {
        offset = stats.spread * (i / (stats.projectileCount - 1) - 0.5);
      }
      const shot = new Projectile(
        this.pos.x + this.length / 2,
        this.pos.y + this.width / 2,
        dir.copy().rotate(offset * Math.PI / 180),
        damage,
        stats.shotSpeed,
        { range: stats.range, pierce: stats.pierce, onHit: stats.onHit, weapon: stats.weapon,
          owner: this }
      );
      if (isDefaultShot) {
        shot.element = element; // only the default shot carries a status for now
        shot.classMatch = isClassMatch(element, this.mageClass);
      }
      shots.push(shot);
    }
    playCombatSfx("shoot");
    runWeaponHook(this, stats.onFire, "fire", {
      weapon: stats.weapon,
      angle: dir.heading(),
      damage: damage,
      enemies: this.nearbyEnemies()
    });
    return shots;
  }

  nearbyEnemies() {
    if (this.room === null) {
      return [];
    }
    return this.room.enemies;
  }

  // The next number for a hook counter ("hit" or "fire") of one weapon, starting at 1.
  countHook(kind, weaponId) {
    const name = kind + ":" + weaponId;
    this.hookCounts[name] = (this.hookCounts[name] || 0) + 1;
    return this.hookCounts[name];
  }

  queueEffects(effects) {
    for (const effect of effects) {
      this.effectQueue.push({ frames: effect.delayFrames || 0, effect: effect });
    }
  }

  // Counts the delays down one frame and returns the effects that are due now.
  takeDueEffects() {
    const due = [];
    const waiting = [];
    for (const queued of this.effectQueue) {
      if (queued.frames <= 0) {
        due.push(queued.effect);
      } else {
        queued.frames--;
        waiting.push(queued);
      }
    }
    this.effectQueue = waiting;
    return due;
  }

  // A shot ends the recovery of a swing early, so shooting out of a combo feels quick.
  cancelRecovery() {
    if (this.attack !== null && this.attack.phase() === "recovery") {
      this.attack = null;
      this.comboTimer = COMBO_RESET_FRAMES;
    }
  }

  // One shot, or null. Kept for simple callers, fireAll gives the whole volley.
  fire(dir) {
    const shots = this.fireAll(dir);
    if (shots.length === 0) {
      return null;
    }
    return shots[0];
  }

  // Damage for an attack of the given element, scaled by the matching stat.
  getDamage(baseDamage, element) {
    return scaleDamage(baseDamage, element, this.stats);
  }

  isDead() {
    return this.health <= 0;
  }

  isInvulnerable() {
    return this.iFrames > 0 || this.dashIFrames > 0;
  }

  isDashing() {
    return this.dashFrames > 0;
  }

  // A dash press. It waits in the buffer, so a press just before a charge is back works.
  bufferDash() {
    if (!this.isDead()) {
      this.dashBuffer = DASH_BUFFER_FRAMES;
    }
  }

  canDash() {
    return this.dashCharges > 0 && this.dashSpacing === 0 && !this.isDashing();
  }

  // Starts a dash toward moveDir (or the facing when standing still). It does nothing
  // against a wall, so you never waste a charge on a blocked dash.
  startDash(moveDir, room) {
    let dir = moveDir;
    if (dir.magSq() === 0) {
      dir = facingToVector(this.facing);
    }
    dir = dir.copy().normalize();
    const before = this.pos.copy();
    moveWithCollision(this, dir.x * DASH_SPEED, dir.y * DASH_SPEED, room);
    const moved = this.pos.dist(before) > 0;
    if (!moved) {
      this.dashBuffer = 0;
      return false;
    }
    this.dashDir = dir;
    this.dashFrames = DASH_FRAMES - 1; // this call was the first frame
    this.dashIFrames = DASH_IFRAMES;
    this.dashCharges--;
    if (this.dashRecharge === 0) {
      this.dashRecharge = DASH_RECHARGE_FRAMES;
    }
    this.dashSpacing = DASH_SPACING_FRAMES;
    this.dashAge = 0;
    this.dodgedThisDash = false;
    this.dashBuffer = 0;
    this.attack = null; // dashing cancels a swing, but a buffered press is kept
    playCombatSfx("dash");
    return true;
  }

  // Brings charges back, one every DASH_RECHARGE_FRAMES.
  rechargeDash() {
    if (this.dashCharges >= DASH_CHARGES) {
      return;
    }
    this.dashRecharge = Math.max(0, this.dashRecharge - 1);
    if (this.dashRecharge === 0) {
      this.dashCharges++;
      if (this.dashCharges < DASH_CHARGES) {
        this.dashRecharge = DASH_RECHARGE_FRAMES;
      }
    }
  }

  // Runs the dash timers and movement for one frame.
  updateDash(room, moveDir) {
    this.dashSpacing = Math.max(0, this.dashSpacing - 1);
    this.dashIFrames = Math.max(0, this.dashIFrames - 1);
    this.dashAge++;
    this.rechargeDash();
    if (this.dashFrames > 0 && room) {
      if (this.dashAge < DASH_STEER_FRAMES && moveDir.magSq() > 0) {
        this.dashDir = moveDir.copy().normalize(); // the first frames can still turn
      }
      moveWithCollision(this, this.dashDir.x * DASH_SPEED, this.dashDir.y * DASH_SPEED, room);
      this.dashFrames--;
    }
    if (this.dashBuffer > 0) {
      this.dashBuffer--;
      if (this.canDash() && room) {
        this.startDash(moveDir, room);
      }
    }
  }

  // A hit blocked early in the dash is a perfect dodge: enemies slow down and a charge
  // comes back. It only happens once per dash.
  checkPerfectDodge() {
    const elapsed = DASH_IFRAMES - this.dashIFrames;
    if (this.dodgedThisDash || elapsed >= PERFECT_DODGE_FRAMES) {
      return;
    }
    this.dodgedThisDash = true;
    this.dodgeSlow = DODGE_SLOW_FRAMES;
    this.dodgeFlash = DODGE_FLASH_FRAMES;
    this.dashCharges = Math.min(DASH_CHARGES, this.dashCharges + 1);
    if (this.dashCharges === DASH_CHARGES) {
      this.dashRecharge = 0;
    }
    playCombatSfx("perfect");
  }

  // How fast enemies run right now. 1 is normal, the sketch scales their update with it.
  getEnemyTimeScale() {
    if (this.dodgeSlow > 0) {
      return DODGE_ENEMY_SPEED;
    }
    return 1;
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
    if (this.isDead() || amount <= 0) {
      return false; // a negative hit must never heal
    }
    if (this.dashIFrames > 0 && this.iFrames === 0) {
      this.checkPerfectDodge();
    }
    if (this.isInvulnerable()) {
      return false;
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

  // Call once per frame. Counts the timers down. Pass the room so a shove can move us and
  // swings can find enemies. input.meleeHeld is true while the melee key is down.
  update(room, input = {}) {
    this.lastHits = [];
    this.room = room || null;
    if (this.isDead()) {
      this.deathFrames = Math.min(this.deathFrames + 1, DEATH_FRAMES);
      this.attack = null;
    } else {
      this.updateDash(room, input.move || new p5.Vector(0, 0));
      this.updateMelee(room, input.meleeHeld === true);
    }
    if (this.lastHits.length > 0) {
      playCombatSfx("hit");
    }
    if (this.fireCooldown > 0) {
      this.fireCooldown--;
    }
    if (this.iFrames > 0) {
      this.iFrames--;
    }
    this.dodgeSlow = Math.max(0, this.dodgeSlow - 1);
    this.dodgeFlash = Math.max(0, this.dodgeFlash - 1);
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

  // lockFacing keeps the facing while walking (Classic strafe). Speed eases toward the
  // held direction, so starting and stopping take a few frames.
  move(dir, room, lockFacing = false) {
    if (this.isDead() || this.knockbackTimer > 0 || this.isDashing()) {
      this.velocity.set(0, 0);
      this.walkFrames = 0;
      return;
    }
    let target = new p5.Vector(0, 0);
    let rate = MOVE_BRAKE;
    if (dir.magSq() > 0) {
      target = dir.copy().setMag(this.speed * this.getSpeedFactor());
      rate = MOVE_ACCEL;
      if (!this.isArmUp() && !lockFacing) {
        this.faceToward(dir); // keep the shot direction while the arm is up
      }
    }
    this.velocity = p5.Vector.lerp(this.velocity, target, rate);
    if (this.velocity.mag() < MOVE_STOP_SPEED) {
      this.velocity.set(0, 0);
      this.walkFrames = 0;
      return;
    }
    this.walkFrames++;
    moveWithCollision(this, this.velocity.x, this.velocity.y, room);
  }

  getBounds() {
    return { x: this.pos.x, y: this.pos.y, w: this.length, h: this.width };
  }

  getCenter() {
    return new p5.Vector(this.pos.x + this.length / 2, this.pos.y + this.width / 2);
  }
}
