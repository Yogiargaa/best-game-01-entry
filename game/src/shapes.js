// Tiny canvas shape helpers shared by the renderer and the screens: a heart, a
// star and a rounded rectangle, each drawn centred on the given point.

const TAU = Math.PI * 2;

export function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.9);
  ctx.bezierCurveTo(-size * 1.5, -size * 0.1, -size * 0.7, -size, 0, -size * 0.35);
  ctx.bezierCurveTo(size * 0.7, -size, size * 1.5, -size * 0.1, 0, size * 0.9);
  ctx.fill();
  ctx.restore();
}

export function drawStar(ctx, x, y, outer, points, inner, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / (points * 2)) * TAU - Math.PI / 2;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
