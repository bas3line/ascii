/*
 * Frames as an animated SVG, for places that run no script, like a GitHub
 * README: one loop, sampled at 15 frames a second. Each distinct frame is a
 * group of text rows, one per line, coloured run by run from a palette, and
 * CSS shows each group in its turn. Rows are stretched to the cell grid with
 * textLength, so they line up in any monospace face. For reduced motion it
 * holds one frame, a still. It imports nothing, so the Worker that draws the
 * banners bundles only this and the piece it draws.
 *
 * A loop can also be a part of a bigger picture: part() writes it with its
 * classes under a prefix, and namespaced() reads an SVG this file wrote back
 * into such a part, so a banner can hold a logo's README SVG beside its text.
 */

/** A frame: its text, and each cell's index into the palette. */
export interface Shot {
  text: string;
  color: Uint8Array;
}

export interface Loop {
  cols: number;
  rows: number;
  /** Fills by palette index: colours, or a paint such as url(#g). */
  palette: readonly string[];
  /** The loop's length in seconds, and the time it starts at. */
  every: number;
  from: number;
  /** The frame at t seconds. */
  at: (t: number) => Shot;
  /** Played once, ending on its last frame, instead of over and over. */
  once?: boolean;
}

/** A picture in SVG units, its CSS and its elements, ready to sit in an SVG with others. */
export interface Part {
  width: number;
  height: number;
  css: string;
  body: string;
}

const FPS = 15;
const CW = 10, CH = 20; // a cell, in SVG units: the canvas's 1:2
const FONT = `${(CW / 0.6).toFixed(2)}px ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace`;
/** The rule every part's rows share. */
export const MONO = `text{font:${FONT};white-space:pre;dominant-baseline:central}`;
/** The faces the rows are set in, for text of another size. */
export const FACES = FONT.slice(FONT.indexOf(" ") + 1);

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** In an attribute, in double quotes. */
export const attr = (s: string) => esc(s).replace(/"/g, "&quot;");

/** A loop as a part, its classes and keyframes under `prefix`. */
export function part({ cols, rows, palette, every, from: t0, at, once = false }: Loop, prefix = ""): Part {
  const n = Math.round(every * FPS);
  const shots = Array.from({ length: n }, (_, i) => at(t0 + i / FPS));
  const same = (a: Shot, b: Shot) => a.text === b.text && a.color.every((v, i) => v === b.color[i]);

  // each distinct frame, with the slots it shows in
  const frames: { shot: Shot; slots: Set<number> }[] = [];
  shots.forEach((shot, i) => {
    const f = frames.find((f) => same(f.shot, shot));
    if (f) f.slots.add(i);
    else frames.push({ shot, slots: new Set([i]) });
  });

  const used = new Set<number>();
  const body = (shot: Shot) =>
    shot.text
      .split("\n")
      .map((line, y) => {
        const t = line.replace(/\s+$/, "");
        if (!t) return "";
        let out = "", run = "", cur = -1;
        const flush = () => {
          if (run) out += cur < 0 ? esc(run) : `<tspan class="${prefix}c${cur}">${esc(run)}</tspan>`;
          run = "";
        };
        for (let x = 0; x < t.length; x++) {
          const c = t[x] === " " ? cur : shot.color[y * cols + x];
          if (c !== cur) flush();
          if (c >= 0) used.add(c);
          cur = c;
          run += t[x];
        }
        flush();
        return `<text y="${(y + 0.5) * CH}" textLength="${t.length * CW}">${out}</text>`;
      })
      .join("");

  const width = cols * CW, height = rows * CH;
  const inks = () => [...used].sort((a, b) => a - b).map((c) => `.${prefix}c${c}{fill:${palette[c]}}`).join("");
  // One frame for the whole loop is a still: no animation at all.
  if (frames.length === 1) {
    const g = `<g>${body(frames[0].shot)}</g>`;
    return { width, height, css: inks(), body: g };
  }

  // Played once, the frame of the last slot stays: it is on at the end, and the fill holds it. Its 100% is written out
  // even when nothing changes there, since a keyframe left out ends on the group's own opacity, 0.
  const last = frames.findIndex((f) => f.slots.has(n - 1));
  const pct = (i: number) => `${+((i / n) * 100).toFixed(3)}%`;
  let keys = "", groups = "";
  frames.forEach((f, j) => {
    let kf = "", state = -1;
    for (let i = 0; i <= n; i++) {
      const v = i < n ? (f.slots.has(i) ? 1 : 0) : once && j === last ? 1 : 0;
      if (v !== state || (once && i === n)) (kf += `${pct(i)}{opacity:${v}}`), (state = v);
    }
    keys += `@keyframes ${prefix}k${j}{${kf}}.${prefix}k${j}{animation-name:${prefix}k${j}}`;
    groups += `<g class="${prefix}f ${prefix}k${j}">${body(f.shot)}</g>`;
  });
  // For reduced motion, the frame a loop starts on, or the one a single play ends on.
  const still = once ? last : 0;
  const css =
    inks() +
    `.${prefix}f{opacity:0;animation:${every}s step-end ${once ? "1 forwards" : "infinite"}}${keys}` +
    `@media (prefers-reduced-motion:reduce){.${prefix}f{animation:none}.${prefix}k${still}{opacity:1}}`;
  return { width, height, css, body: groups };
}

/** Parts as one SVG, `scale` pixels to a cell's width when nothing else sizes it: 10, the SVG units. */
export function wrap({ width: w, height: h, css, body }: Part, label: string, scale = CW): string {
  const px = (u: number) => +((u * scale) / CW).toFixed(2);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${px(w)}" height="${px(h)}" role="img" aria-label="${attr(label)}" xml:space="preserve">` +
    `<title>${esc(label)}</title><style>${MONO}${css}</style>${body}</svg>`
  );
}

