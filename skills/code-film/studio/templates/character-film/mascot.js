// mascot.js: a voxel character built from a sprite grid, and its acting as pure functions of time.
//
// The sprite (film.json "mascot.grid") is a list of equal-length strings, row 0 at the top. Each letter maps to a
// part ("parts": body, eye, arm, leg, antenna) and a colour key ("colors"). Every cell becomes a bevelled cube, so
// the seams catch light; the body is extruded "depth" cells deep, limbs "limbDepth" cells. The character faces +Z.
//
// Acting: film.json "actions" is a list of verbs placed in time (run, leap, face, look, grab, toss, cheer, wave,
// blink). Positions are DERIVED from those verbs (arc length along the run path with a trapezoid speed profile,
// a closed-form parabola for a leap); legs cycle with the distance covered, so feet never skate; squash, lean,
// antenna wobble and eye moves are layers that each depend on t alone. Nothing is keyed per frame.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {clamp, ease, rand, span, spring, springTrack} from './studio/kit.js';

const TAU = Math.PI * 2;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// ---------------------------------------------------------------- the model
export function buildMascot(spec) {
  const grid = spec.grid;
  const rows = grid.length;
  const cols = Math.max(...grid.map((r) => r.length));
  const cell = spec.cell ?? 0.1;
  const depth = spec.depth ?? 7;
  const limbDepth = spec.limbDepth ?? 2;
  const at = (r, c) => (grid[r] || '')[c] || '.';
  const partOf = (ch) => (ch === '.' || ch === ' ' ? null : spec.parts[ch]?.part || 'body');
  const colorOf = (ch) => new THREE.Color(spec.colors[spec.parts[ch]?.color] || spec.colors.body || '#888');
  const X = (c) => (c - (cols - 1) / 2) * cell;
  const Y = (r) => (rows - 1 - r) * cell + cell / 2;
  const isCore = (r, c) => ['body', 'eye', 'mouth'].includes(partOf(at(r, c)));

  // Lowest row of the core: the hip line. Legs hang below it.
  let coreBottom = Infinity;
  let coreTop = -Infinity;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (isCore(r, c)) {
    coreBottom = Math.min(coreBottom, Y(r) - cell / 2);
    coreTop = Math.max(coreTop, Y(r) + cell / 2);
  }
  const topY = Y(0) + cell / 2;

  const geo = new RoundedBoxGeometry(cell * 0.975, cell * 0.975, cell * 0.975, 2, cell * 0.16);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: spec.material?.roughness ?? 0.42, metalness: 0,
    clearcoat: spec.material?.clearcoat ?? 0.35, clearcoatRoughness: 0.38,
  });
  const eyeMat = new THREE.MeshPhysicalMaterial({color: 0xffffff, roughness: 0.28, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.15});

  const instanced = (cells, material, seed) => {
    const m = new THREE.InstancedMesh(geo, material, cells.length);
    const M = new THREE.Matrix4();
    cells.forEach((p, i) => {
      M.makeTranslation(p.x, p.y, p.z);
      m.setMatrixAt(i, M);
      // A hair of value variation per cube: a toy built from bricks, not a CG blob.
      const col = p.color.clone().multiplyScalar(1 + (rand(seed, i) - 0.5) * 0.07);
      m.setColorAt(i, col);
    });
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  const root = new THREE.Group();
  const bodyPivot = new THREE.Group(); // at the hip line, centre: squash keeps the feet planted
  bodyPivot.position.y = coreBottom;
  root.add(bodyPivot);
  const body = new THREE.Group();
  body.position.y = -coreBottom;
  bodyPivot.add(body);
  const legsG = new THREE.Group();
  root.add(legsG);

  // Core volume (surface cubes only), eye sockets recessed one third of a cell.
  const coreCells = [];
  const eyeCells = [];
  const zOf = (k, d) => ((d - 1) / 2 - k) * cell;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!isCore(r, c)) continue;
    const ch = at(r, c);
    const role = partOf(ch);
    const sideOpen = !isCore(r - 1, c) || !isCore(r + 1, c) || !isCore(r, c - 1) || !isCore(r, c + 1);
    for (let k = 0; k < depth; k++) {
      const surface = sideOpen || k === 0 || k === depth - 1 || (k === 1 && role === 'eye');
      if (!surface) continue;
      if (k === 0 && role === 'eye') {
        eyeCells.push({x: X(c), y: Y(r), z: zOf(0, depth) - cell * 0.33, color: colorOf(ch)});
        continue;
      }
      coreCells.push({x: X(c), y: Y(r), z: zOf(k, depth), color: colorOf(role === 'eye' ? Object.keys(spec.parts).find((q) => spec.parts[q].part === 'body') || ch : ch)});
    }
  }
  body.add(instanced(coreCells, mat, 11));
  // A solid filler inside the shell, one slab per row, inset half a cell at the sides and a full cell front and back (behind the eye sockets): the seams between cubes show a shaded
  // body colour, never daylight through the gap (seen down the view axis, a seam is a slot through the whole depth).
  {
    const slabs = [];
    for (let r = 0; r < rows; r++) {
      const cs = [];
      for (let c = 0; c < cols; c++) if (isCore(r, c)) cs.push(c);
      if (!cs.length) continue;
      const sl = {r, c0: Math.min(...cs), c1: Math.max(...cs)};
      const above = slabs.at(-1);
      // never wider than the row above, so no shelf of filler peeks out where the outline steps in
      if (above) [sl.c0, sl.c1] = [Math.max(sl.c0, above.c0), Math.min(sl.c1, above.c1)];
      slabs.push(sl);
    }
    const fill = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({color: new THREE.Color(spec.colors[spec.parts[Object.keys(spec.parts).find((q) => spec.parts[q].part === 'body')]?.color] || spec.colors.body || '#888').multiplyScalar(0.55), roughness: 0.8}), slabs.length);
    const M = new THREE.Matrix4();
    slabs.forEach((sl, i) => {
      const w = (sl.c1 - sl.c0 + 1) * cell - cell;
      const top = i === 0, bot = i === slabs.length - 1;
      const h = top || bot ? cell * 0.5 : cell * 1.02;
      const y = Y(sl.r) + (top ? -cell * 0.25 : bot ? cell * 0.25 : 0);
      M.compose(new THREE.Vector3((X(sl.c0) + X(sl.c1)) / 2, y, 0), new THREE.Quaternion(), new THREE.Vector3(Math.max(cell * 0.2, w), h, Math.max(cell, depth * cell - cell * 2)));
      fill.setMatrixAt(i, M);
    });
    body.add(fill);
  }

  // Eyes: one group pivoted at the eyes' bottom edge, so a blink closes downward like a lid.
  const eyes = new THREE.Group();
  if (eyeCells.length) {
    const eb = Math.min(...eyeCells.map((e) => e.y)) - cell / 2;
    eyes.position.set(0, eb, 0);
    const em = instanced(eyeCells.map((e) => ({...e, y: e.y - eb})), eyeMat, 3);
    eyes.add(em);
  }
  body.add(eyes);

  // Limbs: connected components of each limb part, each with its own pivot.
  const seen = new Set();
  const comps = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const role = partOf(at(r, c));
    if (!role || isCore(r, c) || seen.has(`${r},${c}`)) continue;
    const stack = [[r, c]];
    const cells = [];
    seen.add(`${r},${c}`);
    while (stack.length) {
      const [rr, cc] = stack.pop();
      cells.push([rr, cc]);
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = rr + dr, nc = cc + dc;
        if (seen.has(`${nr},${nc}`) || partOf(at(nr, nc)) !== role) continue;
        seen.add(`${nr},${nc}`);
        stack.push([nr, nc]);
      }
    }
    comps.push({role, cells});
  }
  const legs = [];
  const arms = [];
  const antennae = [];
  const frontZ = zOf(0, depth) + cell / 2;
  for (const comp of comps) {
    const xs = comp.cells.map(([, c]) => X(c));
    const ys = comp.cells.map(([r]) => Y(r));
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const g = new THREE.Group();
    const d = comp.role === 'leg' ? spec.legDepth ?? limbDepth + 1 : limbDepth;
    // Arms sit near the front corners (a nub mid-side reads as a snout from three quarters).
    const zc = comp.role === 'arm' ? frontZ - cell * (d / 2 + 1) : 0;
    let pivot;
    if (comp.role === 'leg') pivot = new THREE.Vector3(cx, Math.max(...ys) + cell / 2, zc);
    else if (comp.role === 'arm') pivot = new THREE.Vector3(cx < 0 ? Math.max(...xs) + cell / 2 : Math.min(...xs) - cell / 2, (Math.min(...ys) + Math.max(...ys)) / 2, zc);
    else pivot = new THREE.Vector3(cx, Math.min(...ys) - cell / 2, zc);
    g.position.copy(pivot);
    const cells = [];
    for (const [r, c] of comp.cells) for (let k = 0; k < d; k++) cells.push({x: X(c) - pivot.x, y: Y(r) - pivot.y, z: zOf(k, d), color: colorOf(at(r, c))});
    g.add(instanced(cells, mat, 23 + legs.length + arms.length * 3));
    const item = {g, x: cx, pivot, side: Math.sign(cx) || 1};
    if (comp.role === 'leg') {
      legsG.add(g);
      legs.push(item);
    } else if (comp.role === 'arm') {
      body.add(g);
      arms.push(item);
    } else {
      body.add(g);
      antennae.push(item);
    }
  }
  legs.sort((a, b) => a.x - b.x);
  legs.forEach((l, i) => (l.phase = (i % 2) * Math.PI));
  arms.sort((a, b) => a.x - b.x);

  const width = cols * cell;
  return {
    root, bodyPivot, body, eyes, legs, arms, antennae, cell, rows, cols,
    height: topY, coreTop, coreBottom, width, depthUnits: depth * cell,
    /** Where a carried object rides: above the head, in the character's own frame. */
    carryLocal: new THREE.Vector3(0, topY + cell * 3.5, cell * 0.5),
  };
}

