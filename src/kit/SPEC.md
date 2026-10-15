# ascii.rest/kit: the spec

The kit is what makes ascii.rest a framework for making ascii art, not only a
library of 217 finished pieces. Today every piece hand-rolls its maths, its
ramps, its z-buffer, its PRNG and its string building (44 pieces carry their
own mulberry32, 71 their own hash, 40 their own ramp, 52 their own noise).
The kit does that work once, so a user gets something impressive in 3 to 10
lines, and everything it makes is a normal `Piece`: it plays through `mount()`,
`<Ascii piece>`, `<ascii-art src>`, `svg()` for a README and `play()` in a
terminal, unchanged.

Ideas taken from the best tools: three.js AsciiEffect (a ramp over a rendered
brightness, inverted on demand), p5.js (seeded `random`, `noise`, `map`,
`lerp`, easing, a draw callback over time), rot.js (a seeded RNG object with
`getItem`, `shuffle`, `getNormal`), drawille (a braille canvas of 2x4 dots a
cell with set/unset/toggle/line), asciichart (plots on a grid), Lip Gloss and
Bubble Tea (borders, padding, alignment, join horizontally and vertically),
figlet (block letters: we have `banner()`), aalib (ordered dithering),
ascii-magic (image to ascii as one call).

Read `src/kit/core.ts` before anything else: it is the contract below in code,
with tests in `src/kit/core.test.ts`.

## 1. Layout, rules and workflow

| What | Where |
| --- | --- |
| a module | `src/kit/<module>.ts` |
| its tests | `src/kit/<module>.test.ts` (node:test, node:assert/strict) |
| its examples | `examples/kit/<module>-<name>.ts`, each `export default` a piece made with the kit |
| generated data | `src/kit/<name>-data.ts` (for image: `src/kit/glyphs.ts`), made by `scripts/kit/<name>.ts`, both committed |
| the public entry | `src/kit/index.ts`, published as `ascii.rest/kit` (`package.json` `exports["./kit"]`) |

Rules every module follows:

- Import only from `./core.ts` (and `../types.ts`, `../banner.ts` types if
  needed). Modules are written in parallel, so a module never imports another
  module (draw, field, math, shapes3d, particles, fx, compose, image). Anything
  two modules both need is already in core; if it is not, implement it
  privately in your module and say so in your report so integration can move it
  into core. Do not edit `core.ts`, `index.ts`, `package.json` or the tsconfigs:
  list the exports to add to `index.ts` in your report, and integration adds
  them.
- The 217 library pieces in `src/pieces` never import the kit. Do not touch
  them. `npm run check` must stay 217/217 ok.
- Edit and create files only with the Edit and Write tools. No em or en dashes
  anywhere (code, comments, docs, commit messages): use a colon, a comma or a
  full stop.
- Comment like `src/banner.ts` and `src/svg.ts`: a header comment saying what
  the module is, ending with a short usage example; a short plain-English
  comment above each export and above any code whose reason isn't obvious.
- Throw with `fail("...")` from core: `Error("ascii.rest: <what is wrong and
  what to change>")`, the way banner.ts words them: `glint.every takes a number
  of seconds above 0, not -1`. Check every option a user passes at the moment
  the piece is made, not on the first frame.
- `erasableSyntaxOnly` is on: no enums, no namespaces, no constructor parameter
  properties. Imports carry their `.ts` extension.
- Node 26 runs the sources directly. Verify with: `npm run typecheck`,
  `node --test src/kit/<module>.test.ts`, `npm run kit -- examples/kit/<file>.ts
  [--at 0,1,2] [--paper] [--mono] [--svg out.svg] [--dark]` for every example
  (it checks the frame contract, the same frame for the same t, the time a
  frame takes, prints frames, and writes the SVG), `npm run build`, and
  `npm run check`. Report real output; never claim what you did not run.
- Performance: at 64 by 24 a frame takes under 4 ms on average, as the library's
  pieces must; at a scene's 200 by 100, under 10 ms. Allocate in setup, not per
  frame.

## 2. The core (src/kit/core.ts, done)

### The grid

```ts
export const EMPTY = 0;     // a cell with nothing drawn: transparent when laid over, a space in the frame
export const NONE = 255;    // a cell's colour that is not set: the piece's ink
export interface Region { x: number; y: number; cols: number; rows: number }

export class Surface {
  readonly cols: number; readonly rows: number;
  readonly chars: Uint16Array;   // one UTF-16 code unit a cell, EMPTY where nothing is drawn
  readonly colors: Uint8Array;   // an index into meta.palette (absolute, as env.color takes it), or NONE
  readonly aspect: number;       // a cell's height in cell widths: 2 (meta.cell 2, the default) or 1
  palette: Palette | null;       // null for a piece in one ink
  paper: boolean;                // env.paper: dark on a light page
  mono: boolean;                 // no env.color: drawn as text in one ink, colours not shown
  constructor(cols: number, rows: number, o?: { palette?: Palette | null; aspect?: number });
  index(x: number, y: number): number;              // -1 outside; fractions floored
  resolve(color: Color | undefined): number;        // the absolute index for this frame's theme; NONE for none or no palette
  set(x: number, y: number, ch: string, color?: Color): void;  // "" clears, " " is an opaque blank
  put(i: number, code: number, color?: number): void;          // raw, by index: for hot loops
  get(x: number, y: number): string;                // "" for EMPTY or outside
  colorAt(x: number, y: number): number;
  clear(region?: Region): void;
  fill(ch: string, color?: Color, region?: Region): void;
  clip(region?: Region): Region;                    // cut to the grid, whole cells
  write(x: number, y: number, text: string, color?: Color): void; // left to right, "\n" to the next row at x
  paste(src: Surface, x: number, y: number, o?: { mask?: string | null; map?: ArrayLike<number> }): void;
  load(text: string, color?: ArrayLike<number>): this;  // a frame back into the grid: spaces become EMPTY
  frame(env?: Env): string;                         // the frame text; writes env.color (ink for NONE)
  toString(): string;
  clone(): Surface;
  static from(text: string, color?: ArrayLike<number>, palette?: Palette | null): Surface;
}
export function code(ch: string): number;  // a character's code for a cell, checked (printable, BMP)
```