/** A loop as a whole SVG. */
export const animated = (loop: Loop & { label: string; scale?: number }) => wrap(part(loop), loop.label, loop.scale);

/**
 * An SVG that wrap() wrote, as a part again with its classes and keyframes under `prefix`, so it can sit beside
 * another: its size from its viewBox, its CSS without the shared rule for rows, and its groups.
 */
export function namespaced(svg: string, prefix: string): Part | null {
  const box = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  const style = /<style>([\s\S]*?)<\/style>/.exec(svg);
  if (!box || !style || !style[1].startsWith(MONO)) return null;
  const css = style[1]
    .slice(MONO.length)
    .replace(/\.([ck]\d+|f)\{/g, `.${prefix}$1{`)
    .replace(/@keyframes k(\d+)/g, `@keyframes ${prefix}k$1`)
    .replace(/animation-name:k(\d+)/g, `animation-name:${prefix}k$1`);
  const body = svg
    .slice(style.index + style[0].length, svg.lastIndexOf("</svg>"))
    .replace(/class="f k(\d+)"/g, `class="${prefix}f ${prefix}k$1"`)
    .replace(/class="c(\d+)"/g, `class="${prefix}c$1"`);
  return { width: +box[1], height: +box[2], css, body };
}

/** The colour that inks the most cells of a part's first frame: a logo's own colour. */
export function inkOf({ css, body }: Part): string | null {
  const first = /<g[^>]*>([\s\S]*?)<\/g>/.exec(body)?.[1] ?? "";
  const count = new Map<string, number>();
  for (const m of first.matchAll(/<tspan class="([^"]+)">([^<]*)<\/tspan>/g))
    count.set(m[1], (count.get(m[1]) ?? 0) + m[2].replace(/\s/g, "").length);
  const top = [...count].sort((a, b) => b[1] - a[1])[0]?.[0];
  return top ? (new RegExp(`\\.${top}\\{fill:(#[0-9a-fA-F]{6})\\}`).exec(css)?.[1] ?? null) : null;
}
