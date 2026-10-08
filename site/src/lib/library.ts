/*
 * The library as the site shows it: every piece with its meta, its TypeScript
 * source and its first frame, grouped into categories in sidebar order. The
 * pieces come through the package, as any app would get them.
 */
import { load, names, type Meta, type Piece as Module } from "ascii.rest";

export type Piece = Meta & {
  slug: string;
  /** camelCase name, as "ascii.rest/pieces" exports it. */
  id: string;
  source: string;
  still: string;
  stillPaper: string;
};

/** Sidebar order. The scenes first, then the pieces meant as page furniture with the logos last among them, then the rest. */
export const GROUPS = [
  { label: "art", categories: ["scenes"] },
  { label: "components", categories: ["ui", "data", "type", "logos", "distros"] },
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
/** Until the package is on npm, it installs from GitHub. */
export const INSTALL = "npm install github:bas3line/ascii";

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
