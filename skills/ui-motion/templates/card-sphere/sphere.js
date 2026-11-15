// Card sphere: cards spread evenly over a sphere, spun by dragging, with exponential momentum and a settle
// that brings the nearest card to the front, upright. Plain ES module, no dependencies.
// Clean-room build from measured behaviour (momentum time constant 0.8 s, resting on a centred card); see TEMPLATE.md.
//
//   const sphere = createSphere(stageEl, {cards, sphere, motion, onFront})
//   sphere.fling(vxPx, vyPx)   throw it as if released at that pointer velocity (px/s)
//   sphere.step(dx, dy)        settle on the next card in a screen direction (-1, 0, 1)
//   sphere.front               the card object currently facing the viewer
//   sphere.destroy()

// ---- quaternions [w, x, y, z] and small vector helpers ----
const qmul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];
const qnorm = (q) => { const l = Math.hypot(...q); return q.map((v) => v / l); };
const qaxis = (ax, ang) => { const s = Math.sin(ang / 2); return [Math.cos(ang / 2), ax[0] * s, ax[1] * s, ax[2] * s]; };
const qmat = ([w, x, y, z]) => [
  [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
  [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
  [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
];
const mv = (m, v) => [0, 1, 2].map((i) => m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => { const l = Math.hypot(...v) || 1; return v.map((c) => c / l); };
function matToQuat(m) {
  const t = m[0][0] + m[1][1] + m[2][2];
  let q;
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; q = [s / 4, (m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s]; }
  else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) { const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; q = [(m[2][1] - m[1][2]) / s, s / 4, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s]; }
  else if (m[1][1] > m[2][2]) { const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; q = [(m[0][2] - m[2][0]) / s, (m[0][1] + m[1][0]) / s, s / 4, (m[1][2] + m[2][1]) / s]; }
  else { const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2; q = [(m[1][0] - m[0][1]) / s, (m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, s / 4]; }
  return qnorm(q);
}
function slerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) { b = b.map((v) => -v); d = -d; }
  if (d > 0.9995) return qnorm(a.map((v, i) => v + (b[i] - v) * t));
  const th = Math.acos(d), s = Math.sin(th);
  return a.map((v, i) => (v * Math.sin((1 - t) * th) + b[i] * Math.sin(t * th)) / s);
}

const UP = [0, -1, 0]; // screen up in CSS, where y grows downward
const VIEWER = [0, 0, 1];

export function createSphere(stage, {cards: items, sphere: S = {}, motion: M = {}, onFront} = {}) {
  const tau = M.momentumTau ?? 0.8;
  const snapSpeed = M.snapSpeed ?? 0.7;
  const settleTau = M.settleTau ?? 0.16;
  const turns = M.dragTurnsPerDiameter ?? 0.5;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const world = document.createElement('div');
  world.className = 'sphere__world';
  stage.appendChild(world);

  // even points on the sphere (Fibonacci), each with its own tangent frame
  const N = items.length;
  const cards = items.map((item, i) => {
    const y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y), phi = i * Math.PI * (3 - Math.sqrt(5));
    const p = [Math.cos(phi) * r, y, Math.sin(phi) * r];
    let u = UP.map((c, k) => c - dot(UP, p) * p[k]);
    u = Math.hypot(...u) < 1e-3 ? [0, 0, 1] : unit(u);
    const el = document.createElement('figure');
    el.className = `sphere__card s${(i * 3) % 8}`;
    el.style.setProperty('--bg', item.bg || '#cfd8d3');
    if (item.fg) el.style.setProperty('--fg', item.fg);
    if (item.image) {
      const img = new Image();
      img.src = item.image; img.alt = ''; img.draggable = false; img.decoding = 'async';
      el.classList.add('has-image'); el.appendChild(img);
    }
    el.setAttribute('aria-hidden', 'true');
    world.appendChild(el);
    return {item, el, p, u, index: i};
  });

  let D = 0, R = 0;
  const size = () => {
    const narrow = innerWidth < 600;
    D = narrow ? innerWidth * (S.phoneDiameter ?? 0.78) : Math.min(innerWidth * (S.diameter ?? 0.4), innerHeight * 0.64, S.maxDiameterPx ?? 640);
    R = D / 2;
    const cw = D * (S.cardWidth ?? 0.25);
    stage.style.setProperty('--d', `${D}px`);
    stage.style.setProperty('--cw', `${cw}px`);
    stage.style.setProperty('--ch', `${cw / (S.cardAspect ?? 0.7)}px`);
    stage.style.setProperty('--cr', `${cw * (S.radius ?? 0.045)}px`);
    stage.style.setProperty('--persp', `${D * (S.perspective ?? 3)}px`);
  };
  size();
  addEventListener('resize', size);

  let q = [1, 0, 0, 0];
  let omega = [0, 0, 0]; // angular velocity, axis * rad/s
  let dragging = false, target = null, front = null;

  // the rotation that puts a card's face toward the viewer with its top up
  const facing = (c) => {
    const src = [c.p, c.u, cross(c.p, c.u)], dst = [VIEWER, UP, cross(VIEWER, UP)];
    const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let k = 0; k < 3; k++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i][j] += dst[k][i] * src[k][j];
    return matToQuat(m);
  };
  const nearestFront = () => {
    const m = qmat(q);
    let best = cards[0], bz = -2;
    for (const c of cards) { const z = mv(m, c.p)[2]; if (z > bz) { bz = z; best = c; } }
    return best;
  };
  const settleOn = (c) => {
    target = facing(c);
    if (front !== c) { front = c; onFront?.(c.item, c.index); }
  };

  const render = () => {
    const m = qmat(q);
    for (const c of cards) {
      const z = mv(m, c.p), yAxis = mv(m, c.u.map((v) => -v)), xAxis = cross(yAxis, z), t = z.map((v) => v * R);
      c.el.style.transform = `matrix3d(${xAxis[0]},${xAxis[1]},${xAxis[2]},0,${yAxis[0]},${yAxis[1]},${yAxis[2]},0,${z[0]},${z[1]},${z[2]},0,${t[0]},${t[1]},${t[2]},1)`;
    }
  };

  // ---- pointer: dragging across the diameter turns the sphere by `turns` revolutions
  const radPerPx = () => (turns * 2 * Math.PI) / D;
  const turnBy = (dx, dy) => {
    const len = Math.hypot(dx, dy);
    if (len) q = qnorm(qmul(qaxis([-dy / len, dx / len, 0], len * radPerPx()), q));
  };
  let last = null, lastT = 0, vel = [0, 0], pid = null;
  const down = (e) => {
    if (e.button > 0) return;
    dragging = true; target = null; omega = [0, 0, 0]; pid = e.pointerId;
    last = [e.clientX, e.clientY]; lastT = performance.now(); vel = [0, 0];
    try { stage.setPointerCapture(e.pointerId); } catch { /* synthetic or ended pointer: the window listeners still catch the release */ }
    stage.classList.add('is-dragging');
  };
  const move = (e) => {
    if (!dragging || e.pointerId !== pid) return;
    const now = performance.now(), dt = Math.max(1, now - lastT) / 1000;
    const dx = e.clientX - last[0], dy = e.clientY - last[1];
    turnBy(dx, dy);
    vel = [vel[0] * 0.6 + (dx / dt) * 0.4, vel[1] * 0.6 + (dy / dt) * 0.4];
    last = [e.clientX, e.clientY]; lastT = now;
    render(); // respond on the input frame, not the next tick
  };
  const up = (e) => {
    if (!dragging || (e && e.pointerId !== pid)) return;
    dragging = false; stage.classList.remove('is-dragging');
    if (performance.now() - lastT > 80) vel = [0, 0]; // held still before letting go
    fling(vel[0], vel[1]);
  };
  stage.addEventListener('pointerdown', down);
  stage.addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  stage.addEventListener('lostpointercapture', (e) => up(e));

  function fling(vx, vy) {
    target = null;
    const k = radPerPx();
    omega = [-vy * k, vx * k, 0];
    const speed = Math.hypot(...omega);
    if (reduce.matches && speed > snapSpeed) {
      // No travel: jump straight to where the momentum would have carried it (speed decays from `speed` to
      // `snapSpeed` with time constant tau, so it turns tau * (speed - snapSpeed) radians), then settle there.
      q = qnorm(qmul(qaxis(unit(omega), tau * (speed - snapSpeed)), q));
      omega = [0, 0, 0];
      settleOn(nearestFront());
    }
  }

  // ---- keyboard: settle on the neighbouring card in a screen direction
  function step(dx, dy) {
    const m = qmat(q), cur = front || nearestFront();
    const from = mv(m, cur.p);
    let best = null, score = Infinity;
    for (const c of cards) {
      if (c === cur) continue;
      const w = mv(m, c.p);
      if (w[2] < 0) continue; // only the visible side
      const sx = w[0] - from[0], sy = w[1] - from[1];
      const along = sx * dx + sy * dy;
      if (along <= 0.05) continue;
      const off = Math.abs(sx * dy - sy * dx);
      const s = along + off * 2;
      if (s < score) { score = s; best = c; }
    }
    if (best) { omega = [0, 0, 0]; settleOn(best); }
  }
  stage.addEventListener('keydown', (e) => {
    const dir = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]}[e.key];
    if (!dir) return;
    e.preventDefault();
    step(...dir);
  });

  // ---- one frame loop
  let prev = performance.now(), raf = 0;
  const tick = (now) => {
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    if (!dragging) {
      const speed = Math.hypot(...omega);
      if (speed > snapSpeed && !reduce.matches) {
        q = qnorm(qmul(qaxis(unit(omega), speed * dt), q));
        omega = omega.map((v) => v * Math.exp(-dt / tau));
      } else {
        omega = [0, 0, 0];
        if (!target) settleOn(nearestFront());
        q = qnorm(slerp(q, target, reduce.matches ? 1 : 1 - Math.exp(-dt / settleTau)));
      }
    }
    render();
    raf = requestAnimationFrame(tick);
  };
  settleOn(cards[0]);
  q = target;
  render();
  raf = requestAnimationFrame(tick);

  return {
    fling, step,
    get front() { return front?.item; },
    destroy() { cancelAnimationFrame(raf); removeEventListener('resize', size); world.remove(); },
  };
}
