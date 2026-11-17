// Melee swings. A swing has windup, active and recovery frames. The hitbox only exists
// during the active frames. No p5 drawing calls, so Jasmine can test it without a canvas.

// Works out the numbers for one swing of the combo. step is 0, 1 or 2 (2 is the finisher).
function makeSwingPlan(stats, step) {
  const finisher = step === COMBO_LENGTH - 1;
  let total = stats.swingFrames;
  const plan = {
    kind: "swing",
    step: step,
    damage: stats.damage,
    reach: stats.reach,
    arc: stats.arc,
    knockback: 1, // shove power, 1 is normal
    windup: Math.max(1, Math.round(total * 0.25)),
    active: Math.max(1, Math.round(total * 0.35))
  };
  if (finisher) {
    total += FINISHER_EXTRA_FRAMES;
    plan.damage *= FINISHER_DAMAGE;
    plan.reach *= FINISHER_REACH;
    plan.knockback = FINISHER_KNOCKBACK;
  }
  plan.knockback *= stats.knockback / MELEE_DEFAULTS.knockback;
  plan.total = Math.max(total, plan.windup + plan.active + 1);
  return plan;
}

// The charged spin: all the way around, a little stronger and wider.
function makeSpinPlan(stats) {
  return {
    kind: "spin",
    step: 0,
    damage: stats.damage * SPIN_DAMAGE,
    reach: stats.reach * SPIN_REACH,
    arc: 360,
    knockback: SPIN_KNOCKBACK * stats.knockback / MELEE_DEFAULTS.knockback,
    windup: SPIN_WINDUP,
    active: SPIN_ACTIVE,
    total: SPIN_WINDUP + SPIN_ACTIVE + SPIN_RECOVERY
  };
}

class MeleeAttack {
  // owner is the Player, stats come from getMeleeStats, dir is a unit vector.
  constructor(owner, stats, plan, dir) {
    this.owner = owner;
    this.stats = stats;
    this.plan = plan;
    this.dir = dir.copy();
    this.frame = 0;
    this.hitbox = null;
  }

  get kind() {
    return this.plan.kind;
  }

  get step() {
    return this.plan.step;
  }

  // "windup", "active", "recovery" or "done".
  phase() {
    if (this.frame < this.plan.windup) {
      return "windup";
    }
    if (this.frame < this.plan.windup + this.plan.active) {
      return "active";
    }
    if (this.frame < this.plan.total) {
      return "recovery";
    }
    return "done";
  }

  isDone() {
    return this.phase() === "done";
  }

  // 0 at the start of the active frames, 1 at the end. The view sweeps the arc with it.
  getSweep() {
    const into = this.frame - this.plan.windup;
    return Math.min(1, Math.max(0, into / this.plan.active));
  }

  // Advances one frame. Returns the hits made this frame, [{ target, damage, push }].
  update(targets) {
    let hits = [];
    if (this.phase() === "active") {
      if (this.hitbox === null) {
        this.hitbox = this.makeHitbox();
      }
      const center = this.owner.getCenter();
      this.hitbox.x = center.x;
      this.hitbox.y = center.y;
      hits = this.hitbox.resolve(targets);
      this.hitbox.update();
      this.callHooks(hits);
    }
    this.frame++;
    return hits;
  }

  makeHitbox() {
    const center = this.owner.getCenter();
    const element = this.stats.element || this.owner.mageClass;
    return new Hitbox(this.owner, {
      shape: "arc",
      x: center.x,
      y: center.y,
      dir: this.dir,
      reach: this.plan.reach,
      arc: this.plan.arc,
      damage: this.owner.getDamage(this.plan.damage, element),
      knockback: this.plan.knockback,
      life: this.plan.active
    });
  }

  callHooks(hits) {
    if (typeof this.stats.onHit !== "function") {
      return;
    }
    for (const hit of hits) {
      this.stats.onHit({
        player: this.owner,
        target: hit.target,
        damage: hit.damage,
        weapon: this.stats.weapon,
        step: this.plan.step
      });
    }
  }
}
