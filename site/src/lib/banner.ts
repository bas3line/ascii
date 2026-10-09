/*
 * README banners by URL: the choices a banner's query carries, read and
 * written here, and the banner drawn by bannerSvg() from ascii.rest/svg, the
 * same function anyone can call with every option. A Vercel function
 * (pages/banner/[file].ts) serves it at /banner/<text>.svg and
 * /banner/<text>.dark.svg; the page at /banner/ draws the same SVG in the
 * browser as you choose. Both read and write the URL with read() and
 * bannerPath(), so a banner has one URL.
 */
import { drawable, fonts, shadows, type FontName, type ShadowName } from "ascii.rest/banner";
import { bannerSvg, darkColor } from "ascii.rest/svg";

// Not from lib/library.ts, which loads every piece: the banner function and the page's script bundle this file.
const SITE = "https://ascii.rest";

/**
 * The most characters a banner holds: 20 of the widest, bold's M, are 359 columns, about 1,800 pixels, and some 9 ms of
 * CPU to draw, measured in Node; FPS keeps a slow one to the same work.
 */
export const MAX = 20;
/** The longest tagline, in characters. */
export const TAGLINE = 60;
/** What the fonts draw. Anything else in a banner's text is left out. */
export const MARKS = ". , ! ? ' : - + = / _";
export const CHARS = `letters, digits, spaces and ${MARKS}`;

export const EFFECTS = ["glint", "type", "still"] as const;
export const PLACES = ["left", "right", "above", "below"] as const;
export const SIZES = ["s", "m", "l"] as const;
export const FONTS = Object.keys(fonts) as FontName[];
export const SHADOWS = [...(Object.keys(shadows) as ShadowName[]), "none"] as const;
/** The letters' characters by name, as a URL takes them. */
export const FILLS = { shade: "▓", block: "█", light: "▒", hash: "#", at: "@" } as const;
/** How fast it moves, as a URL takes it. */
export const SPEEDS = { slow: 0.6, normal: 1, fast: 1.8 } as const;
/**
 * Frames a second its SVG is sampled at: a slow one fewer, so it has as many frames as a normal one, each held longer.
 * Its loop is longer, and at 15 it would be that much bigger and slower to draw.
 */
export const FPS = { slow: 9, normal: 15, fast: 15 } as const;
/** Pixels a column, as a README shows it with no width of its own. */
export const SCALE = { s: 3, m: 5, l: 8 } as const;

export interface Look {
  /** The letters' colour: GitHub's own (null), one colour, a fade of two or more, or the art's own colour. */
  color: null | "art" | readonly string[];
  effect: (typeof EFFECTS)[number];
  speed: keyof typeof SPEEDS;
  font: FontName;
  shadow: (typeof SHADOWS)[number];
  fill: keyof typeof FILLS;
  /** A line of plain text under the letters, typed out; "" for none. */
  tagline: string;
  /** The slug of a logo, company or distro set beside, above or below the letters; "" for none. */
  art: string;
  place: (typeof PLACES)[number];
  size: (typeof SIZES)[number];
  /** A colour behind it all, as a card; null for none. */
  bg: string | null;
}

export const PLAIN: Look = {
  color: null,
  effect: "glint",
  speed: "normal",
  font: "block",
  shadow: "double",
  fill: "shade",
  tagline: "",
  art: "",
  place: "left",
  size: "m",
  bg: null,
};

/** A banner's text as it is drawn: the characters the font has, one space between words. */
export const clean = (text: string, font: FontName = "block") => drawable(text, font).trim().replace(/\s+/g, " ");

/** A tagline as it is set: no control characters, U+FFFE or U+FFFF, which XML can't hold, or broken surrogates; one space between words. */
export const cleanTagline = (text: string) =>
  text
    .replace(/[\u0000-\u001f\u007f-\u009f￾￿]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, "")
    .trim()
    .replace(/\s+/g, " ");

