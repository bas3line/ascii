/*
 * Frames as an animated SVG, for places that run no script, like a GitHub
 * README: one loop, sampled at 15 frames a second. Each distinct frame is a
 * group of text rows, one per line, coloured run by run from a palette, and
 * CSS shows each group in its turn. Rows are stretched to the cell grid with
 * textLength, so they line up in any monospace face. For reduced motion it
 * holds the first frame, a still. It imports nothing, so the Worker that draws
 * the banners bundles only this and the piece it draws.
 */

/** A frame: its text, and each cell's index into the palette. */
export interface Shot {
  text: string;
  color: Uint8Array;
}

export interface Loop {
  cols: number;
  rows: number;
  palette: readonly string[];
  /** The loop's length in seconds, and the time it starts at. */
  every: number;
  from: number;
  /** The frame at t seconds. */
  at: (t: number) => Shot;
  /** What it shows, for its title and screen readers. */
  label: string;
  /** Its width and height in pixels a cell column, as an image sized by nothing else shows it: 10, two a row. */
  scale?: number;
}

const FPS = 15;
const CW = 10, CH = 20; // a cell, in SVG units: the canvas's 1:2

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// in an attribute, in double quotes
const attr = (s: string) => esc(s).replace(/"/g, "&quot;");

export function animated({ cols, rows, palette, every, from: t0, at, label, scale = CW }: Loop): string {
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
          if (run) out += cur < 0 ? esc(run) : `<tspan class="c${cur}">${esc(run)}</tspan>`;
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

  const pct = (i: number) => `${+((i / n) * 100).toFixed(3)}%`;
  let keys = "", groups = "";
  frames.forEach((f, j) => {
    let kf = "", state = -1;
    for (let i = 0; i <= n; i++) {
      const v = i < n && f.slots.has(i) ? 1 : 0;
      if (v !== state) (kf += `${pct(i)}{opacity:${v}}`), (state = v);
    }
    keys += `@keyframes k${j}{${kf}}.k${j}{animation-name:k${j}}`;
    groups += `<g class="f k${j}">${body(f.shot)}</g>`;
  });
  const inks = [...used].sort((a, b) => a - b).map((c) => `.c${c}{fill:${palette[c]}}`).join("");
  const font = `${(CW / 0.6).toFixed(2)}px ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace`;
  const css =
    `text{font:${font};white-space:pre;dominant-baseline:central}${inks}` +
    `.f{opacity:0;animation:${every}s step-end infinite}${keys}` +
    `@media (prefers-reduced-motion:reduce){.f{animation:none}.k0{opacity:1}}`;
  const w = cols * CW, h = rows * CH;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${cols * scale}" height="${rows * scale * 2}" role="img" aria-label="${attr(label)}" xml:space="preserve">` +
    `<title>${esc(label)}</title><style>${css}</style>${groups}</svg>`
  );
}
