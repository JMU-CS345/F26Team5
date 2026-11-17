// Turns a key on the class menu into a mage class. Keys 1, 2 and 3 pick the
// classes in MAGE_CLASSES order. Returns null for any other key.
function getClassForKey(key) {
  const index = Number(key) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= MAGE_CLASSES.length) {
    return null;
  }
  return MAGE_CLASSES[index];
}

// Turns a key on the model screen into a playermodel name. Keys 1 and 2 pick the
// models in PLAYER_MODEL_NAMES order. Returns null for any other key.
function getModelForKey(key) {
  const index = Number(key) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= PLAYER_MODEL_NAMES.length) {
    return null;
  }
  return PLAYER_MODEL_NAMES[index];
}
