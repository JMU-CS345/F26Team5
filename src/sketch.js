// The game screen is always 1280x720. fitToWindow() scales the whole page to fit the browser
// window, so zooming or resizing never changes how much of the game you can see.
// The room stays 640x400 (a multiple of 16 for the wall tiles) in the middle of it.
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
let game;
let player;
let projectiles = [];
let enemyProjectiles = [];
let debugOverlay = false; // F3 toggles hitboxes and detection circles for enemies
let nextSpawnIndex = 0;
let restartButton;
let classButtons = [];
let room;
let roomGraphic;
let restartShown = false;
let modelButtons = [];
//temp
const ROOM_WIDTH = 640;
const ROOM_HEIGHT = 400;
const ROOM_X = (CANVAS_WIDTH - ROOM_WIDTH) / 2;
const ROOM_Y = (CANVAS_HEIGHT - ROOM_HEIGHT) / 2;
let pageScale = 1; // set by fitToWindow(), also used to line up the page background
let pageLeft = 0;
let pageTop = 0;

// Makes a fresh player with the class picked on the menu.
function startRun() {
  roomGraphic = buildRoomGraphic(room);
  player = new Player(
    ROOM_X + ROOM_WIDTH / 2 - PLAYER_LENGTH / 2,
    ROOM_Y + ROOM_HEIGHT / 2 - PLAYER_WIDTH / 2,
    game.selectedClass,
    game.selectedModel
  );
  // TEMPORARY: a starter mix until room files (#13) place enemies. Press E for more.
  room.enemies = [
    createEnemy("Jelly", ROOM_X + 112, ROOM_Y + 32, true),
    createEnemy("Zombie", ROOM_X + 480, ROOM_Y + 336, true),
    createEnemy("Skeleton", ROOM_X + 520, ROOM_Y + 80, true),
    createEnemy("Bat", ROOM_X + 256, ROOM_Y + 64, true),
    createEnemy("Eyeball", ROOM_X + 48, ROOM_Y + 256, true),
    createEnemy("Bouncer", ROOM_X + 560, ROOM_Y + 200, true),
    createEnemy("SparkBark", ROOM_X + 80, ROOM_Y + 120, true)
  ];
  nextSpawnIndex = ENEMY_TYPE_NAMES.indexOf("Demon");
  projectiles = [];
  enemyProjectiles = [];
  clearDyingEnemies();
  room.cleared = false;
  room.bossDefeated = false;
  restartShown = false;
  restartButton.hide();
  for (const button of classButtons) {
    button.hide();
  }
}

// Picks a class on the menu and starts the run.
function chooseClass(mageClass) {
  if (game.selectClass(mageClass)) {
    startRun();
  }
}

// Picks a playermodel in the character creator and moves on to the class menu.
function chooseModel(modelName) {
  if (game.selectModel(modelName)) {
    for (const button of modelButtons) {
      button.hide();
    }
    for (const button of classButtons) {
      button.show();
    }
  }
}

// Ends the run and goes back to the start of the character creator.
function showMenu() {
  if (!game.newRun()) {
    return;
  }
  restartButton.hide();
  for (const button of modelButtons) {
    button.show();
  }
}

function makeModelButtons() {
  PLAYER_MODEL_NAMES.forEach((name, i) => {
    const button = createButton(i + 1 + ". " + name);
    button.size(MODEL_BUTTON_W, MENU_BUTTON_H);
    button.position(modelSlotCenterX(i) - MODEL_BUTTON_W / 2, modelButtonY());
    button.style("background-color", "rgb(90, 90, 110)");
    button.style("color", "white");
    button.style("font-size", "24px");
    button.mousePressed(() => chooseModel(name));
    modelButtons.push(button);
  });
}

function makeClassButtons() {
  const buttonWidth = MODEL_BUTTON_W;
  const gap = MODEL_BUTTON_GAP;
  const totalWidth = MAGE_CLASSES.length * buttonWidth + (MAGE_CLASSES.length - 1) * gap;
  const left = CANVAS_WIDTH / 2 - totalWidth / 2;
  MAGE_CLASSES.forEach((mageClass, i) => {
    const button = createButton(i + 1 + ". " + mageClass);
    button.size(buttonWidth, MENU_BUTTON_H);
    button.position(left + i * (buttonWidth + gap), CANVAS_HEIGHT / 2 - 10);
    button.style("background-color", "rgb(" + CLASS_COLORS[mageClass].join(",") + ")");
    button.style("color", "white");
    button.style("font-size", "24px");
    button.mousePressed(() => chooseClass(mageClass));
    classButtons.push(button);
  });
}

async function setup() {
  await loadPlayerSheets();
  await loadTileImages();
  await loadEnemySheets();
  createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  fitToWindow();
  noSmooth();
  buildBackground();
  frameRate(60); // movement is pixels per frame, so keep the frame rate fixed
  room = new NormalRoom(ROOM_X, ROOM_Y, ROOM_WIDTH, ROOM_HEIGHT);
  // TEMPORARY: one of each new tile, to check the art. Delete once real rooms exist.
  room.tileGrid[8][10] = TILE.PIT;
  room.tileGrid[0][20] = TILE.DOOR_CLOSED;
  room.tileGrid[12][8] = TILE.INTERIOR_WALL;
  for (let r = 1; r <= 3; r++) {
    for (let c = 24; c <= 26; c++) {
      room.tileGrid[r][c] = TILE.WALL; // a bump on the north wall, to check the outside corners
    }
  }
  game = new Game();
  restartButton = createButton("Restart");
  restartButton.size(220, 64);
  restartButton.style("font-size", "24px");
  restartButton.position(CANVAS_WIDTH / 2 - 110, CANVAS_HEIGHT / 2 + 30);
  restartButton.mousePressed(showMenu);
  restartButton.hide();
  makeClassButtons();
  for (const button of classButtons) {
    button.hide(); // the class menu comes after the model screen
  }
  makeModelButtons();
}

