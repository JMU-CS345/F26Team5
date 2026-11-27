// What each playermodel looks like: sprite sheets, frame sizes and walk cycles, keyed by model
// name (PLAYER_MODEL_NAMES in model/player-models.js). This file draws nothing, so Jasmine can
// load it. Load it after player-models.js.

// Every sheet has the same row order: walking down, up, right, left, then the same
// four with the weapon. Column 0 of each row is the standing frame.
const PLAYER_ART = Object.freeze({
  Tall: {
    sheet: "assets/player/16x32 Player.png",
    // White layers for #23, tinted to the chosen colors and drawn over the body sheet. Each one
    // has exactly the same layout as the body sheet, so frame (col, row) lines up everywhere.
    layerSheets: {
      eyes: "assets/player/customization/16x32 Eyes.png",
      shirt: "assets/player/customization/16x32 Shirt.png",
      pants: "assets/player/customization/16x32 Pants.png"
    },
    spriteW: 16,
    spriteH: 32,
    // Where the hand that holds a weapon is, in pixels from the middle of the player's 16x16
    // hitbox, for each way the player faces. The weapon's grip is drawn here.
    hand: {
      down: { x: 4, y: 5 },
      up: { x: -4, y: -15 },
      right: { x: 11, y: -8 },
      left: { x: -11, y: -8 }
    },
    // Columns of the walk frames in order. Each cycle starts on a step, not the standing frame.
    walkCycles: {
      down: [1, 0, 2, 0],
      up: [1, 0, 2, 0],
      right: [1, 0, 2, 0],
      left: [1, 0, 2, 0]
    }
  },
  Short: {
    sheet: "assets/player/16x16 Player.png",
    layerSheets: {
      eyes: "assets/player/customization/16x16 Eyes.png",
      shirt: "assets/player/customization/16x16 Shirt.png",
      pants: "assets/player/customization/16x16 Pants.png"
    },
    spriteW: 16,
    spriteH: 16,
    hand: {
      down: { x: 5, y: 10 },
      up: { x: -5, y: -10 },
      right: { x: 11, y: 0 },
      left: { x: -11, y: 0 }
    },
    walkCycles: {
      down: [1, 0, 2, 0],
      up: [1, 0, 2, 0],
      right: [1, 0],
      left: [1, 0]
    }
  }
});

// The layers drawn over the body sheet, bottom to top. Pants go under the shirt, and the eyes
// go on top of everything. Each one has a sheet in PLAYER_ART[model].layerSheets.
const APPEARANCE_LAYER_ORDER = Object.freeze(["pants", "shirt", "eyes"]);
