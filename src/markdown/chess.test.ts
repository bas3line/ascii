// chess: a position from FEN, moves in UCI sliding square by square, the last move marked.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf, fenceOf } from "./catalog.ts";
import { ACCENT, INK, MARK, QUIET, SOFT, fence, plain } from "./core.ts";
import { chess } from "./chess.ts";

const STILL = [
  "╭─ ruy lopez ───────── f1b5 ─╮",
  "│ 8  r ░░░ b ░q░ k ░b░ n ░r░ │",
  "│ 7 ░p░ p ░p░ p ░░░ p ░p░ p  │",
  "│ 6    ░░░ n ░░░   ░░░   ░░░ │",
  "│ 5 ░░░[B]░░░   ░p░   ░░░    │",
  "│ 4    ░░░   ░░░ P ░░░   ░░░ │",
  "│ 3 ░░░   ░░░   ░░░ N ░░░    │",
  "│ 2  P ░P░ P ░P░   ░P░ P ░P░ │",
  "│ 1 ░R░ N ░B░ Q ░K░ · ░░░ R  │",
  "│    a  b  c  d  e  f  g  h  │",
  "╰──────────── black to move ─╯",
].join("\n");

const ENTRY = entryOf("chess");
// What a fence draws: its info string read as a fence reads it, its options handed to chess().
const fenced = (text: string) => {
  const [info, ...body] = text.split("\n");
  return chess(body.slice(0, -1).join("\n"), fence(info.slice(3)).options as never);
};
// The board's rows alone, the frame and its edges taken off.
const board = (text: string) => text.split("\n").slice(1, -1).map((l) => l.slice(2, -2)).join("\n");

test("chess: the catalog's example draws its still through plain() and a fence", () => {
  const p = chess(ENTRY.source, ENTRY.options as never);
  assert.equal(plain(p), STILL);
  assert.equal(plain(fenced(fenceOf(ENTRY))), STILL);
  assert.equal(p.meta.cols, 30);
  assert.equal(p.meta.rows, 11);
  assert.equal(
    p.says,
    "chess, ruy lopez, black to move after f1b5: white king e1, queen d1, rooks a1 h1, bishops b5 c1, knights b1 f3, pawns a2 b2 c2 d2 e4 f2 g2 h2; black king e8, queen d8, rooks a8 h8, bishops c8 f8, knights c6 g8, pawns a7 b7 c7 d7 e5 f7 g7 h7.",
  );
});

test("chess: the board draws in a rank at a time, the move slides square by square, and the still holds after", () => {
  const p = chess(ENTRY.source, ENTRY.options as never);
  const frame = p.default();
  const at = (t: number) => frame(t, { paper: true }).split("\n").map((l) => l.trimEnd()).join("\n");
  assert.equal(p.meta.still, 0.95);
  // early, the top ranks are in and the bottom ones not yet
  const early = at(0.1).split("\n");
  assert.match(early[1], /░░░/);
  assert.equal(early[8], "│                            │");
  // mid move, the bishop is on its way, in brackets, its from square a dot
  const mid = at(0.6).split("\n");
  assert.match(mid[7], /\[B\]/);
  assert.match(mid[8], / · /);
  assert.notEqual(at(0.6), STILL);
  assert.match(at(0.8).split("\n")[5], /\[B\]/);
  assert.equal(at(0.95), STILL);
  assert.equal(at(5), STILL);
  // it holds once built: no cycle, and its SVG plays the build once
  assert.equal(p.idle, false);
  assert.deepEqual(p.motion, { seconds: 0.95, from: 0, once: true });
  assert.match(svg(p), /1 forwards/);
});

test("chess: white ink, black soft, dark squares quiet, the moved piece marked and its from square's dot accent", () => {
  const p = chess(ENTRY.source, ENTRY.options as never);
  const { cols, rows, still } = p.meta;
  const color = new Uint8Array(cols * rows);
  const lines = p.default()(still!, { paper: true, color }).split("\n");
  const tone = (ch: string) => {
    for (let r = 1; r < rows - 1; r++) {
      const c = lines[r].indexOf(ch, 2);
      if (c >= 0 && c < cols - 2) return color[r * cols + c];
    }
    return -1;
  };
  assert.equal(tone("K"), INK);
  assert.equal(tone("k"), SOFT);
  assert.equal(tone("░"), QUIET);
  assert.equal(tone("["), MARK);
  assert.equal(tone("B"), MARK);
  assert.equal(tone("·"), ACCENT);
  // one marked run a row at most
  for (let r = 0; r < rows; r++) {
    const runs = [...color.slice(r * cols, (r + 1) * cols)].map((k) => (k === MARK ? 1 : 0)).join("").match(/1+/g) ?? [];
    assert.ok(runs.length <= 1, `row ${r}`);
  }
});

