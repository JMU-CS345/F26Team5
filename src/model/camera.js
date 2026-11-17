// Camera math for the zoomed world. A camera is the world position of the top-left corner
// of the screen. The screen shows viewW x viewH world pixels, which is the canvas size
// divided by the zoom. No p5 drawing calls, so Jasmine can test it without a canvas.

const WORLD_ZOOM = 2;

// A camera that centers on (targetX, targetY).
function cameraFollow(targetX, targetY, viewW, viewH) {
  return { x: targetX - viewW / 2, y: targetY - viewH / 2 };
}

// Keeps a camera inside the bounds { x, y, w, h }. If the bounds are smaller than the view
// on one axis, the bounds are centered on that axis instead.
function cameraClamp(camera, viewW, viewH, bounds) {
  return {
    x: clampAxis(camera.x, viewW, bounds.x, bounds.w),
    y: clampAxis(camera.y, viewH, bounds.y, bounds.h)
  };
}

function clampAxis(value, viewSize, boundsStart, boundsSize) {
  if (boundsSize <= viewSize) {
    return boundsStart + (boundsSize - viewSize) / 2;
  }
  return Math.min(Math.max(value, boundsStart), boundsStart + boundsSize - viewSize);
}

// Follows a target and stays inside the bounds. Rounded to whole world pixels so the art
// never lands between pixels while the camera moves.
function cameraFor(targetX, targetY, viewW, viewH, bounds) {
  const followed = cameraFollow(targetX, targetY, viewW, viewH);
  const clamped = cameraClamp(followed, viewW, viewH, bounds);
  return { x: Math.round(clamped.x), y: Math.round(clamped.y) };
}

function worldToScreen(worldX, worldY, camera, zoom) {
  return { x: (worldX - camera.x) * zoom, y: (worldY - camera.y) * zoom };
}

function screenToWorld(screenX, screenY, camera, zoom) {
  return { x: screenX / zoom + camera.x, y: screenY / zoom + camera.y };
}