Coordinates: `x` is the column and `y` the row, from 0, 0 at the top left.
A fraction is floored to its cell; a cell's centre is `x + 0.5`. Drawing outside
the grid is left out silently (never an error). A cell holds one BMP character:
`set` throws for control characters and astral characters (emoji), because
`mount()` reads a frame one UTF-16 unit a cell. Braille (U+2800 to U+28FF), box
drawing and block elements are all fine.

Transparency: a cell is transparent when it is EMPTY. `paste` (and every layering
in the kit) also treats a `mask` character as transparent, a space by default,
because a frame read back from a piece cannot tell a drawn space from an empty
cell. `mask: null` makes only EMPTY transparent.

### Colours

```ts
export type Color = number | string;  // an index into the piece's colours for the page's theme, or #rrggbb
export type PaletteSpec = readonly string[] | { readonly light: readonly string[]; readonly dark: readonly string[] };
export type Themed<T> = T | { readonly light: T; readonly dark: T };
export const INK: { light: "#1f2328"; dark: "#f0f6fc" };  // GitHub's text colours, banner()'s inks

export class Palette {
  readonly colors: readonly string[];  // meta.palette: light then dark when themed; one colour is listed twice
  readonly themed: boolean;
  readonly size: number;               // colours a theme
  constructor(spec: PaletteSpec, ink?: Themed<Color>);
  index(c: Color, paper?: boolean): number;  // absolute index for env.color
  ink(paper?: boolean): number;
}
export function rgb(hex: string): [number, number, number];
export function hex(rgb: readonly number[]): string;
export function isHex(v: unknown): v is string;
export function mix(a: string, b: string, k: number): string;
export function gradient(stops: readonly string[], n: number): string[];
export function spread(stops: PaletteSpec, n: number): PaletteSpec;   // gradient for each theme
export function nearest(colors: readonly string[], color: string, from?: number, to?: number): number;
export function mergePalettes(parts: readonly (readonly string[] | undefined)[]):
  { palette: string[]; maps: Uint8Array[]; ink: { light: number; dark: number } | null };
```

How colours work, everywhere in the kit:

- A piece's colours are fixed when it is made (`meta.palette`), because the
  players read them before the first frame. So every maker builds its palette
  from what the user passes (stops, shape colours, particle colours) at the
  moment it is called.
- A palette is one list for both themes, or `{ light, dark }` of the same length.
  Themed, it is laid out as the library's logos are, light then dark, and colour
  `i` means index `i` on paper and `size + i` on a dark page. `Palette.index`
  does this; nothing else should do the arithmetic.