test("chess: a game played from the start reaches the same board, castles, takes en passant, promotes and sees check", () => {
  // the ruy lopez from the start
  const played = chess("start\ne2e4 e7e5\ng1f3 b8c6\nf1b5", { title: "ruy lopez" });
  assert.equal(board(plain(played)), board(STILL));
  // castling: the rook comes round the king
  const castled = plain(chess("start e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 e1g1")).split("\n");
  assert.equal(castled[0], "╭───────────────────── e1g1 ─╮");
  assert.equal(castled[8], "│ 1 ░R░ N ░B░ Q ░·░ R [K]    │");
  // en passant: the pawn passed is taken
  const ep = plain(chess("start e2e4 a7a6 e4e5 d7d5 e5d6")).split("\n");
  assert.equal(ep[3], "│ 6  p ░░░   [P]   ░░░   ░░░ │");
  assert.equal(ep[4], "│ 5 ░░░   ░░░   ░·░   ░░░    │");
  // promotion, to a queen by default and to what UCI names
  assert.match(plain(chess("8/P7/8/8/8/8/8/k6K w - - 0 1\na7a8")).split("\n")[1], /^│ 8 \[Q\]/);
  assert.match(plain(chess("8/P7/8/8/8/8/8/k6K w - - 0 1\na7a8n")).split("\n")[1], /^│ 8 \[N\]/);
  assert.match(plain(chess("k7/8/8/8/8/8/p7/7K b - - 0 1\na2a1r")).split("\n")[8], /^│ 1 \[r\]/);
  // the fool's mate: white to move, in check
  const mate = chess("start f2f3 e7e5 g2g4 d8h4");
  assert.match(plain(mate).split("\n").at(-1)!, /─ white to move, check ─╯$/);
  assert.match(mate.says, /^chess, white to move, in check after d8h4: /);
  // a capture: the piece taken blinks out as the taker comes
  const takes = chess("start e2e4 d7d5 e4d5");
  const frame = takes.default();
  const seen = new Set<string>();
  for (let t = 0.45 + 2 * 0.5; t < 0.45 + 2.5 * 0.5; t += 0.02) seen.add(frame(t, { paper: true }).split("\n")[4].slice(2, 30));
  assert.ok([...seen].some((l) => l.includes(" p ")) && [...seen].some((l) => !l.includes("p")), [...seen].join("\n"));
});

test("chess: start, no moves, white to move; and flip draws it from black's side", () => {
  const start = plain(chess("start")).split("\n");
  assert.equal(start[0], "╭────────────────────────────╮");
  assert.equal(start[1], "│ 8  r ░n░ b ░q░ k ░b░ n ░r░ │");
  assert.equal(start[8], "│ 1 ░R░ N ░B░ Q ░K░ B ░N░ R  │");
  assert.equal(start.at(-1), "╰──────────── white to move ─╯");
  const flipped = plain(chess("start e2e4", { flip: true })).split("\n");
  assert.equal(flipped[1], "│ 1  R ░N░ B ░K░ Q ░B░ N ░R░ │");
  assert.equal(flipped[2], "│ 2 ░P░ P ░P░ · ░P░ P ░P░ P  │");
  assert.equal(flipped[4], "│ 4 ░░░   ░░░[P]░░░   ░░░    │");
  assert.equal(flipped[9], "│    h  g  f  e  d  c  b  a  │");
  // a flip from a fence's bare word
  assert.equal(plain(fenced("```ascii chess flip\nstart e2e4\n```")), plain(chess("start e2e4", { flip: true })));
});

