// The lines of a Diablo-style item tooltip. Pure model, no p5 calls.
// Load after weapon-compare.js and loot-run.js. Each line is { text, color } where color is
// "rarity" (use the item's rarity colour), "white", "grey", "gold", "green" or "red".

function armorSlotName(armor) {
  if (armor instanceof Helmet) {
    return "Head";
  }
  if (armor instanceof ChestArmor) {
    return "Body";
  }
  return "Legs";
}

// Where the tooltip box starts: right of the item, or left of it when the right side would run
// off the screen (so the box never covers the item it describes).
function tooltipBoxX(rightX, leftX, boxWidth, screenWidth) {
  if (rightX + boxWidth <= screenWidth) {
    return rightX;
  }
  return Math.max(0, leftX - boxWidth);
}

function tooltipLine(text, color = "white") {
  return { text: text, color: color };
}

// What a compare row looks like next to the equipped item: "+0.5 Damage" in green or red.
function compareLine(row) {
  if (row.verdict === "none" || row.verdict === "same") {
    return null;
  }
  let sign = "";
  let color = "red";
  if (row.diff > 0) {
    sign = "+";
  }
  if (row.verdict === "up") {
    color = "green";
  }
  return tooltipLine(sign + row.diff + " " + row.label, color);
}

function weaponTooltip(weapon, equipped) {
  const lines = [tooltipLine(weapon.name, "rarity")];
  const base = getRarity(weapon.rarity).label + " " + weaponKind(weapon) + " weapon";
  lines.push(tooltipLine(base, "grey"));
  for (const row of compareWeapons(weapon, null)) {
    lines.push(tooltipLine(row.label + ": " + row.value));
  }
  for (const text of weaponEffectLines(weapon)) {
    lines.push(tooltipLine(text, "gold"));
  }
  if (equipped !== null && equipped !== weapon) {
    for (const row of compareWeapons(weapon, equipped)) {
      const line = compareLine(row);
      if (line !== null) {
        lines.push(line);
      }
    }
  }
  return lines;
}

function armorTooltip(armor, equipped) {
  const lines = [tooltipLine(armor.name, "white")];
  lines.push(tooltipLine(armorSlotName(armor) + " armor", "grey"));
  lines.push(tooltipLine("Defense: " + armor.defense));
  if (equipped !== null && equipped !== armor) {
    const diff = Math.round((armor.defense - equipped.defense) * 100) / 100;
    if (diff !== 0) {
      let color = "red";
      let sign = "";
      if (diff > 0) {
        color = "green";
        sign = "+";
      }
      lines.push(tooltipLine(sign + diff + " Defense", color));
    }
  }
  return lines;
}

// Lines for any item. equipped is the item in the matching equipment slot (or null).
function itemTooltipLines(item, equipped = null) {
  let lines = [tooltipLine(item.name, "white")];
  if (item instanceof Weapon) {
    lines = weaponTooltip(item, equipped);
  } else if (item instanceof Armor) {
    lines = armorTooltip(item, equipped);
  } else if (item instanceof Consumable) {
    lines.push(tooltipLine(item.description, "grey"));
    lines.push(tooltipLine("Restores " + item.healthRestore + " health", "green"));
  } else if (item.description !== "") {
    lines.push(tooltipLine(item.description, "grey"));
  }
  lines.push(tooltipLine("Sell value: " + item.value + " gold", "gold"));
  if (item.locked) {
    lines.push(tooltipLine("Locked", "gold"));
  }
  return lines;
}
