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
let customizeControls = []; // every picker, hex box and Start on the customization screen (#23)
let customizeFields = {}; // part -> { picker, input }: the controls of one customization row
let dungeon;
let lootRun; // loot rng and counters for this run
let room; // the room the player is in right now
let entrySpot = { x: 0, y: 0 }; // where the player enters a room, a pit fall respawns here
let roomGraphics = new Map(); // room id -> { graphic, version }, the picture and tileVersion it shows
let inventoryHeld = null; // the item in the hand while the inventory is open
let lastKillCenter = null; // where the last enemy died, for the clear reward
let inventorySelection = null;
let inventoryInfoLines = [];
let inventoryCursor = new InventoryCursor();
let inventoryKeyboardMode = false; // true after a key press in the inventory, false after the mouse
let gameSettings; // loaded from localStorage in setup()
let runStats = new RunStats();
let titleMenu;
let modelMenu;
let classMenu;
let pauseMenu;
let settingsMenu;
let confirmDialog;
let screenFade = new ScreenFade();
let upRepeat = new KeyRepeat();
let downRepeat = new KeyRepeat();
let inventoryRepeats = [new KeyRepeat(), new KeyRepeat(), new KeyRepeat(), new KeyRepeat()];
let creditsScroll = 0; // pixels the credits have scrolled
let resumeInputBlocked = false;
let activeDialogue;
let gameFeel; // hitstop, shake and damage numbers
let enemyClock = new EnemyClock(); // slows enemy updates after a perfect dodge
let lastPlayerHealth = 0;
let setupDone = false; // draw() waits for this, because setup() loads art with await
//temp
const ROOM_WIDTH = 640;
const ROOM_HEIGHT = 400;
const ROOM_X = (CANVAS_WIDTH - ROOM_WIDTH) / 2;
const ROOM_Y = (CANVAS_HEIGHT - ROOM_HEIGHT) / 2;
const NPC_TOP_RIGHT_X = ROOM_X + ROOM_WIDTH - 48;
const NPC_TOP_RIGHT_Y = ROOM_Y + 32;
let worldCamera = { x: 0, y: 0 }; // world position of the screen's top-left corner
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

// Moves the game into a room. Shots in flight don't follow the player through a door.
function enterRoom(r) {
  room = r;
  projectiles = [];
  enemyProjectiles = [];
  clearDyingEnemies(); // death fades from the old room shouldn't show up in the new one
  room.onEnter();
  room.startEnemyDelay(); // enemies by the door hold still a moment, so they cannot hit on arrival
  enterRoomFlow(dungeon, room); // seals the doors of a combat room
}

// Walks the player through an exit into the next room.
function useExit(exit) {
  const next = dungeon.rooms[exit.toId];
  const spot = dungeon.entryPoint(room, exit);
  enterRoom(next);
  entrySpot = spot;
  player.pos.set(spot.x - player.length / 2, spot.y - player.width / 2);
}

// Makes a fresh player with the class picked on the menu.
function startRun() {
  refreshBindings(); // the menus may have changed the controls setting
  gameFeel.refreshSettings();
  gameFeel.reset();
  for (const cached of roomGraphics.values()) {
    cached.graphic.remove(); // free the old dungeon's pictures
  }
  roomGraphics.clear();
  dungeon = generateDungeon({
    screenX: ROOM_X,
    screenY: ROOM_Y
  });
  console.log("Dungeon seed:", dungeon.seed); // pass this as seed to replay a dungeon
  lootRun = new LootRun(dungeon.seed + 1, doorDistances(dungeon.rooms, 0));
  enterRoom(dungeon.start);
  playMusic();
  const spawn = room.getPlayerSpawn(); // the @ in the start room's drawing
  player = new Player(
    spawn.x - PLAYER_LENGTH / 2,
    spawn.y - PLAYER_WIDTH / 2,
    game.selectedClass,
    game.selectedModel,
    game.appearance
  );
  giveLoadout(player, lootRun.rng);
  entrySpot = { x: spawn.x, y: spawn.y };
  // Placeholder pickups until room data supplies item placement.
  room.items = [
    new ItemDrop(spawn.x + 48, spawn.y - 48, new ChestArmor({
      id: "apprentice-robe",
      name: "Apprentice Robe",
      defense: 1,
      description: "A light robe with basic protection."
    })),
    new ItemDrop(spawn.x - 48, spawn.y + 48, makePotion()),
    new ItemDrop(spawn.x + 48, spawn.y + 48, new Gold(), 25)
  ];
  lastPlayerHealth = player.health;
  nextSpawnIndex = ENEMY_TYPE_NAMES.indexOf("Demon");
  projectiles = [];
  enemyProjectiles = [];
  clearDyingEnemies();
  inventoryHeld = null;
  inventorySelection = null;
  inventoryInfoLines = [];
  inventoryCursor = new InventoryCursor();
  resumeInputBlocked = false;
  activeDialogue.close();
  room.cleared = false;
  room.bossDefeated = false;
  lastKillCenter = null;
  runStats.reset();
  pauseMenu.reset(); // a new run starts the pause menu on Resume again
}

