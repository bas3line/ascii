// <ascii-markdown>: safe on a server, and on a page its text a fence's body and its attributes the options. Node has no
// DOM, so the tag is played on a stand-in host with the few methods it calls; the browser check is in the hosts' report.
import assert from "node:assert/strict";
import { test } from "node:test";
import { COMMON, plain } from "./core.ts";
import { AsciiMarkdown, define } from "./element.ts";
import { headline } from "./headline.ts";
import { figure, html } from "./html.ts";

// A stand-in for the element a page would make: attributes, text, and innerHTML that makes a <pre> to paint into.
function host(attrs: Record<string, string>, text: string) {
  const el = new AsciiMarkdown() as AsciiMarkdown & { html: string; draws: number; pre: { innerHTML: string; label: string | null } | null };
  const map = new Map(Object.entries(attrs));
  Object.assign(el, {
    html: "",
    draws: 0,
    pre: null,
    isConnected: true,
    textContent: text,
    getAttribute: (name: string) => map.get(name) ?? null,
    getAttributeNames: () => [...map.keys()],
    setAttribute(name: string, value: string) {
      const old = map.get(name) ?? null;
      map.set(name, value);
      // as a page does, for an attribute the tag observes
      if (AsciiMarkdown.observedAttributes.includes(name)) el.attributeChangedCallback(name, old, value);
    },
  });
  Object.defineProperty(el, "innerHTML", {
    get: () => el.html,
    set(value: string) {
      el.html = value;
      el.draws++;
      const label = /aria-label="([^"]*)"/.exec(value)?.[1] ?? null;
      el.pre = { innerHTML: "", label };
    },
  });
  Object.defineProperty(el, "firstElementChild", {
    get: () =>
      el.pre && {
        get innerHTML() {
          return el.pre!.innerHTML;
        },
        set innerHTML(v: string) {
          el.pre!.innerHTML = v;
        },
        setAttribute: (name: string, value: string) => name === "aria-label" && (el.pre!.label = value),
      },
  });
  return { el, attrs: map };
}

// Lets the tag's start, a microtask later, run.
const settle = () => new Promise((done) => setTimeout(done, 0));

test("element: importing it on a server defines nothing and throws nothing", () => {
  assert.equal(typeof AsciiMarkdown, "function");
  assert.equal(define(), undefined);
  for (const name of ["kind", "label", "motion", "options", "data-source", ...COMMON, "font", "shadow", "align"]) assert.ok(AsciiMarkdown.observedAttributes.includes(name), name);
});

test("element: its text, dedented, is the body, kept in data-source; the still drawn, then painted", async () => {
  const source = 'ascii.rest "animated ascii art"';
  const { el, attrs } = host({ kind: "headline", play: "still" }, '\n      ascii.rest "animated ascii art"\n    ');
  el.connectedCallback();
  await settle();
  const p = headline(source, { play: "still" });
  assert.equal(attrs.get("data-source"), source);
  assert.equal(el.html, figure(p));
  // a still, painted at once: the spans of its finished figure
  assert.equal(el.pre!.innerHTML, html(p));
  assert.match(el.pre!.innerHTML.replace(/<[^>]+>/g, ""), /animated ascii art/);
  assert.equal(el.pre!.label, p.says);
});

test("element: every other attribute is an option, read as a fence reads it; the page's own are left alone", async () => {
  const { el } = host(
    { kind: "headline", width: "40", title: "2026", frame: "ascii", font: "slim", play: "still", class: "wide", id: "a", "data-x": "1", "aria-hidden": "false", style: "color: red", label: "a release" },
    "ok",
  );
  el.connectedCallback();
  await settle();
  const p = headline("ok", { width: 40, title: "2026", frame: "ascii", font: "slim", play: "still" });
  assert.equal(el.html.replace(/ aria-label="[^"]*"/, ""), figure(p).replace(/ aria-label="[^"]*"/, ""));
  assert.equal(plain(p).split("\n")[0], "+- 2026 -------------------------------+");
  assert.equal(el.pre!.label, "a release");
});

test("element: options as JSON, under the attributes; a change to an attribute draws it again, its own write doesn't", async () => {
  const { el } = host({ kind: "headline", options: '{"title":"from json","width":30,"frame":"rounded","play":"still"}', width: "36" }, "ok");
  el.connectedCallback();
  await settle();
  // drawn once: keeping its source in data-source is no change to draw again for
  assert.equal(el.draws, 1);
  assert.match(el.html, /--cols: 36/);
  assert.match(el.html, /from json/);
  el.setAttribute("title", "again");
  el.setAttribute("frame", "heavy");
  await settle();
  // two changes in a row, one draw
  assert.equal(el.draws, 2);
  assert.match(el.html.replace(/<[^>]+>/g, ""), /^┏━ again ━/);
  // a new body through data-source
  el.setAttribute("data-source", 'ok "a line"');
  await settle();
  assert.equal(el.draws, 3);
  assert.match(el.html, /a line/);
});

test("element: a body it can't draw stays as it is, and the console says why", async () => {
  const warned: unknown[][] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => void warned.push(args);
  try {
    const { el } = host({ kind: "headline", titel: "x" }, "ok");
    el.connectedCallback();
    await settle();
    assert.equal(el.html, "");
    assert.match(String(warned[0]?.[0]), /<ascii-markdown kind="headline"> could not draw/);
    assert.match(String(warned[0]?.[1]), /has no option "titel" \(did you mean "title"\?\)/);
    const { el: none } = host({ kind: "headlin" }, "ok");
    none.connectedCallback();
    await settle();
    assert.equal(none.html, "");
    assert.match(String(warned[1]?.[1]), /there is no markdown figure "headlin"/);
  } finally {
    console.warn = warn;
  }
});
