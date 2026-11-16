// The game's rules and state, with no drawing and no browser in it: the lantern
// spirit, the glowblooms, the pools of bolts, globs, pickups and enemies, the
// waves, the combo, the pickups and the boss. step() advances one fixed step
// and returns what happened as bit flags, so the caller can play sounds and
// announce without the world knowing about screens or speakers.

import {
  BLOOM, CHEW, COMBO, ENEMY, FIELD, GLOB, GROVE, PALETTE, PICKUP, PLAYER,
  POOL, SPITTER, STARFALL, STEP, WAVES,
} from './config.js';
import { chewRate, KIND_BEETLE, KIND_BOSS, KIND_MOTH, KIND_SPITTER, KIND_WISP, makeEnemy, updateEnemy } from './enemies.js';
import { applyUpgrade, rollUpgrades } from './upgrades.js';

export const EVENT_SHOOT = 1;
export const EVENT_HIT = 2;
export const EVENT_KILL = 4;
export const EVENT_PICKUP = 8;
export const EVENT_WAVE = 16;
export const EVENT_CLEAR = 32;
export const EVENT_OVER = 64;
export const EVENT_WIN = 128;
export const EVENT_BLOOM_HURT = 256;
export const EVENT_BLOOM_LOST = 512;
export const EVENT_BOSS = 1024;
export const EVENT_DASH = 2048;
export const EVENT_OFFER = 4096;
export const EVENT_STARFALL = 8192;
export const EVENT_BOLT_HIT = 16384;

function makeStats() {
  return {
    fireInterval: PLAYER.fireInterval,
    boltDamage: PLAYER.boltDamage,
    boltCount: 1,
    pierce: 0,
    speed: PLAYER.speed,
    dashCooldown: PLAYER.dashCooldown,
    magnetRadius: PLAYER.magnetRadius,
    emberTrail: false,
    starfall: false,
    starfallInterval: STARFALL.interval,
    secondWind: false,
  };
}

