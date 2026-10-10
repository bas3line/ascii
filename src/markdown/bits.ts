/*
 * bits: a binary layout, named fields on a bit ruler, drawn from a bit mask
 * the way register datasheets write one: a letter a bit, a field a run of one
 * letter, then a line naming each letter. A packet header, a file format, a
 * register. Two columns a bit, numbered from 0 at the left as RFC diagrams
 * number them; a field that runs on into the next row is one cell across
 * both where they meet. Unused bits are dotted.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii bits title="ipv4 header"
 *   vvvviiiiddddddee
 *   llllllllllllllll
 *   v=version i=ihl d=dscp e=ecn l=length
 *   ```
 *
 *   bits("vvvviiii\nv=version i=ihl")
 *   bits({ rows: ["vvvviiii"], names: { v: "version", i: "ihl" } })
 */
import { fail } from "../kit/core.ts";
import { INK, QUIET, SOFT, clean, component, linesOf, progress, show, statements, wrap, type Common, type MarkdownPiece } from "./core.ts";

/** A binary layout as data: what a fence's body says, for a layout already in JavaScript. */
export interface BitsData {
  /** The mask, a row a string: one letter a bit, "." an unused bit; every row 8, 16 or 32 long, all the same. */
  rows: readonly string[];
  /** Each letter's field name: { v: "version" }. */
  names: Readonly<Record<string, string>>;
}

/** bits takes only the options every figure takes. */
export type BitsOptions = Common;

// The bits a row may hold.
const WIDTHS = [8, 16, 32];
// The build: the ruler counts in, then each field's walls drop in and its name types, in order, EACH seconds a field
// and at most FIELDS seconds for them all. Then it holds.
const RULER = 0.4, EACH = 0.2, FIELDS = 2.6;
// The longest a field's name may be.
const LONGEST = 32;
// Box drawing by the arms a junction has: up 1, down 2, left 4, right 8.
const JOIN = [" ", "│", "│", "│", "─", "┘", "┐", "┤", "─", "└", "┌", "├", "─", "┴", "┬", "┼"];

// The fence's body: rows of letters, then key=value lines naming each letter.
function parse(source: string): BitsData {
  const rows: string[] = [];
  const names: Record<string, string> = {};
  let naming = false;
  linesOf(source).forEach((written, n) => {
    const line = n + 1;
    if (!written.trim()) return;
    if (written.includes("=")) {
      naming = true;
      const [s] = statements(written, "bits");
      const loose = [...s.words, ...s.texts.map((t) => `"${t}"`)];
      if (loose.length) fail(`bits' line ${line} has ${show(loose[0])} among its names: a line of names is letter=name pairs, as v=version i=ihl, a name with spaces in quotes`);
      for (const [key, value] of Object.entries(s.attrs)) {
        if (!/^[A-Za-z]$/.test(key)) fail(`bits' line ${line} names ${show(key)}: a name is for one letter of the mask, as v=version`);
        if (Object.hasOwn(names, key)) fail(`bits' line ${line} names ${show(key)} again: each letter is named once`);
        names[key] = value;
      }
      return;
    }
    if (naming) fail(`bits' line ${line} is a row of the mask after its names: the mask comes first, then the lines naming its letters`);
    rows.push(clean(written, "bits").replace(/ /g, ""));
  });
  if (!rows.length) fail(`bits takes a bit mask, a letter a bit in rows of 8, 16 or 32, then a line naming each letter, as vvvviiii then v=version i=ihl`);
  return { rows, names };
}

// Data, checked: the rows a mask, every letter one run and named, every name for a letter in the mask.
function check(data: BitsData): BitsData {
  if (!data || typeof data !== "object" || !Array.isArray(data.rows)) fail(`bits() takes a bit mask and its names, such as "vvvviiii\\nv=version i=ihl", or { rows, names }, not ${show(data)}`);
  if (!data.rows.length) fail(`bits' rows take at least one row of the mask, such as "vvvviiii"`);
  if (!data.names || typeof data.names !== "object") fail(`bits' names take each letter's name, as { v: "version" }, not ${show(data.names)}`);
  const rows = data.rows.map((r, i) => {
    if (typeof r !== "string") fail(`bits' row ${i + 1} takes letters, not ${show(r)}`);
    const row = clean(r, "bits").replace(/ /g, "");
    const odd = [...row].find((c) => !/[A-Za-z.]/.test(c));
    if (odd !== undefined) fail(`bits' row ${i + 1} has ${show(odd)}, in ${show(row)}: a mask is a letter a bit, and . for an unused bit`);
    if (!WIDTHS.includes(row.length)) fail(`bits' row ${i + 1} is ${row.length} bits, ${show(row)}: a row is 8, 16 or 32 bits`);
    if (row.length !== data.rows[0].replace(/ /g, "").length) fail(`bits' row ${i + 1} is ${row.length} bits and row 1 is ${data.rows[0].replace(/ /g, "").length}: every row is the same width`);
    return row;
  });
  // every letter is one run, read row after row: a field going on into the next row is still one run
  const all = rows.join("");
  const seen = new Map<string, number>();
  for (let i = 0; i < all.length; i++) {
    const c = all[i];
    if (c === "." || (i && all[i - 1] === c)) continue;
    if (seen.has(c)) {
      const at = (k: number) => `bit ${k % rows[0].length} of row ${Math.floor(k / rows[0].length) + 1}`;
      fail(`bits' letter ${show(c)} is in two separate runs, from ${at(seen.get(c)!)} and from ${at(i)}: a field is one run of its letter`);
    }
    seen.set(c, i);
  }
  const names: Record<string, string> = {};
  for (const [key, value] of Object.entries(data.names)) {
    if (!seen.has(key)) fail(`bits names ${show(key)}, which is not a letter of the mask: it has ${[...seen.keys()].join(", ")}`);
    if (typeof value !== "string") fail(`bits' name for ${show(key)} takes words, not ${show(value)}`);
    const name = clean(value, "bits").replace(/\s+/g, " ").trim();
    if (!name || name.length > LONGEST) fail(`bits' name for ${show(key)} takes 1 to ${LONGEST} characters, not ${show(value)}`);
    names[key] = name;
  }
  const nameless = [...seen.keys()].filter((c) => !Object.hasOwn(names, c));
  if (nameless.length) fail(`bits' letter ${show(nameless[0])} has no name: name every letter on a line after the mask, as ${nameless[0]}=flags`);
  return { rows, names };
}

