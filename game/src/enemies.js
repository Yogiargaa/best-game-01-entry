// The gloom creatures: their kinds, their stats, and how each one moves and
// attacks. Behaviour only — the world owns the pool and the collisions, and the
// renderer owns every pixel. An enemy's `update` gets a context with the player,
// the blooms, the seeded random stream and callbacks to fire globs or summon
// minions, and returns nothing: it steers the enemy in place.

import { BOSS, CHEW, ENEMY, FIELD, HP_PER_WAVE, SPITTER } from './config.js';

export const KIND_MOTH = 'moth';
export const KIND_WISP = 'wisp';
export const KIND_SPITTER = 'spitter';
export const KIND_BEETLE = 'beetle';
export const KIND_BOSS = 'boss';

/** A fresh enemy object; the world reuses these from its pool. */
export function makeEnemy(kind, x, y, wave, random) {
  const def = ENEMY[kind];
  const hpScale = 1 + HP_PER_WAVE * (wave - 1);
  return {
    active: true,
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: Math.round(def.hp * hpScale),
    maxHp: Math.round(def.hp * hpScale),
    radius: def.radius,
    speed: def.speed,
    score: def.score,
    flash: 0,
    wobble: random() * Math.PI * 2,
    attackTimer: 1 + random() * 1.5,
    summonTimer: BOSS.summonInterval,
    burstTimer: BOSS.burstInterval,
    chargeTimer: BOSS.chargeInterval,
    charging: 0,
    chargeVx: 0,
    chargeVy: 0,
    chewing: -1,
    dead: false,
  };
}

function nearestBloom(blooms, x, y) {
  let best = null;
  let bestDistance = Infinity;
  for (const bloom of blooms) {
    if (bloom.hp <= 0) continue;
    const dx = bloom.x - x;
    const dy = bloom.y - y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = bloom;
    }
  }
  return best;
}

function steer(e, targetX, targetY, dt, wobbleAmount, time) {
  const dx = targetX - e.x;
  const dy = targetY - e.y;
  const distance = Math.hypot(dx, dy) || 1;
  let vx = (dx / distance) * e.speed;
  let vy = (dy / distance) * e.speed;
  if (wobbleAmount > 0) {
    const wobble = Math.sin(time * 2.4 + e.wobble) * wobbleAmount;
    vx += (-dy / distance) * wobble;
    vy += (dx / distance) * wobble;
  }
  e.x += vx * dt;
  e.y += vy * dt;
  e.vx = vx;
  e.vy = vy;
}

function updateMoth(e, dt, ctx) {
  const playerNear = Math.hypot(ctx.player.x - e.x, ctx.player.y - e.y) < 150;
  if (playerNear) {
    steer(e, ctx.player.x, ctx.player.y, dt, 26, ctx.time);
  } else {
    const bloom = nearestBloom(ctx.blooms, e.x, e.y);
    if (bloom) steer(e, bloom.x, bloom.y, dt, 30, ctx.time);
  }
}

function updateWisp(e, dt, ctx) {
  steer(e, ctx.player.x, ctx.player.y, dt, 90, ctx.time);
}

function updateSpitter(e, dt, ctx) {
  const bloom = nearestBloom(ctx.blooms, e.x, e.y);
  const playerDistance = Math.hypot(ctx.player.x - e.x, ctx.player.y - e.y);
  const target = playerDistance < 380 ? ctx.player : bloom;
  if (!target) return;
  const dx = e.x - target.x;
  const dy = e.y - target.y;
  const distance = Math.hypot(dx, dy) || 1;
  // Drift toward the preferred firing ring, strafing slowly around the target.
  const want = SPITTER.range;
  const radial = distance > want + 24 ? -1 : distance < want - 24 ? 1 : 0;
  const strafe = Math.sin(ctx.time * 0.7 + e.wobble) > 0 ? 1 : -1;
  e.x += ((-dx / distance) * radial + (-dy / distance) * strafe * 0.5) * e.speed * dt;
  e.y += ((-dy / distance) * radial + (dx / distance) * strafe * 0.5) * e.speed * dt;
  e.attackTimer -= dt;
  if (e.attackTimer <= 0 && distance < 430) {
    ctx.fireGlob(e.x, e.y, target.x, target.y);
    e.attackTimer = SPITTER.cooldown;
  }
}

function updateBeetle(e, dt, ctx) {
  const bloom = nearestBloom(ctx.blooms, e.x, e.y);
  if (bloom) steer(e, bloom.x, bloom.y, dt, 0, ctx.time);
}

function bossPhase(e) {
  const fraction = e.hp / e.maxHp;
  if (fraction > 0.66) return 1;
  if (fraction > 0.33) return 2;
  return 3;
}

function updateBoss(e, dt, ctx) {
  const phase = bossPhase(e);
  e.summonTimer -= dt;
  if (e.summonTimer <= 0) {
    const kind = phase === 1 ? KIND_MOTH : KIND_WISP;
    ctx.summon(kind, e.x + 40, e.y);
    ctx.summon(kind, e.x - 40, e.y);
    e.summonTimer = BOSS.summonInterval;
  }
  if (e.charging > 0) {
    e.charging -= dt;
    e.x += e.chargeVx * dt;
    e.y += e.chargeVy * dt;
    e.x = Math.max(e.radius, Math.min(FIELD.width - e.radius, e.x));
    e.y = Math.max(e.radius, Math.min(FIELD.height - e.radius, e.y));
    return;
  }
  if (phase >= 2) {
    e.burstTimer -= dt;
    if (e.burstTimer <= 0) {
      ctx.radialBurst(e.x, e.y, BOSS.burstShots);
      e.burstTimer = BOSS.burstInterval;
    }
  }
  if (phase === 3) {
    e.chargeTimer -= dt;
    if (e.chargeTimer <= 0) {
      const dx = ctx.player.x - e.x;
      const dy = ctx.player.y - e.y;
      const distance = Math.hypot(dx, dy) || 1;
      e.chargeVx = (dx / distance) * BOSS.chargeSpeed;
      e.chargeVy = (dy / distance) * BOSS.chargeSpeed;
      e.charging = BOSS.chargeTime;
      e.chargeTimer = BOSS.chargeInterval;
      return;
    }
  }
  // The queen drifts toward the player, slow and inevitable.
  steer(e, ctx.player.x, ctx.player.y, dt, 12, ctx.time);
  e.x = Math.max(e.radius, Math.min(FIELD.width - e.radius, e.x));
  e.y = Math.max(e.radius, Math.min(FIELD.height - e.radius, e.y));
}

const UPDATERS = {
  [KIND_MOTH]: updateMoth,
  [KIND_WISP]: updateWisp,
  [KIND_SPITTER]: updateSpitter,
  [KIND_BEETLE]: updateBeetle,
  [KIND_BOSS]: updateBoss,
};

/**
 * Advance one enemy a step. While it chews a bloom it stays put; otherwise its
 * kind's behaviour steers it. `ctx` carries the player, blooms, time, the
 * random stream and the fireGlob / summon / radialBurst callbacks.
 */
export function updateEnemy(e, dt, ctx) {
  if (e.flash > 0) e.flash -= dt;
  if (e.chewing >= 0) return;
  const update = UPDATERS[e.kind];
  if (update) update(e, dt, ctx);
}

/** How much bloom health this enemy chews per second while on a bloom. */
export function chewRate(kind) {
  return CHEW[kind] ?? 5;
}