// Scales the whole page (canvas and buttons) to fit the window and centers it.
// Runs on load and whenever the window changes size, which includes browser zoom.
function fitToWindow() {
  pageScale = min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT);
  pageLeft = (window.innerWidth - CANVAS_WIDTH * pageScale) / 2;
  pageTop = (window.innerHeight - CANVAS_HEIGHT * pageScale) / 2;
  document.body.style.transform =
    "translate(" + pageLeft + "px, " + pageTop + "px) scale(" + pageScale + ")";
}

function windowResized() {
  fitToWindow();
}

function draw() {
  background(0);
  updateBackground();
  drawBackground();
  if (game.isModelSelect()) {
    drawModelMenu();
    return;
  }
  if (game.isMenu()) {
    drawClassMenu();
    return;
  }
  drawRoom(room, roomGraphic);

  player.move(getMoveDirection(keyIsDown), room);

  if (!player.isDead()) {
    for (const e of room.enemies) {
      e.update(player, room);
      e.damagePlayer(player);
      e.meleeHit(player);
      for (const shot of e.tryAttack(player)) {
        enemyProjectiles.push(shot);
      }
    }
  }

  const proj = player.fire(getFireDirection(keyIsDown));
  if (proj) {
    projectiles.push(proj);
  }
  player.update();

  for (const p of projectiles) {
    p.update(room);
    for (const e of room.enemies) {
      e.damageFromProjectile(p);
    }
  }
  projectiles = projectiles.filter((p) => p.alive);

  for (const p of enemyProjectiles) {
    p.update(room);
    projectileHitsPlayer(p, player);
  }
  enemyProjectiles = enemyProjectiles.filter((p) => p.alive);
  handleDeadEnemies(removeDeadEnemies(room));

  for (const p of projectiles) {
    drawProjectile(p);
  }
  for (const p of enemyProjectiles) {
    drawEnemyProjectile(p);
  }
  drawPlayer(player);
  for (const e of room.enemies) {
    drawEnemy(e);
    if (debugOverlay) {
      drawEnemyDebug(e);
    }
  }
  drawDyingEnemies();
  if (!room.cleared && room.enemies.every((e) => e.isDead())) {
    room.onClear();
  }
  drawHealthBar(player);
  drawFirstBossBar();
  drawClassLabel(player.mageClass);
  if (player.showDeathScreen()) {
    game.playerDied();
  }
  if (game.isDead()) {
    drawDeathScreen();
    if (!restartShown) {
      restartButton.show();
      restartShown = true;
    }
  }
}

// Vincent's room code hooks door unlock and exit here, and Nick's loot hooks
// enemy.type.lootTable here.
function handleDeadEnemies(dead) {
  for (const enemy of dead) {
    startEnemyDeath(enemy);
  }
  if (findDeadBosses(dead).length > 0) {
    room.bossDefeated = true;
  }
}

// Only one boss bar shows, even if several bosses are alive.
function drawFirstBossBar() {
  const boss = room.enemies.find((e) => e.type.boss && !e.isDead());
  if (boss) {
    drawBossBar(boss);
  }
}

// Testing aids: press E to spawn enemies, F3 to toggle the enemy debug overlay.
// Press E: spawns the next enemy type somewhere on the floor, away from the player.
function spawnNextEnemy() {
  const typeName = ENEMY_TYPE_NAMES[nextSpawnIndex % ENEMY_TYPE_NAMES.length];
  nextSpawnIndex++;
  for (let tries = 0; tries < 50; tries++) {
    const enemy = createEnemy(
      typeName,
      random(room.x, room.x + room.width),
      random(room.y, room.y + room.height),
      true
    );
    const far = p5.Vector.dist(enemy.getCenter(), player.getCenter()) > 150;
    if (far && !room.collidesWithWall(enemy.getBounds())) {
      room.enemies.push(enemy);
      room.cleared = false;
      return;
    }
  }
}

function keyPressed() {
  if (keyCode === 114) {
    debugOverlay = !debugOverlay;
    return false;
  }
  if (game.isModelSelect()) {
    chooseModel(getModelForKey(key));
    return;
  }
  if (game.isMenu()) {
    chooseClass(getClassForKey(key));
    return;
  }
  if (game.isPlaying() && key.toLowerCase() === "e") {
    spawnNextEnemy();
  }
  // Temporary damage key for testing the death screen, commented out currently.
  // if (key === "h") {
    //player.takeDamage(1);
  //}
  if (game.isDead() && keyCode === ENTER) {
    showMenu();
  }
  if (
    keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW ||
    keyCode === UP_ARROW || keyCode === DOWN_ARROW
  ) {
    return false;
  }
}
