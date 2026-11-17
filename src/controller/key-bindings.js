// Key bindings for the two control presets. Each action has exactly one key code, and a
// key code is used by one action only. Codes: letters are their capital ASCII code,
// 32 Space, 16 Shift, 27 Esc, 37-40 arrows.

const KEY_PRESETS = Object.freeze({
  classic: Object.freeze({
    moveUp: 87,
    moveDown: 83,
    moveLeft: 65,
    moveRight: 68,
    melee: 74, // J
    fire: 75, // K, shoots toward the facing direction
    dash: 32,
    strafe: 16, // hold to keep facing while moving
    interact: 69, // E
    inventory: 73, // I
    pause: 27
  }),
  twinstick: Object.freeze({
    moveUp: 87,
    moveDown: 83,
    moveLeft: 65,
    moveRight: 68,
    fireUp: 38,
    fireDown: 40,
    fireLeft: 37,
    fireRight: 39,
    melee: 32, // swings toward the last aim direction
    dash: 16,
    interact: 69,
    inventory: 73,
    pause: 27
  })
});

let activeBindings = { ...KEY_PRESETS.classic };

// Returns a copy of a preset. An unknown name gives Classic.
function getPreset(name) {
  const preset = KEY_PRESETS[name];
  if (!preset) {
    return { ...KEY_PRESETS.classic };
  }
  return { ...preset };
}

// Call when a run starts, and whenever the menus change the controls setting.
function refreshBindings() {
  activeBindings = getPreset(loadSettings().controls);
  return activeBindings;
}

function getBindings() {
  return activeBindings;
}

function setBindings(bindings) {
  activeBindings = bindings;
}

// The action a key code is bound to, or null.
function actionForKey(code, bindings = activeBindings) {
  for (const action of Object.keys(bindings)) {
    if (bindings[action] === code) {
      return action;
    }
  }
  return null;
}

// Returns new bindings with the action on a new key. If another action had that key, the
// two swap, so every key still belongs to one action.
function rebindAction(bindings, action, code) {
  const result = { ...bindings };
  const other = actionForKey(code, bindings);
  if (other !== null && other !== action) {
    result[other] = bindings[action];
  }
  result[action] = code;
  return result;
}
