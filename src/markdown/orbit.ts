/*
 * orbit: a hub and the rings of things around it, the satellites riding their
 * rings. What surrounds a project, its hosts and its formats, for a README or
 * docs. The rings are ellipses of dots, seen at a tilt; each ring goes round
 * the way the kit's orbiting() does, right, down in front, left and up behind,
 * a satellite on the far side passing under the hub and the near side over
 * it, the outer rings slower.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii orbit
 *   ascii.rest
 *   "react" "mdx" "svg"
 *   "readme" "terminal"
 *   ```
 *
 *   orbit({ hub: "ascii.rest", rings: [["react", "mdx", "svg"], ["readme", "terminal"]] })
 */
import { fail } from "../kit/core.ts";
import { show } from "../kit/recipes/checks.ts";
import { ACCENT, INK, QUIET, SOFT, clean, component, progress, shown, statements, type Common, type MarkdownPiece } from "./core.ts";

/** An orbit as data: what a fence's body says, for names already in JavaScript. */
export interface OrbitData {
  /** What is in the middle: "ascii.rest". */
  hub: string;
  /** The rings from the inside out, 1 to 3, each with 1 to 6 satellites: [["react", "mdx", "svg"], ["readme", "terminal"]]. */
  rings: readonly (readonly string[])[];
}

/** An orbit's options: the ones every figure takes. It has none of its own. */
export interface OrbitOptions extends Common {}

// The build: the hub types in, then each ring traces out round it, its satellites popping on as the trace reaches them.
const HUB_FOR = 0.3, RING_FOR = 0.3;
// Ring k (from 1) goes round once in 8k seconds.
const ROUND = 8;

// The fence's body: the hub on line 1, a bare word or a quoted text; each line after it a ring, its satellites as
// quoted texts or bare words.
function parse(source: string): OrbitData {
  const lines = statements(source, "orbit");
  if (!lines.length) fail(`orbit takes a hub on its first line and a ring of names on each line after it, such as ascii.rest then "react" "mdx" "svg"`);
  for (const s of lines) {
    const key = Object.keys(s.attrs)[0];
    if (key !== undefined) fail(`orbit's line ${s.line} has ${key}=${show(s.attrs[key])}: write a name bare, or in quotes when it has spaces`);
  }
  const [first, ...rest] = lines;
  if (first.texts.length > 1 || (first.texts.length && first.words.length)) fail(`orbit's hub is one name, and line ${first.line} has more: ${show(first.raw)}; its rings go on the lines after it`);
  const hub = first.texts[0] ?? first.words.join(" ");
  const rings = rest.map((s) => s.tokens.map((t) => ("text" in t ? t.text : "word" in t ? t.word : "")));
  return { hub, rings };
}

// Data, checked: a hub, 1 to 3 rings of 1 to 6 names each, all cleaned.
function check(data: OrbitData): { hub: string; rings: string[][] } {
  if (!data || typeof data !== "object" || Array.isArray(data)) fail(`orbit() takes a fence's body, a hub and a ring of names a line, or { hub, rings }, not ${show(data)}`);
  if (typeof data.hub !== "string" || !data.hub.trim()) fail(`orbit's hub takes a name, such as "ascii.rest", not ${show(data.hub)}`);
  const hub = clean(data.hub, "orbit's hub").replace(/\s+/g, " ").trim();
  if (!Array.isArray(data.rings) || !data.rings.length) fail(`orbit takes a ring of names round its hub ${show(hub)}, on the line after it, such as "react" "mdx" "svg"`);
  if (data.rings.length > 3) fail(`orbit takes 1 to 3 rings, not ${data.rings.length}: put more names on a ring, up to 6`);
  const rings = data.rings.map((ring, k) => {
    if (!Array.isArray(ring) || !ring.length || ring.length > 6) fail(`orbit's ring ${k + 1} takes 1 to 6 names, not ${Array.isArray(ring) ? ring.length : show(ring)}`);
    return ring.map((n) => {
      if (typeof n !== "string" || !n.trim()) fail(`orbit's ring ${k + 1} takes names, not ${show(n)}`);
      return clean(n, "orbit").replace(/\s+/g, " ").trim();
    });
  });
  return { hub, rings };
}

/**
 * A hub and the rings of things around it, from a fence's body, the hub on its first line and a ring of names on
 * each line after it, or { hub, rings }. Unframed by default, as wide as its outer ring. The hub types in and each ring
 * traces out round it; then the satellites ride their rings, ring k once round in 8k seconds, passing under the hub
 * behind it and over it in front. Its still is every satellite at its start, the first of ring 1 at the bottom.
 *
 *   orbit('ascii.rest\n"react" "mdx" "svg"\n"readme" "terminal"')
 */
