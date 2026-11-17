// The card that shows a floor weapon against the equipped one. Views never change state.

const WEAPON_CARD = { x: 976, y: 200, w: 280, padding: 12, lineHeight: 18 };
const CARD_GOOD_COLOR = [90, 220, 110];
const CARD_BAD_COLOR = [235, 90, 90];

// "+0.4" or "-2" with the sign always shown.
function signedNumber(n) {
  if (n > 0) {
    return "+" + n;
  }
  return String(n);
}

function drawWeaponCard(weapon, equipped) {
  const rows = compareWeapons(weapon, equipped);
  const effects = weaponEffectLines(weapon);
  const rarity = getRarity(weapon.rarity);
  const c = WEAPON_CARD;
  const lineCount = 4 + rows.length + effects.length;
  const h = c.padding * 2 + lineCount * c.lineHeight;

  push();
  noStroke();
  fill(15, 15, 25, 225);
  rect(c.x, c.y, c.w, h, 6);
  stroke(...rarity.color);
  strokeWeight(2);
  noFill();
  rect(c.x, c.y, c.w, h, 6);
  noStroke();
  textAlign(LEFT, TOP);

  let y = c.y + c.padding;
  const left = c.x + c.padding;
  const right = c.x + c.w - c.padding;
  fill(...rarity.color);
  textSize(15);
  text(weapon.name, left, y, c.w - 2 * c.padding);
  y += c.lineHeight;
  textSize(12);
  fill(200);
  let elementText = "";
  if (weapon.element !== null) {
    elementText = " - " + weapon.element;
  }
  text(rarity.label + " " + weaponKind(weapon) + elementText, left, y);
  y += c.lineHeight;
  fill(140);
  if (equipped === null) {
    text("Nothing equipped", left, y);
  } else {
    text("vs " + equipped.name, left, y);
  }
  y += c.lineHeight;

  for (const row of rows) {
    fill(220);
    text(row.label, left, y);
    textAlign(RIGHT, TOP);
    if (row.verdict === "up") {
      fill(...CARD_GOOD_COLOR);
      text(row.value + "  ▲ " + signedNumber(row.diff), right, y);
    } else if (row.verdict === "down") {
      fill(...CARD_BAD_COLOR);
      text(row.value + "  ▼ " + signedNumber(row.diff), right, y);
    } else {
      fill(220);
      text(String(row.value), right, y);
    }
    textAlign(LEFT, TOP);
    y += c.lineHeight;
  }

  fill(255, 215, 120);
  for (const line of effects) {
    text("* " + line, left, y, c.w - 2 * c.padding);
    y += c.lineHeight;
  }
  fill(180);
  text("Press E to equip", left, y);
  pop();
}
