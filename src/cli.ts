#!/usr/bin/env node
/*
 * npx ascii.rest <piece>: plays a piece in the terminal until a key is pressed.
 * npx ascii.rest play <file.ts>: plays a piece of your own, its file's default export, again on each save with --watch.
 * npx ascii.rest svg <file.ts>: a piece of your own as an animated SVG, for a README.
 * npx ascii.rest list: every piece's name, by category.
 * npx ascii.rest banner <text>: the text in block letters, with a passing glint.
 * npx ascii.rest add <name...>: a piece's TypeScript, copied into your project.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 */
import { existsSync, mkdirSync, readFileSync, statSync, watch, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { drawable, fonts, shadows, type Effect, type FontName, type ShadowName } from "./banner.ts";
import { isPiece, load, names, type PieceName } from "./library.ts";
import { svg as toSvg } from "./svg.ts";
import { banner, play, still } from "./terminal.ts";
import type { Category, Piece } from "./types.ts";

const or = (words: string[]) => (words.length > 1 ? `${words.slice(0, -1).join(", ")} or ${words.at(-1)}` : words[0]);

const HELP = `ascii.rest: animated ascii art, in your terminal and in your code.

  npx ascii.rest <piece>          plays a piece until you press a key
  npx ascii.rest play <file.ts>   plays a piece of your own: the file's default export
  npx ascii.rest svg <file.ts>    a piece of your own as an animated SVG, for a README
  npx ascii.rest list             every piece, by category
  npx ascii.rest banner <text>    your text in block letters, with a glint
  npx ascii.rest add <name...>    copies pieces' TypeScript into your project

  --mono            a coloured piece in the terminal's own colour
  --light           for a light terminal: the light colours, and shading flipped
  --fps <n>         frames a second, instead of the piece's own
  --seconds <n>     stops after n seconds; for a banner, how long it moves

  play:
  --watch           plays it again each time you save the file

  svg, besides --fps and --seconds:
  --dark            the SVG for a dark page, as GitHub's dark theme
  --out <path>      where the SVG goes: printed by default

  a banner:
  --color <hex>     its letters in this colour, like ff6a00, or two or more
                    for a fade, like ff6a00,f778ba
  --tagline <s>     a line under it
  --font <name>     ${or(Object.keys(fonts))}
  --shadow <name>   ${[...Object.keys(shadows), "none"].join(", ")}
  --effect <name>   glint, type or still

  add:
  --dir <path>      where the files go: components/ascii, or src/components/ascii
                    when there is a src folder
  --overwrite       replace files that are already there
  --registry <url>  another copy of the registry: https://ascii.rest/r

  -h, --help        this help
  -v, --version     the version

  npx ascii.rest rust
  npx ascii.rest night-coast --seconds 10
  npx ascii.rest play sea.ts --watch
  npx ascii.rest svg sea.ts --dark --out sea-dark.svg
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
  /** A line on how to use what was added, which add prints. */
  docs?: string;
}

// Each name's registry item, and every item it depends on, once each, dependencies first.
async function items(wanted: string[], registry: string): Promise<RegistryItem[]> {
  const seen = new Map<string, RegistryItem>();
  // Fetched already, or being fetched: an item that needs itself, A to B to A, is fetched once and the loop ends there.
  const visited = new Set<string>();
  const visit = async (ref: string) => {
    // A name, or an item's URL; ascii.rest's own follow --registry, so another copy of the registry serves them all.
    // As a URL resolves it, so r/../r/loop.json is r/loop.json.
    let url: string;
    try {
      url = new URL(/^https?:\/\//.test(ref) ? ref.replace(/^https:\/\/ascii\.rest\/r(?=\/)/, registry) : `${registry}/${ref}.json`).href;
    } catch {
      throw new Usage(`"${clean(ref)}" is not a name or a URL to add`);
    }
    if (visited.has(url)) return;
    visited.add(url);
    let res: Response;
    try {
      res = await fetch(url);
    } catch (error) {
      throw new Usage(`couldn't reach ${clean(url)}: ${clean(error instanceof Error ? ((error.cause as Error | undefined)?.message ?? error.message) : error)}`);
    }
    if (!res.ok) throw new Usage(`there is no "${clean(ref)}" to add (${clean(url)} answered ${res.status}). npx ascii.rest list shows every piece.`);
    let item: RegistryItem;
    try {
      item = (await res.json()) as RegistryItem;
    } catch {
      throw new Usage(`${clean(url)} is not a registry item: it isn't JSON`);
    }
    if (typeof item !== "object" || item === null) throw new Usage(`${clean(url)} is not a registry item`);
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
  // registry is someone else's JSON, so a path with .. in it, an absolute one or one with a control character, content
  // that isn't text and a dependency that isn't a package's name are each refused before anything is written.
  const place = (file: { path: string; target?: string; content?: unknown }) => {
    const named = file.target ?? file.path;
    if (typeof named !== "string" || /[\u0000-\u001f\u007f-\u009f]/.test(named)) throw new Usage(`refusing a file named ${JSON.stringify(named)}`);
    const rest = named.replace(/^@components\/ascii(\/|$)/, "");
    const path = resolve(base, rest);
    if (isAbsolute(rest) || !path.startsWith(base + sep)) throw new Usage(`refusing "${named}": it would land outside ${into}`);
    if (file.content !== undefined && typeof file.content !== "string") throw new Usage(`refusing "${named}": its content isn't text`);
    return path;
  };
  const deps = new Set<string>();
  for (const item of all) {
    for (const file of item.files ?? []) place(file);
    for (const d of item.dependencies ?? []) {
      if (typeof d !== "string" || !/^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*(@[\w.^~-]+)?$/i.test(d)) throw new Usage(`refusing ${clean(item.name)}: ${JSON.stringify(d)} is not a package to install`);
      deps.add(d);
    }
  }
  const wrote: string[] = [], kept: string[] = [];
  for (const item of all) {
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
  // Each item's own word on how to use it, the kit's say, where it has one; the copying docs for the rest.
  const docs = [...new Set(all.filter((item) => wanted.includes(item.name) && typeof item.docs === "string" && item.docs.trim()).map((item) => clean(item.docs).trim()))];
  process.stdout.write(`${s}\n${docs.length ? docs.join("\n") : "The docs for what you added: https://ascii.rest/docs/copy/"}\n`);
}

