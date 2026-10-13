/*
 * sigil: a fingerprint of a string, drawn as a bishop's random walk on a 17
 * by 9 field, the "randomart" OpenSSH shows for a key. The same text always
 * walks the same path, so a project's mark, a key or a hash can be compared
 * by eye. The walk is seeded with the kit's fnv1a32() and mulberry32(). The
 * bishop walks its 64 moves as it builds, each cell it lands on thickening;
 * then every 6 seconds it walks them again over the finished field.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii sigil
 *   bas3line
 *   ```
 *
 *   sigil("bas3line")
 *   sigil({ text: "SHA256:2c26b46b68ffc68ff99b453c1d304134" }, { title: "release key" })
 */
import { fail, fnv1a32, mulberry32 } from "../kit/core.ts";
import { ACCENT, BAD, GOOD, INK, SOFT, clean, component, linesOf, show, statements, type Common, type MarkdownPiece } from "./core.ts";

/** A sigil as data: the text it is the fingerprint of. */
export interface SigilData {
  /** The seed text: a name, a key's fingerprint, a hash. */
  text: string;
}

export interface SigilOptions extends Common {}

/** The field the bishop walks: 17 columns by 9 rows, as OpenSSH's randomart. */
export const SIGIL_FIELD = { cols: 17, rows: 9 } as const;
// The bytes the walk is made of, four moves a byte.
const BYTES = 16;
// A cell's character by its visits, none to fourteen and more.
const MARKS = " .o+=*BOX@%&#/^";

/**
 * The bishop's walk for a text: where it is after each of its 64 moves, from the centre, and how often it landed on
 * each cell. Each of 16 bytes from mulberry32(fnv1a32(text)) gives four moves, low bits first: bit 0 right (1) or left
 * (0), bit 1 down (1) or up (0), held inside the field.
 */
export function walkOf(text: string): { path: [number, number][]; visits: number[] } {
  const { cols: W, rows: H } = SIGIL_FIELD;
  const next = mulberry32(fnv1a32(text));
  const visits = new Array<number>(W * H).fill(0);
  let x = (W - 1) / 2, y = (H - 1) / 2;
  const path: [number, number][] = [[x, y]];
  for (let i = 0; i < BYTES; i++) {
    const b = Math.floor(next() * 256);
    for (let k = 0; k < 4; k++) {
      const m = (b >> (2 * k)) & 3;
      x = Math.max(0, Math.min(W - 1, x + (m & 1 ? 1 : -1)));
      y = Math.max(0, Math.min(H - 1, y + (m & 2 ? 1 : -1)));
      visits[y * W + x]++;
      path.push([x, y]);
    }
  }
  return { path, visits };
}

// The build: the bishop's 64 moves, then S and E land. The cycle: it walks them again, then rests.
const INTRO = 1.6, WALK = 1.4, START_LANDS = 1.45, END_LANDS = 1.52, CYCLE = 6, AGAIN: readonly [number, number] = [0.6, 2.6];
// The cells behind the bishop on its walk again, lit in the accent.
const TRAIL = 3;

// The fence's body: one line, the seed text, as written or in quotes.
function parse(source: string): SigilData {
  const lines = linesOf(source)
    .map((l, i) => ({ l, line: i + 1 }))
    .filter(({ l }) => l.trim());
  if (!lines.length) fail(`sigil takes a text to draw the fingerprint of, such as bas3line`);
  if (lines.length > 1) fail(`sigil takes one line, the text it is the fingerprint of, and line ${lines[1].line} has more: ${show(lines[1].l.trim())}`);
  const raw = clean(lines[0].l, "sigil").trim();
  if (raw.startsWith('"')) {
    const [s] = statements(raw, "sigil");
    if (s.tokens.length === 1 && s.texts.length === 1) return { text: s.texts[0] };
  }
  return { text: raw };
}

