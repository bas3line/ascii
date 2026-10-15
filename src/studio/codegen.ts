/*
 * studio codegen: synthesizes standalone, zero-dependency TypeScript pieces from a SceneSpec.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "./types.ts";

function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^./, (chr) => chr.toLowerCase());
}

const j = (v: unknown): string => JSON.stringify(v, null, 2);

/**
 * The layer runtimes inlined into every generated file, mirroring the
 * implementations in src/studio/layers/*.ts. Every renderer writes into the
 * packed RGBA-depth buffers B and honours depth occlusion.
 */
function layerRuntimes(spec: SceneSpec): string {
  const types = new Set(spec.layers.map((l) => l.type));
  const out: string[] = [];

  if (types.has("sky")) {
    out.push(`
const skyRender = (p: any, t: number, B: Float32Array[]): void => {
  const horizon = p.horizon ?? 56;
  const sunPos = p.sunPos ?? [134, 51.5];
  const sunRadius = p.sunRadius ?? 8.5;
  const glare = p.glare ?? 1.0;
  const haze = p.haze ?? 0.3;
  const stars = p.stars ?? false;
  const cTop = hexToRgb(p.gradientTop ?? "#14194c");
  const cHoriz = hexToRgb(p.gradientHorizon ?? "#ea6a78");
  const cSun = hexToRgb(p.sunColor ?? "#fff5d8");
  for (let r = 0; r < Math.min(H, horizon); r++) {
    const v = r / Math.max(1, horizon);
    for (let x = 0; x < W; x++) {
      const idx = r * W + x;
      if (B[3][idx] <= 10.0) continue;
      let red = cTop[0] + (cHoriz[0] - cTop[0]) * v;
      let green = cTop[1] + (cHoriz[1] - cTop[1]) * v;
      let blue = cTop[2] + (cHoriz[2] - cTop[2]) * v;
      const dx = x + 0.5 - sunPos[0];
      const dy = (r + 0.5 - sunPos[1]) * 1.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (sunRadius > 0 && dist < sunRadius) {
        const edge = smoothstep(sunRadius, sunRadius - 1.2, dist);
        red = red * (1 - edge) + cSun[0] * edge;
        green = green * (1 - edge) + cSun[1] * edge;
        blue = blue * (1 - edge) + cSun[2] * edge;
      } else if (glare > 0) {
        const glow = (Math.exp(-dist / 38) * 0.25 + Math.exp(-dist / 12) * 0.35) * glare;
        red += cSun[0] * glow; green += cSun[1] * glow * 0.8; blue += cSun[2] * glow * 0.4;
      }
      if (haze > 0) {
        const turb = 0.85 + 0.3 * noise(x * 0.04, r * 0.15 + t * 0.05);
        red *= turb; green *= turb; blue *= turb;
      }
      if (stars && v < 0.75) {
        const seed = hash(x * 17, r * 31);
        if (seed > 0.985) {
          const tw = 0.5 + 0.5 * Math.sin(t * 3.0 + seed * 100);
          red += tw * 0.8; green += tw * 0.8; blue += tw * 0.9;
        }
      }
      B[0][idx] = clamp(red); B[1][idx] = clamp(green); B[2][idx] = clamp(blue);
      B[3][idx] = 100.0;
    }
  }
};`);
  }

  if (types.has("clouds")) {
    out.push(`
const CU = 480, CV = 96;
const cloudField = (coverage: number, density: number): [Float32Array, Float32Array] => {
  const deck = new Float32Array(CU * CV);
  const lit = new Float32Array(CU * CV);
  for (let v = 0; v < CV; v++) {
    for (let u = 0; u < CU; u++) {
      const q = fbm(u * 0.0125 / density, v * 0.06, 2);
      const base = fbm(u * 0.04 + q * 1.5, v * 0.3, 5);
      const patch = fbm(u * 0.00625, v * 0.03 + 7, 2);
      const k = v * CU + u;
      deck[k] = base + 0.25 * (patch - 0.5) + (coverage - 0.5);
      lit[k] = clamp(0.5 + (base - fbm(u * 0.04 + q * 1.5, (v + 2) * 0.3, 5)) * 4.5);
    }
  }
  return [deck, lit];
};

const cloudsRender = (p: any, field: [Float32Array, Float32Array], t: number, B: Float32Array[]): void => {
  const horizon = p.horizon ?? 56;
  const drift = p.drift ?? 1.0;
  const altitude = p.altitude ?? 1.0;
  const softness = p.softness ?? 0.6;
  const glowAmt = p.lit ?? 0.45;
  const cBase = hexToRgb(p.baseColor ?? "#1e1640");
  const cLit = hexToRgb(p.litColor ?? "#ffcd62");
  const tt = t * drift;
  const div = 58 / altitude;
  const [deck, lit] = field;
  for (let r = 0; r < horizon; r++) {
    const y = r + 0.5;
    const D = div / (horizon - y + 2.5);
    const far = smoothstep(4.6, 2.8, D) * smoothstep(1.02, 1.7, D);
    if (far <= 0) continue;
    for (let x = 0; x < W; x++) {
      const idx = r * W + x;
      if (B[3][idx] <= 10.0) continue;
      const dx = x + 0.5 - W / 2;
      const su = dx * D + tt * 72;
      const sv = (D - 0.9) * 10;
      let iu = Math.floor(su);
      const fu = su - iu;
      const iv = Math.floor(sv);
      const fv = sv - iv;
      iu %= CU; if (iu < 0) iu += CU;
      const iu1 = (iu + 1) % CU;
      const a0 = iv * CU, a1 = a0 + CU;
      const dd = deck[a0 + iu] + (deck[a0 + iu1] - deck[a0 + iu]) * fu;
      const c = smoothstep(0.5 - softness * 0.12, 0.5 + softness * 0.12, dd) * Math.sqrt(far);
      if (c <= 0.01) continue;
      const l = lit[a0 + iu] + (lit[a0 + iu1] - lit[a0 + iu]) * fu;
      const glow = clamp(Math.pow(smoothstep(0.45, 0.85, l), 1.5) * (0.35 + 0.55 * glowAmt));
      const cr = cBase[0] + (cLit[0] - cBase[0]) * glow;
      const cg = cBase[1] + (cLit[1] - cBase[1]) * glow;
      const cb = cBase[2] + (cLit[2] - cBase[2]) * glow;
      B[0][idx] = clamp(B[0][idx] + (cr - B[0][idx]) * c);
      B[1][idx] = clamp(B[1][idx] + (cg - B[1][idx]) * c);
      B[2][idx] = clamp(B[2][idx] + (cb - B[2][idx]) * c);
    }
  }
};`);
  }

  if (types.has("heightfield")) {
    out.push(`
const elevAt = (x: number, horizon: number, peakHeight: number, freq: number, style: string): number => {
  const n = fbm(x * freq, 12.34, 4);
  switch (style) {
    case "hills": return horizon - (peakHeight * Math.pow(n, 1.1) + 0.3 * Math.sin(x * 0.04 + 1.7));
    case "dunes": {
      const broad = Math.sin(x * 0.021 + 2.3) * 0.5 + 0.5;
      const ripple = noise(x * 0.08, 3.1) * 0.25;
      return horizon - (peakHeight * 0.6 * broad + ripple * 4.0);
    }
    case "city": {
      const cell = Math.floor(x / 4.0);
      const seed = hash(cell, 7) * 1.3;
      const h = (0.25 + 0.65 * seed) * peakHeight;
      return Math.floor(horizon - h * (1 + noise(x * 0.6, cell) * 0.375));
    }
    case "pines": return horizon - (peakHeight * 0.55 * Math.pow(n, 1.15) + 0.25 * noise(x * 0.5, 0.9) * peakHeight * 0.5);
    case "peaks":
    default: return horizon - peakHeight * Math.pow(n, 1.2);
  }
};

const heightfieldRender = (p: any, B: Float32Array[]): void => {
  const horizon = p.horizon ?? 56;
  const peakHeight = p.peakHeight ?? 24;
  const freq = p.frequency ?? 0.03;
  const roughness = p.roughness ?? 0.5;
  const style = p.style ?? "peaks";
  const cBase = hexToRgb(p.color ?? "#1c1432");
  const cHigh = hexToRgb(p.highlight ?? "#b23c7c");
  for (let x = 0; x < W; x++) {
    const ridgeY = elevAt(x, horizon, peakHeight, freq, style);
    const slope = (elevAt(x + 1, horizon, peakHeight, freq, style) - ridgeY) * 0.5;
    const lightCatch = smoothstep(-1.5, 2.0, slope);
    const startRow = Math.max(0, Math.floor(ridgeY));
    for (let r = startRow; r < Math.min(H, horizon + 2); r++) {
      const idx = r * W + x;
      if (B[3][idx] <= 40.0) continue;
      const strata = fbm(x * 0.18, r * 0.45, 2) * roughness;
      const shade = clamp(0.7 + 0.6 * lightCatch + strata * 0.3);
      const blend = clamp(lightCatch * 0.6 + strata * 0.3);
      B[0][idx] = clamp((cBase[0] * (1 - blend) + cHigh[0] * blend) * shade);
      B[1][idx] = clamp((cBase[1] * (1 - blend) + cHigh[1] * blend) * shade);
      B[2][idx] = clamp((cBase[2] * (1 - blend) + cHigh[2] * blend) * shade);
      B[3][idx] = 40.0;
    }
  }
};`);
  }

  if (types.has("water")) {
    out.push(`
const HARM = [[-0.45, 0.89, 22, 0.07, 2.1, 0.4], [0.5, 0.87, 37, 0.06, 2.9, 2.1], [-0.15, 0.99, 61, 0.05, 3.7, 4.4], [0.3, 0.95, 97, 0.04, 4.6, 1.3]];

const waterRender = (p: any, t: number, B: Float32Array[]): void => {
  const horizon = p.horizon ?? 56;
  const waveSpeed = p.waveSpeed ?? 1.0;
  const waveChop = p.waveChop ?? 0.08;
  const sunColumn = p.sunColumn ?? 134;
  const glitter = p.glitter ?? 1.5;
  const cDeep = hexToRgb(p.deepColor ?? "#0e1230");
  const cReflect = hexToRgb(p.reflectColor ?? "#ea6a78");
  const cCrest = hexToRgb(p.crestColor ?? "#ffcd62");
  const tt = t * waveSpeed;
  for (let r = horizon; r < H; r++) {
    const z = Math.max(0.01, (H - horizon) / (r - horizon + 1));
    const depth = clamp(z / 10.0, 0.1, 1.0);
    for (let x = 0; x < W; x++) {
      const idx = r * W + x;
      if (B[3][idx] < 20.0) continue;
      const u = ((x - W / 2) * z) / 80.0;
      const vv = z * 2.5;
      let crest = 0, slopeX = 0;
      for (let i = 0; i < HARM.length; i++) {
        const h = HARM[i];
        const phase = (h[0] * u + h[1] * vv) * h[2] + h[4] * tt + h[5];
        crest += Math.sin(phase) * h[3] * (waveChop / 0.08);
        slopeX += Math.cos(phase) * h[0] * h[2] * h[3];
      }
      const dx = Math.abs(x - sunColumn);
      const glint = Math.pow(clamp(crest * 3.0 + slopeX * 0.5 + 0.4), 3.0) * (Math.exp(-dx / 18.0) * glitter);
      const fresnel = smoothstep(0, H - horizon, r - horizon);
      const refAmount = clamp(0.25 + 0.4 * (1 - fresnel) + crest * 0.2);
      let red = cDeep[0] * (1 - refAmount) + cReflect[0] * refAmount;
      let green = cDeep[1] * (1 - refAmount) + cReflect[1] * refAmount;
      let blue = cDeep[2] * (1 - refAmount) + cReflect[2] * refAmount;
      if (glint > 0) {
        red = red * (1 - glint) + cCrest[0] * glint;
        green = green * (1 - glint) + cCrest[1] * glint;
        blue = blue * (1 - glint) + cCrest[2] * glint;
      }
      B[0][idx] = clamp(red); B[1][idx] = clamp(green); B[2][idx] = clamp(blue);
      B[3][idx] = 20.0 + depth * 10.0;
    }
  }
};`);
  }

  if (types.has("particles")) {
    out.push(`
const particlesRender = (p: any, t: number, B: Float32Array[]): void => {
  const style = p.type ?? "snow";
  const speed = p.fallSpeed ?? 1.0;
  const wind = p.wind ?? 0.3;
  const count = p.density ?? 120;
  const cPart = hexToRgb(p.color ?? "#f1f5fb");
  const tt = t * speed;
  for (let i = 0; i < count; i++) {
    const seed = hash(i * 7 + 3, i * 13 + 11);
    const depth = i % 3;
    const depthScale = depth === 0 ? 1.0 : depth === 1 ? 0.65 : 0.4;
    const zBuf = depth === 0 ? 5.0 : depth === 1 ? 25.0 : 60.0;
    const px0 = seed * W;
    const py0 = hash(i * 31 + 5, i) * H;
    const phase = seed * Math.PI * 2;
    let px = 0, py = 0;
    if (style === "snow") {
      py = (py0 + tt * 14.0 * depthScale) % H;
      px = (px0 + tt * wind * 10.0 * depthScale + Math.sin(tt * 2.0 + phase) * 3.0) % W;
    } else if (style === "rain") {
      py = (py0 + tt * 45.0 * depthScale) % H;
      px = (px0 + tt * wind * 20.0 * depthScale) % W;
    } else if (style === "embers") {
      py = (H - ((py0 + tt * 12.0 * depthScale) % H)) % H;
      px = (px0 + tt * wind * 8.0 * depthScale + Math.cos(tt * 1.5 + phase) * 4.0) % W;
    } else {
      px = (px0 + Math.sin(tt * 0.8 + phase) * 12.0) % W;
      py = (py0 + Math.cos(tt * 0.6 + phase * 1.3) * 8.0) % H;
    }
    const col = Math.floor(((px % W) + W) % W);
    const row = Math.floor(((py % H) + H) % H);
    const idx = row * W + col;
    if (B[3][idx] > zBuf) {
      const brightness = depthScale * (style === "fireflies" ? 0.5 + 0.5 * Math.sin(tt * 4.0 + phase) : 1.0);
      B[0][idx] = clamp(B[0][idx] * (1 - brightness) + cPart[0] * brightness);
      B[1][idx] = clamp(B[1][idx] * (1 - brightness) + cPart[1] * brightness);
      B[2][idx] = clamp(B[2][idx] * (1 - brightness) + cPart[2] * brightness);
      B[3][idx] = zBuf;
    }
  }
};`);
  }

  return out.join("\n");
}