// The order of the sidebar on ascii.rest and of the table in the README.
const ORDER: Category[] = ["scenes", "ui", "data", "type", "logos", "companies", "distros", "shapes", "space", "physics", "nature", "creatures", "objects", "generative", "effects"];

class Usage extends Error {}

// Someone else's text, without the control characters that would move a terminal's cursor or change its colours.
const clean = (s: unknown) => String(s).replace(/[\u0000-\u001f\u007f-\u009f]/g, "?");

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

// True for an argument that names a file there is, so npx ascii.rest ./sea.ts plays it as play would.
const isFile = (arg: string | undefined) => !!arg && /[\\/.]/.test(arg) && existsSync(resolve(arg)) && statSync(resolve(arg)).isFile();

// A piece from a file of your own: its default export, or the file itself when it is a piece module (meta and a default
// function), as scripts/kit/show.ts reads one. `bust` loads it afresh after a save.
async function pieceIn(path: string, bust = 0): Promise<Piece> {
  const isPieceLike = (v: unknown): v is Piece => !!v && typeof v === "object" && "meta" in v && typeof (v as Piece).default === "function";
  let mod: Record<string, unknown>;
  try {
    mod = (await import(`${pathToFileURL(path).href}${bust ? `?v=${bust}` : ""}`)) as Record<string, unknown>;
  } catch (error) {
    if ((error as { code?: string }).code === "ERR_UNKNOWN_FILE_EXTENSION")
      throw new Usage(`Node ${process.version} can't run ${clean(relative(process.cwd(), path))} as it is: a .ts file needs Node 22.18 or later, or compile it to .js first`);
    throw error;
  }
  if (isPieceLike(mod.default)) return mod.default;
  if (mod.meta && typeof mod.default === "function") return mod as unknown as Piece;
  throw new Usage(`${clean(relative(process.cwd(), path))} has no piece: export one as its default, export default sea()`);
}

