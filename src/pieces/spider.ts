/*
 * spider: a spider drops from the hub of its web in the corner on a line of
 * silk, bounces at the end of it with its legs going, then climbs back up.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "spider",
  category: "creatures",
  note: "a spider lowering itself on silk, then climbing back up",
  cols: 28,
  rows: 24,
  fps: 15,
} satisfies Meta;

const LOOP = 10;
const HUB = [10, 4]; // the middle of the web, in columns and rows; the walls cut its outer ring
const RINGS = [3, 6]; // hexagonal rings, by how many rows they sit from the hub
const TOP = 3, LOW = 15.6; // rows the sprite's top hangs at, on the web and at the end of the line
// The left half of the spider, head down, in two leg poses; the right half
// is the mirror. A side in one pose and the other side in the other is a
// step, so both halves keep the same reach.
const POSES = [
  ["  \\    .-", "   \\  (##", " ___\\_ `-", " |    \\(@", "   ___/ `", "  /   /  ", "      |  "],
  ["   |   .-", "   \\  (##", " ___\\_ `-", "/     \\(@", "   ___/ `", "   |  /  ", "     /   "],
];
const MID = "|#-@V  ";
const FLIP: Record<string, string> = { "/": "\\", "\\": "/", "(": ")", ")": "(", "`": "'" };
const sprite = (l: number, r: number) => POSES[l].map((s, j) => s + MID[j] + [...POSES[r][j]].reverse().map((c) => FLIP[c] || c).join(""));
const SPRITES = [sprite(0, 0), sprite(0, 1), sprite(1, 0)];
const W = SPRITES[0][0].length, H = SPRITES[0].length;

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export default function spider(): Frame {
  const { cols, rows } = meta;
  const out: string[] = new Array(cols * rows);
  const set = (c: number, r: number, ch: string) => {
    if (c >= 0 && c < cols && r >= 0 && r < rows) out[r * cols + c] = ch;
  };

  // The web never changes, so it is drawn once and copied under each frame:
  // hexagonal rings, then eight spokes over them, out to the ceiling and the
  // wall above and to the left and just past the last ring elsewhere.
  out.fill(" ");
  const [hc, hr] = HUB, K = RINGS[RINGS.length - 1];
  for (const k of RINGS) {
    for (let c = hc - k + 1; c < hc + k; c++) set(c, hr - k, "_"), set(c, hr + k - 1, "_");
    for (const s of [-1, 1]) {
      for (let i = 1; i <= k; i++) set(hc + s * (k + i - 1), hr - k + i, s > 0 ? "\\" : "/");
      for (let i = 1; i < k; i++) set(hc + s * (2 * k - i), hr + i, s > 0 ? "/" : "\\");
    }
  }
  for (let j = 1; j < cols; j++) {
    set(hc, hr - j, "|");
    if (j <= K) set(hc, hr + j, "|");
    for (const s of [-1, 1]) {
      set(hc + s * j, hr - j, s > 0 ? "/" : "\\");
      if (j <= K) set(hc + s * j, hr + j, s > 0 ? "\\" : "/");
      const k = hr * cols + hc + s * j;
      if ((s < 0 ? hc - j >= 0 : j <= 2 * K) && out[k] === " ") out[k] = "_";
    }
  }
  set(hc, hr, "*");
  const web = out.slice();

  // A straight thread from the hub to the spinnerets: one glyph a row.
  const silk = (x0: number, y0: number, x1: number, y1: number) => {
    const k = (x1 - x0) / (y1 - y0);
    const g = Math.abs(k) < 0.3 ? "|" : k > 0 ? "\\" : "/";
    for (let r = Math.round(y0); r < Math.round(y1); r++) set(Math.floor(x0 + k * (r + 0.5 - y0)), r, g);
  };

  return (t) => {
    const u = (((t + 2.4) % LOOP) + LOOP) % LOOP;
    // Where the sprite's top row is, and how fast the legs go.
    let y = TOP, rate = 0, climb = -1;
    if (u >= 1 && u < 3.4) (y = TOP + (LOW - TOP) * ((u - 1) / 2.4) ** 2), (rate = 3);
    else if (u >= 3.4 && u < 6) {
      // The line stops paying out and the silk springs back: it leaves at the speed it fell.
      const s = u - 3.4, w = 6, v = (2 * (LOW - TOP)) / 2.4;
      (y = LOW + (v / w) * Math.exp(-s * 1.3) * Math.sin(s * w)), (rate = s < 1.8 ? 6 : 0);
    } else if (u >= 6 && u < 9.4) {
      // Hand over hand: a lurch up with each pull, then a pause.
      const pull = ((u - 6) / 3.4) * 8;
      y = LOW - (LOW - TOP) * ((Math.floor(pull) + ease((pull % 1) * 1.6)) / 8);
      climb = Math.floor(pull) & 1;
    }
    const sway = u > 3 && u < 7 ? 0.8 * Math.sin((u - 3) * 2.1) * Math.exp(-(u - 3) * 0.6) : 0;
    const r0 = Math.round(y), c0 = hc - (W >> 1) + Math.round(sway);

    // Legs step between poses, the two sides out of turn with each other.
    const pose = climb >= 0 ? 1 + climb : rate ? 1 + (Math.floor(u * rate) & 1) : u > 0.3 && u < 0.55 ? 1 : 0;
    const spr = SPRITES[pose];
    for (let i = 0; i < out.length; i++) out[i] = web[i];
    // Clear a cell's width of web round every mark, so no thread touches a leg.
    for (let j = 0; j < H; j++)
      for (let i = 0; i < W; i++)
        if (spr[j][i] !== " ") for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) set(c0 + i + di, r0 + j + dj, " ");
    // Off the hub, the line hangs where the lower spoke ran.
    if (r0 > hr) {
      for (let j = 1; j <= K; j++) if (out[(hr + j) * cols + hc] === "|") out[(hr + j) * cols + hc] = " ";
      silk(hc + 0.5, hr + 1, c0 + (W >> 1) + 0.5, r0);
    }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (spr[j][i] !== " ") set(c0 + i, r0 + j, spr[j][i]);
    const lines: string[] = [];
    for (let i = 0; i < rows; i++) lines.push(out.slice(i * cols, (i + 1) * cols).join(""));
    return lines.join("\n");
  };
}