- A colour the user gives is a `Color`: a number is an index into the piece's
  colours for the page's theme (so `1` is "my second colour" on both themes);
  `#rrggbb` is found in the theme's colours, exactly or else the nearest. A
  colour on a piece with no palette is ignored (it is text in the page's colour);
  say so in docs where it matters.
- The grid stores absolute palette indices, so a piece read back with `sample()`
  and laid into another keeps its colours. Combining pieces merges their palettes
  with `mergePalettes` (each colour once, up to 64) and remaps each part's
  indices through its map. A part with no palette is drawn in `INK` in a coloured
  composition (mergePalettes adds it and says where).
- A cell with no colour (NONE) takes the piece's ink: its first colour by
  default, `ink` in the spec otherwise.
- Without env.color (`s.mono`), the piece is text in one ink: colours are not
  drawn, so a module that conveys something by colour alone must also convey it
  by character where it can (as the logos do with their glint).
- A ground (`meta.ground`) makes mount() and svg() draw the piece for that ground
  whatever the page: paper is then derived from the ground.

### Ramps and shading

```ts
export const ramps: {
  standard: " .:-=+*#%@"; detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  donut: " .,-~:;=!*#$@"; blocks: " ░▒▓█"; eighths: " ▁▂▃▄▅▆▇█"; dots: " .·•●"; lines: " .-=≡"; stars: " .·+*"; binary: " #";
};
export type RampName = keyof typeof ramps;
export function ramp(r?: RampName | string): string;   // a name, or 2+ characters of your own
export function shadeChar(chars: string, v: number, flip?: boolean, jitter?: number): string;
export function bayer(x: number, y: number): number;   // ordered 4x4 dither threshold, -0.5 to 0.5
```

`v` is brightness 0 to 1, clamped. `flip` turns the ramp round: modules pass
`s.paper` when their option `invert` is `"auto"` (the default), the library's
habit (donut, plasma) so a lit surface reads as lit on a light page. A shaded
cell whose character is a space is left EMPTY, so shaded things layer.

### Maths in core (the math module re-exports these; never re-implement them)

```ts
export const TAU: number;
export function clamp(v: number, lo?: number, hi?: number): number;   // 0..1 by default
export function lerp(a: number, b: number, k: number): number;
export function smoothstep(e0: number, e1: number, v: number): number;
export function fract(v: number): number;
export function hash(a: number, b?: number, c?: number, d?: number): number;  // 0..1 from whole numbers
export function mulberry32(seed: number): () => number;
export function valueNoise(x: number, y: number, seed?: number): number;     // 0..1
```

### Time

`t` is play time in seconds from 0. A frame depends only on `t` (and the
options): the players seek (svg() samples a loop out of order at 15 fps,
reduced motion jumps to `meta.still`), so no module may keep state that makes a
frame depend on the frames before it, unless it re-simulates from a seed up to t
deterministically. All randomness is seeded (`mulberry32`, `hash`, math's
`random`); `Math.random` and `Date` are never used (a clock piece sets `clock`).

A piece that repeats exactly sets `meta.loop` to its period in seconds: that is
the loop `svg()` plays. Every module that animates on a period exposes it as an
option (`period`, or `every` for something that comes now and then) and sets
`meta.loop` from it. When an effect or a layout combines a source's loop `a`
with its own period `b`, `meta.loop` is the least common multiple of the two
when it is at most 60 seconds (computed on hundredths of a second), else it is
left unset (svg() then plays 4 seconds). A source with no loop and a still
source (fps 0) count as having the effect's period.

### Pieces

```ts
export interface PieceSpec<O extends Options = Options> {
  name: string; note?: string; category?: Category;   // note: the name; category: "generative"
  cols: number; rows: number; fps?: number;           // fps: 30, 0 for a still
  palette?: PaletteSpec; ink?: Themed<Color>;
  ground?: string; cell?: 1 | 2; loop?: number; still?: number; clock?: boolean;
  options?: O;                                        // ctx.options: defaults with the caller's on top
  clear?: boolean;                                    // empty the grid before each frame: true
}
export interface Context<O> { options: O; paper: boolean; mono: boolean; cols: number; rows: number }
export type Draw<O> = (t: number, s: Surface, ctx: Context<O>) => void;
export type Setup<O> = (options: O, size: { cols: number; rows: number }) => Draw<O>;
export interface KitPiece<O extends Options = Options> extends Piece<O> { meta: Meta<O> }
export function piece<O>(spec: PieceSpec<O>, draw: Draw<O> | { setup: Setup<O> }): KitPiece<O>;
export function metaOf<O>(spec: PieceSpec<O>): { meta: Meta<O>; palette: Palette | null };
export function checkMeta<M extends Meta>(m: M): M;   // check.ts's checks; any piece up to MAX (320 by 120)

export type MakerSpec<O> = Omit<PieceSpec<O>, "name" | "cols" | "rows"> & { name?: string; cols?: number; rows?: number };
export function specOf<O>(spec: MakerSpec<O> | undefined, name: string, size?: { cols: number; rows: number }): PieceSpec<O>;

export type Source = Piece | string | Surface;
export function asPiece(src: Source, name?: string): Piece;   // text or a grid as a still
export interface Sampler { readonly meta: Meta; readonly palette: readonly string[] | null;
  at(t: number, env?: { paper?: boolean; mono?: boolean }): Surface }   // the same grid each call
export function sample(src: Source, options?: Options): Sampler;
export function snapshot(src: Source, t?: number, o?: { paper?: boolean; mono?: boolean; options?: Options }):
  { text: string; color: Uint8Array | null };
```

`piece()` makes one fresh grid each time the piece's default function is
called (each player has its own), clears it before each frame unless
`clear: false`, sets `s.paper`, `s.mono`, `ctx.paper`, `ctx.mono` from env,
calls the drawing, and returns `s.frame(env)`. `{ setup }` runs once a play with
the options and returns the drawing: the place for work done once.

How a module's output becomes a piece: every module has a **maker** that returns
a `KitPiece` (a noun: `field`, `scene`, `particles`, the effects, the layouts,
`fromImage`), built on `piece()` or `metaOf()`, taking a `MakerSpec` (the name
defaults to the module's, the size to 64 by 24 where nothing else gives one),
and, where it draws, a **drawing function** that draws into a `Surface` you
already have (a verb: `drawField`, `render3d`, `drawParticles`, and draw's
`line`, `rect` and the rest), so the parts mix in one `piece()`.

## 3. Naming

- Makers are nouns and return a piece; drawing functions are verbs taking the
  surface first: `fn(s, ...positional, options?)`.
- Options objects are the last argument, every field optional with a default
  stated in its doc comment, as in banner.ts.
- Sizes are `cols` and `rows`, positions `x` and `y`, time `t`, periods in
  seconds `period` (or `every` for something occasional), speeds per second,
  angles in radians.
- One name means one thing across the kit: `color` is a `Color`, `colors` is a
  `PaletteSpec` (stops, spread to `steps` colours), `ramp` is a `RampName |
  string`, `invert` is `boolean | "auto"`, `region` is a `Region`, `seed` is a
  whole number.
- Names that would clash across modules are taken already: math has `phase` and
  `oscillate` (not `loop`/`wave`), fx has `wave`, compose has `repeat`, `scale`
  (pieces), `grid` (layout). Core has `Surface` (not `grid`), `gradient`, `mix`.

## 4. The modules

Each module below lists its exact public API. A module may export more helpers
if they earn their place; it may not change these signatures without saying why
in its report.

### draw: src/kit/draw.ts

```ts
export type Align = "left" | "center" | "right";
export type VAlign = "top" | "middle" | "bottom";
export type Point = readonly [number, number];

export interface TextOptions {
  color?: Color;
  align?: Align;          // "left"
  width?: number;         // the box to align and wrap in, from x: the rest of the row by default
  wrap?: boolean;         // wrap at spaces to width (words longer than width break): true when width is given
  valign?: VAlign; height?: number;  // the box's height, for valign: "top"
  transparent?: boolean;  // spaces in the text leave what is under them: false
}
/** Text at x, y; returns the box it filled. */
export function text(s: Surface, x: number, y: number, str: string, o?: TextOptions): { cols: number; rows: number };

export interface LineOptions { char?: string; color?: Color }  // char: "auto" (the default) picks - | / \ by slope, else a brush
export function line(s: Surface, x0: number, y0: number, x1: number, y1: number, o?: LineOptions): void;   // Bresenham
export function polyline(s: Surface, points: readonly Point[], o?: LineOptions & { closed?: boolean }): void;

export type BoxStyle = "single" | "double" | "rounded" | "heavy" | "ascii";
export const boxes: Record<BoxStyle, string>;  // 6 characters each: top left, top right, bottom left, bottom right, across, down
export interface RectOptions {
  style?: BoxStyle | (string & {});  // "single", or 6 characters of your own; "none" for no border
  fill?: string | false;   // the inside's character: false (none)
  color?: Color; fillColor?: Color;
  title?: string;          // on the top edge, after the corner and one across
}
export function rect(s: Surface, x: number, y: number, w: number, h: number, o?: RectOptions): void;

export interface ShapeOptions { char?: string; fill?: string | false; color?: Color; fillColor?: Color }  // char "*"
/** A circle that looks round: r in columns, rows scaled by s.aspect. */
export function circle(s: Surface, cx: number, cy: number, r: number, o?: ShapeOptions): void;
export function ellipse(s: Surface, cx: number, cy: number, rx: number, ry: number, o?: ShapeOptions): void;  // rx columns, ry rows
export function polygon(s: Surface, points: readonly Point[], o?: ShapeOptions): void;  // even-odd fill

/** Another grid or a block of text laid over s at x, y: EMPTY and mask cells let s show. */
export function stamp(s: Surface, src: Surface | string, x: number, y: number,
  o?: { mask?: string | null; color?: Color; map?: ArrayLike<number> }): void;

/** 2 by 4 dots a cell, U+2800 to U+28FF: smooth lines, curves and plots. Dots are square on a 1:2 cell. */
export interface Braille {
  readonly width: number; readonly height: number;   // in dots: 2 * cols, 4 * rows of its region
  set(x: number, y: number, color?: Color): void; unset(x: number, y: number): void;
  toggle(x: number, y: number): void; get(x: number, y: number): boolean;
  line(x0: number, y0: number, x1: number, y1: number, color?: Color): void;
  circle(cx: number, cy: number, r: number, o?: { fill?: boolean; color?: Color }): void;
  rect(x: number, y: number, w: number, h: number, o?: { fill?: boolean; color?: Color }): void;
  /** y = f(x) over x0..x1, scaled into the canvas between y0 (bottom) and y1 (top); joined dots. */
  plot(f: (x: number) => number, o?: { x0?: number; x1?: number; y0?: number; y1?: number; color?: Color }): void;
  clear(): void;
  /** Writes the dots into the surface: a cell with no dots is left as it was. A cell's colour is the last set in it. */
  draw(): void;
}
export function braille(s: Surface, region?: Region): Braille;

/** Two square pixels a cell with the half blocks ▀ ▄ █. One colour a cell: where both halves are lit in different colours the cell is █ in the upper one. */
export interface Pixels {
  readonly width: number; readonly height: number;  // cols, 2 * rows of its region
  set(x: number, y: number, color?: Color): void; unset(x: number, y: number): void; get(x: number, y: number): boolean;
  line(x0: number, y0: number, x1: number, y1: number, color?: Color): void;
  rect(x: number, y: number, w: number, h: number, o?: { fill?: boolean; color?: Color }): void;
  circle(cx: number, cy: number, r: number, o?: { fill?: boolean; color?: Color }): void;
  /** Pixel art from text: one character a pixel, "." or " " clear, each other character's colour from `colors`. */
  sprite(art: string, colors: Record<string, Color>, x: number, y: number): void;
  clear(): void;
  draw(): void;
}
export function pixels(s: Surface, region?: Region): Pixels;
```

Examples: `draw-clock.ts` (a clock face from a circle, ticks and hands with
`line`, a rect frame with a title, hands from t so it loops every 60 s, not the
real time), `draw-sine.ts` (a smooth sine and cosine on the braille canvas,
scrolling, in two colours), `draw-sprite.ts` (a small walking pixel-art sprite
on the half-block canvas, two or three frames by t).

Tests: Bresenham end points and slope characters; text alignment and wrapping;
rect corners per style and title; circle roundness (rows scaled by aspect);
polygon fill; braille bit layout (dot 1 at 0x01, dot 8 at 0x80) and plot;
half block upper/lower/full and colour rule; stamp transparency.

### field: src/kit/field.ts

```ts
export interface FieldCell {
  col: number; row: number;        // the cell in the region
  u: number; v: number;            // 0..1 across and down the region, at the cell's centre
  r: number; a: number;            // distance from the centre and angle, from x and y
  cols: number; rows: number;      // the region's size
}
/** Brightness 0..1 at x, y at t. x and y are centred, -1..1 across the shorter side, y down, scaled so a circle is round. */
export type FieldFn = (x: number, y: number, t: number, at: FieldCell) => number;

export interface FieldOptions {
  ramp?: RampName | (string & {});          // "standard"
  colors?: PaletteSpec;                     // colour by value: these stops spread to `steps` colours
  steps?: number;                           // 16
  color?: (value: number, x: number, y: number, t: number, at: FieldCell) => Color;  // or colour by your own function
  dither?: boolean;                         // ordered 4x4 Bayer between ramp steps: false
  invert?: boolean | "auto";                // "auto": the ramp turned round on paper
  aspect?: boolean;                         // true: x and y in true proportion; false: each axis -1..1
  gamma?: number;                           // value ** gamma before shading: 1
  region?: Region;                          // where in the surface: all of it
}
export function drawField(s: Surface, fn: FieldFn, t: number, o?: FieldOptions): void;
export function field<O extends Options = Options>(spec: MakerSpec<O> & FieldOptions & { period?: number }, fn: FieldFn): KitPiece<O>;
```

`colors` builds the palette (`spread(colors, steps)`); `color` as a function
needs `palette` in the spec. With neither, the field is one ink. A cell whose
ramp character is a space is left EMPTY. `period` sets `meta.loop`. Precompute
per-cell x, y and FieldCell objects in setup; reuse one FieldCell object per
call (document that it is reused).

The target, the 20-line wave in about 3 lines:

```ts
export default field({ name: "sea", ramp: "blocks", colors: ["#0b3d91", "#7fdbff"], period: 2 },
  (x, y, t) => 0.5 + 0.5 * Math.sin(x * 6 + y * 2 + Math.PI * t));
```

Examples: `field-plasma.ts` (the plasma in one call, coloured), `field-sea.ts`
(rolling rows of characters, dithered), `field-pulse.ts` (a radial pulse from
`at.r`, looping). Tests: coordinate normalisation (centre is 0, 0; shorter side
spans -1..1; aspect), ramp ends, invert on paper, EMPTY for spaces, colours by
value hit both ends of the palette, dither changes only between neighbouring
ramp steps, region respected.

### math: src/kit/math.ts

```ts
export { TAU, clamp, lerp, smoothstep, fract, hash, mulberry32, valueNoise, bayer } from "./core.ts";
export function invLerp(a: number, b: number, v: number): number;
export function remap(v: number, inLo: number, inHi: number, outLo: number, outHi: number, clamped?: boolean): number;
export function wrap(v: number, lo: number, hi: number): number;
export function mod(a: number, n: number): number;          // always 0..n
export function pingpong(v: number, length: number): number;
export function step(edge: number, v: number): number;
export function degrees(rad: number): number; export function radians(deg: number): number;

export interface Random {
  (): number; readonly seed: number;
  range(lo: number, hi: number): number;
  int(lo: number, hi: number): number;           // lo to hi, both included
  pick<T>(list: readonly T[]): T;
  chance(p: number): boolean;
  normal(mean?: number, sd?: number): number;
  sign(): 1 | -1;
  angle(): number;                                // 0..TAU
  shuffle<T>(list: T[]): T[];                     // in place, returned
  fork(n: number): Random;                        // an independent stream from this seed
}
export function random(seed?: number): Random;   // mulberry32 underneath

export function noise2(x: number, y: number, seed?: number): number;              // simplex, 0..1
export function noise3(x: number, y: number, z: number, seed?: number): number;   // simplex, 0..1
export interface FbmOptions { octaves?: number; lacunarity?: number; gain?: number; seed?: number }  // 4, 2, 0.5, 0
export function fbm(x: number, y: number, o?: FbmOptions): number;                // 0..1
export function fbm3(x: number, y: number, z: number, o?: FbmOptions): number;
export function ridged(x: number, y: number, o?: FbmOptions): number;              // 0..1, sharp crests
/** Noise at x, y that moves with t and repeats exactly every period: noise3 on a circle in its third axis. */
export function loopNoise(x: number, y: number, t: number, period: number, o?: { radius?: number; seed?: number }): number;

export type EaseName = "linear" | "inQuad" | "outQuad" | "inOutQuad" | "inCubic" | "outCubic" | "inOutCubic"
  | "inQuart" | "outQuart" | "inOutQuart" | "inSine" | "outSine" | "inOutSine" | "inExpo" | "outExpo" | "inOutExpo"
  | "inCirc" | "outCirc" | "inOutCirc" | "inBack" | "outBack" | "inOutBack"
  | "inElastic" | "outElastic" | "inOutElastic" | "inBounce" | "outBounce" | "inOutBounce";
export const ease: Record<EaseName, (k: number) => number>;   // k clamped 0..1; ease.x(0) is 0 and ease.x(1) is 1

export type Vec2 = [number, number]; export type Vec3 = [number, number, number];
export const vec2: {
  add(a: Vec2, b: Vec2): Vec2; sub(a: Vec2, b: Vec2): Vec2; scale(v: Vec2, k: number): Vec2; dot(a: Vec2, b: Vec2): number;
  length(v: Vec2): number; normalize(v: Vec2): Vec2; rotate(v: Vec2, a: number): Vec2; lerp(a: Vec2, b: Vec2, k: number): Vec2;
  dist(a: Vec2, b: Vec2): number;
};
export const vec3: {
  add(a: Vec3, b: Vec3): Vec3; sub(a: Vec3, b: Vec3): Vec3; scale(v: Vec3, k: number): Vec3; dot(a: Vec3, b: Vec3): number;
  cross(a: Vec3, b: Vec3): Vec3; length(v: Vec3): number; normalize(v: Vec3): Vec3; lerp(a: Vec3, b: Vec3, k: number): Vec3;
  dist(a: Vec3, b: Vec3): number;
};
/** v turned by angles about x, then y, then z, in radians. */
export function rotate3(v: Vec3, angles: Vec3): Vec3;
export interface Projection { cols: number; rows: number; distance?: number; scale?: number; aspect?: number }
/** A point in 3D (y up, z away) to a cell: perspective from `distance` (5), `scale` cells a unit at the centre (rows / 3), aspect 2. Null behind the eye. */
export function project(p: Vec3, o: Projection): { x: number; y: number; depth: number } | null;

export function phase(t: number, period: number): number;          // 0..1, repeating exactly
export function oscillate(t: number, period: number, lo?: number, hi?: number, offset?: number): number;  // a sine lo..hi: -1..1
export function triangle(t: number, period: number): number;       // 0..1..0
export function pulse(t: number, period: number, width?: number): number;  // 1 for width of each period, else 0
```

Simplex noise: implement it (Gustavson's 2D and 3D, seeded by permuting a
256-entry table with mulberry32), scaled to 0..1. Deterministic across runs and
platforms (no Math.random, no typed-array endianness tricks).

Examples: `math-landscape.ts` (fbm ridges scrolling sideways, layered depth by
characters, looping with `loopNoise` or a wrapped x), `math-starfield.ts` (a
seeded starfield whose stars twinkle with `oscillate`, eased shooting star now
and then). Tests: ranges of every noise (sampled 10,000 points stay in 0..1 and
spread over most of it), continuity, determinism by seed and difference across
seeds, every easing's ends, `random` statistics (mean of range, int bounds
inclusive, pick covers the list), `phase` and `loopNoise` repeat exactly at the
period, `project` centre and null behind, `rotate3` keeps length.

### shapes3d: src/kit/shapes3d.ts

```ts
export type Vec3 = [number, number, number];
export type Animated<T> = T | ((t: number) => T);
export interface ShapeOptions {
  at?: Animated<Vec3>;        // its centre: [0, 0, 0]
  rotate?: Animated<Vec3>;    // its angles about x, y, z at t (radians); with spin, the angles at t = 0
  spin?: Vec3;                // radians a second about x, y, z: [0, 0, 0]
  scale?: number;             // 1
  color?: string;             // #rrggbb: shapes with colours make the scene coloured
}
export interface Shape3d { readonly kind: string }  // opaque to users
export function torus(o?: ShapeOptions & { radius?: number; tube?: number }): Shape3d;        // 2, 1
export function sphere(o?: ShapeOptions & { radius?: number }): Shape3d;                      // 1
export function cube(o?: ShapeOptions & { size?: number }): Shape3d;                          // edge 2
export function cylinder(o?: ShapeOptions & { radius?: number; height?: number }): Shape3d;   // 1, 2
export function cone(o?: ShapeOptions & { radius?: number; height?: number }): Shape3d;       // 1, 2
export function plane(o?: ShapeOptions & { width?: number; depth?: number }): Shape3d;        // 4, 4
export function points(list: Animated<readonly Vec3[]>, o?: ShapeOptions & { char?: string }): Shape3d;
/** A position going round `center` every `period` seconds, for a moon: tilt tips its plane about x. */
export function orbit(o: { radius: number; period: number; tilt?: number; center?: Vec3; phase?: number }): (t: number) => Vec3;

export interface SceneOptions {
  camera?: { distance?: number; zoom?: number };   // distance: 6; zoom: fitted
  light?: Vec3;                // towards the light: [-0.4, 1, -1], from the upper left, as donut.c
  ambient?: number;            // 0
  ramp?: RampName | (string & {});  // ".,-~:;=!*#$@", donut's: no space, so every lit surface shows
  invert?: boolean | "auto";   // "auto"
  colorBy?: "shape" | "depth" | "light";  // "shape": each shape's colour, darker where it is darker
  shades?: number;             // steps of each colour, dark to full: 4
  fit?: boolean;               // true: zoom so no shape clips at any angle of its spin
}
export function render3d(s: Surface, shapes: readonly Shape3d[], t: number, o?: SceneOptions): void;
export function scene<O extends Options = Options>(spec: MakerSpec<O> & SceneOptions,
  shapes: readonly Shape3d[] | ((t: number) => readonly Shape3d[])): KitPiece<O>;
```

Render by sampling each shape's surface parametrically (torus, sphere,
cylinder, cone, plane) or its faces (cube), each sample with its normal,
transformed, projected (y up, cells 1:2 by `s.aspect`), z-buffered per cell,
and shaded by `max(0, n . light) * (1 - ambient) + ambient` through the ramp.
Sample density scales with the projected size so there are no holes. With
colours, the palette is each distinct shape colour in `shades` steps (built when
the scene is made; a shape function's colours must be known then: call it at t
= 0 to collect them), and a cell takes the step of its shape's colour by its
brightness. `fit` computes, once, the radius each shape can reach and sets the
zoom so it never clips, as donut.ts sizes its ring.

