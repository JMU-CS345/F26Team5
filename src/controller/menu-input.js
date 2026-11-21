// Turns a key on the class menu into a mage class. Keys 1, 2 and 3 pick the
// classes in MAGE_CLASSES order. Returns null for any other key.
function getClassForKey(key) {
  const index = Number(key) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= MAGE_CLASSES.length) {
    return null;
  }
  return MAGE_CLASSES[index];
}

// Turns a key on the model screen into a playermodel. Keys 1 and 2 pick in PLAYER_MODEL_NAMES
// order. Returns null for any other key.
function getModelForKey(key) {
  const index = Number(key) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= PLAYER_MODEL_NAMES.length) {
    return null;
  }
  return PLAYER_MODEL_NAMES[index];
}

const KEY_ENTER = 13;
const KEY_ESCAPE = 27;

// Turns a key press into a menu move. Vertical menus move with up/down (or W/S) and change
// values with left/right (or A/D). Horizontal menus swap those. Enter confirms, Esc goes back.
// Returns true when the key did something.
function handleMenuKey(menu, code, horizontal = false) {
  let backKeys = [38, 87];
  let forwardKeys = [40, 83];
  let leftKeys = [37, 65];
  let rightKeys = [39, 68];
  if (horizontal) {
    backKeys = leftKeys;
    forwardKeys = rightKeys;
    leftKeys = [];
    rightKeys = [];
  }
  let handled = true;
  if (backKeys.includes(code)) {
    menu.previous();
  } else if (forwardKeys.includes(code)) {
    menu.next();
  } else if (leftKeys.includes(code)) {
    menu.adjust(-1);
  } else if (rightKeys.includes(code)) {
    menu.adjust(1);
  } else if (code === KEY_ENTER) {
    menu.confirm();
  } else if (code === KEY_ESCAPE) {
    menu.back();
  } else {
    handled = false;
  }
  if (handled && typeof playSfx === "function") {
    playSfx("menu");
  }
  return handled;
}
