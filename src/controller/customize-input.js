// Keys on the customization screen (#23).
// The colors are picked with the mouse (color picker) or typed as hex codes, so the only key the
// screen itself uses is Enter, which starts the run.
// Returns { type: "done" } or null.
function getCustomizeAction(key) {
  if (String(key).toLowerCase() === "enter") {
    return { type: "done" };
  }
  return null;
}

// True while the player is typing in the hex box or using a color picker. Key presses then belong
// to that control and must not reach the game (typing "1" or "d" is not a command).
function isTypingInCustomizeField(activeElement) {
  return Boolean(activeElement) && ["INPUT", "TEXTAREA"].includes(activeElement.tagName);
}