The target: `export default scene({ name: "donut", cols: 40, rows: 22 }, [torus({ spin: [0.8, 0, 0.35] })]);`

Examples: `shapes3d-donut.ts`, `shapes3d-cube.ts` (a spinning cube with lit
faces, coloured), `shapes3d-planet.ts` (a sphere planet and a small moon on
`orbit`, the moon passing behind it by the z-buffer). Tests: a sphere's
silhouette is round on screen, the z-buffer hides the far shape, light from the
front gives the brightest ramp step at the centre, colours stay in the palette,
fit never clips across a full spin, determinism.

### particles: src/kit/particles.ts

```ts
export type Vec2 = [number, number];
export type Range = number | readonly [number, number];
export type Emitter =
  | { point: Vec2 | ((t: number) => Vec2) }
  | { line: readonly [Vec2, Vec2] }
  | { area: Region }
  | { edge: "top" | "bottom" | "left" | "right" };
export interface Particle { id: number; age: number; life: number; k: number; x: number; y: number; vx: number; vy: number; t: number }  // k = age / life
export interface System {
  emitter: Emitter;
  rate?: number;                 // particles a second: 20
  burst?: { every: number; count: number; first?: number };  // instead of a rate: count at once, every `every` s
  life?: Range;                  // seconds: [1, 2]
  speed?: Range;                 // cells a second: [2, 6]
  angle?: Range;                 // radians, 0 right, TAU / 4 down: [0, TAU]
  gravity?: number;              // cells a second squared, down: 0
  wind?: number | ((t: number) => number);   // cells a second, right: 0
  drag?: number;                 // a second: 0
  sway?: { amount: number; speed: number };  // a side to side drift in cells, cycles a second
  glyphs?: string;               // by age, first at birth: "*+."
  glyph?: (p: Particle) => string;           // or your own
  colors?: PaletteSpec;          // by age, spread to `steps`: none
  steps?: number;                // 8
  color?: (p: Particle) => Color;
  twinkle?: number;              // 0..1, the share of each tenth of a second a particle is hidden: 0
  bounds?: "wrap" | "bounce" | "die";  // at the edges: "die"
  floor?: number;                // a row particles land on, bouncing or dying there: none
  seed?: number;                 // 1
}
export function drawParticles(s: Surface, systems: System | readonly System[], t: number): void;
export function particles<O extends Options = Options>(spec: MakerSpec<O>,
  systems: System | readonly System[] | ((size: { cols: number; rows: number }) => System | readonly System[])): KitPiece<O>;
export const presets: Record<"snow" | "rain" | "stars" | "sparks" | "fireworks" | "fireflies" | "bubbles" | "matrix",
  (size: { cols: number; rows: number }, o?: Record<string, unknown>) => System[]>;
```

