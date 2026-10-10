// schema: tables and their references as an ER diagram, placed by the references, with crow's feet.
import assert from "node:assert/strict";
import { test } from "node:test";
import { svg } from "../svg.ts";
import { entryOf, fenceOf } from "./catalog.ts";
import { ACCENT, INK, QUIET, SOFT, drawable, fence, plain, type MarkdownPiece } from "./core.ts";
import { fromFence, kinds } from "./index.ts";
import { schema } from "./schema.ts";

const STILL = [
  "╭─ blog ────────────────────────╮",
  "│ ╭─ users ─╮                   │",
  "│ │ id*     ├┼──╮               │",
  "│ │ name    │   │   ╭─ posts ─╮ │",
  "│ │ email   │   │   │ id*     │ │",
  "│ ╰─────────╯   ╰─o<┤ user_id │ │",
  "│                   │ title   │ │",
  "│                   ╰─────────╯ │",
  "╰─────── 2 tables, 1 reference ─╯",
].join("\n");

const entry = entryOf("schema");
const SOURCE = entry.source;
const INFO = fenceOf(entry).split("\n")[0].slice(3);
// What the fence draws: through fromFence() once index.ts names the figure, until then its options read as a fence
// reads them.
const fenced = (info: string, body: string) => (Object.hasOwn(kinds, "schema") ? fromFence(info, body) : schema(body, fence(info).options));

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

// A blog's whole model: references from one row fanning out, references past a column, a table referencing itself.
const BLOG = [
  "users(id*, name, email)",
  "posts(id*, user_id, title, body)",
  "comments(id*, post_id, user_id, text)",
  "likes(user_id, post_id)",
  "categories(id*, parent_id, name)",
  "post_categories(post_id, category_id)",
  "ref posts.user_id users.id",
  "ref comments.post_id posts.id",
  "ref comments.user_id users.id",
  "ref likes.user_id users.id",
  "ref likes.post_id posts.id",
  "ref categories.parent_id categories.id",
  "ref post_categories.post_id posts.id",
  "ref post_categories.category_id categories.id",
].join("\n");

test("schema: the catalog's example draws its still through plain() and a fence", () => {
  assert.equal(INFO, "ascii schema title=blog");
  const p = schema(SOURCE, { title: "blog" });
  assert.equal(plain(p), STILL);
  assert.equal(plain(fenced(INFO, SOURCE)), STILL);
  assert.equal(p.meta.cols, 33);
  assert.equal(p.meta.rows, 9);
  assert.equal(p.says, "schema, blog: users with id, name, email; posts with id, user_id, title; posts.user_id references users.id.");
});

test("schema: the tables draw in, then each reference rides in; the still holds after", () => {
  const p = schema(SOURCE, { title: "blog" });
  assert.equal(p.meta.still, 1.5);
  assert.equal(p.idle, false);
  const at = (t: number) => plain(p, { t }).split("\n");
  // users first, its columns typing; posts not yet
  const early = at(0.3);
  assert.ok(early[1].includes("╭─ users ─╮") && !early.join("\n").includes("posts"), early.join("\n"));
  // the reference riding in: its bar at the wall, a dot at its head, no crow's foot yet
  const riding = at(1.2);
  assert.ok(riding[2].includes("├┼") && riding.join("\n").includes("●") && !riding.join("\n").includes("o<"), riding.join("\n"));
  for (const t of [1.5, 2, 9]) assert.equal(plain(p, { t }), STILL);
  assert.ok(!plain(p).includes("●"));
  wellDrawn(p, [0, 0.1, 0.4, 0.6, 0.9, 1.1, 1.3, 1.49, 1.5]);
  assert.match(svg(p), /1 forwards/);
});

test("schema: boxes quiet, names accent, columns ink, keys soft, references soft, crow's feet ink", () => {
  const p = schema(SOURCE, { title: "blog" });
  const { cols, rows, still } = p.meta;
  const color = new Uint8Array(cols * rows);
  const lines = p.default()(still!, { paper: true, color }).split("\n");
  const tone = (x: number, y: number) => color[y * cols + x];
  assert.equal(tone(2, 1), QUIET);
  assert.equal(tone(lines[1].indexOf("users"), 1), ACCENT);
  assert.equal(tone(lines[2].indexOf("id"), 2), INK);
  assert.equal(tone(lines[2].indexOf("*"), 2), SOFT);
  assert.equal(tone(lines[2].indexOf("┼"), 2), INK);
  assert.equal(tone(lines[2].indexOf("╮", 12), 2), SOFT);
  assert.equal(tone(lines[5].indexOf("o<"), 5), INK);
  assert.equal(tone(lines[5].indexOf("<"), 5), INK);
  assert.equal(tone(lines[5].indexOf("┤"), 5), QUIET);
});

test("schema: a whole model, placed by its references, lines fanning out from one row", () => {
  const p = schema(BLOG, { title: "blog" });
  const text = plain(p).split("\n");
  assert.equal(p.meta.cols, 78);
  assert.equal(p.meta.rows, 23);
  // users.id leaves once and fans out to three tables; categories loops back into itself
  assert.equal(text[2], "│ │ id*     ├┼───────────┬─┬─╮                                               │");
  assert.equal(text[8], "│ │ id*          ├┼──┬─╮ │ │     ╰─────────╯   │ │ ╰─o<┤ post_id    │        │");
  assert.equal(text[9], "│ │ parent_id    ├>o─╯ │ │ ╰───────────────────┼─┼───o<┤ user_id    │        │");
  // a reference past a column runs along a row clear of the boxes it passes
  assert.equal(text[20], "│                      ╰─────────────────────────────o<┤ category_id       │ │");
  assert.match(text.at(-1)!, /─ 6 tables, 8 references ─╯$/);
  wellDrawn(p, [0, 0.4, 1, 1.5, 2, 2.5, p.meta.still!]);
});

