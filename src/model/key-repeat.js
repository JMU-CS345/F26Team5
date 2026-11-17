// Repeats a held key. No p5 calls, so Jasmine can test it without a canvas.
// The first press is handled by keyPressed. Call update() once per frame with whether the key
// is still down: it returns true on the frame the move should repeat.

const REPEAT_FIRST_FRAMES = 12;
const REPEAT_EVERY_FRAMES = 4;

class KeyRepeat {
  constructor(first = REPEAT_FIRST_FRAMES, every = REPEAT_EVERY_FRAMES) {
    this.first = first;
    this.every = every;
    this.held = -1; // -1 means the key is up
  }

  update(isDown) {
    if (!isDown) {
      this.held = -1;
      return false;
    }
    this.held++;
    if (this.held < this.first) {
      return false;
    }
    return (this.held - this.first) % this.every === 0;
  }
}
