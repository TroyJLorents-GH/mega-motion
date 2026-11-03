// The studio: renderer, a procedural dark-studio environment (PMREM, no HDRI download), one warm key light,
// a floor pool, a soft backdrop glow, a baked contact shadow, and the product (procedural watch or a .glb).
// Scene graph: scene > turntable (yaw) > [shadow, lift (y) > pivot > model]. The shadow turns with the product
// but stays on the floor when it lifts.
import * as THREE from 'three';
import {buildWatch} from './watch.js';

function radialTexture(stops, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A dark room with three soft boxes and a low strip on the camera side, rendered once into a PMREM.
// Chrome-like metal needs something bright to reflect and a lot of dark around it (contrast is the look).
function studioEnvironment(renderer) {
  const env = new THREE.Scene();
  const mats = [];
  const geos = [];
  const add = (w, h, color, k, pos, look) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshBasicMaterial({color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide});
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.lookAt(...look);
    env.add(m);
    geos.push(geo);
    mats.push(mat);
  };
  const roomGeo = new THREE.SphereGeometry(30, 32, 16);
  const roomMat = new THREE.MeshBasicMaterial({color: 0x050506, side: THREE.BackSide});
  env.add(new THREE.Mesh(roomGeo, roomMat));
  geos.push(roomGeo);
  mats.push(roomMat);
  add(12, 7, 0xffffff, 1.5, [0, 14, 2], [0, 0, 0]); // overhead soft box
  add(1.4, 18, 0xffffff, 7.0, [-13, 2, 3], [0, 2, 3]); // long strip, camera left: the edge highlight
  add(1.0, 18, 0xfff0e2, 3.2, [13, 1, -4], [0, 1, -4]); // warm strip, camera right: the rim
  add(22, 0.7, 0xffffff, 1.1, [0, 0.6, 16], [0, 0.6, 0]); // low horizon strip behind the camera
  add(8, 8, 0x9aa0a8, 0.35, [0, 3, -16], [0, 3, 0]); // faint back panel
  // Two narrow front-side strips: the case flank mirrors these as the environment turns (the moving highlight).
  add(1.6, 14, 0xffffff, 3.0, [12 * Math.sin(-0.5), 1, 12 * Math.cos(-0.5)], [0, 1, 0]);
  add(1.6, 14, 0xffffff, 3.0, [12 * Math.sin(1.9), 1, 12 * Math.cos(1.9)], [0, 1, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0.03);
  pmrem.dispose();
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  return rt;
}

async function loadGLB(url, renderer, floorY, targetHeight) {
  const [{GLTFLoader}, {DRACOLoader}, {KTX2Loader}, {MeshoptDecoder}] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/loaders/DRACOLoader.js'),
    import('three/addons/loaders/KTX2Loader.js'),
    import('three/addons/libs/meshopt_decoder.module.js'),
  ]);
  const draco = new DRACOLoader().setDecoderPath('./node_modules/three/examples/jsm/libs/draco/gltf/');
  const ktx2 = new KTX2Loader().setTranscoderPath('./node_modules/three/examples/jsm/libs/basis/').detectSupport(renderer);
  const loader = new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  draco.dispose();
  ktx2.dispose();
  const model = gltf.scene;
  // Normalise: same height as the procedural watch, centred on x and z, standing on the floor.
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const k = targetHeight / Math.max(1e-6, size.y);
  model.scale.setScalar(k);
  box.setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(c.x, box.min.y - floorY, c.z));
  box.setFromObject(model);
  return {model, box};
}

