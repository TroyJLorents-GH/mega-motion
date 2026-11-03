// A procedural smartwatch: rounded titanium case (brushed, bevelled), crown with an accent ring, side button,
// domed black glass with a lit display drawn to a CanvasTexture, and an elastomer band loop it stands on.
// It is a category stand-in, not any brand's design. Units: the case is 1.0 wide, 1.2 tall, 0.34 deep.
// buildWatch() returns {group, anchors, face, floorY, size, dispose}; face.draw({mode, hours}) redraws the display
// only when its inputs change. Drop in a real model instead with content.json "model" (see TEMPLATE.md).
import * as THREE from 'three';

const W = 1.0;
const H = 1.2;
const D = 0.34;
const R = 0.27; // corner radius
const BEVEL = 0.075;

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// Brushing: fine horizontal streaks in the roughness channel (G), so the highlight breaks up along the grain.
function brushedRoughness(base = 0.34) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const v = Math.round(base * 255);
  g.fillStyle = `rgb(${v},${v},${v})`;
  g.fillRect(0, 0, 256, 256);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1400; i++) {
    const y = rnd() * 256;
    const d = (rnd() - 0.5) * 24;
    const k = Math.max(0, Math.min(255, v + d));
    g.strokeStyle = `rgba(${k},${k},${k},${0.25 + rnd() * 0.5})`;
    g.lineWidth = 0.5 + rnd() * 0.7;
    g.beginPath();
    g.moveTo(-10, y);
    g.lineTo(266, y + (rnd() - 0.5) * 2);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 6);
  t.colorSpace = THREE.NoColorSpace; // data, not colour
  return t;
}

