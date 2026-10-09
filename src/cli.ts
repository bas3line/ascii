#!/usr/bin/env node
/*
 * npx ascii.rest <piece>: plays a piece in the terminal until a key is pressed.
 * npx ascii.rest list: every piece's name, by category.
 * npx ascii.rest banner <text>: the text in block letters, with a passing glint.
 * npx ascii.rest add <name...>: a piece's TypeScript, copied into your project.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { drawable, fonts, shadows, type Effect, type FontName, type ShadowName } from "./banner.ts";
import { isPiece, load, names, type PieceName } from "./library.ts";
import { banner, play, still } from "./terminal.ts";
import type { Category } from "./types.ts";

const HELP = `ascii.rest: animated ascii art, in your terminal and in your code.

  npx ascii.rest <piece>          plays a piece until you press a key
  npx ascii.rest list             every piece, by category
  npx ascii.rest banner <text>    your text in block letters, with a glint
  npx ascii.rest add <name...>    copies pieces' TypeScript into your project

  --mono            a coloured piece in the terminal's own colour
  --light           for a light terminal: the light colours, and shading flipped
  --fps <n>         frames a second, instead of the piece's own
  --seconds <n>     stops after n seconds; for a banner, how long it moves

  a banner:
  --color <hex>     its letters in this colour, like ff6a00, or two or more
                    for a fade, like ff6a00,f778ba
  --tagline <s>     a line under it
  --font <name>     ${Object.keys(fonts).join(" or ")}
  --shadow <name>   ${[...Object.keys(shadows), "none"].join(", ")}
  --effect <name>   glint, type or still

  add:
  --dir <path>      where the files go: components/ascii, or src/components/ascii
                    when there is a src folder
  --overwrite       replace files that are already there

  -h, --help        this help
  -v, --version     the version

  npx ascii.rest rust
  npx ascii.rest night-coast --seconds 10
  npx ascii.rest banner 'my cli' --color ff6a00,f778ba --tagline 'v1.0, fast'
  npx ascii.rest add ascii donut banner

Every piece, on a page: https://ascii.rest. The docs: https://ascii.rest/docs/
`;

const REGISTRY = "https://ascii.rest/r";

interface RegistryItem {
  name: string;
  files?: { path: string; content?: string; target?: string }[];
  registryDependencies?: string[];
  dependencies?: string[];
}

// Each name's registry item, and every item it depends on, once each, dependencies first.
async function items(wanted: string[], registry: string): Promise<RegistryItem[]> {
  const seen = new Map<string, RegistryItem>();
  const visit = async (ref: string) => {
    // A name, or an item's URL; ascii.rest's own follow --registry, so another copy of the registry serves them all.
    const url = /^https?:\/\//.test(ref) ? ref.replace(/^https:\/\/ascii\.rest\/r(?=\/)/, registry) : `${registry}/${ref}.json`;
    if (seen.has(url)) return;
    const res = await fetch(url);
    if (!res.ok) throw new Usage(`there is no "${ref}" to add (${url} answered ${res.status}). npx ascii.rest list shows every piece.`);
    const item = (await res.json()) as RegistryItem;
    for (const dep of item.registryDependencies ?? []) await visit(dep);
    seen.set(url, item);
  };
  for (const name of wanted) await visit(name);
  return [...seen.values()];
}

async function add(wanted: string[], { dir, overwrite, registry }: { dir?: string; overwrite: boolean; registry: string }) {
  if (!wanted.length) throw new Usage(`add what? npx ascii.rest add ascii donut`);
  const root = process.cwd();
  const into = dir ?? (existsSync(join(root, "src")) ? join("src", "components", "ascii") : join("components", "ascii"));
  const all = await items(wanted, registry);
  const base = resolve(root, into);
  // Every file names its place under the components folder, @components/ascii/<path>, and must land inside it: a
  // registry is someone else's JSON, and a path with .. in it, or an absolute one, is refused before anything is written.
  const place = (file: { path: string; target?: string }) => {
    const rest = (file.target ?? file.path).replace(/^@components\/ascii\//, "");
    const path = resolve(base, rest);
    if (isAbsolute(rest) || !path.startsWith(base + sep)) throw new Usage(`refusing "${file.target ?? file.path}": it would land outside ${into}`);
    return path;
  };
  for (const item of all) for (const file of item.files ?? []) place(file);
  const wrote: string[] = [], kept: string[] = [];
  const deps = new Set<string>();
  for (const item of all) {
    item.dependencies?.forEach((d) => deps.add(d));
    for (const file of item.files ?? []) {
      const path = place(file);
      if (existsSync(path) && !overwrite) {
        kept.push(relative(root, path));
        continue;
      }
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, file.content ?? "");
      wrote.push(relative(root, path));
    }
  }
  let s = wrote.length ? `wrote\n${wrote.map((p) => `  ${p}`).join("\n")}\n` : "";
  if (kept.length) s += `kept, already there (--overwrite replaces them)\n${kept.map((p) => `  ${p}`).join("\n")}\n`;
  if (deps.size) s += `it needs ${[...deps].join(", ")}: npm install ${[...deps].join(" ")}\n`;
  process.stdout.write(`${s}\nThe docs for what you added: https://ascii.rest/docs/copy/\n`);
}

// The order of the sidebar on ascii.rest and of the table in the README.
const ORDER: Category[] = ["scenes", "ui", "data", "type", "logos", "companies", "distros", "shapes", "space", "physics", "nature", "creatures", "objects", "generative", "effects"];

class Usage extends Error {}

const version = () => (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }).version;

const number = (flag: string, value: string | undefined, max = Infinity) => {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!(n > 0 && n <= max)) throw new Usage(`--${flag} takes a number above 0${max < Infinity ? ` and up to ${max}` : ""}, not "${value}"`);
  return n;
};

// Every piece's name and category. Loading all of them takes a moment, so only list and a miss do it.
async function catalog() {
  return Promise.all(names.map(async (slug) => ({ slug, ...(await load[slug]()).meta })));
}

// Edit distance, a swap of two neighbours counting as one edit, so "rsut" is one from "rust".
function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i && j ? 0 : i + j)));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

const or = (words: string[]) => (words.length > 1 ? `${words.slice(0, -1).join(", ")} or ${words.at(-1)}` : words[0]);

// A piece by its file name, or by the name it shows: "night coast", "c++", "newton's cradle".
async function find(wanted: string): Promise<PieceName> {
  const word = wanted.trim().toLowerCase();
  const slug = word.replace(/\s+/g, "-");
  if (isPiece(slug)) return slug;
  const all = await catalog();
  const named = all.find((p) => p.name === word);
  if (named) return named.slug;
  const close = all
    .map((p) => ({ slug: p.slug, d: Math.min(distance(slug, p.slug), distance(word, p.name)), part: slug.length > 2 && p.slug.includes(slug) }))
    .filter((p) => p.part || p.d <= Math.max(1, Math.floor(slug.length / 3)))
    // the names it is part of first, in order, then the nearest typos
    .sort((a, b) => Number(b.part) - Number(a.part) || (a.part ? 0 : a.d - b.d) || a.slug.localeCompare(b.slug))
    .slice(0, 8)
    .map((p) => p.slug);
  throw new Usage(
    `there is no piece called "${wanted}".${close.length ? ` Did you mean ${or(close)}?` : ""}\n` + `npx ascii.rest list shows every piece.`,
  );
}

async function list() {
  const all = await catalog();
  const width = Math.min(process.stdout.columns || 80, 100);
  const pad = 12;
  let s = "";
  for (const category of ORDER) {
    const slugs = all.filter((p) => p.category === category).map((p) => p.slug).sort();
    if (!slugs.length) continue;
    let line = category.padEnd(pad);
    for (const slug of slugs) {
      if (line.length > pad && line.length + 2 + slug.length > width) (s += line + "\n"), (line = " ".repeat(pad));
      line += (line.length > pad ? "  " : "") + slug;
    }
    s += line + "\n";
  }
  process.stdout.write(`${s}\n${all.length} pieces. npx ascii.rest <piece> plays one.\n`);
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      mono: { type: "boolean" },
      light: { type: "boolean" },
      fps: { type: "string" },
      seconds: { type: "string" },
      color: { type: "string" },
      tagline: { type: "string" },
      font: { type: "string" },
      shadow: { type: "string" },
      effect: { type: "string" },
      dir: { type: "string" },
      overwrite: { type: "boolean" },
      registry: { type: "string" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });
  if (values.version) return void process.stdout.write(`${version()}\n`);
  if (values.help || !positionals.length) return void process.stdout.write(HELP);
  const fps = number("fps", values.fps, 60);
  const seconds = number("seconds", values.seconds);
  if (positionals[0] === "add") return add(positionals.slice(1), { dir: values.dir, overwrite: values.overwrite === true, registry: (values.registry ?? REGISTRY).replace(/\/$/, "") });
  if (positionals[0] === "banner") {
    // the words after it, as the shell split them
    const text = positionals.slice(1).join(" ");
    const font = values.font ?? "block";
    if (!Object.hasOwn(fonts, font)) throw new Usage(`--font takes ${or(Object.keys(fonts))}, not "${font}"`);
    if (!drawable(text, font as FontName).trim()) throw new Usage(`a banner takes letters, digits, spaces and . , ! ? ' : - + = / _: npx ascii.rest banner 'my cli'`);
    const colors = values.color?.split(",").map((c) => c.trim().replace(/^#/, ""));
    if (colors && colors.some((c) => !/^[0-9a-f]{6}$/i.test(c)))
      throw new Usage(`--color takes six hex digits, like ff6a00, or more for a fade, like ff6a00,f778ba, not "${values.color}"`);
    const shadow = values.shadow;
    if (shadow !== undefined && shadow !== "none" && !Object.hasOwn(shadows, shadow)) throw new Usage(`--shadow takes ${or([...Object.keys(shadows), "none"])}, not "${shadow}"`);
    const effect = values.effect;
    if (effect !== undefined && !["glint", "type", "still"].includes(effect)) throw new Usage(`--effect takes glint, type or still, not "${effect}"`);
    const { interrupted } = await banner(text, {
      seconds,
      light: values.light === true,
      color: colors?.map((c) => `#${c}`),
      tagline: values.tagline,
      font: font as FontName,
      shadow: shadow as ShadowName | "none" | undefined,
      effect: effect as Effect | undefined,
    });
    if (interrupted) process.exitCode = 130;
    return;
  }
  if ([values.color, values.tagline, values.font, values.shadow, values.effect].some((v) => v !== undefined))
    throw new Usage(`--color, --tagline, --font, --shadow and --effect are for a banner: npx ascii.rest banner <text> --color ff6a00`);
  if (positionals.length > 1) throw new Usage(`one piece at a time: npx ascii.rest <piece>`);
  if (positionals[0] === "list") return list();

  const slug = await find(positionals[0]);
  const light = values.light === true;
  // Piped or redirected, there is nothing to play on: the first frame, as text.
  if (!process.stdout.isTTY) return void process.stdout.write(`${await still(slug, { light })}\n`);

  const played = await play(slug, { mono: values.mono === true, light, fps, seconds });
  if (played.cropped) {
    const { piece, terminal } = played;
    process.stderr.write(
      `${slug} is ${piece.cols}x${piece.rows} and this terminal is ${terminal.cols}x${terminal.rows}, ` +
        `so only its middle showed. A bigger window shows all of it.\n`,
    );
  }
  if (played.interrupted) process.exitCode = 130;
}

main().catch((error: unknown) => {
  // parseArgs reports a bad flag as a TypeError with a code; anything else is a real failure, shown with its stack.
  const flag = error instanceof TypeError && "code" in error && String(error.code).startsWith("ERR_PARSE_ARGS");
  if (error instanceof Usage) process.stderr.write(`ascii.rest: ${error.message}\n`);
  else if (flag) process.stderr.write(`ascii.rest: ${error.message}\nnpx ascii.rest --help shows the options.\n`);
  else process.stderr.write(`ascii.rest: ${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
