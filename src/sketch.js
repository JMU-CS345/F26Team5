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
let inventoryDrag = null;
let inventorySelection = null;
let inventoryInfoLines = [];
let resumeInputBlocked = false;
let activeDialogue;
let setupDone = false; // draw() waits for this, because setup() loads art with await
//temp
const ROOM_WIDTH = 640;
const ROOM_HEIGHT = 400;
const ROOM_X = (CANVAS_WIDTH - ROOM_WIDTH) / 2;
const ROOM_Y = (CANVAS_HEIGHT - ROOM_HEIGHT) / 2;
const NPC_TOP_RIGHT_X = ROOM_X + ROOM_WIDTH - 48;
const NPC_TOP_RIGHT_Y = ROOM_Y + 32;
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
  playMusic();
  const spawn = room.getPlayerSpawn(); // the @ in the start room's drawing
  player = new Player(
    spawn.x - PLAYER_LENGTH / 2,
    spawn.y - PLAYER_WIDTH / 2,
    game.selectedClass,
    game.selectedModel
  );
  // Placeholder pickups until room data supplies item placement.
  room.items = [
    new ItemDrop(spawn.x - 48, spawn.y - 48, new ProjectileWeapon({
      id: "training-wand",
      name: "Training Wand",
      damage: 2,
      element: game.selectedClass,
      description: "A simple wand for apprentice mages."
    })),
    new ItemDrop(spawn.x + 48, spawn.y - 48, new ChestArmor({
      id: "apprentice-robe",
      name: "Apprentice Robe",
      defense: 1,
      description: "A light robe with basic protection."
    })),
    new ItemDrop(spawn.x - 48, spawn.y + 48, new Consumable({
      id: "health-potion",
      name: "Health Potion",
      maxStackSize: 5,
      healthRestore: 2,
      description: "A small restorative potion."
    })),
    new ItemDrop(spawn.x + 48, spawn.y + 48, new Gold(), 25)
  ];
  nextSpawnIndex = ENEMY_TYPE_NAMES.indexOf("Demon");
  projectiles = [];
  enemyProjectiles = [];
  clearDyingEnemies();
  inventoryDrag = null;
  inventorySelection = null;
  inventoryInfoLines = [];
  resumeInputBlocked = false;
  activeDialogue.close();
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
    playSfx("menu");
    startRun();
  }
}

