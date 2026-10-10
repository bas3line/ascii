// <Markdown> and a component per figure. Node can't load a .tsx file, so this tests the build, dist/markdown/react.js,
// and skips, saying so, when that is missing or older than react.tsx (npm run build). There is no react-dom in this repo,
// so components are rendered by calling them, with a stand-in for React's three hooks; the browser check is in the
// hosts' report.
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import * as React from "react";
import { plain } from "./core.ts";
import { headline } from "./headline.ts";
import { html } from "./html.ts";
import { kinds } from "./index.ts";

const built = new URL("../../dist/markdown/react.js", import.meta.url);
const source = new URL("./react.tsx", import.meta.url);
const stale = !existsSync(built) ? "no dist/markdown/react.js: npm run build, then npm test" : statSync(built).mtimeMs < statSync(source).mtimeMs ? "dist/markdown/react.js is older than react.tsx: npm run build, then npm test" : false;
// React's hooks ask its current dispatcher, here: the stand-in is put there while a component renders.
const react = ((React as { default?: unknown }).default ?? React) as Record<string, { H: unknown } | undefined>;
const internals = react.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
const skip = stale || (!internals ? "this React keeps its hooks elsewhere" : false);

type Module = typeof import("./react.tsx");
const load = async () => (await import(built.href)) as Module;

interface Host {
  type: string;
  props: Record<string, unknown> & { dangerouslySetInnerHTML: { __html: string }; style: Record<string, unknown> };
}

// Renders an element as React would, as far as its first host element: each function component called with its props,
// its hooks answered by a stand-in. Returns the host element, null for nothing, and the effects to run as React would.
function render(element: React.ReactElement | null) {
  const effects: (() => void | (() => void))[] = [];
  const refs: { current: unknown }[] = [];
  let el: unknown = element;
  internals!.H = {
    useMemo: (make: () => unknown) => make(),
    useRef: (value: unknown) => (refs.push({ current: value }), refs[refs.length - 1]),
    useEffect: (effect: () => void | (() => void)) => void effects.push(effect),
  };
  try {
    while (el && typeof (el as React.ReactElement).type === "function") {
      const { type, props } = el as { type: (p: unknown) => unknown; props: unknown };
      el = type(props);
    }
  } finally {
    internals!.H = null;
  }
  return { host: el as Host | null, effects, refs };
}

const SOURCE = 'ascii.rest "animated ascii art"';

test("react: a component for every figure built, each <Markdown> of that kind", { skip }, async () => {
  const mod = await load();
  for (const kind of Object.keys(kinds)) {
    const name = kind[0].toUpperCase() + kind.slice(1);
    const C = (mod as unknown as Record<string, React.FC & { displayName?: string }>)[name];
    assert.equal(typeof C, "function", name);
    assert.equal(C.displayName, name);
    const el = C({ children: "ok" } as never) as React.ReactElement<{ kind: string }>;
    assert.equal(el.type, mod.Markdown);
    assert.equal(el.props.kind, kind);
  }
  assert.match(readFileSync(built, "utf8"), /^"use client";\n/);
});

test("react: the still in a <pre class=ascii-md>, its sentence its label, its size for CSS", { skip }, async () => {
  const { Headline } = await load();
  const { host } = render(React.createElement(Headline, { font: "slim", children: SOURCE }));
  const p = headline(SOURCE, { font: "slim" });
  assert.equal(host!.type, "pre");
  assert.equal(host!.props.className, "ascii-md");
  assert.equal(host!.props.role, "img");
  assert.equal(host!.props["aria-label"], p.says);
  assert.deepEqual(host!.props.style, { "--cols": p.meta.cols, "--rows": p.meta.rows });
  assert.equal(host!.props.dangerouslySetInnerHTML.__html, html(p));
  const text = host!.props.dangerouslySetInnerHTML.__html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  assert.equal(text.split("\n").map((l) => l.trimEnd()).join("\n"), plain(p));
});

test("react: every other prop is an option; options as an object under them; its own props on the <pre>", { skip }, async () => {
  const { Markdown } = await load();
  const { host } = render(
    React.createElement(Markdown, {
      kind: "headline",
      source: "  ok",
      width: 32,
      frame: "ascii",
      options: { title: "from options", width: 40 },
      label: "a headline",
      className: "wide",
      style: { margin: 0 },
    }),
  );
  const p = headline("ok", { title: "from options", width: 32, frame: "ascii" });
  assert.equal(host!.props.className, "ascii-md wide");
  assert.equal(host!.props["aria-label"], "a headline");
  assert.deepEqual(host!.props.style, { "--cols": 32, "--rows": p.meta.rows, margin: 0 });
  assert.equal(host!.props.dangerouslySetInnerHTML.__html, html(p));
});

test("react: the page's own props, id, tabIndex, role, data-* and aria-*, go on the <pre>, never to the options", { skip }, async () => {
  const { Headline } = await load();
  const onClick = () => {};
  const { host } = render(React.createElement(Headline, { id: "x", tabIndex: 0, "data-testid": "hero", "aria-hidden": true, onClick, title: "top", children: "ok" }));
  const p = headline("ok", { title: "top" });
  assert.equal(host!.type, "pre");
  assert.equal(host!.props.id, "x");
  assert.equal(host!.props.tabIndex, 0);
  assert.equal(host!.props["data-testid"], "hero");
  assert.equal(host!.props["aria-hidden"], true);
  assert.equal(host!.props.onClick, onClick);
  assert.equal(host!.props["data-md"], "headline");
  // title is the frame's, an option
  assert.equal(host!.props.dangerouslySetInnerHTML.__html, html(p));
  // a role or a label of the page's own wins over the drawing's
  const { host: own } = render(React.createElement(Headline, { role: "presentation", "aria-label": "the logo", children: "ok" }));
  assert.equal(own!.props.role, "presentation");
  assert.equal(own!.props["aria-label"], "the logo");
});

test("react: the effect paints the figure into the <pre>, and returns its stop", { skip }, async () => {
  const { Headline } = await load();
  // a still figure, so paint draws it at once with no observer: what node can run
  const { effects, refs } = render(React.createElement(Headline, { children: "ok", play: "still", motion: true }));
  const pre = { innerHTML: "" };
  refs[0].current = pre;
  const stop = effects[0]();
  assert.equal(pre.innerHTML, html(headline("ok", { play: "still" })));
  assert.equal(typeof stop, "function");
});

test("react: what it can't draw renders nothing, and the console says why", { skip }, async () => {
  const { Markdown, Headline } = await load();
  const warned: unknown[][] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => void warned.push(args);
  try {
    assert.equal(render(React.createElement(Headline, { titel: "x", children: "ok" })).host, null);
    assert.match(String(warned[0][1]), /has no option "titel" \(did you mean "title"\?\)/);
    assert.equal(render(React.createElement(Markdown, { kind: "headlin" as "headline", children: "ok" })).host, null);
    assert.match(String(warned[1][1]), /there is no markdown component "headlin"/);
    assert.equal(render(React.createElement(Headline, {})).host, null);
    assert.match(String(warned[2][1]), /takes its fence's body as children, a string in braces, or as source/);
  } finally {
    console.warn = warn;
  }
});
