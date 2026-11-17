// A treasure chest standing in a room. Model code: no p5 drawing calls.
// Opening it once rolls its loot and returns ItemDrops for the room to hold. The view reads
// openFrames and rarity to animate the lid and the light beam.

const CHEST_SIZE = 16;
const CHEST_REACH = 30; // how close the player's center must be to the chest's center
const CHEST_LID_FRAMES = 20; // frames the lid takes to swing open
const CHEST_BEAM_FRAMES = 180; // frames the light beam lasts

class Chest {
  // x, y is the center of the chest.
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = CHEST_SIZE;
    this.opened = false;
    this.openFrames = 0; // frames since it opened
    this.rarity = null; // the rarity of the weapon inside, known once opened (null: no weapon)
  }

  // True when the chest is closed and the player is close enough to open it.
  canOpen(player) {
    if (this.opened || player.isDead()) {
      return false;
    }
    const center = player.getCenter();
    return Math.hypot(center.x - this.x, center.y - this.y) <= CHEST_REACH;
  }

  // Opens the chest and returns its drops: [weapon drop, gold drop], or just gold when the
  // room has no gear slot for it. A chest that is already
  // open gives nothing, so it can never be looted twice.
  open(lootRun, room) {
    if (this.opened) {
      return [];
    }
    this.opened = true;
    this.openFrames = 0;
    const loot = lootRun.rollChestLoot(room);
    const y = this.y + this.size / 2 + 2;
    const drops = [new ItemDrop(this.x + 2, y, new Gold(), loot.gold)];
    if (loot.weapon !== null) {
      this.rarity = loot.weapon.rarity;
      drops.unshift(new ItemDrop(this.x - ITEM_DROP_SIZE - 2, y, loot.weapon));
    }
    return drops;
  }

  update() {
    if (this.opened) {
      this.openFrames++;
    }
  }

  // 0 shut, 1 fully open.
  get lidProgress() {
    if (!this.opened) {
      return 0;
    }
    return Math.min(1, this.openFrames / CHEST_LID_FRAMES);
  }

  // 0 to 1: how bright the light beam is. It rises as the lid opens, then fades out.
  get beamStrength() {
    if (!this.opened || this.rarity === null || this.openFrames >= CHEST_BEAM_FRAMES) {
      return 0;
    }
    const rise = Math.min(1, this.openFrames / CHEST_LID_FRAMES);
    const fade = 1 - this.openFrames / CHEST_BEAM_FRAMES;
    return rise * fade;
  }
}
