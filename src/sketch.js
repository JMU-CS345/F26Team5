// 640x480 is a multiple of 16, so the room can use 16x16 wall tiles.
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
let player;
let restartButton;

// Makes a fresh player. Called at launch and on restart.
// When the class menu (#5) lands, apply the chosen class here.
function startRun() {
  player = new Player(CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, CANVAS_HEIGHT / 2 - PLAYER_SIZE / 2);
  restartButton.hide();
}

function setup() {
  createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  frameRate(60); // movement is pixels per frame, so keep the frame rate fixed
  restartButton = createButton("Restart");
  restartButton.size(140, 40);
  restartButton.position(CANVAS_WIDTH / 2 - 70, CANVAS_HEIGHT / 2 + 20);
  restartButton.mousePressed(startRun);
  startRun();
}

function draw() {
  background(0);
  player.move(getMoveDirection(keyIsDown), { width: width, height: height });
  player.update();
  drawPlayer(player);
  drawHealthBar(player);
  if (player.showDeathScreen()) {
    drawDeathScreen();
    restartButton.show();
  }
}

function keyPressed() {
  // TEMPORARY: no enemy yet, so H hurts the player for testing. Remove once #3 merges.
  if (key === "h") {
    player.takeDamage(1);
  }
  if (player.showDeathScreen() && keyCode === ENTER) {
    startRun();
  }
}
