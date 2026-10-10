/*
 * pinout: a chip and what each of its pins does, numbered the DIP way, down
 * the left from 1 and back up the right, with pin 1's dot inside the body. A
 * hardware README, a board's docs. A pin named with `pulse` is the point of
 * the figure, an output say: its wire is live, and a pulse runs out along it
 * while the figure is in view.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii pinout title=ne555 pulse=out
 *   gnd vcc
 *   trig dis
 *   out thr
 *   reset ctrl
 *   ```
 *
 *   pinout("gnd vcc\ntrig dis\nout thr\nreset ctrl", { title: "ne555", pulse: "out" })
 *   pinout({ rows: [["gnd", "vcc"], ["trig", null]] })
 */
import { fail } from "../kit/core.ts";
import { show } from "../kit/recipes/checks.ts";
import { ACCENT, GLINT, INK, MARK, QUIET, SOFT, clean, component, progress, statements, type Common, type MarkdownPiece } from "./core.ts";

/** A chip as data: what a fence's body says, for pins already in JavaScript. */
export interface PinoutData {
  /** Each row of the chip, its left pin and its right pin: a name, or null where there is no pin. */
  rows: readonly (readonly [string | null, string | null])[];
}

export interface PinoutOptions extends Common {
  /** A pin, by its name or its number, whose wire is live and has a pulse running out along it: none by default. */
  pulse?: string | number;
}

// The build: the body draws, then each pin grows out in number order and its name types, PIN seconds a pin and at most
// PINS seconds for them all. Then, with a pulse, a cycle: the pulse runs out along the wire and through the name in its
// first RUN seconds, and rests.
const BODY = 0.3, PIN = 0.1, PINS = 2.4, CYCLE = 1.2, RUN = 0.6;
// The longest a pin's name may be.
const LONGEST = 24;

// The fence's body: each line a row, the left pin then the right pin, - for none.
function parse(source: string): PinoutData {
  const rows: [string | null, string | null][] = [];
  for (const s of statements(source, "pinout")) {
    const key = Object.keys(s.attrs)[0];
    if (key !== undefined) fail(`pinout's line ${s.line} has ${key}=${show(s.attrs[key])}: its options go on the fence, as \`\`\`ascii pinout ${key}=${s.attrs[key] || "..."}`);
    const pins = s.tokens.map((k) => ("word" in k ? (k.word === "-" ? null : k.word) : "text" in k ? k.text : ""));
    if (pins.length !== 2) fail(`pinout's line ${s.line} has ${pins.length} pin${pins.length === 1 ? "" : "s"}, ${show(s.raw)}: a line is a row of the chip, its left pin and its right pin, - for none, as gnd vcc`);
    rows.push([pins[0], pins[1]]);
  }
  if (!rows.length) fail(`pinout takes the chip's rows, a line each, its left pin and its right pin, as gnd vcc`);
  return { rows };
}

// Data, checked: every name cleaned, short, on one line.
function check(data: PinoutData): PinoutData {
  if (!data || typeof data !== "object" || !Array.isArray(data.rows)) fail(`pinout() takes the chip's rows, such as "gnd vcc\\nout thr", or { rows: [["gnd", "vcc"]] }, not ${show(data)}`);
  if (!data.rows.length) fail(`pinout's rows take at least one row, as ["gnd", "vcc"]`);
  const rows = data.rows.map((row, i) => {
    if (!Array.isArray(row) || row.length !== 2) fail(`pinout's row ${i + 1} takes its left pin and its right pin, as ["gnd", "vcc"], null for none, not ${show(row)}`);
    return row.map((pin) => {
      if (pin === null) return null;
      if (typeof pin !== "string") fail(`pinout's row ${i + 1} takes pins as names, or null for none, not ${show(pin)}`);
      const name = clean(pin, "pinout").replace(/\s+/g, " ").trim();
      if (!name || name.length > LONGEST) fail(`pinout's row ${i + 1} takes pin names of 1 to ${LONGEST} characters, not ${show(pin)}`);
      return name;
    }) as [string | null, string | null];
  });
  if (rows.every(([l, r]) => l === null && r === null)) fail(`pinout's rows have no pins: name one, - is a place with none`);
  return { rows };
}

// A pin as drawn: its number, its name, its side and row.
interface Pin {
  n: number;
  name: string;
  left: boolean;
  row: number;
  live: boolean;
}

/**
 * A chip and its pins from a fence's body, a row a line with its left pin and its right pin (- for none), or { rows }:
 * a DIP body with pin 1's dot inside, numbered down the left and back up the right, each pin's wire and name outside.
 * With `pulse`, a pin by its name or number, that pin's wire is live and its name marked, and a pulse runs out along
 * it every 1.2 seconds while it is in view. The body draws, then the pins grow out in number order.
 *
 *   pinout("vcc gnd\nrx tx", { title: "uart", pulse: "tx" })
 */
