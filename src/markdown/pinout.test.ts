// pinout: a chip and its pins, numbered the DIP way, a pulse running out of one.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf, fenceOf } from "./catalog.ts";
import { ACCENT, GLINT, INK, MARK, QUIET, SOFT, drawable, plain, type MarkdownPiece } from "./core.ts";
import { fromFence } from "./index.ts";
import { pinout } from "./pinout.ts";

const STILL = [
  "╭─ ne555 ──────────────────╮",
  "│         ╭───────╮        │",
  "│   gnd ──┤1 ●   8├── vcc  │",
  "│  trig ──┤2     7├── dis  │",
  "│   out ━━┤3     6├── thr  │",
  "│ reset ──┤4     5├── ctrl │",
  "│         ╰───────╯        │",
  "╰───────────────── 8 pins ─╯",
].join("\n");

const entry = entryOf("pinout");
const SOURCE = entry.source;
const INFO = fenceOf(entry).split("\n")[0].slice(3);
// What the fence draws.
const fenced = (info: string, body: string) => fromFence(info, body);

// Every frame at these times is its full size, a row of cols characters each, every one drawable.
function wellDrawn(p: MarkdownPiece, times: number[]) {
  const frame = p.default();
  for (const t of times) {
    const lines = frame(t, { paper: true }).split("\n");
    assert.equal(lines.length, p.meta.rows, `t=${t}`);
    for (const l of lines) {
      assert.equal(l.length, p.meta.cols, `t=${t}: ${l}`);
      for (const ch of l) assert.ok(drawable(ch), `t=${t}: ${JSON.stringify(ch)} in ${l}`);
    }
  }
}

// A frame at t, its text and its tones.
function toned(p: MarkdownPiece, t: number) {
  const color = new Uint8Array(p.meta.cols * p.meta.rows);
  const text = p.default()(t, { paper: true, color });
  return { text, color: [...color] };
}

test("pinout: the catalog's example draws its still through plain() and a fence", () => {
  assert.equal(INFO, "ascii pinout title=ne555 pulse=out");
  const p = pinout(SOURCE, { title: "ne555", pulse: "out" });
  assert.equal(plain(p), STILL);
  assert.equal(plain(fenced(INFO, SOURCE)), STILL);
  assert.equal(p.meta.cols, 28);
  assert.equal(p.meta.rows, 8);
  assert.equal(p.says, "pinout, ne555, 8 pins: 1 gnd, 2 trig, 3 out, 4 reset, 5 ctrl, 6 thr, 7 dis, 8 vcc; a pulse runs out of out.");
});

test("pinout: the body draws, the pins grow out in number order; the still holds after", () => {
  const p = pinout(SOURCE, { title: "ne555", pulse: "out" });
  assert.equal(p.meta.still, 1.1);
  const at = (t: number) => plain(p, { t }).split("\n");
  // the body's top rows first
  const early = at(0.15);
  assert.match(early[1], /╭───────╮/);
  assert.ok(!early.join("\n").includes("gnd") && !early[6].includes("╰"));
  // pins 1 to 3 out, the right side's not yet
  const mid = at(0.6);
  assert.ok(mid[2].includes("gnd ──┤1") && mid[4].includes("out ━━┤3") && !mid[5].includes("├"), mid.join("\n"));
  assert.equal(plain(p, { t: 1.1 }), STILL);
  wellDrawn(p, [0, 0.05, 0.2, 0.35, 0.42, 0.7, 1, 1.1, 1.5, 1.9]);
});

test("pinout: with a pulse, it runs out along the wire every 1.2 seconds, seamless, never in the still", () => {
  const p = pinout(SOURCE, { title: "ne555", pulse: "out" });
  const still = p.meta.still!;
  assert.equal(p.idle, true);
  assert.deepEqual(p.motion, { seconds: 1.2, from: 1.1, once: false });
  const s = toned(p, still);
  // the still: the pulse pin's wire heavy in the accent, its name marked, the rest ink and quiet
  const lines = s.text.split("\n");
  const tone = (x: number, y: number) => s.color[y * p.meta.cols + x];
  assert.equal(tone(lines[4].indexOf("━"), 4), ACCENT);
  assert.equal(tone(lines[4].indexOf("out"), 4), MARK);
  assert.equal(tone(lines[2].indexOf("gnd"), 2), INK);
  assert.equal(tone(lines[2].indexOf("─"), 2), QUIET);
  assert.equal(tone(lines[2].indexOf("1"), 2), SOFT);
  assert.ok(!s.color.includes(GLINT));
  // in its first 0.6 seconds the pulse lights the wire, then the name, from the body outward
  const lit = (t: number) => {
    const f = toned(p, t);
    return [...f.text.split("\n")[4]].map((ch, x) => (f.color[4 * p.meta.cols + x] === GLINT ? ch : "")).join("");
  };
  assert.equal(lit(still + 0.1), "━");
  assert.equal(lit(still + 0.3), "u");
  assert.equal(lit(still + 0.9), "");
  // the frame a cycle ends on is the still it started from, the text the same all the way round
  assert.deepEqual(toned(p, still + 1.2).color, s.color);
  assert.deepEqual(toned(p, still + 2.4), s);
  for (const t of [0.1, 0.3, 0.5, 0.8]) assert.equal(toned(p, still + t).text, s.text);
  assert.match(svg(p), /infinite/);
  // without a pulse it holds, and svg() plays it once
  const quiet = pinout(SOURCE, { title: "ne555" });
  assert.equal(quiet.idle, false);
  assert.match(plain(quiet), /out ──┤3/);
  assert.match(svg(quiet), /1 forwards/);
});

