// world: a world map with pins, the routes between them and a key.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Piece } from "../types.ts";
import { svg } from "../svg.ts";
import { entryOf } from "./catalog.ts";
import { ACCENT, INK, MARK, QUIET, SOFT, drawable, fence, plain } from "./core.ts";
import { fromFence } from "./index.ts";
import { AIRPORTS, world } from "./world.ts";

const STILL = [
  "╭─ regions ────────────────────────────────────╮",
  "│         ▄▄▄▄▄▄▄▄▄▄▄▖    ▖         ▄          │",
  "│ ▘ ████████▌ ▀█ ▝█▀▘▗  ▗▄▛██████████████████▛ │",
  "│       ▜██████▛▀▘     █▞2█▛▀█▜█████████▀▖     │",
  "│       ▝●██▛▜1       ▄█▄▄▄███████████▌▝       │",
  "│          ▀▘▄        ████████▀▘▝█▀▀█▛▗▖       │",
  "│             ████▄      ████▘     ▝3▐▙▖▄      │",
  "│              ▜███▘      ██▛▗        ▄▄▙▄▖    │",
  "│              ▟▛▀        ▀▀▘         ▀▀▀█▛    │",
  "│              ▛                               │",
  "│               ▖             ▗▄▄▄▄▄▄▄▄▄▄▖     │",
  "│ ▄██████████████████████████████████████████▄ │",
  "│                                              │",
  "│ ● sfo  us west                               │",
  "│ 1 iad  us east                               │",
  "│ 2 fra  eu central                            │",
  "│ 3 sin  asia                                  │",
  "╰──────────────────────────────────────────────╯",
].join("\n");

const ENTRY = entryOf("world");
const SOURCE = ENTRY.source;
const FENCE = "ascii world title=regions here=sfo";
const FLIGHTS = 'lhr "london"\njfk "new york"\nnrt "tokyo"\nsyd "sydney"\nroute lhr jfk\nroute lhr nrt\nroute jfk syd';

// A frame's text and its tones at t.
function toned(p: Piece, t: number) {
  const color = new Uint8Array(p.meta.cols * p.meta.rows);
  const text = p.default()(t, { paper: true, color });
  return { text, lines: text.split("\n"), color: [...color], at: (x: number, y: number) => color[y * p.meta.cols + x] };
}
// What two frames are: their text and their tones.
const frameOf = (p: Piece, t: number) => {
  const { text, color } = toned(p, t);
  return { text, color };
};
const trimmed = (p: Piece, t: number) => p.default()(t, { paper: true }).split("\n").map((l) => l.trimEnd()).join("\n");

test("world: the catalog's example draws its still, the earth piece's map in quadrant blocks, through plain() and a fence", () => {
  assert.equal(SOURCE, 'sfo "us west"\niad "us east"\nfra "eu central"\nsin "asia"');
  assert.deepEqual(ENTRY.options, { title: "regions", here: "sfo" });
  const p = world(SOURCE, { title: "regions", here: "sfo" });
  assert.equal(plain(p), STILL);
  // the fence's info string read as a fence reads it, and through fromFence()
  const { kind, options } = fence(FENCE);
  assert.equal(kind, "world");
  assert.equal(plain(world(SOURCE, options as never)), STILL);
  assert.equal(plain(fromFence(FENCE, SOURCE)), STILL);
  // 44 by 11 inside a 48 column frame, a blank row and a line for each place
  assert.equal(p.meta.cols, 48);
  assert.equal(p.meta.rows, 18);
  assert.equal(p.kind, "world");
  assert.equal(p.says, "world, 4 places: sfo, us west, here; iad, us east; fra, eu central; sin, asia.");
  // every character one a figure may draw, every row as wide as the frame
  for (const l of plain(p).split("\n")) {
    assert.ok([...l].every(drawable), l);
    assert.ok(l.length <= 48, l);
  }
  // plain ASCII for a place with no box drawing: the same shape, one character for one
  const ascii = plain(p, { ascii: true }).split("\n");
  assert.equal(ascii[4], "|       '*####1       _#___############'       |");
  assert.equal(ascii[13], "| * sfo  us west                               |");
});

