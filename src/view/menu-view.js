// Drawing code for the playermodel and class screens, which are picked with the keyboard: A and D
// move the highlight and Enter or Space picks it (see menu-input.js). Reads the model, never changes
// it. The customization screen further down still uses p5 DOM controls, made in sketch.js.

let menuTint = MENU_TINT_WHITE.slice(); // the backdrop's colour right now, eased toward its target
let menuAccent = MENU_ACCENT.slice(); // the arrows, cards, dots and motes' colour right now, eased the same way

const MENU_CARD_GAP = 36;
const MENU_CARD_Y = 420; // center y of the cards
const MODEL_CARD = { w: 270, h: 340 };
const CLASS_CARD = { w: 300, h: 400 };
const MODEL_PREVIEW_SCALE = 6;

// What a full charge does for each wand, shown on the class cards.
const CHARGE_BLURB = {
  power: "Charge: a huge fireball",
  pierce: "Charge: a piercing spark",
  seek: "Charge: seeking rings"
};

// Center x of the ith of count cards that are cardW wide, centered on the canvas.
function menuSlotCenterX(i, count, cardW) {
  const total = count * cardW + (count - 1) * MENU_CARD_GAP;
  return CANVAS_WIDTH / 2 - total / 2 + i * (cardW + MENU_CARD_GAP) + cardW / 2;
}

// A translucent window over the game's background, with little motes drifting upward in the accent
// colour. It is white on the playermodel screen and washes into the colour of the class that is
// highlighted on the class screen, easing there a little each frame. The accent colour used by
// everything else on the screen (arrows, cards, dots, title) eases to the class colour the same
// way, and is returned for the caller to pass on. highlightedClass is null on the playermodel screen.
function drawMenuBackdrop(highlightedClass) {
  menuTint = stepMenuTint(menuTint, getMenuTintTarget(highlightedClass));
  menuAccent = stepMenuTint(menuAccent, getMenuAccentTarget(highlightedClass));
  const accent = menuAccent.map(Math.round);
  const [r, g, b] = menuTint.map(Math.round);
  push();
  const gradient = drawingContext.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(" + r + ", " + g + ", " + b + ", 0.8)");
  gradient.addColorStop(1, "rgba(" + r + ", " + g + ", " + b + ", 0.92)");
  drawingContext.fillStyle = gradient;
  drawingContext.fillRect(0, 0, width, height);
  noStroke();
  for (let i = 0; i < 44; i++) {
    const speed = 0.25 + (i % 5) * 0.09;
    const x = ((i * 197) % width) + Math.sin(frameCount / 70 + i) * 14;
    const y = height - ((i * 131 + frameCount * speed) % (height + 20));
    fill(accent[0], accent[1], accent[2], 50 + (i % 4) * 25);
    rect(x, y, 2 + (i % 3), 2 + (i % 3));
  }
  pop();
  return accent;
}

// The game's name, a divider, the screen's instruction and three dots showing which of the three
// character creator steps this is (step 0, 1 or 2).
function drawMenuTitle(accent, instruction, step) {
  push();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(84);
  fill(accent[0], accent[1], accent[2], 110);
  text("MAGE QUEST", width / 2 + 4, 99);
  fill(28, 24, 60);
  text("MAGE QUEST", width / 2, 94);
  stroke(accent[0], accent[1], accent[2], 170);
  strokeWeight(2);
  line(width / 2 - 230, 152, width / 2 - 18, 152);
  line(width / 2 + 18, 152, width / 2 + 230, 152);
  noStroke();
  fill(accent[0], accent[1], accent[2]);
  push();
  translate(width / 2, 152);
  rotate(QUARTER_PI);
  rect(-6, -6, 12, 12);
  pop();
  textStyle(NORMAL);
  textSize(30);
  fill(45, 40, 80);
  text(instruction, width / 2, 198);
  for (let i = 0; i < 3; i++) {
    if (i === step) {
      fill(accent[0], accent[1], accent[2]);
      circle(width / 2 + (i - 1) * 28, 236, 13);
    } else {
      fill(140, 140, 175);
      circle(width / 2 + (i - 1) * 28, 236, 8);
    }
  }
  pop();
}