Deterministic from t, with no stepping: particle `i` of a rate is born at
`i / rate` plus a seeded jitter (a burst's at its burst's time), its own random
draws come from `hash(seed, i, ...)`, and its position at age `a` is the
closed form of constant gravity and wind with linear drag
(`x = x0 + (v - g/k)(1 - e^(-ka))/k + g a / k`, the `k = 0` case as the
plain parabola). Only births within the longest life before t are visited.
Wrap is a modulo; bounce folds the position at the edge (or `floor`); die drops
it. Each preset's options are documented on it (snow: `wind`, `density`;
fireworks: `every`, `colors`; and so on), each takes the size, and each looks
good at 64 by 24 with no options: `particles({ name: "snow" }, presets.snow)`.

Examples: `particles-fireworks.ts` (bursts in colour over a skyline drawn with
`s.write`), `particles-snow.ts` (snow in two or three depths with wind). Tests:
a frame depends only on t (drawing t = 5 then 1 equals drawing 1 fresh), rate
gives about rate x life particles alive, gravity bends paths down, wrap/bounce/die
at the edges, colours by age stay in the palette, a preset renders non-empty at
t = 0.

### fx: src/kit/fx.ts

Every effect takes a `Source` (a piece such as `donut`, a `banner()`, a kit
piece, a block of text, or a Surface) and options, and returns a new piece. It
plays the source with `sample()` and draws the effect on its grid, keeping its
colours (env.color) in colour and working in mono too.

