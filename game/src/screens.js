// The overlays: the HUD during play, the wave banner, and the title, pause,
// upgrade and ending screens. Everything draws in field coordinates over the
// world the renderer has already painted.

import { BLOOM, COMBO, FIELD, GROVE, PALETTE, PLAYER, WAVES } from './config.js';
import { drawHeart, drawStar, roundRect } from './shapes.js';

const TAU = Math.PI * 2;
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const CARD_WIDTH = 300;
export const CARD_HEIGHT = 252;
export const CARD_GAP = 28;
export const CARD_Y = 236;

/** The three upgrade card rectangles, shared by the drawer and the click test. */
export function offerCardRects() {
  const total = CARD_WIDTH * 3 + CARD_GAP * 2;
  const startX = (FIELD.width - total) / 2;
  return [0, 1, 2].map((i) => ({
    x: startX + i * (CARD_WIDTH + CARD_GAP),
    y: CARD_Y,
    w: CARD_WIDTH,
    h: CARD_HEIGHT,
  }));
}

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(8, 10, 26, ${alpha})`;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function drawUpgradeIcon(ctx, icon, x, y, time) {
  ctx.save();
  ctx.translate(x, y);
  const pulse = 1 + Math.sin(time * 3) * 0.05;
  ctx.scale(pulse, pulse);
  if (icon === 'bolt') {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.moveTo(4, -20);
    ctx.lineTo(-10, 4);
    ctx.lineTo(-1, 4);
    ctx.lineTo(-4, 20);
    ctx.lineTo(10, -4);
    ctx.lineTo(1, -4);
    ctx.closePath();
    ctx.fill();
  } else if (icon === 'star') {
    drawStar(ctx, 0, 0, 20, 5, 8, PALETTE.gold);
  } else if (icon === 'wind') {
    ctx.strokeStyle = '#9fd8ef';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (const [dy, len] of [[-12, 30], [0, 40], [12, 26]]) {
      ctx.beginPath();
      ctx.moveTo(-len / 2, dy);
      ctx.lineTo(len / 2, dy);
      ctx.stroke();
    }
  } else if (icon === 'lantern') {
    ctx.strokeStyle = '#c9a86a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c9a86a';
    ctx.fillRect(-4, -20, 8, 5);
  } else if (icon === 'arrow') {
    ctx.strokeStyle = '#dff6ff';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(12, 0);
    ctx.moveTo(2, -10);
    ctx.lineTo(14, 0);
    ctx.lineTo(2, 10);
    ctx.stroke();
  } else if (icon === 'heart') {
    drawHeart(ctx, 0, 0, 16, PALETTE.heart);
  } else if (icon === 'bloom') {
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * TAU;
      ctx.fillStyle = '#ff8fb2';
      ctx.beginPath();
      ctx.ellipse(Math.cos(angle) * 11, Math.sin(angle) * 11, 9, 5.5, angle, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, TAU);
    ctx.fill();
  } else if (icon === 'dash') {
    ctx.strokeStyle = '#c9a8ff';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const offset of [-12, 0, 12]) {
      ctx.beginPath();
      ctx.moveTo(offset - 6, -12);
      ctx.lineTo(offset + 6, 0);
      ctx.lineTo(offset - 6, 12);
      ctx.stroke();
    }
  } else if (icon === 'magnet') {
    ctx.strokeStyle = '#ff8a5c';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, -2, 13, Math.PI, 0);
    ctx.lineTo(13, 10);
    ctx.lineTo(13, -2);
    ctx.moveTo(-13, -2);
    ctx.lineTo(-13, 10);
    ctx.stroke();
    ctx.fillStyle = '#fff6d8';
    ctx.fillRect(-17, 8, 8, 6);
    ctx.fillRect(9, 8, 8, 6);
  } else if (icon === 'ember') {
    ctx.fillStyle = '#ff8a3c';
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.quadraticCurveTo(14, -4, 10, 8);
    ctx.quadraticCurveTo(6, 18, 0, 18);
    ctx.quadraticCurveTo(-8, 18, -10, 8);
    ctx.quadraticCurveTo(-12, -2, 0, -20);
    ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(0, 8, 5, 0, TAU);
    ctx.fill();
  } else if (icon === 'starfall') {
    drawStar(ctx, 0, -6, 13, 5, 5, PALETTE.gold);
    ctx.strokeStyle = 'rgba(255, 233, 168, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, 10);
    ctx.lineTo(-10, 20);
    ctx.moveTo(0, 10);
    ctx.lineTo(0, 22);
    ctx.moveTo(6, 10);
    ctx.lineTo(10, 20);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ffb84d';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(16, -8, 12, 8);
    ctx.quadraticCurveTo(6, 16, 0, 18);
    ctx.quadraticCurveTo(-6, 16, -12, 8);
    ctx.quadraticCurveTo(-16, -8, 0, -18);
    ctx.fill();
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(0, 2, 4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

export function createScreens(ctx) {
  function drawHud(state, helpers) {
    const { enemiesLeft, bossFraction, multiplier, muted } = helpers;
    const player = state.player;
    // Hearts.
    for (let i = 0; i < player.maxHearts; i += 1) {
      const filled = i < player.hearts;
      drawHeart(ctx, 30 + i * 30, 32, 11, filled ? PALETTE.heart : 'rgba(255,255,255,0.18)');
    }
    // Shield / rapid timers.
    let statusY = 56;
    if (state.time < player.shieldUntil) {
      const left = player.shieldUntil - state.time;
      ctx.fillStyle = PALETTE.shield;
      ctx.font = `bold 13px ${SANS}`;
      ctx.textAlign = 'left';
      ctx.fillText(`SHIELD ${left.toFixed(1)}s`, 24, statusY);
      statusY += 18;
    }
    if (state.time < player.rapidUntil) {
      const left = player.rapidUntil - state.time;
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 13px ${SANS}`;
      ctx.textAlign = 'left';
      ctx.fillText(`RAPID ${left.toFixed(1)}s`, 24, statusY);
    }
    // Wave and foes, centred.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff6d8';
    ctx.font = `bold 22px ${SERIF}`;
    ctx.fillText(state.wave >= WAVES.length ? 'FINAL WAVE' : `WAVE ${state.wave} / ${WAVES.length}`, FIELD.width / 2, 34);
    ctx.fillStyle = 'rgba(255, 246, 216, 0.75)';
    ctx.font = `14px ${SANS}`;
    ctx.fillText(`${enemiesLeft} ${enemiesLeft === 1 ? 'foe' : 'foes'} left`, FIELD.width / 2, 54);
    // Boss bar.
    if (bossFraction !== null) {
      const barWidth = 420;
      const barX = (FIELD.width - barWidth) / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      roundRect(ctx, barX, 64, barWidth, 14, 7);
      ctx.fill();
      ctx.fillStyle = '#b366ff';
      if (bossFraction > 0) {
        roundRect(ctx, barX + 2, 66, (barWidth - 4) * bossFraction, 10, 5);
        ctx.fill();
      }
      ctx.fillStyle = '#e3b3ff';
      ctx.font = `bold 12px ${SANS}`;
      ctx.fillText('THE GLOOM QUEEN', FIELD.width / 2, 94);
    }
    // Score, right.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff6d8';
    ctx.font = `bold 26px ${SERIF}`;
    ctx.fillText(state.score.toLocaleString(), FIELD.width - 24, 36);
    ctx.fillStyle = 'rgba(255, 246, 216, 0.6)';
    ctx.font = `13px ${SANS}`;
    ctx.fillText(`BEST ${Math.max(state.best, state.score).toLocaleString()}`, FIELD.width - 24, 54);
    if (multiplier > 1) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 18px ${SANS}`;
      ctx.fillText(`COMBO ×${multiplier}`, FIELD.width - 24, 80);
      const barWidth = 110;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(FIELD.width - 24 - barWidth, 88, barWidth, 5);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(FIELD.width - 24 - barWidth, 88, barWidth * Math.max(0, state.comboTimer / COMBO.window), 5);
    }
    // Dash pip, bottom left.
    const dashReady = player.dashCooldownLeft <= 0;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.arc(34, FIELD.height - 34, 22, 0, TAU);
    ctx.fill();
    if (dashReady) {
      ctx.strokeStyle = '#c9a8ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(34, FIELD.height - 34, 22, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#e8d8ff';
      ctx.font = `bold 12px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText('DASH', 34, FIELD.height - 30);
    } else {
      const fraction = 1 - player.dashCooldownLeft / state.stats.dashCooldown;
      ctx.strokeStyle = '#c9a8ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(34, FIELD.height - 34, 22, -Math.PI / 2, -Math.PI / 2 + fraction * TAU);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 246, 216, 0.6)';
    ctx.font = `12px ${SANS}`;
    ctx.fillText('Shift / right-click', 64, FIELD.height - 30);
    // Blooms, bottom right.
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 246, 216, 0.6)';
    ctx.font = `12px ${SANS}`;
    ctx.fillText('BLOOMS', FIELD.width - 24, FIELD.height - 52);
    state.blooms.forEach((bloom, i) => {
      const x = FIELD.width - 34 - i * 26;
      const y = FIELD.height - 30;
      ctx.globalAlpha = bloom.hp > 0 ? 0.35 + 0.65 * (bloom.hp / bloom.maxHp) : 0.18;
      ctx.fillStyle = bloom.color;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    // Mute state, bottom centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 246, 216, 0.45)';
    ctx.font = `12px ${SANS}`;
    ctx.fillText(muted ? 'M — sound off · P — pause' : 'M — mute · P — pause', FIELD.width / 2, FIELD.height - 16);
  }

  function drawBanner(banner, time) {
    if (time >= banner.until || !banner.text) return;
    const remaining = banner.until - time;
    const alpha = Math.min(1, remaining / 0.6);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 233, 168, 0.8)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#fff6d8';
    ctx.font = `bold 44px ${SERIF}`;
    ctx.fillText(banner.text, FIELD.width / 2, 150);
    ctx.shadowBlur = 0;
    if (banner.sub) {
      ctx.fillStyle = 'rgba(255, 246, 216, 0.85)';
      ctx.font = `18px ${SANS}`;
      ctx.fillText(banner.sub, FIELD.width / 2, 180);
    }
    ctx.restore();
  }

  function drawTitle(best, muted, time) {
    dim(ctx, 0.58);
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 233, 168, 0.9)';
    ctx.shadowBlur = 26;
    ctx.fillStyle = '#fff6d8';
    ctx.font = `bold 88px ${SERIF}`;
    ctx.fillText('GLOWKEEPER', FIELD.width / 2, 218);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e8d8ff';
    ctx.font = `italic 22px ${SERIF}`;
    ctx.fillText('A lantern spirit guards the last garden.', FIELD.width / 2, 256);
    ctx.fillStyle = 'rgba(255, 246, 216, 0.9)';
    ctx.font = `18px ${SANS}`;
    ctx.fillText('Keep the glowblooms alive through 10 waves. When the Gloom Queen falls, dawn breaks.', FIELD.width / 2, 300);
    const lines = [
      ['Move', 'WASD / arrow keys'],
      ['Aim', 'Mouse'],
      ['Shoot', 'Hold click or Space'],
      ['Dash', 'Shift or right-click — brief invulnerability'],
      ['Pause / Mute', 'P / M'],
    ];
    const boxWidth = 430;
    const boxX = (FIELD.width - boxWidth) / 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    roundRect(ctx, boxX, 330, boxWidth, lines.length * 30 + 24, 14);
    ctx.fill();
    ctx.font = `16px ${SANS}`;
    lines.forEach(([label, keys], i) => {
      const y = 358 + i * 30;
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.gold;
      ctx.fillText(label, boxX + 28, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff6d8';
      ctx.fillText(keys, boxX + boxWidth - 28, y);
    });
    const pulse = 0.65 + 0.35 * Math.sin(time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#fff6d8';
    ctx.font = `bold 24px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE or click to begin', FIELD.width / 2, 566);
    ctx.globalAlpha = 1;
    if (best > 0) {
      ctx.fillStyle = 'rgba(255, 246, 216, 0.7)';
      ctx.font = `16px ${SANS}`;
      ctx.fillText(`Best score: ${best.toLocaleString()}`, FIELD.width / 2, 600);
    }
    ctx.fillStyle = 'rgba(255, 246, 216, 0.45)';
    ctx.font = `13px ${SANS}`;
    ctx.fillText(muted ? 'Sound is off (M to unmute)' : 'Sound on (M to mute) · Headphones recommended', FIELD.width / 2, 632);
  }

  function drawPause(muted) {
    dim(ctx, 0.6);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff6d8';
    ctx.font = `bold 56px ${SERIF}`;
    ctx.fillText('PAUSED', FIELD.width / 2, 300);
    ctx.fillStyle = 'rgba(255, 246, 216, 0.85)';
    ctx.font = `19px ${SANS}`;
    ctx.fillText('P or Esc — resume', FIELD.width / 2, 348);
    ctx.fillText('R — restart the run', FIELD.width / 2, 378);
    ctx.fillText(muted ? 'M — unmute' : 'M — mute', FIELD.width / 2, 408);
  }

  function drawOffer(offered, hoverIndex, time) {
    dim(ctx, 0.62);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff6d8';
    ctx.font = `bold 40px ${SERIF}`;
    ctx.fillText('THE GARDEN THANKS YOU', FIELD.width / 2, 150);
    ctx.fillStyle = 'rgba(255, 246, 216, 0.85)';
    ctx.font = `19px ${SANS}`;
    ctx.fillText('Choose a blessing before the next wave.', FIELD.width / 2, 184);
    const rects = offerCardRects();
    offered.forEach((def, i) => {
      const rect = rects[i];
      const hovered = i === hoverIndex;
      ctx.save();
      if (hovered) {
        ctx.shadowColor = 'rgba(255, 233, 168, 0.7)';
        ctx.shadowBlur = 22;
      }
      ctx.fillStyle = hovered ? '#2b2344' : '#221c38';
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = hovered ? PALETTE.gold : 'rgba(255, 233, 168, 0.3)';
      ctx.lineWidth = hovered ? 3 : 2;
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
      ctx.stroke();
      ctx.restore();
      drawUpgradeIcon(ctx, def.icon, rect.x + rect.w / 2, rect.y + 56, time);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff6d8';
      ctx.font = `bold 22px ${SERIF}`;
      ctx.fillText(def.name, rect.x + rect.w / 2, rect.y + 112);
      ctx.fillStyle = 'rgba(255, 246, 216, 0.85)';
      ctx.font = `16px ${SANS}`;
      wrapText(ctx, def.desc, rect.x + 26, rect.y + 142, rect.w - 52, 22);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 15px ${SANS}`;
      ctx.fillText(`Press ${i + 1} or click`, rect.x + rect.w / 2, rect.y + rect.h - 20);
    });
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const trial = line ? `${line} ${word}` : word;
      if (ctx.measureText(trial).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = trial;
      }
    }
    if (line) lines.push(line);
    lines.forEach((row, i) => ctx.fillText(row, x + maxWidth / 2, y + i * lineHeight));
  }

  function drawEnd(state, won, best, isNewBest) {
    dim(ctx, won ? 0.5 : 0.62);
    ctx.textAlign = 'center';
    if (won) {
      ctx.shadowColor = 'rgba(255, 233, 168, 0.9)';
      ctx.shadowBlur = 26;
    }
    ctx.fillStyle = won ? '#ffe9a8' : '#e8d8ff';
    ctx.font = `bold 60px ${SERIF}`;
    ctx.fillText(won ? 'DAWN BREAKS' : 'THE LIGHT FADES', FIELD.width / 2, 210);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 246, 216, 0.9)';
    ctx.font = `19px ${SANS}`;
    ctx.fillText(
      won
        ? 'The Gloom Queen is gone, and the garden glows on.'
        : state.blooms.every((b) => b.hp <= 0)
          ? 'Every glowbloom has wilted. The garden waits for another keeper.'
          : 'Your lantern guttered out. The garden waits for another keeper.',
      FIELD.width / 2,
      248,
    );
    const accuracy = state.boltsFired > 0 ? Math.round((state.boltHits / state.boltsFired) * 100) : 0;
    const rows = [
      ['Score', state.score.toLocaleString()],
      ['Best', best.toLocaleString()],
      ['Wave reached', `${state.wave} / ${WAVES.length}`],
      ['Foes felled', String(state.kills)],
      ['Bolt accuracy', `${accuracy}%`],
      ['Time', formatTime(state.runTime)],
    ];
    const boxWidth = 360;
    const boxX = (FIELD.width - boxWidth) / 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    roundRect(ctx, boxX, 282, boxWidth, rows.length * 30 + 24, 14);
    ctx.fill();
    ctx.font = `17px ${SANS}`;
    rows.forEach(([label, value], i) => {
      const y = 310 + i * 30;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255, 246, 216, 0.75)';
      ctx.fillText(label, boxX + 28, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff6d8';
      ctx.fillText(value, boxX + boxWidth - 28, y);
    });
    if (isNewBest) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 20px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText('★ New best score! ★', FIELD.width / 2, 512);
    }
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#fff6d8';
    ctx.font = `bold 22px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE or click to play again', FIELD.width / 2, 560);
    ctx.globalAlpha = 1;
  }

  return {
    drawHud,
    drawBanner,
    drawTitle,
    drawPause,
    drawOffer,
    drawEnd,
  };
}
