// Glowkeeper — every tuning number, colour and wave table in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

/** The grove sits at the field's centre; blooms ring it at this radius. */
export const GROVE = { x: 640, y: 360, radius: 118 };

export const PLAYER = {
  radius: 15,
  speed: 305,
  hearts: 3,
  maxHearts: 6,
  fireInterval: 0.21,
  boltSpeed: 760,
  boltDamage: 1,
  boltRadius: 5,
  boltLife: 0.9,
  dashTime: 0.16,
  dashCooldown: 2.1,
  dashSpeed: 980,
  hurtInvulnerable: 1.0,
  magnetRadius: 90,
  aimAssist: 220,
};

export const BLOOM = {
  count: 5,
  radius: 26,
  hp: 46,
  maxHp: 60,
  /** Seconds a bloom flashes after being chewed. */
  hurtFlash: 0.35,
};

/** Damage per second each enemy kind chews from a bloom it has reached. */
export const CHEW = { moth: 7, wisp: 5, spitter: 4, beetle: 13, boss: 18 };

export const ENEMY = {
  moth: { hp: 3, speed: 58, radius: 14, score: 20, touch: 1, spawnWeight: 1 },
  wisp: { hp: 2, speed: 138, radius: 10, score: 25, touch: 1, spawnWeight: 1 },
  spitter: { hp: 5, speed: 46, radius: 16, score: 40, touch: 1, spawnWeight: 1 },
  beetle: { hp: 16, speed: 33, radius: 23, score: 70, touch: 1, spawnWeight: 1 },
  boss: { hp: 240, speed: 40, radius: 48, score: 1500, touch: 1, spawnWeight: 1 },
};

/** Enemy health grows a little with each wave, so late waves stay threatening. */
export const HP_PER_WAVE = 0.09;

export const GLOB = { speed: 235, radius: 8, life: 4, damage: 1 };
export const SPITTER = { range: 300, cooldown: 2.5, windup: 0.45 };

export const BOSS = {
  /** Seconds between the boss's minion summons. */
  summonInterval: 7,
  /** Seconds between radial bursts in phase 2 and below. */
  burstInterval: 3.4,
  burstShots: 12,
  chargeInterval: 5.5,
  chargeSpeed: 330,
  chargeTime: 0.7,
};

/**
 * The ten waves. Each lists the enemies that walk in from the dark, in spawn
 * order groups; the spawner releases them steadily from edge portals.
 */
export const WAVES = [
  { moth: 6, wisp: 0, spitter: 0, beetle: 0, interval: 0.95 },
  { moth: 8, wisp: 3, spitter: 0, beetle: 0, interval: 0.9 },
  { moth: 8, wisp: 4, spitter: 2, beetle: 0, interval: 0.85 },
  { moth: 10, wisp: 4, spitter: 2, beetle: 1, interval: 0.8 },
  { moth: 12, wisp: 6, spitter: 3, beetle: 2, interval: 0.75 },
  { moth: 14, wisp: 6, spitter: 4, beetle: 2, interval: 0.7 },
  { moth: 16, wisp: 8, spitter: 4, beetle: 3, interval: 0.65 },
  { moth: 18, wisp: 10, spitter: 5, beetle: 3, interval: 0.6 },
  { moth: 20, wisp: 12, spitter: 6, beetle: 4, interval: 0.55 },
  { moth: 6, wisp: 4, spitter: 0, beetle: 0, interval: 0.9, boss: true },
];

export const PICKUP = {
  radius: 13,
  life: 12,
  /** Drop chances on a kill, per enemy kind, for heart / rapid / shield / mote. */
  drop: {
    moth: { heart: 0.02, rapid: 0.03, shield: 0.015, mote: 0.1 },
    wisp: { heart: 0.02, rapid: 0.04, shield: 0.015, mote: 0.12 },
    spitter: { heart: 0.05, rapid: 0.05, shield: 0.03, mote: 0.15 },
    beetle: { heart: 0.22, rapid: 0.12, shield: 0.1, mote: 0.3 },
    boss: { heart: 1, rapid: 1, shield: 1, mote: 1 },
  },
  rapidTime: 8,
  shieldTime: 25,
  moteScore: 25,
};

export const COMBO = { window: 3.2, perTier: 8, maxMultiplier: 5 };

export const STARFALL = { interval: 6, radius: 130, damage: 6, fallTime: 0.55 };

export const POOL = { enemies: 90, bolts: 64, globs: 48, particles: 420, texts: 32, pickups: 24 };

export const PALETTE = {
  backdrop: '#070b1a',
  skyTop: '#0a0f2b',
  skyBottom: '#13264d',
  ground: '#0d1a26',
  groundEdge: '#122636',
  tuft: '#1d3a2e',
  tuftTip: '#2e5a44',
  stone: '#223349',
  star: '#cdd9ff',
  player: '#ffd98c',
  playerCore: '#fff3cf',
  playerGlow: '#ffb84d',
  bolt: '#b8f4ff',
  boltCore: '#ffffff',
  glob: '#c86ef2',
  globCore: '#f0c8ff',
  mothWing: '#9a8ce0',
  mothBody: '#5b4fa8',
  wisp: '#7dffb0',
  spitter: '#d98ae0',
  spitterBelly: '#8e4fa8',
  beetle: '#7d90a8',
  beetleShell: '#4c5a70',
  bossWing: '#e3b3ff',
  bossBody: '#7b2fbe',
  bloomStem: '#3f7a52',
  bloomPetal: ['#6ef3ff', '#ff7ad9', '#ffd76e', '#b48cff', '#8dff9e'],
  bloomDead: '#4a5568',
  ember: '#ffb347',
  heart: '#ff6b81',
  heartEmpty: '#3a4358',
  shield: '#7fd4ff',
  panel: 'rgba(8, 13, 30, 0.88)',
  panelEdge: '#3a5a8a',
  text: '#eaf2ff',
  muted: '#93a3c4',
  gold: '#ffd76e',
  danger: '#ff5d6c',
  banner: '#ffe9a8',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score and best wave are kept between visits (this browser only). */
export const BEST_KEY = 'glowkeeper.best';
export const BEST_WAVE_KEY = 'glowkeeper.bestwave';
