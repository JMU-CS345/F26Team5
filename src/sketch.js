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
let dungeon;
let room; // the room the player is in right now
let roomGraphic; // the picture of that room
let roomGraphics = new Map(); // room id -> picture, built the first time the room is entered
let restartShown = false;
let modelButtons = [];
//temp
const ROOM_WIDTH = 640;
const ROOM_HEIGHT = 400;
const ROOM_X = (CANVAS_WIDTH - ROOM_WIDTH) / 2;
const ROOM_Y = (CANVAS_HEIGHT - ROOM_HEIGHT) / 2;
const DUNGEON_ROOM_COUNT = 10;
let pageScale = 1; // set by fitToWindow(), also used to line up the page background
let pageLeft = 0;
let pageTop = 0;

// Makes the picture of a room the first time it is needed, and reuses it after that.
function getRoomGraphic(r) {
  if (!roomGraphics.has(r.id)) {
    roomGraphics.set(r.id, buildRoomGraphic(r));
  }
  return roomGraphics.get(r.id);
}

// Moves the game into a room. Shots in flight don't follow the player through a door.
function enterRoom(r) {
  room = r;
  roomGraphic = getRoomGraphic(r);
  projectiles = [];
  enemyProjectiles = [];
  room.onEnter();
}

// Walks the player through an exit into the next room.
function useExit(exit) {
  const next = dungeon.rooms[exit.toId];
  const spot = dungeon.entryPoint(room, exit);
  enterRoom(next);
  player.pos.set(spot.x - player.length / 2, spot.y - player.width / 2);
}

// TEMPORARY: a few random enemies on the floor, until room files (#13) place enemies.
function fillRoomTemp(r) {
  const names = ["Jelly", "Zombie", "Skeleton", "Bat", "Eyeball"];
  const count = r.role === "boss" ? 5 : 2 + Math.floor(random(3));
  for (let n = 0; n < count; n++) {
    for (let tries = 0; tries < 50; tries++) {
      const enemy = createEnemy(
        random(names),
        random(r.x + r.tileSize, r.x + r.width - 2 * r.tileSize),
        random(r.y + r.tileSize, r.y + r.height - 2 * r.tileSize)
      );
      if (!r.collidesWithWall(enemy.getBounds())) {
        r.enemies.push(enemy);
        break;
      }
    }
  }
}

// Makes a fresh player with the class picked on the menu.
function startRun() {
  for (const g of roomGraphics.values()) {
    g.remove(); // free the old dungeon's pictures
  }
  roomGraphics.clear();
  dungeon = generateDungeon({
    roomCount: DUNGEON_ROOM_COUNT,
    screenX: ROOM_X,
    screenY: ROOM_Y
  });
  console.log("Dungeon seed:", dungeon.seed); // pass this as seed to replay a dungeon
  enterRoom(dungeon.start);
  const spawn = room.getPlayerSpawn(); // the @ in the start room's drawing
  player = new Player(
    spawn.x - PLAYER_LENGTH / 2,
    spawn.y - PLAYER_WIDTH / 2,
    game.selectedClass,
    game.selectedModel
  );
  nextSpawnIndex = ENEMY_TYPE_NAMES.indexOf("Demon");
  projectiles = [];
  enemyProjectiles = [];
  clearDyingEnemies();
  room.cleared = false;
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
  // Standing in a door tile means the player is leaving the room. This is checked before
  // drawing, so the new room is drawn on the same frame the player arrives.
  if (!player.isDead()) {
    const center = player.getCenter();
    const exit = room.getExitAt(center.x, center.y);
    if (exit) {
      useExit(exit);
    }
  }
  drawRoom(room, roomGraphic);

  player.move(getMoveDirection(keyIsDown), room);

  if (!player.isDead()) {
    for (const e of room.enemies) {
      e.update(player, room);
      e.damagePlayer(player);
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
  for (const dead of removeDeadEnemies(room)) {
    startEnemyDeath(dead);
  }

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
  drawClassLabel(player.mageClass);
  drawMinimap(dungeon, room);
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
