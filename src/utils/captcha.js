const { createCanvas } = require('@napi-rs/canvas');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I/L
const WIDTH = 240, HEIGHT = 90;

function randomCode(length = 6) {
  let out = '';
  for (let i = 0; i < length; i++) out += CHARS[Math.floor(Math.random() * CHARS.length)];
  return out;
}

const rand = (min, max) => Math.random() * (max - min) + min;

// Renders a distorted-text captcha and returns { code, buffer }.
function createCaptcha(length = 6) {
  const code = randomCode(length);
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2b2d31';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Background noise dots
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand(0.02, 0.12)})`;
    ctx.fillRect(rand(0, WIDTH), rand(0, HEIGHT), 2, 2);
  }

  // Noise lines
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `hsla(${rand(0, 360)},70%,60%,0.5)`;
    ctx.lineWidth = rand(1, 2.5);
    ctx.beginPath();
    ctx.moveTo(rand(0, WIDTH), rand(0, HEIGHT));
    ctx.lineTo(rand(0, WIDTH), rand(0, HEIGHT));
    ctx.stroke();
  }

  // Characters
  const step = WIDTH / (length + 1);
  for (let i = 0; i < length; i++) {
    ctx.save();
    const x = step * (i + 1);
    const y = HEIGHT / 2;
    ctx.translate(x, y);
    ctx.rotate(rand(-0.35, 0.35));
    ctx.font = `bold ${Math.floor(rand(38, 50))}px Sans`;
    ctx.fillStyle = `hsl(${rand(0, 360)},75%,75%)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code[i], rand(-3, 3), rand(-4, 4));
    ctx.restore();
  }

  return { code, buffer: canvas.toBuffer('image/png') };
}

module.exports = { createCaptcha, randomCode };
