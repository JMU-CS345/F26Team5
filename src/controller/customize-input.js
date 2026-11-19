// Keys on the customization screen (#23).
// W/S or Up/Down pick a row, A/D or Left/Right change that row's option, Enter starts the run.
// Returns { type: "row", step }, { type: "option", step }, { type: "done" } or null.
function getCustomizeAction(key) {
  const k = String(key).toLowerCase();
  if (k === "w" || k === "arrowup") {
    return { type: "row", step: -1 };
  }
  if (k === "s" || k === "arrowdown") {
    return { type: "row", step: 1 };
  }
  if (k === "a" || k === "arrowleft") {
    return { type: "option", step: -1 };
  }
  if (k === "d" || k === "arrowright") {
    return { type: "option", step: 1 };
  }
  if (k === "enter") {
    return { type: "done" };
  }
  return null;
}

// Moves the highlighted row, wrapping around at both ends.
function nextCustomizeRow(row, step) {
  const count = APPEARANCE_PARTS.length;
  return (row + step + count) % count;
}