```ts
export function glint(src: Source, o?: { every?: number; sweep?: number; first?: number; width?: number;
  slant?: number; chars?: string | null; color?: string }): KitPiece;
  // every 4 s, crossing in 1.2 s from 0.5 s, 3 cells wide leaning 1 cell a row; chars "█▓" (core, edge), null keeps
  // the characters; colour: a lighter tint of each cell's own (mix toward white 0.6) when coloured
export function typeIn(src: Source, o?: { speed?: number; start?: number; cursor?: string | false;
  order?: "reading" | "random" | "columns"; hold?: number; seed?: number }): KitPiece;
  // 40 characters a second in reading order, a "▌" cursor; with hold, it holds that long then types again (looping)
export function dissolve(src: Source, o?: { period?: number; mode?: "in" | "out" | "inout"; scale?: number;
  edge?: string; seed?: number }): KitPiece;
  // 6 s, "inout": in, held, out, gone; noise scale 0.15 cells; edge ".:" drawn where it is crossing
export function fade(src: Source, o?: { period?: number; mode?: "in" | "out" | "inout"; ramp?: RampName | (string & {}) }): KitPiece;
  // each character steps down the ramp toward a space (characters not on the ramp step through it from their place by density)
export function scan(src: Source, o?: { period?: number; direction?: "down" | "up" | "right" | "left";
  char?: string; color?: string; reveal?: boolean }): KitPiece;   // 3 s, "down", "─" (or "│" across), reveal false
export function glitch(src: Source, o?: { every?: number; length?: number; amount?: number; chars?: string; seed?: number }): KitPiece;
  // a burst every 2.5 s lasting 0.35 s: rows slide, cells swap to "#%&@$/\\|<>", deterministic from t and seed
export function wave(src: Source, o?: { amplitude?: number; wavelength?: number; period?: number; axis?: "rows" | "columns" }): KitPiece;
  // rows sway 2 columns, a wave 8 rows long, 2 s; adds 2 * amplitude columns (or rows) so nothing clips
export function rainbow(src: Source, o?: { colors?: readonly string[]; period?: number; spread?: number;
  direction?: "x" | "y" | "diagonal" }): KitPiece;   // 12 hues, 3 s, 0.08 of the cycle a column
export const hueCycle: typeof rainbow;
export function shake(src: Source, o?: { amount?: number; every?: number; length?: number; seed?: number }): KitPiece;
  // 1 cell, every 2 s for 0.3 s; adds 2 * amount on each axis
export function outline(src: Source, o?: { style?: "single" | "double" | "rounded" | "heavy" | "ascii" | (string & {}); color?: string }): KitPiece;
  // traces the ink's outside with box drawing (16 joins, as banner's shadows); adds a cell each side
export function shadow(src: Source, o?: { dx?: number; dy?: number; char?: string; color?: string }): KitPiece;  // 1, 1, "░"
/** Effects one after another: chain(donut, (p) => glint(p), (p) => wave(p)). */
export function chain(src: Source, ...effects: ((p: Piece) => Piece)[]): Piece;
```