// Picks a playermodel on the model screen and moves on to the class menu.
function chooseModel(modelName) {
  if (game.selectModel(modelName)) {
    playSfx("menu");
    classMenu.reopen();
  }
}

// Picks a class on the menu and moves on to the customization screen.
function chooseClass(mageClass) {
  if (game.selectClass(mageClass)) {
    playSfx("menu");
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

// Leaves the customization screen and starts the run.
function finishCustomization() {
  if (game.finishCustomization()) {
    for (const control of customizeControls) {
      control.hide();
    }
    startRun();
  }
}

// Goes back to the title screen from character select, pause or the death screen.
function goToTitle() {
  activeDialogue.close();
  if (game.backToTitle()) {
    for (const control of customizeControls) {
      control.hide();
    }
    if (document.activeElement) {
      document.activeElement.blur(); // a hex box must not keep the keyboard on the title screen
    }
    titleMenu.reopen();
  }
}

function openSettings() {
  if (game.openSettings()) {
    settingsMenu.reopen();
  }
}

function openCredits() {
  if (game.openCredits()) {
    creditsScroll = 0;
  }
}

function startCharacterSelect() {
  if (game.startCharacterSelect()) {
    modelMenu.reopen();
  }
}

// Esc during a run, or the window losing focus.
function pauseGame() {
  if (game.pause()) {
    pauseMenu.reopen();
  }
}

function resumeGame() {
  if (game.resume()) {
    resumeInputBlocked = true; // keys still held from before the pause do nothing
  }
}

function askRestartRun() {
  confirmDialog.show("Restart this run?", restartRun);
}

function askQuitToTitle() {
  confirmDialog.show("Quit to title? This run is lost.", goToTitle);
}

function restartRun() {
  if (game.restartRun()) {
    startRun();
  }
}

// Settings changes save right away.
function changeSetting() {
  saveSettings(gameSettings);
  refreshBindings();
  gameFeel.refreshSettings();
  refreshMusicVolume();
}

function stepVolume(volume, direction) {
  return constrain(round((volume + direction * 0.1) * 10) / 10, 0, 1);
}

function makeMenus() {
  confirmDialog = new ConfirmDialog();
  titleMenu = new Menu([
    { label: "New Run", action: startCharacterSelect },
    { label: "Settings", action: openSettings },
    { label: "Credits", action: openCredits }
  ]);
  modelMenu = new Menu(
    PLAYER_MODEL_NAMES.map((name) => ({ label: name, action: () => chooseModel(name) })),
    goToTitle
  );
  classMenu = new Menu(
    MAGE_CLASSES.map((name) => ({ label: name, action: () => chooseClass(name) })),
    goToTitle
  );
  pauseMenu = new Menu([
    { label: "Resume", action: resumeGame },
    { label: "Settings", action: openSettings },
    { label: "Restart Run", action: askRestartRun },
    { label: "Quit to Title", action: askQuitToTitle }
  ], resumeGame);
  settingsMenu = new Menu([
    {
      label: "Controls",
      kind: "choice",
      value: () => CONTROL_PRESETS[gameSettings.controls].name,
      adjust: () => {
        const other = CONTROL_PRESET_IDS.find((id) => id !== gameSettings.controls);
        gameSettings.controls = other;
        changeSetting();
      }
    },
    {
      label: "Music volume",
      kind: "volume",
      value: () => gameSettings.musicVolume,
      adjust: (direction) => {
        gameSettings.musicVolume = stepVolume(gameSettings.musicVolume, direction);
        changeSetting();
      }
    },
    {
      label: "Sound effects",
      kind: "volume",
      value: () => gameSettings.sfxVolume,
      adjust: (direction) => {
        gameSettings.sfxVolume = stepVolume(gameSettings.sfxVolume, direction);
        changeSetting();
      }
    },
    {
      label: "Screen shake",
      kind: "toggle",
      value: () => gameSettings.screenShake,
      adjust: () => {
        gameSettings.screenShake = !gameSettings.screenShake;
        changeSetting();
      }
    },
    {
      label: "Damage numbers",
      kind: "toggle",
      value: () => gameSettings.damageNumbers,
      adjust: () => {
        gameSettings.damageNumbers = !gameSettings.damageNumbers;
        changeSetting();
      }
    },
    { label: "Back", action: closeSettings }
  ], closeSettings);
}

function closeSettings() {
  game.closeSettings();
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
  startButton.mousePressed(finishCustomization);
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
  pixelDensity(1); // one canvas pixel per art pixel, even on high-DPI screens
  await loadPixelFont();
  await loadHudImages();
  await loadPanelImage();
  await loadEffectSheets();
  createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  fitToWindow();
  noSmooth();
  buildBackground();
  frameRate(60); // movement is pixels per frame, so keep the frame rate fixed
  game = new Game();
  activeDialogue = new DialogueBox();
  gameFeel = new GameFeel();
  gameSettings = loadSettings();
  makeMenus();
  // The window losing focus pauses a run. p5 has no event for it, so use the DOM one.
  window.addEventListener("blur", pauseGame);
  makeCustomizeControls();
  for (const control of customizeControls) {
    control.hide(); // the customization screen comes after the class menu
  }
  setupDone = true;
}

// Scales the whole page (canvas and buttons) to fit the window and centers it.
// Runs on load and whenever the window changes size, which includes browser zoom.
// The scale is a whole number when the window allows it, so pixels stay square.
function fitToWindow() {
  pageScale = integerScale(window.innerWidth, window.innerHeight, CANVAS_WIDTH, CANVAS_HEIGHT);
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

// The name the fade watches. Playing and the inventory count as one screen.
function fadeScreenName() {
  if (game.isPlaying() || game.isInventory()) {
    return "run";
  }
  return game.state;
}

function activeVerticalMenu() {
  if (confirmDialog.isOpen()) {
    return null;
  }
  if (game.isTitle()) {
    return titleMenu;
  }
  if (game.isSettings()) {
    return settingsMenu;
  }
  if (game.isPaused()) {
    return pauseMenu;
  }
  return null;
}

// Holding Up or Down keeps moving the cursor. keyPressed does the first move.
function repeatMenuMoves() {
  const menu = activeVerticalMenu();
  const upDown = menu !== null && (keyIsDown(UP_ARROW) || keyIsDown(87));
  const downDown = menu !== null && (keyIsDown(DOWN_ARROW) || keyIsDown(83));
  if (upRepeat.update(upDown)) {
    menu.previous();
  }
  if (downRepeat.update(downDown)) {
    menu.next();
  }
}

// Holding an arrow in the inventory keeps moving the cursor, one cell while holding an item.
function repeatInventoryKeys() {
  let grid = null;
  if (game.isInventory()) {
    grid = inventorySkipGrid();
  }
  const isDown = (code) => game.isInventory() && keyIsDown(code);
  if (repeatInventoryMoves(inventoryCursor, inventoryRepeats, isDown, grid)) {
    inventorySelection = null;
    inventoryInfoLines = [];
  }
}

function draw() {
  // p5 starts calling draw() while the async setup() is still loading images. If draw()
  // throws, p5 stops its loop for good, so skip frames until setup() has finished.
  if (!setupDone) {
    return;
  }
  screenFade.watch(fadeScreenName());
  repeatMenuMoves();
  repeatInventoryKeys();
  drawScreen();
  if (confirmDialog.isOpen()) {
    drawConfirmDialog(confirmDialog);
  }
  drawScreenFade(screenFade.alpha());
  screenFade.update();
}

function drawScreen() {
  background(0);
  updateBackground();
  drawBackground();
  if (game.isTitle()) {
    drawTitleScreen(titleMenu);
    return;
  }
  if (game.isSettings()) {
    drawSettingsScreen(settingsMenu, gameSettings);
    return;
  }
  if (game.isCredits()) {
    updateCreditsScroll();
    drawCreditsScreen(creditsLines(), creditsScroll);
    return;
  }
  if (game.isModelSelect()) {
    drawModelMenu(modelMenu);
    return;
  }
  if (game.isMenu()) {
    drawClassMenu(classMenu, game.selectedModel, game.appearance);
    return;
  }
  if (game.isPaused()) {
    // Nothing below the menu updates, so enemies, shots and timers all stay where they were.
    drawRunScene();
    drawPauseMenu(pauseMenu);
    return;
  }
  if (game.isCustomizing()) {
    drawCustomizeMenu(game);
    return;
  }
  if (game.isInventory()) {
    const cursorSlot = inventoryCursorSlot(player.inventory, inventoryCursor);
    const pointer = inventoryPointerFor(inventoryKeyboardMode, canvasPointer(), cursorSlot);
    drawRunScene();
    drawInventoryMenu(
      player.inventory,
      player,
      inventoryHeld,
      inventorySelection,
      inventoryInfoLines,
      pointer.x,
      pointer.y,
      cursorSlot
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
  const shake = gameFeel.getShakeOffset();
  if (gameFeel.consumeHitstop()) {
    drawRunScene(shake); // a hit freezes the game for a moment
    return;
  }

  const heldInputBlocked = resumeInputBlocked && isGameplayInputHeld(keyIsDown);
  if (resumeInputBlocked && !heldInputBlocked) {
    resumeInputBlocked = false;
  }
  const input = readPlayerInput(
    keyIsDown,
    player,
    heldInputBlocked || activeDialogue.isActive()
  );
  aimPlayer(player, input);
  applyAutoAim(player, input, room);
  player.move(input.move, room, input.strafe);
  for (const drop of room.items) {
    drop.update();
  }
  for (const chest of room.chests) {
    chest.update(); // the lid and the rarity beam animate from this
  }
  const pickedUp = pickupItemDrops(player, room);
  for (const drop of pickedUp) {
    runStats.recordPickup(drop.item);
  }
  if (pickedUp.length > 0) {
    playSfx("pickup");
  }

  // Enemies and their shots stand still while someone is talking.
  if (!player.isDead() && !activeDialogue.isActive()) {
    const enemySteps = enemyClock.steps(player.getEnemyTimeScale());
    for (const e of room.enemies) {
      if (enemySteps > 0) {
        e.update(player, room); // only the update slows down, hits are still checked
      }
      e.damagePlayer(player);
      e.meleeHit(player);
      for (const shot of e.tryAttack(player, room)) {
        enemyProjectiles.push(shot);
      }
    }
  }

  projectiles.push(...player.fireAll(input.fireDir));
  player.update(room, input);
  for (const effect of player.takeDueEffects()) {
    const shot = applyWeaponEffect(effect, player, room);
    if (shot !== null) {
      projectiles.push(shot);
    }
  }
  if (player.hasFinishedFalling() && !player.isDead()) {
    player.respawnAt(entrySpot.x, entrySpot.y); // back at the door they came in through
  }
  for (const hit of player.lastHits) {
    gameFeel.onHit(hit, "melee");
  }

  for (const p of projectiles) {
    p.update(room);
    for (const e of room.enemies) {
      if (e.damageFromProjectile(p)) {
        gameFeel.onHit({ target: e, damage: p.damage }, "ranged");
        playCombatSfx("hit");
      }
    }
  }
  projectiles = projectiles.filter((p) => p.alive);

  slashEnemyShots(player, enemyProjectiles);
  for (const p of enemyProjectiles) {
    if (activeDialogue.isActive()) {
      break;
    }
    p.update(room);
    projectileHitsPlayer(p, player);
  }
  enemyProjectiles = enemyProjectiles.filter((p) => p.alive);
  const deadThisFrame = removeDeadEnemies(room);
  handleDeadEnemies(deadThisFrame);
  updateRoomFlow(room);

  if (player.health < lastPlayerHealth) {
    gameFeel.onPlayerHurt();
  }
  lastPlayerHealth = player.health;
  gameFeel.update();
  drawRunScene(shake);
  if (!room.cleared && roomWaveDone(room)) {
    // A room with no enemies at all is not counted, only one the player emptied.
    markRoomCleared(room, deadThisFrame.length, runStats);
    const spot = clearRewardPoint(room, lastKillCenter);
    const reward = rollClearReward(room, lootRun, spot.x, spot.y);
    if (reward !== null) {
      room.items.push(reward);
    }
  }
  if (playerJustDied(game, player)) {
    activeDialogue.close();
    playSfx("death");
  }
  if (game.isDead()) {
    drawDeathScreen(runStats);
  }
}

// The credits drift up by themselves, and Up and Down scroll them faster or back.
function updateCreditsScroll() {
  const lastScroll = creditsLines().length * CREDITS_LINE_HEIGHT + 60;
  creditsScroll += 0.6;
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) {
    creditsScroll += 4;
  }
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
    creditsScroll -= 6;
  }
  creditsScroll = constrain(creditsScroll, 0, lastScroll);
}

// Points the camera at the player, kept inside the room.
function updateCamera() {
  const viewW = CANVAS_WIDTH / WORLD_ZOOM;
  const viewH = CANVAS_HEIGHT / WORLD_ZOOM;
  const center = player.getCenter();
  const bounds = { x: room.x, y: room.y, w: room.width, h: room.height };
  worldCamera = cameraFor(center.x, center.y, viewW, viewH, bounds);
}

// The world (room, items, shots, characters) draws zoomed and follows the camera. The HUD,
// minimap and dialogue come after pop(), so they stay in fixed screen space.
function drawRunScene(shake = { x: 0, y: 0 }) {
  updateCamera();
  push();
  translate(shake.x, shake.y); // a hit shakes the world, the HUD stays put
  scale(WORLD_ZOOM);
  translate(-worldCamera.x, -worldCamera.y);
  drawRoom(room, getRoomGraphic(room));
  drawRoomFlow(room, player);
  for (const chest of room.chests) {
    drawChest(chest);
  }
  const nearChest = findOpenableChest(player, room);
  if (nearChest !== null && game.isPlaying()) {
    drawChestPrompt(nearChest);
  }
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
  drawMeleeAttack(player);
  drawDodgeFlash(player);
  drawAimRing(player.aimTarget);
  for (const e of room.enemies) {
    drawEnemy(e);
    if (debugOverlay) {
      drawEnemyDebug(e);
    }
  }
  for (const npc of room.npcs) {
    drawNpc(npc, player, activeDialogue.isActive());
  }
  drawDyingEnemies(game.shouldSimulate());
  drawHitSparks(gameFeel);
  drawDamageNumbers(gameFeel);
  pop();
  // The card is drawn in screen space; inside the zoomed world it landed off screen.
  const floorWeapon = findWeaponDropUnderPlayer(player, room);
  if (floorWeapon !== null && game.isPlaying()) {
    drawWeaponCard(
      floorWeapon.item,
      player.inventory.getEquipped(weaponSlotName(floorWeapon.item)),
      !player.inventory.canAdd(floorWeapon.item)
    );
  }
  drawHud(player);
  drawFirstBossBar();
  drawClassLabel(player.mageClass);
  drawMinimap(dungeon, room);
  if (game.isPlaying() || game.isInventory()) {
    drawInventoryHudButton(game.isInventory());
  }
  drawDialogueBox(activeDialogue, ROOM_X, 0, ROOM_WIDTH, CANVAS_HEIGHT);
}

// Whatever is in the hand goes back in the bag, or onto the floor when the bag is full.
function putHeldItemAway() {
  const leftover = releaseHeld(player.inventory, inventoryHeld);
  inventoryHeld = null;
  if (leftover === null) {
    return;
  }
  const center = player.getCenter();
  const drop = new ItemDrop(
    center.x - ITEM_DROP_SIZE / 2, center.y - ITEM_DROP_SIZE / 2, leftover.item, leftover.quantity
  );
  drop.justDropped = true;
  room.items.push(drop);
}

function clearInventoryUiState() {
  putHeldItemAway();
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

// Vincent's room code hooks door unlock and exit here.
function handleDeadEnemies(dead) {
  for (const enemy of dead) {
    startEnemyDeath(enemy);
    runStats.recordKill();
    recordKill(room, enemy);
    lastKillCenter = enemy.getCenter();
    room.items.push(...rollEnemyDrops(enemy, lootRun, room));
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

// Testing aids: with the F3 overlay on, B spawns enemies and N toggles the NPC.
// Press B: spawns the next enemy type somewhere on the floor, away from the player.
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
    if (far && !room.collidesWithWall(enemy.getBounds()) && !room.overlapsPit(enemy.getBounds())) {
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

// The grid the arrows skip over, or null to step one cell while an item is in the hand.
function inventorySkipGrid() {
  if (inventoryHeld !== null) {
    return null;
  }
  return player.inventory.grid;
}

// Shows the result of Enter or Space: the new hand and a note when the action failed.
function applyInventoryResult(result) {
  inventoryHeld = result.held;
  inventorySelection = null;
  inventoryInfoLines = [];
  if (result.message !== "") {
    inventoryInfoLines = [result.message];
  }
}

// Keys inside the inventory: arrows move the cursor, Tab swaps bag and doll, Enter equips or
// drinks, Space picks up or places, R sorts, L locks, Q drinks a potion, X drops.
function handleInventoryKey() {
  inventoryKeyboardMode = true;
  if (keyCode === ESCAPE) {
    toggleInventoryMenu();
    return;
  }
  if (moveInventoryCursorForKey(inventoryCursor, keyCode, inventorySkipGrid())) {
    inventorySelection = null;
    inventoryInfoLines = [];
    return;
  }
  if (keyCode === TAB) {
    inventoryCursor.switchSection();
    inventorySelection = null;
    inventoryInfoLines = [];
    return;
  }
  const cursorSlot = inventoryCursorSlot(player.inventory, inventoryCursor);
  const atCursor = inventorySelectionFromSlot(cursorSlot);
  if (keyCode === ENTER) {
    applyInventoryResult(enterInventorySlot(player, room, inventoryHeld, cursorSlot));
  } else if (key === " ") {
    applyInventoryResult(spaceInventorySlot(player.inventory, inventoryHeld, cursorSlot));
  } else if (key.toLowerCase() === "q") {
    inventoryInfoLines = [];
    if (!drinkBagPotion(player, cursorSlot)) {
      inventoryInfoLines = ["Nothing to drink"];
    }
  } else if (key.toLowerCase() === "r") {
    player.inventory.sortBag();
    inventorySelection = null;
    inventoryInfoLines = [];
  } else if (key.toLowerCase() === "l") {
    toggleLock(atCursor);
    inventoryInfoLines = [];
  } else if (key.toLowerCase() === "x") {
    inventorySelection = null;
    inventoryInfoLines = [];
    if (atCursor !== null && atCursor.item.locked) {
      inventoryInfoLines = ["Locked"];
      return;
    }
    const drop = dropInventoryCursorItem(player.inventory, player, inventoryCursor);
    if (drop !== null) {
      drop.justDropped = true;
      room.items.push(drop);
    }
  }
}

function keyPressed() {
  playMusic(); // browsers only allow audio after a key press, so the first one starts the loop
  if (keyCode === 114) {
    debugOverlay = !debugOverlay;
    return false;
  }
  if (confirmDialog.isOpen()) {
    handleMenuKey(confirmDialog.menu, keyCode, true);
    return false;
  }
  if (game.isTitle()) {
    handleMenuKey(titleMenu, keyCode);
    return false;
  }
  if (game.isSettings()) {
    handleMenuKey(settingsMenu, keyCode);
    return false;
  }
  if (game.isCredits()) {
    if (keyCode === ESCAPE) {
      game.closeCredits();
    }
    return; // leave every other key alone (Tab, F5, ...)
  }
  if (game.isModelSelect()) {
    if (getModelForKey(key) !== null) {
      chooseModel(getModelForKey(key));
    } else {
      handleMenuKey(modelMenu, keyCode, true);
    }
    return false;
  }
  if (game.isMenu()) {
    if (getClassForKey(key) !== null) {
      chooseClass(getClassForKey(key));
    } else {
      handleMenuKey(classMenu, keyCode, true);
    }
    return false;
  }
  if (game.isPaused()) {
    handleMenuKey(pauseMenu, keyCode);
    return false;
  }
  if (game.isCustomizing()) {
    if (keyCode === ESCAPE) {
      goToTitle();
      return false;
    }
    if (isTypingInCustomizeField(document.activeElement)) {
      if (keyCode === ENTER) {
        document.activeElement.blur(); // finish typing; the next Enter starts the run
      }
      return; // typing in a hex box is not a game command
    }
    if (getCustomizeAction(key) !== null) {
      finishCustomization();
      return false;
    }
    return; // leave every other key alone (Tab, F5, ...)
  }
  const action = actionForKey(keyCode);
  if ((game.isPlaying() || game.isInventory()) && action === "inventory") {
    toggleInventoryMenu();
    return false;
  }
  if (game.isInventory()) {
    handleInventoryKey();
    return false;
  }
  if (game.isPlaying() && keyCode === ESCAPE) {
    pauseGame();
    return false;
  }
  if (game.isPlaying()) {
    if (!activeDialogue.isActive() && !player.isDead()) {
      pressCombatKey(player, action);
    }
    // Debug keys only work while the F3 overlay is on.
    if (debugOverlay && action === null && key.toLowerCase() === "n") {
      toggleTopRightNpc();
      return false;
    }
    // K is also the Classic fire key, so this one skips the action check.
    if (debugOverlay && key.toLowerCase() === "k") {
      clearRoomDebug(room, player, projectiles);
      return false;
    }
    if (debugOverlay && action === null && key.toLowerCase() === "b") {
      spawnNextEnemy();
      return false;
    }
    if (key.toLowerCase() === "q") {
      drinkBagPotion(player);
      return false;
    }
    if (action === "interact") {
      if (activeDialogue.isActive()) {
        activeDialogue.advance();
        return false;
      }
      const nearbyNpc = room.npcs.find((n) => n.isPlayerNear(player));
      if (nearbyNpc) {
        activeDialogue.start(nearbyNpc);
        return false;
      }
      // E opens a chest, or picks up the weapon under the player.
      if (tryOpenChest(player, room, lootRun)) {
        return false;
      }
      const floorWeapon = findWeaponDropUnderPlayer(player, room);
      if (floorWeapon !== null) {
        useWeaponDrop(player, room, floorWeapon);
        return false;
      }
    }
  }
  // Temporary damage key for testing the death screen, commented out currently.
  // if (key === "h") {
    //player.takeDamage(1);
  //}
  if (game.isDead() && keyCode === ENTER) {
    goToTitle();
  }
  if (
    keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW ||
    keyCode === UP_ARROW || keyCode === DOWN_ARROW ||
    keyCode === 32
  ) {
    return false;
  }
}


function mouseMoved() {
  inventoryKeyboardMode = false; // the held item and tooltip follow the mouse again
}

function mousePressed() {
  inventoryKeyboardMode = false;
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
    return false;
  }

  // Right click selects an item for its menu. Left click picks up, places or equips.
  const slot = inventorySlotAt(player.inventory, pointer.x, pointer.y);
  inventoryInfoLines = [];
  if (mouseButton === RIGHT) {
    inventorySelection = inventorySelectionFromSlot(slot);
    return false;
  }
  inventorySelection = null;
  inventoryHeld = activateInventorySlot(player.inventory, inventoryHeld, slot);
  const clicked = inventorySelectionFromSlot(slot);
  syncInventoryCursorToSelection(inventoryCursor, player.inventory, clicked);
  return false;
}
