/*
 * The registry at /r/: every piece and every part of the library as a shadcn
 * registry item, so `npx shadcn@latest add https://ascii.rest/r/donut.json`, or
 * `npx ascii.rest add donut`, copies its TypeScript into a project to keep and
 * change. Every file lands under the project's components folder, in ascii/,
 * laid out as the library lays itself out, so the files' imports of each other
 * hold: ascii/types.ts, ascii/mount.ts, ascii/pieces/donut.ts. Imports lose
 * their .ts, which a project's TypeScript setup may not allow.
 *
 * Items name the items they need by URL, under ASCII_REGISTRY at build time,
 * https://ascii.rest/r by default, so a local build can be tried end to end.
 */
import { SITE, pieces } from "./library";

export const BASE = (process.env.ASCII_REGISTRY ?? `${SITE}/r`).replace(/\/$/, "");
export const url = (name: string) => `${BASE}/${name}.json`;

type FileType = "registry:lib" | "registry:component";

export interface Item {
  $schema: string;
  name: string;
  type: FileType | "registry:item";
  title: string;
  description: string;
  files: { path: string; type: FileType; target: string; content: string }[];
  registryDependencies: string[];
  dependencies?: string[];
  docs?: string;
}

const lib = import.meta.glob<string>("../../../src/{types,mount,banner,svg}.ts", { eager: true, query: "?raw", import: "default" });
const react = import.meta.glob<string>("../../../registry/*.tsx", { eager: true, query: "?raw", import: "default" });
// The kit's modules, without their tests: kit/index.ts, every module it exports and the recipes, laid out as in the library.
const kit = import.meta.glob<string>(["../../../src/kit/*.ts", "../../../src/kit/recipes/*.ts", "!../../../src/kit/**/*.test.ts"], {
  eager: true,
  query: "?raw",
  import: "default",
});

// Relative imports without their .ts or .tsx: import { mount } from "./mount".
const strip = (source: string) => source.replace(/((?:from\s+|import\s*\(\s*)["']\.{1,2}\/[^"']*?)\.tsx?(["'])/g, "$1$2");

// shadcn drops whatever comment opens a file, the credit with it, but keeps one after the imports: so it goes there.
function settle(source: string) {
  const head = /^\s*(\/\*[\s\S]*?\*\/)[ \t]*\n/.exec(source);
  if (!head) return source;
  const rest = source.slice(head[0].length);
  const imports = /^(?:import\b[\s\S]*?;[ \t]*\n)+/.exec(rest);
  if (!imports) return source;
  return `${imports[0].trimEnd()}\n\n${head[1]}\n${rest.slice(imports[0].length).replace(/^\n+/, "")}`;
}

const item = (name: string, title: string, description: string, files: [string, string, FileType][], needs: string[] = [], docs?: string): Item => ({
  $schema: "https://ui.shadcn.com/schema/registry-item.json",
  name,
  type: files.length === 1 ? files[0][2] : "registry:lib",
  title,
  description,
  files: files.map(([path, source, type]) => ({ path, type, target: `@components/ascii/${path.replace(/^(src|registry)\//, "")}`, content: settle(strip(source)) })),
  registryDependencies: needs.map(url),
  ...(docs ? { docs } : {}),
});

const src = (file: string) => lib[`../../../src/${file}`];
const reg = (file: string) => react[`../../../registry/${file}`];

/** The library's own parts, then every piece. */
export const items: Item[] = [
  // Every item needs core, so its note is the one shadcn shows after an install, once.
  item(
    "core",
    "core",
    "The piece contract and mount(): plays any piece in a <pre>, or on a <canvas> in colour.",
    [
      ["src/types.ts", src("types.ts"), "registry:lib"],
      ["src/mount.ts", src("mount.ts"), "registry:lib"],
    ],
    [],
    "ascii.rest is in components/ascii. How to use each part: https://ascii.rest/docs/copy/",
  ),
  item("banner", "banner", "banner(): any text in block letters as a piece, every part of it an option.", [["src/banner.ts", src("banner.ts"), "registry:lib"]], ["core"]),
  item("svg", "svg", "svg() and bannerSvg(): any piece, or a banner with a tagline and a logo, as an animated SVG.", [["src/svg.ts", src("svg.ts"), "registry:lib"]], ["banner"]),
  // The kit imports the piece contract (types.ts), which core brings, and its widgets banner().
  item(
    "kit",
    "kit",
    "The kit for making your own ascii art: recipes in one line, then fields, drawing, maths, 3D scenes, particles, effects, layouts, images, materials and SVGs.",
    Object.keys(kit)
      .sort()
      .map((key): [string, string, FileType] => [key.replace("../../../", ""), kit[key], "registry:lib"]),
    ["core", "banner"],
    "The kit is in components/ascii/kit: import from ./kit/index. How to use it: https://ascii.rest/docs/kit/",
  ),
  // The React components name react as an npm dependency, which a React project has already.
  { ...item("ascii", "Ascii", "<Ascii>: any piece in React and Next.js.", [["registry/ascii.tsx", reg("ascii.tsx"), "registry:component"]], ["core"]), dependencies: ["react"] },
  {
    ...item("ascii-banner", "Banner", "<Banner>: any text in block letters in React and Next.js.", [["registry/ascii-banner.tsx", reg("ascii-banner.tsx"), "registry:component"]], ["ascii", "banner"]),
    dependencies: ["react"],
  },
  ...pieces.map((p) =>
    item(p.slug, p.name, `${p.note}.`, [[`src/pieces/${p.slug}.ts`, p.source, "registry:lib"]], /from "\.\.\/banner(\.ts)?"/.test(p.source) ? ["core", "banner"] : ["core"]),
  ),
];

/** Everything, as one item. */
export const all: Item = {
  $schema: "https://ui.shadcn.com/schema/registry-item.json",
  name: "all",
  type: "registry:item",
  title: "ascii.rest",
  description: `Every piece, the banner, the SVG writer, the React components and the kit: ${pieces.length} pieces.`,
  files: [],
  registryDependencies: items.map((i) => url(i.name)),
};

/** The registry's index, as shadcn's registry.json has it: every item, its files named but not in it. */
export const index = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "ascii.rest",
  homepage: `${SITE}/docs/copy/`,
  items: [...items, all].map(({ $schema: _, files, ...rest }) => ({ ...rest, files: files.map(({ content: __, ...f }) => f) })),
};
