/*
 * shapes3d: 3D in a few lines. A torus, a sphere, a cube, a cylinder, a cone,
 * a plane, a cloud of points, or a mesh or a surface of your own, each placed,
 * turned and spun over time, seen by a camera and lit by one light. render3d()
 * draws them into a grid, the nearest surface winning each cell, shaded through
 * a ramp and coloured by its shape, its light or its depth; scene() makes a
 * piece of them that plays wherever a piece does. Patterns and point clouds
 * come ready made by name, so a planet with continents or a turning galaxy
 * takes no maths. The spinning donut is one line.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { orbit, points, scene, sphere, torus } from "ascii.rest/kit";
 *
 *   export const donut = scene({ name: "donut", cols: 40, rows: 22 }, [torus({ spin: [0.8, 0, 0.35] })]);
 *
 *   export const planet = scene({ name: "planet", period: 6 }, [
 *     sphere({ color: "#3b82f6", texture: "spots", spin: [0, 1, 0] }),
 *     sphere({ radius: 0.3, color: "#d1d5db", at: orbit({ radius: 2.4, period: 6 }) }),
 *   ]);
 *
 *   export const galaxy = scene({ name: "galaxy", camera: { tilt: 1 } }, [points("galaxy", { spin: [0, 0.5, 0] })]);
 */
import type { Options } from "../types.ts";
import {
  INK,
  NONE,
  Surface,
  TAU,
  and,
  code,
  fail,
  fract,
  hash,
  isHex,
  mix,
  mulberry32,
  piece,
  ramp as rampOf,
  rgb,
  smoothstep,
  specOf,
  spread,
  type Color,
  type KitPiece,
  type MakerSpec,
  type PaletteSpec,
  type RampName,
  type Themed,
} from "./core.ts";

// --- checking what a user passes ----------------------------------------------------

// A value as an error message shows it.
function shown(v: unknown): string {
  if (typeof v === "function") return "a function";
  if (typeof v === "number" || v === undefined || typeof v === "symbol" || typeof v === "bigint") return String(v);
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

// A number above 0, its default when not given (none: it must be given).
function positive(v: unknown, what: string, def?: number): number {
  if (v === undefined && def !== undefined) return def;
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) fail(`${what} takes a number above 0, not ${shown(v)}`);
  return v;
}

// Any finite number, its default when not given.
function finite(v: unknown, what: string, def: number): number {
  if (v === undefined) return def;
  if (typeof v !== "number" || !Number.isFinite(v)) fail(`${what} takes a number, not ${shown(v)}`);
  return v;
}

// A whole number from lo to hi, its default when not given.
function wholeIn(v: unknown, what: string, def: number, lo: number, hi: number): number {
  if (v === undefined) return def;
  if (!Number.isInteger(v) || (v as number) < lo || (v as number) > hi) fail(`${what} takes a whole number from ${lo} to ${hi}, not ${shown(v)}`);
  return v as number;
}

// [x, y, z] of finite numbers, copied, its default when not given (none: it must be given).
function vec3(v: unknown, what: string, def?: Vec3): Vec3 {
  if (v === undefined && def) return [def[0], def[1], def[2]];
  if (!Array.isArray(v) || v.length !== 3 || !v.every((n) => typeof n === "number" && Number.isFinite(n)))
    fail(`${what} takes [x, y, z], three numbers, not ${shown(v)}`);
  return [v[0], v[1], v[2]];
}

// --- points in space, and textures ----------------------------------------------------

/** A point or a direction in 3D, in units: x to the right, y up and z away from the camera. */
export type Vec3 = [number, number, number];

/** A value, or a function of the time t in seconds that gives it, for one that changes. */
export type Animated<T> = T | ((t: number) => T);

/**
 * A pattern on a shape's surface: its brightness, 0 to 1, at u and v, each 0 to 1 across the surface. It multiplies the
 * light, so 1 is the surface as lit and 0 is dark. textures has ready-made ones.
 */
export type Texture = (u: number, v: number) => number;

/** The ready-made patterns a shape's `texture` can name, each with its default count: see textures. */
export type TextureName = "bands" | "stripes" | "checker" | "grid" | "spots";

// Smooth value noise that wraps round x every `n` cells, so a pattern meets itself at the back of a sphere.
function wrapped(x: number, y: number, n: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const a = ((xi % n) + n) % n, b = (a + 1) % n;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const p = hash(a, yi, seed), q = hash(b, yi, seed), r = hash(a, yi + 1, seed), s = hash(b, yi + 1, seed);
  return p + (q - p) * u + (r - p) * v + (p - q - r + s) * u * v;
}

/**
 * Ready-made patterns for a shape's `texture`, so a planet gets cloud bands or continents without a line of maths. Each
 * takes how many times it repeats round the shape and returns a texture; naming one in `texture` is the same pattern
 * with its default count. Lit parts stay lit and shaded parts take about half the light, so the shape still reads.
 *
 *   sphere({ texture: "spots" })                  // continents
 *   sphere({ texture: textures.bands(10) })       // ten cloud bands from pole to pole
 *   plane({ texture: textures.checker(8, 8) })    // a chessboard floor
 */
export const textures = {
  /**
   * Soft bands of light and shade along v, `count` of them (6), rippling a little round u, and one oval storm, ringed
   * in shade, just south of the middle at u 0.25: a gas giant's clouds on a sphere, its storm showing its turn.
   */
  bands(count = 6): Texture {
    const n = wholeIn(count, "textures.bands", 6, 1, 64);
    return (u, v) => {
      // how far from the storm, 1 at its edge: u wraps round, so it is measured the short way
      const du = (fract(u - 0.25 + 0.5) - 0.5) / 0.08, dv = (v - 0.5 + 0.5 / n) / 0.05, d = du * du + dv * dv;
      if (d < 1) return d > 0.45 ? 0.35 : 1;
      return 0.65 + 0.35 * Math.cos(TAU * n * v + 0.3 * Math.sin(TAU * 3 * u));
    };
  },
  /** Stripes round u, `count` of them (8), every other one in shade: a beach ball's panels on a sphere. */
  stripes(count = 8): Texture {
    const n = wholeIn(count, "textures.stripes", 8, 1, 64);
    return (u) => (Math.floor(u * n) & 1 ? 0.45 : 1);
  },
  /** Squares, `across` round u (8) and `along` along v (half as many, so they are about square on a sphere), every other one in shade. */
  checker(across = 8, along?: number): Texture {
    const n = wholeIn(across, "textures.checker", 8, 1, 64), m = wholeIn(along, "textures.checker's along", Math.max(1, Math.round(n / 2)), 1, 64);
    return (u, v) => ((Math.floor(u * n) + Math.floor(v * m)) & 1 ? 0.45 : 1);
  },
  /** Thin lines in shade, `across` round u (12) and `along` along v (half as many): a globe's meridians and parallels. */
  grid(across = 12, along?: number): Texture {
    const n = wholeIn(across, "textures.grid", 12, 1, 64), m = wholeIn(along, "textures.grid's along", Math.max(1, Math.round(n / 2)), 1, 64);
    return (u, v) => {
      const a = fract(u * n), b = fract(v * m);
      return Math.min(a, 1 - a) < 0.1 || Math.min(b, 1 - b) < 0.1 ? 0.3 : 1;
    };
  },
  /** Seeded patches of light on a shaded ground, about `count` across u (5): continents on a planet, maria on a moon. `seed` (1) picks the coastlines. */
  spots(count = 5, seed = 1): Texture {
    const n = wholeIn(count, "textures.spots", 5, 1, 64), m = Math.max(1, Math.round(n / 2));
    const s = wholeIn(seed, "textures.spots' seed", 1, -(2 ** 31), 2 ** 31 - 1);
    // three octaves, each twice as fine and half as strong, all wrapping round u
    const h = (u: number, v: number) => (4 * wrapped(u * n, v * m, n, s) + 2 * wrapped(u * n * 2, v * m * 2, n * 2, s + 101) + wrapped(u * n * 4, v * m * 4, n * 4, s + 202)) / 7;
    // the coast at the height two fifths of the surface is above, whatever the seed
    const heights: number[] = [];
    for (let j = 0; j < 32; j++) for (let i = 0; i < 64; i++) heights.push(h((i + 0.5) / 64, (j + 0.5) / 32));
    heights.sort((a, b) => a - b);
    const coast = heights[Math.floor(heights.length * 0.6)];
    return (u, v) => 0.45 + 0.55 * smoothstep(coast - 0.015, coast + 0.015, h(u, v));
  },
} satisfies Record<TextureName, (...a: never[]) => Texture>;

const TEXTURES = Object.keys(textures) as TextureName[];

// --- shapes -------------------------------------------------------------------------

/** What every shape takes. */
export interface ShapeOptions {
  /** Where its centre is, or a function of t that moves it (orbit() makes one): [0, 0, 0], the middle of the scene. */
  at?: Animated<Vec3>;
  /**
   * Its angles about x, then y, then z, in radians, or a function of t that gives them: [0, 0, 0]. With spin, these
   * are its angles at t = 0, and the spin turns it from there. The turn about z comes last, so [0, 0, 0.3] with a spin
   * about y tips the axis it spins on, as a planet's is.
   */
  rotate?: Animated<Vec3>;
  /**
   * How fast it turns about x, y and z, in radians a second: [0, 0, 0], still. [0, 1, 0] turns it like a record on a
   * turntable, once in 6.3 seconds; a scene's `period` rounds it to whole turns so the scene loops.
   */
  spin?: Vec3;
  /** Its size, times: 1. */
  scale?: number;
  /**
   * Its colour as #rrggbb. A shape with a colour makes the scene coloured, the shape drawn in shades of it by its light,
   * darkened a little on a light page or lightened on a dark one if it would be hard to see there. None by default: it
   * is drawn in the page's ink.
   */
  color?: string;
  /**
   * A pattern on its surface: "bands", "stripes", "checker", "grid" or "spots" (see textures), or a function (u, v) =>
   * brightness 0 to 1 of your own, which multiplies its light. None by default. u goes round and v along: a sphere's
   * longitude and latitude (south to north), a torus's ring and its tube, a cylinder's or a cone's way round and its
   * height; on a cube's faces and a plane they run across. Not for points() or mesh().
   */
  texture?: Texture | TextureName;
}

