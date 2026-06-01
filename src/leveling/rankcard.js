const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');

const W = 900, H = 280;
const hexToRgb = hex => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return [124, 108, 245];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const fmt = n => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

async function renderRankCard({ username, avatarUrl, level, rank, current, required, accent }) {
  const [r, g, b] = hexToRgb(accent);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#13151f'); bg.addColorStop(1, '#0c0d14');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `rgba(${r},${g},${b},0.16)`;
  roundRect(ctx, 0, 0, W, 6, 0); ctx.fill();

  // Panel
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  roundRect(ctx, 30, 40, W - 60, H - 80, 22); ctx.fill();

  // Avatar
  const ax = 80, ay = H / 2, ar = 70;
  try {
    const img = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath(); ctx.arc(ax + ar, ay, ar, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    ctx.drawImage(img, ax, ay - ar, ar * 2, ar * 2);
    ctx.restore();
  } catch {
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath(); ctx.arc(ax + ar, ay, ar, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = `rgb(${r},${g},${b})`; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(ax + ar, ay, ar, 0, Math.PI * 2); ctx.stroke();

  const textX = 250;
  // Username
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px Sans';
  ctx.fillText(trim(ctx, username, 360), textX, 120);

  // Rank / Level
  ctx.textAlign = 'right';
  ctx.font = 'bold 34px Sans'; ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillText(`LEVEL ${level}`, W - 60, 105);
  ctx.font = '24px Sans'; ctx.fillStyle = '#9aa0b5';
  ctx.fillText(rank ? `RANK #${rank}` : 'UNRANKED', W - 60, 140);
  ctx.textAlign = 'left';

  // Progress bar
  const barX = textX, barY = 170, barW = W - textX - 60, barH = 34;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, barX, barY, barW, barH, barH / 2); ctx.fill();
  const pct = required > 0 ? Math.min(1, current / required) : 1;
  if (pct > 0) {
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, `rgb(${r},${g},${b})`); grad.addColorStop(1, '#b07cf0');
    ctx.fillStyle = grad;
    roundRect(ctx, barX, barY, Math.max(barH, barW * pct), barH, barH / 2); ctx.fill();
  }
  ctx.fillStyle = '#cfd3e1'; ctx.font = '20px Sans';
  ctx.fillText(`${fmt(current)} / ${fmt(required)} XP`, barX, barY + barH + 28);

  return canvas.toBuffer('image/png');
}

function roundRect(ctx, x, y, w, h, radius) {
  const rr = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function trim(ctx, text, maxW) {
  let t = String(text || 'Unknown');
  while (ctx.measureText(t).width > maxW && t.length > 1) t = t.slice(0, -1);
  return t === String(text) ? t : t + '…';
}

module.exports = { renderRankCard };
