/*
 * solid: a 3D shape turning, lit and shaded in characters, with a caption
 * under it. The shape is the kit's own, drawn by its 3D renderer: a torus, a
 * cube, a sphere, a cone, a cylinder, or one of its clouds of points (a
 * galaxy, a helix, a ring), patterned with the kit's textures, on a turntable
 * as spinning() turns one or tumbling as the donut does. A README's hero
 * ornament.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii solid
 *   torus "ascii.rest"
 *   ```
 *
 *   solid('torus "ascii.rest"')
 *   solid({ shape: "sphere", texture: "bands", caption: "planet" }, { turn: "tumble" })
 */
import { Surface, fail } from "../kit/core.ts";
import { wholeOf, wordOf } from "../kit/recipes/checks.ts";
import { cone, cube, cylinder, group, points, render3d, sphere, torus, type SceneOptions, type Shape3d, type TextureName } from "../kit/shapes3d.ts";
import { ACCENT, INK, SOFT, clean, component, progress, show, shown, statements, type Common, type MarkdownPiece } from "./core.ts";

/** The shapes: the kit's solids, then its clouds of points. */
export const SOLID_SHAPES = ["torus", "cube", "sphere", "cone", "cylinder", "galaxy", "helix", "ring"] as const;
export type SolidShape = (typeof SOLID_SHAPES)[number];
/** The kit's textures, for a solid shape's surface. */
export const SOLID_TEXTURES = ["bands", "stripes", "checker", "grid", "spots"] as const;

/** A solid as data: what a fence's body says, for words already in JavaScript. */
export interface SolidData {
  /** The shape: "torus" (the default), "cube", "sphere", "cone", "cylinder", or a cloud, "galaxy", "helix" or "ring". */
  shape?: SolidShape;
  /** A pattern on a solid shape's surface, the kit's: "bands", "stripes", "checker", "grid" or "spots". None by default. */
  texture?: TextureName;
  /** Words under it: "ascii.rest". None by default. */
  caption?: string;
}

export interface SolidOptions extends Common {
  /** How it turns: "turntable" (the default), round an upright axis, seen from a little above; or "tumble", over and round as the donut does. */
  turn?: "turntable" | "tumble";
  /** Rows the shape is drawn in, before the rows it never reaches are cut: 11, a whole number from 5 to 40. */
  rows?: number;
}

// The build: the shape grows from a point while it turns, and the caption types in.
const INTRO = 0.9, CAPTION_FROM = 0.3;
// Once round in 8 seconds on a turntable; a tumble's second axis goes half as fast, so it comes round in 16.
const TURN = 8;
const CLOUDS = ["galaxy", "helix", "ring"];
// donut.c's ramp, the kit's default: the dimmer half soft, the brighter half ink.
const RAMP = ".,-~:;=!*#$@";
const toneOf = (ch: string) => (RAMP.indexOf(ch) >= 0 && RAMP.indexOf(ch) < RAMP.length / 2 ? SOFT : INK);

// The fence's body: the shape's name, a texture's name if you like, and a quoted caption.
function parse(source: string): SolidData {
  const words: string[] = [];
  let caption: string | undefined;
  for (const s of statements(source, "solid")) {
    const key = Object.keys(s.attrs)[0];
    if (key !== undefined) fail(`solid's line ${s.line} has ${key}=${show(s.attrs[key])}: its options go on the fence, as \`\`\`ascii solid ${key}=${s.attrs[key] && s.attrs[key].length <= 40 ? s.attrs[key] : "..."}`);
    words.push(...s.words);
    for (const text of s.texts) {
      if (caption !== undefined) fail(`solid takes one quoted caption, and line ${s.line} has another: ${show(text)}`);
      caption = text;
    }
  }
  if (words.length > 2) fail(`solid takes a shape and a texture, then a quoted caption, and has ${show(words.slice(2).join(" "))} too: put words to show in quotes`);
  return { ...(words[0] !== undefined ? { shape: words[0] as SolidShape } : {}), ...(words[1] !== undefined ? { texture: words[1] as TextureName } : {}), ...(caption !== undefined ? { caption } : {}) };
}

// Data, checked: a shape and texture the kit has, a caption cleaned onto one line.
function check(data: SolidData): { shape: SolidShape; texture: TextureName | undefined; caption: string } {
  if (!data || typeof data !== "object" || Array.isArray(data)) fail(`solid() takes a fence's body, such as torus "ascii.rest", or { shape, texture, caption }, not ${show(data)}`);
  const shape = wordOf("solid's shape", data.shape, SOLID_SHAPES, "torus");
  const texture = data.texture === undefined ? undefined : wordOf("solid's texture", data.texture, SOLID_TEXTURES, "bands");
  if (texture && CLOUDS.includes(shape)) fail(`solid's texture is for a solid shape, and a ${shape} is a cloud of points: leave out ${show(texture)}, or turn a torus, cube, sphere, cone or cylinder`);
  if (data.caption !== undefined && typeof data.caption !== "string") fail(`solid's caption takes words, not ${show(data.caption)}`);
  const caption = data.caption === undefined ? "" : clean(data.caption, "solid's caption").replace(/\s+/g, " ").trim();
  return { shape, texture, caption };
}

