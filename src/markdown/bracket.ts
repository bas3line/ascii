/*
 * bracket: a knockout, entrants in pairs and the winners moving on, round by
 * round, to the champion. A naming vote in a changelog post, an agent's eval
 * rounds. A winner's line is heavy and a loser's light, so the champion's run
 * is one heavy line from the first round to the last, and it reads in one ink
 * and as plain text.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii bracket title="best font"
 *   block slim round bold
 *   block round
 *   block
 *   ```
 *
 *   bracket('block slim round bold\nblock round\nblock')
 *   bracket({ rounds: [["block", "slim"], ["block"]] })
 */
import { fail, type Surface } from "../kit/core.ts";
import { ACCENT, GLINT, INK, MARK, QUIET, SOFT, clean, component, progress, show, shown, statements, type Common, type MarkdownPiece } from "./core.ts";

/** A bracket as data: what a fence's body says, for rounds already in JavaScript. */
export interface BracketData {
  /**
   * Its rounds: the first the entrants in seed order (2, 4, 8 or 16 of them), each next one the names that went
   * through, one from each pair of the round before. A last round of one name is the champion; stop before it for a
   * bracket still being played.
   */
  rounds: readonly (readonly string[])[];
}

export type BracketOptions = Common;

const SIZES = [2, 4, 8, 16];
// The build: the entrants type in, then each round's lines draw on to the next names. Then a cycle with a champion:
// the glint runs the champion's line from its first name to its last, and a rest.
const TYPE = 0.3, ROUND = 0.5, CYCLE = 6, SWEEP = 1.4, BAND = 3;
// The fewest characters a name is cut to when the names are too wide for the room, its last three dots.
const SHORTEST = 4;

// The fence's body: each line a round, its names bare words or "quoted texts", in order.
function parse(source: string): BracketData {
  const lines = statements(source, "bracket");
  if (!lines.length) fail(`bracket takes its entrants on a line, 2, 4, 8 or 16 of them, then a line for each round of who went through, such as block slim\\nblock`);
  return {
    rounds: lines.map((s) => {
      const key = Object.keys(s.attrs)[0];
      if (key !== undefined) fail(`bracket's line ${s.line} has ${key}=${show(s.attrs[key])}: its options go on the fence, as \`\`\`ascii bracket ${key}=${s.attrs[key] && s.attrs[key].length <= 40 ? s.attrs[key] : "..."}`);
      return s.tokens.map((k) => ("word" in k ? k.word : "text" in k ? k.text : ""));
    }),
  };
}

// Data, checked: names cleaned, every round one from each pair of the round before.
function check(data: BracketData): string[][] {
  if (!data || typeof data !== "object" || !Array.isArray(data.rounds)) fail(`bracket() takes a fence's body, such as block slim\\nblock, or { rounds }, not ${show(data)}`);
  if (!data.rounds.length) fail(`bracket's rounds take its entrants first, 2, 4, 8 or 16 of them, such as [["block", "slim"], ["block"]]`);
  const rounds = data.rounds.map((round, i) => {
    if (!Array.isArray(round) || !round.every((n) => typeof n === "string")) fail(`bracket's round ${i + 1} takes names, such as ["block", "slim"], not ${show(round)}`);
    return round.map((n) => {
      const name = clean(n, "bracket's names").replace(/\s+/g, " ").trim();
      if (!name) fail(`bracket's line ${i + 1} has an empty name: write a name in its quotes`);
      return name;
    });
  });
  const entrants = rounds[0];
  if (!SIZES.includes(entrants.length))
    fail(`bracket's first line has ${entrants.length} entrant${entrants.length === 1 ? "" : "s"}, and a knockout takes 2, 4, 8 or 16, a pair for each match`);
  const seen = new Set<string>();
  for (const name of entrants) {
    if (seen.has(name)) fail(`bracket's first line names ${show(name)} twice: each entrant is named once, so who goes through is clear`);
    seen.add(name);
  }
  rounds.slice(1).forEach((round, i) => {
    const before = rounds[i];
    const line = i + 2;
    if (before.length === 1) fail(`bracket's line ${line} comes after ${show(before[0])} won on line ${i + 1}: the champion is the last line`);
    if (round.length !== before.length / 2)
      fail(`bracket's line ${line} has ${round.length} name${round.length === 1 ? "" : "s"}, and line ${i + 1}'s ${before.length} make ${before.length / 2} pair${before.length === 2 ? "" : "s"}: a round names one from each pair, in order`);
    round.forEach((name, m) => {
      const a = before[2 * m], b = before[2 * m + 1];
      if (name !== a && name !== b) fail(`bracket's line ${line} names ${show(name)} from the pair ${show(a)} and ${show(b)}: a winner is one of its pair`);
    });
  });
  return rounds;
}