/** A shape for a scene, made by torus(), sphere() and the rest. What it holds is the kit's own. */
export interface Shape3d {
  readonly kind: string;
}

// Triangles with a normal and a u, v at each corner.
interface Mesh {
  pos: Float32Array;
  nrm: Float32Array;
  uv: Float32Array;
  tri: Uint32Array;
  // Closed with its normals outward, so a triangle turned away is behind another and can be skipped. An open one is
  // lit on whichever side faces the camera.
  closed: boolean;
}

// What a shape holds: everything the renderer needs, checked when the shape was made.
interface Body {
  kind: string;
  at: Animated<Vec3>;
  rotate: Animated<Vec3>;
  spin: Vec3;
  scale: number;
  color: string | undefined;
  texture: Texture | undefined;
  // How far it reaches from its centre at t, before its scale.
  reach: (t: number) => number;
  // Its triangles for a size on screen, `unit` columns to a unit of it; null for points.
  mesh: ((unit: number, t: number) => Mesh) | null;
  // Its points, for points(); null for a surface.
  cloud: Cloud | null;
  // True when its form itself changes with t: a parametric surface of t, or points from a function.
  timed: boolean;
}

// What points() holds: the points, fixed or a function of t; the character every point is drawn in, or 0 for one
// from the ramp by how much light its cell gathers; and the light one point gives its cell.
interface Cloud {
  dots: Float32Array | ((t: number) => readonly Vec3[]);
  char: number;
  glow: number;
}

const KINDS = ["torus", "sphere", "cube", "cylinder", "cone", "plane", "points", "mesh", "parametric"];
const BODIES = new WeakMap<Shape3d, Body>();
// The periods of the functions orbit() makes, so a scene can work out its loop.
const ORBITS = new WeakMap<object, number>();
const ORIGIN: Vec3 = [0, 0, 0];

// [x, y, z], or a function of t that gives one, checked at t = 0.
function animated(v: unknown, what: string): Animated<Vec3> {
  if (typeof v !== "function") return vec3(v, what, ORIGIN);
  vec3(v(0), `${what}, a function of t, at t = 0,`);
  return v as (t: number) => Vec3;
}

// The options every shape takes, checked.
function base(kind: string, o: unknown): Pick<Body, "kind" | "at" | "rotate" | "spin" | "scale" | "color" | "texture"> {
  if (o !== undefined && (o === null || typeof o !== "object" || Array.isArray(o))) fail(`${kind}() takes an options object, such as { spin: [0, 1, 0] }, not ${shown(o)}`);
  const p = (o ?? {}) as ShapeOptions;
  if (p.color !== undefined && !isHex(p.color)) fail(`${kind}'s color takes a colour as #rrggbb, not ${shown(p.color)}`);
  let texture: Texture | undefined;
  if (typeof p.texture === "string") {
    if (!TEXTURES.includes(p.texture)) fail(`${kind}'s texture takes ${and(TEXTURES.map((n) => `"${n}"`))}, or a function (u, v) => brightness 0 to 1, not ${shown(p.texture)}`);
    texture = textures[p.texture]();
  } else if (p.texture !== undefined && typeof p.texture !== "function")
    fail(`${kind}'s texture takes ${and(TEXTURES.map((n) => `"${n}"`))}, or a function (u, v) => brightness 0 to 1, not ${shown(p.texture)}`);
  else texture = p.texture;
  return {
    kind,
    at: animated(p.at, `${kind}'s at`),
    rotate: animated(p.rotate, `${kind}'s rotate`),
    spin: vec3(p.spin, `${kind}'s spin`, ORIGIN),
    scale: positive(p.scale, `${kind}'s scale`, 1),
    color: p.color?.toLowerCase(),
    texture,
  };
}

function shape(b: Body): Shape3d {
  const s: Shape3d = Object.freeze({ kind: b.kind });
  BODIES.set(s, b);
  return s;
}

// What a shape holds, or a clear error for anything that isn't one.
function body(s: unknown, who: string): Body {
  const b = s !== null && typeof s === "object" ? BODIES.get(s as Shape3d) : undefined;
  if (!b) fail(`${who} takes shapes made by ${and(KINDS.map((k) => `${k}()`))}, not ${shown(s)}`);
  return b;
}

// --- meshes -------------------------------------------------------------------------

// Meshes already built, by kind, size and segments: shapes made again each frame reuse them.
const MEMO = new Map<string, Mesh>();
function memo(key: string, build: () => Mesh): Mesh {
  let m = MEMO.get(key);
  if (!m) {
    if (MEMO.size >= 256) MEMO.clear();
    MEMO.set(key, (m = build()));
  }
  return m;
}

// Segments round a circle `cells` columns from its centre on screen: about one every column and a half of its edge,
// so the outline is smooth, in steps of 4 so a shape keeps its triangles as it moves a little.
const around = (cells: number, least = 12) => Math.min(192, Math.max(least, 4 * Math.ceil((TAU * cells) / 1.5 / 4)));

// A grid of nu by nv quads over u and v, each 0 to 1, as triangles: `place` writes each corner's position and normal
// at offset k.
function lattice(nu: number, nv: number, closed: boolean, place: (u: number, v: number, p: Float32Array, n: Float32Array, k: number) => void): Mesh {
  const count = (nu + 1) * (nv + 1);
  const pos = new Float32Array(count * 3), nrm = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  for (let j = 0, k = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++, k++) {
      place(i / nu, j / nv, pos, nrm, k * 3);
      uv[k * 2] = i / nu;
      uv[k * 2 + 1] = j / nv;
    }
  const tri = new Uint32Array(nu * nv * 6);
  for (let j = 0, q = 0; j < nv; j++)
    for (let i = 0; i < nu; i++, q += 6) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      tri[q] = a;
      tri[q + 1] = b;
      tri[q + 2] = d;
      tri[q + 3] = a;
      tri[q + 4] = d;
      tri[q + 5] = c;
    }
  return { pos, nrm, uv, tri, closed };
}

// Several meshes as one.
function join(parts: readonly Mesh[], closed: boolean): Mesh {
  let nv = 0, nt = 0;
  for (const m of parts) (nv += m.pos.length / 3), (nt += m.tri.length);
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), tri = new Uint32Array(nt);
  let v = 0, t = 0;
  for (const m of parts) {
    pos.set(m.pos, v * 3);
    nrm.set(m.nrm, v * 3);
    uv.set(m.uv, v * 2);
    for (let i = 0; i < m.tri.length; i++) tri[t++] = m.tri[i] + v;
    v += m.pos.length / 3;
  }
  return { pos, nrm, uv, tri, closed };
}

// A flat round end at height y, facing up (1) or down (-1): a fan from its centre.
function disc(r: number, y: number, up: number, n: number): Mesh {
  const pos = new Float32Array((n + 2) * 3), nrm = new Float32Array((n + 2) * 3), uv = new Float32Array((n + 2) * 2), tri = new Uint32Array(n * 3);
  pos[1] = y;
  nrm[1] = up;
  uv[0] = uv[1] = 0.5;
  for (let i = 0; i <= n; i++) {
    const a = (i / n - 0.5) * TAU, x = Math.sin(a), z = -Math.cos(a), k = (i + 1) * 3;
    pos[k] = r * x;
    pos[k + 1] = y;
    pos[k + 2] = r * z;
    nrm[k + 1] = up;
    uv[(i + 1) * 2] = 0.5 + 0.5 * x;
    uv[(i + 1) * 2 + 1] = 0.5 + 0.5 * z;
    if (i < n) (tri[i * 3 + 1] = i + 1), (tri[i * 3 + 2] = i + 2);
  }
  return { pos, nrm, uv, tri, closed: true };
}

function ballMesh(r: number, unit: number): Mesh {
  const nu = around(r * unit), nv = nu / 2;
  return memo(`sphere:${r}:${nu}`, () =>
    lattice(nu, nv, true, (u, v, p, n, k) => {
      // u = 0.5 faces the camera at rest, v runs from the south pole to the north
      const th = (u - 0.5) * TAU, ph = (v - 0.5) * Math.PI, c = Math.cos(ph);
      n[k] = c * Math.sin(th);
      n[k + 1] = Math.sin(ph);
      n[k + 2] = -c * Math.cos(th);
      p[k] = r * n[k];
      p[k + 1] = r * n[k + 1];
      p[k + 2] = r * n[k + 2];
    }),
  );
}

function ringMesh(R: number, r: number, unit: number): Mesh {
  const nu = around((R + r) * unit), nv = around(r * unit, 8);
  return memo(`torus:${R}:${r}:${nu}:${nv}`, () =>
    lattice(nu, nv, true, (u, v, p, n, k) => {
      // the ring goes round in x and y, facing the camera; the tube round it
      const a = u * TAU, b = v * TAU, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      n[k] = cb * ca;
      n[k + 1] = cb * sa;
      n[k + 2] = sb;
      p[k] = (R + r * cb) * ca;
      p[k + 1] = (R + r * cb) * sa;
      p[k + 2] = r * sb;
    }),
  );
}

// A cylinder, or a cone (its side narrowing to a point at the top), upright along y.
function tubeMesh(r: number, h: number, unit: number, cone: boolean): Mesh {
  const n = around(r * unit);
  return memo(`${cone ? "cone" : "cylinder"}:${r}:${h}:${n}`, () => {
    const slant = Math.hypot(h, r);
    const side = lattice(n, 1, true, (u, v, p, nn, k) => {
      const a = (u - 0.5) * TAU, x = Math.sin(a), z = -Math.cos(a), w = cone ? 1 - v : 1;
      p[k] = r * w * x;
      p[k + 1] = (v - 0.5) * h;
      p[k + 2] = r * w * z;
      // a cone's side leans in, so its normal tips up by the slope
      nn[k] = cone ? (h * x) / slant : x;
      nn[k + 1] = cone ? r / slant : 0;
      nn[k + 2] = cone ? (h * z) / slant : z;
    });
    return join(cone ? [side, disc(r, -h / 2, -1, n)] : [side, disc(r, -h / 2, -1, n), disc(r, h / 2, 1, n)], true);
  });
}

