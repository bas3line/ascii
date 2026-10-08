/*
 * What /make/ writes from a drawing (lib/logo.ts): the piece's TypeScript
 * file, in the library's exact format for a logo, a company or a distro, so it
 * can go straight into src/pieces; the same code as a plain script, which the
 * page plays and the embed snippet inlines; and the snippets themselves. The
 * code below the art is the generators' own, the glint for logos and
 * companies and the scan line for distros.
 */
import type { Category, Frame, Piece } from "ascii.rest";
import { black, palette, type Drawing } from "./logo";

export type Kind = Extract<Category, "logos" | "companies" | "distros">;

export interface Settings {
  /** As typed, for the header: "Acme". */
  proper: string;
  /** What it was drawn from, for the header: "acme.svg". */
  file: string;
  category: Kind;
  /** Seconds between passes of the glint or the scan. */
  every: number;
}

/** A name as the library has them: lowercase, and no character that could end a comment or a string in the source. */
export const clean = (text: string) =>
  text
    .replace(/[^A-Za-z0-9 .+#!_'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32)
    .trim();

/** The file name: kebab-case, starting with a letter, as the checker wants. */
export function slugOf(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "logo";
  return /^[a-z]/.test(slug) ? slug : `logo-${slug}`;
}

const camel = (slug: string) => slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
// Names the function cannot take: words JavaScript keeps, and the piece's own constants.
const TAKEN = new Set(
  ("break case catch class const continue debugger default delete do else enum export extends false finally for function if import in " +
    "instanceof new null return super switch this throw true try typeof var void while with yield let static implements interface package " +
    "private protected public await arguments eval lines hash meta").split(" "),
);

/** Everything the source needs to know about the piece. */
function parts(d: Drawing, s: Settings) {
  const name = clean(s.proper).toLowerCase() || "logo";
  const slug = slugOf(name);
  const id = camel(slug);
  const fn = TAKEN.has(id) ? `${id}Logo` : id;
  const Type = id[0].toUpperCase() + id.slice(1);
  const scan = s.category === "distros";
  const every = Math.max(3, Math.min(60, Math.round(s.every) || 5));
  const note = `the ${name} logo, ${scan ? "scanned" : "glinting"} now and then`;
  return { name, slug, fn, Type, scan, every, note, colors: palette(d.colors), n: d.colors.length };
}

const block = (lines: string[]) => "String.raw`\n" + lines.map((l) => l.replace(/\s+$/, "")).join("\n") + "\n`";
const rowsOf = (list: string[]) => {
  const out: string[] = [];
  for (let k = 0; k < list.length; k += 6) out.push("    " + list.slice(k, k + 6).map((h) => JSON.stringify(h)).join(", ") + ",");
  return out.join("\n");
};
const wrap = (text: string) => {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && (line + " " + word).length > 76) out.push(line), (line = word);
    else line = line ? line + " " + word : word;
  }
  return [...out, line].map((l) => " * " + l).join("\n");
};