// Data, checked: a text with something in it, every character one a cell can draw, as its title shows it.
function check(data: SigilData): SigilData {
  if (!data || typeof data !== "object") fail(`sigil() takes a fence's body, such as bas3line, or { text }, not ${show(data)}`);
  if (typeof data.text !== "string" || !data.text.trim()) fail(`sigil's text takes words to draw the fingerprint of, such as "bas3line", not ${show(data.text)}`);
  return { text: clean(data.text, "sigil's text").replace(/\s+/g, " ").trim() };
}

// A cell's tone by its visits: a light path soft, a busy one ink, the busiest the accent.
const toneOf = (n: number) => (n <= 2 ? SOFT : n <= 8 ? INK : ACCENT);

/**
 * A text's fingerprint from a fence's body, the text on one line, or { text }: the bishop's walk on a 17 by 9 field,
 * each cell marked by how often it landed there (` .o+=*BOX@%&#/^`), S where it started and E where it ended, under
 * the text as its title. The same text always draws the same sigil.
 *
 *   sigil("bas3line")
 *   sigil({ text: "ascii.rest" }, { frame: "double" })
 */
export function sigil(source: string | SigilData, options?: SigilOptions): MarkdownPiece {
  const data = check(typeof source === "string" ? parse(source) : source);
  return component("sigil", options, [], (o, room) => {
    const { cols: W, rows: H } = SIGIL_FIELD;
    const extra = o.width === undefined ? 0 : o.width - room.cols!;
    if (room.cols !== undefined && W > room.cols) fail(`sigil needs ${W + extra} columns for its field, and its width is ${o.width}: give it a width of ${W + extra} or more`);
    // its own title is the text, cut to the field's width; a longer title of the reader's widens it, the field centred
    const title = data.text.length > W - 2 ? `${data.text.slice(0, W - 5).trimEnd()}...` : data.text;
    const asked = o.frame === "none" || o.title === false || o.title === undefined ? 0 : String(o.title).replace(/\s+/g, " ").trim().length;
    const cols = room.cols ?? Math.min(room.max, Math.max(W, asked + 2));
    const dx = Math.floor((cols - W) / 2);
    const { path, visits } = walkOf(data.text);
    const moves = path.length - 1;
    const [sx, sy] = path[0], [ex, ey] = path[moves];
    // the visits after the first k moves, counted once for every k the build shows
    const counts: number[][] = [new Array<number>(W * H).fill(0)];
    for (let k = 1; k <= moves; k++) {
      const c = counts[k - 1].slice();
      c[path[k][1] * W + path[k][0]]++;
      counts.push(c);
    }
    return {
      cols,
      rows: H,
      intro: INTRO,
      cycle: CYCLE,
      title,
      says: `sigil of ${data.text.length > 60 ? `${data.text.slice(0, 57)}...` : data.text}.`,
      draw(s, t, at) {
        const building = t < INTRO;
        const k = building ? Math.min(moves, Math.floor((t / WALK) * moves + 1e-9)) : moves;
        const seen = building ? counts[k] : visits;
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            const n = seen[y * W + x];
            if (n) s.set(at.x + dx + x, at.y + y, MARKS[Math.min(MARKS.length - 1, n)], toneOf(n));
          }
        if (!building || t >= START_LANDS) s.set(at.x + dx + sx, at.y + sy, "S", GOOD);
        if (!building || t >= END_LANDS) s.set(at.x + dx + ex, at.y + ey, "E", BAD);
        // the bishop: walking as the field builds, and again in the cycle, its last cells lit behind it
        let here = -1;
        if (building && k < moves) here = k;
        else if (!building && !at.still) {
          const u = (t - INTRO) % CYCLE;
          if (u >= AGAIN[0] && u < AGAIN[1]) {
            here = Math.floor(((u - AGAIN[0]) / (AGAIN[1] - AGAIN[0])) * (moves + 1));
            for (let j = Math.max(0, here - TRAIL); j < here; j++) {
              const [x, y] = path[j];
              const ch = s.get(at.x + dx + x, at.y + y);
              if (ch) s.set(at.x + dx + x, at.y + y, ch, ACCENT);
            }
          }
        }
        if (here >= 0 && here <= moves) s.set(at.x + dx + path[here][0], at.y + path[here][1], "●", ACCENT);
      },
    };
  });
}
