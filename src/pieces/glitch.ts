/*
 * glitch: a word set in a blocky pixel face holds clean, then breaks up in short
 * digital bursts: slices slide sideways and lose registration, cells corrupt.
 */
import type { Frame, Meta } from "../types.ts";

export interface GlitchOptions {
  [key: string]: unknown;
  text: string;
}

export const meta = {
  name: "glitch",
  category: "type",
  note: "a pixel word that tears into sliding slices in short bursts",
  cols: 64,
  rows: 13,
  fps: 15,
  options: { text: "noise" },
} satisfies Meta<GlitchOptions>;

// 5x7 glyphs: the character, then one base-32 digit per row (bit 4 is the left pixel).
const PACKED =
  "0ehjlphe14c4444e2eh1248v3v2421he426aiv225vgu11he668guhhe7v1248888ehhehhe9ehhf12c" +
  "AehhvhhhBuhhuhhuCehgggheDuhhhhhuEvgguggvFvggugggGehgnhhfHhhhvhhhIe44444eJ72222ic" +
  "KhikokihLggggggvMhrllhhhNhhpljhhOehhhhhePuhhugggQehhhlidRuhhukihSfgge11uTv444444" +
  "UhhhhhheVhhhhha4WhhhlllaXhha4ahhYhha4444Zv1248gv.0000004,0000048:0040040!4444404" +
  "?eh12404-000e000'4400000\"aa00000/11248gg&cik8lid+044v440·0004000*04lel40#aavavaa" +
  "(2488842)8422248@ehnlngf%op248j3=00v0v00_000000v 0000000";
const FONT: Record<string, number[]> = {};
for (let i = 0; i < PACKED.length; i += 8) {
  FONT[PACKED[i]] = [...PACKED.slice(i + 1, i + 8)].map((d) => parseInt(d, 32));
}

// One cycle: clean holds of at least 1.5s broken by bursts of [start, end, peak strength].
const PERIOD = 7;
const STEPS = 15; // glitch states per second
const BURSTS: [number, number, number][] = [
  [0.8, 1.2, 0.55],
  [2.75, 3.3, 1],
  [4.85, 5.3, 0.75],
];
const NOISE = "▓▒░▚▞▙▟▛▜#%=+";

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Lays the text out as rows of pixels, trimming each glyph to its inked columns.
function bitmap(text: string): number[][] {
  const px: number[][] = [[], [], [], [], [], [], []];
  for (const ch of text.toUpperCase()) {
    const g = FONT[ch] || FONT["?"];
    let lo = 4, hi = 0;
    for (let x = 0; x < 5; x++) if (g.some((b) => b & (16 >> x))) (lo = Math.min(lo, x)), (hi = Math.max(hi, x));
    if (ch === " ") (lo = 0), (hi = 2);
    if (px[0].length) px.forEach((row) => row.push(0));
    for (let y = 0; y < 7; y++) for (let x = lo; x <= hi; x++) px[y].push(g[y] & (16 >> x) ? 1 : 0);
  }
  return px;
}