// Starts drawing a card centered at (cx, cy): saves the drawing state, moves the origin to the
// card's middle (a selected card is drawn a little bigger, and pulses) and draws the card. Draw its
// contents with (0, 0) as the middle, then call endMenuCard().
function beginMenuCard(cx, cy, w, h, accent, selected) {
  const pulse = 0.5 + 0.5 * Math.sin(frameCount / 14);
  push();
  translate(cx, cy);
  if (selected) {
    scale(1.07 + 0.015 * pulse);
    drawingContext.shadowBlur = 30 + 16 * pulse;
    drawingContext.shadowColor = "rgb(" + accent.join(",") + ")";
  }
  noStroke();
  const base = getCardFill(menuAccent, selected); // takes on the colour of the class being hovered
  fill(base[0], base[1], base[2], selected ? 245 : 215);
  rect(-w / 2, -h / 2, w, h, 18);
  drawingContext.shadowBlur = 0;
  noFill();
  stroke(accent[0], accent[1], accent[2], selected ? 255 : 90);
  strokeWeight(selected ? 3 : 2);
  rect(-w / 2, -h / 2, w, h, 18);
  noStroke();
  fill(accent[0], accent[1], accent[2], selected ? 255 : 100);
  rect(-w / 2 + 22, -h / 2, w - 44, 7, 0, 0, 7, 7);
}

function endMenuCard() {
  pop();
}

// A keyboard key cap with a label in it, centered at (x, y).
function drawKeyCap(label, x, y, w) {
  push();
  stroke(170, 170, 210);
  strokeWeight(2);
  fill(44, 44, 78);
  rect(x - w / 2, y - 18, w, 36, 8);
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(20);
  text(label, x, y + 1);
  pop();
}

// The key hints along the bottom, and arrows at the sides that nudge toward the other choices.
function drawMenuHints(accent) {
  push();
  const y = 664;
  drawKeyCap("A", width / 2 - 250, y, 40);
  drawKeyCap("D", width / 2 - 202, y, 40);
  noStroke();
  fill(45, 40, 80);
  textAlign(LEFT, CENTER);
  textSize(22);
  text("Choose", width / 2 - 170, y + 1);
  drawKeyCap("Enter", width / 2 + 60, y, 84);
  text("Confirm", width / 2 + 116, y + 1);
  const nudge = Math.sin(frameCount / 10) * 5;
  fill(accent[0], accent[1], accent[2], 230);
  triangle(90 - nudge, MENU_CARD_Y, 118 - nudge, MENU_CARD_Y - 22, 118 - nudge, MENU_CARD_Y + 22);
  triangle(width - 90 + nudge, MENU_CARD_Y, width - 118 + nudge, MENU_CARD_Y - 22,
    width - 118 + nudge, MENU_CARD_Y + 22);
  pop();
}

function drawModelMenu(game) {
  const accent = drawMenuBackdrop(null);
  drawMenuTitle(accent, "Choose your playermodel", 0);
  const count = PLAYER_MODEL_NAMES.length;
  PLAYER_MODEL_NAMES.forEach((name, i) => {
    const selected = i === game.menuIndex;
    const { w, h } = MODEL_CARD;
    beginMenuCard(menuSlotCenterX(i, count, w), MENU_CARD_Y, w, h, accent, selected);
    // Each model stands facing down, feet on one shared line, and bobs a little when selected.
    const model = PLAYER_ART[name];
    const spriteW = model.spriteW * MODEL_PREVIEW_SCALE;
    const spriteH = model.spriteH * MODEL_PREVIEW_SCALE;
    const feet = h / 2 - 90;
    const bob = selected ? Math.sin(frameCount / 10) * 3 : 0;
    fill(0, 0, 0, 90);
    ellipse(0, feet + 4, 92, 14);
    drawPlayerSprite(name, game.appearance, 0, 0, -spriteW / 2, feet - spriteH - bob, spriteW, spriteH,
      selected ? 255 : 150);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(30);
    fill(255, 255, 255, selected ? 255 : 160);
    text(name.toUpperCase(), 0, h / 2 - 46);
    endMenuCard();
  });
  drawMenuHints(accent);
}