test("pinout: a pulse by number, no pins with -, quoted names, and numbers of two digits", () => {
  assert.equal(plain(pinout(SOURCE, { title: "ne555", pulse: 3 })), STILL);
  const p = pinout('vcc gnd\n- "rx in"\ntx -', { title: "uart" });
  // pins counted down the left and up the right, 1 to 6, a place with no pin a plain wall and no number
  assert.equal(
    plain(p),
    [
      "╭─ uart ──────────────────╮",
      "│       ╭───────╮         │",
      "│ vcc ──┤1 ●   6├── gnd   │",
      "│       │      5├── rx in │",
      "│  tx ──┤3      │         │",
      "│       ╰───────╯         │",
      "╰──────────────── 4 pins ─╯",
    ].join("\n"),
  );
  assert.equal(p.says, "pinout, uart, 4 pins: 1 vcc, 3 tx, 5 rx in, 6 gnd.");
  const rows = Array.from({ length: 14 }, (_, i) => `pa${i} pb${i}`).join("\n");
  const wide = plain(pinout(rows)).split("\n");
  assert.match(wide[2], /pa0 ──┤1  ●   28├── pb0/);
  assert.match(wide[15], /pa13 ──┤14     15├── pb13/);
});

test("pinout: takes its rows as data too", () => {
  const data = { rows: [["gnd", "vcc"], ["trig", "dis"], ["out", "thr"], ["reset", "ctrl"]] as [string, string][] };
  assert.equal(plain(pinout(data, { title: "ne555", pulse: "out" })), STILL);
  assert.equal(plain(pinout({ rows: [["a", null]] }, { frame: "none" })), ["    ╭───────╮", "a ──┤1 ●    │", "    ╰───────╯"].join("\n"));
});

test("pinout: a width centres it", () => {
  const p = pinout(SOURCE, { title: "ne555", width: 40 });
  assert.equal(p.meta.cols, 40);
  assert.match(plain(p).split("\n")[2], /^│ {9}gnd ──┤1/);
  assert.throws(() => pinout(SOURCE, { width: 20 }), /pinout needs 28 columns for this, and its width is 20/);
});

test("pinout: says what is wrong, the kit's way", () => {
  assert.throws(() => pinout(""), /ascii\.rest: pinout takes the chip's rows, a line each, its left pin and its right pin/);
  assert.throws(() => pinout("gnd vcc\nout"), /pinout's line 2 has 1 pin, "out": a line is a row of the chip, its left pin and its right pin, - for none/);
  assert.throws(() => pinout("gnd vcc extra"), /pinout's line 1 has 3 pins/);
  assert.throws(() => pinout("gnd vcc\nmode=fast x"), /pinout's line 2 has mode="fast": its options go on the fence/);
  assert.throws(() => pinout("- -"), /pinout's rows have no pins/);
  assert.throws(() => pinout(SOURCE, { pulse: "outt" }), /pinout's pulse takes one of its pins, by name or number: "outt" is not one, it has 1 gnd, 2 trig/);
  assert.throws(() => pinout(SOURCE, { pulse: 9 }), /pinout's pulse takes one of its pins/);
  assert.throws(() => pinout(SOURCE, { pulse: true as never }), /pinout's pulse takes a pin's name or number/);
  assert.throws(() => pinout(`gnd ${"v".repeat(30)}`), /pinout's row 1 takes pin names of 1 to 24 characters/);
  assert.throws(() => pinout("gnd vcç"), /ascii\.rest: pinout takes characters every monospace face draws one cell wide/);
  assert.throws(() => pinout({ rows: [["a"]] } as never), /pinout's row 1 takes its left pin and its right pin/);
  assert.throws(() => pinout(7 as never), /pinout\(\) takes the chip's rows/);
  assert.throws(() => pinout(SOURCE, { pulses: "out" } as never), /pinout\(\) has no option "pulses" \(did you mean "pulse"\?\)/);
});

test("pinout: never draws garbage, however long or odd its input", () => {
  // a 100-pin chip, long names, a pulse on a pin past the first ten
  const rows = Array.from({ length: 50 }, (_, i) => `left_${i}_${"x".repeat(i % 12)} ${i % 7 ? `right_${i}` : "-"}`).join("\n");
  const big = pinout(rows, { pulse: 42 });
  wellDrawn(big, [0, 0.3, 1, 2, big.meta.still!, big.meta.still! + 0.2, big.meta.still! + 0.5]);
  // the same name on both sides of a row marks one of them, so a row marks one run
  const twin = pinout("gnd gnd\nvcc out", { pulse: "gnd" });
  const { color } = toned(twin, twin.meta.still!);
  for (let y = 0; y < twin.meta.rows; y++) {
    const row = color.slice(y * twin.meta.cols, (y + 1) * twin.meta.cols).map((k) => k === MARK);
    assert.ok(row.filter((m, i) => m && !row[i - 1]).length <= 1, `row ${y}`);
  }
  // typographic quotes fold
  assert.match(plain(pinout("“a b” c")), /a b ──┤1/);
});
