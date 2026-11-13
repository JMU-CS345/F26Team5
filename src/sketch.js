// 640x480 is a multiple of 16, so the room can use 16x16 wall tiles.
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
let game;
let player;
let projectiles = [];
let enemyProjectiles = [];
let nextSpawnIndex = 0;
let restartButton;
let classButtons = [];
let room;
let npcs = [];
let roomGraphic;
let restartShown = false;
let modelButtons = [];
//temp
const ROOM_WIDTH = 640;
const ROOM_HEIGHT = 400;
const ROOM_X = 0;
const ROOM_Y = 80;

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
    createEnemy("Jelly", 112, 112),
    createEnemy("Zombie", 480, 416),
    createEnemy("Skeleton", 520, 160),
    createEnemy("Bat", 256, 144),
    createEnemy("Eyeball", 48, 336)
  ];
  nextSpawnIndex = ENEMY_TYPE_NAMES.indexOf("Demon");
  projectiles = [];
  enemyProjectiles = [];
  npcs = [];
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
    button.size(MODEL_BUTTON_W, 60);
    button.position(modelSlotCenterX(i) - MODEL_BUTTON_W / 2, MODEL_BUTTON_Y);
    button.style("background-color", "rgb(90, 90, 110)");
    button.style("color", "white");
    button.style("font-size", "18px");
    button.mousePressed(() => chooseModel(name));
    modelButtons.push(button);
  });
}

function makeClassButtons() {
  const buttonWidth = 140;
  const gap = 20;
  const totalWidth = MAGE_CLASSES.length * buttonWidth + (MAGE_CLASSES.length - 1) * gap;
  const left = CANVAS_WIDTH / 2 - totalWidth / 2;
  MAGE_CLASSES.forEach((mageClass, i) => {
    const button = createButton(i + 1 + ". " + mageClass);
    button.size(buttonWidth, 60);
    button.position(left + i * (buttonWidth + gap), CANVAS_HEIGHT / 2 - 10);
    button.style("background-color", "rgb(" + CLASS_COLORS[mageClass].join(",") + ")");
    button.style("color", "white");
    button.style("font-size", "18px");
    button.mousePressed(() => chooseClass(mageClass));
    classButtons.push(button);
  });
}

async function setup() {
  await loadPlayerSheets();
  await loadTileImages();
  await loadEnemySheets();
  await loadNPCAssets();
  createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  noSmooth();
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
  restartButton.size(140, 40);
  restartButton.position(CANVAS_WIDTH / 2 - 70, CANVAS_HEIGHT / 2 + 20);
  restartButton.mousePressed(showMenu);
  restartButton.hide();
  makeClassButtons();
  for (const button of classButtons) {
    button.hide(); // the class menu comes after the model screen
  }
  makeModelButtons();
}

function draw() {
  background(0);
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
  removeDeadEnemies(room);

  for (const p of projectiles) {
    drawProjectile(p);
  }
  for (const p of enemyProjectiles) {
    drawEnemyProjectile(p);
  }
  drawPlayer(player);
  for (const npc of npcs) {
    drawNPC(npc);
    drawDialogueBox(npc);
  }
  for (const e of room.enemies) {
    drawEnemy(e);
  }
  if (!room.cleared && room.enemies.every((e) => e.isDead())) {
    room.onClear();
  }
  drawHealthBar(player);
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

// Testing aid, press E: spawns the next enemy type somewhere on the floor, away from the player.
function spawnNextEnemy() {
  const typeName = ENEMY_TYPE_NAMES[nextSpawnIndex % ENEMY_TYPE_NAMES.length];
  nextSpawnIndex++;
  for (let tries = 0; tries < 50; tries++) {
    const enemy = createEnemy(
      typeName,
      random(room.x, room.x + room.width),
      random(room.y, room.y + room.height)
    );
    const far = p5.Vector.dist(enemy.getCenter(), player.getCenter()) > 150;
    if (far && !room.collidesWithWall(enemy.getBounds())) {
      room.enemies.push(enemy);
      room.cleared = false;
      return;
    }
  }
}

// Testing aid, press N: spawns an NPC on open floor near the player.
function spawnNPC() {
  for (let tries = 0; tries < 50; tries++) {
    const x = random(room.x + room.tileSize, room.x + room.width - room.tileSize - NPC_LENGTH);
    const y = random(room.y + room.tileSize, room.y + room.height - room.tileSize - NPC_WIDTH);
    const npc = new NPC(x, y);
    if (!room.collidesWithWall({ x: npc.pos.x, y: npc.pos.y, w: npc.length, h: npc.width })) {
      npcs.push(npc);
      return;
    }
  }
}

function keyPressed() {
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
  if (game.isPlaying() && key.toLowerCase() === "n") {
    spawnNPC();
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
