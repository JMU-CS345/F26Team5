// Keys on the playermodel and class screens. They use the movement keys: A and D move the
// highlight left and right, and Enter or Space picks the highlighted choice. No mouse and no number
// keys. Returns { type: "move", step: -1 or 1 }, { type: "confirm" }, or null for any other key.
function getMenuAction(key) {
  const k = String(key).toLowerCase();
  if (k === "a") {
    return { type: "move", step: -1 };
  }
  if (k === "d") {
    return { type: "move", step: 1 };
  }
  if (k === "enter" || k === " ") {
    return { type: "confirm" };
  }
  return null;
}