// A box-section ribbon swept along a curve in the YZ plane (the band). Rounded profile, smooth normals.
function sweepBand(curve, width, thick, samples = 160) {
  const prof = [];
  const rr = thick * 0.5;
  const hw = width / 2 - rr;
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI; // right cap
    prof.push([hw + Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI / 2 + (i / 8) * Math.PI; // left cap
    prof.push([-hw + Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  prof.push(prof[0]); // close the section: the inner face of the strap
  const n = prof.length;
  const pos = [];
  const uv = [];
  const idx = [];
  const X = new THREE.Vector3(1, 0, 0);
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const len = curve.getLength();
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t);
    nrm.crossVectors(t, X).normalize(); // outward from the loop
    for (let j = 0; j < n; j++) {
      const [px, pn] = prof[j];
      pos.push(px, p.y + nrm.y * pn, p.z + nrm.z * pn);
      uv.push(u, j / (n - 1));
    }
  }
  for (let i = 0; i < samples; i++)
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j;
      const b = (i + 1) * n + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// The display. Drawn in CSS pixels of a 512-wide canvas; redrawn only when (mode, hours) change.
function createFace(colors, fonts, glassW, glassH, maxHours) {
  const cw = 512;
  const ch = Math.round((cw * glassH) / glassW);
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  let last = '';
  const draw = ({mode = 0, hours = 0, time = '10:09'} = {}) => {
    const key = `${mode.toFixed(3)}|${hours.toFixed(2)}`;
    if (key === last) return false;
    last = key;
    g.fillStyle = '#000';
    g.fillRect(0, 0, cw, ch);
    const cx = cw / 2;
    const cy = ch * 0.53;
    const rad = cw * 0.31;
    // Time face (mode 0).
    // The two faces hand over in sequence (time out, then ring in), never overlapping.
    const timeA = Math.max(0, 1 - mode * 2);
    const ringA = Math.max(0, mode * 2 - 1);
    if (timeA > 0) {
      g.globalAlpha = timeA;
      g.fillStyle = colors.muted;
      g.font = `500 ${cw * 0.042}px ${fonts.mono}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('ATLAS', cx, ch * 0.24);
      g.fillStyle = colors.ink;
      g.font = `600 ${cw * 0.25}px ${fonts.display}`;
      g.fillText(time, cx, cy);
      g.fillStyle = colors.accent;
      g.beginPath();
      g.arc(cx, ch * 0.76, cw * 0.012, 0, Math.PI * 2);
      g.fill();
    }
    // Battery face (mode 1): an hour ring that fills to maxHours, the number in the middle.
    if (ringA > 0) {
      g.globalAlpha = ringA;
      const a0 = -Math.PI / 2;
      const frac = Math.max(0, Math.min(1, hours / maxHours));
      g.lineCap = 'round';
      g.lineWidth = cw * 0.05;
      g.strokeStyle = 'rgba(255,255,255,0.10)';
      g.beginPath();
      g.arc(cx, cy, rad, 0, Math.PI * 2);
      g.stroke();
      // hour ticks
      for (let k = 0; k < maxHours; k++) {
        const a = a0 + (k / maxHours) * Math.PI * 2;
        const on = k / maxHours < frac;
        g.strokeStyle = on ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.22)';
        g.lineWidth = cw * 0.006;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * (rad - cw * 0.02), cy + Math.sin(a) * (rad - cw * 0.02));
        g.lineTo(cx + Math.cos(a) * (rad + cw * 0.02), cy + Math.sin(a) * (rad + cw * 0.02));
        g.stroke();
      }
      if (frac > 0.002) {
        const grad = g.createConicGradient ? g.createConicGradient(a0, cx, cy) : null;
        if (grad) {
          grad.addColorStop(0, shade(colors.accent, -0.25));
          grad.addColorStop(Math.max(0.01, frac), colors.accent);
          grad.addColorStop(Math.min(1, frac + 0.001), colors.accent);
        }
        g.strokeStyle = grad || colors.accent;
        g.lineWidth = cw * 0.05;
        g.beginPath();
        g.arc(cx, cy, rad, a0, a0 + frac * Math.PI * 2);
        g.stroke();
        // the leading edge glows a little
        const ea = a0 + frac * Math.PI * 2;
        g.fillStyle = '#fff';
        g.globalAlpha = ringA * 0.9;
        g.beginPath();
        g.arc(cx + Math.cos(ea) * rad, cy + Math.sin(ea) * rad, cw * 0.011, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = ringA;
      }
      g.fillStyle = colors.ink;
      g.textAlign = 'center';
      g.textBaseline = 'alphabetic';
      g.font = `700 ${cw * 0.2}px ${fonts.display}`;
      g.fillText(String(Math.round(hours)), cx, cy + cw * 0.06);
      g.fillStyle = colors.muted;
      g.font = `500 ${cw * 0.04}px ${fonts.mono}`;
      g.fillText('HOURS', cx, cy + cw * 0.14);
    }
    g.globalAlpha = 1;
    tex.needsUpdate = true;
    return true;
  };
  return {tex, draw};
}

// The strap's surface: two moulded grooves along the edges and a row of pin holes on the lower strap.
// u runs along the strap (0 at the top lug, 1 at the bottom lug); v runs round the section (outer face ~0.5).
function bandTexture(color) {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  const outer = (8.5 / 18) * c.height; // the flat outer face sits between section points 8 and 9
  g.fillStyle = 'rgba(255,255,255,0.05)';
  g.fillRect(0, outer - 9, c.width, 2);
  g.fillRect(0, outer + 7, c.width, 2);
  g.fillStyle = 'rgba(0,0,0,0.85)';
  for (let u = 0.6; u < 0.86; u += 0.026) {
    g.beginPath();
    g.ellipse(u * c.width, outer, 5, 3.2, 0, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(Math.max(0, Math.min(255, v + v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function buildWatch({colors, fonts, maxHours = 18}) {
  const group = new THREE.Group();
  group.name = 'watch';
  const disposables = [];
  const keep = (...xs) => (disposables.push(...xs), xs[0]);

  // Case: extruded rounded rectangle with a deep bevel so the edge catches a long highlight.
  const caseGeo = keep(new THREE.ExtrudeGeometry(roundedRect(W - 2 * BEVEL, H - 2 * BEVEL, R - BEVEL * 0.6), {
    depth: D - 2 * BEVEL, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 10, curveSegments: 28,
  }));
  caseGeo.translate(0, 0, -(D - 2 * BEVEL) / 2);
  const rough = keep(brushedRoughness(0.36));
  const titanium = keep(new THREE.MeshPhysicalMaterial({
    color: colors.titanium, metalness: 1, roughness: 1, roughnessMap: rough, anisotropy: 0.55, anisotropyRotation: 0,
    clearcoat: 0.0, envMapIntensity: 1.15,
  }));
  const body = new THREE.Mesh(caseGeo, titanium);
  body.name = 'case';
  group.add(body);

  // Glass: a thin domed slab, black and glossy, with the display as its emissive map (one draw call).
  const gw = W - 0.11;
  const gh = H - 0.11;
  const glassGeo = keep(new THREE.ExtrudeGeometry(roundedRect(gw - 0.06, gh - 0.06, R - 0.07), {
    depth: 0.004, bevelEnabled: true, bevelThickness: 0.026, bevelSize: 0.03, bevelSegments: 8, curveSegments: 28,
  }));
  glassGeo.translate(0, 0, D / 2 - 0.004);
  const face = createFace(colors, fonts, gw, gh, maxHours);
  keep(face.tex);
  face.tex.repeat.set(1 / gw, 1 / gh);
  face.tex.offset.set(0.5, 0.5);
  face.tex.wrapS = face.tex.wrapT = THREE.ClampToEdgeWrapping;
  const glassMat = keep(new THREE.MeshPhysicalMaterial({
    color: 0x020203, metalness: 0, roughness: 0.035, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.52,
    emissive: 0xffffff, emissiveMap: face.tex, emissiveIntensity: 1.0, envMapIntensity: 0.9,
  }));
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.name = 'glass';
  group.add(glass);

  // Crown: knurled cylinder with an accent ring on its face; side button below it.
  const crownGeo = keep(new THREE.CylinderGeometry(0.105, 0.105, 0.11, 72, 1));
  {
    const p = crownGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const r = Math.hypot(x, z);
      if (r < 0.05) continue;
      const k = 1 + 0.035 * Math.cos(a * 36);
      p.setX(i, x * k);
      p.setZ(i, z * k);
    }
    crownGeo.computeVertexNormals();
  }
  crownGeo.rotateZ(Math.PI / 2);
  const crown = new THREE.Mesh(crownGeo, titanium);
  crown.position.set(W / 2 + 0.035, 0.2, 0);
  group.add(crown);
  const ringGeo = keep(new THREE.TorusGeometry(0.072, 0.016, 12, 48));
  ringGeo.rotateY(Math.PI / 2);
  const accentMat = keep(new THREE.MeshPhysicalMaterial({color: colors.accent, metalness: 0.2, roughness: 0.38, clearcoat: 0.6}));
  const ring = new THREE.Mesh(ringGeo, accentMat);
  ring.position.set(W / 2 + 0.092, 0.2, 0);
  group.add(ring);
  const btnGeo = keep(new THREE.CapsuleGeometry(0.038, 0.2, 6, 16));
  const btn = new THREE.Mesh(btnGeo, titanium);
  btn.position.set(W / 2 + 0.012, -0.17, 0);
  group.add(btn);

  // Band: an elastomer loop around an invisible wrist; the watch stands on it.
  const ry = 0.64;
  const rz = 0.78;
  const cz = -0.7;
  const y0 = H / 2 - 0.1;
  const phi0 = Math.asin(y0 / ry);
  const pts = [];
  pts.push(new THREE.Vector3(0, y0 - 0.02, -0.02));
  for (let i = 0; i <= 48; i++) {
    const f = phi0 + (i / 48) * (Math.PI * 2 - 2 * phi0);
    pts.push(new THREE.Vector3(0, ry * Math.sin(f) * (i === 0 || i === 48 ? 1 : 1), cz + rz * Math.cos(f)));
  }
  pts.push(new THREE.Vector3(0, -y0 + 0.02, -0.02));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const bandGeo = keep(sweepBand(curve, W * 0.6, 0.085));
  const bandMap = keep(bandTexture(colors.band));
  const bandMat = keep(new THREE.MeshPhysicalMaterial({
    map: bandMap, metalness: 0, roughness: 0.42, sheen: 0.6, sheenRoughness: 0.5, sheenColor: 0x5a5c66, envMapIntensity: 1.1,
  }));
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.name = 'band';
  group.add(band);

  const floorY = -ry - 0.043;
  // Callout anchors in the model's space (follow every rotation and lift).
  const anchors = {
    case: new THREE.Vector3(W / 2 + 0.005, -0.38, 0.02),
    battery: new THREE.Vector3(W / 2 - 0.02, 0.5, 0.06), // case corner beside the display, so the face stays clean
    weight: new THREE.Vector3(-W / 2 - 0.01, -0.3, 0.0),
    center: new THREE.Vector3(0, 0, 0),
  };
  return {
    group, anchors, face, floorY, procedural: true,
    footprint: {x: W * 0.62, z: 0.55, z0: cz},
    dispose: () => disposables.forEach((d) => d.dispose && d.dispose()),
  };
}