Effects never change the size except wave, shake, outline and shadow, which
grow by their reach (stated above) so nothing clips. fps is the source's, or 24
for a still source; `meta.loop` follows the time rule in section 2. Colours an
effect adds are merged with the source's (`mergePalettes`); on a mono source an
effect with a colour makes a coloured piece, its text in `INK`. Examples:
`fx-dissolve-donut.ts`, `fx-glint-banner.ts` (glint on a `banner()` whose own
effect is "still"), `fx-glitch-logo.ts` (glitch on a library logo, rust).
Tests: each effect at its quiet moment equals the source frame; sizes; colours
in the palette in colour, none written in mono; determinism; loop values.

### compose: src/kit/compose.ts

```ts
export type Anchor = "top-left" | "top" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom" | "bottom-right";
export interface Layer {
  src: Source;
  x?: number; y?: number;       // offset from the anchor: 0, 0
  anchor?: Anchor;              // "top-left"
  mask?: string | null;         // " ": spaces show what is under them; null: only EMPTY does
  options?: Options;            // the source's option overrides
  offset?: number;              // seconds added to its time: 0
  speed?: number;               // 1
}
/** Pieces stacked, the first at the bottom, in the first one's size. */
export function layer(base: Source | Layer, ...over: (Source | Layer)[]): KitPiece;
/** One piece over another: a banner over a scene, a logo on a starfield. Centred by default. */
export function over(top: Source, bottom: Source, o?: Omit<Layer, "src">): KitPiece;
export function row(parts: readonly Source[], o?: { gap?: number; align?: "top" | "middle" | "bottom" }): KitPiece;        // gap 2, "middle"
export function column(parts: readonly Source[], o?: { gap?: number; align?: "left" | "center" | "right" }): KitPiece;    // gap 1, "center"
export function grid(parts: readonly Source[], o: { columns: number; gap?: number | readonly [number, number]; align?: Anchor }): KitPiece;  // gap [2 cols, 1 row], "center"
export function crop(src: Source, region: Region): KitPiece;
export function pad(src: Source, n: number | readonly [number, number] | { top?: number; right?: number; bottom?: number; left?: number }): KitPiece;
export function scale(src: Source, factor: number | readonly [number, number]): KitPiece;   // whole numbers, nearest
export function flip(src: Source, axis: "x" | "y" | "both"): KitPiece;   // mirrors / \ ( ) < > [ ] { } ┌ ┐ └ ┘ ▀ ▄ and the like
export function sequence(steps: readonly (Source | { src: Source; seconds: number })[],
  o?: { seconds?: number; transition?: "cut" | "dissolve" | "fade" | "wipe"; overlap?: number; loop?: boolean }): KitPiece;
  // 4 s each, "dissolve" over 0.8 s, looping; the size of the largest, each centred
export function speed(src: Source, factor: number): KitPiece;
export function delay(src: Source, seconds: number): KitPiece;       // its first frame held until then
export function repeat(src: Source, seconds: number): KitPiece;      // its first `seconds` over and over; sets loop
export function freeze(src: Source, at: number): KitPiece;           // a still of its frame at `at`
```