test("schema: a table that references itself loops off its right wall", () => {
  assert.equal(
    plain(schema("categories(id*, name, parent_id)\nref categories.parent_id categories.id", { title: "tree" })),
    [
      "╭─ tree ─────────────────╮",
      "│  ╭─ categories ─╮      │",
      "│  │ id*          ├┼──╮  │",
      "│  │ name         │   │  │",
      "│  │ parent_id    ├>o─╯  │",
      "│  ╰──────────────╯      │",
      "╰─ 1 table, 1 reference ─╯",
    ].join("\n"),
  );
  // tables with no references stack in one column, a row apart, and the bottom edge counts only tables
  const loose = plain(schema("a(x)\nb(y)", { frame: "none" })).split("\n");
  assert.deepEqual(loose, ["╭─ a ─╮", "│ x   │", "╰─────╯", "", "╭─ b ─╮", "│ y   │", "╰─────╯"]);
  assert.match(plain(schema("a(x)")), /─ 1 table ─╯$/);
});

test("schema: takes its tables and references as data too", () => {
  const data = {
    tables: [
      { name: "users", columns: ["id*", "name", "email"] },
      { name: "posts", columns: ["id*", "user_id", "title"] },
    ],
    refs: [{ from: "posts.user_id", to: "users.id" }],
  };
  assert.equal(plain(schema(data, { title: "blog" })), STILL);
  // the order written doesn't change the drawing: tables are placed by their references
  assert.equal(plain(schema("ref posts.user_id users.id\nusers(id*, name, email)\nposts(id*, user_id, title)", { title: "blog" })), STILL);
});

test("schema: a width centres it", () => {
  const p = schema(SOURCE, { title: "blog", width: 41 });
  assert.equal(p.meta.cols, 41);
  assert.match(plain(p).split("\n")[1], /^│ {5}╭─ users ─╮/);
  assert.throws(() => schema(SOURCE, { width: 24 }), /schema needs 33 columns for this, and its width is 24/);
});

test("schema: says what is wrong, the kit's way", () => {
  assert.throws(() => schema(""), /ascii\.rest: schema takes tables, a line each, as users\(id\*, name, email\)/);
  assert.throws(() => schema("users(id*"), /schema's line 1 is not a table or a ref, "users\(id\*"/);
  assert.throws(() => schema("users()"), /schema's table users has no columns/);
  assert.throws(() => schema("users(id*, id)"), /schema's table users has the column id twice/);
  assert.throws(() => schema("users(id*, first name)"), /schema's table users has a column "first name"/);
  assert.throws(() => schema("users(id)\nusers(x)"), /schema has the table users twice/);
  assert.throws(() => schema("users(id*)\nref posts.user_id users.id"), /schema's ref posts\.user_id users\.id names the table "posts", which is not one: it has users/);
  assert.throws(() => schema("users(id*)\nposts(id*, user_id)\nref posts.user_id users.idd"), /names users\.idd \(did you mean "id"\?\), and users has no column idd: it has id/);
  assert.throws(() => schema("users(id*)\nref"), /schema's line 2 is a ref with 0 columns/);
  assert.throws(() => schema("users(id*)\nref users.id"), /schema's line 2 is a ref with 1 column:/);
  assert.throws(() => schema("users(id*)\nref users users.id"), /schema's ref users users\.id takes table\.column, as users\.id/);
  assert.throws(() => schema("users(id*)\nref users.id users.id"), /points a column at itself/);
  assert.throws(() => schema("a(id*, b)\nb(id*)\nref a.b b.id\nref a.b b.id"), /schema has ref a\.b b\.id twice/);
  assert.throws(() => schema("a(id*, b_id)\nb(id*, a_id)\nref a.b_id b.id\nref b.a_id a.id"), /schema's references go round in a circle, a to b to a/);
  assert.throws(() => schema("users(id*, nàme)"), /ascii\.rest: schema takes characters every monospace face draws one cell wide/);
  assert.throws(() => schema({ tables: [], refs: [] }), /schema's tables take at least one table/);
  assert.throws(() => schema({ tables: [{ name: "a", columns: ["x"] }] } as never), /schema's refs take a list of references/);
  assert.throws(() => schema(5 as never), /schema\(\) takes tables and references/);
  assert.throws(() => schema(SOURCE, { layout: "tree" } as never), /schema\(\) has no option "layout"/);
});

test("schema: never draws garbage, however long or odd its input", () => {
  // a chain twelve tables long, each with a reference back to the first past the columns between
  const lines = ["t0(id*, name)"];
  for (let i = 1; i < 8; i++) lines.push(`t${i}(id*, up_id, root_id)`, `ref t${i}.up_id t${i - 1}.id`, ...(i > 1 ? [`ref t${i}.root_id t0.id`] : []));
  const chain = schema(lines.join("\n"));
  wellDrawn(chain, [0, 0.5, 1, 2, chain.meta.still!]);
  // too wide or too tall for a figure says so
  const wide = Array.from({ length: 12 }, (_, i) => `t${i}(id*, ${i ? `p${i}_id` : "x"})${i ? `\nref t${i}.p${i}_id t${i - 1}.id` : ""}`).join("\n");
  assert.throws(() => schema(wide), /schema needs \d+ columns for this, past the 160 a figure can take/);
  const tall = Array.from({ length: 30 }, (_, i) => `t${i}(a, b, c)`).join("\n");
  assert.throws(() => schema(tall), /schema draws \d+ rows, past the 120 a piece can have/);
  // typographic quotes fold to plain ones, which a name can't hold
  assert.throws(() => schema("“users”(id)"), /schema's table/);
});
