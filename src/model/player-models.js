// The playermodels a player can pick between. What each one looks like (sheets, frame sizes and
// walk cycles) is in src/view/player-art.js, under the same names.
// No p5 drawing calls, so Jasmine can test it without a canvas.
// Load this before game.js, player.js and the view files.

// Order matters: it is the order shown on the model screen and the 1/2 key mapping.
const PLAYER_MODEL_NAMES = Object.freeze(["Tall", "Short"]);
