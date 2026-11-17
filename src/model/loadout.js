// The weapons a new run starts with. Model code: no p5 drawing calls.
// Load after weapon-generator.js.

// A common melee weapon and a common ranged weapon of the class element, made by the
// generator: { melee, ranged }. mageClass is "Fire", "Ice" or "Mind".
function createLoadout(mageClass, rng) {
  const weapons = {};
  for (const kind of ["melee", "ranged"]) {
    const weapon = generateWeapon(rng, { rarity: "common", kind: kind, element: mageClass });
    weapon.name = mageClass + " " + weapon.name;
    weapons[kind] = weapon;
  }
  return weapons;
}

// Puts the loadout in the player's bag and equips both weapons.
function giveLoadout(player, rng) {
  const loadout = createLoadout(player.mageClass, rng);
  for (const weapon of [loadout.melee, loadout.ranged]) {
    player.inventory.add(weapon);
    player.inventory.equip(weapon);
  }
  return loadout;
}
