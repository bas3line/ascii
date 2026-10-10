/*
 * schema: tables and the references between them as an ER diagram, written
 * in textbook relational notation, users(id*, name), then a ref line for each
 * reference. The boxes are placed by their references: a table sits one
 * column right of the deepest table it references and lower than it, so the
 * diagram reads down and to the right from the tables everything points at.
 * Each reference leaves the row it points at with a bar, one, and enters the
 * row that holds it with a crow's foot, zero or many. A data model in docs, an
 * agent's plan.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii schema title=blog
 *   users(id*, name, email)
 *   posts(id*, user_id, title)
 *   ref posts.user_id users.id
 *   ```
 *
 *   schema("users(id*, name)\nposts(id*, user_id)\nref posts.user_id users.id")
 *   schema({ tables: [{ name: "users", columns: ["id*", "name"] }], refs: [] })
 */
import { fail, suggest } from "../kit/core.ts";
import { show } from "../kit/recipes/checks.ts";
import { ACCENT, INK, QUIET, SOFT, clean, component, linesOf, progress, type Common, type MarkdownPiece } from "./core.ts";

/** A data model as data: what a fence's body says, for tables already in JavaScript. */
export interface SchemaData {
  /** The tables, in the order written: each a name and its columns, a key column ending in *, as "id*". */
  tables: readonly { name: string; columns: readonly string[] }[];
  /** The references: `from` the column that holds one, "posts.user_id", `to` the column it points at, "users.id". */
  refs: readonly { from: string; to: string }[];
}

/** schema takes only the options every figure takes. */
export type SchemaOptions = Common;

// A name: a table's or a column's.
const NAME = /^[A-Za-z_][\w$-]*$/;
// The build: each table draws in, its columns typing, then each reference rides in from its one end to its many end,
// EACH seconds a table or a reference and at most BUILD seconds for them all. Then it holds.
const EACH = 0.5, BUILD = 2.8;
// The longest a name may be.
const LONGEST = 40;
// Box drawing by the arms a cell of a line has: up 1, down 2, left 4, right 8; corners rounded, as the frame's.
const JOIN = [" ", "│", "│", "│", "─", "╯", "╮", "┤", "─", "╰", "╭", "├", "─", "┴", "┬", "┼"];
// The tables and references the sentence a screen reader reads names, before it says how many more.
const SAYS = 12;

