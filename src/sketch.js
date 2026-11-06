// 640x480 is a multiple of 16, so the room can use 16x16 wall tiles.
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
let player;
let enemy;
let restartButton;

// Makes a fresh player. Called at launch and on restart.
// When the class menu (#5) lands, apply the chosen class here.
function startRun() {
  player = new Player(CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, CANVAS_HEIGHT / 2 - PLAYER_SIZE / 2);
  enemy = new Enemy(80, 80);
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
  enemy.update(player, { width: width, height: height });
  enemy.damagePlayer(player);
  player.update();
  drawPlayer(player);
  drawEnemy(enemy);
  drawHealthBar(player);
  if (player.showDeathScreen()) {
    drawDeathScreen();
    restartButton.show();
  }
}

function keyPressed() {
  // Temporary damage key for testing the death screen.
  if (key === "h") {
    player.takeDamage(1);
  }
  if (player.showDeathScreen() && keyCode === ENTER) {
    startRun();
  }
}
