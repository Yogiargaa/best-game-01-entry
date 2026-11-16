// Particles, floating score texts and expanding rings, all from fixed pools:
// nothing allocates once the game is running. The world spawns effects through
// the burst helpers; the renderer draws whatever is alive.

import { POOL } from './config.js';

export function createEffects() {
  const particles = [];
  for (let i = 0; i < POOL.particles; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 0, gravity: 0, glow: false });
  }
  const texts = [];
  for (let i = 0; i < POOL.texts; i += 1) {
    texts.push({ active: false, x: 0, y: 0, life: 0, maxLife: 1, value: '', color: '#fff', size: 18 });
  }
  const rings = [];
  for (let i = 0; i < 12; i += 1) {
    rings.push({ active: false, x: 0, y: 0, radius: 0, maxRadius: 60, life: 0, maxLife: 0.4, color: '#fff', width: 3 });
  }
  let shake = 0;

  function spawnParticle(x, y, vx, vy, life, size, color, options = {}) {
    for (const p of particles) {
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.size = size;
      p.color = color;
      p.drag = options.drag ?? 2.5;
      p.gravity = options.gravity ?? 0;
      p.glow = options.glow ?? false;
      return;
    }
  }

  function burst(x, y, count, color, speed, options = {}) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const power = speed * (0.3 + Math.random() * 0.9);
      spawnParticle(
        x, y,
        Math.cos(angle) * power, Math.sin(angle) * power,
        0.35 + Math.random() * 0.45,
        1.5 + Math.random() * 3,
        color,
        options,
      );
    }
  }

  return {
    particles,
    texts,
    rings,
    get shake() {
      return shake;
    },
    addShake(amount) {
      shake = Math.min(18, shake + amount);
    },
    burst,
    ring(x, y, maxRadius, color, life = 0.4, width = 3) {
      for (const r of rings) {
        if (r.active) continue;
        r.active = true;
        r.x = x;
        r.y = y;
        r.radius = 6;
        r.maxRadius = maxRadius;
        r.life = life;
        r.maxLife = life;
        r.color = color;
        r.width = width;
        return;
      }
    },
    floatText(x, y, value, color, size = 18) {
      for (const t of texts) {
        if (t.active) continue;
        t.active = true;
        t.x = x;
        t.y = y;
        t.life = 0.9;
        t.maxLife = 0.9;
        t.value = value;
        t.color = color;
        t.size = size;
        return;
      }
    },
    /** Sparks thrown off when a bolt hits: small, fast, and additive-looking. */
    hitSparks(x, y, color) {
      burst(x, y, 6, color, 260, { glow: true, drag: 4 });
    },
    /** A death puff: a ring plus a cloud of the enemy's colour. */
    deathBurst(x, y, color) {
      burst(x, y, 22, color, 300, { glow: true });
      burst(x, y, 8, '#ffffff', 160, { glow: true });
      this.ring(x, y, 54, color, 0.35, 3);
    },
    /** Petals and light when a bloom is chewed or lost. */
    bloomBurst(x, y, color, big) {
      burst(x, y, big ? 30 : 8, color, big ? 320 : 170, { gravity: 160, drag: 1.6 });
      if (big) this.ring(x, y, 90, color, 0.5, 4);
    },
    dashTrail(x, y, color) {
      spawnParticle(x, y, 0, 0, 0.3, 5, color, { drag: 0, glow: true });
    },
    boltTrail(x, y, color) {
      spawnParticle(x, y, 0, 0, 0.18, 2.5, color, { drag: 0, glow: true });
    },
    step(dt) {
      shake = Math.max(0, shake - dt * 42);
      for (const p of particles) {
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        const drag = Math.max(0, 1 - p.drag * dt);
        p.vx *= drag;
        p.vy = p.vy * drag + p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (const t of texts) {
        if (!t.active) continue;
        t.life -= dt;
        t.y -= 42 * dt;
        if (t.life <= 0) t.active = false;
      }
      for (const r of rings) {
        if (!r.active) continue;
        r.life -= dt;
        const done = 1 - Math.max(0, r.life / r.maxLife);
        r.radius = 6 + (r.maxRadius - 6) * done * done;
        if (r.life <= 0) r.active = false;
      }
    },
    reset() {
      for (const p of particles) p.active = false;
      for (const t of texts) t.active = false;
      for (const r of rings) r.active = false;
      shake = 0;
    },
  };
}
