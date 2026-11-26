// The camera: which part of a big area the screen shows. No p5 drawing calls, so Jasmine can
// test it without a canvas.
//
// x, y is the world pixel that sits at the top-left corner of the screen. The camera tries to
// keep the player in the middle of the screen, but it stops as soon as the edge of the area
// lines up with the edge of the screen, so the view never shows anything outside the area.
// An area smaller than the screen (on either axis) is centered on that axis instead.

class Camera {
  constructor(viewWidth, viewHeight) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.x = 0;
    this.y = 0;
  }

  // Centers the view on the pixel (targetX, targetY), then keeps it inside bounds, which is
  // anything with x, y, width and height (a Room works). Whole pixels only, so tiles never
  // land between two screen pixels.
  follow(targetX, targetY, bounds) {
    this.x = Camera.clampAxis(targetX - this.viewWidth / 2, bounds.x, bounds.width, this.viewWidth);
    this.y = Camera.clampAxis(targetY - this.viewHeight / 2, bounds.y, bounds.height, this.viewHeight);
  }

  // Back to the top-left of the screen, for areas that fit on one screen and don't scroll.
  reset() {
    this.x = 0;
    this.y = 0;
  }

  // Where the view's left (or top) edge goes on one axis. wanted is where it would go to center
  // on the target; start and size describe the area, and view is the screen's size.
  static clampAxis(wanted, start, size, view) {
    if (size <= view) {
      return Math.round(start + (size - view) / 2);
    }
    return Math.round(Math.min(Math.max(wanted, start), start + size - view));
  }
}
