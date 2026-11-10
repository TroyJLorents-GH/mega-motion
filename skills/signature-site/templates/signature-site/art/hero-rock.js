// The hero object: a procedural boulder (an icosphere displaced with smooth noise) in two layers.
//   Survey layer: dark stone with accent contour lines, always visible.
//   Painted layer: bone with blue topographic bands, revealed where the pointer trail has been.
// The trail is a soft circle stamped into a small render target each frame and faded out over HERO.trailFade.
// The rock follows the pointer with exponential lag (HERO.follow per 60 fps frame).
// Modes: live (pointer, idle turn, one autonomous sweep), capture (a fixed painted stroke, pose from scroll only)
// and still (reduced motion: one frame, the painted layer visible).
import * as THREE from 'three';
import {gsap} from 'gsap';
import {makeNoise} from './noise.js';

const VERT = /* glsl */ `
attribute float aH;
varying vec3 vN;
varying vec3 vP;
varying vec3 vObj;
varying float vH;
void main() {
  vObj = position;
  vH = aH;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vP = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uTrail;
uniform vec2 uRes;
uniform vec3 uAccent;
uniform vec3 uBone;
uniform vec3 uGround;
uniform float uDesat;
uniform float uPaint;
varying vec3 vN;
varying vec3 vP;
varying vec3 vObj;
varying float vH;
float iso(float v, float w) {
  float d = fwidth(v);
  float g = abs(fract(v - 0.5) - 0.5);
  return 1.0 - smoothstep(w * d, (w + 1.0) * d, g);
}
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vP);
  vec3 L = normalize(vec3(-0.55, 0.78, 0.62));
  float ndl = dot(N, L);
  float diff = max(ndl, 0.0);
  float wrap = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

  // Survey layer: dark stone, horizontal contour lines in the accent, a cool rim.
  float c1 = iso(vObj.y * 15.0, 0.5);
  float c5 = iso(vObj.y * 3.0, 0.9);
  vec3 stone = uGround * (0.85 + 1.25 * wrap);
  vec3 survey = stone + uAccent * (c1 * (0.28 + 0.6 * wrap) + c5 * 0.55) + uAccent * fres * 0.7;

  // Painted layer: bone, banded like a topographic map, with accent lines on the band edges.
  float hb = vH * 6.0 + 3.0;
  float alt = mod(floor(hb), 2.0);
  vec3 tint = mix(uBone, mix(uBone, uAccent, 0.3), alt);
  vec3 paint = tint * (0.42 + 0.62 * wrap) + vec3(0.06) * pow(diff, 8.0);
  paint = mix(paint, uAccent * (0.7 + 0.35 * wrap), iso(hb, 0.8) * 0.95);

  float t = texture2D(uTrail, gl_FragCoord.xy / uRes).r;
  float m = smoothstep(0.08, 0.55, max(t, uPaint));
  vec3 col = mix(survey, paint, m);
  col += uAccent * (smoothstep(0.02, 0.1, t) - smoothstep(0.1, 0.4, t)) * 0.5 * (1.0 - uPaint);

  float g = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(g), uDesat);
  gl_FragColor = vec4(col, 1.0);
}`;

const TRAIL_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const TRAIL_FRAG = /* glsl */ `
uniform sampler2D uPrev;
uniform vec2 uA;
uniform vec2 uB;
uniform float uR;
uniform float uFade;
uniform float uAmt;
uniform float uAspect;
varying vec2 vUv;
float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}
void main() {
  float v = max(texture2D(uPrev, vUv).r - uFade, 0.0);
  vec2 s = vec2(uAspect, 1.0);
  float d = seg(vUv * s, uA * s, uB * s);
  v = max(v, (1.0 - smoothstep(uR * 0.2, uR, d)) * uAmt);
  gl_FragColor = vec4(v, v, v, 1.0);
}`;