/** A colour: six hex digits, with or without "#", as "#rrggbb"; null for anything else. */
export const hex = (s: string | null | undefined) => (s && /^#?[0-9a-f]{6}$/i.test(s) ? `#${s.replace("#", "").toLowerCase()}` : null);

const one = <T extends string>(query: URLSearchParams, key: string, allowed: readonly T[], look: Record<string, unknown>): string | null => {
  const v = query.get(key);
  if (v === null) return null;
  if (!allowed.includes(v as T)) return `${key} takes ${allowed.join(", ")}`;
  look[key] = v;
  return null;
};

/** The choices in a banner's query, or what is wrong with them. Anything left out is the plain banner's. */
export function read(query: URLSearchParams): Look | string {
  const look: Look = { ...PLAIN };
  const color = query.get("color");
  if (color === "art") look.color = "art";
  else if (color !== null) {
    const stops = color.split(",").map(hex);
    if (stops.length > 8 || stops.some((c) => !c)) return "color takes six hex digits, like ff6a00, up to eight for a fade, like ff6a00,f778ba, or art";
    look.color = stops as string[];
  }
  const bg = query.get("bg");
  if (bg !== null) {
    if (!hex(bg)) return "bg takes six hex digits, like 0d1117";
    look.bg = hex(bg);
  }
  const wrong =
    one(query, "effect", EFFECTS, look as never) ??
    one(query, "speed", Object.keys(SPEEDS), look as never) ??
    one(query, "font", FONTS, look as never) ??
    one(query, "shadow", SHADOWS, look as never) ??
    one(query, "fill", Object.keys(FILLS), look as never) ??
    one(query, "place", PLACES, look as never) ??
    one(query, "size", SIZES, look as never);
  if (wrong) return wrong;
  const tagline = query.get("tagline");
  if (tagline !== null) {
    look.tagline = cleanTagline(tagline);
    if ([...look.tagline].length > TAGLINE) return `a tagline takes up to ${TAGLINE} characters`;
  }
  const art = query.get("art");
  if (art !== null) {
    if (!/^[a-z0-9-]{1,40}$/.test(art)) return "art takes the name of a logo, company or distro, like rust";
    look.art = art;
  }
  if (look.color === "art" && !look.art) return "color=art takes its colour from the art, so it needs art too";
  return look;
}

/** The query for a look, in one order with the plain banner's choices left out, so each banner has one URL. */
export function query(look: Look): string {
  const q: string[] = [];
  // Brackets escaped too, so the URL can end a Markdown link; commas kept in a fade's colours, and only there, as a
  // browser drops a comma that ends a URL in a srcset, which a tagline's could.
  const put = (key: string, value: string) =>
    q.push(
      `${key}=${encodeURIComponent(value)
        .replace(/[()'*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
        .replace(/%2C/g, key === "color" ? "," : "%2C")}`,
    );
  if (look.color) put("color", look.color === "art" ? "art" : look.color.map((c) => c.slice(1)).join(","));
  for (const key of ["effect", "speed", "font", "shadow", "fill"] as const) if (look[key] !== PLAIN[key]) put(key, look[key]);
  if (look.tagline) put("tagline", look.tagline);
  if (look.art) {
    put("art", look.art);
    if (look.place !== PLAIN.place) put("place", look.place);
  }
  if (look.size !== PLAIN.size) put("size", look.size);
  if (look.bg) put("bg", look.bg.slice(1));
  return q.length ? `?${q.join("&")}` : "";
}

/** Whether a banner's art is drawn for a dark ground: on a card, the card's lightness decides, not the page's theme. */
export const artDark = (look: Look, dark: boolean) => (look.bg ? darkColor(look.bg) : dark);

/**
 * The URL of a banner: its text in the path, ".dark" for GitHub's dark theme, and its choices in the query. A text that
 * itself ends in ".dark" has that dot written %2E, so the Worker, which reads the theme off the path as it came, never
 * takes the text's own ending for the theme.
 */
export const bannerPath = (text: string, dark: boolean, look: Look = PLAIN) =>
  `/banner/${encodeURIComponent(clean(text, look.font)).replace(/\.dark$/i, "%2Edark")}${dark ? ".dark" : ""}.svg${query(look)}`;

// What the banner says, for a README's alt text.
const alt = (words: string, look: Look) => `${words}${look.tagline ? `: ${look.tagline}` : ""}`;
const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** The README snippet: the light banner and the dark one for GitHub's dark theme, linking here; centred if asked. */
export function readmeBanner(text: string, look: Look = PLAIN, center = false) {
  const lines = [
    `<a href="${SITE}/banner/">`,
    `  <picture>`,
    `    <source media="(prefers-color-scheme: dark)" srcset="${SITE}${bannerPath(text, true, look)}">`,
    `    <img alt="${attr(alt(clean(text, look.font), look))}" src="${SITE}${bannerPath(text, false, look)}">`,
    `  </picture>`,
    `</a>`,
  ];
  return center ? [`<p align="center">`, ...lines.map((l) => `  ${l}`), `</p>`].join("\n") : lines.join("\n");
}

/** The same in Markdown, one image for both themes: backslashes and brackets in its words escaped, so none ends the label. */
export const markdownBanner = (text: string, look: Look = PLAIN) =>
  `[![${alt(clean(text, look.font), look).replace(/[\\[\]]/g, "\\$&")}](${SITE}${bannerPath(text, false, look)})](${SITE}/banner/)`;

// In single quotes, which keep a shell's hands off ! and $; a quote in it ends them, is escaped and opens them again.
const quoted = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/**
 * The art's own colour, for a look that takes its colour from the art, since code draws no art to take it from: one,
 * or one for each theme, as a logo in one ink has, black on a light page and white on a dark one.
 */
export type Ink = string | { light: string; dark: string } | null;
// The letters' colours as code can take them: the art's own colour is resolved first, by whoever has the art's SVGs.
const colorsOf = (look: Look, ink?: Ink): readonly string[] | { light: string; dark: string } | null => {
  if (look.color !== "art") return look.color;
  if (!ink) return null;
  if (typeof ink === "string" || ink.light === ink.dark) return [typeof ink === "string" ? ink : ink.dark];
  return ink;
};

/**
 * The command that shows a banner in a terminal: everything a terminal can show of it. Of a colour for each theme, it
 * takes the dark one, as most terminals are.
 */
export function terminalBanner(text: string, look: Look = PLAIN, ink?: Ink) {
  const c = colorsOf(look, ink);
  const colors = c && "light" in c ? [c.dark] : c;
  return (
    `npx ascii.rest banner ${quoted(clean(text, look.font))}` +
    (colors ? ` --color ${colors.map((c) => c.slice(1)).join(",")}` : "") +
    (look.font !== PLAIN.font ? ` --font ${look.font}` : "") +
    (look.shadow !== PLAIN.shadow ? ` --shadow ${look.shadow}` : "") +
    (look.effect !== PLAIN.effect ? ` --effect ${look.effect}` : "") +
    (look.tagline ? ` --tagline ${quoted(look.tagline)}` : "")
  );
}

// A banner's options, each a name and its value as code: only what differs from banner()'s own defaults.
function options(look: Look, ink?: Ink): [string, string][] {
  const colors = colorsOf(look, ink);
  const code = (c: readonly string[]) => (c.length === 1 ? JSON.stringify(c[0]) : `[${c.map((v) => JSON.stringify(v)).join(", ")}]`);
  const list: [string, string | false][] = [
    ["color", colors ? ("light" in colors ? `{ light: ${JSON.stringify(colors.light)}, dark: ${JSON.stringify(colors.dark)} }` : code(colors)) : false],
    ["font", look.font !== PLAIN.font && JSON.stringify(look.font)],
    ["shadow", look.shadow !== PLAIN.shadow && JSON.stringify(look.shadow)],
    ["fill", look.fill !== PLAIN.fill && JSON.stringify(FILLS[look.fill])],
    ["effect", look.effect !== PLAIN.effect && JSON.stringify(look.effect)],
    ["speed", look.speed !== PLAIN.speed && String(SPEEDS[look.speed])],
  ];
  return list.filter((o): o is [string, string] => o[1] !== false);
}
const object = (list: [string, string][]) => (list.length ? `{ ${list.map(([k, v]) => `${k}: ${v}`).join(", ")} }` : "");

/** The same in a CLI of your own, as it starts. */
export function cliBanner(text: string, look: Look = PLAIN, ink?: Ink) {
  const o = object([...options(look, ink), ...(look.tagline ? [["tagline", JSON.stringify(look.tagline)] as [string, string]] : [])]);
  return [`import { banner } from "ascii.rest/terminal";`, ``, `await banner(${JSON.stringify(clean(text, look.font))}${o ? `, ${o}` : ""});`].join("\n");
}

/** The same on a page, in React or Next.js: each option a prop, a string as a string and anything else in braces. */
export function reactBanner(text: string, look: Look = PLAIN, ink?: Ink) {
  const props = options(look, ink).map(([k, v]) => (v.startsWith('"') ? `${k}=${v}` : `${k}={${v}}`));
  return [`import { Banner } from "ascii.rest/react";`, ``, `<Banner text=${JSON.stringify(clean(text, look.font))}${props.length ? ` ${props.join(" ")}` : ""} />`].join("\n");
}

/** The same SVG from your own code, with every option bannerSvg() takes. */
export function svgBanner(text: string, look: Look = PLAIN) {
  const camel = (slug: string) => slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  const extra: [string, string | false][] = [
    ["color", look.color === "art" && `"art"`],
    ["tagline", Boolean(look.tagline) && JSON.stringify(look.tagline)],
    ["art", Boolean(look.art) && camel(look.art)],
    ["place", Boolean(look.art) && look.place !== PLAIN.place && JSON.stringify(look.place)],
    ["background", Boolean(look.bg) && JSON.stringify(look.bg)],
    ["scale", look.size !== PLAIN.size && String(SCALE[look.size])],
    ["fps", FPS[look.speed] !== 15 && String(FPS[look.speed])],
  ];
  const o = object([...options(look), ...extra.filter((e): e is [string, string] => e[1] !== false)]);
  const art = look.art ? `import { ${camel(look.art)} } from "ascii.rest/pieces";\n` : "";
  return [`import { bannerSvg } from "ascii.rest/svg";`, art.trimEnd(), ``, `const light = bannerSvg(${JSON.stringify(clean(text, look.font))}${o ? `, ${o}` : ""});`, `const dark = bannerSvg(${JSON.stringify(clean(text, look.font))}, { ${o ? `${o.slice(2, -2)}, ` : ""}dark: true });`]
    .filter((l, i) => i !== 1 || l)
    .join("\n");
}

/**
 * The banner for a text, light or dark, as SVG; null when the font draws none of the text. `art` is the README SVG of
 * the logo, company or distro the look names, in the same theme.
 */
export function banner(text: string, { dark = false, look = PLAIN, art = null }: { dark?: boolean; look?: Look; art?: string | null } = {}) {
  const words = clean(text, look.font);
  if (!words) return null;
  const svg = bannerSvg(words, {
    dark,
    font: look.font,
    shadow: look.shadow,
    fill: look.fill === PLAIN.fill ? undefined : FILLS[look.fill],
    effect: look.effect,
    speed: SPEEDS[look.speed],
    color: look.color === "art" ? (art ? "art" : undefined) : (look.color ?? undefined),
    tagline: look.tagline,
    art: look.art && art ? { svg: art } : null,
    place: look.place,
    background: look.bg ?? undefined,
    scale: SCALE[look.size],
    fps: FPS[look.speed],
  });
  return { svg, text: words };
}