// ---------------------------------------------------------------- acting
/**
 * Build the actor: rig + timeline. opts.camPos(t) -> THREE.Vector3 for "face camera" (the camera may follow the
 * actor's position, never its yaw, so there is no loop).
 */
export function createActor(spec, actions, opts = {}) {
  const rig = buildMascot(spec);
  const H = rig.height;
  const stride = spec.stride ?? 0.6;
  const cheat = spec.faceCheat ?? 0.4;
  const start = spec.start || {pos: [0, 0], yaw: 0};
  const acts = [...actions].sort((a, b) => (a.at ?? a.from) - (b.at ?? b.from));
  const deg = (d) => (d * Math.PI) / 180;

  // ---- moves: runs and leaps, chained from the start position
  const moves = [];
  let cur = new THREE.Vector2(start.pos[0], start.pos[1]);
  for (const a of acts) {
    if (a.do === 'run') {
      const pts = [new THREE.Vector3(cur.x, 0, cur.y), ...a.path.map((p) => new THREE.Vector3(p[0], 0, p[1]))];
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
      const N = 400;
      const lut = curve.getSpacedPoints(N);
      const L = curve.getLength();
      moves.push({kind: 'run', t0: a.from, t1: a.to, lut, L, N, end: lut[N]});
      cur = new THREE.Vector2(lut[N].x, lut[N].z);
    } else if (a.do === 'leap' || a.do === 'cheer' || a.do === 'hop') {
      const to = a.to ? new THREE.Vector2(a.to[0], a.to[1]) : cur.clone();
      const dur = a.dur ?? (a.do === 'leap' ? 0.55 : 0.42);
      const apex = a.apex ?? (a.do === 'leap' ? 0.9 : 0.35);
      moves.push({kind: 'leap', t0: a.at, t1: a.at + dur, from: cur.clone(), to, apex, verb: a.do});
      cur = to.clone();
    }
  }
  // Speed continuity: a run that ends on the take-off frame keeps its speed (run -> leap without a stop).
  moves.forEach((m, i) => {
    const prev = moves[i - 1];
    const next = moves[i + 1];
    m.flowIn = !!(prev && Math.abs(prev.t1 - m.t0) < 0.02 && prev.kind !== 'leap');
    m.flowOut = !!(next && Math.abs(next.t0 - m.t1) < 0.02 && next.kind === 'leap');
    if (m.kind === 'run') {
      const T = m.t1 - m.t0;
      m.rIn = m.flowIn ? 0 : Math.min(0.32, T * 0.3);
      m.rOut = m.flowOut ? 0 : Math.min(0.34, T * 0.3);
      m.vmax = m.L / (T - m.rIn / 2 - m.rOut / 2);
    }
  });
  // Cumulative distance at each move start (legs cycle with distance, so they never skate).
  let acc = 0;
  for (const m of moves) {
    m.d0 = acc;
    acc += m.kind === 'run' ? m.L : 0;
  }

  const runS = (m, tau) => {
    const T = m.t1 - m.t0;
    const {rIn, rOut, vmax: v} = m;
    if (tau <= 0) return {s: 0, v: m.flowIn ? v : 0};
    if (tau >= T) return {s: m.L, v: m.flowOut ? v : 0};
    if (tau < rIn) return {s: (0.5 * v * tau * tau) / rIn, v: (v * tau) / rIn};
    const s1 = 0.5 * v * rIn;
    if (tau <= T - rOut) return {s: s1 + v * (tau - rIn), v};
    const back = T - tau;
    return {s: m.L - (0.5 * v * back * back) / rOut, v: (v * back) / rOut};
  };
  const lutAt = (m, s) => {
    const f = clamp(s / m.L) * m.N;
    const i = Math.min(m.N - 1, Math.floor(f));
    const a = m.lut[i];
    const b = m.lut[i + 1];
    const u = f - i;
    return {x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, hx: b.x - a.x, hz: b.z - a.z};
  };

  /** Ground position, height, heading and speed at t: the source of truth every other layer reads. */
  function locomotion(t) {
    let pos = {x: start.pos[0], z: start.pos[1]};
    let heading = null;
    let speed = 0;
    let dist = 0;
    let lift = 0;
    let air = -1;
    let leap = null;
    for (const m of moves) {
      if (t < m.t0) break;
      if (m.kind === 'run') {
        const {s, v} = runS(m, t - m.t0);
        const p = lutAt(m, s);
        pos = {x: p.x, z: p.z};
        dist = m.d0 + s;
        if (t <= m.t1 || m.flowOut) {
          heading = Math.atan2(p.hx, p.hz);
          speed = v;
        } else heading = null;
        if (t > m.t1) {
          const q = lutAt(m, m.L - 1e-3);
          m.lastHeading = Math.atan2(q.hx, q.hz);
        }
      } else {
        const u = span(t, m.t0, m.t1);
        pos = {x: m.from.x + (m.to.x - m.from.x) * u, z: m.from.y + (m.to.y - m.from.y) * u};
        dist = m.d0;
        if (t < m.t1) {
          lift = 4 * m.apex * u * (1 - u);
          air = u;
          leap = m;
          const dx = m.to.x - m.from.x;
          const dz = m.to.y - m.from.y;
          if (Math.hypot(dx, dz) > 0.05) heading = Math.atan2(dx, dz);
          speed = Math.hypot(dx, dz) / (m.t1 - m.t0);
        }
      }
    }
    return {x: pos.x, z: pos.z, lift, heading, speed, dist, air, leap};
  }

  // ---- facing: what he wants to face at t, then a critically damped follow (pure: integrated from t - 0.9 s)
  const faces = acts.filter((a) => a.do === 'face');
  const lastHeadingBefore = (t) => {
    let h = (start.yaw ?? 0) * (Math.PI / 180);
    for (const m of moves) {
      if (m.t0 > t) break;
      if (m.kind === 'run') {
        const q = lutAt(m, Math.min(m.L - 1e-3, runS(m, t - m.t0).s + 1e-3));
        if (Math.hypot(q.hx, q.hz) > 1e-6) h = Math.atan2(q.hx, q.hz);
      } else if (Math.hypot(m.to.x - m.from.x, m.to.y - m.from.y) > 0.05) h = Math.atan2(m.to.x - m.from.x, m.to.y - m.from.y);
    }
    return h;
  };
  const yawTo = (loc, target) => Math.atan2(target.x - loc.x, target.z - loc.z);
  function targetYaw(t) {
    const loc = locomotion(t);
    const cam = opts.camPos ? opts.camPos(t) : new THREE.Vector3(0, 0, 10);
    const toCam = yawTo(loc, cam);
    if (loc.heading !== null && loc.speed > 0.05) {
      // The animator's cheat: run with the face turned partly to the lens, so the face reads (never pure profile).
      const k = cheat * clamp(loc.speed / 1.5);
      return loc.heading + wrap(toCam - loc.heading) * k;
    }
    let f = null;
    for (const a of faces) if (a.at <= t) f = a;
    const settled = lastHeadingBefore(t);
    // A face is stale once he travels after it; a hop in place does not cancel where he was looking.
    const travelled = moves.filter((m) => m.t1 <= t && (m.kind === 'run' || m.from.distanceTo(m.to) > 0.05)).at(-1)?.t1 ?? -1;
    if (!f || f.at < travelled) return settled;
    if (f.target === 'camera') return toCam;
    if (Array.isArray(f.target)) return yawTo(loc, {x: f.target[0], z: f.target[1]});
    return deg(f.yaw ?? 0);
  }
  function yawAt(t) {
    // Critically damped follow of the target yaw, integrated over a fixed window: deterministic and order-free.
    const w = 14;
    const dt = 1 / 120;
    const t0 = t - 0.9;
    let y = targetYaw(t0);
    let v = 0;
    let prevTarget = y;
    for (let s = t0 + dt; s <= t + 1e-9; s += dt) {
      let g = targetYaw(s);
      g = prevTarget + wrap(g - prevTarget);
      prevTarget = g;
      const a = w * w * (g - y) - 2 * w * v;
      v += a * dt;
      y += v * dt;
    }
    return y;
  }

  // ---- layered events: squash pulses and antenna impulses
  const pulses = []; // {t, amt, pre, zeta, omega}
  const kicks = []; // antenna impulses {t, amp}
  for (const m of moves) {
    if (m.kind === 'run') {
      if (!m.flowIn) pulses.push({t: m.t0, amt: 0.13, pre: 0.16, zeta: 0.55, omega: 18}), kicks.push({t: m.t0, amp: -0.5});
      if (!m.flowOut) pulses.push({t: m.t1, amt: 0.1, pre: 0, zeta: 0.45, omega: 20}), kicks.push({t: m.t1, amp: 0.7});
    } else {
      pulses.push({t: m.t0, amt: 0.17, pre: 0.13, zeta: 0.6, omega: 22});
      pulses.push({t: m.t1, amt: m.verb === 'leap' ? 0.24 : 0.15, pre: 0, zeta: 0.42, omega: 17});
      kicks.push({t: m.t0, amp: -0.6}, {t: m.t1, amp: 0.9});
    }
  }
  for (const a of acts) {
    if (a.do === 'grab') pulses.push({t: a.at, amt: 0.12, pre: 0, zeta: 0.4, omega: 18}), kicks.push({t: a.at, amp: 0.6});
    if (a.do === 'toss') pulses.push({t: a.at, amt: 0.22, pre: 0.2, zeta: 0.5, omega: 18}), kicks.push({t: a.at, amp: -0.8});
    if (a.do === 'react') pulses.push({t: a.at, amt: a.amt ?? 0.1, pre: 0.1, zeta: 0.35, omega: 16}), kicks.push({t: a.at, amp: 0.8});
    if (a.do === 'crash') kicks.push({t: a.at, amp: -1.1});
  }
  const squashAt = (t) => {
    let s = 0;
    for (const p of pulses) {
      if (t < p.t - p.pre) continue;
      if (t < p.t) s -= p.amt * ease.inOut(span(t, p.t - p.pre, p.t));
      else s -= p.amt * (1 - spring(t, p.t, {zeta: p.zeta, omega: p.omega}));
    }
    return s;
  };
  const antennaAt = (t) => {
    let a = 0;
    for (const k of kicks) {
      const x = t - k.t;
      if (x < 0 || x > 2) continue;
      a += k.amp * Math.exp(-x * 5.5) * Math.sin(x * 19);
    }
    return a * 0.55;
  };

  // ---- verbs placed in time
  const crashes = acts.filter((a) => a.do === 'crash');
  const grab = acts.find((a) => a.do === 'grab');
  const toss = acts.find((a) => a.do === 'toss');
  const cheers = acts.filter((a) => a.do === 'cheer');
  const waves = acts.filter((a) => a.do === 'wave');
  const looks = [[-10, start.look || [0, 0]]];
  for (const a of acts) if (a.do === 'look') looks.push([a.at, a.target === 'camera' || !a.target ? [0, 0] : a.target]);
  const blinks = acts.filter((a) => a.do === 'blink').map((a) => a.at);
  // Natural blinks every 2.2-3.4 s (seeded), plus the authored ones.
  for (let t = 0.9, i = 0; t < 60; t += 2.2 + rand(5, i++) * 1.2) blinks.push(t);

  const armRaise = (t) => {
    // 0 rest, 1 straight up. Grab raises the nubs to carry over the head; toss flicks them back down.
    let r = 0;
    if (grab) r = clamp((t - (grab.at - 0.22)) / 0.2);
    if (toss && t >= toss.at - 0.16) r = t < toss.at ? 1 : 1 - ease.enter(span(t, toss.at, toss.at + 0.3));
    // a cheer throws both arms up and out (a V), not over the head where the body hides them
    for (const c of cheers) r = Math.max(r, 0.76 * Math.sin(Math.PI * span(t, c.at - 0.12, c.at + (c.dur ?? 0.42) + 0.45)));
    return r;
  };

  /** Everything about him at time t (pure). */
  function sample(t) {
    const loc = locomotion(t);
    const yaw = yawAt(t);
    const run = clamp(loc.speed / 2.2) * (loc.air >= 0 ? 0 : 1);
    const phase = (loc.dist / stride) * TAU;
    // Lean: forward with speed, more while accelerating, back while braking.
    const acc = (locomotion(t + 1 / 60).speed - locomotion(t - 1 / 60).speed) * 30;
    let pitch = 0.14 * run + clamp(acc * 0.025, -0.18, 0.12);
    // looking up or down tips the whole head a little: eyes alone are too small to read at phone size
    pitch -= 0.2 * clamp(springTrack(t, looks.map(([k, v]) => [k, v[1]]), {zeta: 0.8, omega: 14}), -1, 1);
    let sq = squashAt(t);
    let stretchZ = 0;
    if (loc.air >= 0) {
      const u = loc.air;
      sq += 0.12 * Math.sin(Math.PI * u); // stretch along the flight
      pitch += (0.5 - u) * -0.5 * (loc.leap.verb === 'leap' ? 1 : 0.3); // nose up on the launch, down on the fall
    }
    let squint = 0;
    let armBack = 0;
    for (const c of crashes) {
      const k = Math.sin(Math.PI * span(t, c.at - 0.08, c.at + 0.32));
      squint = Math.max(squint, k);
      pitch += 0.32 * k;
      stretchZ += 0.12 * k;
      armBack = Math.max(armBack, k);
    }
    for (const c of cheers) squint = Math.max(squint, 0.7 * Math.sin(Math.PI * span(t, c.at - 0.05, c.at + 0.75)));
    // the fling: crouch (the squash pulse), then a backward arch and a little lift on release, then recover
    let tossLift = 0;
    if (toss) {
      const k = Math.sin(Math.PI * span(t, toss.at - 0.04, toss.at + 0.34));
      pitch -= 0.5 * k;
      tossLift = 0.07 * k * (H / 0.9);
    }
    // the body never tips far outside a leap or a crash: a big pitch mid-turn reads as tumbling, not turning
    if (loc.air < 0 && !crashes.some((c) => Math.abs(t - c.at) < 0.4)) pitch = clamp(pitch, -0.3, 0.22);
    const sy = 1 + sq;
    const sxz = 1 / Math.sqrt(Math.max(0.3, sy));
    // Run cycle: a scurry. Legs swing from the hip; the body dips twice per stride; nubs pump in opposition.
    const legs = rig.legs.map((l) => {
      const p = phase + l.phase;
      const tuck = loc.air >= 0 ? 0.55 * Math.sin(Math.PI * loc.air) : 0;
      return {swing: 0.62 * run * Math.sin(p) - tuck * 0.4, lift: 0.035 * run * Math.max(0, -Math.cos(p)) + tuck * 0.05};
    });
    const bob = -0.022 * run * (0.5 - 0.5 * Math.cos(2 * phase)) * (H / 1.2);
    const raise = armRaise(t);
    let waveK = 0;
    for (const w of waves) waveK = Math.max(waveK, Math.sin(Math.PI * span(t, w.at, w.at + (w.dur ?? 1.1))));
    // the fling: nubs whip from overhead to back over the head with the card, then fall
    const fling = toss ? Math.sin(Math.PI * span(t, toss.at - 0.06, toss.at + 0.3)) : 0;
    const arms = rig.arms.map((a, i) => ({
      // a small pump: nubs swung far forward read as a snout in profile
      pump: -0.32 * run * Math.sin(phase + (i ? Math.PI : 0)) * (1 - raise) + armBack * 0.9 - 1.3 * fling,
      raise: Math.max(raise * 2.5, 1.9 * fling) + (a.side > 0 ? waveK * (1.75 + 0.45 * Math.sin((t - (waves[0]?.at ?? 0)) * 13)) : 0),
    }));
    let blink = 0;
    for (const b of blinks) blink = Math.max(blink, 1 - Math.abs((t - b) / 0.075));
    const look = [springTrack(t, looks.map(([k, v]) => [k, v[0]]), {zeta: 0.85, omega: 26}), springTrack(t, looks.map(([k, v]) => [k, v[1]]), {zeta: 0.85, omega: 26})];
    const roll = clamp(wrap(yawAt(t + 1 / 30) - yaw) * 30 * -0.04, -0.1, 0.1) * run;
    return {
      x: loc.x, z: loc.z, y: loc.lift + tossLift, yaw, pitch, roll, sy, sxz, stretchZ, bob, legs, arms,
      antenna: antennaAt(t) + 0.07 * run * Math.sin(2 * phase + 1), squint: Math.max(squint, blink), look, speed: loc.speed, air: loc.air,
      dist: loc.dist,
    };
  }

  function apply(s) {
    const {root, bodyPivot, eyes} = rig;
    root.position.set(s.x, s.y, s.z);
    root.rotation.set(0, s.yaw, 0);
    bodyPivot.position.y = rig.coreBottom + s.bob;
    bodyPivot.rotation.set(s.pitch, 0, s.roll);
    bodyPivot.scale.set(s.sxz, s.sy, s.sxz * (1 + s.stretchZ));
    rig.legs.forEach((l, i) => {
      l.g.rotation.x = s.legs[i].swing;
      l.g.position.y = l.pivot.y + s.legs[i].lift;
    });
    rig.arms.forEach((a, i) => {
      a.g.rotation.set(s.arms[i].pump, 0, a.side * s.arms[i].raise);
      // nubs stretch as they rise (a cartoon reach): a raised 2-cell nub would never clear the head otherwise
      a.g.scale.set(1 + 1.1 * clamp(s.arms[i].raise / 2.2), 1, 1);
    });
    rig.antennae.forEach((a, i) => a.g.rotation.set(-s.antenna * (i % 2 ? 0.9 : 1), 0, a.side * s.antenna * 0.25));
    eyes.position.x = s.look[0] * rig.cell * 0.45;
    eyes.position.y = (eyes.userData.y0 ??= eyes.position.y) + s.look[1] * rig.cell * 0.55;
    eyes.scale.y = Math.max(0.08, 1 - 0.92 * s.squint);
  }

  /** World position of the carry point at t (the same function is used to catch and to carry: no pop). */
  const tmp = new THREE.Vector3();
  function carryAt(t) {
    const s = sample(t);
    tmp.copy(rig.carryLocal);
    tmp.y = (tmp.y - rig.coreBottom) * s.sy + rig.coreBottom + s.bob;
    tmp.applyAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw);
    return new THREE.Vector3(s.x + tmp.x, s.y + tmp.y, s.z + tmp.z);
  }

  /** Footfall times inside runs (for sound): every time a leg passes mid-stance. */
  function footfalls() {
    const out = [];
    for (const m of moves) {
      if (m.kind !== 'run') continue;
      let k = Math.ceil((m.d0 / stride) * 2);
      for (let t = m.t0; t <= m.t1; t += 1 / 240) {
        const d = locomotion(t).dist;
        if ((d / stride) * 2 >= k) {
          out.push(Number(t.toFixed(3)));
          k++;
        }
      }
    }
    return out;
  }

  return {rig, sample, apply, locomotion, carryAt, footfalls, moves, height: H};
}

/** Draw the sprite flat into a 2D canvas (avatars and the in-film preview use the same character). */
export function drawSprite(ctx, spec, x, y, px, opts = {}) {
  const grid = spec.grid;
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) {
    const ch = grid[r][c];
    if (ch === '.' || ch === ' ') continue;
    const part = spec.parts[ch];
    if (opts.blink && part?.part === 'eye') continue;
    ctx.fillStyle = spec.colors[part?.color] || spec.colors.body;
    ctx.fillRect(Math.round(x + c * px), Math.round(y + r * px), Math.ceil(px), Math.ceil(px));
  }
}
