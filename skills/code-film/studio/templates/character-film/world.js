// world.js: the stage (desk, light, air), the renderer, and the camera as a character.
//
// Light: a warm key with soft shadows, a cool rim from behind that separates the character from the windows, a
// hemisphere fill, and a PMREM RoomEnvironment so bevels and clear-coat catch real reflections. Depth: fog plus a
// bokeh pass focused on the hero. Every pass is deterministic: nothing here reads a clock.
//
// Camera: film.json "camera.keys" are shots placed in time. Each key's pose is either absolute or relative to the
// character's lagged position ("rel": true). Shots blend by closed-form springs (no integration across frames), so
// the camera accelerates, travels and brakes like an operator, and any frame renders on its own.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {BokehPass} from 'three/addons/postprocessing/BokehPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {clamp, noise, spring} from './studio/kit.js';

export function createWorld(film, canvas) {
  const {width: W, height: H} = film;
  const S = film.stage || {};
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = S.exposure ?? 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const sky = new THREE.Color(S.sky || '#E7E2DA');
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, S.fogNear ?? 13, S.fogFar ?? 34);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = S.envIntensity ?? 0.6;

  // ---- light
  const hemi = new THREE.HemisphereLight(0xffffff, new THREE.Color(S.ground || '#CFC8BE'), S.fill ?? 0.55);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(new THREE.Color(S.keyColor || '#FFF1E0'), S.key ?? 2.4);
  key.position.set(...(S.keyFrom || [-6, 11, 8]));
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  const sc = key.shadow.camera;
  sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 50;
  key.shadow.bias = -0.0003;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  key.target.position.set(0, 0, -1);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(new THREE.Color(S.rimColor || '#DCE6FF'), S.rim ?? 1.5);
  rim.position.set(...(S.rimFrom || [5, 6, -9]));
  scene.add(rim);

  // ---- desk: a matte surface with a soft radial falloff, so the frame has a floor and a horizon of light
  const gc = document.createElement('canvas');
  gc.width = gc.height = 1024;
  const g = gc.getContext('2d');
  const grd = g.createRadialGradient(512, 512, 30, 512, 512, 520);
  grd.addColorStop(0, S.deskCentre || '#EFEBE4');
  grd.addColorStop(0.55, S.desk || '#DDD7CE');
  grd.addColorStop(1, S.sky || '#E7E2DA');
  g.fillStyle = grd;
  g.fillRect(0, 0, 1024, 1024);
  const deskTex = new THREE.CanvasTexture(gc);
  deskTex.colorSpace = THREE.SRGBColorSpace;
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshStandardMaterial({map: deskTex, roughness: 0.82, metalness: 0}));
  desk.rotation.x = -Math.PI / 2;
  desk.position.set(...(S.deskCentreAt || [0, 0, -2]));
  desk.receiveShadow = true;
  scene.add(desk);

  // ---- camera + post
  const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 120);
  const rt = new THREE.WebGLRenderTarget(W, H, {samples: 4, type: THREE.HalfFloatType});
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const dof = S.dof === false ? null : new BokehPass(scene, camera, {focus: 8, aperture: S.dof?.aperture ?? 0.0018, maxblur: S.dof?.maxblur ?? 0.0055});
  if (dof) composer.addPass(dof);
  composer.addPass(new OutputPass());
  // One merged finishing pass: a vignette and a dither (kills banding in the soft gradients), seeded by frame.
  const finish = new ShaderPass({
    uniforms: {tDiffuse: {value: null}, uSeed: {value: 0}, uVig: {value: S.vignette ?? 0.16}},
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uSeed; uniform float uVig; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uSeed) * 43758.5453); }
      void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; d.x *= ${(W / H).toFixed(4)};
        float v = 1.0 - uVig * smoothstep(0.25, 0.95, length(d) * 1.25);
        c.rgb *= v; c.rgb += (h(gl_FragCoord.xy) - 0.5) / 255.0 * 1.5; gl_FragColor = c; }`,
  });
  composer.addPass(finish);

  return {renderer, scene, camera, composer, dof, finish, key, desk};
}

/**
 * The camera rig. keys: [{at, pos, look, fov, rel, drift, omega, zeta, focus}], follow(t) -> Vector3 (the lagged
 * hero position), shakes: [{t, amp, decay}].
 */
export function createCameraRig(film, keys, follow, opts = {}) {
  const aspect = film.width / film.height;
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const ks = keys.map((k) => ({...k, pos: V(k.pos), look: V(k.look), drift: k.drift ? V(k.drift) : null}));
  const shakes = opts.shakes || [];
  const valueAt = (k, t, field) => {
    const v = k[field].clone();
    if (k.rel) v.add(follow(t));
    if (k.drift && field === 'pos') v.addScaledVector(k.drift, Math.max(0, t - k.at));
    return v;
  };
  const blend = (t, field) => {
    let v = valueAt(ks[0], t, field);
    for (let i = 1; i < ks.length; i++) {
      const w = spring(t, ks[i].at, {zeta: ks[i].zeta ?? 1, omega: ks[i].omega ?? 3.4});
      if (w <= 0) continue;
      v.addScaledVector(valueAt(ks[i], t, field).sub(valueAt(ks[i - 1], t, field)), w);
    }
    return v;
  };
  const fovAt = (t) => {
    let f = ks[0].fov ?? 36;
    for (let i = 1; i < ks.length; i++) f += ((ks[i].fov ?? ks[i - 1].fov ?? 36) - (ks[i - 1].fov ?? 36)) * spring(t, ks[i].at, {zeta: ks[i].zeta ?? 1, omega: ks[i].omega ?? 3.4});
    // fov is vertical in three.js; the keys are authored for 9:16. A wider frame keeps the same height and simply
    // sees more desk to the sides, so nothing is cropped.
    return f;
  };
  function pose(t) {
    const pos = blend(t, 'pos');
    const look = blend(t, 'look');
    // An operator's hand: a few millimetres of drift, never a wobble.
    pos.x += noise(t * 0.45, 3) * 0.035;
    pos.y += noise(t * 0.4, 7) * 0.025;
    for (const s of shakes) {
      const x = t - s.t;
      if (x < 0 || x > 1.2) continue;
      const a = s.amp * Math.exp(-x / (s.decay ?? 0.18));
      pos.x += noise(x * 28, 11) * a;
      pos.y += noise(x * 31, 13) * a;
      look.x += noise(x * 24, 17) * a * 0.5;
    }
    return {pos, look, fov: fovAt(t), aspect};
  }
  return {pose, keys: ks};
}

/** Critically damped follow of fn(t) (a Vector3 function), integrated over a fixed window: pure in t. */
export function lagged(fn, omega = 5, window = 1.4) {
  const cache = new Map();
  return (t) => {
    // quantise t first and compute at the quantised time, so a cached value never depends on which exact t
    // filled it (render order must not change a frame)
    const key = Math.round(t * 960);
    if (cache.has(key)) return cache.get(key).clone();
    const dt = 1 / 120;
    const t0 = key / 960 - window;
    const y = fn(t0).clone();
    const v = new THREE.Vector3();
    const a = new THREE.Vector3();
    const n = Math.round(window / dt);
    for (let i = 1; i <= n; i++) {
      const g = fn(t0 + i * dt);
      a.copy(g).sub(y).multiplyScalar(omega * omega).addScaledVector(v, -2 * omega);
      v.addScaledVector(a, dt);
      y.addScaledVector(v, dt);
    }
    if (cache.size > 20000) cache.clear();
    cache.set(key, y.clone());
    return y;
  };
}

export const clampFocus = (d) => clamp(d, 1, 60);