export function pinout(source: string | PinoutData, options?: PinoutOptions): MarkdownPiece {
  const data = check(typeof source === "string" ? parse(source) : source);
  return component("pinout", options, ["pulse"], (o, room) => {
    const n = data.rows.length;
    const pins: Pin[] = [];
    data.rows.forEach(([l, r], i) => {
      if (l !== null) pins.push({ n: i + 1, name: l, left: true, row: i, live: false });
      if (r !== null) pins.push({ n: 2 * n - i, name: r, left: false, row: i, live: false });
    });
    pins.sort((a, b) => a.n - b.n);
    if (o.pulse !== undefined) {
      if (typeof o.pulse !== "string" && !(typeof o.pulse === "number" && Number.isInteger(o.pulse))) fail(`pinout's pulse takes a pin's name or number, such as "out" or 3, not ${show(o.pulse)}`);
      const want = String(o.pulse);
      const hits = pins.filter((p) => p.name === want || String(p.n) === want);
      if (!hits.length) fail(`pinout's pulse takes one of its pins, by name or number: ${show(o.pulse)} is not one, it has ${pins.map((p) => `${p.n} ${p.name}`).join(", ")}`);
      // the first pin by that name in each row, so a row marks one name
      const rows = new Set<number>();
      for (const p of hits) if (!rows.has(p.row)) (rows.add(p.row), (p.live = true));
    }
    const live = pins.filter((p) => p.live);

    // across: the left names, right aligned, a space, a wire of 2, the body's wall, its inside, its wall, a wire of 2,
    // a space, the right names
    const L = Math.max(0, ...data.rows.map(([l]) => l?.length ?? 0));
    const Rw = Math.max(0, ...data.rows.map(([, r]) => r?.length ?? 0));
    const digits = String(2 * n).length;
    const inner = 2 * digits + 5;
    const left = L + 3, right = left + inner + 1;
    const W = right + 4 + Rw;
    const H = n + 2;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const count = pins.length;
    const status = `${count} pin${count === 1 ? "" : "s"}`;
    const edges = o.frame === "none" ? 0 : Math.max(status.length + 2, title ? title.length + 2 : 0);
    // a width too narrow for the chip is the chip's, which component() says is too wide for it
    const cols = room.cols === undefined ? Math.max(W, Math.min(room.max, edges)) : Math.max(room.cols, W);
    const dx = Math.floor((cols - W) / 2);

    const each = Math.min(PIN, PINS / count);
    const grown = BODY + each * count;
    const intro = Math.ceil(grown * 1000) / 1000;
    // where each pin draws: its wire's two cells and its name, from the body outward
    const placed = pins.map((p, k) => {
      const y = p.row + 1;
      const wire = p.left ? [left - 1, left - 2] : [right + 1, right + 2];
      const nameX = p.left ? L - p.name.length : right + 4;
      // the pulse's path, outward: the wire, the space, then the name's letters from the body out
      const letters = [...p.name].map((_, i) => (p.left ? nameX + p.name.length - 1 - i : nameX + i));
      return { ...p, y, wire, nameX, path: [...wire, p.left ? left - 3 : right + 3, ...letters], from: BODY + k * each };
    });

    return {
      cols,
      rows: H,
      intro,
      ...(live.length ? { cycle: CYCLE } : {}),
      status,
      says: `pinout${title ? `, ${title}` : ""}, ${status}: ${pins.map((p) => `${p.n} ${p.name}`).join(", ")}${live.length ? `; a pulse runs out of ${live.map((p) => p.name).join(" and ")}` : ""}.`,
      draw(s, t, at) {
        const x0 = at.x + dx, y0 = at.y;
        // the body draws a row at a time from the top
        const body = Math.ceil(progress(t, 0, BODY) * H);
        for (let y = 0; y < Math.min(body, H); y++) {
          if (y === 0 || y === H - 1) {
            s.write(x0 + left, y0 + y, `${y ? "╰" : "╭"}${"─".repeat(inner)}${y ? "╯" : "╮"}`, QUIET);
            continue;
          }
          s.set(x0 + left, y0 + y, "│", QUIET);
          s.set(x0 + right, y0 + y, "│", QUIET);
          if (y === 1) s.set(x0 + left + 1 + digits + 1, y0 + y, "●", SOFT);
        }
        // the pulse: where its front is along the path, in cells, while it runs; none in the still or at rest
        const u = t > grown && !at.still ? (t - grown) % CYCLE : -1;
        const front = u >= 0 && u < RUN ? -2 + (u / RUN) * (Math.max(...placed.map((p) => p.path.length)) + 4) : null;
        for (const p of placed) {
          const q = progress(t, p.from, p.from + each);
          if (q <= 0) continue;
          const y = y0 + p.y;
          // the number on the wall's inside, the wall a joint, the wire growing outward, the name typing
          s.set(x0 + (p.left ? left : right), y, p.left ? "┤" : "├", QUIET);
          const num = String(p.n);
          s.write(x0 + (p.left ? left + 1 : right - num.length), y, num, SOFT);
          const wire = Math.ceil(Math.min(1, q * 2) * 2);
          for (let i = 0; i < wire; i++) s.set(x0 + p.wire[i], y, p.live ? "━" : "─", p.live ? ACCENT : QUIET);
          const typed = Math.ceil(Math.max(0, q * 2 - 1) * p.name.length);
          const shown = p.left ? p.name.slice(p.name.length - typed) : p.name.slice(0, typed);
          s.write(x0 + (p.left ? p.nameX + p.name.length - typed : p.nameX), y, shown, p.live ? MARK : INK);
          if (!p.live || front === null) continue;
          // the cells near its front lit, the glint at it and the accent either side, the gap before the name skipped
          p.path.forEach((x, i) => {
            const ch = s.get(x0 + x, y);
            if (Math.abs(i - front) >= 1.5 || !ch || ch === " ") return;
            s.set(x0 + x, y, ch, Math.abs(i - front) < 0.75 ? GLINT : ACCENT);
          });
        }
      },
    };
  });
}
