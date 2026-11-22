// Drawing code for enemies and their projectiles. Reads the model, never changes it.

const ENEMY_DEATH_FRAMES = 24;
const enemySheets = {}; // sheet path -> loaded image
const dyingEnemies = []; // { enemy, age } ghosts that keep fading after the model dropped them

// Call once in setup(), with await.
async function loadEnemySheets() {
  for (const name of ENEMY_TYPE_NAMES) {
    const sprite = ENEMY_TYPES[name].sprite;
    if (!sprite) {
      continue;
    }
    const allFrames = allSpriteFrames(sprite);
    for (const frame of allFrames) {
      if (!enemySheets[frame.sheet]) {
        enemySheets[frame.sheet] = await loadImageFile(frame.sheet);
      }
    }
  }
}

function drawEnemySprite(enemy, sprite, alpha = 255) {
  const frame = enemySpriteFrame(enemy, sprite, frameCount);
  const status = activeStatusElement(enemy);
  const w = frame.w || ENEMY_SPRITE_SIZE;
  const h = frame.h || ENEMY_SPRITE_SIZE;
  const ax = frame.ax || w / 2; // the art x that sits at the center of the hitbox
  const ay = frame.ay || h; // the art y that sits at the bottom of the hitbox
  const pixelSize = sprite.scale || enemy.length / ENEMY_SPRITE_SIZE;
  push();
  translate(enemy.pos.x + enemy.length / 2, enemy.pos.y + enemy.width);
  if (enemy.state === "windup") {
    translate(sin(frameCount * 2) * 1.5, 0); // a small shake telegraphs the swing
  }
  // Plain sprites face right and flip. Art that picks its own direction must not flip.
  if (enemy.facingLeft && !sprite.directions && !sprite.aimFrames && !sprite.walk) {
    scale(-1, 1);
  }
  if (enemy.state === "windup") {
    tint(255, 200, 120, alpha);
  } else if (status) {
    const c = elementColor(status);
    tint(c[0], c[1], c[2], alpha);
  } else {
    tint(255, alpha);
  }
  image(
    enemySheets[frame.sheet],
    -ax * pixelSize, -ay * pixelSize, w * pixelSize, h * pixelSize,
    frame.x, frame.y, w, h
  );
  if (enemy.hurtTimer > 0 || shotFlashOn(enemy)) {
    // Adding the sprite to itself washes it out to white for a moment.
    blendMode(ADD);
    tint(255, min(alpha, 200));
    image(
      enemySheets[frame.sheet],
      -ax * pixelSize, -ay * pixelSize, w * pixelSize, h * pixelSize,
      frame.x, frame.y, w, h
    );
    blendMode(BLEND);
  }
  pop();
}

// The shot flash blinks white on every other frame.
function shotFlashOn(enemy) {
  return enemy.shotFlash > 0 && Math.floor(frameCount / 2) % 2 === 0;
}

// A melee windup shows the square the swing will cover, in front of the enemy.
function drawSwingTelegraph(enemy) {
  const attack = enemy.getAttack();
  if (enemy.state !== "windup" || !attack || attack.kind !== "melee") {
    return;
  }
  const box = enemy.getSwingBox(attack.reach);
  const strength = map(enemy.stateTimer, attack.windup, 0, 40, 130);
  push();
  noStroke();
  fill(255, 80, 60, strength);
  rect(box.x, box.y, box.w, box.h);
  pop();
}

function drawEnemySquare(enemy, alpha = 255) {
  let c = enemy.type.color;
  let status = activeStatusElement(enemy);
  if (enemy.hurtTimer > 0 || shotFlashOn(enemy)) {
    c = [255, 255, 255]; // white flash
    status = null;
  }
  noStroke();
  if (status) {
    const s = elementColor(status);
    const mixed = lerpColor(color(c[0], c[1], c[2]), color(s[0], s[1], s[2]), 0.5);
    fill(red(mixed), green(mixed), blue(mixed), alpha);
  } else {
    fill(c[0], c[1], c[2], alpha);
  }
  rect(enemy.pos.x, enemy.pos.y, enemy.length, enemy.width);
}

