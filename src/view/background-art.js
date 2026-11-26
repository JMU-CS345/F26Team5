// The falling snow behind everything, like the ZSNES menu: tiny white squares drifting down over a
// dark blue gradient. This file draws nothing, so Jasmine can test it. The drawing is in
// background-view.js.

const SNOW = Object.freeze({
  count: 170, // flakes on screen
  minSpeed: 0.35, // pixels per frame, for the farthest flakes
  maxSpeed: 1.7, // for the nearest
  wind: 0.18, // steady sideways drift, pixels per frame
  sway: 0.35, // how far a flake wobbles side to side, pixels per frame
  swaySpeed: 0.025 // radians per frame the wobble turns
});
const BACKGROUND_TOP = Object.freeze([12, 12, 38]); // the gradient's top colour
const BACKGROUND_BOTTOM = Object.freeze([34, 28, 72]); // and its bottom colour

// A new flake. rng gives numbers from 0 up to (not including) 1. depth is how near the flake is:
// near flakes (1) fall fast, are big and bright, far ones (0) fall slowly and are small and dim,
// which gives a feeling of depth. anywhere puts it anywhere on screen, otherwise just above the top.
function makeSnowflake(rng, w, h, anywhere = true) {
  const depth = rng();
  return {
    x: rng() * w,
    y: anywhere ? rng() * h : -3,
    depth,
    speed: SNOW.minSpeed + depth * (SNOW.maxSpeed - SNOW.minSpeed),
    size: depth > 0.75 ? 3 : depth > 0.35 ? 2 : 1,
    alpha: Math.round(90 + depth * 165),
    phase: rng() * Math.PI * 2
  };
}

// Moves a flake one frame: down at its own speed, with the wind and a gentle wobble, both stronger
// for near flakes. Past the bottom it comes back in at the top at a new place. It wraps round
// the sides. frame is any number that goes up by one each frame.
function stepSnowflake(flake, frame, w, h, rng) {
  const push = 0.4 + flake.depth;
  flake.y += flake.speed;
  flake.x += SNOW.wind * push + Math.sin(frame * SNOW.swaySpeed + flake.phase) * SNOW.sway * push;
  if (flake.y > h) {
    flake.y = -flake.size;
    flake.x = rng() * w;
  }
  if (flake.x >= w) {
    flake.x -= w;
  } else if (flake.x < 0) {
    flake.x += w;
  }
}
