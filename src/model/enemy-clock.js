// Decides how many times enemies update this frame. At normal speed it is exactly once, so
// play is unchanged. A slower scale (perfect dodge) skips frames and keeps the leftover.
// No p5 drawing calls.

class EnemyClock {
  constructor() {
    this.leftover = 0;
  }

  // scale is the share of normal speed, 1 or less. Returns 0 or 1 updates to run now.
  steps(scale) {
    if (scale >= 1) {
      this.leftover = 0;
      return 1;
    }
    this.leftover += scale;
    if (this.leftover >= 1) {
      this.leftover -= 1;
      return 1;
    }
    return 0;
  }
}
