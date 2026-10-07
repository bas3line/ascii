/*
 * snake: a diamondback seen from above, sliding along its own S-shaped track
 * and flicking its tongue. It leaves the right edge and comes back on the left.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "snake",
  category: "creatures",
  note: "a snake slithering along an s-curve, flicking its tongue",
  cols: 64,
  rows: 15,
  fps: 20,
} satisfies Meta;

const RAMP = " .:-=+*#%@";
const W = 64; // the world wraps at the frame's width
const LAMBDA = 32, AMP = 3.5, MID = 7; // the track: wavelength, height, middle row
const LEN = 44; // body length behind the snout, in columns
const SPEED = 6.4; // columns a second, so a lap is ten seconds
const K = (2 * Math.PI) / LAMBDA;
// The head, snout to the right, on rows -2 to 1 about its middle row. It
// stays level and the neck bends to meet it; eyes either side of the midline.
const HEAD = [
  "  ___      ",
  "-'  o`--._ ",
  "==::=====:>",
  "-.__o.--'' ",
];
const HL = HEAD[0].length; // columns from the back of the head to the snout
const NECK = 9; // columns of neck over which the body eases onto the track
const TIP = 6; // the last columns of the tail, drawn as a single thread

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const trackY = (x: number) => MID + AMP * Math.sin(K * x);
// Half the body's thickness, in half rows, by distance behind the snout: a
// neck as wide as the back of the head, a thick middle and a long taper.
const girth = (d: number) => {
  if (d < HL + 4) return 2.1;
  const f = d / LEN;
  if (f < 0.45) return 2.1 + 0.9 * Math.sin(((d - HL - 4) / (0.45 * LEN - HL - 4)) * (Math.PI / 2));
  return 3 * Math.max(0, 1 - ((f - 0.45) / 0.55) ** 1.3);
};

export default function snake(): Frame {
  const { cols, rows } = meta;
  const out: string[] = new Array(cols * rows);
  const put = (c: number, r: number, ch: string) => {
    if (r >= 0 && r < rows) out[r * cols + (((c % cols) + cols) % cols)] = ch;
  };

  return (t, { paper = false } = {}) => {
    const head = (((t * SPEED + 50) % W) + W) % W;
    const tip = Math.floor(head);
    // The head sits on whole rows where the track meets the back of it.
    const R = Math.round(trackY(tip - HL + 0.5) - 0.5);
    // The body's middle line, by distance behind the snout: level at the
    // head, easing onto the track down the neck.
    const midY = (d: number) => {
      const x = tip + 1 - d, m = ease((d - HL) / NECK);
      return R + 0.5 + (trackY(x) - R - 0.5) * m;
    };
    // How far across the body (x, y) is, as a share of its half width; 2 off it.
    const across = (x: number, y: number) => {
      const d = ((((tip + 1 - x) % W) + W) % W);
      if (d < HL - 1 || d >= LEN - TIP) return 2;
      const g = girth(d);
      if (g < 0.05) return 2;
      const s = (midY(d - 0.5) - midY(d + 0.5)) * 2; // slope in half rows a column
      return ((y - midY(d)) * 2) / Math.hypot(1, s) / g;
    };
    const ink = (v: number) => RAMP[paper ? RAMP.length - v : v];

    out.fill(" ");
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let n = 0, sx = 0, sy = 0;
        for (let j = 0; j < 4; j++)
          for (let i = 0; i < 3; i++) if (Math.abs(across(c + (i + 0.5) / 3, r + (j + 0.5) / 4)) < 1) (n++, (sx += i - 1), (sy += 1.5 - j));
        if (!n) continue;
        const k = r * cols + c;
        if (n < 7) {
          // An edge cell: the outline, facing the way the body lies.
          const ux = sx / n, uy = sy / n;
          if (Math.abs(uy) > Math.abs(ux) * 1.2) out[k] = uy < 0 ? (n < 4 ? "_" : "-") : n < 4 ? "'" : "-";
          else if (Math.abs(ux) > Math.abs(uy) * 2) out[k] = ux > 0 ? "(" : ")";
          else out[k] = ux * uy < 0 ? "/" : "\\";
          continue;
        }
        // A chain of diamonds down an even back, the flanks a shade lighter;
        // towards the tail the pattern gives out.
        const x = c + 0.5, d = ((((tip + 1 - x) % W) + W) % W);
        const v = Math.abs(across(x, r + 0.5));
        out[k] = v < 0.4 && d < 0.8 * LEN ? (Math.floor(d) & 1 ? "<" : ">") : ink(v > 0.62 || d > 0.88 * LEN ? 2 : 4);
      }
    }

    // The tip of the tail as a thread: one glyph a row where it is steep and
    // one a column where it is not, each nearest the middle of its slot.
    const slot = new Map<string, [number, number, number, number, boolean]>();
    for (let d = LEN - TIP; d < LEN; d += 0.05) {
      const x = tip + 1 - d, y = midY(d), s = (midY(d - 0.05) - midY(d + 0.05)) * 20, steep = Math.abs(s) > 1.2;
      const key = steep ? "r" + Math.floor(y) : "c" + Math.floor(x);
      const off = steep ? Math.abs(y - Math.floor(y) - 0.5) : Math.abs(x - Math.floor(x) - 0.5);
      if (!slot.has(key) || off < slot.get(key)![0]) slot.set(key, [off, x, y, s, steep]);
    }
    for (const [, x, y, s, steep] of slot.values()) {
      const r = Math.floor(y), f = y - r;
      // s > 0 runs down to the right.
      put(Math.floor(x), r, steep ? (s > 0 ? "\\" : "/") : Math.abs(s) > 0.5 ? (f < 0.5 ? (s > 0 ? "`" : "'") : ".") : f < 0.3 ? "'" : f > 0.7 ? "_" : "-");
    }

    // The head goes over the neck, blanking whatever body it covers, its
    // scales shaded like the back's.
    HEAD.forEach((l, j) => {
      const a = l.search(/\S/), b = l.trimEnd().length;
      for (let i = a; i < b; i++) put(tip - HL + 1 + i, R - 2 + j, l[i] === "=" ? ink(4) : l[i] === ":" ? ink(2) : l[i]);
    });
    // The forked tongue leaves the snout's tip, flicking out twice.
    const fl = t % 2.2;
    const len = fl > 0.2 && fl < 0.55 ? 3 : fl > 0.75 && fl < 1 ? 2 : 0;
    for (let i = 1; i <= len; i++) put(tip + i, R, i === len ? "<" : "-");

    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
