/*
 * chess: a chess position from FEN, and moves played from it in UCI, each
 * sliding its piece square by square. An opening in docs, a puzzle, a game an
 * agent reasons about. The board is drawn in text: white in capitals, black in
 * lower case, the dark squares shaded round their piece, the last move's from
 * square a dot and its piece in brackets.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii chess title="ruy lopez"
 *   r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3
 *   f1b5
 *   ```
 *
 *   chess("start e2e4 e7e5 g1f3", { flip: true })
 *   chess({ fen: "start", moves: ["e2e4", "c7c5"] })
 */
import { fail, type Surface } from "../kit/core.ts";
import { boolOf } from "../kit/recipes/checks.ts";
import { ACCENT, INK, MARK, QUIET, SOFT, clean, component, show, statements, type At, type Common, type MarkdownPiece } from "./core.ts";

/** A chess game as data: what a fence's body says, for a position already in JavaScript. */
export interface ChessData {
  /** The position in FEN, "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", or "start" for that one. */
  fen: string;
  /** Moves played from it in UCI: "e2e4", castling as the king's move "e1g1", a promotion "e7e8q". None by default. */
  moves?: readonly string[];
}

export interface ChessOptions extends Common {
  /** true draws the board from black's side, rank 1 at the top and the h file at the left: false by default. */
  flip?: boolean;
}

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const FILES = "abcdefgh";
const NAMES: Readonly<Record<string, string>> = { k: "king", q: "queen", r: "rook", b: "bishop", n: "knight", p: "pawn" };
const PLURALS: Readonly<Record<string, string>> = { k: "king", q: "queens", r: "rooks", b: "bishops", n: "knights", p: "pawns" };
// The fields after a FEN's placement, in order: who is to move, castling, the en passant square, the two clocks.
const FIELDS = [/^[wb]$/, /^(?:-|[KQkq]{1,4})$/, /^(?:-|[a-h][36])$/, /^\d+$/, /^\d+$/] as const;
const UCI = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;
// A move as people write it in a book, SAN, so an error can say UCI is wanted.
const SAN = /^(?:O-O(?:-O)?|0-0(?:-0)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=?[QRBN])?)[+#]?$/;

// The build: the board draws in a rank at a time from the top and its pieces land after, then each move slides.
const RANK = 0.03, PIECES = 0.12, DROP = 0.45, MOVE = 0.5, MOVES = 2.4;

// A square, 0 to 63: a1 is 0, h1 7, a8 56.
const fileOf = (sq: number) => sq & 7;
const rankOf = (sq: number) => sq >> 3;
const nameOf = (sq: number) => `${FILES[fileOf(sq)]}${rankOf(sq) + 1}`;
const squareOf = (name: string) => FILES.indexOf(name[0]) + 8 * (Number(name[1]) - 1);
const isWhite = (p: string) => p !== "" && p === p.toUpperCase();
const sideName = (white: boolean) => (white ? "white" : "black");

/** A move, played: where its piece went, the squares it slid through, what it took and what came along. */
interface Played {
  uci: string;
  from: number;
  to: number;
  /** The squares the piece passes, from its own to where it lands. */
  path: number[];
  /** The piece as it starts and as it lands (a promotion lands as another). */
  piece: string;
  lands: string;
  /** The square of a piece it takes, the landing square or the pawn passed by en passant; -1 for none. */
  takes: number;
  /** A castling rook's squares, or -1. */
  rookFrom: number;
  rookTo: number;
}

interface Game {
  /** The position before each move, and after the last. */
  boards: string[][];
  played: Played[];
  /** Who is to move once every move is played. */
  white: boolean;
}

// The fence's body: the first line is a FEN (or start), the words after it moves in UCI, on that line or later ones.
function parse(source: string): ChessData {
  const lines = statements(source, "chess");
  if (!lines.length) fail(`chess takes a position in FEN, or start, and moves after it in UCI if you like, such as start e2e4 e7e5`);
  const words: string[] = [];
  for (const s of lines) {
    const key = Object.keys(s.attrs)[0];
    if (key !== undefined) fail(`chess's line ${s.line} has ${key}=${show(s.attrs[key])}: its options go on the fence, as \`\`\`ascii chess ${key}=${s.attrs[key] && s.attrs[key].length <= 40 ? s.attrs[key] : "..."}`);
    if (s.texts.length) fail(`chess's line ${s.line} has words in quotes, ${show(s.texts[0])}: chess reads a FEN and moves in UCI, such as e2e4, and nothing else`);
    words.push(...s.words);
  }
  // the placement, then as many of FEN's fields as are there, in order; what follows is moves
  const fen = [words[0]];
  let i = 1;
  for (const field of FIELDS) {
    if (i < words.length && field.test(words[i]) && !UCI.test(words[i])) fen.push(words[i++]);
    else break;
  }
  return { fen: fen.join(" "), moves: words.slice(i) };
}

// A FEN read: the board, a8 to h1 rank by rank as it is written, who is to move, and the en passant square.
function position(fen: string): { board: string[]; white: boolean; ep: number } {
  const fields = fen.trim().split(/\s+/);
  const placement = fields[0] === "start" || fields[0] === "startpos" ? START.split(" ")[0] : fields[0];
  if (fields[0] === "start" || fields[0] === "startpos") {
    if (fields.length > 1) fail(`chess's start is the starting position, white to move, with nothing after it: write the FEN for another, not ${show(fen)}`);
    fields.push(...START.split(" ").slice(1));
  }
  fields.slice(1).forEach((f, i) => {
    if (i >= FIELDS.length) fail(`chess's FEN has ${fields.length} fields, and FEN has 6 at most: ${show(fen)}`);
    if (!FIELDS[i].test(f))
      fail(`chess's FEN has ${show(f)} as its ${["side to move", "castling", "en passant square", "halfmove clock", "move number"][i]}: it takes ${["w or b", "KQkq, some of them, or -", "a square on rank 3 or 6, or -", "a whole number", "a whole number"][i]}`);
  });
  const ranks = placement.split("/");
  if (ranks.length !== 8) fail(`chess's FEN has ${ranks.length} rank${ranks.length === 1 ? "" : "s"} in ${show(placement)}, and a board has 8: the ranks from the 8th down, split by /`);
  const board: string[] = new Array(64).fill("");
  ranks.forEach((row, i) => {
    const rank = 7 - i;
    let file = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) file += Number(ch);
      else if (/[pnbrqkPNBRQK]/.test(ch)) {
        if (file < 8) board[rank * 8 + file] = ch;
        file++;
      } else fail(`chess's FEN has ${show(ch)} in rank ${rank + 1}, ${show(row)}: a piece is p, n, b, r, q or k, white in capitals, and a digit is that many empty squares`);
    }
    if (file !== 8) fail(`chess's FEN rank ${rank + 1}, ${show(row)}, covers ${file} squares, and a rank has 8`);
  });
  for (const white of [true, false]) {
    const kings = board.filter((p) => p === (white ? "K" : "k")).length;
    if (kings > 1) fail(`chess's FEN has ${kings} ${sideName(white)} kings: a side has one king, or none in a study`);
  }
  const ep = fields[3] && fields[3] !== "-" ? squareOf(fields[3]) : -1;
  return { board, white: (fields[1] ?? "w") === "w", ep };
}