// A cube's faces: each its normal, and the ways its u and v run across it.
const FACES: readonly (readonly [Vec3, Vec3, Vec3])[] = [
  [[0, 0, -1], [1, 0, 0], [0, 1, 0]],
  [[0, 0, 1], [-1, 0, 0], [0, 1, 0]],
  [[1, 0, 0], [0, 0, 1], [0, 1, 0]],
  [[-1, 0, 0], [0, 0, -1], [0, 1, 0]],
  [[0, 1, 0], [1, 0, 0], [0, 0, 1]],
  [[0, -1, 0], [1, 0, 0], [0, 0, -1]],
];

function boxMesh(h: number): Mesh {
  return memo(`cube:${h}`, () =>
    join(
      FACES.map(([n, a, b]) =>
        lattice(1, 1, true, (u, v, p, nn, k) => {
          for (let j = 0; j < 3; j++) {
            p[k + j] = h * (n[j] + (2 * u - 1) * a[j] + (2 * v - 1) * b[j]);
            nn[k + j] = n[j];
          }
        }),
      ),
      true,
    ),
  );
}

function floorMesh(w: number, d: number): Mesh {
  return memo(`plane:${w}:${d}`, () =>
    lattice(1, 1, false, (u, v, p, n, k) => {
      p[k] = (u - 0.5) * w;
      p[k + 2] = (v - 0.5) * d;
      n[k + 1] = 1;
    }),
  );
}

// A mesh of flat faces: each face's corners take its normal (Newell's, which any polygon has), and it is cut into a fan
// of triangles from its first corner.
function flat(vs: readonly Vec3[], faces: readonly (readonly number[])[]): Mesh {
  let nv = 0, nt = 0;
  for (const f of faces) (nv += f.length), (nt += (f.length - 2) * 3);
  const pos = new Float32Array(nv * 3), nrm = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), tri = new Uint32Array(nt);
  let v = 0, t = 0;
  for (const f of faces) {
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < f.length; i++) {
      const a = vs[f[i]], b = vs[f[(i + 1) % f.length]];
      nx += (a[1] - b[1]) * (a[2] + b[2]);
      ny += (a[2] - b[2]) * (a[0] + b[0]);
      nz += (a[0] - b[0]) * (a[1] + b[1]);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    for (let i = 0; i < f.length; i++) {
      pos.set(vs[f[i]], (v + i) * 3);
      nrm[(v + i) * 3] = nx / l;
      nrm[(v + i) * 3 + 1] = ny / l;
      nrm[(v + i) * 3 + 2] = nz / l;
      if (i >= 2) (tri[t++] = v), (tri[t++] = v + i - 1), (tri[t++] = v + i);
    }
    v += f.length;
  }
  return { pos, nrm, uv, tri, closed: false };
}

// --- point clouds -------------------------------------------------------------------

/** The ready-made clouds points() can name: see points(). */
export type CloudName = "galaxy" | "ball" | "shell" | "ring" | "helix";

// Each cloud's points by default, and the glow that suits that many at 64 by 24: the denser, the less.
const CLOUDS: Record<CloudName, { count: number; glow: number }> = {
  galaxy: { count: 1200, glow: 0.2 },
  ball: { count: 600, glow: 0.4 },
  shell: { count: 600, glow: 0.5 },
  ring: { count: 800, glow: 0.35 },
  helix: { count: 480, glow: 0.5 },
};

// A named cloud's n points, the same for the same seed.
function cloud(name: CloudName, n: number, seed: number): Vec3[] {
  const rand = mulberry32(seed);
  const out: Vec3[] = [];
  if (name === "galaxy")
    for (let i = 0; i < n; i++) {
      // a bell-shaped spread about 0, from three draws
      const bell = () => rand() + rand() + rand() - 1.5;
      // a fifth in a squat bulge at the middle
      if (i % 5 === 0) {
        const r = 0.5 * Math.abs(bell()) ** 1.3, a = rand() * TAU, y = r * 0.5 * bell();
        out.push([r * Math.cos(a), y, r * Math.sin(a)]);
        continue;
      }
      // the rest on two logarithmic arms, a turn from the bulge to a radius of 3, fanning out as they go
      const r = 0.35 + 2.65 * rand(), a = 2.7 * Math.log(r / 0.35) + (i % 2) * Math.PI + bell() * (0.25 + 0.1 * r);
      out.push([r * Math.cos(a), bell() * 0.08, r * Math.sin(a)]);
    }
  else if (name === "ball")
    for (let i = 0; i < n; i++) {
      // even through the ball: the radius by the cube root, the direction even over the sphere
      const r = Math.cbrt(rand()), y = 2 * rand() - 1, a = rand() * TAU, c = Math.sqrt(1 - y * y);
      out.push([r * c * Math.cos(a), r * y, r * c * Math.sin(a)]);
    }
  else if (name === "shell")
    for (let i = 0; i < n; i++) {
      // a Fibonacci sphere: each point a golden angle round from the last, evenly from pole to pole
      const y = 1 - (2 * (i + 0.5)) / n, c = Math.sqrt(1 - y * y), a = i * Math.PI * (3 - Math.sqrt(5)) + rand() * 0.2;
      out.push([c * Math.cos(a), y, c * Math.sin(a)]);
    }
  else if (name === "ring")
    for (let i = 0; i < n; i++) {
      // even over the ring's area, from 1.4 to 2.2, round a sphere of radius 1
      const r = Math.sqrt(1.96 + rand() * (4.84 - 1.96)), a = rand() * TAU;
      out.push([r * Math.cos(a), (rand() - 0.5) * 0.04, r * Math.sin(a)]);
    }
  else {
    // two strands twisting twice round from y -2 to 2 at a radius of 1, and a quarter of the points on 12 rungs across
    const rungs = Math.floor(n / 4), strand = n - rungs, slots = Math.ceil(rungs / 12);
    for (let i = 0; i < strand; i++) {
      const k = (i >> 1) / Math.max(1, Math.ceil(strand / 2) - 1), a = 2 * TAU * k + (i & 1) * Math.PI;
      out.push([Math.cos(a), 4 * k - 2, Math.sin(a)]);
    }
    for (let i = 0; i < rungs; i++) {
      const k = ((i % 12) + 0.5) / 12, a = 2 * TAU * k, f = (2 * (Math.floor(i / 12) + 1)) / (slots + 1) - 1;
      out.push([f * Math.cos(a), 4 * k - 2, f * Math.sin(a)]);
    }
  }
  return out;
}

// --- the shapes ---------------------------------------------------------------------

/**
 * A torus: a ring with a tube round it, facing the camera so at rest you look through its hole. donut.c's donut.
 * `radius` is from its centre to the middle of the tube, 2; `tube` is the tube's radius, 1.
 *
 *   torus({ spin: [0.8, 0, 0.35] })
 */
export function torus(o: ShapeOptions & { radius?: number; tube?: number } = {}): Shape3d {
  const b = base("torus", o);
  const R = positive(o.radius, "torus's radius", 2), r = positive(o.tube, "torus's tube", 1);
  return shape({ ...b, reach: () => R + r, mesh: (unit) => ringMesh(R, r, unit), cloud: null, timed: false });
}

/**
 * A sphere of `radius` 1. Its texture's u is its longitude, 0.5 facing the camera at rest, and v its latitude, 0 at
 * the south pole.
 *
 *   sphere({ color: "#3b82f6", texture: "spots", spin: [0, 1, 0] })
 */
export function sphere(o: ShapeOptions & { radius?: number } = {}): Shape3d {
  const b = base("sphere", o);
  const r = positive(o.radius, "sphere's radius", 1);
  return shape({ ...b, reach: () => r, mesh: (unit) => ballMesh(r, unit), cloud: null, timed: false });
}

/**
 * A cube with edges `size` long, 2 (from -1 to 1 on each axis), each face flat and lit as one, so its faces show in
 * different characters as it turns.
 *
 *   cube({ spin: [0.4, 0.7, 0], color: "#f97316" })
 */
export function cube(o: ShapeOptions & { size?: number } = {}): Shape3d {
  const b = base("cube", o);
  const h = positive(o.size, "cube's size", 2) / 2;
  return shape({ ...b, reach: () => h * Math.sqrt(3), mesh: () => boxMesh(h), cloud: null, timed: false });
}

/** A cylinder standing upright along y, closed at both ends: `radius` 1, `height` 2. */
export function cylinder(o: ShapeOptions & { radius?: number; height?: number } = {}): Shape3d {
  const b = base("cylinder", o);
  const r = positive(o.radius, "cylinder's radius", 1), h = positive(o.height, "cylinder's height", 2);
  return shape({ ...b, reach: () => Math.hypot(r, h / 2), mesh: (unit) => tubeMesh(r, h, unit, false), cloud: null, timed: false });
}

/** A cone standing on its base, its point up along y: the base's `radius` 1, `height` 2, centred halfway up. */
export function cone(o: ShapeOptions & { radius?: number; height?: number } = {}): Shape3d {
  const b = base("cone", o);
  const r = positive(o.radius, "cone's radius", 1), h = positive(o.height, "cone's height", 2);
  return shape({ ...b, reach: () => Math.hypot(r, h / 2), mesh: (unit) => tubeMesh(r, h, unit, true), cloud: null, timed: false });
}

/**
 * A flat rectangle lying in x and z at y = 0, like a floor: `width` along x, 4; `depth` along z, 4. It is lit on both
 * sides. Seen straight on it is edge on, so look down on it with the scene's camera.tilt, or tip it with rotate.
 *
 *   plane({ at: [0, -1, 0], width: 8, depth: 8, texture: textures.checker(8, 8) })
 */
export function plane(o: ShapeOptions & { width?: number; depth?: number } = {}): Shape3d {
  const b = base("plane", o);
  const w = positive(o.width, "plane's width", 4), d = positive(o.depth, "plane's depth", 4);
  return shape({ ...b, reach: () => Math.hypot(w, d) / 2, mesh: () => floorMesh(w, d), cloud: null, timed: false });
}

