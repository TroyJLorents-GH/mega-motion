// A drawn pair of over-ear headphones, front view, built from SVG so it is crisp at any size.
// It stands for the category, never a real brand's design. When content.json gives product.image
// (a transparent cutout PNG or WebP, front view, roughly 400 x 460 proportions), that image is drawn
// in the same box instead, so every scene that shows the product swaps to the real thing.
//
//   headphones(parentSvgOrG, {x, y, w, colors, image, alt, id})
//   Local drawing box is 400 x 460 units; it is scaled to width w and placed at (x, y).
//   Returns {group, box: {x, y, w, h}, cupY} where cupY is the cups' centre line in parent units.

const NS = 'http://www.w3.org/2000/svg';
export const BOX = {w: 400, h: 460, cupY: 342};

export const node = (parent, tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  parent.appendChild(n);
  return n;
};

// Colour helpers: mix a hex colour toward white (amount > 0) or black (amount < 0).
const rgb = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const shade = (hex, amount) => {
  const [r, g, b] = rgb(hex);
  const t = amount < 0 ? 0 : 255;
  const a = Math.abs(amount);
  const c = (v) => Math.round(v + (t - v) * a).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
};

let uid = 0;

export function headphones(parent, {x = 0, y = 0, w = 400, colors = {}, image = '', alt = '', id} = {}) {
  const k = w / BOX.w;
  const gid = id || `hp${++uid}`;
  const group = node(parent, 'g', {transform: `translate(${x} ${y}) scale(${k})`, class: 'headphones'});
  const out = {group, box: {x, y, w, h: BOX.h * k}, cupY: y + BOX.cupY * k};
  if (image) {
    const img = node(group, 'image', {href: image, x: 0, y: 0, width: BOX.w, height: BOX.h, preserveAspectRatio: 'xMidYMid meet'});
    if (alt) {
      img.setAttribute('role', 'img');
      img.setAttribute('aria-label', alt);
    }
    return out;
  }

  const shell = colors.shell || '#34363B';
  const cushion = colors.cushion || '#1C1D20';
  const metal = colors.metal || '#C9CCD2';
  const defs = node(group, 'defs');
  const lin = (lid, stops, x2 = 0, y2 = 1, x1 = 0, y1 = 0) => {
    const g = node(defs, 'linearGradient', {id: `${gid}-${lid}`, x1, y1, x2, y2});
    for (const [o, c, a = 1] of stops) node(g, 'stop', {offset: o, 'stop-color': c, 'stop-opacity': a});
    return `url(#${gid}-${lid})`;
  };
  // Light comes from the upper left: lit edges are lighter, the far side falls off into shadow.
  const shellL = lin('shellL', [[0, shade(shell, 0.28)], [0.3, shade(shell, 0.08)], [0.75, shell], [1, shade(shell, -0.45)]], 1, 0);
  const shellR = lin('shellR', [[0, shade(shell, 0.16)], [0.35, shell], [0.8, shade(shell, -0.3)], [1, shade(shell, -0.55)]], 1, 0);
  const band = lin('band', [[0, shade(shell, 0.3)], [0.25, shade(shell, 0.06)], [1, shade(shell, -0.35)]]);
  const cush = lin('cush', [[0, shade(cushion, 0.12)], [0.5, cushion], [1, shade(cushion, -0.4)]], 1, 0);
  const steel = lin('steel', [[0, shade(metal, -0.35)], [0.35, shade(metal, 0.5)], [0.6, metal], [1, shade(metal, -0.45)]], 1, 0);
  const top = lin('top', [[0, '#ffffff', 0.22], [0.35, '#ffffff', 0.04], [1, '#ffffff', 0]]);
  const spec = lin('spec', [[0, '#ffffff', 0], [0.35, '#ffffff', 0.55], [0.7, '#ffffff', 0.18], [1, '#ffffff', 0]]);

  // Headband: the space between two concentric half-ellipses, plus its padded underside.
  node(group, 'path', {d: 'M50.8 186 A158 236 0 0 1 349.2 186 L326.7 186 A136 214 0 0 0 73.3 186 Z', fill: band});
  node(group, 'path', {d: 'M100 128 A131 207 0 0 1 300 128', fill: 'none', stroke: cushion, 'stroke-width': 10, 'stroke-linecap': 'round'});
  node(group, 'path', {d: 'M58 150 A150 228 0 0 1 200 30', fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0.22, 'stroke-width': 2.5, 'stroke-linecap': 'round'});

  for (const side of [-1, 1]) {
    const cx = side < 0 ? 62 : 338; // slider axis
    // End cap of the band, then the steel slider down to the cup.
    node(group, 'rect', {x: cx - 13, y: 176, width: 26, height: 22, rx: 6, fill: side < 0 ? shade(shell, 0.05) : shade(shell, -0.2)});
    node(group, 'rect', {x: cx - 3.5, y: 196, width: 7, height: 50, rx: 3.5, fill: steel});
    node(group, 'rect', {x: cx - 11, y: 240, width: 22, height: 16, rx: 5, fill: steel});
    // Cushion on the inner side, then the shell over it.
    const sx = side < 0 ? 22 : 302;
    const cxs = side < 0 ? 80 : 282;
    node(group, 'rect', {x: cxs, y: 262, width: 38, height: 160, rx: 19, fill: cush});
    node(group, 'rect', {x: cxs + (side < 0 ? 24 : 4), y: 272, width: 10, height: 140, rx: 5, fill: shade(cushion, -0.5), opacity: 0.6});
    node(group, 'rect', {x: sx, y: 250, width: 76, height: 184, rx: 38, fill: side < 0 ? shellL : shellR});
    node(group, 'rect', {x: sx, y: 250, width: 76, height: 184, rx: 38, fill: top});
    node(group, 'rect', {x: sx + 0.75, y: 250.75, width: 74.5, height: 182.5, rx: 37.25, fill: 'none', stroke: '#ffffff', 'stroke-opacity': side < 0 ? 0.18 : 0.08, 'stroke-width': 1.5});
    // A narrow specular strip on the lit side of each cup.
    node(group, 'rect', {x: side < 0 ? sx + 13 : sx + 16, y: 276, width: side < 0 ? 9 : 6, height: 120, rx: 4.5, fill: spec, opacity: side < 0 ? 1 : 0.45});
    // A fine seam where the outer plate meets the shell.
    node(group, 'path', {d: side < 0 ? `M${sx + 38} 262 L${sx + 38} 422` : `M${sx + 38} 262 L${sx + 38} 422`, stroke: shade(shell, -0.5), 'stroke-opacity': 0.35, 'stroke-width': 1});
  }
  return out;
}
