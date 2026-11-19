// Status effects on enemies. No p5 drawing calls, so Jasmine can test it without a canvas.
// Each enemy keeps its timers in enemy.status (see the Enemy constructor).

const STATUS_BURN_FRAMES = 90; // Fire: damage over time (3 ticks, 0.75 total)
const STATUS_BURN_INTERVAL = 30; // frames between burn ticks
const STATUS_BURN_DAMAGE = 0.25; // damage per burn tick
const STATUS_SLOW_FRAMES = 70; // Ice: movement slow
const STATUS_SLOW_SPEED = 0.6; // speed multiplier while slowed
const STATUS_BOSS_SLOW_SPEED = 0.85; // bosses get a lighter slow
const STATUS_STUN_FRAMES = 24; // Mind: brief freeze, bosses are immune
const STATUS_PROC_CHANCE = 0.4; // chance a default shot applies its element at all
// After an effect ends, the same effect cannot restart for a while, so no lock-down.
const STATUS_BURN_IMMUNE_FRAMES = 60;
const STATUS_SLOW_IMMUNE_FRAMES = 60;
const STATUS_STUN_IMMUNE_FRAMES = 90;

// Each effect has one slot. Hitting again resets its timer, so effects never stack.

// Starting status for a new enemy. Every timer counts down in frames.
function createStatus() {
  return {
    burn: 0, burnTick: 0, burnImmune: 0,
    slow: 0, slowImmune: 0,
    stun: 0, stunImmune: 0
  };
}

// Starts or refreshes the status for an element. classMatch lengthens the duration.
function applyStatusEffect(enemy, element, classMatch = false) {
  let mult = 1;
  if (classMatch) {
    mult = CLASS_MATCH_DURATION_MULT;
  }
  const status = enemy.status;
  if (element === "Fire") {
    if (status.burnImmune > 0) {
      return;
    }
    if (status.burn <= 0) {
      status.burnTick = STATUS_BURN_INTERVAL;
    }
    status.burn = STATUS_BURN_FRAMES * mult;
  } else if (element === "Ice") {
    if (status.slowImmune > 0) {
      return;
    }
    status.slow = STATUS_SLOW_FRAMES * mult;
  } else if (element === "Mind" && !enemy.type.boss) {
    if (status.stunImmune > 0) {
      return;
    }
    status.stun = STATUS_STUN_FRAMES * mult;
  }
}

// Counts the timers down once per frame and deals burn damage on each tick.
// An effect that ends starts its immunity counter, which runs down on later frames.
function tickStatusEffects(enemy) {
  const status = enemy.status;
  if (status.burnImmune > 0) {
    status.burnImmune--;
  }
  if (status.slowImmune > 0) {
    status.slowImmune--;
  }
  if (status.stunImmune > 0) {
    status.stunImmune--;
  }
  if (status.burn > 0) {
    status.burn--;
    status.burnTick--;
    if (status.burnTick <= 0) {
      enemy.takeDamage(STATUS_BURN_DAMAGE, null, 1, false);
      status.burnTick = STATUS_BURN_INTERVAL;
    }
    if (status.burn <= 0) {
      status.burnImmune = STATUS_BURN_IMMUNE_FRAMES;
    }
  }
  if (status.slow > 0) {
    status.slow--;
    if (status.slow <= 0) {
      status.slowImmune = STATUS_SLOW_IMMUNE_FRAMES;
    }
  }
  if (status.stun > 0) {
    status.stun--;
    if (status.stun <= 0) {
      status.stunImmune = STATUS_STUN_IMMUNE_FRAMES;
    }
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