/**
 * Points that glow: each lights the cell it falls in, a near one more than a far one, and the points in one cell add
 * up, so a cloud is brightest where it is densest, its character from the scene's ramp by the light its cell gathers
 * (on either page, not turned round on paper) and, coloured, its shade by that light, or by depth with colorBy
 * "depth". They hide behind nearer surfaces, never behind each other. Name a ready-made cloud, seeded, in units about
 * its centre:
 *
 * - "galaxy": two spiral arms round a bright bulge, flat in x and z out to a radius of 3; look down on it with camera.tilt.
 * - "ball": a ball of radius 1 filled evenly.
 * - "shell": points spread evenly over a sphere of radius 1.
 * - "ring": a flat ring in x and z from radius 1.4 to 2.2, a planet's rings round a sphere of radius 1.
 * - "helix": two strands twisting twice round from y -2 to 2, with rungs across: a DNA helix.
 *
 * Or give a list of your own, each [x, y, z], or a function of t that gives one (checked at t = 0; a point that isn't
 * three finite numbers later is left out). Options besides the ones every shape takes:
 *
 * - `count`: how many points a named cloud has: galaxy 1200, ball 600, shell 600, ring 800, helix 480; 1 to 20000.
 * - `seed`: a whole number that picks where a named cloud's points fall: 1.
 * - `char`: one character every point is drawn in, so only its shade shows its light: none, the ramp's.
 * - `glow`: the light one near point gives its cell, above 0 and up to 1, a far one half as much: 0.5 for a list of
 *   your own; for a named cloud, what suits its count at 64 by 24 (galaxy 0.2, ball 0.4, shell 0.5, ring 0.35, helix
 *   0.5). Several in a cell add up as light does (1 - (1 - glow) ** n), so raise it for a few points and lower it for
 *   many thousands or a small frame.
 *
 *   points("galaxy", { spin: [0, 0.5, 0] })
 *   points([[0, 1, 0], [1, 0, 0], [0, 0, 1]], { char: "*" })
 */
export function points(list: Animated<readonly Vec3[]> | CloudName, o: ShapeOptions & { char?: string; count?: number; seed?: number; glow?: number } = {}): Shape3d {
  const b = base("points", o);
  if (o.texture !== undefined) fail("points() takes no texture: a point has no surface to put one on");
  const named = typeof list === "string";
  if (named && !Object.hasOwn(CLOUDS, list)) fail(`points() takes a cloud's name, ${and(Object.keys(CLOUDS).map((n) => `"${n}"`))}, or a list of points, each [x, y, z], not ${shown(list)}`);
  if (!named && (o.count !== undefined || o.seed !== undefined)) fail("points' count and seed are for a named cloud, such as points(\"galaxy\", { count: 500 }); a list of your own is drawn as it is");
  const source: Animated<readonly Vec3[]> = named
    ? cloud(list, wholeIn(o.count, "points' count", CLOUDS[list].count, 1, 20000), wholeIn(o.seed, "points' seed", 1, -(2 ** 31), 2 ** 31 - 1))
    : list;
  const timed = typeof source === "function";
  const check = (l: unknown, when: string): readonly Vec3[] => {
    if (!Array.isArray(l)) fail(`points() takes a cloud's name, a list of points, each [x, y, z], or a function of t that gives one, not ${shown(l)}${when}`);
    l.forEach((p, i) => vec3(p, `points' point ${i}${when}`));
    return l as readonly Vec3[];
  };
  const first = check(timed ? source(0) : source, timed ? " at t = 0" : "");
  if (o.char !== undefined && (typeof o.char !== "string" || o.char.length !== 1 || o.char === " "))
    fail(`points' char takes one character that isn't a space, such as "*", not ${shown(o.char)}`);
  const char = o.char === undefined ? 0 : code(o.char);
  const glow = finite(o.glow, "points' glow", named ? CLOUDS[list].glow : 0.5);
  if (glow <= 0 || glow > 1) fail(`points' glow takes a number above 0 and up to 1, the light one point gives its cell, not ${shown(o.glow)}`);
  const far = (l: readonly Vec3[]) => {
    let r = 0;
    for (const p of l) r = Math.max(r, Math.hypot(p[0], p[1], p[2]) || 0);
    return r;
  };
  const still = far(first);
  const fn = source as (t: number) => readonly Vec3[];
  const dots = timed ? fn : Float32Array.from(first.flat());
  return shape({ ...b, reach: timed ? (t) => far(fn(t)) : () => still, mesh: null, cloud: { dots, char, glow }, timed });
}

/**
 * A shape of your own from its corners and faces: `vertices`, each [x, y, z] about its centre, and `faces`, each a
 * list of three or more indices into them going round the face. Each face is flat and lit on whichever side faces the
 * camera, so the order round a face doesn't matter.
 *
 *   // a pyramid
 *   mesh([[0, 1, 0], [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [1, 2, 3, 4]])
 */
export function mesh(vertices: readonly Vec3[], faces: readonly (readonly number[])[], o: ShapeOptions = {}): Shape3d {
  const b = base("mesh", o);
  if (o.texture !== undefined) fail("mesh() takes no texture: its faces have no u and v; parametric() makes a surface of your own that takes one");
  if (!Array.isArray(vertices) || !vertices.length) fail(`mesh() takes a list of vertices, each [x, y, z], such as [[0, 1, 0], [1, -1, 0], [-1, -1, 0]], not ${shown(vertices)}`);
  const vs = vertices.map((v, i) => vec3(v, `mesh's vertex ${i}`));
  if (!Array.isArray(faces) || !faces.length) fail(`mesh() takes faces, each a list of three or more vertex indices going round it, such as [[0, 1, 2]], not ${shown(faces)}`);
  faces.forEach((f, i) => {
    if (!Array.isArray(f) || f.length < 3 || !f.every((k) => Number.isInteger(k) && k >= 0 && k < vs.length))
      fail(`mesh's face ${i} takes three or more whole numbers from 0 to ${vs.length - 1}, indices into its vertices, not ${shown(f)}`);
  });
  const built = flat(vs, faces);
  let far = 0;
  for (const v of vs) far = Math.max(far, Math.hypot(v[0], v[1], v[2]));
  return shape({ ...b, reach: () => far, mesh: () => built, cloud: null, timed: false });
}

/**
 * A surface of your own: `fn(u, v)` gives the point [x, y, z] at u and v, each 0 to 1, about the shape's centre; a
 * function that names a third parameter, (u, v, t), is a surface that moves. Lit on whichever side faces the camera,
 * smooth across, its normals worked out from its points; where it meets itself at u 0 and 1 (or v), it is smooth across
 * the join too. `segments`: quads across u and v, one number for both or [u, v]; by default about one every column and
 * a half of its length on screen. Its texture's u and v are fn's.
 *
 *   // a saddle
 *   parametric((u, v) => [u * 4 - 2, (u * 4 - 2) * (v * 4 - 2) / 4, v * 4 - 2])
 */
export function parametric(fn: (u: number, v: number, t: number) => Vec3, o: ShapeOptions & { segments?: number | readonly [number, number] } = {}): Shape3d {
  const b = base("parametric", o);
  if (typeof fn !== "function") fail(`parametric() takes a function (u, v) => [x, y, z], u and v each 0 to 1, or (u, v, t) => [x, y, z] for a surface that moves, not ${shown(fn)}`);
  vec3(fn(0, 0, 0), "parametric's function at u 0, v 0 and t 0");
  // A function that names t moves, and is built again each frame.
  const timed = fn.length >= 3;
  const seg = o.segments;
  const ok = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 512;
  if (seg !== undefined && !(ok(seg) || (Array.isArray(seg) && seg.length === 2 && seg.every(ok))))
    fail(`parametric's segments takes a whole number from 1 to 512, or [u, v] of them, not ${shown(seg)}`);
  // How long it runs along u and along v, and how far it reaches, from a look at a 32 by 32 grid of its points.
  const probe = (t: number) => {
    const n = 32, p: Vec3[] = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) p.push(fn(i / n, j / n, t));
    let lu = 0, lv = 0, far = 0;
    const d = (a: Vec3, c: Vec3) => Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]) || 0;
    for (let k = 0; k <= n; k++) {
      let su = 0, sv = 0;
      for (let i = 0; i < n; i++) (su += d(p[k * (n + 1) + i], p[k * (n + 1) + i + 1])), (sv += d(p[i * (n + 1) + k], p[(i + 1) * (n + 1) + k]));
      (lu = Math.max(lu, su)), (lv = Math.max(lv, sv));
    }
    for (const q of p) far = Math.max(far, Math.hypot(q[0], q[1], q[2]) || 0);
    // a little past the farthest point it was seen at, for the reach between them
    return { lu, lv, far: far * 1.02 };
  };
  const at0 = probe(0);
  const cache = new Map<number, Mesh>();
  const count = (len: number, unit: number) => Math.min(256, Math.max(8, 4 * Math.ceil((len * unit) / 1.5 / 4)));
  return shape({
    ...b,
    reach: timed ? (t) => probe(t).far : () => at0.far,
    mesh: (unit, t) => {
      const nu = typeof seg === "number" ? seg : seg ? seg[0] : count(at0.lu, unit);
      const nv = typeof seg === "number" ? seg : seg ? seg[1] : count(at0.lv, unit);
      const key = nu * 1024 + nv;
      let m = cache.get(key);
      if (m && !timed) return m;
      if (!m) {
        if (cache.size >= 16) cache.clear();
        cache.set(key, (m = lattice(nu, nv, false, () => {})));
      }
      return sheet(m, fn, nu, nv, t);
    },
    cloud: null,
    timed,
  });
}

// Fills a lattice's points from fn at t, and its normals from the points round each.
function sheet(m: Mesh, fn: (u: number, v: number, t: number) => Vec3, nu: number, nv: number, t: number): Mesh {
  const { pos, nrm } = m, w = nu + 1;
  let far = 0;
  for (let j = 0, k = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++, k += 3) {
      const p = fn(i / nu, j / nv, t);
      pos[k] = Number.isFinite(p[0]) ? p[0] : 0;
      pos[k + 1] = Number.isFinite(p[1]) ? p[1] : 0;
      pos[k + 2] = Number.isFinite(p[2]) ? p[2] : 0;
      far = Math.max(far, Math.abs(pos[k]), Math.abs(pos[k + 1]), Math.abs(pos[k + 2]));
    }
  // Does it close on itself across u, or across v? Then the normals there take points from the other side.
  const eps = 1e-5 * (far || 1);
  const same = (a: number, b: number) => Math.abs(pos[a] - pos[b]) < eps && Math.abs(pos[a + 1] - pos[b + 1]) < eps && Math.abs(pos[a + 2] - pos[b + 2]) < eps;
  let wu = true, wv = true;
  for (let j = 0; j <= nv && wu; j++) wu = same(j * w * 3, (j * w + nu) * 3);
  for (let i = 0; i <= nu && wv; i++) wv = same(i * 3, (nv * w + i) * 3);
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++) {
      const il = i > 0 ? i - 1 : wu ? nu - 1 : 0, ir = i < nu ? i + 1 : wu ? 1 : nu;
      const jd = j > 0 ? j - 1 : wv ? nv - 1 : 0, ju = j < nv ? j + 1 : wv ? 1 : nv;
      const a = (j * w + il) * 3, b = (j * w + ir) * 3, c = (jd * w + i) * 3, d = (ju * w + i) * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[d] - pos[c], vy = pos[d + 1] - pos[c + 1], vz = pos[d + 2] - pos[c + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1, k = (j * w + i) * 3;
      nrm[k] = nx / l;
      nrm[k + 1] = ny / l;
      nrm[k + 2] = nz / l;
    }
  return m;
}