/** The piece's code, as TypeScript for src/pieces (`ts`) or as a plain script with no exports. */
export function source(d: Drawing, s: Settings, ts = true): string {
  const p = parts(d, s);
  const T = (text: string) => (ts ? text : "");
  const ex = T("export ");
  const one = p.n === 1;
  const pass = p.scan ? "scan" : "glint";
  const opt = p.scan ? "scan" : "shine";

  const meta = `${ex}const meta = {
  name: ${JSON.stringify(p.name)},
  category: ${JSON.stringify(s.category)},
  note: ${JSON.stringify(p.note)},
  cols: ${d.cols},
  rows: ${d.rows},
  fps: 30,
  options: { ${opt}: ${p.every} },
  // The logo's ${one ? "colour" : `${p.n} colours`} for a light page, then for a dark one; each as drawn, then twice lighter for the ${pass}.
  palette: [
${rowsOf(p.colors)}
  ],
}${T(` satisfies Meta<${p.Type}Options>`)};

// In a <pre>, in the page's own colour.
const MONO = ${block(d.mono)};

// On a canvas, and the colour of each cell: an index into the logo's colours.
const ART = ${block(d.art)};
const INK = ${block(d.ink)};
`;

  const glint = `
const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art${T(": string")}) => art.slice(1, -1).split("\\n").map((line) => line.padEnd(meta.cols));

${ex}${T("default ")}function ${p.fn}({ shine = meta.options.shine }${T(`: Partial<${p.Type}Options>`)} = {})${T(": Frame")} {
  const { cols, rows } = meta;
  const mono = lines(MONO), art = lines(ART), ink = lines(INK);
  const n = meta.palette.length / 6;
  const every = shine > 0 ? Math.max(shine, PASS + 0.5) : 0;
  // The glint crosses the logo's ink, edge to edge, rather than the whole frame.
  let lo = Infinity, hi = -Infinity;
  for (const pic of [mono, art])
    pic.forEach((line, y) => {
      for (let x = 0; x < cols; x++) if (line[x] !== " ") (lo = Math.min(lo, x + LEAN * y)), (hi = Math.max(hi, x + LEAN * y));
    });
  const span = hi - lo + 2 * HALF;

  return (t, { paper = false, color } = {}) => {
    const pic = color ? art : mono;
    const since = t - START;
    const at = every && since >= 0 ? lo - HALF + (span * (since % every)) / PASS : -Infinity;
    const out${T(": string[]")} = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        let ch = pic[y][x];
        if (ch !== " ") {
          const d = Math.abs(x + LEAN * y - at);
          let k = d < HALF ? 1 - d / HALF : 0;
          k = k * k * (3 - 2 * k);
          if (k > 0.55 && SOLID.includes(ch)) ch = "/";
          if (color) color[y * cols + x] = (paper ? 0 : 3 * n) + (k > 0.6 ? 2 : k > 0.25 ? 1 : 0) * n + parseInt(ink[y][x], 36);
        }
        line += ch;
      }
      out.push(line);
    }
    return out.join("\\n");
  };
}
`;

  const scan = `
const START = 0.5; // seconds before the first scan
const PASS = 2; // seconds a scan takes, top to bottom
const HEAD = 2; // rows the line scrambles
const TRAIL = 5; // rows of afterglow behind it
const NOISE = "#$%&*+<=>?@[]{}"; // what the line scrambles the logo into

const lines = (art${T(": string")}) => art.slice(1, -1).split("\\n").map((line) => line.padEnd(meta.cols));

function hash(x${T(": number")}, y${T(": number")}, k${T(": number")}) {
  let h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(k, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

${ex}${T("default ")}function ${p.fn}({ scan = meta.options.scan }${T(`: Partial<${p.Type}Options>`)} = {})${T(": Frame")} {
  const { cols, rows, fps } = meta;
  const mono = lines(MONO), art = lines(ART), ink = lines(INK);
  const n = meta.palette.length / 6;
  const every = scan > 0 ? Math.max(scan, PASS + 0.5) : 0;
  // The line runs from the logo's first row to past its last, rather than the whole frame.
  let first = rows, last = -1;
  for (const pic of [mono, art])
    pic.forEach((line, y) => {
      if (line.trim()) (first = Math.min(first, y)), (last = Math.max(last, y));
    });
  const span = last - first + 1 + HEAD + TRAIL;

  return (t, { paper = false, color } = {}) => {
    const pic = color ? art : mono;
    const since = t - START;
    const at = every && since >= 0 ? first + (span * (since % every)) / PASS : -Infinity;
    const tick = Math.floor((t * fps) / 2); // the noise changes every other frame
    const out${T(": string[]")} = [];
    for (let y = 0; y < rows; y++) {
      const d = at - y; // rows since the line reached this one
      const level = d >= 0 && d < HEAD ? 2 : d >= HEAD && d < HEAD + TRAIL ? 1 : 0;
      let line = "";
      for (let x = 0; x < cols; x++) {
        let ch = pic[y][x];
        if (ch !== " ") {
          if (level === 2) {
            const h = hash(x, y, tick);
            if (h % 4) ch = NOISE[(h >>> 2) % NOISE.length];
          }
          if (color) color[y * cols + x] = (paper ? 0 : 3 * n) + level * n + parseInt(ink[y][x], 36);
        }
        line += ch;
      }
      out.push(line);
    }
    return out.join("\\n");
  };
}
`;

  const body = meta + (p.scan ? scan : glint);
  if (!ts) return `// ${p.name}, drawn in ascii on https://ascii.rest/make/\n${body}`;

  const what = { logos: "language", companies: "company", distros: "distribution" }[s.category];
  const motion = p.scan
    ? "with a scan line running down it every few seconds that scrambles what it passes"
    : "with a glint crossing it every few seconds";
  const inColour = p.n > 0 && d.colors.every(black)
    ? "On a canvas it is black, and a light grey on a dark page, where black would sink into it"
    : `On a canvas it takes the logo's ${one ? "colour" : "colours"}, lifted on a dark page where ${one ? "it" : "they"} would sink into it`;
  return `/*
${wrap(`${p.name}: the ${clean(s.proper) || p.name} logo, ${motion}.`)}
 *
${wrap(`Drawn from ${clean(s.file) || "its SVG"} on ascii.rest/make: each cell holds the character whose shape best matches the logo's edge through it, and 8 where the logo is solid. ${inColour}; in a <pre> it is one ink, from the same drawing${d.knocked ? " with its white left out" : ""}. The logo is a trademark of its owner, shown here to name the ${what}.`)}
 */
import type { Frame, Meta } from "../types.ts";

export interface ${p.Type}Options {
  [key: string]: unknown;
  /** Seconds between ${pass}s; 0 keeps the logo still. */
  ${opt}: number;
}

${body}`;
}

/**
 * The piece itself, to play on the page: the plain script of `source`, run. Nothing in it is the reader's text but
 * the name, which `clean` has cut to letters, digits and a few marks and which sits in strings and a line comment;
 * the art is made of the characters in EDGE, and the rest is numbers and the code above.
 */
export function piece(d: Drawing, s: Settings): Piece {
  const { fn } = parts(d, s);
  const make = new Function(`${source(d, s, false)}\nreturn { meta, default: ${fn} };`) as () => { meta: Piece["meta"]; default: (o?: object) => Frame };
  return make();
}

/** The piece's name and file name, and how often it moves. */
export const about = (d: Drawing, s: Settings) => {
  const { name, slug, every, scan } = parts(d, s);
  return { name, slug, every, scan };
};

const attr = (text: string) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/** For any page, no build step: the piece inlined in a module that mounts it with mount.js from ascii.rest. */
export function embed(d: Drawing, s: Settings, mono: boolean): string {
  const { name, slug, fn } = parts(d, s);
  const id = `ascii-${slug}`;
  const el = mono
    ? `<pre id="${id}" role="img" aria-label="${attr(name)}" style="margin: 0; font: 10px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0"></pre>`
    : `<canvas id="${id}" role="img" aria-label="${attr(name)}" style="width: 100%; max-width: ${d.cols * 10}px"></canvas>`;
  return `${el}
<script type="module">
import { mount } from "https://ascii.rest/mount.js";

${source(d, s, false)}
mount(document.getElementById("${id}"), { meta, default: ${fn} });
</script>
`;
}

/** A GitHub README: the two SVGs beside it, the dark one in GitHub's dark theme. */
export function picture(d: Drawing, s: Settings): string {
  const { name, slug } = parts(d, s);
  return [
    `<picture>`,
    `  <source media="(prefers-color-scheme: dark)" srcset="${slug}.dark.svg">`,
    `  <img alt="${attr(name)}" src="${slug}.svg" width="${d.cols * 5}">`,
    `</picture>`,
  ].join("\n");
}