Palettes merge across parts (`mergePalettes`, up to 64, then a clear error
naming the parts). Each part keeps its own player (`sample`) and its own
options. Size checks: the result must stay within `MAX` (320 by 120), else a
clear error. fps is the largest of the parts'; loop by the time rule. Sequence
transitions are implemented here (a seeded per-cell threshold from core's
`valueNoise` for dissolve, a ramp step for fade, a moving edge for wipe), not by
importing fx; integration may route them through fx later. Examples:
`compose-banner-scene.ts` (a `banner()` over a library scene, e.g. ocean-sunset,
or over a field), `compose-dashboard.ts` (three chart pieces, bar-chart,
sparkline and gauge, in a `grid` with gaps), `compose-logos.ts` (a `sequence`
of three logos that dissolve into each other). Tests: layer order and masks,
anchor arithmetic, row/column/grid sizes and alignment, crop/pad/scale/flip
exactness, palette merge remapping (a coloured part keeps its colours, a mono
part gets INK), sequence timing and transitions, loop rule.

### image: src/kit/image.ts

The /make/ engine as code. Read `site/src/lib/logo.ts` (the drawing),
`site/src/lib/glyphs.ts` (the glyph shapes) and `site/src/lib/logo-file.ts`
(how its pieces are written: the palette in six runs, the glint).

```ts
export interface ImageOptions {
  width?: number;                       // columns, margin included: 48
  style?: "logo" | "shade";             // "logo"; a photo (opaque, no plain ground) defaults to "shade" as /make/ does
  background?: "remove" | "keep";       // "remove": a plain ground taken out from the edges inwards
  color?: boolean;                      // true: the image's own colours (up to 8), lifted on a dark page as /make/ does
  glint?: boolean | { every?: number }; // false: a still; true: the logos' glint every 5 s
  ramp?: RampName | (string & {});      // for "shade": /make/'s ".:-=+*#%@"
  name?: string;                        // "image"
  category?: Category;                  // "logos"
}
export interface Drawing { style: "logo" | "shade"; cols: number; rows: number; colors: [number, number, number][];
  art: string[]; ink: string[]; mono: string[]; knocked: boolean }   // as site/src/lib/logo.ts's Drawing
/** Pure: RGBA pixels, row by row, to cells. Works in Node and browsers. */
export function drawing(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number, o?: ImageOptions): Drawing;
export function fromPixels(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number, o?: ImageOptions): KitPiece;
/** Browsers: a URL, a Blob or File, an <img>, an ImageBitmap, a canvas, or SVG markup. Uses createImageBitmap and an OffscreenCanvas (or a canvas). */
export function fromImage(src: string | URL | Blob | HTMLImageElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas, o?: ImageOptions): Promise<KitPiece>;
```

The glyph table that `site/src/lib/glyphs.ts` builds from IBM Plex Mono at site
build time is precomputed into `src/kit/glyphs.ts` by `scripts/kit/glyphs.ts`
(run with the site's own code and dependencies), and committed, so the library
needs no font at runtime. Resampling is area averaging (what a canvas's
high-quality downscale approximates), straight from the source pixels into each
cell's GX by GY blocks, never through a 2400-pixel intermediate. The glint, when
asked for, is the logos' own (the palette's lighter runs, `/` through solid
cells), implemented here; integration may switch it to fx's glint.

Verify on real images: a python logo, a go logo and a photo (look in
`/private/tmp/claude-501/-Users-shubham-Documents-Code-nosync-new-portfolio/d426eae0-9823-4b2d-bc5b-2a79c3032748/scratchpad/films`
or the site's assets, or render shapes yourself), decoding PNGs in Node for
tests with a tiny decoder or `sharp` from the site's node_modules in a script,
not as a dependency of the package. Compare with what /make/ draws for the same
image where you can. Examples: `image-logo.ts` (a logo from a URL: export a
piece made with `fromPixels` from committed pixels or text, since examples run
in Node), `image-photo.ts` (a photo shaded). Tests: a filled square is all
FILL, a transparent image is blank, background removal, colours quantised and
in the palette, glint changes frames only in the glint band, width respected.

## 5. The quality bar

- A user gets something impressive in 3 to 10 lines. Every example file is at
  most 15 lines of code besides its header comment, and looks good with no
  tuning: it is the advertisement for the module.
- Defaults are chosen for looks: the defaults alone must produce something you
  would put in a README.
- Every option is checked when the piece is made, with an error that says what
  to change.
- Everything is a normal piece: each example passes `npm run kit -- <example>`
  (contract, determinism, timing) and renders with `--svg`.
- Light and dark pages both look right (`--paper`), and mono (`--mono`) still
  reads.
- Tests cover the behaviour stated in each module's section, and pass.

## 6. Reporting back

Report: branch and commit, the files, the exports to add to `src/kit/index.ts`,
anything you implemented privately that belongs in core, the real output of
typecheck, tests, `npm run kit` on each example (with one printed frame), build
and check, and anything not done or not working, plainly.
