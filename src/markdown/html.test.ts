// The HTML renderer, the fences, render() for a README, and the remark plugin.
import assert from "node:assert/strict";
import { test } from "node:test";
import { catalog, fenceOf } from "./catalog.ts";
import { GROUPS, KINDS, plain } from "./core.ts";
import { headline } from "./headline.ts";
import { STYLE, figure, html, paint, spans } from "./html.ts";
import { fencesOf, fromFence, kinds, make, markup, render, start } from "./index.ts";
import remarkAscii from "./remark.ts";

const SOURCE = 'ascii.rest "animated ascii art"';

// paint() and start() with the browser stubbed: its frames run by hand, `ms` apart, and the observers they made, each
// live until it is disconnected.
function browser() {
  const g = globalThis as Record<string, unknown>;
  const saved = Object.fromEntries(["matchMedia", "IntersectionObserver", "requestAnimationFrame", "cancelAnimationFrame", "document"].map((k) => [k, g[k]]));
  const frames = new Map<number, (now: number) => void>();
  const observers: { see: (on: boolean) => void; live: boolean }[] = [];
  let id = 0;
  Object.assign(g, {
    matchMedia: () => ({ matches: false }),
    IntersectionObserver: class {
      seen: { see: (on: boolean) => void; live: boolean };
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
        this.seen = { see: (on) => cb([{ isIntersecting: on }]), live: true };
        observers.push(this.seen);
      }
      observe() {}
      disconnect() {
        this.seen.live = false;
      }
    },
    requestAnimationFrame: (cb: (now: number) => void) => (frames.set(++id, cb), id),
    cancelAnimationFrame: (k: number) => frames.delete(k),
    document: { hidden: false, addEventListener() {}, removeEventListener() {} },
  });
  return {
    observers,
    run(ms: number, n: number) {
      let now = performance.now();
      for (let i = 0; i < n && frames.size; i++) {
        const [k, cb] = frames.entries().next().value!;
        frames.delete(k);
        cb((now += ms));
      }
    },
    restore: () => Object.assign(g, saved),
  };
}
const element = (dataset: Record<string, string> = {}) => ({ dataset, innerHTML: "" }) as unknown as HTMLElement;

test("spans: runs of a tone in classes, the ink bare, everything escaped, a mark never reaching past its words", () => {
  // ink, accent, ink, mark mark, then trailing ink spaces
  const text = "a<b c  ";
  const color = Uint8Array.from([0, 3, 0, 8, 8, 0, 0]);
  assert.equal(spans(text, color), 'a<span class="md-accent">&lt;</span>b<span class="md-mark"> c</span>  ');
  // a dark page's index finds the same tone
  assert.equal(spans("x", Uint8Array.from([13]), 10), '<span class="md-accent">x</span>');
  assert.equal(spans("a&b", null), "a&amp;b");
});

