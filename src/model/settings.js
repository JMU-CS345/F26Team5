// Player settings, saved in localStorage. No p5 calls, so Jasmine can test it.

const SETTINGS_KEY = "mageQuest.settings";

const CONTROL_PRESETS = Object.freeze({
  classic: Object.freeze({
    name: "Classic",
    lines: Object.freeze([
      "WASD move, J melee, K fire toward facing",
      "Space dash, Shift strafe (locks facing)",
      "E interact, I inventory, Esc pause"
    ])
  }),
  twinstick: Object.freeze({
    name: "Twin-stick",
    lines: Object.freeze([
      "WASD move, arrows fire (aim)",
      "Space melee toward last aim, Shift dash",
      "E interact, I inventory, Esc pause"
    ])
  })
});
const CONTROL_PRESET_IDS = Object.freeze(["classic", "twinstick"]);

function defaultSettings() {
  return {
    controls: "classic",
    musicVolume: 0.5,
    sfxVolume: 0.7,
    screenShake: true,
    damageNumbers: true
  };
}

function cleanVolume(value, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

function cleanBoolean(value, fallback) {
  if (typeof value !== "boolean") {
    return fallback;
  }
  return value;
}

// Fills in anything missing or the wrong type from the defaults.
function cleanSettings(raw) {
  const settings = defaultSettings();
  if (raw === null || typeof raw !== "object") {
    return settings;
  }
  if (CONTROL_PRESET_IDS.includes(raw.controls)) {
    settings.controls = raw.controls;
  }
  settings.musicVolume = cleanVolume(raw.musicVolume, settings.musicVolume);
  settings.sfxVolume = cleanVolume(raw.sfxVolume, settings.sfxVolume);
  settings.screenShake = cleanBoolean(raw.screenShake, settings.screenShake);
  settings.damageNumbers = cleanBoolean(raw.damageNumbers, settings.damageNumbers);
  return settings;
}

function storageOrDefault(storage) {
  if (storage === null) {
    return window.localStorage;
  }
  return storage;
}

// The storage argument is only for tests. The game uses the browser's localStorage.
function loadSettings(storage = null) {
  try {
    const store = storageOrDefault(storage);
    const text = store.getItem(SETTINGS_KEY);
    if (text === null || text === undefined) {
      return defaultSettings();
    }
    return cleanSettings(JSON.parse(text));
  } catch (error) {
    return defaultSettings();
  }
}

// Returns false when the browser refuses to save, so the game keeps running either way.
function saveSettings(settings, storage = null) {
  try {
    const store = storageOrDefault(storage);
    store.setItem(SETTINGS_KEY, JSON.stringify(cleanSettings(settings)));
    return true;
  } catch (error) {
    return false;
  }
}
