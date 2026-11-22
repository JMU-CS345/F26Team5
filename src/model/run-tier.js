// Which dungeon of the run the player is in (1 to 3), and the stairs after a boss.
// No p5 drawing calls, so Jasmine can test it without a canvas.

const FINAL_TIER = 3;
const STAIRS_SIZE = 24; // pixels, the player's center must be inside half of this

class RunTier {
  constructor() {
    this.tier = 1;
  }

  // Call when a new run starts.
  start() {
    this.tier = 1;
  }

  // Goes on to the next dungeon. The tier stops at the final one.
  advance() {
    if (this.tier < FINAL_TIER) {
      this.tier++;
    }
    return this.tier;
  }

  isFinal() {
    return this.tier >= FINAL_TIER;
  }
}

// Extra loot depth for a dungeon number: 0 in the first dungeon.
function tierLootDepth(tier) {
  return (tier - 1) * TIER_DEPTH_STEP; // the one source, shared with LootRun.lootDepth
}

// The stairs sit in the middle of the room.
function makeStairs(room) {
  return { x: room.x + room.width / 2, y: room.y + room.height / 2 };
}

function playerOnStairs(stairs, player) {
  const center = player.getCenter();
  return Math.hypot(center.x - stairs.x, center.y - stairs.y) < STAIRS_SIZE / 2;
}
