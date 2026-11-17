// Pure sound rules. The Audio elements live in src/view/audio-player.js.
const SFX_FILES = {
  swing: "assets/audio/swing.mp3",
  hit: "assets/audio/hit.mp3",
  shoot: "assets/audio/shoot.mp3",
  hurt: "assets/audio/hurt.mp3",
  dash: "assets/audio/dash.mp3",
  pickup: "assets/audio/pickup.mp3",
  chest: "assets/audio/chest.mp3",
  menu: "assets/audio/menu.mp3",
  death: "assets/audio/death.mp3"
};

const MUSIC_FILE = "assets/audio/music-loop.mp3";

// Returns the file path for a sound effect name, or null for a name we do not have.
function fileFor(name) {
  if (!Object.prototype.hasOwnProperty.call(SFX_FILES, name)) {
    return null;
  }
  return SFX_FILES[name];
}

function clampVolume(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

// kind is "music" or "sfx". Anything else is treated as a sound effect.
function volumeFor(kind, settings) {
  if (!settings) {
    return 0;
  }
  if (kind === "music") {
    return clampVolume(settings.musicVolume);
  }
  return clampVolume(settings.sfxVolume);
}