export function orbit(source: string | OrbitData, options?: OrbitOptions): MarkdownPiece {
  const { hub, rings } = check(typeof source === "string" ? parse(source) : source);
  return component(
    "orbit",
    options,
    [],
    (o, room) => {
      // ring k's x radius clears the one inside it (the hub for ring 1) by half of each one's longest name and 3
      // columns; its y radius a quarter of that, seen at a tilt, and 2 rows a ring at the least
      const longest = rings.map((r) => Math.max(...r.map((n) => n.length)));
      const RX: number[] = [], RY: number[] = [];
      rings.forEach((_, k) => {
        RX.push(Math.ceil((k ? RX[k - 1] + longest[k - 1] / 2 : hub.length / 2) + longest[k] / 2 + 3));
        RY.push(Math.max(2 * (k + 1), Math.round(RX[k] / 4)));
      });
      const n = rings.length;
      const own = Math.max(2 * RX[n - 1] + longest[n - 1] + 1, hub.length + 2);
      if (room.cols !== undefined && own > room.cols) fail(`orbit needs ${own + (o.width! - room.cols)} columns for these rings, and its width is ${o.width}: give it a width of ${own + (o.width! - room.cols)} or more, or shorter names`);
      if (own > room.max) fail(`orbit needs ${own} columns for these rings, past the ${room.max} it can take: shorter names, or fewer rings`);
      const W = room.cols ?? own, H = 2 * RY[n - 1] + 1;
      const cx = Math.floor(own / 2) + Math.floor((W - own) / 2), cy = RY[n - 1];
      // each ring's dots, in the order its trace draws them, from its start angle round
      const start = (k: number) => Math.PI / 2 + (k * Math.PI) / 4;
      const dots = RX.map((rx, k) => {
        const seen = new Set<number>(), out: { x: number; y: number; at: number }[] = [];
        const steps = Math.max(720, 8 * rx);
        for (let i = 0; i < steps; i++) {
          const a = (i / steps) * 2 * Math.PI;
          const x = cx + Math.round(rx * Math.cos(a)), y = cy + Math.round(RY[k] * Math.sin(a));
          if ((x - cx + rx) % 2 !== 0 || seen.has(y * W + x)) continue;
          seen.add(y * W + x);
          // how far round from the ring's start the trace reaches it, 0 to 1
          out.push({ x, y, at: (((a - start(k)) / (2 * Math.PI)) % 1 + 1) % 1 });
        }
        return out;
      });
      const intro = Math.round((HUB_FOR + RING_FOR * n + 0.1) * 1000) / 1000;
      // the cycle: the rings' common period, 8, 16 or 48 seconds
      const cycle = ROUND * [1, 2, 6][n - 1];
      const tones = [INK, SOFT, SOFT];
      return {
        cols: W,
        rows: H,
        intro,
        cycle,
        fps: 15,
        says: `orbit: around ${hub}, ${rings.map((r) => r.join(", ")).join("; then ")}.`,
        draw(s, t, at) {
          // seconds into the cycle, 0 at the still and 0 again a cycle on, so the rings meet themselves exactly
          const k0 = Math.max(0, t - intro) / cycle;
          const ride = (k0 - Math.floor(k0) > 1 - 1e-9 ? 0 : k0 - Math.floor(k0)) * cycle;
          // how far each ring's trace has gone round, 0 to 1
          const traced = (k: number) => progress(t, HUB_FOR + RING_FOR * k, HUB_FOR + RING_FOR * (k + 1));
          dots.forEach((ring, k) => {
            const p = traced(k);
            for (const d of ring) if (p >= 1 || d.at < p) s.set(at.x + d.x, at.y + d.y, "·", QUIET);
          });
          // the satellites where they are, each with a blank cell either side, on the far side first
          const sats: { k: number; name: string; x: number; y: number; front: boolean }[] = [];
          rings.forEach((names, k) => {
            const p = traced(k);
            names.forEach((name, i) => {
              const place = i / names.length;
              if (p < 1 && place >= p) return;
              const a = start(k) + 2 * Math.PI * place + (2 * Math.PI * ride) / (ROUND * (k + 1));
              const y = cy + Math.round(RY[k] * Math.sin(a));
              sats.push({ k, name, x: cx + Math.round(RX[k] * Math.cos(a)), y, front: Math.sin(a) >= -1e-9 });
            });
          });
          const put = (m: (typeof sats)[number]) => s.write(at.x + m.x - Math.floor(m.name.length / 2) - 1, at.y + m.y, ` ${m.name} `, tones[m.k]);
          // behind: the outer rings first; in front: the inner rings first, each nearer over the last
          sats.filter((m) => !m.front).sort((a, b) => b.k - a.k).forEach(put);
          const typed = shown(t, 0, hub.length, hub.length / (HUB_FOR - 0.05));
          if (typed) s.write(at.x + cx - Math.floor(hub.length / 2) - 1, at.y + cy, ` ${hub.slice(0, typed)} `, ACCENT);
          sats.filter((m) => m.front).sort((a, b) => a.k - b.k).forEach(put);
        },
      };
    },
    { frame: "none" },
  );
}