// Whether a square is attacked by a side's pieces, for check.
function attacked(board: string[], sq: number, byWhite: boolean): boolean {
  const f = fileOf(sq), r = rankOf(sq);
  const at = (df: number, dr: number) => (f + df < 0 || f + df > 7 || r + dr < 0 || r + dr > 7 ? null : board[(r + dr) * 8 + f + df]);
  const theirs = (p: string | null, kinds: string) => !!p && isWhite(p) === byWhite && kinds.includes(p.toLowerCase());
  const dir = byWhite ? -1 : 1;
  if (theirs(at(-1, dir), "p") || theirs(at(1, dir), "p")) return true;
  for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) if (theirs(at(df, dr), "n")) return true;
  for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    if (theirs(at(df, dr), "k")) return true;
    const kinds = df && dr ? "bq" : "rq";
    for (let k = 1; ; k++) {
      const p = at(df * k, dr * k);
      if (p === null) break;
      if (p) {
        if (theirs(p, kinds)) return true;
        break;
      }
    }
  }
  return false;
}

// A move checked as legal enough and played: a piece of the side to move, going where its kind can go, its way clear.
// Pins and moving into check are not looked at; a game from a real one never has them.
function play(board: string[], white: boolean, ep: number, uci: string, n: number): { played: Played; board: string[]; ep: number } {
  const m = UCI.exec(uci);
  if (!m) {
    const hint = SAN.test(uci) ? `, which is how a book writes it` : "";
    fail(`chess's move ${n}, ${show(uci)}${hint}, is not UCI: a move is its from square and its to square, such as f1b5, castling the king's move e1g1, and a promotion adds the piece, e7e8q`);
  }
  const from = squareOf(m[1]), to = squareOf(m[2]), promo = m[3];
  const piece = board[from];
  const said = `chess's move ${n}, ${uci},`;
  if (!piece) fail(`${said} moves from ${m[1]}, and ${m[1]} is empty`);
  if (isWhite(piece) !== white) fail(`${said} moves the ${sideName(!white)} ${NAMES[piece.toLowerCase()]} on ${m[1]}, and ${sideName(white)} is to move`);
  if (from === to) fail(`${said} moves from ${m[1]} to itself`);
  const target = board[to];
  if (target && isWhite(target) === white) fail(`${said} lands on ${m[2]}, where ${sideName(white)}'s own ${NAMES[target.toLowerCase()]} stands`);
  const kind = piece.toLowerCase();
  const df = fileOf(to) - fileOf(from), dr = rankOf(to) - rankOf(from);
  const sf = Math.sign(df), sr = Math.sign(dr);
  const cant = (why = "") => fail(`${said} can't be played: a ${NAMES[kind]} on ${m[1]} doesn't reach ${m[2]}${why}`);
  // the squares between from and to along a line, which must be empty
  const line = () => {
    const out = [from];
    for (let k = 1; k < Math.max(Math.abs(df), Math.abs(dr)); k++) {
      const sq = from + sf * k + 8 * sr * k;
      if (board[sq]) cant(`, the ${sideName(isWhite(board[sq]))} ${NAMES[board[sq].toLowerCase()]} on ${nameOf(sq)} is in the way`);
      out.push(sq);
    }
    return [...out, to];
  };
  let path: number[] = [from, to], takes = target ? to : -1, rookFrom = -1, rookTo = -1, lands = piece, next = -1;
  if (promo && kind !== "p") fail(`${said} promotes, and only a pawn promotes: the piece on ${m[1]} is a ${NAMES[kind]}`);
  if (kind === "n") {
    if (!((Math.abs(df) === 1 && Math.abs(dr) === 2) || (Math.abs(df) === 2 && Math.abs(dr) === 1))) cant();
    // the long leg first, then the short one, square by square: a knight jumps whatever is on them
    path = Math.abs(dr) === 2 ? [from, from + 8 * sr, from + 16 * sr, to] : [from, from + sf, from + 2 * sf, to];
  } else if (kind === "b") {
    if (Math.abs(df) !== Math.abs(dr)) cant();
    path = line();
  } else if (kind === "r") {
    if (df && dr) cant();
    path = line();
  } else if (kind === "q") {
    if (df && dr && Math.abs(df) !== Math.abs(dr)) cant();
    path = line();
  } else if (kind === "k") {
    const home = white ? 0 : 7;
    if (Math.abs(df) === 2 && dr === 0 && fileOf(from) === 4 && rankOf(from) === home) {
      // castling, written as the king's move: the rook comes round it
      rookFrom = home * 8 + (df > 0 ? 7 : 0);
      rookTo = from + sf;
      if (board[rookFrom] !== (white ? "R" : "r")) fail(`${said} castles, and there is no ${sideName(white)} rook on ${nameOf(rookFrom)} to castle with`);
      for (let sq = Math.min(from, rookFrom) + 1; sq < Math.max(from, rookFrom); sq++)
        if (board[sq]) fail(`${said} castles, and the ${NAMES[board[sq].toLowerCase()]} on ${nameOf(sq)} is in the way`);
      if (target) cant();
      path = [from, from + sf, to];
    } else if (Math.max(Math.abs(df), Math.abs(dr)) !== 1) cant(", a king goes one square, or two to castle");
  } else {
    const dir = white ? 1 : -1, start = white ? 1 : 6, last = white ? 7 : 0;
    if (df === 0 && dr === dir && !target) path = [from, to];
    else if (df === 0 && dr === 2 * dir && rankOf(from) === start && !board[from + 8 * dir] && !target) {
      path = [from, from + 8 * dir, to];
      next = from + 8 * dir;
    } else if (Math.abs(df) === 1 && dr === dir && target) path = [from, to];
    else if (Math.abs(df) === 1 && dr === dir && to === ep) {
      // en passant: the pawn it passes is taken
      takes = to - 8 * dir;
      if (board[takes] !== (white ? "p" : "P")) cant();
    } else cant(df === 0 ? (target ? `, a pawn takes diagonally` : `, a pawn goes one square forward, or two from its start`) : target ? "" : ", a pawn goes diagonally only to take");
    if (rankOf(to) === last) lands = white ? (promo ?? "q").toUpperCase() : (promo ?? "q");
    else if (promo) fail(`${said} promotes, and a pawn promotes only on the last rank`);
  }
  const after = board.slice();
  after[from] = "";
  if (takes >= 0) after[takes] = "";
  after[to] = lands;
  if (rookFrom >= 0) {
    after[rookTo] = after[rookFrom];
    after[rookFrom] = "";
  }
  return { played: { uci, from, to, path, piece, lands, takes, rookFrom, rookTo }, board: after, ep: next };
}

