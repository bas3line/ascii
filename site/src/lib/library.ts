/*
 * The library as the site shows it: every piece with its meta, its TypeScript
 * source and its first frame, grouped into categories in sidebar order. The
 * pieces come through the package, as any app would get them.
 */
import { load, names, type Meta, type Piece as Module } from "ascii.rest";
import added from "../data/added.json";

export type Piece = Meta & {
  slug: string;
  /** camelCase name, as "ascii.rest/pieces" exports it. */
  id: string;
  source: string;
  still: string;
  stillPaper: string;
  /** Added lately, and marked new. */
  recent: boolean;
};

/*
 * A piece is new for 30 days from the day it was added, by the dates in
 * data/added.json (npm run added). One the file does not know yet came after
 * it was written, so it is new too. The pieces from the library's first day
 * are what it opened with, not additions to it, so they are never new.
 */
const dates: Record<string, string> = added;
const opened = Object.values(dates).sort()[0];
const built = Date.now();
const isRecent = (slug: string) => {
  const day = dates[slug];
  return !day || (day !== opened && built - Date.parse(day) <= 30 * 86_400_000);
};

/** Sidebar order. The scenes first, then the pieces meant as page furniture with the logos last among them, then the rest. */
export const GROUPS = [
  { label: "art", categories: ["scenes"] },
  { label: "components", categories: ["ui", "data", "type", "logos", "companies", "distros"] },
  { label: "more", categories: ["shapes", "space", "physics", "nature", "creatures", "objects", "generative", "effects"] },
] as const;

const sources = import.meta.glob<string>("../../../src/pieces/*.ts", { eager: true, query: "?raw", import: "default" });
const camel = (slug: string) => slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

const all: Piece[] = [];
for (const slug of names) {
  const mod: Module = await load[slug]();
  try {
    const options = { ...mod.meta.options };
    // The baked frame is text: a scene's dots, or a logo in one ink.
    const still = mod.default(options)(0, { paper: false });
    all.push({
      ...mod.meta,
      slug,
      id: camel(slug),
      source: sources[`../../../src/pieces/${slug}.ts`] ?? "",
      still,
      // A scene is a picture on its own ground, the same in either theme.
      stillPaper: mod.meta.ground ? still : mod.default(options)(0, { paper: true }),
      recent: isRecent(slug),
    });
  } catch (error) {
    console.warn(`ascii: skipping ${slug}: ${(error as Error).message}`);
  }
}

const order: string[] = GROUPS.flatMap((g) => [...g.categories]);
export const pieces = all
  .filter((p) => order.includes(p.category))
  .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name));

export const categories = order
  .map((name) => ({ name, pieces: pieces.filter((p) => p.category === name) }))
  .filter((c) => c.pieces.length);

export const groups = GROUPS.map((g) => ({
  label: g.label,
  categories: categories.filter((c) => (g.categories as readonly string[]).includes(c.name)),
})).filter((g) => g.categories.length);

export const SITE = "https://ascii.rest";
export const NAME = "ascii.rest";
export const REPO = "https://github.com/bas3line/ascii";
/**
 * A new issue on one of the repo's forms (.github/ISSUE_TEMPLATE), opened with
 * some fields filled: GitHub fills a form's text fields, and the title, from
 * query parameters named by their ids.
 */
export function issue(form: "bug" | "logo" | "piece", fields: Record<string, string> = {}) {
  const query = Object.entries(fields).map(([key, value]) => `&${key}=${encodeURIComponent(value)}`);
  return `${REPO}/issues/new?template=${form}.yml${query.join("")}`;
}
export const AUTHOR = { name: "Shubham", handle: "bas3line", url: "https://github.com/bas3line" };
/** Where to find the author, in the order the author page lists them. */
export const LINKS = [
  { label: "yshubham.com", icon: "globe", href: "https://yshubham.com" },
  { label: "@inlovewithgo", icon: "x", href: "https://x.com/inlovewithgo" },
  { label: "extractings", icon: "linkedin", href: "https://www.linkedin.com/in/extractings/" },
  { label: "@bas3line", icon: "github", href: "https://github.com/bas3line" },
] as const;
/** Ways to support the work, on the author page. */
export const SUPPORT = [
  { label: "GitHub Sponsors", icon: "github", href: "https://github.com/sponsors/bas3line" },
  { label: "Buy Me a Coffee", icon: "coffee", href: "https://buymeacoffee.com/bas3line" },
  { label: "PayPal", icon: "paypal", href: "https://paypal.me/ShubhamYadav886" },
] as const;
/** Who sponsors ascii.rest, each shown as our own ascii piece of its logo: under the home page's first scene and on the author page. */
export const SPONSORS = [{ name: "Cloudflare", href: "https://www.cloudflare.com", slug: "cloudflare" }] as const;
export const INSTALL = "npm install ascii.rest";

const optionsOf = (piece: Piece) => (piece.options && Object.keys(piece.options).length ? piece.options : null);

/** One tag, no build step: the element from the site. */
export function tagUsage(piece: Piece) {
  const options = optionsOf(piece);
  const attrs = options ? ` options='${JSON.stringify(options).replace(/'/g, "&#39;")}'` : "";
  return [`<script type="module" src="${SITE}/ascii.js"></script>`, ``, `<ascii-art piece="${piece.slug}"${attrs}></ascii-art>`].join("\n");
}

/** React and Next.js. */
export function reactUsage(piece: Piece) {
  const options = optionsOf(piece);
  return [
    `// ${INSTALL}`,
    `import { Ascii } from "ascii.rest/react";`,
    `import { ${piece.id} } from "ascii.rest/pieces";`,
    ``,
    `<Ascii piece={${piece.id}}${options ? ` options={${JSON.stringify(options)}}` : ""} />`,
  ].join("\n");
}

/** Astro, with the first frame rendered on the server. */
export function astroUsage(piece: Piece) {
  const options = optionsOf(piece);
  return [
    `---`,
    `// ${INSTALL}`,
    `import Ascii from "ascii.rest/astro";`,
    `---`,
    ``,
    `<Ascii piece="${piece.slug}"${options ? ` options={${JSON.stringify(options)}}` : ""} />`,
  ].join("\n");
}

/** A GitHub README, which runs no script: the animated SVG, the dark one in GitHub's dark theme. */
export function readmeUsage(piece: Piece) {
  return [
    `<picture>`,
    `  <source media="(prefers-color-scheme: dark)" srcset="${SITE}/svg/${piece.slug}.dark.svg">`,
    `  <img alt="${piece.name}" src="${SITE}/svg/${piece.slug}.svg" width="${piece.cols * 5}">`,
    `</picture>`,
  ].join("\n");
}

/** Anywhere else: mount the piece in an element yourself. */
export function moduleUsage(piece: Piece) {
  const options = optionsOf(piece);
  const tag = piece.palette ? "canvas" : "pre";
  return [
    `// ${INSTALL}`,
    `import { mount } from "ascii.rest";`,
    `import { ${piece.id} } from "ascii.rest/pieces";`,
    ``,
    `const el = document.querySelector<HTML${piece.palette ? "Canvas" : "Pre"}Element>("${tag}")!;`,
    `const stop = mount(el, ${piece.id}${options ? `, ${JSON.stringify(options)}` : ""});`,
  ].join("\n");
}

/** A terminal: the package's own command plays it, nothing to install first. */
export function terminalUsage(piece: Piece) {
  return `npx ascii.rest ${piece.slug}`;
}