test("world: the land resolves out of static from the west, then the pins drop in with a ring closing and the key types; the still holds after", () => {
  const p = world(SOURCE, { title: "regions", here: "sfo" });
  assert.equal(p.meta.still, 1.4);
  // at first only static at the west edge, in the lighter tone, no land and no pins yet
  const first = toned(p, 0);
  first.lines.slice(1, 12).forEach((l, y) =>
    [...l].forEach((ch, x) => {
      if (x > 1 && x < 46 && ch !== " ") (assert.equal(first.at(x, y + 1), SOFT, `${x},${y + 1}`), assert.ok(x < 30, `${x}`));
    }),
  );
  assert.equal(first.lines.slice(12, -1).join("").replace(/[│ ]/g, ""), "");
  // early on, the west resolved and the east static, in a lighter tone than the land
  const early = toned(p, 0.3);
  assert.notEqual(early.text, STILL);
  assert.equal(early.lines[2].slice(0, 12), STILL.split("\n")[2].slice(0, 12));
  assert.ok(early.lines.slice(1, 12).some((l, y) => [...l].some((ch, x) => x > 30 && ch !== " " && early.at(x, y + 1) === SOFT)));
  // the first pin's ring closes on it as the line for it types; the others not yet dropped
  const ring = trimmed(p, 0.75).split("\n");
  assert.match(ring[4], /\(.*\)/);
  assert.ok(!ring[4].includes("●"));
  const typing = ring[13].slice(2, -1).trimEnd();
  assert.ok(typing.length > 1 && typing.length < "● sfo  us west".length && "● sfo  us west".startsWith(typing), typing);
  assert.equal(ring[14].replace(/[│ ]/g, ""), "");
  // the pins land in order, each line of the key with it
  const mid = trimmed(p, 1.05).split("\n");
  assert.ok(mid[4].includes("●") && mid[4].includes("1") && !mid[3].includes("2"));
  assert.equal(mid[14], STILL.split("\n")[14]);
  // fra's ring closing and its line typing, sin's not started
  assert.match(mid[3], /\(.*\)/);
  assert.ok("2 fra  eu central".startsWith(mid[15].slice(2, -1).trimEnd()) && mid[15].slice(2, -1).trim().length < 16, mid[15]);
  assert.equal(mid[16].replace(/[│ ]/g, ""), "");
  assert.equal(trimmed(p, 1.4), STILL);
});

test("world: tones, the land quiet, the pins in the accent, here marked, the key's codes soft and its words ink", () => {
  const p = world(SOURCE, { title: "regions", here: "sfo" });
  const s = toned(p, p.meta.still!);
  for (let y = 1; y <= 11; y++)
    for (let x = 2; x < 46; x++) {
      const ch = s.lines[y][x];
      if ("▘▝▀▖▌▞▛▗▚▐▜▄▙▟█".includes(ch)) assert.equal(s.at(x, y), QUIET, `${x},${y}`);
    }
  assert.equal(s.lines[4][9], "●");
  assert.equal(s.at(9, 4), MARK);
  assert.equal(s.lines[4][14], "1");
  assert.equal(s.at(14, 4), ACCENT);
  assert.equal(s.at(2, 13), MARK);
  assert.equal(s.at(2, 14), ACCENT);
  assert.equal(s.at(4, 14), SOFT);
  assert.equal(s.at(9, 14), INK);
  // the mark is one run a row at most
  for (let y = 0; y < p.meta.rows; y++) {
    const row = Array.from({ length: p.meta.cols }, (_, x) => s.at(x, y));
    const runs = row.filter((k, x) => k === MARK && row[x - 1] !== MARK).length;
    assert.ok(runs <= 1, `row ${y}`);
  }
});

test("world: with here, the pin beacons every 2 seconds, a ring going out from it, seamless, and never in the still", () => {
  const p = world(SOURCE, { title: "regions", here: "sfo" });
  const still = p.meta.still!;
  assert.equal(p.idle, true);
  assert.deepEqual(p.motion, { seconds: 2, from: 1.4, once: false });
  const s = frameOf(p, still);
  // the frame a cycle ends on is the still it started from
  assert.deepEqual(frameOf(p, still + 2), s);
  assert.deepEqual(frameOf(p, still + 4), s);
  // the beacon: the pin drawn in to a •, a ring either side of it going out, then the pin again
  assert.equal(trimmed(p, still + 0.2).split("\n")[4].slice(8, 11), "(•)");
  assert.equal(trimmed(p, still + 0.36).split("\n")[4].slice(7, 12), "(▝•█)");
  assert.equal(trimmed(p, still + 0.5).split("\n")[4].slice(6, 13), "( ▝●██)");
  // the rest of the cycle, the map as it is held
  assert.equal(trimmed(p, still + 1.2), STILL);
  // without here or a route there is nothing to keep moving: it builds and holds
  const held = world(SOURCE);
  assert.equal(held.idle, false);
  assert.deepEqual(held.motion, { seconds: 1.4, from: 0, once: true });
  assert.equal(trimmed(held, 9), plain(held));
  // svg() loops the cycle from the end of the build, or plays the build once and holds
  assert.match(svg(p), /infinite/);
  assert.doesNotMatch(svg(p), /forwards/);
  assert.match(svg(held), /1 forwards/);
});