// Data, checked and played: the position and every move from it.
function gameOf(data: ChessData): Game {
  if (!data || typeof data !== "object") fail(`chess() takes a fence's body, such as start e2e4 e7e5, or { fen, moves }, not ${show(data)}`);
  if (typeof data.fen !== "string" || !data.fen.trim()) fail(`chess's fen takes a position in FEN, or "start", not ${show(data.fen)}`);
  if (data.moves !== undefined && !(Array.isArray(data.moves) && data.moves.every((m) => typeof m === "string"))) fail(`chess's moves take moves in UCI, such as ["e2e4", "e7e5"], not ${show(data.moves)}`);
  let { board, white, ep } = position(clean(data.fen, "chess's FEN"));
  const boards = [board], played: Played[] = [];
  (data.moves ?? []).forEach((written, i) => {
    const r = play(board, white, ep, clean(written, "chess's moves").trim(), i + 1);
    played.push(r.played);
    ({ board, ep } = r);
    white = !white;
    boards.push(board);
  });
  return { boards, played, white };
}

// What a screen reader hears of a side: its king, then queens, rooks, bishops, knights and pawns, each by square.
function sideSays(board: string[], white: boolean): string {
  const parts: string[] = [];
  for (const kind of "kqrbnp") {
    const squares = board
      .map((p, sq) => (p && p.toLowerCase() === kind && isWhite(p) === white ? sq : -1))
      .filter((sq) => sq >= 0)
      .sort((a, b) => fileOf(a) - fileOf(b) || rankOf(a) - rankOf(b))
      .map(nameOf);
    if (squares.length) parts.push(`${squares.length > 1 ? PLURALS[kind] : NAMES[kind]} ${squares.join(" ")}`);
  }
  return `${sideName(white)} ${parts.length ? parts.join(", ") : "nothing"}`;
}