// A class card's weapon rows: the starting wand with what charging it does, and the sword.
function drawClassWeapons(mageClass, accent, selected) {
  const wand = WEAPON_DEFS[STARTING_RANGED_WEAPON[mageClass]].options;
  const sword = WEAPON_DEFS[STARTING_MELEE_WEAPON].options;
  const alpha = selected ? 255 : 160;
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(13);
  fill(150, 150, 190, alpha);
  text("STARTING WEAPONS", -112, 28);
  const rows = [
    { art: wand.art, name: wand.name, note: CHARGE_BLURB[wand.charge.effect], y: 80 },
    { art: sword.art, name: sword.name, note: "Hold after a swing to spin", y: 144 }
  ];
  for (const row of rows) {
    if (weaponIcons[row.art]) {
      tint(255, alpha);
      image(weaponIcons[row.art], -122, row.y - 22, 44, 44);
      noTint();
    }
    textStyle(BOLD);
    textSize(20);
    fill(255, 255, 255, alpha);
    text(row.name, -66, row.y - 10);
    textStyle(NORMAL);
    textSize(14);
    fill(accent[0], accent[1], accent[2], alpha);
    text(row.note, -66, row.y + 12);
  }
}

function drawClassMenu(game) {
  const highlighted = game.getHighlightedChoice();
  const accentOfHighlighted = drawMenuBackdrop(highlighted); // eased toward the hovered class's colour
  drawMenuTitle(accentOfHighlighted, "Choose your class", 1);
  const count = MAGE_CLASSES.length;
  MAGE_CLASSES.forEach((mageClass, i) => {
    const selected = mageClass === highlighted;
    const accent = CLASS_COLORS[mageClass];
    const { w, h } = CLASS_CARD;
    beginMenuCard(menuSlotCenterX(i, count, w), MENU_CARD_Y, w, h, accent, selected);
    // The class's starting wand, big, bobbing when selected, over a glow in the class colour.
    const wand = WEAPON_DEFS[STARTING_RANGED_WEAPON[mageClass]].options;
    const bob = selected ? Math.sin(frameCount / 10) * 4 : 0;
    noStroke();
    fill(accent[0], accent[1], accent[2], selected ? 70 : 30);
    ellipse(0, -h / 2 + 106, 128, 128);
    if (weaponIcons[wand.art]) {
      tint(255, selected ? 255 : 150);
      image(weaponIcons[wand.art], -48, -h / 2 + 58 + bob, 96, 96);
      noTint();
    }
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(38);
    fill(accent[0], accent[1], accent[2], selected ? 255 : 170);
    text(mageClass.toUpperCase(), 0, -50);
    textSize(16);
    fill(190, 190, 220, selected ? 255 : 140);
    text("M A G E", 0, -18);
    stroke(accent[0], accent[1], accent[2], selected ? 160 : 70);
    strokeWeight(1);
    line(-w / 2 + 30, 6, w / 2 - 30, 6);
    noStroke();
    drawClassWeapons(mageClass, accent, selected);
    endMenuCard();
  });
  drawMenuHints(accentOfHighlighted);
}

// Shows the chosen class during a run, top right.
function drawClassLabel(mageClass) {
  noStroke();
  fill(...CLASS_COLORS[mageClass]);
  textSize(24);
  textAlign(RIGHT, CENTER);
  text(mageClass + " Mage", width - 20, 34);
}

