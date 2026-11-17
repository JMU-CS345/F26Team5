// Opening chests with the interact key. The controller changes the model; the view only draws.

// The closest chest in the room the player can open right now, or null.
function findOpenableChest(player, room) {
  let best = null;
  let bestDistance = Infinity;
  const center = player.getCenter();
  for (const chest of room.chests) {
    if (!chest.canOpen(player)) {
      continue;
    }
    const distance = Math.hypot(center.x - chest.x, center.y - chest.y);
    if (distance < bestDistance) {
      best = chest;
      bestDistance = distance;
    }
  }
  return best;
}

// Opens the nearest chest in reach and puts its loot on the floor. Returns true if one opened.
function tryOpenChest(player, room, lootRun) {
  const chest = findOpenableChest(player, room);
  if (chest === null) {
    return false;
  }
  room.items.push(...chest.open(lootRun, room));
  if (typeof playSfx === "function") {
    playSfx("chest");
  }
  return true;
}