// A cell on the champion's line, in order from its first name, for the glint.
type Cell = readonly [x: number, y: number];

/**
 * A knockout bracket from a fence's body, a line of entrants (2, 4, 8 or 16) and a line for each round of who went
 * through, or { rounds }. Each pair joins at a bracket and its winner moves on: a winner's line heavy, a loser's
 * light and its name soft, the champion marked and named on the bottom edge. Stopped before the champion, the rounds
 * to come draw as joins with ? for the names still to play. Names too wide for the room are cut with "...". The
 * entrants type in, then round by round each pair's lines draw on to the next name; with a champion, a glint then runs
 * its line every 6 seconds while it is in view. Its still is the whole bracket.
 *
 *   bracket("block slim round bold\nblock round\nblock", { title: "best font" })
 *   bracket({ rounds: [["a", "b", "c", "d"], ["a", "d"]] })
 */
export function bracket(source: string | BracketData, options?: BracketOptions): MarkdownPiece {
  const rounds = check(typeof source === "string" ? parse(source) : source);
  return component("bracket", options, [], (o, room) => {
    const n = rounds[0].length;
    const R = Math.log2(n);
    const given = rounds.length - 1;
    const champion = given === R ? rounds[R][0] : undefined;
    // every column's names: the rounds given, then ? for the names still to play
    const columns = Array.from({ length: R + 1 }, (_, c) => (c <= given ? rounds[c] : new Array<string>(n >> c).fill("?")));
    // Names cut to fit the room: the longest a name may be, the most that fits, never fewer than SHORTEST.
    const avail = room.cols ?? room.max;
    const widest = (cap: number) => columns.reduce((w, names) => w + Math.max(...names.map((x) => Math.min(x.length, cap))), 0) + 5 * R;
    let cap = Math.max(...columns.flat().map((x) => x.length));
    while (widest(cap) > avail && cap > SHORTEST) cap--;
    if (widest(cap) > avail) fail(`bracket needs ${widest(cap) + (o.width === undefined ? 0 : o.width - avail)} columns for ${n} entrants with their names cut to ${SHORTEST} characters, and has ${o.width ?? avail + 4}: give it a width of more`);
    const cut = (name: string) => (name.length > cap ? `${name.slice(0, cap - 3)}...` : name);
    const shownNames = columns.map((names) => names.map(cut));
    const L = shownNames.map((names) => Math.max(...names.map((x) => x.length)));
    // where each column's names start, and its joins: a name, a space, its line, the join, a line, a space, the next
    const X: number[] = [0];
    for (let c = 0; c < R; c++) X.push(X[c] + L[c] + 5);
    const cols = X[R] + L[R];
    const rows = 2 * n - 1;
    // a slot's row: column 0 every other row, each next column midway between its pair
    const rowOf = (c: number, j: number) => 2 ** (c + 1) * j + 2 ** c - 1;
    // who won each match: true when the top of the pair went through, undefined while it is to play
    const topWon = (c: number, m: number): boolean | undefined => (c < given ? rounds[c + 1][m] === rounds[c][2 * m] : undefined);
    // the champion's first-round slot, and whether a cell of a match is on its line
    const seed = champion === undefined ? -1 : rounds[0].indexOf(champion);
    const onLine = (c: number, m: number, top: boolean) => seed >= 0 && seed >> (c + 1) === m && ((seed >> c) & 1) === (top ? 0 : 1);
    // A name's tone: the champion marked, a loser soft, the rest ink; a ? still to play soft.
    const toneOf = (c: number, j: number) => {
      if (c === R && champion !== undefined) return MARK;
      if (columns[c][j] === "?") return SOFT;
      const won = c < R ? topWon(c, j >> 1) : undefined;
      return won === undefined || won === ((j & 1) === 0) ? INK : SOFT;
    };
    // the champion's line, cell by cell from its first name, for the glint
    const line: Cell[] = [];
    if (seed >= 0) {
      for (let c = 0; c <= R; c++) {
        const j = seed >> c, y = rowOf(c, j), name = shownNames[c][j];
        for (let i = 0; i < name.length; i++) line.push([X[c] + i, y]);
        if (c === R) break;
        const k = X[c] + L[c] + 2, mid = rowOf(c + 1, j >> 1);
        for (let x = X[c] + name.length + 1; x <= k; x++) line.push([x, y]);
        for (let yy = y + Math.sign(mid - y); yy !== mid; yy += Math.sign(mid - y)) line.push([k, yy]);
        line.push([k, mid], [k + 1, mid]);
      }
    }
    const intro = TYPE + ROUND * R;
    const says = (() => {
      const games: string[] = [], toPlay: string[] = [];
      for (let c = 0; c < R; c++)
        for (let m = 0; m < n >> (c + 1); m++) {
          const won = topWon(c, m);
          const a = columns[c][2 * m], b = columns[c][2 * m + 1];
          if (won !== undefined) games.push(won ? `${a} beat ${b}` : `${b} beat ${a}`);
          else if (a !== "?" && b !== "?") toPlay.push(`${a} and ${b}`);
        }
      const title = typeof o.title === "string" && o.title.trim() ? `, ${o.title.trim()}` : "";
      const end = champion !== undefined ? `${champion} wins` : `${toPlay.join(", ")} to play`;
      return `bracket${title}: ${games.length ? `${games.join(", ")}; ` : ""}${end}.`;
    })();

    // A match's drawing, cells in the order they draw: each arm from its name's end to the join, then the join, the
    // line out, and the next name. d is how far along the round's drawing a cell is.
    const matchCells = (c: number, m: number) => {
      const out: { x: number; y: number; ch: string; tone: number; d: number }[] = [];
      const won = topWon(c, m);
      const k = X[c] + L[c] + 2;
      const ya = rowOf(c, 2 * m), yb = rowOf(c, 2 * m + 1), mid = rowOf(c + 1, m);
      for (const top of [true, false]) {
        const y = top ? ya : yb;
        const heavy = won !== undefined && won === top;
        const tone = !heavy ? QUIET : onLine(c, m, top) ? ACCENT : SOFT;
        const name = shownNames[c][top ? 2 * m : 2 * m + 1];
        for (let x = X[c] + name.length + 1; x < k; x++) out.push({ x, y, ch: heavy ? "━" : "─", tone, d: x - X[c] });
        out.push({ x: k, y, ch: top ? (heavy ? "┓" : "┐") : heavy ? "┛" : "┘", tone, d: k - X[c] });
        for (let j = 1; j < Math.abs(mid - y); j++) out.push({ x: k, y: top ? y + j : y - j, ch: heavy ? "┃" : "│", tone, d: k - X[c] + j });
      }
      const reach = k - X[c] + (mid - ya);
      // the join: heavy on the winner's side and out, light on the loser's
      const join = won === undefined ? "├" : won ? "┡" : "┢";
      const out_ = won === undefined ? QUIET : onLine(c, m, won) ? ACCENT : SOFT;
      out.push({ x: k, y: mid, ch: join, tone: out_, d: reach }, { x: k + 1, y: mid, ch: won === undefined ? "─" : "━", tone: out_, d: reach + 1 });
      return { cells: out, reach: reach + 3 };
    };
    const matches = Array.from({ length: R }, (_, c) => Array.from({ length: n >> (c + 1) }, (_, m) => matchCells(c, m)));
    // how far each column's drawing goes, its joins and then its next names typing
    const spans = matches.map((ms, c) => Math.max(...ms.map((x) => x.reach)) + L[c + 1]);

    const name = (s: Surface, x: number, y: number, c: number, j: number, upto = Infinity) => s.write(x, y, shownNames[c][j].slice(0, Math.max(0, upto)), toneOf(c, j));
    return {
      cols,
      rows,
      intro,
      ...(champion !== undefined ? { cycle: CYCLE } : {}),
      status: champion !== undefined ? `${cut(champion)} wins` : `round ${given + 1} of ${R}`,
      says,
      category: "data",
      draw(s, t, at) {
        // the entrants type in, all together
        const typed = shown(t, 0, L[0], L[0] / TYPE);
        shownNames[0].forEach((_, j) => name(s, at.x, at.y + rowOf(0, j), 0, j, typed));
        // then each round in turn: its joins draw on and its next names type
        for (let c = 0; c < R; c++) {
          const p = progress(t, TYPE + c * ROUND, TYPE + (c + 1) * ROUND);
          if (p <= 0) break;
          const far = p * spans[c];
          for (const { cells } of matches[c]) for (const cell of cells) if (cell.d < far) s.set(at.x + cell.x, at.y + cell.y, cell.ch, cell.tone);
          // every match of a column reaches its next name at the same point
          const typedNext = Math.ceil(far - matches[c][0].reach - 1e-9);
          shownNames[c + 1].forEach((_, j) => name(s, at.x + X[c + 1], at.y + rowOf(c + 1, j), c + 1, j, typedNext));
        }
        // the glint along the champion's line, as the cycle begins, never in the still
        if (!line.length || at.still || t < intro) return;
        const u = ((t - intro) % CYCLE) / SWEEP;
        if (u >= 1) return;
        const head = -BAND + (line.length + 2 * BAND) * u;
        line.forEach(([x, y], i) => {
          const d = Math.abs(i - head);
          if (d >= BAND) return;
          const ch = s.get(at.x + x, at.y + y);
          if (ch && ch !== " ") s.set(at.x + x, at.y + y, ch, d < BAND / 2 ? GLINT : ACCENT);
        });
      },
    };
  });
}
