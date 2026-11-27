// Keys in the character creator (the customization screen). They use the movement keys: W and S
// move between the parts of the look (body, eyes, shirt, pants), A and D step the highlighted part
// through its colors, H starts typing a hex code for it, and Enter or Space starts the run. No mouse.
// Returns { type: "row", step: -1 or 1 }, { type: "color", step: -1 or 1 }, { type: "hex" },
// { type: "done" }, or null for any other key.
function getCustomizeAction(key) {
  const k = String(key).toLowerCase();
  if (k === "w") {
    return { type: "row", step: -1 };
  }
  if (k === "s") {
    return { type: "row", step: 1 };
  }
  if (k === "a") {
    return { type: "color", step: -1 };
  }
  if (k === "d") {
    return { type: "color", step: 1 };
  }
  if (k === "h") {
    return { type: "hex" };
  }
  if (k === "enter" || k === " ") {
    return { type: "done" };
  }
  return null;
}

// Keys while a hex code is being typed (after H). The hex digits 0-9 and A-F type, Backspace deletes
// one, Enter applies the code and Escape gives up. W, S and the rest do nothing then, since A and D
// are hex digits themselves. Returns { type: "digit", digit }, { type: "backspace" },
// { type: "apply" }, { type: "cancel" }, or null for any other key.
function getHexEntryAction(key) {
  if (key === "Enter") {
    return { type: "apply" };
  }
  if (key === "Escape") {
    return { type: "cancel" };
  }
  if (key === "Backspace") {
    return { type: "backspace" };
  }
  if (typeof key === "string" && key.length === 1 && /[0-9a-fA-F]/.test(key)) {
    return { type: "digit", digit: key.toLowerCase() };
  }
  return null;
}