/** Info needed to emit layer calls + per-cloud fields in the frame body. */
function layerCalls(spec: SceneSpec): { calls: string; cloudFields: string } {
  const calls: string[] = [];
  const cloudFields: string[] = [];

  for (const layer of spec.layers) {
    if (!layer.enabled) continue;
    const p = JSON.stringify(layer.params, null, 0);
    switch (layer.type) {
      case "sky":
        calls.push(`    skyRender(${p}, t, B);`);
        break;
      case "heightfield":
        calls.push(`    heightfieldRender(${p}, B);`);
        break;
      case "water":
        calls.push(`    waterRender(${p}, t, B);`);
        break;
      case "particles":
        calls.push(`    particlesRender(${p}, t, B);`);
        break;
      case "clouds": {
        const id = layer.id.replace(/[^a-zA-Z0-9]/g, "_");
        cloudFields.push(`  const cloud_${id} = cloudField(${j(layer.params.coverage ?? 0.5)}, ${j(layer.params.density ?? 1.0)});`);
        calls.push(`    cloudsRender(${p}, cloud_${id}, t, B);`);
        break;
      }
      default:
        break;
    }
  }

  return { calls: calls.join("\n"), cloudFields: cloudFields.join("\n") };
}

/** Compiles any SceneSpec into a self-contained, standalone TypeScript piece. */
export function compileSceneToCode(spec: SceneSpec, relativeTypesPath = "../types.ts"): string {
  const funcName = toCamelCase(spec.name || "customScene");
  const paletteJson = j(spec.palette);
  const rampStr = spec.halftone?.ramp ?? " ·•●";
  const contrastVal = spec.halftone?.contrast ?? 1.0;
  const runtimes = layerRuntimes(spec);
  const { calls, cloudFields } = layerCalls(spec);

  return `/*
 * ${spec.name}: ${spec.note ?? "procedural scene generated by ascii.rest studio"}
 *
 * Generated by ascii.rest Scene Studio.
 * Conforms to the standard ascii.rest 200x100 15fps scene contract.
 */
import type { Frame, Meta } from "${relativeTypesPath}";

export const meta = {
  name: ${j(spec.name)},
  category: "scenes",
  note: ${j(spec.note ?? spec.name)},
  cols: 200,
  rows: 100,
  cell: 1,
  fps: ${spec.fps ?? 15},
  ground: ${j(spec.ground)},
  palette: ${paletteJson},
} satisfies Meta;

const W = 200, H = 100, TOTAL = W * H;
const DOTS = ${j(rampStr)};
const CONTRAST = ${contrastVal};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

function clamp(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function hexToRgb(s: string): [number, number, number] {
  const c = s.startsWith("#") ? s.slice(1) : s;
  return [
    parseInt(c.slice(0, 2), 16) / 255,
    parseInt(c.slice(2, 4), 16) / 255,
    parseInt(c.slice(4, 6), 16) / 255,
  ];
}

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number, period = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  let x0 = xi, x1 = xi + 1;
  if (period) {
    x0 = ((xi % period) + period) % period;
    x1 = (x0 + 1) % period;
  }
  const a = hash(x0, yi), b = hash(x1, yi);
  const c = hash(x0, yi + 1), d = hash(x1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, oct = 3, period = 0): number {
  let s = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < oct; i++) {
    s += amp * noise(x * freq, y * freq, period * freq);
    amp *= 0.5;
    freq *= 2;
  }
  const norm = 1 - Math.pow(0.5, oct);
  return s / Math.max(1e-6, norm);
}

${runtimes}

export default function ${funcName}(): Frame {
  const P = meta.palette.map(hexToRgb);
  const groundRgb = hexToRgb(meta.ground);
  const lut = new Uint8Array(32768).fill(255);

  const nearest = (r: number, g: number, b: number): number => {
    const ir = Math.min(31, Math.max(0, (r * 31.99) | 0));
    const ig = Math.min(31, Math.max(0, (g * 31.99) | 0));
    const ib = Math.min(31, Math.max(0, (b * 31.99) | 0));
    const k = (ir << 10) | (ig << 5) | ib;
    if (lut[k] !== 255) return lut[k];

    let best = 0, bestDist = 1e9;
    for (let i = 0; i < P.length; i++) {
      const dr = P[i][0] - r, dg = P[i][1] - g, db = P[i][2] - b;
      const dist = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return (lut[k] = best);
  };

  const B = [new Float32Array(TOTAL), new Float32Array(TOTAL), new Float32Array(TOTAL), new Float32Array(TOTAL)];
${cloudFields}

  return (t: number, env?: { color?: Uint8Array }): string => {
    // Reset buffers to ground, far depth
    for (let i = 0; i < TOTAL; i++) {
      B[0][i] = groundRgb[0];
      B[1][i] = groundRgb[1];
      B[2][i] = groundRgb[2];
      B[3][i] = 1000.0;
    }

    // Layers, back to front
${calls}

    // Halftone dithering + palette resolution
    const color = env?.color;
    const out: string[] = new Array(TOTAL);
    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const idx = r * W + x;
        const cr = B[0][idx], cg = B[1][idx], cb = B[2][idx];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(Math.pow(peak, 0.85 / CONTRAST));
        const dither = BAYER[(r & 3) * 4 + (x & 3)];
        const step = Math.max(0, Math.min(DOTS.length - 1, Math.round(level * (DOTS.length - 1) + dither)));
        out[idx] = DOTS[step] || " ";

        if (color) {
          const coverage = (step / (DOTS.length - 1)) || 0.1;
          const want = step ? Math.min(1, (level + 0.06) / coverage) : 0;
          const boost = ((0.3 + 0.7 * want) * (0.4 + 0.6 * smoothstep(0.14, 0.5, level))) / peak;
          color[idx] = nearest(clamp(cr * boost), clamp(cg * boost), clamp(cb * boost));
        }
      }
    }

    return out.join("");
  };
}
`;
}