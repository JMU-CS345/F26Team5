// A shared hitbox for melee swings, spins and effects. It remembers who it already hit, so
// each target is hurt at most once per hitbox. No p5 drawing calls.
//
// shape "rect": x, y, w, h.
// shape "arc": x, y is the origin, dir the way it points, reach how far, arc the width in
// degrees (360 hits all around).

class Hitbox {
  constructor(owner, options = {}) {
    this.owner = owner;
    this.shape = options.shape || "arc";
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.w = options.w || 0;
    this.h = options.h || 0;
    this.reach = options.reach || 0;
    this.arc = options.arc || 360;
    this.dir = options.dir || new p5.Vector(1, 0);
    this.damage = options.damage || 0;
    this.knockback = 1; // shove power, 1 is normal
    if (options.knockback !== undefined) {
      this.knockback = options.knockback;
    }
    this.life = options.life || 1; // frames it stays active
    this.alive = true;
    this.hitTargets = [];
  }

  // The middle of the hitbox, where shoves push away from.
  getOrigin() {
    if (this.shape === "rect") {
      return new p5.Vector(this.x + this.w / 2, this.y + this.h / 2);
    }
    return new p5.Vector(this.x, this.y);
  }

  overlaps(target) {
    const bounds = target.getBounds();
    if (this.shape === "rect") {
      return rectsOverlap({ x: this.x, y: this.y, w: this.w, h: this.h }, bounds);
    }
    const toTarget = new p5.Vector(
      bounds.x + bounds.w / 2 - this.x,
      bounds.y + bounds.h / 2 - this.y
    );
    const targetRadius = Math.max(bounds.w, bounds.h) / 2;
    if (toTarget.mag() > this.reach + targetRadius) {
      return false;
    }
    if (this.arc >= 360 || toTarget.magSq() === 0) {
      return true;
    }
    // Compare the angle to the target with the facing, so only the front is hit.
    const angle = p5.Vector.angleBetween(this.dir, toTarget);
    return Math.abs(angle) <= (this.arc / 2) * (Math.PI / 180);
  }

  canHit(target) {
    if (target === this.owner || this.hitTargets.includes(target)) {
      return false;
    }
    if (typeof target.isDead === "function" && target.isDead()) {
      return false;
    }
    if (typeof target.isSpawning === "function" && target.isSpawning()) {
      return false;
    }
    return true;
  }

  // Hurts every target it overlaps that it has not hit yet. Returns the new hits.
  resolve(targets) {
    const hits = [];
    if (!this.alive) {
      return hits;
    }
    for (const target of targets) {
      if (!this.canHit(target) || !this.overlaps(target)) {
        continue;
      }
      this.hitTargets.push(target);
      const bounds = target.getBounds();
      const push = new p5.Vector(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2)
        .sub(this.getOrigin());
      target.takeDamage(this.damage, push, this.knockback);
      hits.push({ target: target, damage: this.damage, push: push });
    }
    return hits;
  }

  // Call once per frame after resolving. The hitbox expires when its life runs out.
  update() {
    this.life--;
    if (this.life <= 0) {
      this.alive = false;
    }
  }
}
