// HUD math: which hearts to show and where HUD pieces sit. Pure, no drawing.
// One heart is 1 health, so half a heart is 0.5 health.
const HUD = Object.freeze({
  scale: 2, // art pixels to screen pixels, same as the world
  heartSize: 32,
  heartStep: 34,
  heartsPerRow: 5,
  boxSize: 48,
  boxGap: 8,
  left: 20,
  top: 20,
  heartsX: 144
});

// "full", "half" or "empty" for each heart. maxHealth sets how many hearts there are.
function heartsForHealth(health, maxHealth) {
  const count = Math.max(0, Math.ceil(maxHealth));
  const hearts = [];
  for (let i = 0; i < count; i++) {
    const left = health - i; // how much health lands on this heart
    if (left >= 1) {
      hearts.push("full");
    } else if (left >= 0.5) {
      hearts.push("half");
    } else {
      hearts.push("empty");
    }
  }
  return hearts;
}

// Top left corner of each heart, wrapping to a new row every HUD.heartsPerRow hearts.
function heartPositions(count) {
  const spots = [];
  for (let i = 0; i < count; i++) {
    spots.push({
      x: HUD.heartsX + (i % HUD.heartsPerRow) * HUD.heartStep,
      y: HUD.top + Math.floor(i / HUD.heartsPerRow) * HUD.heartStep
    });
  }
  return spots;
}

// The melee box then the ranged box, side by side at the top left.
function weaponBoxRects() {
  return [
    { slot: "melee", x: HUD.left, y: HUD.top, w: HUD.boxSize, h: HUD.boxSize },
    {
      slot: "projectile",
      x: HUD.left + HUD.boxSize + HUD.boxGap,
      y: HUD.top,
      w: HUD.boxSize,
      h: HUD.boxSize
    }
  ];
}

// Where the coin icon goes, under the last row of hearts.
function goldHudPosition(heartCount) {
  const rows = Math.max(1, Math.ceil(heartCount / HUD.heartsPerRow));
  return { x: HUD.heartsX, y: HUD.top + rows * HUD.heartStep + 4 };
}
