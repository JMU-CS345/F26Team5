// Plays a sound when the audio branch is loaded. Names: swing, hit, shoot, hurt, dash.
function playCombatSfx(name) {
  if (typeof playSfx === "function") {
    playSfx(name);
  }
}