test("world: a route follows its great circle, dotted over the sea only, and a dot flies it every 2 seconds", () => {
  const p = world(FLIGHTS, { title: "flights" });
  const still = p.meta.still!;
  assert.equal(still, 2.2);
  assert.equal(p.says, "world, 4 places: lhr, london; jfk, new york; nrt, tokyo; syd, sydney; routes lhr to jfk, lhr to nrt, jfk to syd.");
  const map = plain(world(FLIGHTS.split("\n").filter((l) => !l.startsWith("route")).join("\n"), { title: "flights" })).split("\n");
  const lines = plain(p).split("\n");
  // the dots are on cells the map leaves as sea, and nowhere else changes
  let dots = 0;
  for (let y = 1; y <= 11; y++)
    for (let x = 0; x < 48; x++) {
      if (lines[y][x] === "·") (dots++, assert.equal(map[y][x], " ", `${x},${y}`));
      else assert.equal(lines[y][x], map[y][x], `${x},${y}`);
    }
  assert.ok(dots > 10, `${dots} dots`);
  // san francisco to frankfurt arcs up over the Atlantic, north of both, as a great circle does on this map
  const sfoFra = plain(world("sfo\nfra\nroute sfo fra", { width: 90 })).split("\n");
  const pinRows = ["1", "2"].map((m) => sfoFra.findIndex((l) => l.slice(2, -2).includes(m)));
  const dotRows = sfoFra.flatMap((l, y) => (l.includes("·") ? [y] : []));
  assert.ok(dotRows.length && Math.min(...dotRows) < Math.min(...pinRows), `${dotRows} vs ${pinRows}`);
  // new york to sydney goes the short way, over the Pacific: off the left edge and on at the right
  const nySyd = plain(world('jfk\nsyd\nroute jfk syd')).split("\n").slice(1, 12);
  assert.ok(nySyd.some((l) => l[2] === "·") && nySyd.some((l) => l[45] === "·"), nySyd.join("\n"));
  // mid trip, a dot and its trail in flight, in the accent; the cycle seamless
  const mid = toned(p, still + 0.6);
  assert.ok(mid.lines.slice(1, 12).some((l) => l.includes("●")));
  assert.ok(mid.lines.slice(1, 12).some((l) => l.includes("•")));
  mid.lines.forEach((l, y) => [...l].forEach((ch, x) => ch === "●" && assert.equal(mid.at(x, y), ACCENT)));
  assert.deepEqual(frameOf(p, still + 2), frameOf(p, still));
  // the routes draw in after the pins, from their first place
  assert.ok(trimmed(p, 1.5).split("·").length < plain(p).split("·").length);
  // two places at opposite ends of the earth have a route too
  const opposite = world('0 0 "here"\n0 180 "there"\nroute here there');
  assert.ok(plain(opposite).includes("·"));
});

test("world: takes its places as data too, by code or by latitude and longitude, a route by code or label", () => {
  const data = world(
    { places: [{ code: "sfo", label: "us west" }, { code: "iad", label: "us east" }, { code: "fra", label: "eu central" }, { code: "sin", label: "asia" }] },
    { title: "regions", here: "sfo" },
  );
  assert.equal(plain(data), STILL);
  const berlin = world({ places: [{ lat: 52.52, lon: 13.4, label: "berlin" }, { code: "JFK" }], routes: [["Berlin", "jfk"]] }, { here: "berlin" });
  assert.equal(plain(berlin), plain(world('52.52 13.40 "berlin"\njfk\nroute "berlin" jfk', { here: "berlin" })));
  assert.equal(plain(berlin), plain(world('52.52n 13.4e "berlin"\njfk\nroute berlin JFK', { here: "BERLIN" })));
  const key = plain(berlin).split("\n").slice(-3, -1);
  assert.deepEqual(key, ["│ ● 53n 13e  berlin                            │", "│ 1 jfk                                        │"]);
  assert.equal(berlin.says, "world, 2 places: 53n 13e, berlin, here; jfk; a route 53n 13e to jfk.");
  // south and west, by sign or by hemisphere
  assert.equal(plain(world("-33.9 151.2")), plain(world("33.9s 151.2e")));
  assert.equal(plain(world("-33.9 -70.8")), plain(world("33.9s 70.8w")));
});

