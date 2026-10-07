/*
 * ferris wheel: a wheel of eight spokes turning slowly on a braced A-frame,
 * its cabins hanging upright from the rim and passing the boarding deck.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "ferris wheel",
  category: "objects",
  note: "a wheel turning on its a-frame, cabins hanging upright",
  cols: 64,
  rows: 26,
  fps: 10,
} satisfies Meta;

const N = 8; // spokes, one cabin at the end of each
const R = 10; // rim radius, in rows
const TURN = 30; // seconds per revolution
const BULBS = 24; // lights round the rim

export default function ferrisWheel(): Frame {
  const { cols, rows } = meta;
  const cx = 32.5, cy = 11.5; // the hub, in cells
  const ground = rows - 1;
  const out: string[] = new Array(cols * rows);
  const put = (c: number, r: number, g: string) => {
    c = Math.floor(c), r = Math.floor(r);
    if (c >= 0 && c < cols && r >= 0 && r < rows) out[r * cols + c] = g;
  };
  const text = (c: number, r: number, s: string) => [...s].forEach((g, i) => g !== " " && put(c + i, r, g));

  // The rim, traced once: each cell it crosses gets the glyph for the
  // slope and height of the arc inside it, and its upright sides take one
  // cell a row.
  const acc = new Map<number, number[]>();
  const side = R * 0.3;
  for (let r = Math.ceil(cy - side - 0.5); r + 0.5 < cy + side; r++) {
    const w = 2 * Math.sqrt(R * R - (r + 0.5 - cy) ** 2);
    for (const c of [cx - w, cx + w]) acc.set(r * cols + Math.floor(c), [1, 0.5, 1, 0]);
  }
  for (let i = 0; i < 2000; i++) {
    const p = (i / 2000) * 2 * Math.PI;
    const x = cx + 2 * R * Math.cos(p), y = cy + R * Math.sin(p);
    if (Math.abs(Math.floor(y) + 0.5 - cy) < side) continue;
    const k = Math.floor(y) * cols + Math.floor(x);
    const e = acc.get(k) || [0, 0, 0, 0];
    (e[0] += 1), (e[1] += y - Math.floor(y)), (e[2] += Math.abs(Math.cos(p))), (e[3] += Math.sin(p) * Math.cos(p) < 0 ? 1 : 0);
    acc.set(k, e);
  }
  // Only the fullest slanted cell on each row and side keeps its slant.
  const most = new Map<number, number>();
  const phiOf = ([n, , c]: number[]): number => (Math.atan2(c / n, Math.sqrt(Math.max(0, 1 - (c / n) ** 2))) * 180) / Math.PI;
  const id = (k: number): number => Math.floor(k / cols) * 2 + (k % cols < cx ? 0 : 1);
  // A row and side not in most yet looks up undefined, which acc never holds.
  for (const [k, e] of acc) if (phiOf(e) > 50 && phiOf(e) <= 72 && e[0] > (acc.get(most.get(id(k)) as number)?.[0] ?? 0)) most.set(id(k), k);
  const rim = [...acc].map(([k, e]): [number, string] => {
    const [n, fy, , fall] = e, phi = phiOf(e);
    return [k, phi > 72 ? "|" : most.get(id(k)) === k ? (fall / n > 0.5 ? "\\" : "/") : fy / n < 0.38 ? "'" : fy / n > 0.62 ? (phi > 10 ? "." : "_") : "-"];
  });

  // The A-frame: a pair of legs a side running from the axle down to the
  // ground, one cell a row, with rungs between each pair.
  const frame = new Map<number, string>();
  const top = Math.ceil(cy), slope = 0.9;
  for (const s of [-1, 1]) {
    for (let r = top; r < ground; r++) {
      const d = 1.2 + slope * (r - top);
      const a = Math.floor(cx + s * d), b = Math.floor(cx + s * (d + 2.6));
      frame.set(r * cols + a, s < 0 ? "/" : "\\");
      frame.set(r * cols + b, s < 0 ? "/" : "\\");
      if ((r - top) % 3 === 2) for (let c = Math.min(a, b) + 1; c < Math.max(a, b); c++) frame.set(r * cols + c, "─");
    }
  }

  return (t) => {
    const a = (2 * Math.PI * t) / TURN;
    out.fill(" ");
    const ends: [x: number, y: number][] = [];
    for (let k = 0; k < N; k++) {
      const th = a + (k * 2 * Math.PI) / N;
      const x = cx + 2 * R * Math.cos(th), y = cy + R * Math.sin(th);
      // Spokes, dotted from the hub to just short of the rim.
      for (let i = 3; i < 2 * R - 1; i++) put(cx + i * Math.cos(th), cy + (i / 2) * Math.sin(th), "·");
      ends.push([x, y]);
    }
    for (const [k, g] of rim) out[k] = g;
    // Bulbs on the rim between the cabins, every other one lit in turn.
    const blink = Math.floor(t / 0.6) % 2;
    for (let k = 0; k < BULBS; k++) {
      if (k % (BULBS / N) === 0) continue;
      const th = a + (k * 2 * Math.PI) / BULBS + Math.PI / BULBS;
      if ((k + blink) % 2) put(cx + 2 * R * Math.cos(th), cy + R * Math.sin(th), "*");
    }
    for (const [k, g] of frame) out[k] = g;
    text(cx - 1.5, cy, "(@)");

    // Cabins hang from each spoke end, always upright.
    for (const [x, y] of ends) {
      const c = Math.floor(x), r = Math.floor(y);
      put(c, r, "o");
      text(c - 2, r + 1, "╭─┴─╮");
      text(c - 2, r + 2, "╰───╯");
    }

    // The boarding deck under the lowest cabin, and the ground.
    text(cx - 7.5, ground - 1, "▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄");
    for (let c = 0; c < cols; c++) put(c, ground, "▀");
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