export function createWorld(random, effects) {
  const state = {
    time: 0,
    runTime: 0,
    player: null,
    stats: makeStats(),
    blooms: [],
    enemies: [],
    bolts: [],
    globs: [],
    pickups: [],
    embers: [],
    strikes: [],
    fireflies: [],
    wave: 0,
    waveState: 'idle',
    spawnQueue: [],
    spawnTimer: 0,
    bossTimer: -1,
    boss: null,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    kills: 0,
    volleys: 0,
    boltsFired: 0,
    boltHits: 0,
    starfallTimer: STARFALL.interval,
    banner: { text: '', sub: '', until: 0 },
    taken: {},
    offered: [],
    over: false,
    won: false,
    hurtFlash: 0,
    secondWindUsed: false,
  };

  for (let i = 0; i < POOL.enemies; i += 1) {
    state.enemies.push({ active: false, kind: KIND_MOTH, x: 0, y: 0, vx: 0, vy: 0, hp: 1, maxHp: 1, radius: 10, speed: 0, score: 0, flash: 0, wobble: 0, attackTimer: 0, summonTimer: 0, burstTimer: 0, chargeTimer: 0, charging: 0, chargeVx: 0, chargeVy: 0, chewing: -1, dead: false });
  }
  for (let i = 0; i < POOL.bolts; i += 1) {
    state.bolts.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, damage: 1, pierce: 0, hit: null });
  }
  for (let i = 0; i < POOL.globs; i += 1) {
    state.globs.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 });
  }
  for (let i = 0; i < POOL.pickups; i += 1) {
    state.pickups.push({ active: false, kind: 'mote', x: 0, y: 0, vx: 0, vy: 0, life: 0, phase: 0 });
  }

  function resetPlayer() {
    state.player = {
      x: GROVE.x, y: GROVE.y, vx: 0, vy: 0,
      hearts: PLAYER.hearts, maxHearts: PLAYER.hearts,
      aimAngle: -Math.PI / 2, facing: -Math.PI / 2,
      fireTimer: 0, dashLeft: 0, dashCooldownLeft: 0, dashing: 0,
      invulnerable: 0, shieldUntil: 0, rapidUntil: 0,
      moving: false,
    };
  }

  function resetBlooms() {
    state.blooms = [];
    for (let i = 0; i < BLOOM.count; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI * 2) / BLOOM.count;
      state.blooms.push({
        x: GROVE.x + Math.cos(angle) * GROVE.radius,
        y: GROVE.y + Math.sin(angle) * GROVE.radius,
        hp: BLOOM.hp,
        maxHp: BLOOM.hp,
        color: PALETTE.bloomPetal[i % PALETTE.bloomPetal.length],
        phase: random() * Math.PI * 2,
        hurtFlash: 0,
        hurtTimer: 0,
      });
    }
  }

  function resetFireflies() {
    state.fireflies = [];
    for (let i = 0; i < 26; i += 1) {
      state.fireflies.push({
        x: random() * FIELD.width,
        y: random() * FIELD.height,
        phase: random() * Math.PI * 2,
        speed: 8 + random() * 14,
        size: 1.5 + random() * 2,
      });
    }
  }

  function reset() {
    state.time = 0;
    state.runTime = 0;
    state.stats = makeStats();
    resetPlayer();
    resetBlooms();
    resetFireflies();
    for (const e of state.enemies) e.active = false;
    for (const b of state.bolts) b.active = false;
    for (const g of state.globs) g.active = false;
    for (const p of state.pickups) p.active = false;
    state.embers = [];
    state.strikes = [];
    state.wave = 0;
    state.waveState = 'idle';
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.bossTimer = -1;
    state.boss = null;
    state.score = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.kills = 0;
    state.volleys = 0;
    state.boltsFired = 0;
    state.boltHits = 0;
    state.starfallTimer = STARFALL.interval;
    state.banner = { text: '', sub: '', until: 0 };
    state.taken = {};
    state.offered = [];
    state.over = false;
    state.won = false;
    state.hurtFlash = 0;
    state.secondWindUsed = false;
    effects.reset();
  }

  function edgePoint() {
    const side = random.int(4);
    const margin = 34;
    if (side === 0) return { x: random.range(0, FIELD.width), y: -margin };
    if (side === 1) return { x: FIELD.width + margin, y: random.range(0, FIELD.height) };
    if (side === 2) return { x: random.range(0, FIELD.width), y: FIELD.height + margin };
    return { x: -margin, y: random.range(0, FIELD.height) };
  }

  function spawnEnemy(kind, x, y) {
    for (const slot of state.enemies) {
      if (slot.active) continue;
      const fresh = makeEnemy(kind, x, y, Math.max(1, state.wave), random);
      Object.assign(slot, fresh);
      return slot;
    }
    return null;
  }

  function spawnBoss() {
    const boss = spawnEnemy(KIND_BOSS, FIELD.width / 2, -60);
    if (boss) {
      state.boss = boss;
      state.banner = { text: 'THE GLOOM QUEEN', sub: 'Hold the grove. Do not let her reach the blooms.', until: state.time + 3.2 };
    }
    return boss;
  }

  function startWave(n) {
    const wave = WAVES[n - 1];
    state.wave = n;
    state.waveState = 'spawning';
    state.spawnQueue = [];
    for (const kind of [KIND_MOTH, KIND_WISP, KIND_SPITTER, KIND_BEETLE]) {
      for (let i = 0; i < (wave[kind] ?? 0); i += 1) state.spawnQueue.push(kind);
    }
    // Shuffle the queue so the wave never arrives in one predictable clump.
    for (let i = state.spawnQueue.length - 1; i > 0; i -= 1) {
      const j = random.int(i + 1);
      [state.spawnQueue[i], state.spawnQueue[j]] = [state.spawnQueue[j], state.spawnQueue[i]];
    }
    state.spawnTimer = 1.1;
    state.bossTimer = wave.boss ? 4 : -1;
    state.banner = wave.boss
      ? { text: 'FINAL WAVE', sub: 'Something vast moves in the dark…', until: state.time + 3 }
      : { text: `WAVE ${n}`, sub: n === 1 ? 'Guard the glowblooms' : '', until: state.time + 2.4 };
  }

  function offerUpgrades() {
    state.offered = rollUpgrades(random, state.taken);
    state.waveState = 'offer';
    return state.offered;
  }

  function grantUpgrade(def) {
    applyUpgrade(def, state.stats, state, state.taken);
    state.offered = [];
  }

  function multiplier() {
    return Math.min(COMBO.maxMultiplier, 1 + Math.floor(state.combo / COMBO.perTier));
  }

  function addScore(base, x, y) {
    const gained = base * multiplier();
    state.score += gained;
    if (x !== undefined) effects.floatText(x, y, `+${gained}`, '#ffe9a8', 16);
    return gained;
  }

  function dropPickup(kind, x, y) {
    const chances = PICKUP.drop[kind];
    if (!chances) return;
    const roll = random();
    let acc = 0;
    let picked = null;
    for (const name of ['heart', 'rapid', 'shield', 'mote']) {
      acc += chances[name];
      if (roll < acc) {
        picked = name;
        break;
      }
    }
    if (!picked) return;
    for (const slot of state.pickups) {
      if (slot.active) continue;
      slot.active = true;
      slot.kind = picked;
      slot.x = x;
      slot.y = y;
      const angle = random() * Math.PI * 2;
      slot.vx = Math.cos(angle) * 60;
      slot.vy = Math.sin(angle) * 60;
      slot.life = PICKUP.life;
      slot.phase = random() * Math.PI * 2;
      return;
    }
  }

  function killEnemy(e) {
    e.active = false;
    e.dead = true;
    state.kills += 1;
    state.combo += 1;
    state.comboTimer = COMBO.window;
    addScore(e.score, e.x, e.y - 14);
    effects.deathBurst(e.x, e.y, enemyColor(e.kind));
    if (e.kind === KIND_BEETLE) {
      spawnEnemy(KIND_WISP, e.x - 12, e.y);
      spawnEnemy(KIND_WISP, e.x + 12, e.y);
    }
    if (e.kind === KIND_BOSS) {
      state.boss = null;
      state.won = true;
      state.over = true;
      effects.addShake(14);
      effects.ring(e.x, e.y, 260, '#e3b3ff', 0.8, 5);
      effects.burst(e.x, e.y, 60, '#e3b3ff', 420, { glow: true });
      dropPickup(KIND_BOSS, e.x, e.y);
    } else {
      dropPickup(e.kind, e.x, e.y);
    }
  }

  function enemyColor(kind) {
    if (kind === KIND_MOTH) return PALETTE.mothWing;
    if (kind === KIND_WISP) return PALETTE.wisp;
    if (kind === KIND_SPITTER) return PALETTE.spitter;
    if (kind === KIND_BEETLE) return PALETTE.beetle;
    return PALETTE.bossWing;
  }

  function hurtPlayer(events) {
    const player = state.player;
    if (player.invulnerable > 0 || player.dashing > 0) return events;
    if (state.time < player.shieldUntil) {
      player.shieldUntil = 0;
      effects.ring(player.x, player.y, 60, PALETTE.shield, 0.4, 4);
      return events | EVENT_HIT;
    }
    player.hearts -= 1;
    player.invulnerable = PLAYER.hurtInvulnerable;
    state.combo = 0;
    state.comboTimer = 0;
    state.hurtFlash = 0.5;
    effects.addShake(10);
    effects.burst(player.x, player.y, 18, PALETTE.danger, 280, { glow: true });
    if (player.hearts <= 0) {
      if (state.stats.secondWind && !state.secondWindUsed) {
        state.secondWindUsed = true;
        player.hearts = 1;
        player.invulnerable = 2;
        effects.ring(player.x, player.y, 120, PALETTE.gold, 0.7, 5);
        state.banner = { text: 'SECOND WIND', sub: 'The lantern flares back to life.', until: state.time + 2.2 };
        return events | EVENT_HIT;
      }
      state.over = true;
      return events | EVENT_HIT | EVENT_OVER;
    }
    return events | EVENT_HIT;
  }

  function damageBloom(bloom, amount, events) {
    if (bloom.hp <= 0) return events;
    bloom.hp -= amount;
    bloom.hurtFlash = BLOOM.hurtFlash;
    if (bloom.hp <= 0) {
      bloom.hp = 0;
      effects.bloomBurst(bloom.x, bloom.y, bloom.color, true);
      effects.addShake(8);
      events |= EVENT_BLOOM_LOST;
      if (state.blooms.every((b) => b.hp <= 0)) {
        state.over = true;
        events |= EVENT_OVER;
      }
    }
    return events;
  }

  function fireGlob(x, y, tx, ty) {
    for (const slot of state.globs) {
      if (slot.active) continue;
      const dx = tx - x;
      const dy = ty - y;
      const distance = Math.hypot(dx, dy) || 1;
      slot.active = true;
      slot.x = x;
      slot.y = y;
      slot.vx = (dx / distance) * GLOB.speed;
      slot.vy = (dy / distance) * GLOB.speed;
      slot.life = GLOB.life;
      return;
    }
  }

  function nearestEnemy(x, y, maxDistance) {
    let best = null;
    let bestDistance = maxDistance * maxDistance;
    for (const e of state.enemies) {
      if (!e.active) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = e;
      }
    }
    return best;
  }

  function fireBolts(aimPoint) {
    const player = state.player;
    const stats = state.stats;
    let angle = player.aimAngle;
    if (aimPoint) {
      angle = Math.atan2(aimPoint.y - player.y, aimPoint.x - player.x);
    } else {
      const target = nearestEnemy(player.x, player.y, PLAYER.aimAssist);
      if (target) angle = Math.atan2(target.y - player.y, target.x - player.x);
      else angle = player.facing;
    }
    player.aimAngle = angle;
    const count = stats.boltCount;
    for (let i = 0; i < count; i += 1) {
      for (const slot of state.bolts) {
        if (slot.active) continue;
        const offset = (i - (count - 1) / 2) * 14;
        const px = -Math.sin(angle) * offset;
        const py = Math.cos(angle) * offset;
        slot.active = true;
        slot.x = player.x + Math.cos(angle) * 20 + px;
        slot.y = player.y + Math.sin(angle) * 20 + py;
        slot.vx = Math.cos(angle) * PLAYER.boltSpeed;
        slot.vy = Math.sin(angle) * PLAYER.boltSpeed;
        slot.life = PLAYER.boltLife;
        slot.damage = stats.boltDamage;
        slot.pierce = stats.pierce;
        slot.hit = null;
        state.boltsFired += 1;
        break;
      }
    }
    state.volleys += 1;
  }

  function updatePlayer(dt, input, events) {
    const player = state.player;
    const stats = state.stats;
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (player.dashCooldownLeft > 0) player.dashCooldownLeft -= dt;
    if (player.fireTimer > 0) player.fireTimer -= dt;

    const move = input.move;
    player.moving = move.x !== 0 || move.y !== 0;
    if (player.moving) player.facing = Math.atan2(move.y, move.x);

    if (input.dash && player.dashCooldownLeft <= 0 && player.dashing <= 0) {
      player.dashing = PLAYER.dashTime;
      player.dashCooldownLeft = stats.dashCooldown;
      player.invulnerable = Math.max(player.invulnerable, PLAYER.dashTime + 0.05);
      const angle = player.moving ? player.facing : player.aimAngle;
      player.vx = Math.cos(angle) * PLAYER.dashSpeed;
      player.vy = Math.sin(angle) * PLAYER.dashSpeed;
      events |= EVENT_DASH;
    }

    if (player.dashing > 0) {
      player.dashing -= dt;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      effects.dashTrail(player.x, player.y, PALETTE.playerGlow);
      if (stats.emberTrail) {
        state.embers.push({ x: player.x, y: player.y, life: 1.1, radius: 26, tick: 0 });
      }
    } else {
      player.x += move.x * stats.speed * dt;
      player.y += move.y * stats.speed * dt;
    }
    player.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, player.x));
    player.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, player.y));

    if (input.aim) {
      player.aimAngle = Math.atan2(input.aim.y - player.y, input.aim.x - player.x);
    }
    const rapid = state.time < player.rapidUntil;
    if (input.firing && player.fireTimer <= 0 && player.dashing <= 0) {
      fireBolts(input.aim);
      player.fireTimer = stats.fireInterval * (rapid ? 0.5 : 1);
      events |= EVENT_SHOOT;
    }
    return events;
  }

  function updateBolts(dt, events) {
    for (const bolt of state.bolts) {
      if (!bolt.active) continue;
      bolt.life -= dt;
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      effects.boltTrail(bolt.x, bolt.y, PALETTE.bolt);
      if (bolt.life <= 0 || bolt.x < -20 || bolt.x > FIELD.width + 20 || bolt.y < -20 || bolt.y > FIELD.height + 20) {
        bolt.active = false;
        continue;
      }
      for (const e of state.enemies) {
        if (!e.active || bolt.hit === e) continue;
        const dx = e.x - bolt.x;
        const dy = e.y - bolt.y;
        const reach = e.radius + PLAYER.boltRadius;
        if (dx * dx + dy * dy > reach * reach) continue;
        e.hp -= bolt.damage;
        e.flash = 0.09;
        state.boltHits += 1;
        effects.hitSparks(bolt.x, bolt.y, PALETTE.bolt);
        effects.floatText(e.x, e.y - e.radius - 6, String(bolt.damage), '#dff6ff', 14);
        // A nudge away from the shot keeps the fight feeling physical.
        e.x += bolt.vx * 0.008;
        e.y += bolt.vy * 0.008;
        if (e.hp <= 0) {
          killEnemy(e);
          events |= EVENT_KILL;
        } else {
          events |= EVENT_BOLT_HIT;
        }
        if (bolt.pierce > 0) {
          bolt.pierce -= 1;
          bolt.hit = e;
        } else {
          bolt.active = false;
        }
        break;
      }
    }
    return events;
  }

  function updateEnemies(dt, events) {
    const ctx = {
      player: state.player,
      blooms: state.blooms,
      time: state.time,
      random,
      fireGlob,
      summon(kind, x, y) {
        spawnEnemy(kind, x, y);
      },
      radialBurst(x, y, count) {
        for (let i = 0; i < count; i += 1) {
          const angle = (i / count) * Math.PI * 2 + state.time;
          fireGlob(x, y, x + Math.cos(angle) * 100, y + Math.sin(angle) * 100);
        }
      },
    };
    for (const e of state.enemies) {
      if (!e.active) continue;
      // Chewing: an enemy overlapping a living bloom stops and eats it.
      e.chewing = -1;
      for (let i = 0; i < state.blooms.length; i += 1) {
        const bloom = state.blooms[i];
        if (bloom.hp <= 0) continue;
        const dx = bloom.x - e.x;
        const dy = bloom.y - e.y;
        const reach = bloomRadius(bloom) + e.radius * 0.7;
        if (dx * dx + dy * dy < reach * reach) {
          e.chewing = i;
          bloom.hurtTimer -= dt;
          const before = events;
          events = damageBloom(bloom, chewRate(e.kind) * dt, events);
          if (bloom.hurtTimer <= 0) {
            bloom.hurtTimer = 0.5;
            effects.bloomBurst(bloom.x, bloom.y, bloom.color, false);
            events |= EVENT_BLOOM_HURT;
          }
          if ((events & EVENT_BLOOM_LOST) !== (before & EVENT_BLOOM_LOST)) {
            // The bloom fell: the eater moves on next step.
          }
          break;
        }
      }
      updateEnemy(e, dt, ctx);
      // Touching the player hurts, with knockback on the enemy.
      const player = state.player;
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const reach = e.radius + PLAYER.radius;
      if (dx * dx + dy * dy < reach * reach && player.invulnerable <= 0 && player.dashing <= 0) {
        const distance = Math.hypot(dx, dy) || 1;
        e.x -= (dx / distance) * 26;
        e.y -= (dy / distance) * 26;
        events = hurtPlayer(events);
      }
    }
    return events;
  }

  function bloomRadius() {
    return BLOOM.radius;
  }

  function updateGlobs(dt, events) {
    for (const glob of state.globs) {
      if (!glob.active) continue;
      glob.life -= dt;
      glob.x += glob.vx * dt;
      glob.y += glob.vy * dt;
      if (glob.life <= 0 || glob.x < -20 || glob.x > FIELD.width + 20 || glob.y < -20 || glob.y > FIELD.height + 20) {
        glob.active = false;
        continue;
      }
      const player = state.player;
      const dx = player.x - glob.x;
      const dy = player.y - glob.y;
      const reach = GLOB.radius + PLAYER.radius;
      if (dx * dx + dy * dy < reach * reach) {
        glob.active = false;
        effects.burst(glob.x, glob.y, 10, PALETTE.glob, 220, { glow: true });
        events = hurtPlayer(events);
        continue;
      }
      for (const bloom of state.blooms) {
        if (bloom.hp <= 0) continue;
        const bx = bloom.x - glob.x;
        const by = bloom.y - glob.y;
        const breac = GLOB.radius + BLOOM.radius * 0.7;
        if (bx * bx + by * by < breac * breac) {
          glob.active = false;
          events = damageBloom(bloom, 4, events);
          effects.bloomBurst(bloom.x, bloom.y, bloom.color, false);
          break;
        }
      }
    }
    return events;
  }

  function updatePickups(dt, events) {
    const player = state.player;
    for (const pickup of state.pickups) {
      if (!pickup.active) continue;
      pickup.life -= dt;
      if (pickup.life <= 0) {
        pickup.active = false;
        continue;
      }
      const dx = player.x - pickup.x;
      const dy = player.y - pickup.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < state.stats.magnetRadius) {
        const pull = 340 * (1 - distance / state.stats.magnetRadius) + 120;
        pickup.vx += (dx / distance) * pull * dt * 4;
        pickup.vy += (dy / distance) * pull * dt * 4;
      }
      pickup.vx *= Math.max(0, 1 - 3 * dt);
      pickup.vy *= Math.max(0, 1 - 3 * dt);
      pickup.x += pickup.vx * dt;
      pickup.y += pickup.vy * dt;
      if (distance < PLAYER.radius + PICKUP.radius) {
        pickup.active = false;
        if (pickup.kind === 'heart') {
          if (player.hearts < player.maxHearts) {
            player.hearts += 1;
            effects.floatText(player.x, player.y - 26, '+1 ♥', PALETTE.heart, 18);
          } else {
            addScore(50, player.x, player.y - 26);
          }
        } else if (pickup.kind === 'mote') {
          addScore(PICKUP.moteScore, pickup.x, pickup.y - 10);
        } else if (pickup.kind === 'rapid') {
          player.rapidUntil = state.time + PICKUP.rapidTime;
          effects.floatText(player.x, player.y - 26, 'RAPID FIRE', PALETTE.gold, 16);
        } else if (pickup.kind === 'shield') {
          player.shieldUntil = state.time + PICKUP.shieldTime;
          effects.floatText(player.x, player.y - 26, 'SHIELD', PALETTE.shield, 16);
        }
        effects.ring(pickup.x, pickup.y, 34, '#ffffff', 0.3, 2);
        events |= EVENT_PICKUP;
      }
    }
    return events;
  }

  function updateEmbers(dt, events) {
    for (let i = state.embers.length - 1; i >= 0; i -= 1) {
      const ember = state.embers[i];
      ember.life -= dt;
      ember.tick -= dt;
      if (ember.life <= 0) {
        state.embers.splice(i, 1);
        continue;
      }
      if (ember.tick <= 0) {
        ember.tick = 0.25;
        for (const e of state.enemies) {
          if (!e.active) continue;
          const dx = e.x - ember.x;
          const dy = e.y - ember.y;
          if (dx * dx + dy * dy < (ember.radius + e.radius) * (ember.radius + e.radius)) {
            e.hp -= 2;
            e.flash = 0.09;
            if (e.hp <= 0) {
              killEnemy(e);
              events |= EVENT_KILL;
            }
          }
        }
      }
    }
    return events;
  }

  function updateStarfall(dt, events) {
    if (!state.stats.starfall) return events;
    state.starfallTimer -= dt;
    if (state.starfallTimer <= 0) {
      state.starfallTimer = state.stats.starfallInterval;
      // Strike the enemy with the most neighbours: the densest cluster.
      let best = null;
      let bestCount = 0;
      for (const e of state.enemies) {
        if (!e.active) continue;
        let count = 0;
        for (const other of state.enemies) {
          if (!other.active) continue;
          const dx = other.x - e.x;
          const dy = other.y - e.y;
          if (dx * dx + dy * dy < STARFALL.radius * STARFALL.radius) count += 1;
        }
        if (count > bestCount) {
          bestCount = count;
          best = e;
        }
      }
      if (best) {
        state.strikes.push({ x: best.x, y: best.y, timer: STARFALL.fallTime });
        events |= EVENT_STARFALL;
      }
    }
    for (let i = state.strikes.length - 1; i >= 0; i -= 1) {
      const strike = state.strikes[i];
      strike.timer -= dt;
      if (strike.timer > 0) continue;
      state.strikes.splice(i, 1);
      effects.addShake(6);
      effects.ring(strike.x, strike.y, STARFALL.radius, PALETTE.gold, 0.45, 4);
      effects.burst(strike.x, strike.y, 26, PALETTE.gold, 340, { glow: true });
      for (const e of state.enemies) {
        if (!e.active) continue;
        const dx = e.x - strike.x;
        const dy = e.y - strike.y;
        if (dx * dx + dy * dy < (STARFALL.radius + e.radius) * (STARFALL.radius + e.radius)) {
          e.hp -= STARFALL.damage;
          e.flash = 0.09;
          if (e.hp <= 0) {
            killEnemy(e);
            events |= EVENT_KILL;
          }
        }
      }
    }
    return events;
  }

  function updateSpawning(dt, events) {
    if (state.waveState !== 'spawning' && state.waveState !== 'fighting') return events;
    if (state.bossTimer > 0) {
      state.bossTimer -= dt;
      if (state.bossTimer <= 0 && !state.boss) {
        spawnBoss();
        events |= EVENT_BOSS;
      }
    }
    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        const kind = state.spawnQueue.shift();
        const point = edgePoint();
        spawnEnemy(kind, point.x, point.y);
        state.spawnTimer = WAVES[state.wave - 1].interval;
      }
    } else if (state.waveState === 'spawning') {
      state.waveState = 'fighting';
    }
    return events;
  }

  function enemiesLeft() {
    let count = state.spawnQueue.length;
    for (const e of state.enemies) if (e.active) count += 1;
    return count;
  }

  function updateFireflies(dt) {
    for (const fly of state.fireflies) {
      fly.phase += dt;
      fly.x += Math.cos(fly.phase * 0.6) * fly.speed * dt;
      fly.y += Math.sin(fly.phase * 0.8) * fly.speed * 0.6 * dt;
      if (fly.x < 0) fly.x += FIELD.width;
      if (fly.x > FIELD.width) fly.x -= FIELD.width;
      if (fly.y < 0) fly.y += FIELD.height;
      if (fly.y > FIELD.height) fly.y -= FIELD.height;
    }
  }

  /**
   * One fixed step of the run. `input` carries the move vector, whether the
   * fire button is held, the aim point in field coordinates (or null to
   * auto-aim), and whether dash was pressed this step.
   */
  function step(dt, input) {
    let events = 0;
    state.time += dt;
    state.runTime += dt;
    if (state.hurtFlash > 0) state.hurtFlash -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    for (const bloom of state.blooms) {
      if (bloom.hurtFlash > 0) bloom.hurtFlash -= dt;
    }

    events = updatePlayer(dt, input, events);
    events = updateSpawning(dt, events);
    events = updateBolts(dt, events);
    events = updateEnemies(dt, events);
    events = updateGlobs(dt, events);
    events = updatePickups(dt, events);
    events = updateEmbers(dt, events);
    events = updateStarfall(dt, events);
    updateFireflies(dt);
    effects.step(dt);

    if (!state.over && state.waveState === 'fighting' && enemiesLeft() === 0 && state.wave > 0 && state.wave < WAVES.length) {
      state.waveState = 'clear';
      events |= EVENT_CLEAR;
      offerUpgrades();
      events |= EVENT_OFFER;
    }
    if (state.over && state.won) events |= EVENT_WIN;
    return events;
  }

  /** The title screen's backdrop: fireflies drift and blooms sway, no danger. */
  function ambient(dt) {
    state.time += dt;
    updateFireflies(dt);
    effects.step(dt);
  }

  return {
    state,
    reset,
    startWave,
    offerUpgrades,
    grantUpgrade,
    spawnEnemy,
    spawnBoss,
    step,
    ambient,
    multiplier,
    enemiesLeft,
    /** The boss's remaining health as a fraction, or null when no boss lives. */
    bossFraction() {
      if (!state.boss || !state.boss.active) return null;
      return Math.max(0, state.boss.hp / state.boss.maxHp);
    },
  };
}