// A run of one letter in reading order, its letter ("." for unused bits) and the pieces of it in each row.
interface Run {
  letter: string;
  pieces: { row: number; from: number; to: number }[];
}

/**
 * A binary layout from a bit mask, a letter a bit in rows of 8, 16 or 32 then key=value lines naming the letters, or
 * { rows, names }: a bit ruler over the fields, walls where the letter changes, each field's name centred in it. A
 * field that runs on into the next row is one cell across both where they meet; a name too long for its field shows
 * the field's letter, named in a key under the layout; unused bits are dotted. The ruler counts in, then each field's
 * walls drop in and its name types, in order, and it holds.
 *
 *   bits("vvvviiiiddddddee\nllllllllllllllll\nv=version i=ihl d=dscp e=ecn l=length", { title: "ipv4 header" })
 */
export function bits(source: string | BitsData, options?: BitsOptions): MarkdownPiece {
  const data = check(typeof source === "string" ? parse(source) : source);
  return component("bits", options, [], (o, room) => {
    const B = data.rows[0].length, R = data.rows.length;
    const X = 2 * B + 1;

    // the runs, in reading order, and each bit's run
    const runs: Run[] = [];
    const runOf: number[][] = data.rows.map(() => Array(B).fill(-1));
    data.rows.forEach((row, r) =>
      [...row].forEach((c, b) => {
        const last = runs.at(-1);
        const prev = b ? row[b - 1] : r ? data.rows[r - 1][B - 1] : undefined;
        if (!last || prev !== c) runs.push({ letter: c, pieces: [{ row: r, from: b, to: b }] });
        else if (last.pieces.at(-1)!.row === r) last.pieces.at(-1)!.to = b;
        else last.pieces.push({ row: r, from: b, to: b });
        runOf[r][b] = runs.length - 1;
      }),
    );
    // walls: down at a bit's left edge on a row, across at a bit's top edge on a rule, true where the run changes
    const down = (b: number, r: number) => b === 0 || b === B || runOf[r][b - 1] !== runOf[r][b];
    const across = (r: number, b: number) => r === 0 || r === R || runOf[r - 1][b] !== runOf[r][b];
    // who draws each wall as it builds: the outer box with the ruler, an inner one with the run right of it or under it
    const ownDown = (b: number, r: number) => (b === 0 || b === B ? -1 : runOf[r][b]);
    const ownAcross = (r: number, b: number) => (r === 0 || r === R ? -1 : runOf[r][b]);

    // where each named field's name sits: in each cell it draws, the pieces of it that meet across rows one cell, in
    // the widest piece of that cell, the one nearest its middle row on a tie
    const fields = runs.filter((u) => u.letter !== ".");
    const keyed: string[] = [];
    const labels: { run: number; row: number; x: number; words: string }[] = [];
    runs.forEach((u, k) => {
      if (u.letter === ".") return;
      const cells: Run["pieces"][] = [];
      u.pieces.forEach((p, i) => {
        const q = u.pieces[i - 1];
        if (q && q.from <= p.to && p.from <= q.to) cells.at(-1)!.push(p);
        else cells.push([p]);
      });
      for (const pieces of cells) {
        const widest = Math.max(...pieces.map((p) => p.to - p.from + 1));
        const mid = (pieces[0].row + pieces.at(-1)!.row) / 2;
        const piece = pieces.filter((p) => p.to - p.from + 1 === widest).sort((a, b) => Math.abs(a.row - mid) - Math.abs(b.row - mid))[0];
        const inner = 2 * widest - 1;
        const name = data.names[u.letter];
        const fits = name.length <= inner;
        if (!fits && !keyed.includes(u.letter)) keyed.push(u.letter);
        const words = fits ? name : u.letter;
        labels.push({ run: k, row: piece.row, x: 2 * piece.from + 1 + Math.floor((inner - words.length) / 2), words });
      }
    });

    // the key, for the fields whose names don't fit them: "u urg   a ack", entries three spaces apart, a name too long
    // for the layout's width wrapped under itself
    const key: { x: number; y: number; letter: string; lines: string[]; run: number }[] = [];
    let kx = 0, ky = 0, deep = 1;
    for (const c of keyed) {
      const lines = wrap(data.names[c], X - 2);
      const w = 2 + Math.max(...lines.map((l) => l.length));
      let x = key.length ? kx + 3 : 0;
      if (x && (x + w > X || lines.length > 1 || deep > 1)) {
        ky += deep;
        x = 0;
        deep = 1;
      }
      key.push({ x, y: ky, letter: c, lines, run: runs.findIndex((u) => u.letter === c) });
      kx = x + w;
      deep = Math.max(deep, lines.length);
    }
    const keyRows = key.length ? ky + deep : 0;

    const tens = B > 10;
    const top = tens ? 2 : 1;
    const H = top + 2 * R + 1 + (keyRows ? 1 + keyRows : 0);
    const count = fields.length;
    const total = B * R;
    const status = `${count} field${count === 1 ? "" : "s"}, ${total} bits`;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    // as wide as the layout, or as the words on the frame's edges need, the layout in the middle of it
    const edges = o.frame === "none" ? 0 : Math.max(status.length + 2, title ? title.length + 2 : 0);
    // a width too narrow for the layout is the layout's, which component() says is too wide for it
    const cols = room.cols === undefined ? Math.max(X, Math.min(room.max, edges)) : Math.max(room.cols, X);
    const dx = Math.floor((cols - X) / 2);
    const each = Math.min(EACH, FIELDS / Math.max(1, runs.length));
    const intro = Math.ceil((RULER + each * runs.length) * 1000) / 1000;
    const listed = runs.map((u) => {
      const n = u.pieces.reduce((k, p) => k + p.to - p.from + 1, 0);
      return u.letter === "." ? `${n} unused` : `${data.names[u.letter]} ${n}`;
    });

    return {
      cols,
      rows: H,
      intro,
      status,
      says: `bits${title ? `, ${title}` : ""}, ${total} bits: ${listed.join(", ")}.`,
      draw(s, t, at) {
        const x0 = at.x + dx, y0 = at.y;
        // the ruler counts in, left to right, and the outer box draws with it
        const counted = Math.ceil(progress(t, 0, RULER) * B);
        if (counted <= 0) return;
        for (let b = 0; b < counted; b++) {
          if (tens && b % 10 === 0) s.set(x0 + 2 * b + 1, y0, String(b / 10), SOFT);
          s.set(x0 + 2 * b + 1, y0 + top - 1, String(b % 10), SOFT);
        }
        const reach = counted >= B ? X : 2 * counted;
        // the runs shown by t, each EACH seconds after the ruler: a run's walls drop in as its time starts
        const begun = (u: number) => t >= RULER + u * each - 1e-9;
        const showsDown = (b: number, r: number) => down(b, r) && (ownDown(b, r) < 0 ? b === 0 || counted >= B : begun(ownDown(b, r)));
        const showsAcross = (r: number, b: number) => across(r, b) && (ownAcross(r, b) < 0 ? 2 * b + 1 < reach : begun(ownAcross(r, b)));
        for (let r = 0; r <= R; r++) {
          // a rule: across at each bit, a junction at each bit's edge by the walls that meet it
          const y = y0 + top + 2 * r;
          for (let b = 0; b <= B; b++) {
            const arms = (r > 0 && showsDown(b, r - 1) ? 1 : 0) | (r < R && showsDown(b, r) ? 2 : 0) | (b > 0 && showsAcross(r, b - 1) ? 4 : 0) | (b < B && showsAcross(r, b) ? 8 : 0);
            if (arms) s.set(x0 + 2 * b, y, JOIN[arms], QUIET);
            if (b < B && showsAcross(r, b)) s.set(x0 + 2 * b + 1, y, "─", QUIET);
          }
          if (r === R) break;
          // a row: its walls, and a dot in each unused bit once its run has begun
          for (let b = 0; b <= B; b++) if (showsDown(b, r)) s.set(x0 + 2 * b, y + 1, "│", QUIET);
          for (let b = 0; b < B; b++) if (data.rows[r][b] === "." && begun(runOf[r][b])) s.set(x0 + 2 * b + 1, y + 1, "·", QUIET);
        }
        // each name types in its run's time
        labels.forEach((l) => {
          const typed = Math.ceil(progress(t, RULER + l.run * each, RULER + (l.run + 1) * each) * l.words.length);
          s.write(x0 + l.x, y0 + top + 2 * l.row + 1, l.words.slice(0, typed), INK);
        });
        // the key, an entry as its field's time starts
        for (const k of key) {
          if (!begun(k.run)) continue;
          const y = y0 + top + 2 * R + 2 + k.y;
          s.set(x0 + k.x, y, k.letter, INK);
          k.lines.forEach((l, i) => s.write(x0 + k.x + 2, y + i, l, SOFT));
        }
      },
    };
  });
}