/**
 * A position going round `center` ([0, 0, 0]) every `period` seconds at `radius`, for a shape's `at`: a moon round a
 * planet. It goes round in x and z, right, then away behind, then left, then in front; `tilt` (radians, 0) tips its
 * plane so its far side rises, as if seen from a little above; `phase` (radians, 0) is where it starts, 0 to the right.
 * A scene knows its period, for its loop.
 *
 *   sphere({ radius: 0.3, at: orbit({ radius: 2.4, period: 6, tilt: 0.3 }) })
 */
export function orbit(o: { radius: number; period: number; tilt?: number; center?: Vec3; phase?: number }): (t: number) => Vec3 {
  if (!o || typeof o !== "object") fail(`orbit() takes { radius, period }, such as { radius: 2.4, period: 6 }, not ${shown(o)}`);
  const r = positive(o.radius, "orbit's radius"), period = positive(o.period, "orbit's period");
  const tilt = finite(o.tilt, "orbit's tilt", 0), phase = finite(o.phase, "orbit's phase", 0);
  const c = vec3(o.center, "orbit's center", ORIGIN);
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const fn = (t: number): Vec3 => {
    // the time into this turn, so every turn is drawn from the same numbers
    const a = (TAU * (((t % period) + period) % period)) / period + phase;
    const x = r * Math.cos(a), z = r * Math.sin(a);
    return [c[0] + x, c[1] + z * st, c[2] + z * ct];
  };
  ORBITS.set(fn, period);
  return fn;
}

// --- the scene ----------------------------------------------------------------------

/** What picks a coloured cell's shade: see SceneOptions.colorBy. */
export type ColorBy = "shape" | "depth" | "light";

/** How a scene is seen, lit, shaded and coloured. */
export interface SceneOptions {
  /**
   * The camera. `distance`: units from the camera to the middle of the scene, 6; nearer makes the perspective
   * stronger. `zoom`: columns a unit spans at the middle of the scene; fitted by default (see fit). `tilt`: radians it
   * looks down on the scene from above, 0; negative looks up from below. `spin`: radians a second the whole scene turns
   * about its middle, as on a turntable, seen by a camera and a light that stay put: 0.
   */
  camera?: { distance?: number; zoom?: number; tilt?: number; spin?: number };
  /** Towards the light, as the camera sees it: [-0.4, 1, -1], from the upper left and in front, as donut.c. Its length doesn't matter. */
  light?: Vec3;
  /** Light everywhere, 0 to 1, so the side away from the light still shows: 0. */
  ambient?: number;
  /**
   * Characters from unlit to lit: ".,-~:;=!*#$@", donut.c's, with no space so every surface shows. A name from ramps,
   * or two or more characters of your own. A cell whose character is a space is not drawn: it is empty in the frame,
   * so the scene lays over another piece, and render3d() leaves what was under it, though a shape behind it stays hidden.
   */
  ramp?: RampName | (string & {});
  /** Turns the ramp round: "auto" (the default) turns it on a light page, so lit still reads as lit; true or false always or never. */
  invert?: boolean | "auto";
  /**
   * What picks a coloured cell's shade. "shape" (the default): its light, each shape in its own colour, darker where it
   * is darker. "light": its light too, but on a dark page the shades go on past the colour to a pale highlight where it
   * is brightest. "depth": how near it is, far things fading to dark. It shades only shapes with a colour, or every
   * shape when the scene has `colors`; points take their shade by the light their cell gathers, or by depth.
   */
  colorBy?: ColorBy;
  /**
   * One fade for the whole scene instead of each shape's own colour: stops as #rrggbb, dark to bright, spread to
   * `shades` and each made to read on the page (darkened a little on paper or lightened on a dark page where it
   * wouldn't); or { light, dark } of the same length, one fade for each page, used as given. None by default.
   */
  colors?: PaletteSpec;
  /** Shades of each colour, from dark to full: 4, a whole number from 1 to 16. */
  shades?: number;
  /**
   * Zoom as close as it can while no shape leaves the frame at any angle of its spin, wherever it goes, with a cell of
   * room all round: true. Measured once, when the scene is made: over its loop when it has one, else as the ball each
   * turning shape never leaves (as donut.c sizes its ring), over the first 30 seconds of anything that moves. A camera
   * zoom wins over it; false without one is a zoom where a unit is an eighth of the frame's height.
   */
  fit?: boolean;
  /**
   * Seconds the scene repeats in, so it loops exactly: each spin (the camera's too) is rounded to a whole number of
   * turns in it, at least one, and each orbit must go round a whole number of times in it. scene() plays it as its loop
   * (meta.loop). None by default: a scene whose motions all repeat within a minute loops by itself.
   */
  period?: number;
}

const DONUT = ".,-~:;=!*#$@";
const NEAR = 0.05;
const COLOR_BY: readonly ColorBy[] = ["shape", "depth", "light"];

// A scene's options, checked, with their defaults.
interface Settings {
  distance: number;
  zoom: number | undefined;
  tilt: number;
  spin: number;
  light: Vec3;
  ambient: number;
  chars: Uint16Array;
  invert: boolean | "auto";
  colorBy: ColorBy;
  colors: PaletteSpec | undefined;
  shades: number;
  fit: boolean;
  period: number | undefined;
}

function settings(o: SceneOptions, who: string): Settings {
  if (o === null || typeof o !== "object") fail(`${who} takes its options as an object, such as { light: [0, 1, -1] }, not ${shown(o)}`);
  const cam = o.camera ?? {};
  if (cam === null || typeof cam !== "object" || Array.isArray(cam)) fail(`camera takes { distance, zoom, tilt, spin }, not ${shown(o.camera)}`);
  const light = vec3(o.light, "light", [-0.4, 1, -1]);
  const len = Math.hypot(...light);
  if (!len) fail("light takes a direction towards the light, not [0, 0, 0]: [-0.4, 1, -1] is from the upper left");
  const ambient = finite(o.ambient, "ambient", 0);
  if (ambient < 0 || ambient > 1) fail(`ambient takes a number from 0 to 1, not ${ambient}`);
  const chars = o.ramp === undefined ? DONUT : rampOf(o.ramp);
  if (o.invert !== undefined && o.invert !== true && o.invert !== false && o.invert !== "auto") fail(`invert takes true, false or "auto", not ${shown(o.invert)}`);
  if (o.colorBy !== undefined && !COLOR_BY.includes(o.colorBy)) fail(`colorBy takes ${and(COLOR_BY.map((c) => `"${c}"`))}, not ${shown(o.colorBy)}`);
  const shades = o.shades ?? 4;
  if (!Number.isInteger(shades) || shades < 1 || shades > 16) fail(`shades takes a whole number from 1 to 16, not ${shown(o.shades)}`);
  // spread() checks the colours, saying what is wrong with them
  if (o.colors !== undefined) spread(o.colors, shades);
  if (o.fit !== undefined && typeof o.fit !== "boolean") fail(`fit takes true or false, not ${shown(o.fit)}`);
  return {
    distance: positive(cam.distance, "camera's distance", 6),
    zoom: cam.zoom === undefined ? undefined : positive(cam.zoom, "camera's zoom"),
    tilt: finite(cam.tilt, "camera's tilt", 0),
    spin: finite(cam.spin, "camera's spin", 0),
    light: [light[0] / len, light[1] / len, light[2] / len],
    ambient,
    chars: Uint16Array.from({ length: chars.length }, (_, i) => chars.charCodeAt(i)),
    invert: o.invert ?? "auto",
    colorBy: o.colorBy ?? "shape",
    colors: o.colors,
    shades,
    fit: o.fit ?? true,
    period: o.period === undefined ? undefined : positive(o.period, "period"),
  };
}

// --- colours ------------------------------------------------------------------------

