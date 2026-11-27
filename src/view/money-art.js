// Money sprites. Money.png holds one row per kind, with the frames of its spin or sparkle side by
// side. Reads the model, never changes it. The pickup rules and values are in model/money.js.

const MONEY_SHEET_PATH = "assets/item/money.png";

// Where each kind sits on the sheet. y is the row's top, w and h the size of one frame (the same as
// the kind's size in MONEY_TYPES), frames how many are in the row, sequence the order they play in
// (indices into the row), ticks how many game frames each one shows, and color the square drawn if
// the sheet is missing.
const MONEY_ART = Object.freeze({
  coin: { y: 0, w: 8, h: 8, frames: 4, sequence: [0, 1, 2, 3, 2, 1], ticks: 8, color: [245, 195, 45] },
  ingot: { y: 8, w: 16, h: 8, frames: 4, sequence: [0, 1, 2, 3, 2, 1], ticks: 12, color: [245, 170, 30] },
  blueGem: { y: 16, w: 16, h: 16, frames: 3, sequence: [1, 0, 1, 2], ticks: 14, color: [40, 70, 230] },
  redGem: { y: 32, w: 16, h: 16, frames: 3, sequence: [1, 0, 1, 2], ticks: 14, color: [170, 20, 40] },
  greenGem: { y: 48, w: 16, h: 16, frames: 3, sequence: [1, 0, 1, 2], ticks: 14, color: [30, 180, 40] }
});

const moneySprites = {}; // money id -> list of frame images

// Call once in setup(), with await. Cuts the sheet into frames.
async function loadMoneySprites() {
  const sheet = await loadImageFile(MONEY_SHEET_PATH);
  for (const id of Object.keys(MONEY_ART)) {
    const art = MONEY_ART[id];
    moneySprites[id] = [];
    for (let i = 0; i < art.frames; i++) {
      moneySprites[id].push(sheet.get(i * art.w, art.y, art.w, art.h));
    }
  }
}

// Which frame of a row shows at a given age (in game frames). Money keeps animating after it lands.
function moneyFrameIndex(art, age) {
  return art.sequence[Math.floor(age / art.ticks) % art.sequence.length];
}

// The picture that stands for gold in the inventory: a coin.
function goldIconImage() {
  return moneySprites.coin ? moneySprites.coin[0] : null;
}

// Draws a money drop at its own size, with a shadow on the floor. While it is falling it is drawn
// z pixels up; once landed it lies on the floor. It animates the whole time. The animation starts at a different point for
// each drop, so a pile does not turn in step.
function drawMoneyDrop(drop) {
  const art = MONEY_ART[drop.money.id];
  const frames = moneySprites[drop.money.id];
  const x = Math.round(drop.x);
  const y = Math.round(drop.y - drop.z);
  noStroke();
  fill(0, 0, 0, 80);
  rect(x + 1, Math.round(drop.y) + drop.money.h - 1, drop.money.w - 2, 2);
  if (!frames) {
    fill(...art.color);
    rect(x, y, drop.money.w, drop.money.h);
    return;
  }
  const phase = Math.floor(Math.abs(drop.x * 7 + drop.y * 3));
  image(frames[moneyFrameIndex(art, drop.age + phase)], x, y);
}
