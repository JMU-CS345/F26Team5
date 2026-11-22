// Counters for the run summary on the death screen. No p5 calls.

// A rough score so the summary can name the best item: value plus damage or armor power.
function itemScore(item) {
  let score = item.value;
  if (item instanceof Weapon) {
    score += item.damage;
  }
  if (item instanceof Armor) {
    score += item.block + item.hearts;
  }
  return score;
}

class RunStats {
  constructor() {
    this.reset();
  }

  // Called when a new run starts.
  reset() {
    this.roomsCleared = 0;
    this.enemiesKilled = 0;
    this.bestItem = null;
  }

  recordKill() {
    this.enemiesKilled++;
  }

  recordRoomCleared() {
    this.roomsCleared++;
  }

  // Gold is not an item worth naming. The first item of a score wins ties.
  recordPickup(item) {
    if (item instanceof Gold) {
      return;
    }
    if (this.bestItem === null || itemScore(item) > itemScore(this.bestItem)) {
      this.bestItem = item;
    }
  }

  bestItemName() {
    if (this.bestItem === null) {
      return "None";
    }
    return this.bestItem.name;
  }
}
