// Settings are saved in localStorage as JSON. The Settings screen writes the same key.
const SETTINGS_STORAGE_KEY = "mageQuest.settings";

function defaultSettings() {
  return {
    controls: "classic",
    musicVolume: 0.5,
    sfxVolume: 0.7,
    screenShake: true,
    damageNumbers: true
  };
}

// Returns the saved settings, or the defaults when nothing usable is saved.
// Fields that are missing or the wrong type fall back to their default.
function loadSettings() {
  const defaults = defaultSettings();
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY));
  } catch (error) {
    return defaults; // no storage, blocked storage, or bad JSON
  }
  if (saved === null || typeof saved !== "object" || Array.isArray(saved)) {
    return defaults;
  }
  for (const key of Object.keys(defaults)) {
    if (typeof saved[key] === typeof defaults[key]) {
      defaults[key] = saved[key];
    }
  }
  return defaults;
}
