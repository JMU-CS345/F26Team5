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
  if (enemy.facingLeft && !sprite.directions && !sprite.aimFrames) {
    scale(-1, 1);
  }
  if (enemy.state === "windup") {
    tint(255, 200, 120, alpha);
  } else {
    tint(255, alpha);
  }
  image(
    enemySheets[frame.sheet],
    -ax * pixelSize, -ay * pixelSize, w * pixelSize, h * pixelSize,
    frame.x, frame.y, w, h
  );
  if (enemy.hurtTimer > 0) {
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

function drawEnemySquare(enemy, alpha = 255) {
  let c = enemy.type.color;
  if (enemy.hurtTimer > 0) {
    c = [255, 255, 255]; // white flash
  }
  noStroke();
  fill(c[0], c[1], c[2], alpha);
  rect(enemy.pos.x, enemy.pos.y, enemy.length, enemy.width);
}

// Boss health bar for the top of the screen, with a tick at each phase threshold.
function drawBossBar(enemy) {
  const barWidth = 480;
  const barHeight = 16;
  const x = (CANVAS_WIDTH - barWidth) / 2;
  const y = 24;
  push();
  textAlign(CENTER, BOTTOM);
  textSize(14);
  noStroke();
  fill(255);
  text(enemy.typeName, CANVAS_WIDTH / 2, y - 4);
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
  drawEnemyBody(enemy);
}

function drawEnemyProjectile(p) {
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
    const size = map(ghost.age, 0, ENEMY_DEATH_FRAMES, 1, 0.3);
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
