// The game screen is always 1280x720. fitToWindow() scales the whole page to fit the browser
// window, so zooming or resizing never changes how much of the game you can see.
// The room stays 640x400 (a multiple of 16 for the wall tiles) in the middle of it.
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
let game;
let run; // the dungeon run in progress: run.player, run.room, run.dungeon and the shots (model/run.js)
let restartButton;
let classButtons = [];
let customizeControls = []; // every color picker, hex box and Start, on the customization screen (#23)
let customizeFields = {}; // part -> { picker, input }: the controls of one customization row
let roomGraphics = new Map(); // room id -> { graphic, version }, the room's picture and the room.tileVersion it shows
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
const DUNGEON_ROOM_COUNT = 10;
let pageScale = 1; // set by fitToWindow(), also used to line up the page background
let pageLeft = 0;
let pageTop = 0;

// Makes the picture of a room the first time it is needed and reuses it after that. If a tile
// has changed since (a door opened or closed), the picture is made again.
function getRoomGraphic(r) {
  const cached = roomGraphics.get(r.id);
  if (cached && cached.version === r.tileVersion) {
    return cached.graphic;
  }
  if (cached) {
    cached.graphic.remove();
  }
  const graphic = buildRoomGraphic(r);
  roomGraphics.set(r.id, { graphic, version: r.tileVersion });
  return graphic;
}

// Starts a new dungeon run with the class, model and look picked on the menus.
function startRun() {
  for (const cached of roomGraphics.values()) {
    cached.graphic.remove(); // free the old dungeon's pictures
  }
  roomGraphics.clear();
  const dungeon = generateDungeon({
    roomCount: DUNGEON_ROOM_COUNT,
    screenX: ROOM_X,
    screenY: ROOM_Y
  });
  console.log("Dungeon seed:", dungeon.seed); // pass this as seed to replay a dungeon
  run = new Run(dungeon, game.selectedClass, game.selectedModel, game.appearance);
  const spawn = run.entrySpot;
  // Placeholder pickups until room data supplies item placement.
  run.room.items = [
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
  debugTools.reset();
  clearDyingEnemies();
  inventoryDrag = null;
  inventorySelection = null;
  inventoryInfoLines = [];
  resumeInputBlocked = false;
  activeDialogue.close();
  restartShown = false;
  restartButton.hide();
  for (const button of classButtons) {
    button.hide();
  }
}

// Picks a class on the menu and moves on to the customization screen.
function chooseClass(mageClass) {
  if (game.selectClass(mageClass)) {
    for (const button of classButtons) {
      button.hide();
    }
    syncCustomizeControls();
    for (const control of customizeControls) {
      control.show();
    }
  }
}

// Sets one part of the look on the customization screen to a hex color. Returns false (and
// changes nothing) if the color is not valid.
function changeLook(part, hex) {
  return game.changeAppearance(part, hex);
}

// Makes the color pickers and hex boxes show the look the game is holding. Runs when the screen
// opens, so it starts on the last run's look.
function syncCustomizeControls() {
  for (const part of APPEARANCE_PARTS) {
    showLookInControls(part);
  }
}

// Puts one part's current color in its picker and hex box, and clears the "bad hex" outline.
function showLookInControls(part) {
  const fields = customizeFields[part];
  fields.picker.elt.value = game.appearance[part];
  fields.input.elt.value = game.appearance[part];
  fields.input.elt.style.outline = "";
}

// Ends the character creator and starts the run.
function finishCustomizing() {
  if (game.finishCustomization()) {
    for (const control of customizeControls) {
      control.hide();
    }
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

function makeCustomizeControls() {
  const style = (control) => {
    customizeControls.push(control);
  };
  APPEARANCE_PARTS.forEach((part, i) => {
    const picker = createColorPicker(DEFAULT_APPEARANCE[part]);
    picker.size(CUSTOMIZE_PICKER_W, CUSTOMIZE_PICKER_H);
    const pickerPosition = customizePickerPosition(i);
    picker.position(pickerPosition.x, pickerPosition.y);

    const input = createInput(DEFAULT_APPEARANCE[part]);
    input.size(CUSTOMIZE_HEX_W, CUSTOMIZE_PICKER_H);
    const hexPosition = customizeHexPosition(i);
    input.position(hexPosition.x, hexPosition.y);
    input.style("font-size", "24px");
    input.style("font-family", "monospace");
    input.style("box-sizing", "border-box");
    input.attribute("maxlength", "7");
    input.attribute("spellcheck", "false");
    input.attribute("aria-label", part + " color hex code");

    // The picker always gives a valid "#rrggbb".
    picker.elt.addEventListener("input", () => {
      if (changeLook(part, picker.elt.value)) {
        showLookInControls(part);
      }
    });
    // While typing, a valid hex code updates the look right away. An invalid one only gets a red
    // outline, so a half-typed code never changes the character.
    input.elt.addEventListener("input", () => {
      const hex = normalizeHex(input.elt.value);
      if (hex !== null && changeLook(part, hex)) {
        picker.elt.value = hex;
        input.elt.style.outline = "";
      } else {
        input.elt.style.outline = "3px solid rgb(220, 50, 50)";
      }
    });
    // When the box loses focus (or Enter is pressed), tidy it up: "FC9" becomes "#ffcc99", and a
    // code that never became valid goes back to the current color.
    input.elt.addEventListener("change", () => showLookInControls(part));

    customizeFields[part] = { picker, input };
    style(picker);
    style(input);
  });
  const startButton = createButton("Start");
  startButton.size(220, 64);
  startButton.position(CUSTOMIZE_ROWS_X - 110, customizeRowY(APPEARANCE_PARTS.length) + 10);
  startButton.mousePressed(finishCustomizing);
  startButton.style("background-color", "rgb(90, 90, 110)");
  startButton.style("color", "white");
  startButton.style("font-size", "28px");
  customizeControls.push(startButton);
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
  makeCustomizeControls();
  for (const control of customizeControls) {
    control.hide(); // the customization screen comes after the class menu
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
  if (game.isCustomizing()) {
    drawCustomizeMenu(game);
    return;
  }
  if (game.isInventory()) {
    const pointer = canvasPointer();
    drawRoom(run.room, getRoomGraphic(run.room));
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
  drawRoom(run.room, getRoomGraphic(run.room));
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

// Draws everything in the run except the room's tiles: items, shots, the player, enemies, NPCs
// and the HUD.
function drawRunScene(run) {
  const { player, room } = run;
  for (const drop of room.items) {
    drawItemDrop(drop);
  }
  for (const p of run.projectiles) {
    drawProjectile(p);
  }
  for (const p of run.enemyProjectiles) {
    drawEnemyProjectile(p);
  }
  drawPlayer(player);
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
  drawHealthBar(player);
  drawGoldHud(player.inventory);
  drawFirstBossBar(room);
  drawClassLabel(player.mageClass);
  drawMinimap(run.dungeon, room);
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
  if (game.isModelSelect()) {
    chooseModel(getModelForKey(key));
    return;
  }
  if (game.isMenu()) {
    chooseClass(getClassForKey(key));
    return;
  }
  if (game.isCustomizing()) {
    if (isTypingInCustomizeField(document.activeElement)) {
      if (keyCode === ENTER) {
        document.activeElement.blur(); // finish typing; the next Enter starts the run
      }
      return; // typing in a hex box is not a game command
    }
    const action = getCustomizeAction(key);
    if (action !== null) {
      finishCustomizing();
      return false;
    }
    return; // leave every other key alone (Tab, F5, ...)
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