/**
 * A chess board from a fence's body, a position in FEN (or `start`) and moves after it in UCI, or { fen, moves }.
 * White in capitals, black in lower case, a square 3 columns, the dark ones shaded `░` round their piece; ranks and
 * files along the edges. Each move is checked as legal enough: a piece of the side to move, going where its kind can,
 * its way clear (castling as the king's move, en passant, promotion). The board draws in a rank at a time, then each
 * move slides its piece square by square, a piece it takes blinking out. Its still is the final position, the last
 * move's from square a dot and its piece in brackets; the label is the last move and the status who is to move.
 *
 *   chess("r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3\nf1b5", { title: "ruy lopez" })
 *   chess({ fen: "start", moves: ["e2e4", "e7e5"] }, { flip: true })
 */
export function chess(source: string | ChessData, options?: ChessOptions): MarkdownPiece {
  const game = gameOf(typeof source === "string" ? parse(source) : source);
  return component("chess", options, ["flip"], (o) => {
    const flip = boolOf("chess's flip", o.flip, false);
    const { boards, played } = game;
    const final = boards[boards.length - 1];
    const last = played[played.length - 1];
    const toMove = sideName(game.white);
    const king = final.indexOf(game.white ? "K" : "k");
    const check = king >= 0 && attacked(final, king, !game.white);
    // the moves share at most MOVES seconds, half a second each when there are few
    const each = played.length ? Math.min(MOVE, MOVES / played.length) : 0;
    const intro = DROP + each * played.length;
    // where a square is drawn: its first column and its row
    const xOf = (sq: number) => 2 + 3 * (flip ? 7 - fileOf(sq) : fileOf(sq));
    const yOf = (sq: number) => (flip ? rankOf(sq) : 7 - rankOf(sq));
    const files = (s: Surface, at: At) => {
      for (let col = 0; col < 8; col++) s.set(at.x + 3 + 3 * col, at.y + 8, flip ? FILES[7 - col] : FILES[col], SOFT);
    };
    // a square: shaded when dark, its piece in its colour's tone, or the dot a move left
    const square = (s: Surface, at: At, sq: number, p: string, dot = false) => {
      const shade = (fileOf(sq) + rankOf(sq)) % 2 === 0 ? "░" : " ";
      const x = at.x + xOf(sq), y = at.y + yOf(sq);
      s.set(x, y, shade, QUIET);
      s.set(x + 2, y, shade, QUIET);
      if (dot) s.set(x + 1, y, "·", ACCENT);
      else if (p) s.set(x + 1, y, p, isWhite(p) ? INK : SOFT);
      else s.set(x + 1, y, shade, QUIET);
    };
    // the piece a move moves, in brackets, the one thing the figure singles out
    const moved = (s: Surface, at: At, sq: number, p: string) => s.write(at.x + xOf(sq), at.y + yOf(sq), `[${p}]`, MARK);
    const says = `chess${typeof o.title === "string" && o.title.trim() ? `, ${o.title.trim()}` : ""}, ${toMove} to move${check ? ", in check" : ""}${last ? ` after ${last.uci}` : ""}: ${sideSays(final, true)}; ${sideSays(final, false)}.`;
    return {
      cols: 26,
      rows: 9,
      intro,
      ...(last ? { label: last.uci } : {}),
      status: `${toMove} to move${check ? ", check" : ""}`,
      says,
      category: "data",
      draw(s, t, at) {
        // the board draws in a rank at a time from the top, its pieces landing a moment after each rank
        if (t < DROP) {
          const board = boards[0];
          for (let row = 0; row < 8; row++) {
            if (t < row * RANK) break;
            s.set(at.x, at.y + row, String(flip ? row + 1 : 8 - row), SOFT);
            for (let col = 0; col < 8; col++) {
              const sq = flip ? row * 8 + 7 - col : (7 - row) * 8 + col;
              square(s, at, sq, t >= PIECES + row * RANK ? board[sq] : "");
            }
          }
          if (t >= 8 * RANK) files(s, at);
          return;
        }
        for (let row = 0; row < 8; row++) s.set(at.x, at.y + row, String(flip ? row + 1 : 8 - row), SOFT);
        files(s, at);
        // the finished board: the last move marked
        if (t >= intro || !played.length) {
          final.forEach((p, sq) => square(s, at, sq, p, !!last && sq === last.from));
          if (last) moved(s, at, last.to, last.lands);
          return;
        }
        // a move under way: its piece slides square by square along its path; a piece it takes blinks out
        const k = Math.min(played.length - 1, Math.floor((t - DROP) / each));
        const mv = played[k];
        const p = Math.min(1, (t - DROP - k * each) / each);
        const step = Math.min(mv.path.length - 1, Math.floor(p * mv.path.length));
        const landed = step === mv.path.length - 1;
        const board = landed ? boards[k + 1] : boards[k];
        board.forEach((piece, sq) => {
          if (!landed && sq === mv.from) return square(s, at, sq, "", step > 0);
          if (!landed && sq === mv.takes) return square(s, at, sq, Math.floor(p * 12) % 2 ? "" : piece);
          square(s, at, sq, piece, landed && sq === mv.from);
        });
        moved(s, at, mv.path[step], landed ? mv.lands : mv.piece);
      },
    };
  });
}
