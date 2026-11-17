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
// feet. Works with a full bag. Returns { equipped, dropped } (dropped is null if the slot was
// empty), or null if the drop is no longer in the room.
function swapWeaponDrop(player, room, drop) {
  const weapon = drop.item;
  if (!room.items.includes(drop)) {
    return null;
  }
  const previous = player.inventory.swapEquipped(weapon);
  room.items = room.items.filter((d) => d !== drop);
  if (previous !== null) {
    const center = player.getCenter();
    const old = new ItemDrop(
      center.x - ITEM_DROP_SIZE / 2,
      center.y - ITEM_DROP_SIZE / 2,
      previous
    );
    old.justDropped = true;
    room.items.push(old);
  }
  playPickupSound();
  return { equipped: weapon, dropped: previous };
}

// Puts the weapon in a drop into the bag. It is not equipped: do that in the inventory.
// Returns true if it fit, false if the drop is gone or the bag is full.
function pickUpWeaponDrop(player, room, drop) {
  if (!room.items.includes(drop) || !player.inventory.canAdd(drop.item)) {
    return false;
  }
  player.inventory.add(drop.item);
  room.items = room.items.filter((d) => d !== drop);
  playPickupSound();
  return true;
}

// What E does on a weapon: pick it up, or swap it with the equipped one when the bag is full.
// Returns "picked", "swapped" or null.
function useWeaponDrop(player, room, drop) {
  if (pickUpWeaponDrop(player, room, drop)) {
    return "picked";
  }
  if (swapWeaponDrop(player, room, drop) !== null) {
    return "swapped";
  }
  return null;
}

function playPickupSound() {
  if (typeof playSfx === "function") {
    playSfx("pickup");
  }
}
