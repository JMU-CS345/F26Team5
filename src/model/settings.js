// Player settings, saved by the menus and read by the game. No p5 drawing calls.

const SETTINGS_KEY = "mageQuest.settings";
const CONTROL_PRESETS = Object.freeze(["classic", "twinstick"]);

function defaultSettings() {
  return {
    controls: "classic",
    musicVolume: 0.5,
    sfxVolume: 0.7,
    screenShake: true,
    damageNumbers: true
  };
}

function isVolume(value) {
  return typeof value === "number" && value >= 0 && value <= 1;
}

// Missing, broken or unreadable storage gives the defaults. Bad single fields do too.
function loadSettings() {
  const settings = defaultSettings();
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
  } catch (error) {
    return settings;
  }
  if (saved === null || typeof saved !== "object") {
    return settings;
  }
  if (CONTROL_PRESETS.includes(saved.controls)) {
    settings.controls = saved.controls;
  }
  if (isVolume(saved.musicVolume)) {
    settings.musicVolume = saved.musicVolume;
  }
  if (isVolume(saved.sfxVolume)) {
    settings.sfxVolume = saved.sfxVolume;
  }
  if (typeof saved.screenShake === "boolean") {
    settings.screenShake = saved.screenShake;
  }
  if (typeof saved.damageNumbers === "boolean") {
    settings.damageNumbers = saved.damageNumbers;
  }
  return settings;
}