// Boss health bar for the top of the screen, with a tick at each phase threshold.
function drawBossBar(enemy) {
  const barWidth = 480;
  const barHeight = 16;
  const x = (CANVAS_WIDTH - barWidth) / 2;
  const y = 44;
  push();
  noStroke();
  drawPixelText(enemy.typeName, CANVAS_WIDTH / 2, y - 20, 16, UI_COLORS.white, "center");
  fill(40);
  rect(x, y, barWidth, barHeight);
  fill(220, 50, 50);
  rect(x, y, map(enemy.health, 0, enemy.maxHealth, 0, barWidth), barHeight);
  if (enemy.type.phases) {
    stroke(230);
    strokeWeight(1);
    for (const phase of enemy.type.phases) {
      const tickX = x + phase.below * barWidth;
      line(tickX, y, tickX, y + barHeight);
    }
  }
  noFill();
  stroke(200, 190, 180);
  strokeWeight(2);
  if (enemy.justChangedPhase()) {
    const amount = map(enemy.phaseFlashTimer, 0, ENEMY_PHASE_FLASH_FRAMES, 0, 1);
    stroke(lerpColor(color(200, 190, 180), color(255), amount));
    strokeWeight(lerp(2, 5, amount));
  }
  rect(x, y, barWidth, barHeight);
  pop();
}

// Sprite or colored square, whichever the type has.
function drawEnemyBody(enemy, alpha = 255) {
  if (enemy.type.sprite) {
    drawEnemySprite(enemy, enemy.type.sprite, alpha);
  } else {
    drawEnemySquare(enemy, alpha);
  }
}

function drawEnemy(enemy) {
  if (enemy.isDead()) {
    return;
  }
  if (enemy.isSpawning()) {
    drawEnemyBody(enemy, map(enemy.spawnTimer, ENEMY_SPAWN_FRAMES, 0, 40, 255));
    return;
  }
  drawSwingTelegraph(enemy);
  drawEnemyBody(enemy);
}

// An animated shot. With sprite.rotate the art faces down (or down and to the left for the
// diagonal frames) and is turned to the way the shot is flying, around the center of the hitbox.
function drawShotSprite(p) {
  const sprite = p.sprite;
  let frames = sprite.frames;
  let turn = 0;
  if (sprite.rotate) {
    const eighths = Math.round(Math.atan2(p.vel.y, p.vel.x) / (Math.PI / 4));
    const diagonal = Math.abs(eighths) % 2 === 1;
    frames = diagonal ? sprite.diagonalFrames : sprite.frames;
    turn = eighths * (Math.PI / 4) - (diagonal ? (3 * Math.PI) / 4 : Math.PI / 2);
  }
  const frame = frames[Math.floor(p.age / sprite.frameTime) % frames.length];
  const w = frame.w || ENEMY_SPRITE_SIZE;
  const h = frame.h || ENEMY_SPRITE_SIZE;
  push();
  translate(p.pos.x + p.length / 2, p.pos.y + p.width / 2);
  rotate(turn);
  noTint();
  image(enemySheets[frame.sheet], -w / 2, -h / 2, w, h, frame.x, frame.y, w, h);
  pop();
}

function drawEnemyProjectile(p) {
  if (p.sprite) {
    drawShotSprite(p);
    return;
  }
  const c = p.color;
  noStroke();
  fill(c[0], c[1], c[2]);
  rect(p.pos.x, p.pos.y, p.length, p.width);
}

function startEnemyDeath(enemy) {
  dyingEnemies.push({ enemy: enemy, age: 0 });
}

function clearDyingEnemies() {
  dyingEnemies.length = 0;
}

// Draws each dead enemy where it fell, fading out and shrinking toward its center.
function drawDyingEnemies(advance = true) {
  for (const ghost of dyingEnemies) {
    const enemy = ghost.enemy;
    const center = enemy.getCenter();
    const alpha = map(ghost.age, 0, ENEMY_DEATH_FRAMES, 255, 0);
    const size = map(ghost.age, 0, ENEMY_DEATH_FRAMES, 1, enemy.fell ? 0 : 0.3); // a fall shrinks to nothing
    push();
    translate(center.x, center.y);
    scale(size);
    translate(-center.x, -center.y);
    drawEnemyBody(enemy, alpha);
    pop();
    if (advance) {
      ghost.age++;
    }
  }
  if (!advance) {
    return;
  }
  // Keep only the ghosts that still have frames left.
  for (let i = dyingEnemies.length - 1; i >= 0; i--) {
    if (dyingEnemies[i].age >= ENEMY_DEATH_FRAMES) {
      dyingEnemies.splice(i, 1);
    }
  }
}

// Debug overlay (F3): hitbox, detection radius, type name and health.
function drawEnemyDebug(enemy) {
  const center = enemy.getCenter();
  push();
  noFill();
  strokeWeight(1);
  stroke(0, 255, 0);
  rect(enemy.pos.x, enemy.pos.y, enemy.length, enemy.width);
  stroke(255, 255, 0, 120);
  circle(center.x, center.y, 2 * enemy.detectionRange);
  noStroke();
  fill(255);
  textSize(8);
  textAlign(CENTER, BOTTOM);
  text(enemy.typeName + " " + enemy.health + "/" + enemy.maxHealth, center.x, enemy.pos.y - 2);
  pop();
}