// The fence's body: a table a line, name(column, column), then ref lines.
function parse(source: string): SchemaData {
  const tables: { name: string; columns: string[] }[] = [];
  const refs: { from: string; to: string }[] = [];
  linesOf(source).forEach((written, n) => {
    const line = clean(written, "schema").trim();
    if (!line) return;
    const words = line.split(/\s+/);
    if (words[0] === "ref") {
      if (words.length !== 3) fail(`schema's line ${n + 1} is a ref with ${words.length - 1} column${words.length === 2 ? "" : "s"}: a reference is ref, the column that holds it and the column it points at, as ref posts.user_id users.id`);
      refs.push({ from: words[1], to: words[2] });
      return;
    }
    const m = /^([^\s(]+)\s*\((.*)\)$/.exec(line);
    if (!m) fail(`schema's line ${n + 1} is not a table or a ref, ${show(line)}: a table is its name and its columns in brackets, a key ending in *, as users(id*, name); a reference is ref posts.user_id users.id`);
    tables.push({ name: m[1], columns: m[2].split(",").map((c) => c.trim()) });
  });
  if (!tables.length) fail(`schema takes tables, a line each, as users(id*, name, email), then a ref line for each reference, as ref posts.user_id users.id`);
  return { tables, refs };
}

// A table, read: its name, its columns without their *, which are keys.
interface Table {
  name: string;
  columns: string[];
  keys: boolean[];
}
// A reference, read: the table and column that hold it, the table and column it points at.
interface Ref {
  from: [number, number];
  to: [number, number];
}

// Data, checked: names, keys, every reference to a table and column there is, no circle of references.
function check(data: SchemaData): { tables: Table[]; refs: Ref[] } {
  if (!data || typeof data !== "object" || !Array.isArray(data.tables)) fail(`schema() takes tables and references, such as "users(id*, name)", or { tables, refs }, not ${show(data)}`);
  if (!data.tables.length) fail(`schema's tables take at least one table, as { name: "users", columns: ["id*", "name"] }`);
  const tables: Table[] = data.tables.map((t, i) => {
    if (!t || typeof t !== "object" || typeof t.name !== "string" || !Array.isArray(t.columns)) fail(`schema's table ${i + 1} takes a name and columns, as { name: "users", columns: ["id*", "name"] }, not ${show(t)}`);
    const name = clean(t.name, "schema").trim();
    if (!NAME.test(name) || name.length > LONGEST) fail(`schema's table ${show(t.name)} takes a name of letters, digits, _ and -, 1 to ${LONGEST} of them, starting with a letter or _`);
    if (!t.columns.length || (t.columns.length === 1 && !String(t.columns[0]).trim())) fail(`schema's table ${name} has no columns: list them in its brackets, as ${name}(id*, name)`);
    const columns: string[] = [], keys: boolean[] = [];
    for (const c of t.columns) {
      if (typeof c !== "string") fail(`schema's table ${name} takes its columns as names, not ${show(c)}`);
      const col = clean(c, "schema").trim();
      const key = col.endsWith("*");
      const bare = key ? col.slice(0, -1) : col;
      if (!NAME.test(bare) || bare.length > LONGEST) fail(`schema's table ${name} has a column ${show(col)}: a column is a name of letters, digits, _ and -, a key ending in *, as id*`);
      if (columns.includes(bare)) fail(`schema's table ${name} has the column ${bare} twice`);
      columns.push(bare);
      keys.push(key);
    }
    return { name, columns, keys };
  });
  const names = tables.map((t) => t.name);
  const twice = names.find((n, i) => names.indexOf(n) !== i);
  if (twice !== undefined) fail(`schema has the table ${twice} twice: each table is one line`);
  if (!Array.isArray(data.refs)) fail(`schema's refs take a list of references, as [{ from: "posts.user_id", to: "users.id" }], not ${show(data.refs)}`);
  // "table.column" to the table's index and the column's
  const at = (v: unknown, which: string): [number, number] => {
    if (typeof v !== "string") fail(`schema's ${which} takes table.column, as users.id, not ${show(v)}`);
    const [t, c, more] = clean(v, "schema").trim().split(".");
    if (c === undefined || more !== undefined) fail(`schema's ${which} takes table.column, as users.id, not ${show(v)}`);
    const ti = names.indexOf(t);
    if (ti < 0) fail(`schema's ${which} names the table ${show(t)}${suggest(t, names)}, which is not one: it has ${names.join(", ")}`);
    const ci = tables[ti].columns.indexOf(c);
    if (ci < 0) fail(`schema's ${which} names ${t}.${c}${suggest(c, tables[ti].columns)}, and ${t} has no column ${c}: it has ${tables[ti].columns.join(", ")}`);
    return [ti, ci];
  };
  const refs: Ref[] = [];
  const seen = new Set<string>();
  data.refs.forEach((r, i) => {
    if (!r || typeof r !== "object") fail(`schema's reference ${i + 1} takes { from, to }, as { from: "posts.user_id", to: "users.id" }, not ${show(r)}`);
    const which = `ref ${r.from} ${r.to}`;
    const from = at(r.from, which), to = at(r.to, which);
    if (from[0] === to[0] && from[1] === to[1]) fail(`schema's ${which} points a column at itself: a reference goes from the column that holds it to another`);
    const id = `${from}>${to}`;
    if (seen.has(id)) fail(`schema has ${which} twice: each reference is one line`);
    seen.add(id);
    refs.push({ from, to });
  });
  // no circle of references between tables: each table is placed right of the tables it references
  const state = tables.map(() => 0);
  const path: number[] = [];
  const visit = (t: number) => {
    if (state[t] === 2) return;
    if (state[t] === 1) {
      const loop = [...path.slice(path.indexOf(t)), t].map((k) => tables[k].name);
      fail(`schema's references go round in a circle, ${loop.join(" to ")}: each table is placed right of the tables it references, so leave one of them out`);
    }
    state[t] = 1;
    path.push(t);
    for (const r of refs) if (r.from[0] === t && r.to[0] !== t) visit(r.to[0]);
    path.pop();
    state[t] = 2;
  };
  tables.forEach((_, t) => visit(t));
  return { tables, refs };
}

// A table as placed: its column of the diagram, its top left, its size.
interface Box {
  depth: number;
  x: number;
  y: number;
  w: number;
  h: number;
  inner: number;
}

/**
 * An ER diagram from relational notation, a table a line as users(id*, name, email) with keys ending in *, then
 * ref posts.user_id users.id for each reference, or { tables, refs }. A table sits one column right of the deepest
 * table it references, lower than it; tables in a column stack in the order written. A reference leaves the column it
 * points at with a bar, one, turns down, and enters the column that holds it with a crow's foot, o<, zero or many; one
 * from a table to itself loops off its right wall. The tables draw in, their columns typing, then each reference rides
 * in, and it holds. A circle of references can't be placed, and says so.
 *
 *   schema("users(id*, name)\nposts(id*, user_id, title)\nref posts.user_id users.id", { title: "blog" })
 */
export function schema(source: string | SchemaData, options?: SchemaOptions): MarkdownPiece {
  const { tables, refs } = check(typeof source === "string" ? parse(source) : source);
  return component("schema", options, [], (o, room) => {
    // each table's column of the diagram: 0 for one that references none, else one past the deepest it references
    const depth: number[] = tables.map(() => -1);
    const deep = (t: number): number => {
      if (depth[t] < 0) depth[t] = Math.max(-1, ...refs.filter((r) => r.from[0] === t && r.to[0] !== t).map((r) => deep(r.to[0]))) + 1;
      return depth[t];
    };
    tables.forEach((_, t) => deep(t));
    const D = Math.max(...depth);
    // the boxes' sizes: the widest column or the name and its rule, a space either side
    const boxes: Box[] = tables.map((t, i) => {
      const inner = Math.max(...t.columns.map((c, k) => c.length + (t.keys[k] ? 1 : 0)), t.name.length + 2) + 2;
      return { depth: depth[i], x: 0, y: 0, w: inner + 2, h: t.columns.length + 2, inner };
    });
    const rowOf = ([t, c]: [number, number]) => boxes[t].y + 1 + c;
    // the order they are placed and drawn in: by column, then as written
    const order = tables.map((_, i) => i).sort((a, b) => depth[a] - depth[b] || a - b);

    // down: a table stacks under the one before it in its column, a row apart, and lower than every table it
    // references, its row 3 or more under the row it points at; a reference past a column between runs along its
    // row, so that row is clear of the boxes in the columns it crosses
    const placed: number[] = [];
    for (const t of order) {
      const above = placed.filter((k) => depth[k] === depth[t]).at(-1);
      let top = above === undefined ? 0 : boxes[above].y + boxes[above].h + 1;
      const mine = refs.filter((r) => r.from[0] === t && r.to[0] !== t);
      for (const r of mine) top = Math.max(top, rowOf(r.to) + 3 - 1 - r.from[1]);
      const crossed = (y: number, r: Ref) => placed.some((k) => depth[k] > depth[r.to[0]] && depth[k] < depth[t] && y >= boxes[k].y && y < boxes[k].y + boxes[k].h);
      while (mine.some((r) => crossed(top + 1 + r.from[1], r))) top++;
      boxes[t].y = top;
      placed.push(t);
    }

    // the lanes: each reference turns down in the gap right of the column it points at, a lane each, two columns apart;
    // a table's references to itself nearest it, then the one that goes furthest down leftmost, so lines fan out
    // rather than cross
    const lanes: Ref[][] = Array.from({ length: D + 1 }, () => []);
    for (const r of refs) lanes[depth[r.to[0]]].push(r);
    const self = (r: Ref) => r.from[0] === r.to[0];
    for (const gap of lanes) gap.sort((a, b) => Number(self(b)) - Number(self(a)) || rowOf(b.from) - rowOf(a.from) || rowOf(a.to) - rowOf(b.to));
    // across: each column as wide as its widest box; the gap after it the lanes' room and a crow's foot's
    const left: number[] = [], right: number[] = [];
    for (let d = 0, x = 0; d <= D; d++) {
      left[d] = x;
      right[d] = x + Math.max(...boxes.filter((b) => b.depth === d).map((b) => b.w)) - 1;
      x = right[d] + 6 + 2 * lanes[d].length;
    }
    boxes.forEach((b) => (b.x = left[b.depth]));
    const laneX = (r: Ref) => right[depth[r.to[0]]] + 4 + 2 * lanes[depth[r.to[0]]].indexOf(r);
    const W = lanes[D].length ? laneX(lanes[D].at(-1)!) + 1 : right[D] + 1;
    const H = Math.max(...boxes.map((b) => b.y + b.h));

    // each reference's path, cell by cell, from its one end to its many end: right along the row it points at, down
    // its lane, and right into the row that holds it, or back left into its own table
    const drawn = refs.slice().sort((a, b) => depth[a.to[0]] - depth[b.to[0]] || laneX(a) - laneX(b));
    const paths = drawn.map((r) => {
      const one = boxes[r.to[0]], many = boxes[r.from[0]];
      const ys = rowOf(r.to), yt = rowOf(r.from), lx = laneX(r);
      const cells: [number, number][] = [];
      for (let x = one.x + one.w; x <= lx; x++) cells.push([x, ys]);
      for (let y = ys + Math.sign(yt - ys); y !== yt; y += Math.sign(yt - ys)) cells.push([lx, y]);
      if (self(r)) for (let x = lx; x >= many.x + many.w; x--) cells.push([x, yt]);
      else for (let x = lx; x < many.x; x++) cells.push([x, yt]);
      return { r, cells, ys, yt, one, many };
    });

    const title = typeof o.title === "string" ? o.title.trim() : "";
    const status = `${tables.length} table${tables.length === 1 ? "" : "s"}${refs.length ? `, ${refs.length} reference${refs.length === 1 ? "" : "s"}` : ""}`;
    const edges = o.frame === "none" ? 0 : Math.max(status.length + 2, title ? title.length + 2 : 0);
    // a width too narrow for the diagram is the diagram's, which component() says is too wide for it
    const cols = room.cols === undefined ? Math.max(W, Math.min(room.max, edges)) : Math.max(room.cols, W);
    const dx = Math.floor((cols - W) / 2);
    const steps = tables.length + refs.length;
    const each = Math.min(EACH, BUILD / steps);
    const intro = Math.ceil(steps * each * 1000) / 1000;
    const named = (t: Table) => `${t.name} with ${t.columns.join(", ")}`;
    const dotted = ([t, c]: [number, number]) => `${tables[t].name}.${tables[t].columns[c]}`;
    const listed = tables.slice(0, SAYS).map(named).join("; ") + (tables.length > SAYS ? `; and ${tables.length - SAYS} more tables` : "");
    const pointed = refs.slice(0, SAYS).map((r) => `${dotted(r.from)} references ${dotted(r.to)}`).join("; ") + (refs.length > SAYS ? `; and ${refs.length - SAYS} more references` : "");

    return {
      cols,
      rows: H,
      intro,
      status,
      says: `schema${title ? `, ${title}` : ""}: ${listed}${pointed ? `; ${pointed}` : ""}.`,
      draw(s, t, at) {
        const x0 = at.x + dx, y0 = at.y;
        // the tables in order: the top edge and name, then the columns typing in a row at a time, then the bottom edge
        order.forEach((ti, k) => {
          const p = progress(t, k * each, (k + 1) * each);
          if (p <= 0) return;
          const b = boxes[ti], tb = tables[ti];
          const x = x0 + b.x, y = y0 + b.y;
          s.write(x, y, `╭─ ${" ".repeat(tb.name.length)} ${"─".repeat(b.inner - tb.name.length - 3)}╮`, QUIET);
          s.write(x + 3, y, tb.name.slice(0, Math.ceil(Math.min(1, p * 3) * tb.name.length)), ACCENT);
          const typed = p >= 1 ? tb.columns.length : Math.floor(Math.max(0, (p - 0.2) / 0.8) * tb.columns.length);
          for (let c = 0; c < typed; c++) {
            s.set(x, y + 1 + c, "│", QUIET);
            s.set(x + b.w - 1, y + 1 + c, "│", QUIET);
            s.write(x + 2, y + 1 + c, tb.columns[c], INK);
            if (tb.keys[c]) s.set(x + 2 + tb.columns[c].length, y + 1 + c, "*", SOFT);
          }
          if (p >= 1) s.write(x, y + b.h - 1, `╰${"─".repeat(b.inner)}╯`, QUIET);
        });
        // the references, each riding in from its one end to its many end after the tables: their lines joined where
        // they meet, by the arms each cell has
        const arms = new Map<number, number>();
        const key = (x: number, y: number) => y * 4096 + x;
        const arm = (x: number, y: number, bit: number) => arms.set(key(x, y), (arms.get(key(x, y)) ?? 0) | bit);
        const heads: [number, number][] = [];
        const ends: (() => void)[] = [];
        paths.forEach((p, k) => {
          const from = (tables.length + k) * each;
          const q = progress(t, from, from + each);
          if (q <= 0) return;
          const n = q >= 1 ? p.cells.length : Math.max(1, Math.ceil(q * p.cells.length));
          for (let i = 0; i < n; i++) {
            const [x, y] = p.cells[i];
            const [px, py] = i ? p.cells[i - 1] : [x - 1, y];
            const [nx, ny] = i < p.cells.length - 1 ? p.cells[i + 1] : self(p.r) ? [x - 1, y] : [x + 1, y];
            for (const [ax, ay] of i < n - 1 || q >= 1 ? [[px, py], [nx, ny]] : [[px, py]]) arm(x, y, ay < y ? 1 : ay > y ? 2 : ax < x ? 4 : 8);
          }
          if (q < 1 && !at.still) heads.push(p.cells[n - 1]);
          // the one end, a bar by the wall it leaves; the many end, a crow's foot by the wall it enters, once there
          ends.push(() => {
            s.set(x0 + p.one.x + p.one.w - 1, y0 + p.ys, "├", QUIET);
            s.set(x0 + p.one.x + p.one.w, y0 + p.ys, "┼", INK);
            if (q < 1) return;
            if (self(p.r)) {
              s.set(x0 + p.many.x + p.many.w - 1, y0 + p.yt, "├", QUIET);
              s.write(x0 + p.many.x + p.many.w, y0 + p.yt, ">o", INK);
            } else {
              s.set(x0 + p.many.x, y0 + p.yt, "┤", QUIET);
              s.write(x0 + p.many.x - 2, y0 + p.yt, "o<", INK);
            }
          });
        });
        for (const [k, bits] of arms) s.set(x0 + (k % 4096), y0 + Math.floor(k / 4096), JOIN[bits], SOFT);
        for (const end of ends) end();
        for (const [x, y] of heads) s.set(x0 + x, y0 + y, "●", ACCENT);
      },
    };
  });
}