test("world: a width scales the map, a row for every four columns, and coasts run smooth past the map's own scale", () => {
  const wide = world(SOURCE, { here: "sfo", width: 80 });
  assert.equal(wide.meta.cols, 80);
  assert.equal(wide.meta.rows, 2 + 19 + 1 + 4);
  const rows = plain(wide).split("\n");
  // still the earth: land in the north, open sea in the Pacific at the equator, Antarctica along the bottom
  assert.ok(rows[19].replace(/[│ ]/g, "").length > 70);
  assert.equal(rows[20].replace(/[│ ]/g, ""), "");
  assert.equal(rows[10].slice(2, 20).trim(), "");
  // a narrow one, and one with no frame
  assert.equal(world(SOURCE, { width: 28 }).meta.rows, 2 + 6 + 1 + 4);
  const bare = world(SOURCE, { frame: "none", here: "sfo" });
  assert.equal(bare.meta.cols, 44);
  assert.deepEqual(plain(bare).split("\n"), STILL.split("\n").slice(1, -1).map((l) => l.slice(2, -2).trimEnd()));
  // the widest a figure takes
  const widest = world(FLIGHTS, { width: 160 });
  assert.equal(widest.meta.cols, 160);
  for (const l of plain(widest).split("\n")) assert.ok([...l].every(drawable));
});

test("world: places that share a cell sit side by side, the many in a key of two columns, a long label cut", () => {
  // sfo and lax fall in one cell at 44 columns: lax takes the free cell nearest where it is, east of sfo
  const close = plain(world("sfo\nlax")).split("\n");
  assert.equal(close[4].slice(8, 12), "▝12█");
  // many places with short words: the key in two columns
  const codes = ["sfo", "sea", "ord", "jfk", "mex", "gru", "lhr", "fra", "cai", "jnb", "dxb", "bom", "sin", "hkg", "nrt", "syd"];
  const many = world(codes.join("\n"), { here: "lhr" });
  const lines = plain(many).split("\n");
  assert.equal(many.meta.rows, 2 + 11 + 1 + 8);
  assert.equal(lines[13], "│ 1 sfo                  8 cai                 │");
  assert.ok(lines.slice(1, 12).join("").includes("●"));
  assert.equal(new Set(lines.slice(1, 12).join("").match(/[1-9a-f●]/g)).size, 16);
  // twenty four places, the most a map takes, each on its own cell
  const all = Object.keys(AIRPORTS).slice(0, 24);
  const full = plain(world(all.join("\n"))).split("\n").slice(1, 12).join("");
  assert.equal(full.match(/[1-9a-o]/g)!.length, 24);
  // a label too long for the key is cut, the row as wide as the rest
  const long = plain(world(`sfo "${"a very long label ".repeat(6).trim()}"`)).split("\n");
  assert.match(long[13], /^│ 1 sfo  a very long .*\.\.\. │$/);
  assert.equal(long[13].length, 48);
});

test("world: a fence with no places draws the map alone, and holds", () => {
  const p = world("");
  assert.equal(p.meta.rows, 13);
  assert.equal(p.says, "world: a map of the world.");
  assert.deepEqual(plain(p).split("\n").slice(1, 12), STILL.split("\n").slice(1, 12).map((l) => l.replace(/[●123]/g, (c) => ({ "●": "▀", "1": "▀", "2": "█", "3": "█" })[c]!)));
  assert.equal(world("\n\n  \n").meta.rows, 13);
});

test("world: every airport in its list is in range and lands on the map", () => {
  const codes = Object.keys(AIRPORTS);
  assert.ok(codes.length >= 60, `${codes.length}`);
  for (const [code, [lat, lon]] of Object.entries(AIRPORTS)) {
    assert.match(code, /^[a-z]{3}$/);
    assert.ok(Math.abs(lat) <= 90 && Math.abs(lon) <= 180, code);
  }
  // known places where the map has them: sfo in North America's west, sin at the foot of Asia, syd in Australia
  const at = (code: string) => {
    const lines = plain(world(code, { frame: "none" })).split("\n");
    const y = lines.findIndex((l) => l.includes("1"));
    return [lines[y].indexOf("1"), y];
  };
  assert.deepEqual(at("sfo"), [7, 3]);
  assert.deepEqual(at("sin"), [34, 5]);
  assert.deepEqual(at("syd"), [40, 7]);
  assert.deepEqual(at("gru"), [16, 6]);
});