// How bright a colour looks, 0 to 1: WCAG's relative luminance.
function luminance(c: string): number {
  const [r, g, b] = rgb(c).map((v) => {
    const k = v / 255;
    return k <= 0.03928 ? k / 12.92 : ((k + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// GitHub's page colours, which the players' light and dark pages are.
const PAGE = { light: "#ffffff", dark: "#0d1117" };

// A colour that reads on its page: as it is when it stands out 3 to 1 from the page, else darkened on a light page or
// lightened on a dark one just until it does.
function legible(c: string, paper: boolean): string {
  const page = luminance(paper ? PAGE.light : PAGE.dark);
  const contrast = (h: string) => {
    const l = luminance(h);
    return (Math.max(l, page) + 0.05) / (Math.min(l, page) + 0.05);
  };
  if (contrast(c) >= 3) return c;
  const to = paper ? "#000000" : "#ffffff";
  let lo = 0, hi = 1;
  for (let i = 0; i < 16; i++) {
    const k = (lo + hi) / 2;
    if (contrast(mix(c, to, k)) >= 3) hi = k;
    else lo = k;
  }
  return mix(c, to, hi);
}

// The shades of a colour from dark to full, or on past it to a pale highlight for "light" on a dark page, each made
// to read on its page. The darkest is a little under half the colour, so a shape's shaded side still shows its outline.
function shadesOf(c: string, by: ColorBy, n: number, paper: boolean): string[] {
  const full = legible(c, paper);
  return Array.from({ length: n }, (_, k) => {
    const f = n > 1 ? k / (n - 1) : 1;
    if (by !== "light" || paper) return mix("#000000", full, 0.45 + 0.55 * f);
    return f <= 2 / 3 ? mix("#000000", full, 0.45 + 0.825 * f) : mix(full, "#ffffff", (f - 2 / 3) * 1.5);
  });
}

// --- seeing and turning -------------------------------------------------------------

// A list of shapes, checked: the scene's own, or what its function gives at t.
function listAt(shapes: readonly Shape3d[] | ((t: number) => readonly Shape3d[]), t: number, who: string): readonly Shape3d[] {
  const list = typeof shapes === "function" ? shapes(t) : shapes;
  if (!Array.isArray(list)) fail(`${who} takes a list of shapes, such as [torus()], ${typeof shapes === "function" ? "and its function gave" : "not"} ${shown(list)}`);
  return list;
}

// Close enough to a whole number of 1 or more.
const whole = (x: number) => x >= 1 - 1e-9 && Math.abs(x - Math.round(x)) < 1e-6 * Math.max(1, x);

// It turns over time.
const turns = (b: Body) => typeof b.rotate === "function" || b.spin.some((w) => w !== 0);
// Anything about it changes over time: its place, its angle or its form.
const moves = (b: Body) => typeof b.at === "function" || b.timed || turns(b);

// A spin, rounded to whole turns in the period when there is one.
function rate(w: number, period: number | undefined): number {
  if (!w || period === undefined) return w;
  return (Math.sign(w) * Math.max(1, Math.round((Math.abs(w) * period) / TAU)) * TAU) / period;
}

// Throws for an orbit that doesn't go round a whole number of times in the period, which would jump at the loop.
function orbits(bodies: readonly Body[], period: number | undefined): void {
  if (period === undefined) return;
  for (const b of bodies) {
    const p = typeof b.at === "function" ? ORBITS.get(b.at) : undefined;
    if (p !== undefined && !whole(period / p))
      fail(`an orbit going round every ${p} seconds doesn't go round a whole number of times in the scene's period of ${period}: make the period a multiple of ${p}`);
  }
}

// The time into the loop, so every loop is drawn from the same numbers.
const into = (t: number, loop: number | undefined) => (loop === undefined ? t : ((t % loop) + loop) % loop);

// The turn by angles about x, then y, then z, into m row by row.
function rotation(m: Float64Array, ax: number, ay: number, az: number): void {
  const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay), cc = Math.cos(az), sc = Math.sin(az);
  m[0] = cc * cb;
  m[1] = cc * sb * sa - sc * ca;
  m[2] = cc * sb * ca + sc * sa;
  m[3] = sc * cb;
  m[4] = sc * sb * sa + cc * ca;
  m[5] = sc * sb * ca - cc * sa;
  m[6] = -sb;
  m[7] = cb * sa;
  m[8] = cb * ca;
}

// a = b times c, 3 by 3 matrices row by row: the turn c, then b. a is neither b nor c.
function times(a: Float64Array, b: Float64Array, c: Float64Array): void {
  for (let i = 0; i < 9; i += 3)
    for (let j = 0; j < 3; j++) a[i + j] = b[i] * c[j] + b[i + 1] * c[3 + j] + b[i + 2] * c[6 + j];
}

// Room for turns being worked out: drawing is never done two at once.
const YAW = new Float64Array(9), TILT = new Float64Array(9), OWN = new Float64Array(9);

// The camera's turn: the scene turned by `yaw` about its upright axis, then tipped by the tilt so the camera looks down.
function camera(c: Float64Array, tilt: number, yaw: number): void {
  rotation(YAW, 0, yaw, 0);
  rotation(TILT, -tilt, 0, 0);
  times(c, TILT, YAW);
}

// The camera's turn at t, its spin rounded to the period.
function cameraAt(c: Float64Array, set: Settings, t: number, loop: number | undefined): void {
  camera(c, set.tilt, rate(set.spin, set.period) * into(t, loop));
}

// A shape's turn at t as the camera sees it: its rotate, and its spins (rounded to the period) times the time into the
// loop, then the camera's turn `c`.
function pose(m: Float64Array, b: Body, t: number, period: number | undefined, loop: number | undefined, c: Float64Array): void {
  let rot = typeof b.rotate === "function" ? b.rotate(t) : b.rotate;
  // a function of t that gives no angles leaves the shape unturned (angles that aren't numbers hide it)
  if (!Array.isArray(rot)) rot = ORIGIN;
  const T = into(t, loop);
  rotation(OWN, rot[0] + rate(b.spin[0], period) * T, rot[1] + rate(b.spin[1], period) * T, rot[2] + rate(b.spin[2], period) * T);
  times(m, c, OWN);
}

// A shape's points before it is turned, placed or scaled, at t: its corners at a fair size, or its own points.
function corners(b: Body, t: number): Float32Array {
  if (b.mesh) return b.mesh(6, t).pos;
  const dots = b.cloud!.dots;
  if (typeof dots !== "function") return dots;
  const list = dots(t);
  return Float32Array.from(Array.isArray(list) ? list.flat() : []);
}

// Where a scene's shapes can be seen from the camera: the zoom that keeps all of them in the frame, and the nearest
// and farthest any of them comes, for colours by depth.
interface Fit {
  zoom: number;
  zmin: number;
  zmax: number;
}

// The largest |x / d| over a disc of radius r round (x, d): how far to the side a ball reaches on screen, as the
// tangent from the camera to its edge. Infinity when it reaches round to the camera's side.
function side(x: number, d: number, r: number): number {
  const h = Math.hypot(x, d);
  if (d <= 0 || r >= h) return Infinity;
  const c = Math.atan2(x, d), a = Math.asin(r / h);
  if (c + a >= Math.PI / 2 || c - a <= -Math.PI / 2) return Infinity;
  return Math.max(Math.tan(c + a), -Math.tan(c - a));
}

// Works out the fit once. When the scene repeats in a known loop, from its frames: at enough moments over the loop
// that nothing turns more than a twentieth of a radian between two of them (240 at least), each shape's points turned
// and placed as they are drawn then. When its turning never repeats, or turns too fast for 2000 moments to follow, a
// turning shape counts as the ball it never leaves at any angle, as donut.c sizes its ring, and a turning camera with
// no loop is looked through from 72 sides. Something that doesn't move is looked at once.
function measure(shapes: readonly Shape3d[] | ((t: number) => readonly Shape3d[]), set: Settings, cols: number, rows: number, aspect: number, loop: number | undefined): Fit {
  const D = set.distance;
  const fn = typeof shapes === "function";
  const span = loop ?? 30;
  const c = new Float64Array(9), m = new Float64Array(9);
  // with a known loop, a turning camera changes how everything is seen at each moment
  const around = set.spin !== 0 && loop !== undefined;
  const sides = set.spin !== 0 && loop === undefined ? 72 : 1;
  let ex = 0, ey = 0, zmin = Infinity, zmax = -Infinity;
  const seen = new Set<Body>();
  // The fastest anything turns, in radians a second: a shape's spins, an orbit, the camera's.
  let fastest = 0;
  for (const s of listAt(shapes, 0, "scene()")) {
    const b = body(s, "a scene"), p = typeof b.at === "function" ? ORBITS.get(b.at) : undefined;
    fastest = Math.max(fastest, b.spin.reduce((sum, x) => sum + Math.abs(rate(x, set.period)), 0), p ? TAU / p : 0);
  }
  fastest += Math.abs(rate(set.spin, set.period));
  const count = Math.min(2000, Math.max(240, Math.ceil((span * fastest) / 0.05)));
  const ball = loop === undefined || (span * fastest) / count > 0.05;
  for (let n = 0; n < count; n++) {
    const t = (n * span) / count;
    let moving = fn || around;
    for (const s of listAt(shapes, t, "scene()")) {
      const b = body(s, "a scene");
      if (moves(b) || around) moving = true;
      else if (seen.has(b)) continue;
      seen.add(b);
      const p = typeof b.at === "function" ? b.at(t) : b.at, k = b.scale;
      // a place a function of t gave that isn't one is drawn nowhere, so it needs no room
      if (!Array.isArray(p) || !Number.isFinite(p[0] + p[1] + p[2])) continue;
      if (ball && (turns(b) || sides > 1)) {
        const r = b.reach(t) * k;
        for (let i = 0; i < sides; i++) {
          if (sides > 1) camera(c, set.tilt, (TAU * i) / sides);
          else cameraAt(c, set, t, loop);
          const px = c[0] * p[0] + c[1] * p[1] + c[2] * p[2], py = c[3] * p[0] + c[4] * p[1] + c[5] * p[2], pz = c[6] * p[0] + c[7] * p[1] + c[8] * p[2];
          zmin = Math.min(zmin, pz - r);
          zmax = Math.max(zmax, pz + r);
          ex = Math.max(ex, side(px, pz + D, r));
          ey = Math.max(ey, side(py, pz + D, r));
        }
        continue;
      }
      cameraAt(c, set, t, loop);
      pose(m, b, t, set.period, loop, c);
      const px = c[0] * p[0] + c[1] * p[1] + c[2] * p[2], py = c[3] * p[0] + c[4] * p[1] + c[5] * p[2], pz = c[6] * p[0] + c[7] * p[1] + c[8] * p[2];
      const pts = corners(b, t);
      for (let i = 0; i < pts.length; i += 3) {
        const x = pts[i] * k, y = pts[i + 1] * k, w = pts[i + 2] * k;
        const X = m[0] * x + m[1] * y + m[2] * w + px, Y = m[3] * x + m[4] * y + m[5] * w + py, Z = m[6] * x + m[7] * y + m[8] * w + pz;
        if (!Number.isFinite(X + Y + Z)) continue;
        const d = Z + D;
        zmin = Math.min(zmin, Z);
        zmax = Math.max(zmax, Z);
        if (d <= NEAR) ex = ey = Infinity;
        else (ex = Math.max(ex, Math.abs(X) / d)), (ey = Math.max(ey, Math.abs(Y) / d));
      }
    }
    if (!moving) break;
  }
  // A cell of room all round, so the frame's outer ring stays empty, and a little more for the moments between those
  // looked at.
  ex *= 1.02;
  ey *= 1.02;
  const fitted = Math.min(ex > 0 ? Math.max(0.5, cols / 2 - 1) / (D * ex) : Infinity, ey > 0 ? (Math.max(0.5, rows / 2 - 1) * aspect) / (D * ey) : Infinity);
  let zoom = set.zoom ?? (set.fit ? fitted : (rows * aspect) / 8);
  if (!(zoom > 0 && Number.isFinite(zoom))) zoom = (rows * aspect) / 8;
  return { zoom, zmin: Number.isFinite(zmin) ? zmin : -1, zmax: Number.isFinite(zmax) ? zmax : 1 };
}

// Seconds after which everything in a scene is as it was, when every motion's period is known and they meet within a
// minute: the loop svg() plays.
function loopOf(shapes: readonly Shape3d[] | ((t: number) => readonly Shape3d[]), spin: number): number | undefined {
  if (typeof shapes === "function") return undefined;
  const periods: number[] = spin ? [TAU / Math.abs(spin)] : [];
  for (const s of shapes) {
    const b = body(s, "a scene");
    if (b.timed || typeof b.rotate === "function") return undefined;
    if (typeof b.at === "function") {
      const p = ORBITS.get(b.at);
      if (p === undefined) return undefined;
      periods.push(p);
    }
    for (const w of b.spin) if (w) periods.push(TAU / Math.abs(w));
  }
  if (!periods.length) return undefined;
  const top = Math.max(...periods);
  for (let k = 1; k * top <= 60 + 1e-9; k++) if (periods.every((p) => whole((k * top) / p))) return k * top;
  return undefined;
}

// A scene being drawn: its settings and fit, its depth buffer, and room for its shapes' corners as they are turned and
// seen. One for each play of a scene, or for each surface render3d() draws into.
class View {
  readonly cols: number;
  readonly rows: number;
  readonly aspect: number;
  readonly set: Settings;
  readonly fit: Fit;
  // the seconds the scene repeats in, if it does
  readonly loop: number | undefined;
  // a cell's nearness, 1 / depth, of what was drawn in it this frame: 0 for nothing
  readonly z: Float32Array;
  // For the points of one shape as they add up in a cell: the dark left, 1 minus each point's light multiplied in, 1
  // for none; the nearest point's nearness and how near it is in the scene, 0 to 1; and the cells they fell in.
  readonly dark: Float32Array;
  readonly nearest: Float32Array;
  readonly close: Float32Array;
  readonly lit: Int32Array;
  // nine numbers a corner: on screen x, y and 1 / depth; turned x, y, z; turned normal
  buf = new Float32Array(9 * 1024);
  // the camera's turn this frame, and the turn of the shape being drawn as the camera sees it, row by row
  readonly c = new Float64Array(9);
  readonly m = new Float64Array(9);
  #steps = new Map<string, Uint8Array>();
  #palette: unknown = null;

  constructor(cols: number, rows: number, aspect: number, set: Settings, fit: Fit, loop: number | undefined) {
    this.cols = cols;
    this.rows = rows;
    this.aspect = aspect;
    this.set = set;
    this.fit = fit;
    this.loop = loop;
    this.z = new Float32Array(cols * rows);
    this.dark = new Float32Array(cols * rows).fill(1);
    this.nearest = new Float32Array(cols * rows);
    this.close = new Float32Array(cols * rows);
    this.lit = new Int32Array(cols * rows);
  }

  // The palette indices of a colour's shades for this frame's page; null when the frame isn't coloured or the shape has
  // no colour, so it takes the ink.
  steps(s: Surface, color: string | undefined): Uint8Array | null {
    const { colors, colorBy, shades } = this.set;
    if (s.mono || !s.palette || (!colors && color === undefined)) return null;
    if (this.#palette !== s.palette) {
      this.#steps.clear();
      this.#palette = s.palette;
    }
    const key = (s.paper ? "p" : "d") + (colors ? "" : color);
    let st = this.#steps.get(key);
    if (!st) {
      const list = colors ? fade(colors, shades, s.paper) : shadesOf(color!, colorBy, shades, s.paper);
      st = Uint8Array.from(list, (h) => s.resolve(h));
      this.#steps.set(key, st);
    }
    return st;
  }

  draw(s: Surface, shapes: readonly Shape3d[], t: number): void {
    const { cols, rows, aspect, set, z } = this;
    const D = set.distance, f = this.fit.zoom * D, cx = cols / 2, cy = rows / 2;
    const [lx, ly, lz] = set.light, amb = set.ambient, chars = set.chars, nc = chars.length;
    const flip = set.invert === "auto" ? s.paper : set.invert;
    // nearness in the scene, 0 at its farthest to 1 at its nearest, is (zmax - z) * zk; all of it at one depth is near
    const zmax = this.fit.zmax, zspan = zmax - this.fit.zmin, zk = zspan > 1e-6 ? 1 / zspan : 0;
    const byDepth = set.colorBy === "depth";
    const c = this.c;
    z.fill(0);
    cameraAt(c, set, t, this.loop);
    for (const shape of shapes) {
      const b = body(shape, "a scene");
      const at = typeof b.at === "function" ? b.at(t) : b.at;
      // a function of t that gives no place puts the shape nowhere (a place that isn't numbers hides it too)
      if (!Array.isArray(at)) continue;
      pose(this.m, b, t, set.period, this.loop, c);
      const m = this.m, k = b.scale;
      const px = c[0] * at[0] + c[1] * at[1] + c[2] * at[2], py = c[3] * at[0] + c[4] * at[1] + c[5] * at[2], pz = c[6] * at[0] + c[7] * at[1] + c[8] * at[2];
      const steps = this.steps(s, b.color);
      const ns = steps ? steps.length : 0;

      if (b.mesh === null) {
        // Points: each lights its cell, a near one more than a far one, and the points in one cell add up, so a cloud
        // is brightest where it is densest. They hide behind surfaces drawn before them but not behind each other.
        const { dark, nearest, close, lit } = this;
        const { dots, char, glow } = b.cloud!;
        const pts = typeof dots === "function" ? dots(t) : null;
        const count = pts ? (Array.isArray(pts) ? pts.length : 0) : dots.length / 3;
        let n = 0;
        for (let i = 0; i < count; i++) {
          let x: number, y: number, w: number;
          if (pts) {
            const p = pts[i];
            if (!p) continue;
            (x = p[0] * k), (y = p[1] * k), (w = p[2] * k);
          } else (x = (dots as Float32Array)[i * 3] * k), (y = (dots as Float32Array)[i * 3 + 1] * k), (w = (dots as Float32Array)[i * 3 + 2] * k);
          const X = m[0] * x + m[1] * y + m[2] * w + px, Y = m[3] * x + m[4] * y + m[5] * w + py, Z = m[6] * x + m[7] * y + m[8] * w + pz;
          const d = Z + D;
          if (!(d >= NEAR)) continue;
          const q = 1 / d;
          const col = Math.floor(cx + f * X * q), row = Math.floor(cy - (f * Y * q) / aspect);
          // written so that a point that isn't numbers is left out too
          if (!(col >= 0 && col < cols && row >= 0 && row < rows)) continue;
          const cell = row * cols + col;
          if (q <= z[cell]) continue;
          let g = zk ? (zmax - Z) * zk : 1;
          g = g < 0 ? 0 : g > 1 ? 1 : g;
          if (nearest[cell] === 0) lit[n++] = cell;
          // the nearest points give their glow, the farthest half of it
          dark[cell] *= 1 - glow * (0.5 + 0.5 * g);
          if (q > nearest[cell]) (nearest[cell] = q), (close[cell] = g);
        }
        for (let j = 0; j < n; j++) {
          const cell = lit[j], v = 1 - dark[cell], g = close[cell];
          z[cell] = nearest[cell];
          dark[cell] = 1;
          nearest[cell] = 0;
          let ci = (v * nc) | 0;
          if (ci >= nc) ci = nc - 1;
          const ch = char || chars[ci];
          // a space draws nothing: what is under it shows, though it still hides what is behind it
          if (ch === 32) continue;
          let shade = NONE;
          if (steps) {
            const si = ((byDepth ? g : v) * ns) | 0;
            shade = steps[si >= ns ? ns - 1 : si];
          }
          s.put(cell, ch, shade);
        }
        continue;
      }

      // its triangles at the size it is on screen, by the depth of its centre
      const mesh = b.mesh((f * k) / Math.max(pz + D, NEAR), t);
      const { pos, nrm, uv, tri, closed } = mesh;
      const nv = pos.length / 3;
      if (this.buf.length < nv * 9) this.buf = new Float32Array(nv * 9);
      const V = this.buf;
      for (let i = 0, a = 0, o = 0; i < nv; i++, a += 3, o += 9) {
        const x = pos[a] * k, y = pos[a + 1] * k, w = pos[a + 2] * k;
        const X = m[0] * x + m[1] * y + m[2] * w + px, Y = m[3] * x + m[4] * y + m[5] * w + py, Z = m[6] * x + m[7] * y + m[8] * w + pz;
        const nx = nrm[a], ny = nrm[a + 1], nz = nrm[a + 2];
        V[o + 3] = X;
        V[o + 4] = Y;
        V[o + 5] = Z;
        V[o + 6] = m[0] * nx + m[1] * ny + m[2] * nz;
        V[o + 7] = m[3] * nx + m[4] * ny + m[5] * nz;
        V[o + 8] = m[6] * nx + m[7] * ny + m[8] * nz;
        const d = Z + D;
        // behind the camera, or too near it: its triangles are left out
        if (!(d >= NEAR)) {
          V[o + 2] = -1;
          continue;
        }
        const q = 1 / d;
        V[o] = cx + f * X * q;
        V[o + 1] = cy - (f * Y * q) / aspect;
        V[o + 2] = q;
      }
      const tex = b.texture;
      for (let j = 0; j < tri.length; j += 3) {
        const ia = tri[j], ib = tri[j + 1], ic = tri[j + 2];
        const A = ia * 9, B = ib * 9, C = ic * 9;
        const q0 = V[A + 2], q1 = V[B + 2], q2 = V[C + 2];
        if (q0 < 0 || q1 < 0 || q2 < 0) continue;
        const x0 = V[A], y0 = V[A + 1], x1 = V[B], y1 = V[B + 1], x2 = V[C], y2 = V[C + 1];
        // the cells whose centres it may cover
        let c0 = Math.ceil((x0 < x1 ? (x0 < x2 ? x0 : x2) : x1 < x2 ? x1 : x2) - 0.5);
        let c1 = Math.floor((x0 > x1 ? (x0 > x2 ? x0 : x2) : x1 > x2 ? x1 : x2) - 0.5);
        let r0 = Math.ceil((y0 < y1 ? (y0 < y2 ? y0 : y2) : y1 < y2 ? y1 : y2) - 0.5);
        let r1 = Math.floor((y0 > y1 ? (y0 > y2 ? y0 : y2) : y1 > y2 ? y1 : y2) - 0.5);
        if (c0 < 0) c0 = 0;
        if (r0 < 0) r0 = 0;
        if (c1 >= cols) c1 = cols - 1;
        if (r1 >= rows) r1 = rows - 1;
        if (c0 > c1 || r0 > r1) continue;
        const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
        if (!area) continue;
        // Which way it faces: its own normal, turned to agree with its corners' normals. Turned away from the camera, a
        // closed shape's triangle is behind another; an open one's is seen from its back, so it is lit from there.
        const ex = V[B + 3] - V[A + 3], ey = V[B + 4] - V[A + 4], ez = V[B + 5] - V[A + 5];
        const fx = V[C + 3] - V[A + 3], fy = V[C + 4] - V[A + 4], fz = V[C + 5] - V[A + 5];
        let gx = ey * fz - ez * fy, gy = ez * fx - ex * fz, gz = ex * fy - ey * fx;
        if (gx * (V[A + 6] + V[B + 6] + V[C + 6]) + gy * (V[A + 7] + V[B + 7] + V[C + 7]) + gz * (V[A + 8] + V[B + 8] + V[C + 8]) < 0) (gx = -gx), (gy = -gy), (gz = -gz);
        const away = gx * V[A + 3] + gy * V[A + 4] + gz * (V[A + 5] + D) > 0;
        if (away && closed) continue;
        const sign = away ? -1 : 1;
        const inv = 1 / area;
        for (let r = r0; r <= r1; r++) {
          const sy = r + 0.5;
          for (let cc = c0; cc <= c1; cc++) {
            const sx = cc + 0.5;
            const w0 = ((x1 - sx) * (y2 - sy) - (x2 - sx) * (y1 - sy)) * inv;
            const w1 = ((x2 - sx) * (y0 - sy) - (x0 - sx) * (y2 - sy)) * inv;
            const w2 = 1 - w0 - w1;
            if (w0 < -1e-9 || w1 < -1e-9 || w2 < -1e-9) continue;
            const q = w0 * q0 + w1 * q1 + w2 * q2;
            const i = r * cols + cc;
            if (q <= z[i]) continue;
            z[i] = q;
            // the corners' share of this point, by depth, so normals and u, v follow the perspective
            const a0 = (w0 * q0) / q, a1 = (w1 * q1) / q, a2 = 1 - a0 - a1;
            const nx = a0 * V[A + 6] + a1 * V[B + 6] + a2 * V[C + 6];
            const ny = a0 * V[A + 7] + a1 * V[B + 7] + a2 * V[C + 7];
            const nz = a0 * V[A + 8] + a1 * V[B + 8] + a2 * V[C + 8];
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            let v = len > 0 ? (sign * (nx * lx + ny * ly + nz * lz)) / len : 0;
            v = (v > 0 ? v : 0) * (1 - amb) + amb;
            if (tex) {
              const g = tex(a0 * uv[ia * 2] + a1 * uv[ib * 2] + a2 * uv[ic * 2], a0 * uv[ia * 2 + 1] + a1 * uv[ib * 2 + 1] + a2 * uv[ic * 2 + 1]);
              v *= g > 0 ? (g < 1 ? g : 1) : 0;
            }
            let ci = (v * nc) | 0;
            if (ci >= nc) ci = nc - 1;
            const ch = chars[flip ? nc - 1 - ci : ci];
            // a space draws nothing: what is under it shows, though it still hides what is behind it
            if (ch === 32) continue;
            let shade = NONE;
            if (steps) {
              let g = byDepth ? (zk ? (zmax - (1 / q - D)) * zk : 1) : v;
              g = g < 0 ? 0 : g;
              const si = (g * ns) | 0;
              shade = steps[si >= ns ? ns - 1 : si];
            }
            s.put(i, ch, shade);
          }
        }
      }
    }
  }
}

// The scene's one fade for a page: its own list for the page when it has one for each, as it is; else its stops spread,
// each made to read on the page, as a shape's colour is.
function fade(colors: PaletteSpec, shades: number, paper: boolean): readonly string[] {
  const f = spread(colors, shades);
  if (Array.isArray(f)) return f.map((c) => legible(c, paper));
  return paper ? (f as { light: readonly string[] }).light : (f as { dark: readonly string[] }).dark;
}

// The views render3d() has made for each surface, the latest last, each for a list of shapes and options as they were
// passed: a list with the same shapes in the same order, and options with the same values, find their view again, so
// a list or options written out inside the drawing don't make it measure the scene again every frame.
interface Kept {
  shapes: readonly Shape3d[];
  key: string;
  view: View;
}
const VIEWS = new WeakMap<Surface, Kept[]>();
const same = (a: readonly Shape3d[], b: readonly Shape3d[]) => a.length === b.length && a.every((s, i) => s === b[i]);

/**
 * Draws shapes at t seconds into a grid you already have, over what is there: each cell a shape covers takes the
 * nearest surface's character and colour, and the rest are left as they were. Use it inside piece() to mix 3D with
 * text, lines and the rest; scene() is this with the piece made for you. Coloured shapes take the nearest colours the
 * piece has, so give piece() a palette with them. The options are scene()'s, each with the same default. The fit (and
 * the loop the spins are rounded to) is worked out the first time it sees a list of shapes and options, and kept for
 * the same shapes in the same order with options of the same values, so make the shapes once, outside the drawing,
 * and move them with at, rotate and spin; shapes made anew every frame are measured anew every frame. Throws, saying
 * what to change, for a surface, shapes or options it can't take.
 *
 *   const shapes = [cube({ spin: [0.5, 0.7, 0] })];
 *   export default piece({ name: "box", cols: 40, rows: 20 }, (t, s) => {
 *     render3d(s, shapes, t);
 *     s.write(1, 19, "a cube");
 *   });
 */
export function render3d(s: Surface, shapes: readonly Shape3d[], t: number, o: SceneOptions = {}): void {
  if (!(s instanceof Surface)) fail(`render3d() takes the surface to draw into first, the one a piece's drawing is given, not ${shown(s)}`);
  if (!Array.isArray(shapes)) fail(`render3d() takes a list of shapes, such as [torus()], not ${shown(shapes)}`);
  const key = o !== null && typeof o === "object" ? JSON.stringify(o) : "";
  let kept = VIEWS.get(s);
  if (!kept) VIEWS.set(s, (kept = []));
  let v = kept.find((k) => k.key === key && same(k.shapes, shapes));
  if (!v) {
    const set = settings(o, "render3d()");
    orbits(shapes.map((x) => body(x, "render3d()")), set.period);
    const loop = set.period ?? loopOf(shapes, set.spin);
    v = { shapes: [...shapes], key, view: new View(s.cols, s.rows, s.aspect, set, measure(shapes, set, s.cols, s.rows, s.aspect, loop), loop) };
    // a few at most: a drawing that makes new shapes every frame finds none of them again
    if (kept.push(v) > 8) kept.shift();
  }
  v.view.draw(s, shapes, Number.isFinite(t) ? t : 0);
}

/**
 * A scene of shapes as a piece: 64 by 24 unless you give a size, named "scene", in the "shapes" category. `shapes` is a
 * list, or a function of t that gives one, for shapes that come and go (its colours must all be in its list at t = 0,
 * since a piece's colours are fixed when it is made). Shapes with colours make it coloured: each colour in `shades`
 * steps for each page, plus the ink for shapes with none. It moves at 30 frames a second when anything in it moves, and
 * is a still when nothing does; it loops by `period`, or by itself when its motions all repeat within a minute. Throws,
 * saying what to change, for an option it can't take.
 *
 *   export default scene({ name: "donut", cols: 40, rows: 22 }, [torus({ spin: [0.8, 0, 0.35] })]);
 */
export function scene<O extends Options = Options>(spec: MakerSpec<O> & SceneOptions, shapes: readonly Shape3d[] | ((t: number) => readonly Shape3d[])): KitPiece<O> {
  const base = specOf<O>(spec, "scene");
  const set = settings((spec ?? {}) as SceneOptions, "scene()");
  if (typeof shapes !== "function" && !Array.isArray(shapes)) fail(`scene() takes a list of shapes, such as [torus()], or a function of t that gives one, not ${shown(shapes)}`);
  const first = listAt(shapes, 0, "scene()").map((s) => body(s, "a scene"));
  orbits(first, set.period);

  // Its colours: the scene's one fade, or each shape colour's shades for each page, and the ink for shapes with none.
  let palette: PaletteSpec | undefined = base.palette, ink: Themed<Color> | undefined = base.ink;
  if (palette === undefined && set.colors) palette = { light: fade(set.colors, set.shades, true), dark: fade(set.colors, set.shades, false) };
  else if (palette === undefined) {
    const used = [...new Set(first.map((b) => b.color).filter((c): c is string => !!c))];
    if (used.length) {
      const light = used.flatMap((c) => shadesOf(c, set.colorBy, set.shades, true));
      const dark = used.flatMap((c) => shadesOf(c, set.colorBy, set.shades, false));
      const plain = first.some((b) => b.color === undefined);
      if (plain) {
        light.push(INK.light);
        ink = dark.push(INK.dark) - 1;
      }
      if (light.length > 32)
        fail(`this scene's colours come to ${light.length} a page, ${used.length} colours in ${set.shades} shades each${plain ? " and the ink for shapes with none" : ""}, past the 32 a page a piece can have: use fewer colours or fewer shades`);
      palette = { light, dark };
    }
  }

  const moving = typeof shapes === "function" || set.spin !== 0 || first.some(moves);
  const repeats = set.period ?? loopOf(shapes, set.spin);
  const loop = base.loop ?? repeats;
  const aspect = base.cell === 1 ? 1 : 2;
  const made = piece<O>(
    { ...base, category: base.category ?? "shapes", fps: base.fps ?? (moving ? 30 : 0), palette, ink, ...(loop !== undefined ? { loop } : {}) },
    {
      setup: (_, size) => {
        const view = new View(size.cols, size.rows, aspect, set, fit, repeats);
        return (t, s) => view.draw(s, listAt(shapes, t, "scene()"), t);
      },
    },
  );
  // after piece(), which has checked the size; over the loop the scene's own motions make, not one it was given
  const fit = measure(shapes, set, base.cols, base.rows, aspect, repeats);
  return made;
}