test("html and figure: the still as a page's <pre>, its sentence its label", () => {
  const p = headline(SOURCE);
  const out = figure(p, { attrs: { "data-x": 'a"b' } });
  assert.match(out, /^<pre class="ascii-md" role="img" aria-label="headline: ascii\.rest, animated ascii art\." style="--cols: 42; --rows: 8" data-x="a&quot;b">/);
  assert.match(out, /<span class="md-quiet">╗<\/span>/);
  // the spaces after a run join it, so a line is one span
  assert.match(out, /<span class="md-soft">animated ascii art {24}<\/span><\/pre>$/);
  // the text inside the tags is the figure itself
  const text = html(p).replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  assert.equal(text.split("\n").map((l) => l.trimEnd()).join("\n"), plain(p));
  assert.match(STYLE, /\.ascii-md \.md-accent\{color:var\(--md-accent,light-dark\(#c2410c,#f97316\)\)\}/);
});

test("make and fromFence find a figure by name; a name that is none says which there are", () => {
  assert.equal(make("headline", "ok").kind, "headline");
  assert.equal(fromFence("ascii headline width=50", "ok").meta.cols, 50);
  assert.throws(() => make("headlin", "ok"), /there is no markdown figure "headlin" \(did you mean "headline"\?\): there are headline/);
  assert.throws(() => fromFence("js headline", "ok"), /language is ascii/);
  assert.throws(() => fromFence("ascii", "ok"), /names its figure/);
});

test("markup: the still with what start() needs to play it", () => {
  const out = markup("headline", 'ok "a line"', { font: "slim" });
  assert.match(out, /data-md="headline"/);
  assert.match(out, /data-md-source="ok &quot;a line&quot;"/);
  assert.match(out, /data-md-options="\{&quot;font&quot;:&quot;slim&quot;\}"/);
});

test("render: every ascii fence in a document drawn as text, the rest as it was", () => {
  const doc = `# readme\n\n\`\`\`ascii headline title=top frame=rounded\n${SOURCE}\n\`\`\`\n\n\`\`\`ts\nconst a = 1;\n\`\`\`\n`;
  const out = render(doc);
  assert.match(out, /^# readme\n\n```\n╭─ top ─/);
  assert.match(out, /```ts\nconst a = 1;\n```/);
  assert.doesNotMatch(out, /```ascii/);
  assert.match(render(doc, { ascii: true }), /\+- top -+\+/);
});

test("render: an ascii fence shown as an example inside another fence stays as written; a longer fence closes one", () => {
  const shown = "# readme\n\n````md\n```ascii headline\nok\n```\n````\n";
  assert.equal(render(shown), shown);
  const tilde = "~~~md\n```ascii headline\nok\n```\n~~~\n";
  assert.equal(render(tilde), tilde);
  // a fence closes with a run of its own character as long as its opening one, or longer, as CommonMark reads it
  const longer = "```ascii headline\nok\n`````\n\nafter\n";
  assert.equal(render(longer), `\`\`\`\n${plain(headline("ok"))}\n\`\`\`\n\nafter\n`);
  // a shorter run, or the other character, is the fence's text and does not close it
  assert.deepEqual(fencesOf("````ascii headline\nok\n```\n~~~~\n````\n").map((f) => f.body), ["ok\n```\n~~~~"]);
  // indented, its body's indent taken off; never closed, left out
  assert.deepEqual(fencesOf("  ```ascii headline\n  ok\n  ```").map((f) => [f.indent, f.body, f.line]), [["  ", "ok", 1]]);
  assert.deepEqual(fencesOf("```ascii headline\nok"), []);
});

test("paint: a lower frame rate keeps the figure's pace, each frame taking the time since the last", () => {
  const b = browser();
  try {
    const p = headline(SOURCE);
    const el = element();
    const stop = paint(el, p, { fps: 5, style: false });
    b.observers[0].see(true);
    // at 5 frames a second, 12 frames 200 ms apart are 2.4 seconds of it, its build and more of its cycle, as at 30
    b.run(200, 12);
    assert.equal(el.innerHTML, html(p, { t: 2.4 }));
    stop();
  } finally {
    b.restore();
  }
});

test("start: a figure stopped is started again by the next start(), as React's StrictMode mounts, unmounts and mounts", () => {
  const b = browser();
  try {
    const el = element({ md: "headline", mdSource: SOURCE, mdOptions: '{"play":"once"}' });
    const root = { querySelectorAll: () => [el] } as unknown as ParentNode;
    start(root, { style: false })();
    const stop = start(root, { style: false });
    // the first start's observer is gone, the second's watches it
    assert.deepEqual(b.observers.map((o) => o.live), [false, true]);
    b.observers[1].see(true);
    b.run(1000 / 30, 36);
    // 36 frames 33 ms apart: its build of 1.2 seconds, done
    assert.equal(el.innerHTML, html(headline(SOURCE), { t: 1.2 }));
    // while it plays, another start() leaves it be
    start(root, { style: false });
    assert.equal(b.observers.length, 2);
    stop();
  } finally {
    b.restore();
  }
});

test("remark: a fence becomes its figure, a typo fails the build with the fence named", () => {
  const tree = { type: "root", children: [{ type: "code", lang: "ascii", meta: "headline font=slim", value: "ok" }, { type: "code", lang: "ts", value: "x" }] };
  remarkAscii()(tree);
  // the figure goes on as HTML elements remark-rehype builds, so MDX takes it with no rehype-raw
  type Drawn = { type: string; data: { hName: string; hProperties: Record<string, unknown>; hChildren: { type: string; value?: string; properties?: { className: string[] }; children?: { value: string }[] }[] } };
  const drawn = tree.children[0] as unknown as Drawn;
  const piece = make("headline", "ok", { font: "slim" });
  assert.equal(drawn.data.hName, "pre");
  assert.deepEqual(drawn.data.hProperties, {
    className: ["ascii-md"],
    role: "img",
    ariaLabel: "headline: ok.",
    style: `--cols: ${piece.meta.cols}; --rows: ${piece.meta.rows}`,
    dataMd: "headline",
    dataMdSource: "ok",
    dataMdOptions: '{"font":"slim"}',
  });
  // its text is the still, each run of a tone a span, as markup() writes it
  const text = drawn.data.hChildren.map((c) => c.value ?? c.children![0].value).join("");
  assert.equal(text.split("\n").map((l) => l.trimEnd()).join("\n"), plain(piece));
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const spansOf = drawn.data.hChildren.map((c) => (c.type === "text" ? esc(c.value!) : `<span class="${c.properties!.className[0]}">${esc(c.children![0].value)}</span>`)).join("");
  assert.equal(spansOf, html(piece));
  assert.equal(tree.children[1].type, "code");
  // a GitHub alert is a quote, left as it is: only fences are drawn
  const alert = { type: "root", children: [{ type: "blockquote", children: [{ type: "paragraph", children: [{ type: "text", value: "[!TIP]\nread the docs first." }] }] }] };
  const before = JSON.stringify(alert);
  remarkAscii()(alert);
  assert.equal(JSON.stringify(alert), before);
  const bad = { type: "root", children: [{ type: "code", lang: "ascii", meta: "headline fnot=slim", value: "ok" }] };
  assert.throws(() => remarkAscii()(bad), /has no option "fnot"[\s\S]*in ```ascii headline fnot=slim/);
});

test("the catalog: every figure described once, in group order, its fence as a reader writes it", () => {
  assert.deepEqual(catalog.map((c) => c.kind), KINDS);
  // the en and em dash, by their code points
  const dashes = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
  for (const c of catalog) {
    assert.ok((GROUPS[c.group] as readonly string[]).includes(c.kind));
    assert.ok(c.about.length <= 72, `${c.kind}'s about is ${c.about.length} characters`);
    assert.ok(c.for.length >= 1 && c.moves.length <= 80, c.kind);
    assert.doesNotMatch(c.about + c.moves + c.source + JSON.stringify(c.options), dashes);
  }
  assert.equal(fenceOf(catalog.find((c) => c.kind === "flame")!).split("\n")[0], '```ascii flame title="render, 48 ms" unit=ms');
  // every figure built so far draws its catalog example
  for (const kind of Object.keys(kinds)) {
    const e = catalog.find((c) => c.kind === kind)!;
    assert.doesNotThrow(() => make(kind, e.source, e.options), kind);
  }
});