// The kit's shape by name.
function shapeOf(shape: SolidShape, texture: TextureName | undefined): Shape3d {
  if (CLOUDS.includes(shape)) return points(shape as "galaxy" | "helix" | "ring");
  const o = texture ? { texture } : {};
  return { torus, cube, sphere, cone, cylinder }[shape as "torus"](o);
}

/**
 * A 3D shape turning, with a caption under it, from a fence's body, `torus "ascii.rest"`, or { shape, texture,
 * caption }. Drawn by the kit's 3D renderer, unframed, 32 columns wide, the rows it never reaches cut. It grows from a
 * point while it turns, then turns once every 8 seconds while it is in view (16 for a tumble); its still is its rest
 * angle.
 *
 *   solid('cube "ascii.rest"', { turn: "tumble" })
 *   solid('sphere spots "a planet"', { width: 40, rows: 15 })
 */
export function solid(source: string | SolidData, options?: SolidOptions): MarkdownPiece {
  const { shape, texture, caption } = check(typeof source === "string" ? parse(source) : source);
  return component(
    "solid",
    options,
    ["turn", "rows"],
    (o, room) => {
      const turn = wordOf("solid's turn", o.turn, ["turntable", "tumble"] as const, "turntable");
      const tall = wholeOf("solid's rows", o.rows, 11, 5, 40);
      const framed = o.frame !== undefined && o.frame !== "none";
      if (room.cols !== undefined && caption.length > room.cols) fail(`solid needs ${caption.length + (o.width! - room.cols)} columns for its caption ${show(caption)}, and its width is ${o.width}: give it a width of ${caption.length + (o.width! - room.cols)} or more, or a shorter caption`);
      if (caption.length > room.max) fail(`solid needs ${caption.length} columns for its caption ${show(caption)}, past the ${room.max} it can take: a shorter caption`);
      const W = room.cols ?? Math.max(framed ? 28 : 32, caption.length);
      // a turntable as spinning() turns one, seen from a little above, with a soft light everywhere; a tumble as the donut
      const cycle = turn === "turntable" ? TURN : 2 * TURN;
      const round = (2 * Math.PI) / TURN;
      const spin: [number, number, number] = turn === "turntable" ? [0, round, 0] : [round, 0, round / 2];
      const thing = group([shapeOf(shape, texture)], { spin, center: true });
      const scene: SceneOptions = { camera: turn === "turntable" ? { tilt: "above" } : {}, ambient: "soft", period: cycle, invert: false };
      // the shape is drawn off to one side, then copied in by its characters' tones
      const off = new Surface(W, tall);
      const at = (t: number) => {
        off.clear();
        render3d(off, thing, t, scene);
      };
      // the rows it reaches as it turns: the rest are cut, top and bottom
      let first = tall, last = -1;
      for (let i = 0; i < 64; i++) {
        at((i / 64) * cycle);
        for (let y = 0; y < tall; y++)
          for (let x = 0; x < W; x++)
            if (off.get(x, y) && off.get(x, y) !== " ") ((first = Math.min(first, y)), (last = Math.max(last, y)));
      }
      if (last < 0) ((first = 0), (last = tall - 1));
      const shown3d = last - first + 1;
      const cx = (W - 1) / 2, cy = (tall - 1) / 2;
      return {
        cols: W,
        rows: shown3d + (caption ? 2 : 0),
        intro: INTRO,
        cycle,
        fps: 20,
        says: `solid: a ${shape}${texture ? ` with ${texture}` : ""} ${turn === "turntable" ? "turning" : "tumbling"}${caption ? `, ${caption}` : ""}.`,
        draw(s, t, place) {
          // the turn's time: 0 at the still, before it through the build, and round to 0 again a cycle on
          const k = (t - INTRO) / cycle;
          const turnAt = t < INTRO ? t - INTRO : (k - Math.floor(k) > 1 - 1e-9 ? 0 : k - Math.floor(k)) * cycle;
          at(turnAt);
          // it grows from a point at the middle: each cell reads the shape that far out from the middle
          const p = progress(t, 0, INTRO);
          const grow = p >= 1 ? 1 : 1 - (1 - p) * (1 - p) * (1 - p);
          if (grow <= 0) return;
          for (let y = first; y <= last; y++)
            for (let x = 0; x < W; x++) {
              const sx = grow >= 1 ? x : Math.round(cx + (x - cx) / grow), sy = grow >= 1 ? y : Math.round(cy + (y - cy) / grow);
              const ch = off.get(sx, sy);
              if (ch && ch !== " ") s.set(place.x + x, place.y + y - first, ch, toneOf(ch));
            }
          // the caption types in under it
          const typed = shown(t, CAPTION_FROM, caption.length, caption.length / (INTRO - CAPTION_FROM - 0.05));
          if (typed) s.write(place.x + Math.floor((W - caption.length) / 2), place.y + shown3d + 1, caption.slice(0, typed), ACCENT);
        },
      };
    },
    { frame: "none" },
  );
}
