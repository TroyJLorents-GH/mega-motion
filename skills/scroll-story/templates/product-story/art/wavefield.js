// The noise field for the "quiet" chapter: a stack of restless sound lines that are drawn into the product
// and silenced as noise cancelling engages. calm = 0 is the noisy room, calm = 1 is one still line.
// The quiet spreads outward from the product: lines pinch together and flatten near it first.
// Noise moves with time only while there is noise; at calm = 1 the field is a single still line,
// so the stillness is the proof. Canvas 2D, one path per line, drawn on the shared GSAP ticker.

const smooth = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
const hexA = (hex, a) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const mixHex = (a, b, u) => {
  const p = parseInt(a.slice(1), 16);
  const q = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((p >> s) & 255) + (((q >> s) & 255) - ((p >> s) & 255)) * u);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
};

export function createField(canvas, {ink, accent, lines = 11, dpr = 1}) {
  // top: the lowest y the noise may reach (the text above it is never crossed by a line).
  const ctx = canvas.getContext('2d');
  const half = (lines - 1) / 2;
  // Per-line phases: fixed, so the same calm and time always draw the same field.
  const ph = Array.from({length: lines}, (_, i) => [1.7 * i + 0.3, 2.9 * i + 1.1, 4.3 * i + 2.2, 0.9 * i + 3.7]);
  let W = 0, H = 0, cx = 0, cy = 0, spread = 0, amp = 0, reach = 1;

  function layout({width, height, centerX, centerY, top = 0, bottom = height}) {
    W = width;
    H = height;
    cx = centerX;
    cy = centerY;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    spread = Math.min(H * 0.042, 36);
    amp = Math.min(H * 0.075, 64);
    // Fit the noisy field between the text and the frame bottom: outermost line excursion = half*spread*2.2 + amp.
    const room = Math.min(cy - top, bottom - cy) - 8;
    const need = half * spread * 2.2 + amp;
    if (room > 0 && need > room) {
      spread *= room / need;
      amp *= room / need;
    }
    reach = Math.max(cx, W - cx);
  }

  // Restless, audio-like displacement: four sines, two travelling each way, with a slow envelope.
  const noise = (x, t, p) =>
    (0.46 * Math.sin(x * 0.011 + t * 1.9 + p[0]) +
      0.28 * Math.sin(x * 0.029 - t * 3.1 + p[1]) +
      0.17 * Math.sin(x * 0.071 + t * 5.3 + p[2]) +
      0.09 * Math.sin(x * 0.157 - t * 8.9 + p[3])) *
    (0.62 + 0.38 * Math.sin(x * 0.0037 + t * 0.7 + p[3]));

  function draw(calm, t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const front = calm * 1.4; // the edge of the quiet, in units of distance from the product to the frame edge
    const step = W > 900 ? 5 : 4;
    for (let i = 0; i < lines; i++) {
      const k = i - half;
      const centre = k === 0;
      const edge = Math.abs(k) / half;
      const alpha = centre ? 0.55 + 0.45 * calm : (0.6 - 0.36 * edge) * (1 - smooth(0.82, 1, calm));
      if (alpha <= 0.002) continue;
      ctx.beginPath();
      for (let x = -step; x <= W + step; x += step) {
        const d = Math.abs(x - cx) / reach;
        const quiet = smooth(front, front - 0.38, d); // 1 where the quiet has arrived
        const y = cy + k * spread * 2.2 * (1 - quiet) + amp * (1 - quiet) * (0.55 + 0.45 * edge) * noise(x, t, ph[i]);
        if (x === -step) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineWidth = centre ? 1.4 + 1.4 * calm : 1.15;
      ctx.strokeStyle = centre ? mixHex(ink, accent, smooth(0.25, 0.95, calm)) : hexA(ink, alpha);
      if (centre) ctx.globalAlpha = alpha;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  return {layout, draw};
}