// The character creator (the customization screen): a preview card of the player on the left and
// one row per part on the right. Each row shows a strip of color swatches with the current color in
// the middle, and its hex code. W and S pick the row, A and D scroll its colors, H types a hex code
// and Enter starts the run (see customize-input.js).
const CUSTOMIZE_PREVIEW_SCALE = 8;
const CUSTOMIZE_CARD = { x: 330, y: 450, w: 380, h: 390 };
const CUSTOMIZE_ROWS = { x: 850, firstY: 304, gap: 92, w: 680, h: 76 };
const CUSTOMIZE_STRIP = { radius: 5, size: 30, gap: 8, left: 150 }; // 11 swatches; left: from the panel's left edge

// The key hints along the bottom of the character creator, for typing a hex code or not.
function drawCustomizeHints(typing) {
  push();
  const y = 664;
  noStroke();
  fill(45, 40, 80);
  textAlign(LEFT, CENTER);
  textSize(22);
  if (typing) {
    drawKeyCap("0-9  A-F", width / 2 - 330, y, 120);
    text("Type", width / 2 - 262, y + 1);
    drawKeyCap("Backspace", width / 2 - 130, y, 124);
    text("Delete", width / 2 - 64, y + 1);
    drawKeyCap("Enter", width / 2 + 60, y, 84);
    text("Apply", width / 2 + 116, y + 1);
    drawKeyCap("Esc", width / 2 + 230, y, 60);
    text("Cancel", width / 2 + 268, y + 1);
  } else {
    drawKeyCap("W", width / 2 - 410, y, 40);
    drawKeyCap("S", width / 2 - 362, y, 40);
    text("Part", width / 2 - 330, y + 1);
    drawKeyCap("A", width / 2 - 230, y, 40);
    drawKeyCap("D", width / 2 - 182, y, 40);
    text("Color", width / 2 - 150, y + 1);
    drawKeyCap("H", width / 2 - 40, y, 40);
    text("Hex code", width / 2 - 8, y + 1);
    drawKeyCap("Enter", width / 2 + 170, y, 84);
    text("Start", width / 2 + 226, y + 1);
  }
  pop();
}

// A row that is being typed into: "#" then the digits so far with a blinking caret, a small hint, and
// a preview swatch of the color the digits make (an empty box until they make one).
function drawHexField(game, accent) {
  const rows = CUSTOMIZE_ROWS;
  const strip = CUSTOMIZE_STRIP;
  const left = -rows.w / 2 + strip.left;
  const fieldW = 410;
  noStroke();
  fill(10, 10, 24, 230);
  rect(left, -24, fieldW, 48, 8);
  noFill();
  stroke(accent[0], accent[1], accent[2]);
  strokeWeight(2);
  rect(left, -24, fieldW, 48, 8);
  noStroke();
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(28);
  fill(255);
  const caret = Math.floor(frameCount / 24) % 2 === 0 ? "|" : " ";
  text("#" + game.hexBuffer + caret, left + 16, 1);
  textStyle(NORMAL);
  textSize(13);
  fill(180, 180, 215);
  textAlign(RIGHT, CENTER);
  text("3 or 6 digits", left + fieldW - 14, 1);
  const color = game.getHexEntryColor();
  const boxX = left + fieldW + 20;
  if (color !== null) {
    const [r, g, b] = hexToRgb(color);
    noStroke();
    fill(r, g, b);
    rect(boxX, -18, 36, 36, 6);
    noFill();
    stroke(255);
    strokeWeight(2);
    rect(boxX, -18, 36, 36, 6);
  } else {
    noFill();
    stroke(255, 255, 255, 90);
    strokeWeight(2);
    rect(boxX, -18, 36, 36, 6);
  }
}

