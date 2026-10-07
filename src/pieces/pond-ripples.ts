/*
 * pond-ripples: a pond from above in light rain. Each drop lands with a
 * splash and opens a ring, a fainter one following it in, that weakens to
 * dashes and dots before it reaches the bank. Where two rings cross they peak.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "pond ripples",
  category: "physics",
  note: "raindrops opening rings that cross and fade on a pond",
  cols: 64,
  rows: 20,
  fps: 20,
} satisfies Meta;

const CW = 0.6, CH = 1.2; // a cell in em; distances are in em
const START = 7.35; // seconds into the rain: two rings open and a third drop about to land
const EVERY = 1.5; // seconds between drops, on average
const LIFE = 4; // seconds a ring lasts
const SPEED = 2.6; // em per second
const WAVE = 1.5; // em from the ring to the fainter one inside it

// A hash of (drop, salt) into [0, 1), integer maths only.
function rand(i: number, salt: number): number {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/*
 * An ellipse with half widths ax and ay around (x0, y0), as cells and marks:
 * one mark a column where it runs flat, set at the height it crosses the
 * cell, and one a row where it runs steep. put(cell, mark, angle) gets each.
 * Small rings let the two overlap, so no corner goes missing.
 */
function ellipse(
  cols: number,
  rows: number,
  x0: number,
  y0: number,
  ax: number,
  ay: number,
  put: (cell: number, mark: string, angle: number) => void,
  small = true,
): void {
  const [flat, steep] = small ? [1.05, 1.25] : [0.9, 1.1];
  for (let c = 0; c < cols; c++) {
    const x = ((c + 0.5) * CW - x0) / ax;
    if (Math.abs(x) >= 1) continue;
    const s = Math.sqrt(1 - x * x);
    if (((ay / ax) * Math.abs(x)) / s > flat) continue;
    for (const sign of [-1, 1]) {
      const y = (y0 + sign * ay * s) / CH, r = Math.floor(y), f = y - r;
      if (r >= 0 && r < rows) put(r * cols + c, f < 0.3 ? "'" : f < 0.6 ? "-" : f < 0.85 ? "." : "_", Math.atan2(sign * s, x));
    }
  }
  for (let r = 0; r < rows; r++) {
    const y = ((r + 0.5) * CH - y0) / ay;
    if (Math.abs(y) >= 1) continue;
    const s = Math.sqrt(1 - y * y), lean = ((ax / ay) * Math.abs(y)) / s;
    if (lean > steep) continue;
    for (const sign of [-1, 1]) {
      const c = Math.floor((x0 + sign * ax * s) / CW);
      const mark = lean < 0.45 ? (sign < 0 ? "(" : ")") : (sign < 0) === (y < 0) ? "/" : "\\";
      if (c >= 0 && c < cols) put(r * cols + c, mark, Math.atan2(y, sign * s));
    }
  }
}

export default function pondRipples(): Frame {
  const { cols, rows } = meta;
  const N = cols * rows;
  const CX = (cols * CW) / 2, CY = (rows * CH) / 2;
  const AX = CX - 1.2, AY = CY - 1.12; // the bank, its top and bottom flat along a row's edge
  const bank: string[] = new Array(N).fill("");
  ellipse(cols, rows, CX, CY, AX, AY, (i, m) => (bank[i] = m), false);
  // How far in from the bank, 1 well inside, falling to 0 just short of it.
  const open = (x: number, y: number) => {
    const e = Math.min(1, Math.max(0, (1 - ((x - CX) / AX) ** 2 - ((y - CY) / AY) ** 2) / 0.35));
    return e * e * (3 - 2 * e);
  };

  // The drops alive at time t: where each fell, its age and how hard it struck.
  const drops = (t: number) => {
    const out: { x: number; y: number; age: number; a: number }[] = [];
    for (let i = Math.floor((t - LIFE) / EVERY) - 1; i <= Math.floor(t / EVERY) + 1; i++) {
      const age = t - (i + 0.7 * (rand(i, 0) - 0.5)) * EVERY;
      if (age < 0 || age > LIFE) continue;
      const r = 0.62 * Math.sqrt(rand(i, 1)), p = 2 * Math.PI * rand(i, 2);
      out.push({ x: CX + AX * r * Math.cos(p), y: CY + AY * r * Math.sin(p), age, a: 0.8 + 0.2 * rand(i, 3) });
    }
    return out.sort((p, q) => q.age - p.age);
  };

  const ink: string[] = new Array(N), level = new Uint8Array(N), owner = new Int16Array(N);
  return (time) => {
    const t = START + time;
    ink.fill(" "), level.fill(0), owner.fill(-1);
    // Level 1 is the faint ring, 2 a weakening one, 3 a full one; two full rings crossing peak.
    const kind = (m: string) => ("'-._".includes(m) ? 0 : "()".includes(m) ? 1 : m === "/" ? 2 : 3);
    const draw = (i: number, mark: string, lv: number, who: number) => {
      if (lv === 3 && level[i] === 3 && owner[i] !== who && kind(ink[i]) !== kind(mark)) (ink[i] = "x"), (level[i] = 4);
      else if (lv >= level[i] && level[i] < 4) (ink[i] = mark), (level[i] = lv), (owner[i] = who);
    };
    drops(t).forEach((dp, who) => {
      const c0 = Math.floor(dp.x / CW), r0 = Math.floor(dp.y / CH), at = r0 * cols + c0;
      // The splash: a drop, then a small ring.
      if (dp.age < 0.15) return draw(at, "o", 3, who);
      if (dp.age < 0.4) return draw(at - 1, "(", 3, who), draw(at + 1, ")", 3, who);
      const R = 0.5 + SPEED * dp.age, life = dp.a * (1 - dp.age / LIFE);
      // The ring: drawn whole while strong, in spaced dots as it weakens.
      ellipse(cols, rows, dp.x, dp.y, R, R, (i, mark, ang) => {
        const near = open(((i % cols) + 0.5) * CW, (Math.floor(i / cols) + 0.5) * CH);
        if (life > 0.45 && near > 0.6) draw(i, mark, 3, who);
        else if (life > 0.2 && near > 0.45 && Math.floor(((ang + Math.PI) * R) / 0.9) % 2) draw(i, mark === "_" || mark === "." ? "." : "·", 2, who);
      });
      // The fainter ring following it in, only while the first is strong; a dot every other step.
      const r2 = R - WAVE;
      if (life > 0.55 && r2 > 1.4)
        ellipse(cols, rows, dp.x, dp.y, r2, r2, (i, mark, ang) => {
          if (Math.floor(((ang + Math.PI) * r2) / 1.1) % 2) draw(i, "·", 1, who);
        });
    });
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) line += bank[r * cols + c] || ink[r * cols + c];
      lines.push(line);
    }
    return lines.join("\n");
  };
}
