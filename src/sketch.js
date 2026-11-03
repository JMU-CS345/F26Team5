// 640x480 is a multiple of 16, so the room can use 16x16 wall tiles.
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
let player;

function setup() {
  createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  frameRate(60); // movement is pixels per frame, so keep the frame rate fixed
  player = new Player(CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, CANVAS_HEIGHT / 2 - PLAYER_SIZE / 2);
}

function draw() {
  background(0);
  player.move(getMoveDirection(keyIsDown), { width: width, height: height });
  drawPlayer(player);
}
