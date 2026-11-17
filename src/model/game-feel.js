// Game feel state: hitstop, screen shake and floating damage numbers. This only counts
// frames and keeps a list, the views draw it. No p5 drawing calls.

class GameFeel {
  // settings comes from loadSettings(). Shake and numbers follow it.
  constructor(settings = loadSettings()) {
    this.settings = settings;
    this.hitstop = 0; // frames the game stays frozen
    this.shakeFrames = 0;
    this.shakeStrength = 0;
    this.numbers = []; // { x, y, text, age }
  }

  // Call when a run starts, so changes made in the settings menu apply.
  refreshSettings() {
    this.settings = loadSettings();
  }

  reset() {
    this.hitstop = 0;
    this.shakeFrames = 0;
    this.numbers = [];
  }

  // hit is { target, damage }. kind is "melee" or "ranged". Only melee freezes the game.
  onHit(hit, kind) {
    if (kind === "melee") {
      this.hitstop = Math.max(this.hitstop, HITSTOP_MELEE_FRAMES);
      this.startShake(SHAKE_MELEE);
    } else {
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

  startShake(strength) {
    if (!this.settings.screenShake) {
      return;
    }
    this.shakeFrames = SHAKE_FRAMES;
    this.shakeStrength = Math.max(this.shakeStrength, strength);
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
    return { x: (Math.random() * 2 - 1) * size, y: (Math.random() * 2 - 1) * size };
  }

  // Call once per frame that is not frozen.
  update() {
    if (this.shakeFrames > 0) {
      this.shakeFrames--;
      if (this.shakeFrames === 0) {
        this.shakeStrength = 0;
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