// A row's strip of swatches around the current color (see getPaletteWindow), with the arrows at its
// ends when the row is highlighted, and the current hex code to its right.
function drawColorStrip(game, part, selected, accent) {
  const rows = CUSTOMIZE_ROWS;
  const strip = CUSTOMIZE_STRIP;
  const slot = strip.size + strip.gap;
  const left = -rows.w / 2 + strip.left;
  const stripEnd = left + strip.radius * 2 * slot + strip.size; // just past the last swatch
  for (const item of getPaletteWindow(game.appearance, part, strip.radius)) {
    const x = left + (item.offset + strip.radius) * slot;
    const [r, g, b] = hexToRgb(item.hex);
    const middle = item.offset === 0;
    const fade = Math.max(70, (selected ? 255 : 190) - Math.abs(item.offset) * 30);
    const grow = middle ? 4 : 0;
    noStroke();
    fill(r, g, b, middle ? 255 : fade);
    rect(x - grow / 2, -strip.size / 2 - grow / 2 - (middle ? 4 : 0), strip.size + grow, strip.size + grow, 6);
    noFill();
    stroke(255, middle ? 255 : 50);
    strokeWeight(middle ? 3 : 1);
    rect(x - grow / 2, -strip.size / 2 - grow / 2 - (middle ? 4 : 0), strip.size + grow, strip.size + grow, 6);
    if (middle && item.custom) {
      noStroke();
      fill(255);
      textAlign(CENTER, CENTER);
      textStyle(NORMAL);
      textSize(11);
      text("typed", x + strip.size / 2, strip.size / 2 + 8);
    }
  }
  if (selected) {
    const nudge = Math.sin(frameCount / 10) * 3;
    noStroke();
    fill(accent[0], accent[1], accent[2]);
    triangle(left - 14 - nudge, 0, left - 4 - nudge, -10, left - 4 - nudge, 10);
    triangle(stripEnd + 14 + nudge, 0, stripEnd + 4 + nudge, -10, stripEnd + 4 + nudge, 10);
  }
  noStroke();
  textAlign(LEFT, CENTER);
  textStyle(NORMAL);
  textSize(17);
  fill(255, 255, 255, selected ? 230 : 150);
  text(makeAppearance(game.appearance)[part], stripEnd + 28, 1);
}

function drawCustomizeMenu(game) {
  const accent = drawMenuBackdrop(game.selectedClass); // stays the colour of the class just chosen
  drawMenuTitle(accent, "Customize your " + game.selectedClass + " Mage", 2);

  // Preview card: the player standing and facing down, feet on the same line for both models.
  const card = CUSTOMIZE_CARD;
  beginMenuCard(card.x, card.y, card.w, card.h, accent, true);
  const model = PLAYER_ART[game.selectedModel];
  const w = model.spriteW * CUSTOMIZE_PREVIEW_SCALE;
  const h = model.spriteH * CUSTOMIZE_PREVIEW_SCALE;
  const feet = 120;
  const bob = Math.sin(frameCount / 12) * 2;
  noStroke();
  fill(accent[0], accent[1], accent[2], 60);
  ellipse(0, feet - 90, 250, 250);
  fill(0, 0, 0, 100);
  ellipse(0, feet + 4, 150, 18);
  drawPlayerSprite(game.selectedModel, game.appearance, 0, 0, -w / 2, feet - h - bob, w, h);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(26);
  fill(accent[0], accent[1], accent[2]);
  text(game.selectedClass.toUpperCase() + " MAGE", 0, card.h / 2 - 38);
  endMenuCard();

  // One row per part: its name, then its color strip (or the hex field while typing into it).
  const rows = CUSTOMIZE_ROWS;
  APPEARANCE_PARTS.forEach((part, i) => {
    const selected = i === game.menuIndex;
    const y = rows.firstY + i * rows.gap;
    beginMenuCard(rows.x, y, rows.w, rows.h, accent, selected);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(24);
    fill(255, 255, 255, selected ? 255 : 170);
    text(part.toUpperCase(), -rows.w / 2 + 26, 0);
    if (selected && game.isEnteringHex()) {
      drawHexField(game, accent);
    } else {
      drawColorStrip(game, part, selected, accent);
    }
    endMenuCard();
  });
  drawCustomizeHints(game.isEnteringHex());
}
