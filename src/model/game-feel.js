// Game feel state: hitstop, screen shake and floating damage numbers. This only counts
// frames and keeps a list, the views draw it. No p5 drawing calls.

class GameFeel {
  // settings comes from loadSettings(). Shake and numbers follow it.
  constructor(settings = loadSettings()) {
    this.settings = settings;
    this.hitstop = 0; // frames the game stays frozen
    this.shakeFrames = 0;
    this.shakeStrength = 0;
    this.shakeDir = null; // unit vector for a directional shake, or null for a random one
    this.numbers = []; // { x, y, text, age }
  }

  // Call when a run starts, so changes made in the settings menu apply.
  refreshSettings() {
    this.settings = loadSettings();
  }

  reset() {
    this.hitstop = 0;
    this.shakeFrames = 0;
    this.shakeStrength = 0;
    this.shakeDir = null;
    this.numbers = [];
  }

  // hit is { target, damage }, and from a swing also { attack, finisher, dir }.
  // kind is "melee" or "ranged". Ranged hits do not freeze the game.
  onHit(hit, kind) {
    if (kind === "melee") {
      let freeze = HITSTOP_NORMAL_FRAMES;
      let shake = SHAKE_MELEE;
      if (hit.attack === "spin") {
        freeze = HITSTOP_SPIN_FRAMES;
      } else if (hit.finisher) {
        freeze = HITSTOP_FINISHER_FRAMES;
        shake = SHAKE_FINISHER;
      }
      this.hitstop = Math.max(this.hitstop, freeze);
      this.startShake(shake, hit.dir);
    } else {
      this.hitstop = Math.max(this.hitstop, HITSTOP_RANGED_FRAMES);
      this.startShake(SHAKE_RANGED);
    }
    if (this.settings.damageNumbers) {
      const bounds = hit.target.getBounds();
      this.numbers.push({
        x: bounds.x + bounds.w / 2,
        y: bounds.y,
        text: formatDamage(hit.damage),
        age: 0
      });
    }
  }

  onPlayerHurt() {
    this.startShake(SHAKE_HURT);
  }

  // dir (optional) shakes along that line instead of at random. The setting still rules.
  startShake(strength, dir = null) {
    if (!this.settings.screenShake) {
      return;
    }
    this.shakeFrames = SHAKE_FRAMES;
    if (strength >= this.shakeStrength) {
      this.shakeStrength = strength;
      this.shakeDir = null;
      if (dir && dir.magSq() > 0) {
        this.shakeDir = dir.copy().normalize();
      }
    }
  }

  // True on frames the game should stand still. Each call uses up one frozen frame.
  consumeHitstop() {
    if (this.hitstop > 0) {
      this.hitstop--;
      return true;
    }
    return false;
  }

  // How far to shift the picture this frame. It fades as the shake runs out.
  getShakeOffset() {
    if (this.shakeFrames <= 0) {
      return { x: 0, y: 0 };
    }
    const size = this.shakeStrength * (this.shakeFrames / SHAKE_FRAMES);
    if (this.shakeDir !== null) {
      const kick = size * Math.cos(this.shakeFrames * Math.PI); // flips sign each frame
      return { x: this.shakeDir.x * kick, y: this.shakeDir.y * kick };
    }
    return { x: (Math.random() * 2 - 1) * size, y: (Math.random() * 2 - 1) * size };
  }

  // Call once per frame that is not frozen.
  update() {
    if (this.shakeFrames > 0) {
      this.shakeFrames--;
      if (this.shakeFrames === 0) {
        this.shakeStrength = 0;
        this.shakeDir = null;
      }
    }
    for (const n of this.numbers) {
      n.age++;
    }
    this.numbers = this.numbers.filter((n) => n.age < NUMBER_FRAMES);
  }
}

// 2 shows as "2", 1.25 as "1.3".
function formatDamage(amount) {
  const rounded = Math.round(amount * 10) / 10;
  return String(rounded);
}