// npx ascii.rest play <file> and svg <file>: a piece of your own, played in the terminal (again on each save with
// --watch) or written as an SVG.
async function mine(positionals: string[], values: { mono?: boolean; light?: boolean; fps?: string; seconds?: string; watch?: boolean; dark?: boolean; out?: string }) {
  const asked = positionals[0] === "play" || positionals[0] === "svg" ? positionals[0] : "play";
  const named = positionals[0] === "play" || positionals[0] === "svg" ? positionals.slice(1) : positionals;
  if (!named.length) throw new Usage(`${asked} what? npx ascii.rest ${asked} sea.ts, a file whose default export is a piece`);
  if (named.length > 1) throw new Usage(`one file at a time: npx ascii.rest ${asked} sea.ts`);
  const path = resolve(named[0]);
  if (!existsSync(path) || !statSync(path).isFile()) throw new Usage(`there is no file ${clean(named[0])}`);
  const fps = number("fps", values.fps, 60);
  const seconds = number("seconds", values.seconds);
  if (asked === "svg") {
    if (values.watch || values.mono || values.light) throw new Usage(`--watch, --mono and --light are for play: an SVG takes --dark, --out, --fps and --seconds`);
    const piece = await pieceIn(path);
    const out = toSvg(piece, { dark: values.dark === true, ...(fps ? { fps } : {}), ...(seconds ? { seconds } : {}) });
    if (values.out === undefined) return void process.stdout.write(`${out}\n`);
    writeFileSync(resolve(values.out), out);
    return void process.stdout.write(`wrote ${clean(values.out)}: ${piece.meta.name}, ${(out.length / 1024).toFixed(1)} KB\n`);
  }
  if (values.dark || values.out !== undefined) throw new Usage(`--dark and --out are for svg: npx ascii.rest svg sea.ts --dark --out sea.svg`);
  const options = { mono: values.mono === true, light: values.light === true, fps, seconds };
  // Piped or redirected, there is nothing to play on: the first frame, as text.
  if (!process.stdout.isTTY) return void process.stdout.write(`${await still(await pieceIn(path), { light: options.light })}\n`);
  if (!values.watch) {
    const played = await play(await pieceIn(path), options);
    if (played.interrupted) process.exitCode = 130;
    return;
  }
  // Watching: each save stops the play and loads the file afresh; a key, Ctrl+C or --seconds ends it all.
  let controller = new AbortController(), changed = false, wake: (() => void) | null = null, version = 0;
  const watcher = watch(path, () => {
    changed = true;
    controller.abort();
    wake?.();
  });
  try {
    for (;;) {
      controller = new AbortController();
      changed = false;
      let piece: Piece;
      try {
        piece = await pieceIn(path, ++version);
      } catch (error) {
        // A save that doesn't load yet: say why, and wait for the next one.
        process.stderr.write(`ascii.rest: ${error instanceof Error ? error.message : String(error)}\nwaiting for ${clean(named[0])} to change\n`);
        await new Promise<void>((done) => (wake = done));
        wake = null;
        continue;
      }
      const played = await play(piece, { ...options, signal: controller.signal });
      if (played.interrupted) process.exitCode = 130;
      if (!changed) return;
    }
  } finally {
    watcher.close();
  }
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
      watch: { type: "boolean" },
      dark: { type: "boolean" },
      out: { type: "string" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });
  if (values.version) return void process.stdout.write(`${version()}\n`);
  if (values.help || !positionals.length) return void process.stdout.write(HELP);
  // A piece of your own, by its file.
  const own = positionals[0] === "play" || positionals[0] === "svg" || isFile(positionals[0]);
  if (!own && [values.watch, values.dark, values.out].some((v) => v !== undefined))
    throw new Usage(`--watch, --dark and --out are for a piece of your own: npx ascii.rest play sea.ts --watch`);
  if (own) {
    if ([values.color, values.tagline, values.font, values.shadow, values.effect, values.dir, values.overwrite, values.registry].some((v) => v !== undefined))
      throw new Usage(`play takes --mono, --light, --fps, --seconds and --watch, and svg --dark, --out, --fps and --seconds`);
    return mine(positionals, values);
  }
  if (positionals[0] === "add" && [values.mono, values.light, values.fps, values.seconds, values.color, values.tagline, values.font, values.shadow, values.effect].some((v) => v !== undefined))
    throw new Usage(`add takes only --dir, --overwrite and --registry: npx ascii.rest add donut --dir src/ascii`);
  if (positionals[0] === "add") return add(positionals.slice(1), { dir: values.dir, overwrite: values.overwrite === true, registry: (values.registry ?? REGISTRY).replace(/\/$/, "") });
  if ([values.dir, values.overwrite, values.registry].some((v) => v !== undefined))
    throw new Usage(`--dir, --overwrite and --registry are for add: npx ascii.rest add donut --dir src/ascii`);
  if (positionals[0] === "banner") {
    if (values.mono !== undefined || values.fps !== undefined)
      throw new Usage(`--mono and --fps are for a piece: a banner has no colour unless you give it one, and moves for --seconds`);
    // the words after it, as the shell split them
    const text = positionals.slice(1).join(" ");
    // How long it moves: 0 prints it still, and it has to end.
    const seconds = values.seconds === undefined ? undefined : Number(values.seconds);
    if (seconds !== undefined && !(Number.isFinite(seconds) && seconds >= 0)) throw new Usage(`--seconds for a banner takes a number of 0 or more, not "${values.seconds}"`);
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
  const fps = number("fps", values.fps, 60);
  const seconds = number("seconds", values.seconds);
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

// Piped into something that stops reading, `| head` say, the rest has nowhere to go: that is the end, not an error.
process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EPIPE") process.exit(0);
  throw error;
});

main().catch((error: unknown) => {
  // parseArgs reports a bad flag as a TypeError with a code; anything else is a real failure, shown with its stack.
  const flag = error instanceof TypeError && "code" in error && String(error.code).startsWith("ERR_PARSE_ARGS");
  if (error instanceof Usage) process.stderr.write(`ascii.rest: ${error.message}\n`);
  else if (flag) process.stderr.write(`ascii.rest: ${error.message}\nnpx ascii.rest --help shows the options.\n`);
  else process.stderr.write(`ascii.rest: ${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
