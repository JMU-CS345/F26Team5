// Status effects on enemies. No p5 drawing calls, so Jasmine can test it without a canvas.
// Each enemy keeps its timers in enemy.status (see the Enemy constructor).

const STATUS_BURN_FRAMES = 120; // Fire: damage over time
const STATUS_BURN_INTERVAL = 30; // frames between burn ticks
const STATUS_BURN_DAMAGE = 0.25; // damage per burn tick
const STATUS_SLOW_FRAMES = 120; // Ice: movement slow
const STATUS_SLOW_SPEED = 0.5; // speed multiplier while slowed
const STATUS_BOSS_SLOW_SPEED = 0.75; // bosses get the slow at half strength
const STATUS_STUN_FRAMES = 45; // Mind: brief freeze, bosses are immune

// Each effect has one slot. Hitting again resets its timer, so effects never stack.

// Starting status for a new enemy. Every timer counts down in frames.
function createStatus() {
  return { burn: 0, burnTick: 0, slow: 0, stun: 0 };
}

// Starts or refreshes the status for an element. classMatch lengthens the duration.
function applyStatusEffect(enemy, element, classMatch = false) {
  let mult = 1;
  if (classMatch) {
    mult = CLASS_MATCH_DURATION_MULT;
  }
  const status = enemy.status;
  if (element === "Fire") {
    if (status.burn <= 0) {
      status.burnTick = STATUS_BURN_INTERVAL;
    }
    status.burn = STATUS_BURN_FRAMES * mult;
  } else if (element === "Ice") {
    status.slow = STATUS_SLOW_FRAMES * mult;
  } else if (element === "Mind" && !enemy.type.boss) {
    status.stun = STATUS_STUN_FRAMES * mult;
  }
}

// Counts the timers down once per frame and deals burn damage on each tick.
function tickStatusEffects(enemy) {
  const status = enemy.status;
  if (status.burn > 0) {
    status.burn--;
    status.burnTick--;
    if (status.burnTick <= 0) {
      enemy.takeDamage(STATUS_BURN_DAMAGE);
      status.burnTick = STATUS_BURN_INTERVAL;
    }
  }
  if (status.slow > 0) {
    status.slow--;
  }
  if (status.stun > 0) {
    status.stun--;
  }
}

// Movement multiplier from the slow effect. 1 when the enemy is not slowed.
function speedMultiplier(enemy) {
  if (enemy.status.slow <= 0) {
    return 1;
  }
  if (enemy.type.boss) {
    return STATUS_BOSS_SLOW_SPEED;
  }
  return STATUS_SLOW_SPEED;
}

function isStunned(enemy) {
  return enemy.status.stun > 0;
}

// The element to tint the enemy with, or null. Stun shows first, then burn, then slow.
function activeStatusElement(enemy) {
  const status = enemy.status;
  if (status.stun > 0) {
    return "Mind";
  }
  if (status.burn > 0) {
    return "Fire";
  }
  if (status.slow > 0) {
    return "Ice";
  }
  return null;
}
