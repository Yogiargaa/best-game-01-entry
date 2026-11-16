// Drawing the world: the moonlit field, the grove, the lantern spirit, the
// gloom creatures and every spark in between. All drawing happens in field
// coordinates (1280×720) through a letterboxed transform; the canvas itself
// fills the window at up to 2× device pixels. The static meadow is painted
// once onto an offscreen canvas so each frame only draws what moves.

import { BLOOM, FIELD, GLOB, GROVE, PALETTE, PICKUP, PLAYER } from './config.js';
import { createRandom } from './random.js';
import { drawHeart, drawStar, roundRect } from './shapes.js';

const TAU = Math.PI * 2;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let view = { scale: 1, ox: 0, oy: 0, dpr: 1 };
  let meadow = null;

  function paintMeadow() {
    const random = createRandom(7);
    const layer = document.createElement('canvas');
    layer.width = FIELD.width;
    layer.height = FIELD.height;
    const g = layer.getContext('2d');
    const gradient = g.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.ground);
    gradient.addColorStop(1, PALETTE.groundEdge);
    g.fillStyle = gradient;
    g.fillRect(0, 0, FIELD.width, FIELD.height);
    // Firefly meadow: grass tufts, tiny wildflowers, stones.
    for (let i = 0; i < 300; i += 1) {
      const x = random() * FIELD.width;
      const y = random() * FIELD.height;
      const height = 5 + random() * 9;
      g.strokeStyle = random() < 0.5 ? '#2c4a34' : '#35593d';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (random() - 0.5) * 6, y - height * 0.6, x + (random() - 0.5) * 8, y - height);
      g.stroke();
    }
    for (let i = 0; i < 70; i += 1) {
      const x = random() * FIELD.width;
      const y = random() * FIELD.height;
      const color = random.pick(['#5a7f8c', '#7d6a9e', '#8c7a5a', '#4f7a5a']);
      g.fillStyle = color;
      for (let petal = 0; petal < 5; petal += 1) {
        const angle = (petal / 5) * TAU;
        g.beginPath();
        g.arc(x + Math.cos(angle) * 3, y + Math.sin(angle) * 3, 2.2, 0, TAU);
        g.fill();
      }
      g.fillStyle = '#e8d98a';
      g.beginPath();
      g.arc(x, y, 1.8, 0, TAU);
      g.fill();
    }
    for (let i = 0; i < 16; i += 1) {
      const x = random() * FIELD.width;
      const y = random() * FIELD.height;
      g.fillStyle = '#3a4356';
      g.beginPath();
      g.ellipse(x, y, 6 + random() * 10, 4 + random() * 5, random() * TAU, 0, TAU);
      g.fill();
    }
    // The grove: a soft pool of light on the grass, ringed with petals.
    const glow = g.createRadialGradient(GROVE.x, GROVE.y, 20, GROVE.x, GROVE.y, GROVE.radius + 90);
    glow.addColorStop(0, 'rgba(255, 233, 168, 0.16)');
    glow.addColorStop(1, 'rgba(255, 233, 168, 0)');
    g.fillStyle = glow;
    g.fillRect(GROVE.x - GROVE.radius - 90, GROVE.y - GROVE.radius - 90, (GROVE.radius + 90) * 2, (GROVE.radius + 90) * 2);
    g.strokeStyle = 'rgba(255, 233, 168, 0.25)';
    g.lineWidth = 2;
    g.setLineDash([10, 14]);
    g.beginPath();
    g.arc(GROVE.x, GROVE.y, GROVE.radius + 26, 0, TAU);
    g.stroke();
    g.setLineDash([]);
    return layer;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    view = {
      scale,
      ox: (rect.width - FIELD.width * scale) / 2,
      oy: (rect.height - FIELD.height * scale) / 2,
      dpr,
    };
    if (!meadow) meadow = paintMeadow();
  }

  window.addEventListener('resize', resize);
  resize();

  /** The transform the input layer needs, in client coordinates. */
  function syncView() {
    const rect = canvas.getBoundingClientRect();
    return { scale: view.scale, ox: rect.left + view.ox, oy: rect.top + view.oy };
  }

  function beginFrame(shake) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    const sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * (view.ox + sx * view.scale), view.dpr * (view.oy + sy * view.scale));
    ctx.beginPath();
    ctx.rect(0, 0, FIELD.width, FIELD.height);
    ctx.clip();
  }

  function drawBloom(bloom, time) {
    const alive = bloom.hp > 0;
    const sway = Math.sin(time * 1.4 + bloom.phase) * 0.08;
    ctx.save();
    ctx.translate(bloom.x, bloom.y);
    if (alive) {
      const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 58);
      glow.addColorStop(0, bloom.color + '55');
      glow.addColorStop(1, bloom.color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 58, 0, TAU);
      ctx.fill();
    }
    ctx.rotate(sway);
    ctx.strokeStyle = alive ? '#3f7a4a' : '#6b5a3a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.quadraticCurveTo(3, 0, 0, -12);
    ctx.stroke();
    const petalCount = 6;
    for (let i = 0; i < petalCount; i += 1) {
      const angle = (i / petalCount) * TAU + time * 0.25;
      ctx.save();
      ctx.translate(0, -14);
      ctx.rotate(angle);
      ctx.fillStyle = alive ? bloom.color : '#7a6a4a';
      ctx.globalAlpha = alive ? 0.92 : 0.6;
      ctx.beginPath();
      ctx.ellipse(11, 0, 11, 6.5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = alive ? '#fff6d8' : '#8a7a52';
    ctx.beginPath();
    ctx.arc(0, -14, 6, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (alive) {
      // Health arc under the bloom.
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(bloom.x, bloom.y + 20, 15, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = bloom.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(bloom.x, bloom.y + 20, 15, -Math.PI / 2, -Math.PI / 2 + (bloom.hp / bloom.maxHp) * TAU);
      ctx.stroke();
      if (bloom.hurtFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${Math.min(0.5, bloom.hurtFlash * 2)})`;
        ctx.beginPath();
        ctx.arc(bloom.x, bloom.y - 8, 26, 0, TAU);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('wilted', bloom.x, bloom.y + 38);
    }
  }

  function drawPlayer(player, time) {
    const blink = player.invulnerable > 0 && Math.floor(time * 18) % 2 === 0;
    ctx.save();
    ctx.translate(player.x, player.y);
    if (blink) ctx.globalAlpha = 0.45;
    // Lantern light pooling on the grass.
    const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 90);
    glow.addColorStop(0, 'rgba(255, 233, 168, 0.28)');
    glow.addColorStop(1, 'rgba(255, 233, 168, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, TAU);
    ctx.fill();
    // Cloak.
    ctx.fillStyle = '#7a5c9e';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.quadraticCurveTo(13, -4, 11, 13);
    ctx.quadraticCurveTo(0, 17, -11, 13);
    ctx.quadraticCurveTo(-13, -4, 0, -16);
    ctx.fill();
    ctx.fillStyle = '#5d4480';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.quadraticCurveTo(8, -6, 7, 12);
    ctx.quadraticCurveTo(0, 15, -7, 12);
    ctx.quadraticCurveTo(-8, -6, 0, -16);
    ctx.fill();
    // Hood and face.
    ctx.fillStyle = '#8f6fb8';
    ctx.beginPath();
    ctx.arc(0, -8, 8.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(-3, -8, 1.8, 0, TAU);
    ctx.arc(3, -8, 1.8, 0, TAU);
    ctx.fill();
    // The lantern, held toward the aim.
    const lx = Math.cos(player.aimAngle) * 18;
    const ly = Math.sin(player.aimAngle) * 18;
    ctx.strokeStyle = '#c9a86a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    const lampGlow = ctx.createRadialGradient(lx, ly, 2, lx, ly, 20);
    lampGlow.addColorStop(0, 'rgba(255, 233, 168, 0.9)');
    lampGlow.addColorStop(1, 'rgba(255, 233, 168, 0)');
    ctx.fillStyle = lampGlow;
    ctx.beginPath();
    ctx.arc(lx, ly, 20, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(lx, ly, 5.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (player.shieldUntil > 0) {
      ctx.strokeStyle = PALETTE.shield;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 26, time * 1.5, time * 1.5 + TAU * 0.8);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // A hit flashes white only for the first half of its window, so sustained
  // fire reads as blinking rather than a permanent whiteout.
  function flashFill(e, color) {
    return e.flash > 0.045 ? '#ffffff' : color;
  }

  function drawMoth(e, time) {
    const flap = Math.sin(time * 14 + e.wobble) * 0.55;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.atan2(e.vy, e.vx) + Math.PI / 2);
    ctx.fillStyle = flashFill(e, PALETTE.mothWing);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(1, side);
      ctx.rotate(flap * 0.4);
      ctx.beginPath();
      ctx.ellipse(-7, 6, 9, 6, -0.5, 0, TAU);
      ctx.ellipse(7, 6, 9, 6, 0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = flashFill(e, PALETTE.mothBody);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 11, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(-2.5, -7, 1.6, 0, TAU);
    ctx.arc(2.5, -7, 1.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawWisp(e, time) {
    const bob = Math.sin(time * 5 + e.wobble) * 2;
    ctx.save();
    ctx.translate(e.x, e.y + bob);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
    glow.addColorStop(0, 'rgba(140, 220, 255, 0.35)');
    glow.addColorStop(1, 'rgba(140, 220, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, TAU);
    ctx.fill();
    ctx.fillStyle = flashFill(e, PALETTE.wisp);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, -2, 10, Math.PI, 0);
    const wave = Math.sin(time * 8 + e.wobble) * 2;
    ctx.lineTo(10, 8 + wave);
    ctx.lineTo(5, 4 - wave);
    ctx.lineTo(0, 9 + wave);
    ctx.lineTo(-5, 4 - wave);
    ctx.lineTo(-10, 8 + wave);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0b1026';
    ctx.beginPath();
    ctx.arc(-3.5, -3, 2, 0, TAU);
    ctx.arc(3.5, -3, 2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawSpitter(e, time) {
    const pulse = 1 + Math.sin(time * 4 + e.wobble) * 0.06;
    const windup = e.attackTimer < 0.45;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = flashFill(e, PALETTE.spitter);
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = flashFill(e, '#5e2f7a');
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, TAU);
    ctx.fill();
    const aimAngle = Math.atan2(e.vy, e.vx);
    ctx.rotate(aimAngle);
    ctx.fillStyle = windup ? '#e3b3ff' : '#8f5ab8';
    ctx.beginPath();
    ctx.moveTo(10, -4);
    ctx.lineTo(22, 0);
    ctx.lineTo(10, 4);
    ctx.closePath();
    ctx.fill();
    if (windup) {
      ctx.fillStyle = 'rgba(227, 179, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(22, 0, 4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBeetle(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.atan2(e.vy, e.vx) + Math.PI / 2);
    ctx.strokeStyle = flashFill(e, '#2a2f45');
    ctx.lineWidth = 3;
    for (const side of [-1, 1]) {
      for (const leg of [-6, 0, 6]) {
        ctx.beginPath();
        ctx.moveTo(side * 8, leg);
        ctx.lineTo(side * 16, leg + 4);
        ctx.stroke();
      }
    }
    ctx.fillStyle = flashFill(e, PALETTE.beetle);
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 17, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#1c2036';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(0, 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-11, -4);
    ctx.quadraticCurveTo(0, 2, 11, -4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-11, 6);
    ctx.quadraticCurveTo(0, 12, 11, 6);
    ctx.stroke();
    ctx.fillStyle = flashFill(e, '#d8c26a');
    ctx.beginPath();
    ctx.arc(-4, -13, 2.4, 0, TAU);
    ctx.arc(4, -13, 2.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawBoss(e, time) {
    const flap = Math.sin(time * 3.2 + e.wobble) * 0.35;
    ctx.save();
    ctx.translate(e.x, e.y);
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 110);
    glow.addColorStop(0, 'rgba(179, 102, 255, 0.25)');
    glow.addColorStop(1, 'rgba(179, 102, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 110, 0, TAU);
    ctx.fill();
    ctx.rotate(Math.atan2(e.vy, e.vx) + Math.PI / 2);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(1, side);
      ctx.rotate(flap * 0.3);
      ctx.fillStyle = flashFill(e, PALETTE.bossWing);
      ctx.beginPath();
      ctx.ellipse(-26, 18, 30, 20, -0.4, 0, TAU);
      ctx.ellipse(26, 18, 30, 20, 0.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = flashFill(e, '#8f3fd8');
      ctx.beginPath();
      ctx.ellipse(-26, 18, 12, 8, -0.4, 0, TAU);
      ctx.ellipse(26, 18, 12, 8, 0.4, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = flashFill(e, '#3a1a5e');
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 26, 0, 0, TAU);
    ctx.fill();
    // Crown.
    ctx.fillStyle = '#e8c96a';
    ctx.beginPath();
    ctx.moveTo(-9, -22);
    ctx.lineTo(-9, -32);
    ctx.lineTo(-4.5, -25);
    ctx.lineTo(0, -34);
    ctx.lineTo(4.5, -25);
    ctx.lineTo(9, -32);
    ctx.lineTo(9, -22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff5a7a';
    ctx.beginPath();
    ctx.arc(-5, -14, 3, 0, TAU);
    ctx.arc(5, -14, 3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  const DRAW_ENEMY = {
    moth: drawMoth,
    wisp: drawWisp,
    spitter: drawSpitter,
    beetle: drawBeetle,
    boss: drawBoss,
  };

  function drawBolt(bolt) {
    ctx.fillStyle = PALETTE.bolt;
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, PLAYER.boltRadius + 2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, PLAYER.boltRadius, 0, TAU);
    ctx.fill();
  }

  function drawGlob(glob, time) {
    const pulse = 1 + Math.sin(time * 9) * 0.12;
    ctx.fillStyle = PALETTE.glob;
    ctx.beginPath();
    ctx.arc(glob.x, glob.y, GLOB.radius * pulse, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#d9a0ff';
    ctx.beginPath();
    ctx.arc(glob.x - 2, glob.y - 2, 3, 0, TAU);
    ctx.fill();
  }

  function drawPickup(pickup, time) {
    const bob = Math.sin(time * 3 + pickup.phase) * 3;
    const y = pickup.y + bob;
    const blink = pickup.life < 2 && Math.floor(time * 6) % 2 === 0;
    if (blink) return;
    ctx.save();
    ctx.translate(pickup.x, y);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, TAU);
    ctx.fill();
    if (pickup.kind === 'heart') {
      drawHeart(ctx, 0, 0, 11, PALETTE.heart);
    } else if (pickup.kind === 'mote') {
      drawStar(ctx, 0, 0, 11, 5, 4.5, PALETTE.gold);
    } else if (pickup.kind === 'rapid') {
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.moveTo(2, -12);
      ctx.lineTo(-6, 2);
      ctx.lineTo(-1, 2);
      ctx.lineTo(-2, 12);
      ctx.lineTo(6, -2);
      ctx.lineTo(1, -2);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = PALETTE.shield;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(9, -6);
      ctx.lineTo(9, 2);
      ctx.quadraticCurveTo(9, 9, 0, 12);
      ctx.quadraticCurveTo(-9, 9, -9, 2);
      ctx.lineTo(-9, -6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0b1026';
      ctx.beginPath();
      ctx.arc(0, -1, 3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEffects(effects) {
    ctx.save();
    for (const ring of effects.rings) {
      if (!ring.active) continue;
      ctx.globalAlpha = Math.max(0, ring.life / ring.maxLife);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.width;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of effects.particles) {
      if (!p.active || !p.glow) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const p of effects.particles) {
      if (!p.active || p.glow) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of effects.texts) {
      if (!t.active) continue;
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.font = `bold ${t.size}px system-ui, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.value, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawStrikes(strikes) {
    for (const strike of strikes) {
      const urgent = strike.timer < 0.18;
      ctx.strokeStyle = urgent ? '#fff6d8' : 'rgba(255, 215, 130, 0.7)';
      ctx.lineWidth = urgent ? 3 : 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(strike.x, strike.y, 46, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      if (urgent) {
        ctx.fillStyle = 'rgba(255, 246, 216, 0.25)';
        ctx.fillRect(strike.x - 3, 0, 6, strike.y);
      }
    }
  }

  function drawEmbers(embers) {
    for (const ember of embers) {
      const alpha = Math.min(0.55, ember.life * 0.6);
      ctx.fillStyle = `rgba(255, 140, 60, ${alpha})`;
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.radius, 0, TAU);
      ctx.fill();
    }
  }

  function drawFireflies(fireflies, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const fly of fireflies) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 2 + fly.phase);
      ctx.globalAlpha = 0.25 + pulse * 0.5;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(fly.x, fly.y, fly.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWorld(state, effects) {
    beginFrame(effects.shake);
    ctx.drawImage(meadow, 0, 0);
    drawFireflies(state.fireflies, state.time);
    drawEmbers(state.embers);
    for (const bloom of state.blooms) drawBloom(bloom, state.time);
    for (const pickup of state.pickups) {
      if (pickup.active) drawPickup(pickup, state.time);
    }
    drawStrikes(state.strikes);
    // Enemies sorted by y so nearer ones overlap farther ones.
    const alive = state.enemies.filter((e) => e.active).sort((a, b) => a.y - b.y);
    for (const e of alive) {
      const draw = DRAW_ENEMY[e.kind];
      if (draw) draw(e, state.time);
    }
    for (const glob of state.globs) {
      if (glob.active) drawGlob(glob, state.time);
    }
    if (state.player) drawPlayer(state.player, state.time);
    for (const bolt of state.bolts) {
      if (bolt.active) drawBolt(bolt);
    }
    drawEffects(effects);
    // A soft vignette to hold the night in.
    const vignette = ctx.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.42,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.85,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (state.hurtFlash > 0) {
      ctx.fillStyle = `rgba(200, 40, 60, ${Math.min(0.28, state.hurtFlash * 0.5)})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  return {
    ctx,
    resize,
    syncView,
    drawWorld,
    drawHeart,
    roundRect,
  };
}
