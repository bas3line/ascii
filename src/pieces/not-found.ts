/*
 * not-found: a 404 page. The code in heavy block digits with a double-line
 * shadow, a small ghost drifting to and fro beneath it, and a line of copy.
 */
import type { Frame, Meta } from "../types.ts";

export interface NotFoundOptions {
  [key: string]: unknown;
  code: string;
  title: string;
  message: string;
}

export const meta = {
  name: "not found",
  category: "ui",
  note: "a block-letter 404 with a small ghost drifting beneath it",
  cols: 60,
  rows: 21,
  fps: 15,
  options: {
    code: "404",
    title: "page not found",
    message: "the page you asked for has moved or never existed",
  },
} satisfies Meta<NotFoundOptions>;

// A 3x5 font, each font column drawn 4 cells wide and the rows 2,1,2,1,2
// cells tall, so a digit is 12x8 and strokes are as thick across as down.
const FONT: Record<string, string> = {
  0: "###,#.#,#.#,#.#,###",
  1: "##.,.#.,.#.,.#.,###",
  2: "###,..#,###,#..,###",
  3: "###,..#,###,..#,###",
  4: "#.#,#.#,###,..#,..#",
  5: "###,#..,###,..#,###",
  6: "###,#..,###,#.#,###",
  7: "###,..#,..#,..#,..#",
  8: "###,#.#,###,#.#,###",
  9: "###,#.#,###,..#,###",
};
const RH = [2, 1, 2, 1, 2];
const DW = 12, DH = 8, GAP = 4;
const TOP = 1; // first row of the digits

// The ghost in square pixels, two to a cell, top half and bottom half.
const BODY = [
  "..####..",
  ".######.",
  "########",
  "########",
  "########",
  "########",
  "########",
  "########",
  "########",
];
const HEMS = [".##..##.", "#..##..#"];
const GW = 8;
const EYES = [1, 5]; // left column of each eye hole, two wide and four tall
const PERIOD = 9; // seconds for one trip there and back

export default function notFound({
  code = meta.options.code,
  title = meta.options.title,
  message = meta.options.message,
}: Partial<NotFoundOptions> = {}): Frame {
  const { cols, rows } = meta;
  const base: string[] = new Array(cols * rows).fill(" ");
  const face = new Uint8Array(cols * rows);

  let digits = String(code ?? "").replace(/[^0-9]/g, "").slice(0, 3).split("");
  if (!digits.length) digits = ["4", "0", "4"];
  const width = digits.length * DW + (digits.length - 1) * GAP + 1;
  const x0 = Math.floor((cols - width) / 2);
  digits.forEach((d, i) => {
    const rowsOf = FONT[d].split(",");
    let r = TOP;
    rowsOf.forEach((bits, fr) => {
      for (let k = 0; k < RH[fr]; k++, r++)
        for (let fc = 0; fc < 3; fc++)
          if (bits[fc] === "#") for (let c = 0; c < 4; c++) face[r * cols + x0 + i * (DW + GAP) + fc * 4 + c] = 1;
    });
  });

  // The shadow is the face moved one cell down and right, traced in double lines.
  const at = (r: number, c: number): boolean => r >= 0 && c >= 0 && r < rows && c < cols && face[r * cols + c] === 1;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (at(r, c)) {
        base[r * cols + c] = "█";
        continue;
      }
      const L = at(r, c - 1), U = at(r - 1, c), UL = at(r - 1, c - 1);
      base[r * cols + c] = L && U ? "╔" : L ? (UL ? "║" : "╗") : U ? (UL ? "═" : "╚") : UL ? "╝" : " ";
    }

  const put = (r: number, s: string) => {
    s = String(s).slice(0, cols);
    const c0 = Math.floor((cols - s.length) / 2);
    for (let i = 0; i < s.length; i++) base[r * cols + c0 + i] = s[i];
  };
  put(TOP + DH + 9, title);
  put(TOP + DH + 10, message);

  // The ghost's resting top in half rows. It bobs a half row either way and
  // always leaves a clear row under the digits' shadow.
  const BAND = (TOP + DH + 2) * 2 + 1;
  const px = new Uint8Array(cols * rows * 2);
  const out: string[] = new Array(cols * rows);

  return (t) => {
    const ph = (t / PERIOD) * Math.PI * 2;
    const gx = Math.round(cols / 2 - GW / 2 + 18 * Math.sin(ph));
    const gy = BAND + Math.round(Math.sin((t / 1.5) * Math.PI * 2));
    const look = Math.cos(ph) >= 0 ? 1 : 0; // 1 heading right

    px.fill(0);
    const shape = BODY.concat(HEMS[Math.floor(t * 4) % 2]);
    shape.forEach((line, y) => {
      for (let x = 0; x < GW; x++) if (line[x] === "#") px[(gy + y) * cols + gx + x] = 1;
    });
    // Eye holes sit on whole cells, so each shows a clear white cell above a
    // pupil: one half block in the bottom corner it is heading toward.
    const ey = ((gy + 3) >> 1) << 1;
    for (const ex of EYES) {
      const e = gx + ex;
      for (let y = 0; y < 4; y++) px[(ey + y) * cols + e] = px[(ey + y) * cols + e + 1] = 0;
      px[(ey + 3) * cols + e + look] = 1;
    }

    for (let k = 0; k < cols * rows; k++) {
      const r = (k / cols) | 0, c = k % cols;
      const a = px[2 * r * cols + c], b = px[(2 * r + 1) * cols + c];
      out[k] = a && b ? "█" : a ? "▀" : b ? "▄" : base[k];
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
