// Seeded gradient noise in 2D and 3D, plus fractal sums. Small, dependency-free, written for this template.
// Same seed, same image: every drawing on the site is reproducible.
export function makeNoise(seed = 1) {
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1;
  const rand = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  for (let i = 255; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    const t = base[i];
    base[i] = base[j];
    base[j] = t;
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const mix = (a, b, t) => a + t * (b - a);

  const g2 = (h, x, y) => {
    switch (h & 7) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      case 3: return -x - y;
      case 4: return x;
      case 5: return -x;
      case 6: return y;
      default: return -y;
    }
  };
  function n2(x, y) {
    const X = Math.floor(x);
    const Y = Math.floor(y);
    x -= X;
    y -= Y;
    const xi = X & 255;
    const yi = Y & 255;
    const u = fade(x);
    const v = fade(y);
    const a = p[xi] + yi;
    const b = p[xi + 1] + yi;
    const top = mix(g2(p[a], x, y), g2(p[b], x - 1, y), u);
    const bot = mix(g2(p[a + 1], x, y - 1), g2(p[b + 1], x - 1, y - 1), u);
    return mix(top, bot, v) * 0.75;
  }

  const g3 = (h, x, y, z) => {
    const k = h & 15;
    const u = k < 8 ? x : y;
    const v = k < 4 ? y : k === 12 || k === 14 ? x : z;
    return ((k & 1) ? -u : u) + ((k & 2) ? -v : v);
  };
  function n3(x, y, z) {
    const X = Math.floor(x);
    const Y = Math.floor(y);
    const Z = Math.floor(z);
    x -= X;
    y -= Y;
    z -= Z;
    const xi = X & 255;
    const yi = Y & 255;
    const zi = Z & 255;
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = p[xi] + yi;
    const AA = p[A] + zi;
    const AB = p[A + 1] + zi;
    const B = p[xi + 1] + yi;
    const BA = p[B] + zi;
    const BB = p[B + 1] + zi;
    return mix(
      mix(mix(g3(p[AA], x, y, z), g3(p[BA], x - 1, y, z), u), mix(g3(p[AB], x, y - 1, z), g3(p[BB], x - 1, y - 1, z), u), v),
      mix(mix(g3(p[AA + 1], x, y, z - 1), g3(p[BA + 1], x - 1, y, z - 1), u), mix(g3(p[AB + 1], x, y - 1, z - 1), g3(p[BB + 1], x - 1, y - 1, z - 1), u), v),
      w,
    );
  }

  function fbm2(x, y, oct = 4) {
    let a = 0.5;
    let f = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += a * n2(x * f, y * f);
      norm += a;
      a *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  }
  function fbm3(x, y, z, oct = 4) {
    let a = 0.5;
    let f = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += a * n3(x * f, y * f, z * f);
      norm += a;
      a *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  }
  return {n2, n3, fbm2, fbm3, rand};
}
