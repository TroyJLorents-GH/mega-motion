// The still shown before the first WebGL frame, when WebGL is missing, and after a lost GPU context.
// A drawn front view in the same colours as the 3D watch (SVG, so it is sharp at any size and needs no file).
export function stillSVG(colors, hours = 18, maxHours = 18) {
  const frac = Math.min(1, hours / maxHours);
  const r = 70;
  const circ = 2 * Math.PI * r;
  return `
<svg viewBox="0 0 400 520" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="ti" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${colors.titanium}" stop-opacity=".55"/>
      <stop offset=".18" stop-color="#ffffff" stop-opacity=".9"/>
      <stop offset=".34" stop-color="${colors.titanium}"/>
      <stop offset=".8" stop-color="${colors.titanium}" stop-opacity=".6"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity=".7"/>
    </linearGradient>
    <radialGradient id="sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".75"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="200" cy="492" rx="150" ry="16" fill="url(#sh)"/>
  <rect x="120" y="12" width="160" height="110" rx="24" fill="${colors.band}"/>
  <rect x="120" y="400" width="160" height="92" rx="24" fill="${colors.band}"/>
  <rect x="96" y="96" width="208" height="328" rx="62" fill="url(#ti)"/>
  <rect x="306" y="190" width="18" height="44" rx="7" fill="url(#ti)"/>
  <rect x="309" y="204" width="6" height="16" rx="3" fill="${colors.accent}"/>
  <rect x="304" y="282" width="8" height="52" rx="4" fill="url(#ti)"/>
  <rect x="108" y="108" width="184" height="304" rx="52" fill="#050506"/>
  <circle cx="200" cy="266" r="${r}" fill="none" stroke="#ffffff" stroke-opacity=".1" stroke-width="10"/>
  <circle cx="200" cy="266" r="${r}" fill="none" stroke="${colors.accent}" stroke-width="10" stroke-linecap="round"
    stroke-dasharray="${(circ * frac).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 200 266)"/>
  <path d="M120 120 Q 160 108 230 110" stroke="#ffffff" stroke-opacity=".18" stroke-width="3" fill="none"/>
</svg>`;
}