// Picks a playermodel in the character creator and moves on to the class menu.
function chooseModel(modelName) {
  if (game.selectModel(modelName)) {
    playSfx("menu");
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
  if (activeDialogue) {
    activeDialogue.close();
  }
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
  await loadItemSprites();
  createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  fitToWindow();
  noSmooth();
  buildBackground();
  frameRate(60); // movement is pixels per frame, so keep the frame rate fixed
  game = new Game();
  activeDialogue = new DialogueBox();
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
  setupDone = true;
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

// This p5 build reports pointer offsets after the page's CSS scale is applied.
// Convert them back to the fixed 1280x720 canvas coordinates used by every HUD layout.
function canvasPointer() {
  const scale = pageScale > 0 ? pageScale : 1;
  return { x: mouseX / scale, y: mouseY / scale };
}

function draw() {
  // p5 starts calling draw() while the async setup() is still loading images. If draw()
  // throws, p5 stops its loop for good, so nothing is ever drawn (only the DOM buttons
  // exist). Skip frames until setup() has finished.
  if (!setupDone) {
    return;
  }
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
  if (game.isInventory()) {
    const pointer = canvasPointer();
    drawRoom(room, roomGraphic);
    drawRunScene();
    drawInventoryMenu(
      player.inventory,
      player,
      inventoryDrag,
      inventorySelection,
      inventoryInfoLines,
      pointer.x,
      pointer.y
    );
    drawInventoryHudButton(true);
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

  const heldInputBlocked = resumeInputBlocked && isGameplayInputHeld(keyIsDown);
  if (resumeInputBlocked && !heldInputBlocked) {
    resumeInputBlocked = false;
  }
  if (!activeDialogue.isActive()) {
    player.move(
      heldInputBlocked ? new p5.Vector(0, 0) : getMoveDirection(keyIsDown),
      room
    );
  } else {
    player.walkFrames = 0;
  }
  for (const drop of room.items) {
    drop.update();
  }
  if (pickupItemDrops(player, room).length > 0) {
    playSfx("pickup");
  }

  const healthBeforeHits = player.health;
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

  if (!activeDialogue.isActive()) {
    const proj = player.fire(
      heldInputBlocked ? new p5.Vector(0, 0) : getFireDirection(keyIsDown)
    );
    if (proj) {
      projectiles.push(proj);
      playSfx("shoot");
    }
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
  if (player.health < healthBeforeHits) {
    playSfx("hurt");
  }
  handleDeadEnemies(removeDeadEnemies(room));

  drawRunScene();
  if (!room.cleared && room.enemies.every((e) => e.isDead())) {
    room.onClear();
  }
  if (player.showDeathScreen()) {
    activeDialogue.close();
    game.playerDied();
    playSfx("death");
  }
  if (game.isDead()) {
    drawDeathScreen();
    if (!restartShown) {
      restartButton.show();
      restartShown = true;
    }
  }
}

function drawRunScene() {
  for (const drop of room.items) {
    drawItemDrop(drop);
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
  for (const npc of room.npcs) {
    drawNpc(npc, player, activeDialogue.isActive());
  }
  drawDyingEnemies(!game.isInventory());
  drawHealthBar(player);
  drawGoldHud(player.inventory);
  drawFirstBossBar();
  drawClassLabel(player.mageClass);
  drawMinimap(dungeon, room);
  if (game.isPlaying() || game.isInventory()) {
    drawInventoryHudButton(game.isInventory());
  }
  drawDialogueBox(activeDialogue, room.x, room.y, room.width, room.height);
}

function clearInventoryUiState() {
  inventoryDrag = null;
  inventorySelection = null;
  inventoryInfoLines = [];
}

function toggleInventoryMenu() {
  const wasInventoryOpen = game.isInventory();
  if (!toggleInventoryFromControl(game)) {
    return false;
  }
  clearInventoryUiState();
  if (wasInventoryOpen) {
    resumeInputBlocked = true;
  }
  return true;
}

// Vincent's room code hooks door unlock and exit here, and Nick's loot hooks
// enemy.type.lootTable here.
function handleDeadEnemies(dead) {
  for (const enemy of dead) {
    startEnemyDeath(enemy);
  }
  if (dead.length > 0) {
    playSfx("death");
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

// Creates the test Elder NPC in the top right of the room.
function createTopRightNpc() {
  return new Npc(NPC_TOP_RIGHT_X, NPC_TOP_RIGHT_Y, "Elder", [
    "Greetings, traveler! The dungeons ahead are perilous.",
    "Keep your distance from skeletons and watch for swift bats.",
    "May your arcane magic guide your journey. Good luck!"
  ]);
}

// Toggles spawning/despawning the Elder NPC in the top right.
function toggleTopRightNpc() {
  const existingIndex = room.npcs.findIndex((n) => n.name === "Elder");
  if (existingIndex !== -1) {
    room.npcs.splice(existingIndex, 1);
    if (activeDialogue.isActive() && activeDialogue.getSpeakerName() === "Elder") {
      activeDialogue.close();
    }
  } else {
    room.npcs.push(createTopRightNpc());
  }
}

function keyPressed() {
  playMusic(); // browsers only allow audio after a key press, so the first one starts the loop
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
  if ((game.isPlaying() || game.isInventory()) && key.toLowerCase() === "i") {
    toggleInventoryMenu();
    return false;
  }
  if (game.isInventory()) {
    if (keyCode === ESCAPE) {
      inventorySelection = null;
      inventoryInfoLines = [];
    }
    return false;
  }
  if (game.isPlaying()) {
    if (key.toLowerCase() === "n") {
      toggleTopRightNpc();
      return false;
    }
    // Interaction: Space (32) or F
    if (keyCode === 32 || key.toLowerCase() === "f") {
      if (activeDialogue.isActive()) {
        activeDialogue.advance();
        return false;
      }
      const nearbyNpc = room.npcs.find((n) => n.isPlayerNear(player));
      if (nearbyNpc) {
        activeDialogue.start(nearbyNpc);
        return false;
      }
    }
    if (key.toLowerCase() === "e") {
      spawnNextEnemy();
    }
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
    keyCode === UP_ARROW || keyCode === DOWN_ARROW ||
    keyCode === 32
  ) {
    return false;
  }
}

function mousePressed() {
  const pointer = canvasPointer();
  if ((game.isPlaying() || game.isInventory())
      && inventoryHudButtonAt(pointer.x, pointer.y)) {
    toggleInventoryMenu();
    return false;
  }
  if (!game.isInventory()) {
    return;
  }

  const contextAction = inventoryContextActionAt(
    player.inventory,
    player,
    inventorySelection,
    pointer.x,
    pointer.y
  );
  if (contextAction !== null) {
    const result = performInventoryContextAction(
      player.inventory,
      player,
      inventorySelection,
      contextAction.id
    );
    inventoryInfoLines = result.infoLines;
    if (result.success && contextAction.id !== "view") {
      inventorySelection = null;
    }
    inventoryDrag = null;
    return false;
  }

  if (inventorySelectionAt(player.inventory, pointer.x, pointer.y) === null) {
    inventorySelection = null;
    inventoryInfoLines = [];
  }
  inventoryDrag = beginInventoryDrag(player.inventory, pointer.x, pointer.y);
  return false;
}

function mouseReleased() {
  if (!game.isInventory() || inventoryDrag === null) {
    inventoryDrag = null;
    return;
  }
  const pointer = canvasPointer();
  if (inventoryDragMoved(inventoryDrag, pointer.x, pointer.y)) {
    finishInventoryDrag(player.inventory, inventoryDrag, pointer.x, pointer.y);
    inventorySelection = null;
    inventoryInfoLines = [];
  } else {
    inventorySelection = inventorySelectionAt(
      player.inventory,
      inventoryDrag.startX,
      inventoryDrag.startY
    );
    inventoryInfoLines = [];
  }
  inventoryDrag = null;
  return false;
}
