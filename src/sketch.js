// 640x480 is a multiple of 16, so the room can use 16x16 wall tiles.
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
let player;
let projectiles = [];
let restartButton;
let room;
//temp
const ROOM_WIDTH = 576;
const ROOM_HEIGHT = 400;
const ROOM_X = 32;
const ROOM_Y = 64;

// Makes a fresh player. Called at launch and on restart.
// When the class menu (#5) lands, apply the chosen class here.
function startRun() {
  player = new Player(
    CANVAS_WIDTH / 2 - PLAYER_LENGTH / 2,
    CANVAS_HEIGHT / 2 - PLAYER_WIDTH / 2
  );
  projectiles = [];
  restartButton.hide();
}

function setup() {
  createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  frameRate(60); // movement is pixels per frame, so keep the frame rate fixed
  room = new NormalRoom(ROOM_WIDTH, ROOM_HEIGHT); // makes the room rather than being made after every frame
  restartButton = createButton("Restart");
  restartButton.size(140, 40);
  restartButton.position(CANVAS_WIDTH / 2 - 70, CANVAS_HEIGHT / 2 + 20);
  restartButton.mousePressed(startRun);
  startRun();
}

function draw() {
  background(0);
  drawRoom(room); // draws room before eveyerhting
  const area = {
    width: width,
    height: height
  };
  player.move(getMoveDirection(keyIsDown), area);
  const proj = player.fire(getFireDirection(keyIsDown));
  if (proj) {
    projectiles.push(proj);
  }
  player.update();
  for (const p of projectiles) {
    p.update(area, room, ROOM_X, ROOM_Y);
  }
  projectiles = projectiles.filter((p) => p.alive);
  for (const p of projectiles) {
    drawProjectile(p);
  }
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
  if (
    keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW ||
    keyCode === UP_ARROW || keyCode === DOWN_ARROW
  ) {
    return false;
  }
}
