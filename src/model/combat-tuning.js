// Every combat number lives here, so feel is tuned in one place. Frames are at 60 fps and
// distances are pixels. No p5 drawing calls.

// Default weapon numbers (items.js reads these). Melee out-damages ranged 2 to 3 times.
const DEFAULT_MELEE_DAMAGE = 1.5;
const DEFAULT_MELEE_SWING_FRAMES = 14;
const DEFAULT_MELEE_ARC = 90; // degrees
const DEFAULT_FIRE_RATE = 24; // frames between shots

// Melee combo
const MELEE_BUFFER_FRAMES = 10; // a press this early before a swing ends still chains
const COMBO_RESET_FRAMES = 20; // idle this long after a swing and the combo starts over
const COMBO_LENGTH = 3;
const SPIN_HOLD_FRAMES = 18; // hold melee this long and the swing becomes a spin
const FINISHER_DAMAGE = 1.5;
const FINISHER_KNOCKBACK = 2;
const FINISHER_REACH = 1.15;
const FINISHER_EXTRA_FRAMES = 3;

// Spin (no input starts it yet: a plain hold only repeats swings)
const SPIN_DAMAGE = 1.5;
const SPIN_KNOCKBACK = 1.5;
const SPIN_REACH = 1.3;
const SPIN_WINDUP = 2;
const SPIN_ACTIVE = 5;
const SPIN_RECOVERY = 8;

// Knockback on enemies: this share of the shove follows the swing, the rest is away from
// the player.
const KNOCKBACK_SWING_MIX = 0.6;

// Walking. Speed is a share of the class speed, by swing phase.
const MOVE_ACCEL = 0.45; // share of the gap to full speed closed each frame
const MOVE_BRAKE = 0.55; // same, when no key is held
const MOVE_STOP_SPEED = 0.05; // below this the player counts as standing still
const SWING_SPEED_WINDUP = 0.8;
const SWING_SPEED_ACTIVE = 0.8;
const SWING_SPEED_RECOVERY = 1;

// Lunge: a small step forward when a swing starts, eased out over a few frames.
const LUNGE_SWING = 5;
const LUNGE_FINISHER = 9;
const LUNGE_SPIN = 0;
const LUNGE_EASE = 0.5; // share of the remaining lunge taken each frame
const LUNGE_STOP = 0.3; // below this much left the lunge ends

// Player hurt and shove
const HIT_IFRAMES = 45; // invulnerable frames after being hurt
const ARMOR_BLOCK_CAP = 40; // helmet and leg block add up to at most this percent
const PLAYER_KNOCKBACK_SPEED = 4; // pixels per frame at the start of a shove
const PLAYER_KNOCKBACK_FRAMES = 6;
const PLAYER_KNOCKBACK_DECAY = 0.8;
const DEATH_FRAMES = 48; // death animation length (0.8 s at 60 fps)

// Dash
const DASH_FRAMES = 8; // frames spent moving fast
const DASH_SPEED = 6; // pixels per frame, so a dash covers 48 pixels
const DASH_IFRAMES = 12; // invulnerable frames from the start of a dash
const DASH_BUFFER_FRAMES = 8; // a dash press this early still counts
const DASH_CHARGES = 2; // dashes stored before the player has to wait
const DASH_RECHARGE_FRAMES = 50; // one charge comes back this often
const DASH_SPACING_FRAMES = 10; // frames from one dash start to the next
const DASH_STEER_FRAMES = 3; // the first frames of a dash can still turn
const DASH_STRIKE_FRAMES = 10; // melee this soon after a dash starts is a dash strike
const DASH_STRIKE_DAMAGE = 1.2;
const DASH_STRIKE_LUNGE = 6; // extra pixels on top of the swing lunge

// Perfect dodge: a hit blocked early in the dash slows every enemy for a moment.
const PERFECT_DODGE_FRAMES = 8; // damage blocked in the first frames of the i-frames
const DODGE_SLOW_FRAMES = 30;
const DODGE_ENEMY_SPEED = 0.35; // share of normal enemy speed while slowed
const DODGE_FLASH_FRAMES = 12; // how long the view flashes the player

// Game feel
const HITSTOP_NORMAL_FRAMES = 2;
const HITSTOP_FINISHER_FRAMES = 5;
const HITSTOP_SPIN_FRAMES = 4;
const HITSTOP_RANGED_FRAMES = 0;
const SHAKE_FRAMES = 6;
const SHAKE_MELEE = 2; // pixels, along the swing direction
const SHAKE_FINISHER = 4;
const SHAKE_RANGED = 1;
const SHAKE_HURT = 3;
const NUMBER_FRAMES = 40; // how long a damage number floats
const SPARK_FRAMES = 10; // how long hit sparks last

// Enemies
const ENEMY_DAMAGE_COOLDOWN = 30; // frames at 60 fps
const ENEMY_FREEZE_FRAMES = 12; // an enemy that just hit the player stands still this long
const ENEMY_STAGGER_FRAMES = 12; // a hit during a windup cancels it and stuns this long
const ENEMY_SHOT_FLASH_FRAMES = 10; // a shooter flashes this long before it fires
const ENEMY_HURT_FRAMES = 6; // how long the hit flash lasts
const ENEMY_SWING_FRAMES = 10; // how long a melee swing can hit
const ENEMY_KNOCKBACK_SPEED = 3; // pixels per frame at the start of a shove
const ENEMY_KNOCKBACK_FRAMES = 8;
const ENEMY_KNOCKBACK_DECAY = 0.8; // the shove keeps this much of its speed each frame
