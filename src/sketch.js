// The game screen is always 1280x720. fitToWindow() scales the whole page to fit the browser
// window, so zooming or resizing never changes how much of the game you can see.
// The room stays 640x400 (a multiple of 16 for the wall tiles) in the middle of it.
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
let game;
let run; // the run in progress: run.player, run.room, run.dungeon and the shots (model/run.js)
let overworlds; // the three big outdoor areas of the run, in order (model/overworld.js)
let camera; // which part of the overworld the screen shows (model/camera.js)
let restartButton;
let roomGraphics = new Map(); // room -> { graphic, version }, the room's picture and the room.tileVersion it shows
let restartShown = false;
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
const DUNGEON_ROOM_COUNT = 10;
let pageScale = 1; // set by fitToWindow(), also used to line up the page background
let pageLeft = 0;
let pageTop = 0;

// Makes the picture of a room the first time it is needed and reuses it after that. If a tile
// has changed since (a door opened or closed), the picture is made again.
function getRoomGraphic(r) {
  const cached = roomGraphics.get(r);
  if (cached && cached.version === r.tileVersion) {
    return cached.graphic;
  }
  if (cached) {
    cached.graphic.remove();
  }
  const graphic = buildRoomGraphic(r);
  roomGraphics.set(r, { graphic, version: r.tileVersion });
  return graphic;
}

// Frees the pictures of every room except the ones in keepRooms (a list), or all of them if it is
// null. A freed picture is built again the next time its room is drawn.
function releaseRoomGraphics(keepRooms) {
  for (const [room, cached] of roomGraphics) {
    if (!keepRooms || !keepRooms.includes(room)) {
      cached.graphic.remove();
      roomGraphics.delete(room);
    }
  }
}

