/*
 * A logo as an animated SVG, for places that run no script, like a GitHub
 * README: one loop of the piece's own glint or scan, sampled from the piece
 * itself. Each distinct frame is a group of text rows, one per line, coloured
 * run by run from the piece's palette, and CSS shows each group in its turn.
 * Rows are stretched to the cell grid with textLength, so they line up in any
 * monospace face. Light pages get the palette's light half, dark pages the
 * dark half; for reduced motion it holds the first frame, a still.
 */
import type { PieceName } from "ascii.rest";
import { load } from "ascii.rest";

/** The categories that loop with a fixed period, and the option that sets it. */
const LOOPS: Record<string, string> = { logos: "shine", companies: "shine", distros: "scan" };
const START = 0.5; // the pieces' first pass, in seconds
const FPS = 15;
const CW = 10, CH = 20; // a cell, in SVG units: the canvas's 1:2

/** Whether a piece of this category and these options has a README SVG. */
export const looping = (category: string, options?: Record<string, unknown>) =>
  category in LOOPS && typeof options?.[LOOPS[category]] === "number" && (options[LOOPS[category]] as number) > 0;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function svg(slug: PieceName, dark: boolean): Promise<string> {
  const { meta, default: make } = await load[slug]();
  if (!looping(meta.category, meta.options) || !meta.palette) throw new Error(`svg: ${slug} does not loop`);
  const every = meta.options![LOOPS[meta.category]] as number;
  const frame = make(meta.options);
  const { cols, rows, palette } = meta;
  const color = new Uint8Array(cols * rows);
  const at = (t: number) => ({ text: frame(t, { paper: !dark, color }), color: color.slice() });
  // A second of still, then the pass, then still again: the loop starts and ends between passes.
  const t0 = START + every - 1;
  const n = Math.round(every * FPS);
  const shots = Array.from({ length: n }, (_, i) => at(t0 + i / FPS));
  const inked = (a: { color: Uint8Array }, b: { color: Uint8Array }) => a.color.every((v, i) => v === b.color[i]);
  const same = (a: { text: string; color: Uint8Array }, b: { text: string; color: Uint8Array }) => a.text === b.text && inked(a, b);
  // The pass must come round every `every` seconds. Its colours show where it is; a distro's scan scrambles the letters
  // under it with noise that differs from pass to pass, so the letters are not compared.
  if (![0.37, 1.53, 2.21].every((x) => inked(at(t0 + x), at(t0 + x + every)))) throw new Error(`svg: ${slug} does not repeat every ${every} s`);

  // each distinct frame, with the slots it shows in
  const frames: { shot: (typeof shots)[number]; slots: Set<number> }[] = [];
  shots.forEach((shot, i) => {
    const f = frames.find((f) => same(f.shot, shot));
    if (f) f.slots.add(i);
    else frames.push({ shot, slots: new Set([i]) });
  });

  const used = new Set<number>();
  const body = (shot: (typeof shots)[number]) =>
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
  const inks = [...used].sort((a, b) => a - b).map((c) => `.c${c}{fill:${palette![c]}}`).join("");
  const font = `${(CW / 0.6).toFixed(2)}px ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace`;
  const css =
    `text{font:${font};white-space:pre;dominant-baseline:central}${inks}` +
    `.f{opacity:0;animation:${every}s step-end infinite}${keys}` +
    `@media (prefers-reduced-motion:reduce){.f{animation:none}.k0{opacity:1}}`;
  const w = cols * CW, h = rows * CH;
  const label = `${meta.name}, in ascii, from ascii.rest`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}" xml:space="preserve">` +
    `<title>${esc(label)}</title><style>${css}</style>${groups}</svg>`
  );
}