test("world: says what is wrong, the kit's way", () => {
  assert.throws(() => world("zzz"), /ascii\.rest: world has no airport "zzz": it knows \d+, as sfo, iad, fra and sin, and takes a latitude and longitude/);
  assert.throws(() => world("sfx"), /world has no airport "sfx" \(did you mean "sfo"\?\)/);
  assert.throws(() => world("sfo us west"), /world's line 1 names 3 places, "sfo", "us", "west": a line holds one place, then its label in quotes/);
  assert.throws(() => world('sfo "us" "west"'), /world's line 1 has 2 quoted labels, "us" and "west": a place has one/);
  assert.throws(() => world('"us west"'), /world's line 1 has no place: start it with an airport's code, as sfo "us west"/);
  assert.throws(() => world("52.5"), /world's line 1 has a latitude, 52\.5, and no longitude/);
  assert.throws(() => world("91 0"), /world's line 1 has "91" for a latitude, past 90 degrees: it takes -90 to 90/);
  assert.throws(() => world("0 181"), /world's line 1 has "181" for a longitude, past 180 degrees/);
  assert.throws(() => world("52.5e 13"), /world's line 1 has "52\.5e" for a latitude, whose hemisphere is n or s/);
  assert.throws(() => world("52 1x"), /world's line 1 has "1x" for a longitude: write degrees/);
  assert.throws(() => world("sfo\nsfo"), /world has sfo twice, as places 1 and 2: a place is on one line/);
  assert.throws(() => world("sfo\nroute sfo"), /world's line 2 routes from one place: a route joins two places, as route sfo fra/);
  assert.throws(() => world("sfo\nroute sfo fra"), /world's route 1 names "fra", and no line puts it on the map: there are sfo; name one by its code or its label/);
  assert.throws(() => world("sfo\nroute sfo sfo"), /world's route 1 goes from sfo to itself/);
  assert.throws(() => world("sfo here=1"), /world's line 1 has here="1": its options go on the fence, as ```ascii world here=1/);
  assert.throws(() => world('sfo "café"'), /ascii\.rest: world takes characters every monospace face draws one cell wide: .* not "é"/);
  assert.throws(() => world('sfo "us west'), /world's line 1 opens a quote it doesn't close/);
  assert.throws(() => world(Object.keys(AIRPORTS).slice(0, 25).join("\n")), /world takes 24 places at most, and has 25: split them over two maps/);
  assert.throws(() => world("sfo", { here: "lax" }), /world's here names "lax", and no line puts it on the map: there are sfo/);
  assert.throws(() => world("sfo\niad", { here: "iaf" }), /world's here names "iaf" \(did you mean "iad"\?\)/);
  assert.throws(() => world("", { here: "sfo" }), /world's here names "sfo", and no line puts it on the map: there are no places/);
  assert.throws(() => world("sfo", { width: 20 }), /world needs a width of 28 or more for its map, and its width is 20/);
  assert.throws(() => world("sfo", { width: 20, frame: "none" }), /world needs a width of 24 or more for its map/);
  assert.throws(() => world("sfo", { size: 2 } as never), /world\(\) has no option "size"/);
  assert.throws(() => world({ places: [{ code: 7 }] } as never), /world's place 1's code takes an airport's three letters, such as "sfo", not 7/);
  assert.throws(() => world({ places: [{ lat: 100, lon: 0 }] }), /world's place 1's lat takes degrees north from -90 to 90, not 100/);
  assert.throws(() => world({ places: [{ code: "sfo", lat: 1, lon: 2 }] }), /world's place 1 has a code and a latitude or longitude: give one or the other/);
  assert.throws(() => world({ places: [{ code: "sfo" }], routes: [["sfo"]] } as never), /world's route 1 takes two places by their code or label/);
  assert.throws(() => world(42 as never), /world\(\) takes a fence's body/);
  assert.throws(() => world({ places: "sfo" } as never), /world\(\) takes a fence's body/);
});

test("world: draws a frame fast at its default size and at its widest", () => {
  for (const p of [world(SOURCE, { title: "regions", here: "sfo" }), world(FLIGHTS, { width: 160 })]) {
    const frame = p.default();
    const from = performance.now();
    for (let i = 0; i < 120; i++) frame(i / 30, { paper: true });
    const each = (performance.now() - from) / 120;
    assert.ok(each < 8, `${each.toFixed(2)} ms a frame`);
  }
});