export default function glitch({ text = meta.options.text }: Partial<GlitchOptions> = {}): Frame {
  const { cols, rows } = meta;
  const px = bitmap(String(text));
  const w = px[0].length;
  const sx = w * 2 <= cols - 8 ? 2 : 1; // pixels two cells wide when the word fits
  const x0 = Math.max(0, (cols - w * sx) >> 1);
  const y0 = (rows - 7) >> 1;
  const clean = new Uint8Array(cols * rows);
  for (let y = 0; y < 7; y++) {
    for (let c = 0; c < cols; c++) {
      const x = Math.floor((c - x0) / sx);
      if (c >= x0 && x < w && px[y][x]) clean[(y0 + y) * cols + c] = 1;
    }
  }
  const ink = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols && clean[r * cols + c] === 1;
  const out = new Array<string>(cols * rows);
  const shift = new Int8Array(rows);

  // How hard the picture is breaking at cycle time u, 0 when clean.
  const strength = (u: number) => {
    for (const [s, e, peak] of BURSTS) {
      if (u >= s && u < e) return peak * (0.35 + 0.65 * Math.sin((Math.PI * (u - s)) / (e - s)));
    }
    return 0;
  };

  return (t) => {
    const u = ((t % PERIOD) + PERIOD) % PERIOD;
    const step = Math.floor(u * STEPS + 1e-6);
    const rand = mulberry32(step * 7919 + 17);
    let s = strength(step / STEPS);
    if (s > 0 && rand() < 0.12) s = 0; // a clean flicker inside a burst
    out.fill(" ");
    shift.fill(0);
    if (!s) {
      for (let k = 0; k < out.length; k++) if (clean[k]) out[k] = "█";
      return join(out, cols, rows);
    }

    // Bands of rows slide sideways.
    const bands = 1 + Math.floor(rand() * (1 + 2 * s));
    for (let b = 0; b < bands; b++) {
      const top = y0 - 1 + Math.floor(rand() * 8);
      const h = 1 + Math.floor(rand() * 3);
      const dx = (rand() < 0.5 ? -1 : 1) * (3 + Math.floor(rand() * (2 + 8 * s)));
      for (let r = top; r < top + h && r < rows; r++) shift[r] += dx;
    }
    // The slid slices lose registration: a second channel stays behind where
    // the slice was.
    const split = rand() < 0.4 + 0.5 * s;
    const sub = 0.02 + 0.08 * s * rand();
    const holes = 0.01 + 0.04 * s;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const k = r * cols + c;
        if (ink(r, c - shift[r])) {
          const v = rand();
          out[k] = v < sub ? NOISE[Math.floor(rand() * NOISE.length)] : v < sub + holes ? " " : "█";
        }
      }
    }
    // It only shows on slices that slid well clear, where it clears the main
    // ink by a column, so it reads as a copy left behind rather than a shadow.
    const main = out.slice();
    const bare = (k: number, c: number) => main[k] === " " && (c === 0 || main[k - 1] === " ") && (c === cols - 1 || main[k + 1] === " ");
    for (let r = 0; split && r < rows; r++) {
      for (let c = 0; Math.abs(shift[r]) >= 5 && c < cols; c++) {
        const k = r * cols + c;
        if (bare(k, c) && ink(r, c)) out[k] = "▒";
      }
    }
    // Smears: a row's pixels drag out to one side and fade.
    const smears = rand() < 0.45 * s ? 1 + Math.floor(rand() * 2) : 0;
    for (let i = 0; i < smears; i++) {
      const r = y0 + Math.floor(rand() * 7);
      let c = Math.floor(rand() * cols);
      while (c < cols - 1 && out[r * cols + c] !== "█") c++;
      const len = 4 + Math.floor(rand() * 14 * s);
      for (let j = 1; j <= len && c + j < cols; j++) out[r * cols + c + j] = j > len - 2 ? "░" : j > len - 5 ? "▒" : "▓";
    }
    // Macroblocks: a patch of the picture copied in from somewhere else.
    const blocks = rand() < 0.5 * s ? 1 + Math.floor(rand() * 2) : 0;
    for (let i = 0; i < blocks; i++) {
      const bw = 3 + Math.floor(rand() * 10), bh = 1 + Math.floor(rand() * 2);
      const br = y0 + Math.floor(rand() * 7), bc = Math.floor(rand() * (cols - bw));
      const dr = Math.floor(rand() * 5) - 2, dc = Math.floor(rand() * 21) - 10;
      for (let r = br; r < br + bh && r < rows; r++) {
        for (let c = bc; c < bc + bw; c++) {
          const from = ink(r + dr, c + dc);
          out[r * cols + c] = from ? (rand() < 0.3 ? "▓" : "█") : rand() < 0.15 * s ? "░" : " ";
        }
      }
    }
    // A tear line through the word, or just above or below it.
    if (rand() < 0.5 * s) {
      const r = y0 - 1 + Math.floor(rand() * 9);
      const a = Math.floor(rand() * cols * 0.6), len = 6 + Math.floor(rand() * cols * 0.5);
      const g = "▀▄─═"[Math.floor(rand() * 4)];
      for (let c = a; c < Math.min(cols, a + len); c++) if (out[r * cols + c] === " " || rand() < 0.5) out[r * cols + c] = g;
    }
    // At full strength the whole picture sometimes jumps a row.
    if (s > 0.7 && rand() < 0.25) {
      const dir = rand() < 0.5 ? 1 : -1;
      const copy = out.slice();
      for (let r = 0; r < rows; r++) {
        const from = r - dir;
        for (let c = 0; c < cols; c++) out[r * cols + c] = from >= 0 && from < rows ? copy[from * cols + c] : " ";
      }
    }
    return join(out, cols, rows);
  };
}

function join(out: string[], cols: number, rows: number): string {
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
  return lines.join("\n");
}