export async function createStage(canvas, {colors, fonts, content, capture, dpr}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: capture});
  renderer.setPixelRatio(dpr); // chosen once by device tier, never changed while scrolling
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(colors.ground, 1);

  const scene = new THREE.Scene();
  const envRT = studioEnvironment(renderer);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 1.0;

  const key = new THREE.DirectionalLight(0xfff3ea, 1.9);
  key.position.set(-4, 6, 5);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 80);
  const turntable = new THREE.Group();
  const lift = new THREE.Group();
  const pivot = new THREE.Group();
  scene.add(turntable);
  turntable.add(lift);
  lift.add(pivot);

  // Product: procedural by default; a .glb from content.json if given (falls back to procedural on failure).
  const maxHours = content.callouts.find((c) => c.proof === 'ring')?.number || 18;
  let product = buildWatch({colors, fonts, maxHours});
  if (content.model) {
    try {
      const {model, box} = await loadGLB(content.model, renderer, product.floorY, product.floorY * -2);
      const size = box.getSize(new THREE.Vector3());
      model.updateMatrixWorld(true);
      // anchors are bounding-box fractions (0..1 on x, y, z), stored in the model's own space
      const at = (f) => model.worldToLocal(new THREE.Vector3(box.min.x + f[0] * size.x, box.min.y + f[1] * size.y, box.min.z + f[2] * size.z));
      const anchors = {center: at([0.5, 0.5, 0.5])};
      for (const c of content.callouts) anchors[c.id] = at(c.anchor || [0.5, 0.5, 0.5]);
      product.dispose();
      product = {group: model, anchors, face: null, floorY: product.floorY, procedural: false,
        footprint: {x: size.x, z: size.z * 0.6, z0: box.getCenter(new THREE.Vector3()).z}, dispose: () => {}};
    } catch (e) {
      console.warn(`content.json model "${content.model}" did not load (${e.message}); using the procedural watch.`);
    }
  }
  const PIVOT_Z = product.procedural ? 0.3 : -product.footprint.z0; // turn about the middle of the footprint
  pivot.position.z = PIVOT_Z;
  pivot.add(product.group);

  // Contact shadow: a tight core where the band meets the floor plus a wide soft pool (baked, one draw call).
  const shadowTex = radialTexture([[0, 'rgba(0,0,0,0.92)'], [0.22, 'rgba(0,0,0,0.6)'], [0.55, 'rgba(0,0,0,0.18)'], [1, 'rgba(0,0,0,0)']]);
  const shadowMat = new THREE.MeshBasicMaterial({map: shadowTex, transparent: true, depthWrite: false, toneMapped: false});
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, product.floorY + 0.002, product.footprint.z0 + PIVOT_Z);
  const baseShadow = {x: product.footprint.x * 1.7, z: product.footprint.z * 1.5};
  shadow.scale.set(baseShadow.x, baseShadow.z, 1);
  shadow.renderOrder = 1;
  turntable.add(shadow);

  // Floor pool: catches the key light's falloff and fades into the page ground.
  const floorAlpha = radialTexture([[0, '#ffffff'], [0.22, '#d0d0d0'], [0.5, '#555555'], [1, '#000000']]);
  floorAlpha.colorSpace = THREE.NoColorSpace;
  const floorMat = new THREE.MeshStandardMaterial({color: colors.floor || '#17171a', roughness: 0.5, metalness: 0, alphaMap: floorAlpha, transparent: true, depthWrite: false, envMapIntensity: 0.25});
  const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = product.floorY;
  scene.add(floor);

  // Backdrop glow: a faint cyc behind the product so the dark band still reads against the ground.
  const cycTex = radialTexture([[0, colors.glow || '#2a2a30'], [0.45, colors.ground], [1, colors.ground]]);
  const cycMat = new THREE.MeshBasicMaterial({map: cycTex, depthWrite: false, toneMapped: false});
  const cyc = new THREE.Mesh(new THREE.PlaneGeometry(34, 22), cycMat);
  cyc.position.set(0, 1.2, -10);
  cyc.renderOrder = -1;
  scene.add(cyc);

  const setSize = (w, h) => {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
  };
  const render = () => renderer.render(scene, camera);
  const compile = () => (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve());

  const dispose = () => {
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) {
        for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
        m.dispose();
      }
    });
    product.dispose();
    envRT.dispose();
    renderer.dispose();
  };

  return {renderer, scene, camera, turntable, lift, pivot, shadow, baseShadow, product, setSize, render, compile, dispose};
}
