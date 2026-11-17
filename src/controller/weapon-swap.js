// Swapping the equipped weapon for one lying on the floor. The controller changes the model.

// The first weapon drop the player is standing on, or null.
function findWeaponDropUnderPlayer(player, room) {
  if (player.isDead()) {
    return null;
  }
  const bounds = player.getBounds();
  for (const drop of room.items) {
    if (isEquippableWeapon(drop.item) && rectsOverlap(bounds, drop.getBounds())) {
      return drop;
    }
  }
  return null;
}

// Equips the weapon in a drop and puts the weapon it replaces on the floor at the player's
// feet. Returns { equipped, dropped } (dropped is null if the slot was empty), or null if
// the bag has no room for the swap and nothing changed.
function swapWeaponDrop(player, room, drop) {
  const inventory = player.inventory;
  const weapon = drop.item;
  if (!room.items.includes(drop) || !inventory.canAdd(weapon)) {
    return null;
  }
  const slotName = weaponSlotName(weapon);
  inventory.add(weapon);
  const previous = inventory.getEquipped(slotName);
  inventory.equip(weapon);
  room.items = room.items.filter((d) => d !== drop);
  if (previous !== null) {
    // equip() moved the old weapon into the bag; take it back out and drop it.
    inventory.remove(previous);
    const center = player.getCenter();
    room.items.push(new ItemDrop(
      center.x - ITEM_DROP_SIZE / 2,
      center.y - ITEM_DROP_SIZE / 2,
      previous
    ));
  }
  if (typeof playSfx === "function") {
    playSfx("pickup");
  }
  return { equipped: weapon, dropped: previous };
}
