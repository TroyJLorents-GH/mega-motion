// A beam balance that proves the weight claim: the product sits on the left pan, a calibrated weight
// (content.weight.weightLabel) drops onto the right pan, and the beam settles level.
// Drawn as a fine instrument: ink hairlines, the beam in the accent (the page's one line, again).
//
//   const b = createBalance(svg, {ink, accent, rule, colors, image, alt, label});
//   b.update({drop: 0..1 (weight falling from just above its pan onto it), theta: degrees (negative = product side down)})
// update() is a pure function of its arguments: one scroll position, one pose.
import {headphones, node, shade} from './headphones.js';

export const VIEW = {w: 1000, h: 660};
const P = {x: 500, y: 170}; // pivot
const L = 330; // half beam
const HANG = 214; // string length to the pan

export function createBalance(svg, {ink, accent, rule, colors, image, alt, label}) {
  svg.setAttribute('viewBox', `0 0 ${VIEW.w} ${VIEW.h}`);
  const defs = node(svg, 'defs');
  const g = node(defs, 'linearGradient', {id: 'wt-steel', x1: 0, y1: 0, x2: 1, y2: 0});
  for (const [o, c] of [[0, shade(colors.metal, -0.42)], [0.28, shade(colors.metal, 0.55)], [0.55, colors.metal], [1, shade(colors.metal, -0.5)]])
    node(g, 'stop', {offset: o, 'stop-color': c});
  const gt = node(defs, 'linearGradient', {id: 'wt-top', x1: 0, y1: 0, x2: 0, y2: 1});
  node(gt, 'stop', {offset: 0, 'stop-color': '#ffffff', 'stop-opacity': 0.5});
  node(gt, 'stop', {offset: 0.25, 'stop-color': '#ffffff', 'stop-opacity': 0});
  const sh = node(defs, 'radialGradient', {id: 'bal-shadow', cx: 0.5, cy: 0.5, r: 0.5});
  node(sh, 'stop', {offset: 0, 'stop-color': ink, 'stop-opacity': 0.16});
  node(sh, 'stop', {offset: 1, 'stop-color': ink, 'stop-opacity': 0});

  // Stand: floor shadow, foot, post, fulcrum.
  node(svg, 'ellipse', {cx: P.x, cy: 628, rx: 190, ry: 14, fill: 'url(#bal-shadow)'});
  node(svg, 'path', {d: `M${P.x - 110} 626 L${P.x + 110} 626 L${P.x + 84} 606 L${P.x - 84} 606 Z`, fill: shade(ink, 0.9), stroke: ink, 'stroke-width': 1.5, 'stroke-linejoin': 'round'});
  node(svg, 'rect', {x: P.x - 4, y: P.y + 6, width: 8, height: 606 - P.y - 6, fill: ink});
  node(svg, 'path', {d: `M${P.x} ${P.y - 4} L${P.x - 20} ${P.y + 30} L${P.x + 20} ${P.y + 30} Z`, fill: ink});

  // Each side: a hanger (strings, then the load, then the pan's front lip) translated to the beam end.
  const side = (sign) => {
    const hang = node(svg, 'g');
    node(hang, 'circle', {cx: 0, cy: 0, r: 6, fill: 'none', stroke: ink, 'stroke-width': 2});
    node(hang, 'path', {d: `M-3 5 L-104 ${HANG} M3 5 L104 ${HANG}`, stroke: ink, 'stroke-width': 1.3, 'stroke-opacity': 0.75});
    const load = node(hang, 'g');
    node(hang, 'path', {d: `M-122 ${HANG} Q0 ${HANG + 34} 122 ${HANG}`, fill: shade(ink, 0.93), stroke: ink, 'stroke-width': 2, 'stroke-linejoin': 'round'});
    node(hang, 'path', {d: `M-122 ${HANG} L122 ${HANG}`, stroke: ink, 'stroke-width': 2, 'stroke-linecap': 'round'});
    return {hang, load, sign};
  };
  const left = side(-1);
  const right = side(1);

  // The product on the left pan (drawn, or the real cutout when content gives one).
  const hp = 176;
  headphones(left.load, {x: -hp / 2, y: HANG + 6 - (hp * 460) / 400, w: hp, colors, image, alt, id: 'bal-hp'});

  // A calibrated weight for the right pan: knob, neck, body, engraved label.
  const wt = node(right.load, 'g');
  const WW = 112;
  const WH = 132;
  const wx = -WW / 2;
  const wy = HANG + 4 - WH;
  node(wt, 'rect', {x: -14, y: wy, width: 28, height: 18, rx: 7, fill: 'url(#wt-steel)'});
  node(wt, 'rect', {x: -8, y: wy + 14, width: 16, height: 14, fill: 'url(#wt-steel)'});
  node(wt, 'rect', {x: wx, y: wy + 26, width: WW, height: WH - 26, rx: 14, fill: 'url(#wt-steel)'});
  node(wt, 'rect', {x: wx, y: wy + 26, width: WW, height: WH - 26, rx: 14, fill: 'url(#wt-top)'});
  const tx = node(wt, 'text', {x: 0, y: wy + 26 + (WH - 26) * 0.6, 'text-anchor': 'middle', fill: ink, 'fill-opacity': 0.88,
    'font-family': 'JetBrains Mono, monospace', 'font-weight': 500, 'font-size': 27, 'letter-spacing': 0});
  tx.textContent = label;

  // The beam: the accent line, rotating about the pivot.
  const beam = node(svg, 'g');
  node(beam, 'rect', {x: P.x - L - 4, y: P.y - 3, width: 2 * L + 8, height: 6, rx: 3, fill: accent});
  node(beam, 'circle', {cx: P.x, cy: P.y, r: 9, fill: shade(ink, 0.96), stroke: ink, 'stroke-width': 2});
  // A level indicator: a short needle up from the pivot and a fixed tick it meets when balanced.
  const needle = node(beam, 'path', {d: `M${P.x} ${P.y - 10} L${P.x} ${P.y - 64}`, stroke: ink, 'stroke-width': 2, 'stroke-linecap': 'round'});
  node(svg, 'path', {d: `M${P.x - 40} ${P.y - 78} A80 80 0 0 1 ${P.x + 40} ${P.y - 78}`, fill: 'none', stroke: rule, 'stroke-width': 2});
  node(svg, 'path', {d: `M${P.x} ${P.y - 86} L${P.x} ${P.y - 72}`, stroke: ink, 'stroke-width': 2});
  needle.setAttribute('stroke-linecap', 'round');

  function update({drop, theta}) {
    const r = (theta * Math.PI) / 180;
    beam.setAttribute('transform', `rotate(${theta.toFixed(3)} ${P.x} ${P.y})`);
    const ex = L * Math.cos(r);
    const ey = L * Math.sin(r);
    left.hang.setAttribute('transform', `translate(${(P.x - ex).toFixed(2)} ${(P.y - ey).toFixed(2)})`);
    right.hang.setAttribute('transform', `translate(${(P.x + ex).toFixed(2)} ${(P.y + ey).toFixed(2)})`);
    // The weight is held just above its pan from the first frame, then falls onto it (drop is already eased).
    wt.setAttribute('transform', `translate(0 ${(-(1 - drop) * 260).toFixed(2)})`);
  }
  return {update};
}
