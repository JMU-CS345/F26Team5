// Playermodel data. No p5 drawing calls, so Jasmine can test it without a canvas.
// Load this before game.js, player.js and the view files.

// The sheet rows below the walk rows, as { row, frames }. The first 8 rows are walking:
// down, up, right, left, then the same four with the weapon. Row numbers match the sheet.
const TALL_FRAME_ROWS = Object.freeze({
  turn: { row: 8, frames: 4 },
  jumpDown: { row: 9, frames: 1 },
  jumpUp: { row: 10, frames: 1 },
  jumpRight: { row: 11, frames: 1 },
  jumpLeft: { row: 12, frames: 1 },
  hurt: { row: 13, frames: 4 },
  ko: { row: 14, frames: 1 }
});

const SHORT_FRAME_ROWS = Object.freeze({
  turn: { row: 8, frames: 4 },
  jumpDown: { row: 9, frames: 5 },
  jumpRight: { row: 10, frames: 8 },
  jumpLeft: { row: 11, frames: 8 },
  hurt: { row: 12, frames: 4 },
  ko: { row: 13, frames: 1 }
});

// Every sheet has the same row order: walking down, up, right, left, then the same
// four with the weapon. Column 0 of each row is the standing frame.
const PLAYER_MODELS = Object.freeze({
  Tall: {
    // The menu preview uses sheet. In the game, classSheets picks the sheet by class.
    sheet: "assets/player/mage-tall-fire.png",
    classSheets: {
      Fire: "assets/player/mage-tall-fire.png",
      Ice: "assets/player/mage-tall-ice.png",
      Mind: "assets/player/mage-tall-mind.png"
    },
    frameRows: TALL_FRAME_ROWS,
    spriteW: 16,
    spriteH: 32,
    // Columns of the walk frames in order. Each cycle starts on a step, not the standing frame.
    walkCycles: {
      down: [1, 0, 2, 0],
      up: [1, 0, 2, 0],
      right: [1, 0, 2, 0],
      left: [1, 0, 2, 0]
    }
  },
  Short: {
    sheet: "assets/player/mage-short-fire.png",
    classSheets: {
      Fire: "assets/player/mage-short-fire.png",
      Ice: "assets/player/mage-short-ice.png",
      Mind: "assets/player/mage-short-mind.png"
    },
    frameRows: SHORT_FRAME_ROWS,
    spriteW: 16,
    spriteH: 16,
    walkCycles: {
      down: [1, 0, 2, 0],
      up: [1, 0, 2, 0],
      right: [1, 0],
      left: [1, 0]
    }
  }
});

// Order matters: it is the order shown on the model screen and the 1/2 key mapping.
const PLAYER_MODEL_NAMES = Object.freeze(Object.keys(PLAYER_MODELS));

// The sheet to draw for a model and class. Falls back to the model's default sheet.
function playerSheetPath(modelName, mageClass) {
  const model = PLAYER_MODELS[modelName];
  if (model.classSheets[mageClass]) {
    return model.classSheets[mageClass];
  }
  return model.sheet;
}
