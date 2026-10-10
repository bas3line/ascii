/*
 * ascii.rest/markdown, catalog: every figure as the docs, the site and
 * llms.txt describe it. What it draws, the places it suits, how it moves, and
 * a first example as a reader writes it in a fence: the docs' first example,
 * the home page's card and the source every figure's tests draw. Data only:
 * the figures themselves are in their own files.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   import { catalog } from "ascii.rest/markdown";
 *   for (const c of catalog) console.log(c.kind, c.about);
 */
import { GROUPS, groupOf, type FenceOptions, type Group, type Kind } from "./core.ts";

/** A place a figure suits. */
export type Place = "readme" | "docs" | "changelog" | "issue" | "agent";

/** A figure, described. */
export interface Entry {
  kind: Kind;
  group: Group;
  /** One line: what it draws. */
  about: string;
  /** The places it suits: a README, docs, a changelog or release post, an issue, an agent's answer. */
  for: readonly Place[];
  /** One line: how it plays. */
  moves: string;
  /** Its first example: the fence's options, ```ascii <kind> key=value, and its body. */
  options: FenceOptions;
  source: string;
}

/** The groups as the docs name them: each a page, /docs/markdown-<group>/. */
export const GROUP_TITLES: Readonly<Record<Group, string>> = {
  lettering: "lettering",
  ornaments: "ornaments",
  machines: "machines",
  internals: "inside a system",
  tokens: "tokens",
  games: "games",
  places: "places",
};

