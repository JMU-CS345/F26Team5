// Drawing code for the class selection menu. Reads the model, never changes it.
// The class buttons are p5 DOM buttons, made in sketch.js.

const MODEL_BUTTON_W = 200;
const MODEL_BUTTON_GAP = 30;
const MENU_BUTTON_H = 80;
const CLASS_COLORS = {
  Fire: [230, 90, 40],
  Ice: [90, 180, 240],
  Mind: [170, 110, 230]
};

function drawClassMenu() {
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(64);
  text("Mage Quest", width / 2, height / 2 - 240);
  textSize(28);
  text("Choose your class", width / 2, height / 2 - 170);
  textSize(18);
  fill(180);
  text("Click a class or press 1, 2 or 3", width / 2, height / 2 + 120);
}

// Shows the chosen class during a run, top right.
function drawClassLabel(mageClass) {
  noStroke();
  fill(...CLASS_COLORS[mageClass]);
  textSize(24);
  textAlign(RIGHT, CENTER);
  text(mageClass + " Mage", width - 20, 34);
}

// Customization screen (#23): a big preview of the player on the left, and one row per part
// on the right. The < and > buttons and the Start button are p5 DOM buttons, made in sketch.js.
const CUSTOMIZE_PREVIEW_SCALE = 7;
const CUSTOMIZE_PREVIEW_X = 400; // center x of the preview
const CUSTOMIZE_ROWS_X = 820; // center x of the option names
const CUSTOMIZE_ROW_GAP = 80;
// The wizard has no hair, so that part is the color of the hat.
const APPEARANCE_LABELS = { skin: "SKIN", eyes: "EYES", hair: "HAT", clothing: "ROBE" };
const CUSTOMIZE_ARROW_SIZE = 56;
const CUSTOMIZE_ARROW_OFFSET = 190; // from the row center to each arrow's center

// Center y of the nth customization row.
function customizeRowY(i) {
  return 230 + i * CUSTOMIZE_ROW_GAP;
}

function drawCustomizeMenu(game, selectedRow) {
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(64);
  text("Mage Quest", width / 2, 70);
  textSize(28);
  text("Customize your " + game.selectedClass + " Mage", width / 2, 140);

  // Preview: the wizard standing and facing down, feet on a line, in the chosen colors.
  const w = SPRITE_W * CUSTOMIZE_PREVIEW_SCALE;
  const h = SPRITE_H * CUSTOMIZE_PREVIEW_SCALE;
  const colors = wizardColors(game.selectedClass, game.appearance);
  drawWizardFrame(colors, FRAME_TABLE.idle.start, SPRITE_ROWS.down,
    CUSTOMIZE_PREVIEW_X - w / 2, 500 - h, w, h);

  APPEARANCE_PARTS.forEach((part, i) => {
    const y = customizeRowY(i);
    if (i === selectedRow) {
      fill(255, 255, 255, 30);
      rect(CUSTOMIZE_ROWS_X - 230, y - 32, 460, 64, 8);
    }
    fill(180);
    textSize(18);
    text(APPEARANCE_LABELS[part], CUSTOMIZE_ROWS_X, y - 16);
    fill(255);
    textSize(28);
    const color = getAppearanceColor(game.appearance, part);
    if (color === null) {
      text("Class color", CUSTOMIZE_ROWS_X, y + 12); // keeps the color from the class
    } else {
      text(game.appearance[part], CUSTOMIZE_ROWS_X, y + 12);
      fill(...color);
      stroke(255);
      rect(CUSTOMIZE_ROWS_X + 90, y - 2, 28, 28, 4);
      noStroke();
    }
  });

  textSize(18);
  fill(180);
  text("Click the arrows, or use W/S and A/D (or the arrow keys). Enter to start.",
    width / 2, height - 50);
}