// An indexed icosphere (shared vertices, so normals come out smooth).
function icosphere(level) {
  const t = (1 + Math.sqrt(5)) / 2;
  const verts = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
    .map(([x, y, z]) => {
      const l = Math.hypot(x, y, z);
      return [x / l, y / l, z / l];
    });
  let faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let l = 0; l < level; l++) {
    const cache = new Map();
    const mid = (a, b) => {
      const key = a < b ? a * 1e6 + b : b * 1e6 + a;
      let m = cache.get(key);
      if (m === undefined) {
        const [x1, y1, z1] = verts[a];
        const [x2, y2, z2] = verts[b];
        const x = x1 + x2;
        const y = y1 + y2;
        const z = z1 + z2;
        const len = Math.hypot(x, y, z);
        m = verts.push([x / len, y / len, z / len]) - 1;
        cache.set(key, m);
      }
      return m;
    };
    const next = [];
    for (const [a, b, c] of faces) {
      const ab = mid(a, b);
      const bc = mid(b, c);
      const ca = mid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  return {verts, faces};
}

function rockGeometry(seed, level = 6) {
  const {verts, faces} = icosphere(level);
  const N = makeNoise(seed);
  const pos = new Float32Array(verts.length * 3);
  const hgt = new Float32Array(verts.length);
  let R = 0;
  verts.forEach(([x, y, z], i) => {
    const d1 = N.fbm3(x * 1.05 + 3.1, y * 1.05 - 1.3, z * 1.05 + 0.7, 4);
    const d2 = N.n3(x * 3.3 + 9.0, y * 3.3, z * 3.3 - 2.0);
    const r = 1 + 0.3 * d1 + 0.05 * d2;
    let px = x * r * 1.18;
    let py = y * r * 0.92;
    const pz = z * r;
    if (py < -0.62) py = -0.62 + (py + 0.62) * 0.28; // a flat-ish base, so it sits like a boulder
    px += 0.08 * py; // a slight lean
    pos.set([px, py, pz], i * 3);
    hgt[i] = d1;
    R = Math.max(R, Math.hypot(px, py, pz));
  });
  for (let i = 0; i < pos.length; i++) pos[i] *= 1.1 / R; // radius 1.1, so the frame maths can use a known size
  const index = new Uint32Array(faces.length * 3);
  faces.forEach((f, i) => index.set(f, i * 3));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aH', new THREE.BufferAttribute(hgt, 1));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

export function createHeroRock(canvas, {palette, H, mode = 'live', phone = false, seed = 11}) {
  THREE.ColorManagement.enabled = false; // palette hex values go to the shader as written
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, powerPreference: 'high-performance'});
  } catch {
    return null;
  }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? H.dpr.phone : H.dpr.desktop)); // set once
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(H.fov, 1, 0.1, 300);
  const col = (c) => new THREE.Color(c);
  const uniforms = {
    uTrail: {value: null}, uRes: {value: new THREE.Vector2(1, 1)},
    uAccent: {value: col(palette.accent)}, uBone: {value: col(palette.bone)}, uGround: {value: col(palette.ground)},
    uDesat: {value: 0}, uPaint: {value: 0},
  };
  const mesh = new THREE.Mesh(rockGeometry(seed), new THREE.ShaderMaterial({uniforms, vertexShader: VERT, fragmentShader: FRAG}));
  mesh.rotation.set(0.18, 0.7, 0.04);
  const pivot = new THREE.Group();
  pivot.add(mesh);
  scene.add(pivot);

  const tu = {uPrev: {value: null}, uA: {value: new THREE.Vector2()}, uB: {value: new THREE.Vector2()}, uR: {value: H.brush},
    uFade: {value: 0}, uAmt: {value: 0}, uAspect: {value: 1}};
  const tScene = new THREE.Scene();
  tScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({uniforms: tu, vertexShader: TRAIL_VERT, fragmentShader: TRAIL_FRAG, depthTest: false, depthWrite: false})));
  const tCam = new THREE.Camera();
  let rtRead = null;
  let rtWrite = null;

  const S = {
    w: 1, h: 1, e: 0, cy: 0.5, d0: 300, d1: 200,
    tgt: {x: 0, y: 0}, cur: {x: 0, y: 0}, spin: 0,
    ptr: null, last: null, moved: false, lastStamp: -1e9, now: 0, pointerSeen: false,
    sweep: null, running: false, dirty: true,
  };

  const clearRT = (rt) => {
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(null);
  };
  const stamp = (a, b, amt, fade) => {
    tu.uPrev.value = rtRead.texture;
    tu.uA.value.set(a[0], a[1]);
    tu.uB.value.set(b[0], b[1]);
    tu.uAmt.value = amt;
    tu.uFade.value = fade;
    renderer.setRenderTarget(rtWrite);
    renderer.render(tScene, tCam);
    renderer.setRenderTarget(null);
    [rtRead, rtWrite] = [rtWrite, rtRead];
    uniforms.uTrail.value = rtRead.texture;
  };

  // Where the rock sits on screen, in canvas uv (0..1, y up), and its radius in uv-height units.
  const centerUV = () => [0.5, 1 - S.cy / S.h];
  const radiusUV = () => (S.d0 + (S.d1 - S.d0) * S.e) / 2 / S.h;

  // A fixed brush stroke through the rock (capture and reduced motion): same pixels at any scroll position.
  function staticStroke(width) {
    clearRT(rtRead);
    clearRT(rtWrite);
    uniforms.uTrail.value = rtRead.texture;
    tu.uR.value = width;
    const [cx, cy] = centerUV();
    const r = S.d0 / 2 / S.h;
    const asp = S.w / S.h;
    const at = (t) => [cx + ((t - 0.35) * 1.3 * r) / asp, cy + r * (0.5 - 0.9 * t) + 0.18 * r * Math.sin(t * Math.PI * 2.0)];
    for (let i = 0; i < 40; i++) stamp(at(i / 40), at((i + 1) / 40), 1, 0);
    tu.uR.value = H.brush;
  }

  function layout(frame) {
    Object.assign(S, frame);
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    S.w = w;
    S.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const buf = renderer.getDrawingBufferSize(new THREE.Vector2());
    uniforms.uRes.value.copy(buf);
    tu.uAspect.value = w / h;
    const tw = Math.max(64, Math.round(buf.x / 3));
    const th = Math.max(64, Math.round(buf.y / 3));
    rtRead?.dispose();
    rtWrite?.dispose();
    const opt = {depthBuffer: false, stencilBuffer: false, type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter};
    rtRead = new THREE.WebGLRenderTarget(tw, th, opt);
    rtWrite = new THREE.WebGLRenderTarget(tw, th, opt);
    clearRT(rtRead);
    clearRT(rtWrite);
    uniforms.uTrail.value = rtRead.texture;
    if (mode === 'capture') staticStroke(H.brush * 0.9);
    if (mode === 'still') staticStroke(H.brush * 1.8);
    S.dirty = true;
    if (mode !== 'live') render();
  }

  // Camera dolly: the distance that makes the rock's 2.2-unit bounding diameter D pixels tall; the rock is
  // moved so it sits at S.cy on screen. e is the eased hero progress (0 full bleed, 1 card).
  function pose() {
    const D = S.d0 + (S.d1 - S.d0) * S.e;
    const tan = Math.tan(THREE.MathUtils.degToRad(H.fov / 2));
    const z = (2.2 * S.h) / (2 * tan * D);
    camera.position.set(0, 0, z);
    camera.lookAt(0, 0, 0);
    const pxPerUnit = S.h / (2 * z * tan);
    pivot.position.y = -(S.cy - S.h / 2) / pxPerUnit;
    uniforms.uDesat.value = H.desaturate * S.e;
  }

  function render() {
    pose();
    if (mode === 'capture') {
      pivot.rotation.set(0.12, -0.3 + S.e * 0.9, 0);
    } else if (mode === 'live') {
      pivot.rotation.set(-S.cur.y * H.tilt[1], S.cur.x * H.tilt[0], 0);
      pivot.position.x = S.cur.x * 0.12;
      mesh.rotation.y = 0.7 + S.spin;
    }
    renderer.render(scene, camera);
    S.dirty = false;
  }

  // Live frame: the sweep or pointer feeds the trail, the rock eases toward its target, then one render.
  function tick(_time, dtMs) {
    const dt = Math.min(dtMs, 64) / 1000;
    S.now += dt;
    if (S.sweep) {
      const sw = S.sweep;
      sw.t += dt / H.sweep;
      const k = Math.min(1, sw.t);
      const u = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const [cx, cy] = centerUV();
      const r = radiusUV();
      const asp = S.w / S.h;
      feed([cx + ((u - 0.5) * 2.6 * r) / asp, cy + 0.55 * r * Math.sin(u * Math.PI * 2.2 + 0.4)]);
      if (k >= 1) {
        S.sweep = null;
        S.tgt.x = 0;
        S.tgt.y = 0;
      }
    }
    const fade = dt / H.trailFade;
    if (S.moved) {
      const a = S.last && S.now - S.lastStamp < 0.12 ? S.last : S.ptr;
      stamp(a, S.ptr, 1, fade);
      S.last = S.ptr.slice();
      S.lastStamp = S.now;
      S.moved = false;
    } else if (S.now - S.lastStamp < H.trailFade + 0.1) {
      stamp([-1, -1], [-1, -1], 0, fade);
    }
    const k = 1 - Math.pow(1 - H.follow, dt * 60);
    S.cur.x += (S.tgt.x - S.cur.x) * k;
    S.cur.y += (S.tgt.y - S.cur.y) * k;
    S.spin += dt * H.spin;
    render();
  }

  function feed(uv) {
    S.ptr = uv;
    S.moved = true;
    S.tgt.x = (uv[0] - 0.5) * 2;
    S.tgt.y = (uv[1] - 0.5) * 2;
  }
  const onMove = (e) => {
    if (e.pointerType === 'touch') return;
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    S.pointerSeen = true;
    S.sweep = null;
    feed([(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]);
  };
  if (mode === 'live') addEventListener('pointermove', onMove, {passive: true});

  const api = {
    layout,
    setProgress(e) {
      if (Math.abs(e - S.e) < 1e-5 && !S.dirty) return;
      S.e = e;
      if (mode !== 'live' || !S.running) render();
    },
    start() {
      if (mode !== 'live' || S.running) return;
      S.running = true;
      gsap.ticker.add(tick);
    },
    stop() {
      if (!S.running) return;
      S.running = false;
      gsap.ticker.remove(tick);
    },
    // One autonomous stroke, so phones and still visitors see the painted layer once.
    sweep() {
      if (mode === 'live' && !S.pointerSeen) S.sweep = {t: 0};
    },
    render,
    // First frame compiled and drawn: the GL init cost is paid under the brand screen.
    warm() {
      renderer.compile(scene, camera);
      render();
    },
  };
  return api;
}