const entries: Omit<Entry, "group">[] = [
  // lettering
  {
    kind: "headline",
    about: "words in block letters, a glint passing",
    for: ["readme", "changelog"],
    moves: "its columns drop in and a glint crosses, then crosses again every 6 seconds",
    options: {},
    source: 'ascii.rest "animated ascii art for web pages"',
  },
  {
    kind: "typing",
    about: "a line that types itself and cycles its last word",
    for: ["readme"],
    moves: "types in, holds, erases its quoted words and types the next",
    options: {},
    source: 'ascii.rest draws "scenes" "banners" "figures"',
  },
  {
    kind: "flap",
    about: "a split-flap sign, every tile clacking into place",
    for: ["changelog", "readme"],
    moves: "every tile flips through the alphabet onto its letter, left to right",
    options: {},
    source: "now boarding\nv0.5 gate npm",
  },
  {
    kind: "marquee",
    about: "a ticker of items scrolling past",
    for: ["readme", "docs"],
    moves: "slides in from the right, then scrolls round and round",
    options: {},
    source: '"markdown figures" "a fence in, a picture out" "npx ascii.rest add markdown"',
  },
  // ornaments
  {
    kind: "divider",
    about: "a band of moving art between sections",
    for: ["readme", "docs"],
    moves: "draws out from the middle, then its style keeps moving",
    options: {},
    source: 'waves "part two"',
  },
  {
    kind: "confetti",
    about: "a burst of confetti over a message, settling",
    for: ["changelog", "issue"],
    moves: "the pieces burst from the message and land around it",
    options: {},
    source: '"v1.0 is out" "1,000 stars"',
  },
  {
    kind: "solid",
    about: "a 3D shape turning, with a caption",
    for: ["readme"],
    moves: "grows from a point while turning, then turns once every 8 seconds",
    options: {},
    source: 'torus "ascii.rest"',
  },
  {
    kind: "say",
    about: "a little creature with a speech or thought balloon",
    for: ["readme", "agent"],
    moves: "the balloon opens and its words type, then the creature idles",
    options: {},
    source: "a fence in, a figure out.",
  },
  {
    kind: "orbit",
    about: "a hub and the rings of things around it, riding",
    for: ["readme", "docs"],
    moves: "the rings trace out round the hub, then their satellites ride round",
    options: {},
    source: 'ascii.rest\n"react" "mdx" "svg"\n"readme" "terminal"',
  },
  // machines
  {
    kind: "sequence",
    about: "messages between actors, each travelling its arrow",
    for: ["docs", "issue", "agent"],
    moves: "a dot runs each message from its sender to its receiver, in turn",
    options: { title: "list users" },
    source: 'browser -> api "GET /users"\napi -> db "select users"\ndb --> api "12 rows"\napi --> browser "200 ok"',
  },
  {
    kind: "git",
    about: "a branching model as git log --graph prints it",
    for: ["docs", "readme"],
    moves: "the log prints in from the top, as a pager scrolls it",
    options: { title: "feature branch" },
    source: [
      'commit "init"',
      'commit "add the parser"',
      "switch -c feat",
      'commit "draw fences"',
      "switch main",
      'commit "fix a typo"',
      "switch feat",
      'commit "add tests"',
      "switch main",
      "merge feat",
      "tag v0.4",
    ].join("\n"),
  },
  {
    kind: "railroad",
    about: "a command's syntax as a railroad, a dot running it",
    for: ["docs", "readme"],
    moves: "the track draws from the left, then a dot runs every path in turn",
    options: { title: "usage" },
    source: "ascii.rest md <file> [--ascii | --svg <dir>]",
  },
  {
    kind: "logic",
    about: "gates from boolean expressions, a signal running through",
    for: ["docs", "issue", "agent"],
    moves: "the inputs step through their truth table, the signal running the wires",
    options: { title: "release" },
    source: "ready is built and (tested or not skipped)",
  },
  // inside a system
  {
    kind: "flame",
    about: "a profile's folded stacks as a flame graph",
    for: ["issue", "docs"],
    moves: "the root grows from the left, then each level rises on top of it",
    options: { title: "render, 48 ms", unit: "ms" },
    source: "main;parse;lex 4\nmain;parse 6\nmain;draw;layout 12\nmain;draw;paint 18\nmain;draw 4\nmain;flush 4",
  },
  {
    kind: "bits",
    about: "a binary layout from a bit mask, on a bit ruler",
    for: ["docs"],
    moves: "the ruler counts in, then each field's walls drop and its name types",
    options: { title: "ipv4 header" },
    source: "vvvviiiiddddddee\nllllllllllllllll\nv=version i=ihl d=dscp e=ecn l=length",
  },
  {
    kind: "pinout",
    about: "a chip and what each pin does",
    for: ["readme", "docs"],
    moves: "the pins grow out in order, then a pulse runs out along the named one",
    options: { title: "ne555", pulse: "out" },
    source: "gnd vcc\ntrig dis\nout thr\nreset ctrl",
  },
  {
    kind: "schema",
    about: "tables and their references as an ER diagram",
    for: ["docs", "agent"],
    moves: "the tables draw in by depth, then each reference rides in",
    options: { title: "blog" },
    source: "users(id*, name, email)\nposts(id*, user_id, title)\nref posts.user_id users.id",
  },
  // tokens
  {
    kind: "qr",
    about: "a QR code from text, in half blocks",
    for: ["readme", "docs"],
    moves: "the finders draw, the modules resolve, then a scan line passes",
    options: {},
    source: "https://ascii.rest",
  },
  {
    kind: "sigil",
    about: "a fingerprint of a string: a bishop's random walk",
    for: ["readme", "issue"],
    moves: "the bishop walks its moves, each cell thickening as it is visited",
    options: {},
    source: "bas3line",
  },
  {
    kind: "stamp",
    about: "a rubber stamp that thuds onto the page",
    for: ["issue", "changelog"],
    moves: "an outline closes in, the stamp lands with a thud, the wear settles",
    options: {},
    source: 'approved\n"by @bas3line on 2026-10-10"',
  },
  {
    kind: "ticket",
    about: "a pass in banner letters, a stub and a barcode",
    for: ["changelog"],
    moves: "prints out of a slot, the > flying between its ends",
    options: {},
    source: 'v0.4 v0.5 "markdown figures"\ngate=npm seat=1A time=18:00',
  },
  // games
  {
    kind: "chess",
    about: "a position from FEN, the moves sliding in",
    for: ["docs", "agent"],
    moves: "the ranks drop in, then each move slides its piece square by square",
    options: { title: "ruy lopez" },
    source: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3\nf1b5",
  },
  {
    kind: "bracket",
    about: "a knockout bracket, winners moving on",
    for: ["changelog", "agent"],
    moves: "round by round each winner's line draws on to the next",
    options: { title: "best font" },
    source: "block slim round bold\nblock round\nblock",
  },
  {
    kind: "sprite",
    about: "pixel art from rows of letters, animated by frames",
    for: ["readme"],
    moves: "prints a row at a time, then plays its frames",
    options: {},
    source: [
      "...####...",
      ".########.",
      "##aa##aa##",
      "##aa##aa##",
      "##########",
      "##########",
      "##..##..##",
      "",
      "...####...",
      ".########.",
      "##aa##aa##",
      "##aa##aa##",
      "##########",
      "##########",
      ".##..##..#",
    ].join("\n"),
  },
  // places
  {
    kind: "world",
    about: "a world map with pins and routes",
    for: ["readme", "docs"],
    moves: "the land resolves, pins drop in, the here pin pulses and a dot flies each route",
    options: { title: "regions", here: "sfo" },
    source: 'sfo "us west"\niad "us east"\nfra "eu central"\nsin "asia"',
  },
];

/** Every figure, described, in the order of GROUPS. */
export const catalog: readonly Entry[] = entries
  .map((e) => ({ ...e, group: groupOf(e.kind) }))
  .sort((a, b) => order(a.kind) - order(b.kind));

function order(kind: Kind): number {
  return Object.values(GROUPS).flat().indexOf(kind as never);
}

/** A figure's entry by name. */
export const entryOf = (kind: Kind): Entry => catalog.find((e) => e.kind === kind)!;

/** A figure's first example as a reader writes it: the fence, its options and its body. */
export function fenceOf(e: Entry): string {
  const opts = Object.entries(e.options)
    .map(([k, v]) => (typeof v === "string" && /[\s"']/.test(v) ? `${k}="${v}"` : v === true ? k : `${k}=${v}`))
    .join(" ");
  return `\`\`\`ascii ${e.kind}${opts ? ` ${opts}` : ""}\n${e.source}\n\`\`\``;
}