// Makes the dungeon for the overworld the player is entering it from (the first overworld has the
// first dungeon, and so on), with its starting pickups. The run calls this the first time the
// player walks onto the dungeon entrance in an overworld.
function makeDungeon(entrance, fromOverworld) {
  releaseRoomGraphics(overworlds); // the last dungeon's pictures go, the overworlds' stay
  const dungeon = generateDungeonFor(fromOverworld.index, { screenX: ROOM_X, screenY: ROOM_Y });
  console.log(dungeon.name + " seed:", dungeon.seed); // pass this as seed to replay a dungeon
  const spawn = dungeon.start.getPlayerSpawn();
  // Placeholder pickups in the first dungeon, until room data supplies item placement.
  dungeon.start.items = fromOverworld.index > 0 ? [] : [
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
  debugTools.reset();
  clearDyingEnemies();
  return dungeon;
}

// Starts a new run with the class, model and look picked on the menus. It begins in the first
// overworld; each dungeon is made when the player first walks into it.
function startRun() {
  releaseRoomGraphics(null); // free the old run's pictures
  overworlds = createOverworlds(ROOM_X, ROOM_Y); // houses sit where a dungeon room would
  const finalRoom = new FinalRoom(ROOM_X, ROOM_Y);
  finalRoom.tileTint = DUNGEON_DEFINITIONS[DUNGEON_DEFINITIONS.length - 1].tileTint;
  run = new Run(null, game.selectedClass, game.selectedModel, game.appearance, overworlds, makeDungeon, finalRoom);
  updateCamera();
  debugTools.reset();
  clearDyingEnemies();
  inventoryDrag = null;
  inventorySelection = null;
  inventoryInfoLines = [];
  resumeInputBlocked = false;
  activeDialogue.close();
  restartShown = false;
  restartButton.hide();
}

// A key on the playermodel or class screen: A and D move the highlight, Enter or Space picks it.
// Returns true when the key was one of those, so the page does not scroll on Space.
function handleMenuKey(key) {
  const action = getMenuAction(key);
  if (action === null) {
    return false;
  }
  if (action.type === "move") {
    game.moveMenuCursor(action.step);
  } else {
    game.confirmMenuChoice();
  }
  return true;
}

// Ends the character creator and starts the run.
function finishCustomizing() {
  if (game.finishCustomization()) {
    startRun();
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
}

async function setup() {
  await loadPlayerSheets();
  await loadTileImages();
  await loadEnemySheets();
  await loadItemSprites();
  await loadWeaponSprites();
  createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  fitToWindow();
  noSmooth();
  camera = new Camera(CANVAS_WIDTH, CANVAS_HEIGHT);
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
    drawModelMenu(game);
    return;
  }
  if (game.isMenu()) {
    drawClassMenu(game);
    return;
  }
  if (game.isCustomizing()) {
    drawCustomizeMenu(game);
    return;
  }
  if (game.isInventory()) {
    const pointer = canvasPointer();
    updateCamera();
    drawRunScene(run);
    drawInventoryMenu(
      run.player.inventory,
      run.player,
      inventoryDrag,
      inventorySelection,
      inventoryInfoLines,
      pointer.x,
      pointer.y
    );
    drawInventoryHudButton(true);
    return;
  }

  const heldInputBlocked = resumeInputBlocked && isGameplayInputHeld(keyIsDown);
  if (resumeInputBlocked && !heldInputBlocked) {
    resumeInputBlocked = false;
  }
  const none = new p5.Vector(0, 0);
  const dead = run.update({
    move: heldInputBlocked ? none : getMoveDirection(keyIsDown),
    fire: heldInputBlocked ? none : getFireDirection(keyIsDown),
    frozen: activeDialogue.isActive()
  });
  for (const enemy of dead) {
    startEnemyDeath(enemy); // the model has already removed it from the room
  }
  updateCamera();
  drawRunScene(run);
  if (run.player.showDeathScreen()) {
    activeDialogue.close();
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

// Points the camera at the player while they are out in the overworld, which is bigger than the
// screen. A dungeon room always fits on the screen, so there the camera stays put.
function updateCamera() {
  if (run.inOverworld()) {
    const center = run.player.getCenter();
    camera.follow(center.x, center.y, run.room);
  } else {
    camera.reset();
  }
}

// Draws the whole run: the world, then the HUD on top of it.
function drawRunScene(run) {
  drawRunWorld(run);
  drawRunHud(run);
}

// Draws the room and everything standing in it: items, shots, the player, enemies and NPCs.
// Everything here sits at world positions, so it is drawn shifted by the camera.
function drawRunWorld(run) {
  const { player, room } = run;
  push();
  translate(-camera.x, -camera.y);
  drawRoom(room, getRoomGraphic(room));
  for (const drop of room.items) {
    drawItemDrop(drop);
  }
  for (const p of run.projectiles) {
    drawProjectile(p);
  }
  for (const p of run.enemyProjectiles) {
    drawEnemyProjectile(p);
  }
  drawHeldWeapon(player, true); // behind the player when facing up
  drawPlayer(player);
  drawHeldWeapon(player, false);
  drawChargeBar(player);
  for (const e of room.enemies) {
    drawEnemy(e);
    if (debugTools.overlay) {
      drawEnemyDebug(e);
    }
  }
  for (const npc of room.npcs) {
    drawNpc(npc, player, activeDialogue.isActive());
  }
  drawDyingEnemies(!game.isInventory());
  pop();
}

// Draws the HUD, which stays fixed on the screen however the camera moves.
function drawRunHud(run) {
  const { player, room } = run;
  drawHealthBar(player);
  drawGoldHud(player.inventory);
  drawWeaponHud(player);
  drawFirstBossBar(room);
  drawClassLabel(player.mageClass);
  if (run.dungeon) {
    drawMinimap(run.dungeon, room); // there is no dungeon map out in the overworld
  }
  if (game.isPlaying() || game.isInventory()) {
    drawInventoryHudButton(game.isInventory());
  }
  if (run.inOverworld()) {
    // The overworld is bigger than the screen, so the box goes where a room would sit.
    drawDialogueBox(activeDialogue, ROOM_X, ROOM_Y, ROOM_WIDTH, ROOM_HEIGHT);
  } else {
    drawDialogueBox(activeDialogue, room.x, room.y, room.width, room.height);
  }
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

// Only one boss bar shows, even if several bosses are alive.
function drawFirstBossBar(room) {
  const boss = room.enemies.find((e) => e.type.boss && !e.isDead());
  if (boss) {
    drawBossBar(boss);
  }
}

function keyPressed() {
  if (keyCode === 114) {
    debugTools.overlay = !debugTools.overlay;
    return false;
  }
  if (game.isModelSelect() || game.isMenu()) {
    if (handleMenuKey(key)) {
      return false; // Space would scroll the page
    }
    return;
  }
  if (game.isCustomizing()) {
    if (game.isEnteringHex()) {
      // Typing a hex code: the digits, Backspace, Enter and Escape. Space and Backspace would
      // scroll the page or go back, so those are swallowed; other keys are left alone.
      const typed = getHexEntryAction(key);
      if (typed === null) {
        return key === " " ? false : undefined;
      }
      if (typed.type === "digit") {
        game.typeHexDigit(typed.digit);
      } else if (typed.type === "backspace") {
        game.deleteHexDigit();
      } else if (typed.type === "apply") {
        game.confirmHexEntry();
      } else {
        game.cancelHexEntry();
      }
      return false;
    }
    const action = getCustomizeAction(key);
    if (action === null) {
      return; // leave every other key alone (Tab, F5, ...)
    }
    if (action.type === "row") {
      game.moveMenuCursor(action.step);
    } else if (action.type === "color") {
      game.cycleHighlightedColor(action.step);
    } else if (action.type === "hex") {
      game.startHexEntry();
    } else {
      finishCustomizing();
    }
    return false; // Space would scroll the page
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
    if (isWeaponSwitchKey(key) && !activeDialogue.isActive()) {
      run.player.switchWeapon();
      return false;
    }
    if (key.toLowerCase() === "n") {
      toggleTopRightNpc(run, activeDialogue);
      return false;
    }
    // Interaction: Space (32) or F
    if (keyCode === 32 || key.toLowerCase() === "f") {
      if (activeDialogue.isActive()) {
        activeDialogue.advance();
        return false;
      }
      const nearbyNpc = run.room.npcs.find((n) => n.isPlayerNear(run.player));
      if (nearbyNpc) {
        activeDialogue.start(nearbyNpc);
        return false;
      }
    }
    if (key.toLowerCase() === "e") {
      spawnNextEnemy(run);
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
    run.player.inventory,
    run.player,
    inventorySelection,
    pointer.x,
    pointer.y
  );
  if (contextAction !== null) {
    const result = performInventoryContextAction(
      run.player.inventory,
      run.player,
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

  if (inventorySelectionAt(run.player.inventory, pointer.x, pointer.y) === null) {
    inventorySelection = null;
    inventoryInfoLines = [];
  }
  inventoryDrag = beginInventoryDrag(run.player.inventory, pointer.x, pointer.y);
  return false;
}

function mouseReleased() {
  if (!game.isInventory() || inventoryDrag === null) {
    inventoryDrag = null;
    return;
  }
  const pointer = canvasPointer();
  if (inventoryDragMoved(inventoryDrag, pointer.x, pointer.y)) {
    finishInventoryDrag(run.player.inventory, inventoryDrag, pointer.x, pointer.y);
    inventorySelection = null;
    inventoryInfoLines = [];
  } else {
    inventorySelection = inventorySelectionAt(
      run.player.inventory,
      inventoryDrag.startX,
      inventoryDrag.startY
    );
    inventoryInfoLines = [];
  }
  inventoryDrag = null;
  return false;
}
