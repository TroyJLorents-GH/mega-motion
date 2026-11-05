// smash.js: a window breaking into shards when the character crashes through it, with consequences that stay.
//
// Deterministic and closed-form: the break pattern is seeded (rings and jittered sectors around the impact point,
// clipped to the window's outline), every shard follows a ballistic arc with spin, hits the desk, bounces once,
// slides to a stop and lies there, face up, still showing its piece of the page. Dust, paper chips and a shockwave
// ring on the desk come from the same clock. Nothing is simulated frame to frame.
import * as THREE from 'three';
import {clamp, ease, rand} from './studio/kit.js';
import {slabOutline} from './panels.js';

const G = 9.8;

function clipPoly(poly, clip) {
  // Sutherland-Hodgman against a convex, counter-clockwise clip polygon.
  let out = poly;
  for (let i = 0; i < clip.length; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const inside = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0;
    const cross = (p, q) => {
      const x1 = p[0], y1 = p[1], x2 = q[0], y2 = q[1];
      const dx = x2 - x1, dy = y2 - y1;
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const den = dx * ey - dy * ex;
      const s = ((a[0] - x1) * ey - (a[1] - y1) * ex) / den;
      return [x1 + s * dx, y1 + s * dy];
    };
    const inp = out;
    out = [];
    for (let j = 0; j < inp.length; j++) {
      const p = inp[j];
      const q = inp[(j + 1) % inp.length];
      const pi = inside(p), qi = inside(q);
      if (pi) out.push(p);
      if (pi !== qi) out.push(cross(p, q));
    }
    if (!out.length) break;
  }
  return out;
}
const area = (p) => p.reduce((s, a, i) => s + a[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * a[1], 0) / 2;

/**
 * panel: from createPanels. hit: {t, point (world), uv [u, v], dir (world unit vector the character travels)}.
 * opts: {seed, rings, force, hole: [w, h] keep-out for the card (page-local), cardRect}.
 */
export function createShatter(panel, hit, scene, opts = {}) {
  const seed = opts.seed ?? 7;
  const {w, h, sw, sh, frontZ} = panel;
  // impact in page-local coordinates (x from centre, y from the bottom of the slab)
  const ix = -sw / 2 + hit.uv[0] * sw;
  const iy = h / 2 - sh / 2 + hit.uv[1] * sh;
  const outline = slabOutline(w, h, panel.radius ?? 0.12);
  const rings = opts.rings || [0, 0.22, 0.5, 0.9, 1.45, 2.2, 3.4, 6];
  const polys = [];
  for (let k = 0; k < rings.length - 1; k++) {
    const n = k === 0 ? 5 : Math.round(6 + k * 3.2);
    const off = rand(seed, k) * Math.PI * 2;
    const angs = [];
    for (let j = 0; j < n; j++) angs.push(off + ((j + 0.5 * (rand(seed + 3, k * 31 + j) - 0.5)) / n) * Math.PI * 2);
    for (let j = 0; j < n; j++) {
      const a0 = angs[j];
      const a1 = j + 1 < n ? angs[j + 1] : angs[0] + Math.PI * 2;
      const r0 = rings[k] * (1 + 0.18 * (rand(seed + 5, k * 17 + j) - 0.5));
      const r1 = rings[k + 1] * (1 + 0.18 * (rand(seed + 9, k * 13 + j) - 0.5));
      const pts = [];
      const arc = (r, from, to, steps) => {
        for (let s = 0; s <= steps; s++) {
          const a = from + ((to - from) * s) / steps;
          pts.push([ix + Math.cos(a) * r, iy + Math.sin(a) * r]);
        }
      };
      if (r0 < 1e-3) pts.push([ix, iy]);
      else arc(r0, a0, a1, 2);
      arc(r1, a1, a0, 2);
      const ccw = area(pts) < 0 ? pts.reverse() : pts;
      const clipped = clipPoly(ccw, outline);
      if (clipped.length >= 3 && Math.abs(area(clipped)) > 0.004) polys.push({poly: clipped, ring: k});
    }
  }

  // Each shard: an extruded polygon, page texture on the front, the window's frame colour on the edges.
  // thinner than the slab: pieces of a page read as sheets, not bricks
  const thick = Math.min(panel.frontZ, opts.thickness ?? 0.05);
  const faceMat = panel.screen.material.clone();
  faceMat.emissiveIntensity = (panel.screen.material.emissiveIntensity ?? 1) * 0.92;
  const edgeMat = panel.slab.material;
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  panel.group.updateMatrixWorld(true);
  const M = panel.group.matrixWorld.clone();
  const q0 = new THREE.Quaternion().setFromRotationMatrix(M);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(q0);
  const impactW = new THREE.Vector3(ix, iy, frontZ).applyMatrix4(M);
  const force = opts.force ?? 1;
  const travel = hit.dir.clone().normalize();
  const shards = polys.map(({poly, ring}, i) => {
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
    const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x - cx, y - cy)));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thick, bevelEnabled: false,
      UVGenerator: {
        generateTopUV: (g, v, a, b, c) => [a, b, c].map((idx) => new THREE.Vector2((v[idx * 3] + cx + sw / 2) / sw, (v[idx * 3 + 1] + cy - (h / 2 - sh / 2)) / sh)),
        generateSideWallUV: () => [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()],
      },
    });
    geo.translate(0, 0, -thick / 2);
    const mesh = new THREE.Mesh(geo, [faceMat, edgeMat]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    const p0 = new THREE.Vector3(cx, cy, panel.frontZ - thick / 2).applyMatrix4(M);
    // velocity: out from the impact in the page plane (faster near it), through the page along the travel, a lift
    const radial = p0.clone().sub(impactW);
    radial.addScaledVector(normal, -radial.dot(normal));
    const rlen = Math.max(0.05, radial.length());
    radial.normalize();
    const near = 1 / (0.45 + rlen);
    const v = radial.multiplyScalar((1.2 + 2.4 * near) * force * (0.8 + 0.4 * rand(seed + 11, i)));
    v.addScaledVector(travel, (0.6 + 3.2 * near + 0.6 * rand(seed + 13, i)) * force);
    v.y += (0.6 + 1.6 * rand(seed + 17, i)) * force;
    const axis = new THREE.Vector3(rand(seed + 19, i) - 0.5, rand(seed + 23, i) - 0.5, rand(seed + 29, i) - 0.5).normalize();
    const spin = (4 + 9 * rand(seed + 31, i)) * (0.6 + near);
    const restY = thick / 2 + 0.002 + i * 0.0004;
    // the shard lands face up (the page's piece readable on the desk) or, sometimes, face down
    const up = rand(seed + 37, i) > 0.18;
    const qRest = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand(seed + 41, i) * Math.PI * 2)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), up ? -Math.PI / 2 : Math.PI / 2));
    // time of the first desk contact: y0 + vy t - g t^2 / 2 = restY
    const a = 0.5 * G, b = -v.y, c = restY - p0.y;
    const tHit = (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
    const delay = rlen / 14; // the break propagates out from the impact
    return {mesh, p0, v, axis, spin, restY, qRest, tHit, delay, ring};
  });

  // Dust and paper chips: one Points cloud each; positions and alpha computed from t.
  const mkPoints = (n, size, color, seedK) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const sc = sprite.getContext('2d');
    const gr = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(seedK === 1 ? 0.25 : 0.9, 'rgba(255,255,255,0.6)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    sc.fillStyle = gr;
    sc.fillRect(0, 0, 64, 64);
    const mat = new THREE.PointsMaterial({size, map: new THREE.CanvasTexture(sprite), vertexColors: true, transparent: true, depthWrite: false, color: new THREE.Color(color)});
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    const parts = [];
    for (let i = 0; i < n; i++) {
      const th = rand(seedK * 101 + 3, i) * Math.PI * 2;
      const r = rand(seedK * 101 + 5, i);
      const dir = new THREE.Vector3(Math.cos(th), Math.sin(th) * 0.8 + 0.3, 0).applyQuaternion(q0);
      dir.addScaledVector(travel, 0.5 + rand(seedK * 101 + 7, i) * 1.4);
      parts.push({dir: dir.normalize(), sp: (seedK === 1 ? 2.5 : 1.2) + r * (seedK === 1 ? 5 : 2.4), life: 0.7 + rand(seedK * 101 + 9, i) * (seedK === 1 ? 0.9 : 1.6), off: rand(seedK * 101 + 11, i) * 0.08});
    }
    return {pts, parts, geo};
  };
  const dust = mkPoints(180, 0.22, opts.dust || '#F1EEE8', 2);
  const chips = mkPoints(140, 0.045, '#FFFFFF', 1);

  // Shockwave on the desk under the impact.
  const ringMat = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0, depthWrite: false});
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 96), ringMat);
  ring.rotation.x = -Math.PI / 2;
  const base = impactW.clone().addScaledVector(travel, 0.3);
  ring.position.set(base.x, 0.006, base.z);
  scene.add(ring);
  const ring2 = ring.clone();
  ring2.material = ringMat.clone();
  scene.add(ring2);

  const tmpQ = new THREE.Quaternion();
  const tmpQ2 = new THREE.Quaternion();
  function update(t) {
    const T = t - hit.t;
    const broken = T >= 0;
    panel.group.visible = !broken;
    group.visible = broken;
    // before the break: the page takes the hit (a push and a shudder), the overlay draws the cracks
    if (!broken) {
      const pre = clamp((T + 0.16) / 0.16);
      panel.group.position.copy(panel.restPos ??= panel.group.position.clone());
      panel.group.position.addScaledVector(normal, -0.05 * ease.inOut(pre));
      panel.group.position.x += Math.sin(T * 120) * 0.006 * pre;
    }
    for (const s of shards) {
      const tau = Math.max(0, T - s.delay);
      let p;
      let q;
      if (tau <= s.tHit) {
        p = s.p0.clone().addScaledVector(s.v, tau);
        p.y -= 0.5 * G * tau * tau;
        q = tmpQ.setFromAxisAngle(s.axis, s.spin * tau).multiply(q0);
      } else {
        // one small bounce, a slide that brakes, then rest flat
        const t2 = tau - s.tHit;
        const vh = new THREE.Vector3(s.v.x, 0, s.v.z).multiplyScalar(0.55);
        const k = 3.2;
        p = s.p0.clone().addScaledVector(s.v, s.tHit);
        p.y = s.restY;
        p.addScaledVector(vh, (1 - Math.exp(-k * t2)) / k);
        const vb = Math.min(1.2, Math.abs(s.v.y - G * s.tHit) * 0.22);
        const tb = (2 * vb) / G;
        if (t2 < tb) p.y += vb * t2 - 0.5 * G * t2 * t2;
        const qHit = tmpQ2.setFromAxisAngle(s.axis, s.spin * s.tHit).multiply(q0);
        q = qHit.clone().slerp(s.qRest, ease.enter(clamp(t2 / 0.28)));
      }
      s.mesh.position.copy(p);
      s.mesh.quaternion.copy(q);
      // the first frames of the break show the pieces still almost in place: the crack pattern reads
    }
    const upd = (sys, gDown, drag) => {
      const pos = sys.geo.attributes.position;
      const col = sys.geo.attributes.color;
      sys.parts.forEach((p, i) => {
        const tau = T - p.off;
        if (!broken || tau < 0 || tau > p.life) {
          col.setXYZW(i, 1, 1, 1, 0);
          pos.setXYZ(i, 0, -10, 0);
          return;
        }
        const d = (p.sp * (1 - Math.exp(-drag * tau))) / drag;
        pos.setXYZ(i, impactW.x + p.dir.x * d, Math.max(0.02, impactW.y + p.dir.y * d - 0.5 * gDown * tau * tau), impactW.z + p.dir.z * d);
        const a = (1 - tau / p.life) ** 1.5;
        col.setXYZW(i, 1, 1, 1, a * (sys === dust ? 0.55 : 1));
      });
      pos.needsUpdate = true;
      col.needsUpdate = true;
    };
    upd(dust, 0.6, 2.6);
    upd(chips, G * 0.7, 1.2);
    dust.pts.material.size = 0.22 * (1 + Math.max(0, T) * 1.4);
    const rw = (r, m, d, s) => {
      const u = clamp((T - d) / 0.6);
      r.visible = broken && u > 0 && u < 1;
      const sc = 0.2 + s * ease.enter(u);
      r.scale.set(sc, sc, sc);
      m.opacity = 0.55 * (1 - u) ** 1.6;
    };
    rw(ring, ringMat, 0.03, 3.0);
    rw(ring2, ring2.material, 0.12, 1.8);
  }
  return {update, impact: impactW, shards, normal};
}