test("chess: takes its game as data too", () => {
  assert.equal(plain(chess({ fen: "start", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"] }, { title: "ruy lopez" })), STILL);
  assert.equal(plain(chess({ fen: "startpos" })), plain(chess("start")));
  assert.equal(chess({ fen: "8/8/8/8/8/8/8/8 w - - 0 1" }).says, "chess, white to move: white nothing; black nothing.");
});

test("chess: a long game shares its moves in under three seconds and never draws past its board", () => {
  const shuffle = Array.from({ length: 50 }, () => "g1f3 g8f6 f3g1 f6g8").join(" ");
  const p = chess(`start ${shuffle}`);
  assert.ok(p.meta.still! <= 3, String(p.meta.still));
  // the knights come home: the start, the last move's knight marked on g8 and its from square f6 a dot
  const after = board(plain(p)).split("\n");
  assert.equal(after[0], "8  r ░n░ b ░q░ k ░b░[n]░r░");
  assert.equal(after[2], "6    ░░░   ░░░   ░·░   ░░░");
  assert.deepEqual(after.slice(3), board(plain(chess("start"))).split("\n").slice(3));
  const frame = p.default();
  for (let t = 0; t <= p.meta.still! + 0.1; t += 0.05) {
    const lines = frame(t, { paper: true }).split("\n");
    assert.equal(lines.length, 11);
    assert.ok(lines.every((l) => l.length === 30));
  }
});

test("chess: says what is wrong, the kit's way", () => {
  assert.throws(() => chess(""), /ascii\.rest: chess takes a position in FEN, or start/);
  assert.throws(() => chess("   \n  "), /chess takes a position in FEN/);
  assert.throws(() => chess("start e2e5"), /chess's move 1, e2e5, can't be played: a pawn on e2 doesn't reach e5, a pawn goes one square forward, or two from its start/);
  assert.throws(() => chess("start e7e5"), /chess's move 1, e7e5, moves the black pawn on e7, and white is to move/);
  assert.throws(() => chess("start e3e4"), /chess's move 1, e3e4, moves from e3, and e3 is empty/);
  assert.throws(() => chess("start Nf3"), /chess's move 1, "Nf3", which is how a book writes it, is not UCI/);
  assert.throws(() => chess("start e2e4 zz"), /chess's move 2, "zz", is not UCI/);
  assert.throws(() => chess("start f1c4"), /a bishop on f1 doesn't reach c4, the white pawn on e2 is in the way/);
  assert.throws(() => chess("start e2e4 e7e5 g1f3 b8c6 e1g1"), /chess's move 5, e1g1, castles, and the bishop on f1 is in the way/);
  assert.throws(() => chess("start e1g1"), /chess's move 1, e1g1, lands on g1, where white's own knight stands/);
  assert.throws(() => chess("start g1e2"), /lands on e2, where white's own pawn stands/);
  assert.throws(() => chess("start b1b3q"), /promotes, and only a pawn promotes/);
  assert.throws(() => chess("8/8/8/8/8/8/8 w - - 0 1"), /chess's FEN has 7 ranks in "8\/8\/8\/8\/8\/8\/8", and a board has 8/);
  assert.throws(() => chess("8/8/8/8/8/8/8/7 w"), /chess's FEN rank 1, "7", covers 7 squares, and a rank has 8/);
  assert.throws(() => chess("8/8/8/8/8/8/8/x7 w"), /chess's FEN has "x" in rank 1/);
  assert.throws(() => chess({ fen: "8/8/8/8/8/8/8/8 x" }), /chess's FEN has "x" as its side to move: it takes w or b/);
  assert.throws(() => chess("KK6/8/8/8/8/8/8/8 w"), /chess's FEN has 2 white kings/);
  assert.throws(() => chess("start w"), /chess's start is the starting position/);
  assert.throws(() => chess("start\n♚"), /chess takes characters every monospace face draws one cell wide/);
  assert.throws(() => chess('start "e2e4"'), /chess's line 1 has words in quotes, "e2e4": chess reads a FEN and moves in UCI/);
  assert.throws(() => chess("start flip=true"), /chess's line 1 has flip="true": its options go on the fence, as ```ascii chess flip=true/);
  assert.throws(() => chess("start", { flip: "yes" as never }), /chess's flip takes true or false, not "yes"/);
  assert.throws(() => chess("start", { width: 20 }), /chess needs 30 columns for this, and its width is 20/);
  assert.throws(() => chess("start", { size: 2 } as never), /chess\(\) has no option "size"/);
  assert.throws(() => chess(42 as never), /chess\(\) takes a fence's body/);
  assert.throws(() => chess({ fen: "start", moves: "e2e4" as never }), /chess's moves take moves in UCI/);
});
