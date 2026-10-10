/*
 * world: a map of the world with pins on it, the routes between them and a
 * key under it. Where the servers are, where the users are, where you are.
 * The land is the earth piece's own five degree map, drawn in quadrant blocks
 * so the projection keeps its shape; a pin is an airport's code or a latitude
 * and longitude; a route follows the great circle a flight takes.
 * Part of ascii.rest by @bas3line (https://github.com/bas3line), MIT licensed.
 *
 *   ```ascii world title=regions here=sfo
 *   sfo "us west"
 *   iad "us east"
 *   fra "eu central"
 *   sin "asia"
 *   ```
 *
 *   world('sfo "us west"\nfra "eu central"\nroute sfo fra', { here: "sfo" })
 *   world({ places: [{ code: "sfo", label: "us west" }, { lat: 52.52, lon: 13.4, label: "berlin" }] })
 */
import { fail, fnv1a32, hash, mulberry32, suggest } from "../kit/core.ts";
import { ACCENT, INK, MARK, QUIET, SOFT, clean, component, progress, show, statements, type Common, type MarkdownPiece } from "./core.ts";

/** A place on the map: an airport's code from AIRPORTS, or a latitude and longitude, and the words the key gives it. */
export interface WorldPlace {
  /** A three letter airport code from AIRPORTS, "sfo"; or none, with lat and lon. */
  code?: string;
  /** Degrees north, -90 to 90, with lon, for a place that has no code. */
  lat?: number;
  /** Degrees east, -180 to 180, with lat. */
  lon?: number;
  /** Words for it in the key: "us west". None by default. */
  label?: string;
}

/** A map as data: what a fence's body says, for places already in JavaScript. */
export interface WorldData {
  /** The places, in the order the key numbers them: 24 at most. */
  places: readonly WorldPlace[];
  /** Routes between two of the places, each named by its code or its label: [["sfo", "fra"]]. None by default. */
  routes?: readonly (readonly [string, string])[];
}

export interface WorldOptions extends Common {
  /**
   * The place you are at, by its code or its label: drawn ● on the map and in the key, beaconing while the map is in
   * view, the other pins numbered from 1. None by default.
   */
  here?: string;
}

/**
 * The airports a fence may name by their IATA code, with their latitude and longitude in degrees: the busy ones of
 * every continent, from OurAirports' data. A place that is not here is written as a latitude and longitude.
 */
export const AIRPORTS: Readonly<Record<string, readonly [number, number]>> = {
  // north america
  sfo: [37.62, -122.37], lax: [33.94, -118.41], sea: [47.45, -122.31], yvr: [49.19, -123.18], den: [39.86, -104.67],
  dfw: [32.9, -97.04], iah: [29.98, -95.34], ord: [41.98, -87.9], atl: [33.64, -84.43], mia: [25.8, -80.29],
  iad: [38.94, -77.46], jfk: [40.64, -73.78], bos: [42.36, -71.01], yyz: [43.68, -79.63], yul: [45.47, -73.74],
  mex: [19.44, -99.07], phx: [33.44, -112.01], las: [36.08, -115.15], msp: [44.88, -93.22], anc: [61.18, -149.99],
  hnl: [21.32, -157.93],
  // south america
  gru: [-23.43, -46.47], gig: [-22.81, -43.25], eze: [-34.82, -58.54], scl: [-33.39, -70.79], lim: [-12.02, -77.11],
  bog: [4.7, -74.15],
  // europe
  lhr: [51.47, -0.46], cdg: [49.01, 2.55], ams: [52.31, 4.76], fra: [50.03, 8.56], muc: [48.35, 11.79],
  mad: [40.49, -3.57], bcn: [41.3, 2.08], fco: [41.8, 12.25], zrh: [47.46, 8.55], vie: [48.11, 16.57],
  cph: [55.62, 12.66], arn: [59.65, 17.93], osl: [60.19, 11.1], hel: [60.32, 24.96], dub: [53.43, -6.26],
  lis: [38.78, -9.14], waw: [52.17, 20.97], ist: [41.27, 28.73], kef: [63.99, -22.61], svo: [55.98, 37.39],
  // the middle east and africa
  dxb: [25.25, 55.37], doh: [25.27, 51.61], tlv: [32.01, 34.89], cai: [30.11, 31.4], jnb: [-26.14, 28.25],
  cpt: [-33.97, 18.6], los: [6.58, 3.32], nbo: [-1.32, 36.93], add: [8.98, 38.8], cmn: [33.37, -7.59],
  // asia
  bom: [19.09, 72.87], del: [28.56, 77.1], blr: [13.2, 77.71], sin: [1.35, 103.99], hkg: [22.31, 113.91],
  pek: [40.08, 116.6], pvg: [31.14, 121.81], icn: [37.47, 126.45], nrt: [35.77, 140.39], hnd: [35.55, 139.79],
  kix: [34.43, 135.24], tpe: [25.08, 121.23], bkk: [13.68, 100.75], kul: [2.75, 101.71], cgk: [-6.13, 106.66],
  mnl: [14.51, 121.02], sgn: [10.82, 106.65],
  // oceania
  syd: [-33.95, 151.18], mel: [-37.67, 144.84], bne: [-27.38, 153.12], per: [-31.94, 115.97], akl: [-37.01, 174.79],
};
const CODES = Object.keys(AIRPORTS);

// The earth piece's map of the world, five degrees a cell: equirectangular, 180 W at the left, the north pole at the
// top; # is land.
const MAP = [
  "                                                                        ",
  "                     ##   ######                                        ",
  "             ###################       #                #               ",
  "           ###########   #######                  ###########           ",
  "#  ##############   ###  #####         #################################",
  "   ##############    ##   ##    #    ### ############################## ",
  "    #    #########  ####           # ## ########################   ##   ",
  "          ###############         ## ###########################        ",
  "           #############           #############################        ",
  "           ###########            ### ####  ## ###############  #       ",
  "           ##########             ##     ################### #          ",
  "            ########              ##### #  #################  #         ",
  "             ####  #             ###########################            ",
  "               ##                ###############  #########             ",
  "                ###              ##############    ##  ###  #           ",
  "                  ##             #############     #    ##  #           ",
  "                    #####         ############          #   #           ",
  "                    ######            #######          ## ##            ",
  "                    ########          ######            # ### ##        ",
  "                    #########         ######             ##    ###      ",
  "                     ########          #####                  #         ",
  "                      ######          ###### #               ####       ",
  "                      ######           ####  #             #######      ",
  "                      ####             ####                ########     ",
  "                     ####              ###                 #######      ",
  "                     ###                                        ##      ",
  "                     ##                                               # ",
  "                     ##                                                 ",
  "                     #                                                  ",
  "                                                                        ",
  "                                                                        ",
  "                       #                       ##################       ",
  "                    ####        ######################################  ",
  "  ####################################################################  ",
  "########################################################################",
  "########################################################################",
];
const MW = 72, MH = 36;

// A cell's quadrant block by which of its four quarters are land: top left 1, top right 2, bottom left 4, bottom right 8.
const QUADS = " ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";

// The map's size: 44 columns by default, 48 with the frame, and a row for every 4 columns, as a cell is twice as tall
// as it is wide and the map twice as wide as it is tall.
const COLS = 44, LEAST = 24;
// The most places and routes a map takes: past these the key outgrows the map and the pins crowd.
const MOST = 24, ROUTES = 12;
// The marks of the pins that are not `here`, in order.
const MARKS = "123456789abcdefghijklmnop";

// The build: the land resolves out of static from the west (LAND), then each pin drops with a ring closing on it
// (PIN), then each route draws from its first place to its second (ROUTE), in at most 3 seconds. Then a cycle of
// TRIP seconds: the `here` pin beacons and a dot flies each route.
const LAND = 0.6, FRONT = 0.22, PIN = 0.2, PINS = 1.6, ROUTE = 0.35, ROUTING = 0.8, TRIP = 2;
// A route's path, sampled evenly along its great circle; a flying dot travels it in the first FLY of a trip and
// waits under the pin it reached for the rest.
const STEPS = 240, FLY = 0.85;

// A place, read: where it is, its mark, and its words for the key.
interface Place {
  code?: string;
  lat: number;
  lon: number;
  label?: string;
  // what the key calls it: its code, or its latitude and longitude rounded, "52n 13e"
  name: string;
}

// --- reading --------------------------------------------------------------------------------

// A latitude or longitude as written: 52.52, -122.4, or with its hemisphere, 52.52n, 122.4w.
function degreesOf(word: string, axis: "lat" | "lon", where: string): number {
  const m = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))([nsew])?$/i.exec(word);
  const span = axis === "lat" ? 90 : 180;
  const hemi = axis === "lat" ? "n or s" : "e or w";
  if (!m) fail(`${where} has ${show(word)} for a ${axis === "lat" ? "latitude" : "longitude"}: write degrees, as ${axis === "lat" ? "52.52 or 33.9s" : "13.40 or 122.4w"}`);
  let v = parseFloat(m[1]);
  const h = m[2]?.toLowerCase();
  if (h) {
    if (!(axis === "lat" ? "ns" : "ew").includes(h)) fail(`${where} has ${show(word)} for a ${axis === "lat" ? "latitude, whose hemisphere is" : "longitude, whose hemisphere is"} ${hemi}`);
    if (v < 0) fail(`${where} has ${show(word)}: a degree with a hemisphere is written without a sign`);
    if (h === "s" || h === "w") v = -v;
  }
  if (!(Math.abs(v) <= span)) fail(`${where} has ${show(word)} for a ${axis === "lat" ? "latitude" : "longitude"}, past ${span} degrees: it takes -${span} to ${span}`);
  return v;
}

// The fence's body: a place a line, an airport's code or a latitude and longitude, then its label in quotes; and
// route lines, `route sfo fra`.
function parse(source: string): WorldData {
  const places: WorldPlace[] = [];
  const routes: [string, string][] = [];
  for (const s of statements(source, "world")) {
    const where = `world's line ${s.line}`;
    const key = Object.keys(s.attrs)[0];
    if (key !== undefined) fail(`${where} has ${key}=${show(s.attrs[key])}: its options go on the fence, as \`\`\`ascii world ${key}=${s.attrs[key] && s.attrs[key].length <= 40 ? s.attrs[key] : "..."}`);
    if (s.words[0]?.toLowerCase() === "route") {
      const names = s.tokens.slice(1).map((t) => ("word" in t ? t.word : "text" in t ? t.text : ""));
      if (names.length !== 2) fail(`${where} routes ${names.length === 1 ? "from one place" : names.length ? `${names.length} places` : "nowhere"}: a route joins two places, as route sfo fra`);
      routes.push([names[0], names[1]]);
      continue;
    }
    if (s.texts.length > 1) fail(`${where} has ${s.texts.length} quoted labels, ${s.texts.map((t) => show(t)).join(" and ")}: a place has one, as sfo "us west"`);
    const label = s.texts[0];
    const { words } = s;
    if (!words.length) fail(`${where} has no place: start it with an airport's code, as sfo ${show(label ?? "us west")}, or a latitude and longitude, as 52.52 13.40 "berlin"`);
    const numeric = (w: string) => /^[+-]?(\d|\.\d)/.test(w);
    if (words.length === 1) {
      if (numeric(words[0])) fail(`${where} has a latitude, ${words[0]}, and no longitude: write both, as 52.52 13.40`);
      places.push({ code: words[0], ...(label !== undefined ? { label } : {}) });
    } else if (words.length === 2 && (numeric(words[0]) || numeric(words[1]))) {
      places.push({ lat: degreesOf(words[0], "lat", where), lon: degreesOf(words[1], "lon", where), ...(label !== undefined ? { label } : {}) });
    } else fail(`${where} names ${words.length} places, ${words.map((w) => show(w)).join(", ")}: a line holds one place, then its label in quotes`);
  }
  return { places, ...(routes.length ? { routes } : {}) };
}

// Data, checked: every place found or in range, labels cleaned, routes between places named.
function check(data: WorldData): { places: Place[]; routes: [number, number][] } {
  if (!data || typeof data !== "object" || !Array.isArray(data.places))
    fail(`world() takes a fence's body, such as sfo "us west", or { places, routes }, not ${show(data)}`);
  if (data.places.length > MOST) fail(`world takes ${MOST} places at most, and has ${data.places.length}: split them over two maps`);
  const places: Place[] = data.places.map((p, i) => {
    const what = `world's place ${i + 1}`;
    if (!p || typeof p !== "object") fail(`${what} takes { code, label } or { lat, lon, label }, not ${show(p)}`);
    if (p.label !== undefined && typeof p.label !== "string") fail(`${what}'s label takes words, not ${show(p.label)}`);
    const label = p.label === undefined ? undefined : clean(p.label, `${what}'s label`).replace(/\s+/g, " ").trim() || undefined;
    if (p.code !== undefined) {
      if (typeof p.code !== "string") fail(`${what}'s code takes an airport's three letters, such as "sfo", not ${show(p.code)}`);
      const code = p.code.toLowerCase();
      if (!Object.hasOwn(AIRPORTS, code))
        fail(`world has no airport ${show(p.code)}${suggest(code, CODES)}: it knows ${CODES.length}, as sfo, iad, fra and sin, and takes a latitude and longitude for any other place, as 52.52 13.40 "berlin"`);
      if (p.lat !== undefined || p.lon !== undefined) fail(`${what} has a code and a latitude or longitude: give one or the other`);
      const [lat, lon] = AIRPORTS[code];
      return { code, lat, lon, name: code, ...(label ? { label } : {}) };
    }
    const { lat, lon } = p;
    if (typeof lat !== "number" || !Number.isFinite(lat) || Math.abs(lat) > 90) fail(`${what}'s lat takes degrees north from -90 to 90, not ${show(lat)}`);
    if (typeof lon !== "number" || !Number.isFinite(lon) || Math.abs(lon) > 180) fail(`${what}'s lon takes degrees east from -180 to 180, not ${show(lon)}`);
    const name = `${Math.round(Math.abs(lat))}${lat < 0 ? "s" : "n"} ${Math.round(Math.abs(lon))}${lon < 0 ? "w" : "e"}`;
    return { lat, lon, name, ...(label ? { label } : {}) };
  });
  const seen = new Map<string, number>();
  places.forEach((p, i) => {
    if (p.code === undefined) return;
    if (seen.has(p.code)) fail(`world has ${p.code} twice, as places ${seen.get(p.code)! + 1} and ${i + 1}: a place is on one line`);
    seen.set(p.code, i);
  });
  const routes = data.routes ?? [];
  if (!Array.isArray(routes)) fail(`world's routes take pairs of places, as [["sfo", "fra"]], not ${show(routes)}`);
  if (routes.length > ROUTES) fail(`world takes ${ROUTES} routes at most, and has ${routes.length}`);
  return {
    places,
    routes: routes.map((r, i) => {
      if (!Array.isArray(r) || r.length !== 2 || typeof r[0] !== "string" || typeof r[1] !== "string")
        fail(`world's route ${i + 1} takes two places by their code or label, as ["sfo", "fra"], not ${show(r)}`);
      const [a, b] = [r[0], r[1]].map((name) => placeOf(places, name, `world's route ${i + 1}`));
      if (a === b) fail(`world's route ${i + 1} goes from ${places[a].name} to itself: a route joins two places`);
      return [a, b] as [number, number];
    }),
  };
}

// A place by its code or its label, ignoring case.
function placeOf(places: readonly Place[], name: string, what: string): number {
  const n = clean(name, what).trim().toLowerCase();
  const i = places.findIndex((p) => p.code === n || p.label?.toLowerCase() === n);
  if (i < 0) {
    const names = places.map((p) => p.code ?? p.label ?? p.name);
    fail(`${what} names ${show(name)}${suggest(n, names)}, and no line puts it on the map: ${names.length ? `there are ${names.join(", ")}` : "there are no places"}; name one by its code or its label`);
  }
  return i;
}

// --- the map ---------------------------------------------------------------------------------

// Whether a point is land: the map's own cell, or, drawn larger than the map is fine, blended between its cells so a
// coast runs smooth rather than in 5 degree steps.
function landAt(lon: number, lat: number, blend: boolean): boolean {
  const u = (lon + 180) / 5, v = (90 - lat) / 5;
  if (!blend) return MAP[Math.min(MH - 1, Math.max(0, Math.floor(v)))][Math.min(MW - 1, Math.max(0, Math.floor(u)))] === "#";
  const x = u - 0.5, y = Math.min(MH - 1, Math.max(0, v - 0.5));
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, y1 = Math.min(MH - 1, y0 + 1);
  const a = ((x0 % MW) + MW) % MW, b = (a + 1) % MW;
  const at = (r: number, c: number) => (MAP[r][c] === "#" ? 1 : 0);
  return (at(y0, a) * (1 - fx) + at(y0, b) * fx) * (1 - fy) + (at(y1, a) * (1 - fx) + at(y1, b) * fx) * fy >= 0.5;
}

// The land in quadrant blocks, cols by rows, each block four points of the map.
function landOf(cols: number, rows: number): string[] {
  // A block at 44 columns is about the map's own 5 degrees, so it reads the map's cell; larger, it blends.
  const blend = cols > 45;
  const out: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < cols; x++) {
      let bits = 0;
      for (const [i, j, bit] of [[0, 0, 1], [1, 0, 2], [0, 1, 4], [1, 1, 8]] as const) {
        const lon = -180 + ((2 * x + i + 0.5) * 360) / (2 * cols), lat = 90 - ((2 * y + j + 0.5) * 180) / (2 * rows);
        if (landAt(lon, lat, blend)) bits |= bit;
      }
      line += QUADS[bits];
    }
    out.push(line);
  }
  return out;
}

// A point of the globe as a unit vector, and back.
const vec = (lat: number, lon: number): [number, number, number] => {
  const p = (lat * Math.PI) / 180, l = (lon * Math.PI) / 180;
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
};
const latLon = ([x, y, z]: readonly number[]): [number, number] => [(Math.asin(Math.max(-1, Math.min(1, z))) * 180) / Math.PI, (Math.atan2(y, x) * 180) / Math.PI];

// The great circle from a to b, the way a flight goes, as STEPS + 1 points evenly along it. Two points at opposite
// ends of the earth have every great circle between them; this takes the one over the pole nearer a.
function greatCircle(a: Place, b: Place): [number, number][] {
  const p = vec(a.lat, a.lon), q = vec(b.lat, b.lon);
  const dot = Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]));
  const omega = Math.acos(dot);
  // the plane's other axis: q's part that is not p, or, for opposite points, a way off p toward the pole
  let r = [q[0] - dot * p[0], q[1] - dot * p[1], q[2] - dot * p[2]];
  let n = Math.hypot(r[0], r[1], r[2]);
  if (n < 1e-9) {
    const pole = [0, 0, p[2] >= 0 ? 1 : -1];
    const d = pole[2] * p[2];
    r = [pole[0] - d * p[0], pole[1] - d * p[1], pole[2] - d * p[2]];
    n = Math.hypot(r[0], r[1], r[2]);
    if (n < 1e-9) (r = [1, 0, 0]), (n = 1);
  }
  r = r.map((v) => v / n);
  const out: [number, number][] = [];
  for (let i = 0; i <= STEPS; i++) {
    const w = (omega * i) / STEPS, c = Math.cos(w), s = Math.sin(w);
    out.push(latLon([c * p[0] + s * r[0], c * p[1] + s * r[1], c * p[2] + s * r[2]]));
  }
  return out;
}

// --- the figure ------------------------------------------------------------------------------

/**
 * A map of the world with pins, routes and a key, from a fence's body, a place a line: an airport's code from
 * AIRPORTS or a latitude and longitude, then its label in quotes, and `route sfo fra` lines; or { places, routes }.
 * The land is the earth piece's map in quadrant blocks, 44 by 11 (a `width` scales it); a route follows its great
 * circle, dotted over the sea so the land stays readable; `here` names where you are. The land resolves out of static
 * from the west, the pins drop in with a ring closing on each and the routes draw; then, with `here` or a route, the
 * here pin beacons and a dot flies each route every 2 seconds while the map is in view. Its still is the finished map.
 *
 *   world('sfo "us west"\niad "us east"\nfra "eu central"\nsin "asia"', { title: "regions", here: "sfo" })
 *   world({ places: [{ code: "lhr" }, { code: "jfk" }], routes: [["lhr", "jfk"]] }, { width: 80 })
 */
export function world(source: string | WorldData, options?: WorldOptions): MarkdownPiece {
  const data = check(typeof source === "string" ? parse(source) : source);
  return component("world", options, ["here"], (o, room) => {
    const { places, routes } = data;
    const extra = o.width === undefined ? 0 : o.width - room.cols!;
    if (room.cols !== undefined && room.cols < LEAST) fail(`world needs a width of ${LEAST + extra} or more for its map, and its width is ${o.width}`);
    const C = room.cols ?? COLS, R = Math.round(C / 4);
    let here = -1;
    if (o.here !== undefined) {
      if (typeof o.here !== "string" && typeof o.here !== "number") fail(`world's here takes a place by its code or label, such as "sfo", not ${show(o.here)}`);
      here = placeOf(places, String(o.here), "world's here");
    }

    // the land, and which cells are sea
    const land = landOf(C, R);
    const sea = (x: number, y: number) => land[y][x] === " ";
    // when each cell resolves out of the static: from the west, a little ragged
    const rand = mulberry32(fnv1a32("world"));
    const resolve = Array.from({ length: R }, () => Array.from({ length: C }, () => 0));
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) resolve[y][x] = LAND * (0.62 * (C > 1 ? x / (C - 1) : 0) + 0.38 * rand());

    // A point's cell, and where in it the point is, in cells.
    const cellOf = (lat: number, lon: number) => {
      const u = ((lon + 180) / 360) * C, v = ((90 - lat) / 180) * R;
      return { u, v, x: Math.min(C - 1, Math.floor(u)), y: Math.min(R - 1, Math.floor(v)) };
    };
    // The pins: each on its own cell, a pin whose cell is taken on the free cell nearest where it is (a cell is
    // twice as tall as it is wide, so a row away is twice as far as a column).
    const taken = new Set<number>();
    const per = places.length ? Math.min(PIN, PINS / places.length) : 0;
    let n = 0;
    const pins = places.map((p, i) => {
      const { u, v, x, y } = cellOf(p.lat, p.lon);
      let best = { x, y, d: Infinity };
      if (taken.has(y * C + x))
        for (let yy = Math.max(0, y - 4); yy <= Math.min(R - 1, y + 4); yy++)
          for (let xx = Math.max(0, x - 8); xx <= Math.min(C - 1, x + 8); xx++) {
            if (taken.has(yy * C + xx)) continue;
            const d = (xx + 0.5 - u) ** 2 + (2 * (yy + 0.5 - v)) ** 2;
            if (d < best.d) best = { x: xx, y: yy, d };
          }
      taken.add(best.y * C + best.x);
      const mark = i === here ? "●" : MARKS[n++];
      return { x: best.x, y: best.y, mark, tone: i === here ? MARK : ACCENT, lands: LAND + per * (i + 1) };
    });
    const pinned = (x: number, y: number) => taken.has(y * C + x);
    const pinsEnd = LAND + per * places.length;

    // The routes: their great circles as cells, the dots over the sea in the order the route reaches them.
    const each = routes.length ? Math.min(ROUTE, ROUTING / routes.length) : 0;
    const paths = routes.map(([a, b], i) => {
      const cells = greatCircle(places[a], places[b]).map(([lat, lon]) => {
        const c = cellOf(lat, lon);
        return [c.x, c.y] as const;
      });
      const dots: { x: number; y: number; k: number }[] = [];
      const dotted = new Set<number>();
      cells.forEach(([x, y], k) => {
        if (dotted.has(y * C + x) || !sea(x, y) || pinned(x, y)) return;
        dotted.add(y * C + x);
        dots.push({ x, y, k: k / STEPS });
      });
      return { cells, dots, from: pinsEnd + each * i };
    });
    const intro = Math.round((pinsEnd + each * routes.length) * 1000) / 1000;
    const moving = here >= 0 || routes.length > 0;

    // The key: each place's mark, name and label, in one column, or two when there are many and they fit.
    const nameWidth = Math.max(0, ...places.map((p) => p.name.length));
    const lines = places.map((p, i) => ({ mark: pins[i].mark, tone: pins[i].tone, name: p.name.padEnd(nameWidth), label: p.label ?? "" }));
    const lengthOf = (l: (typeof lines)[number]) => 2 + l.name.length + (l.label ? 2 + l.label.length : 0);
    const half = Math.floor((C - 3) / 2);
    const two = lines.length > 6 && lines.every((l) => lengthOf(l) <= half);
    const down = two ? Math.ceil(lines.length / 2) : lines.length;
    const keyAt = lines.map((_, i) => ({ x: i >= down ? half + 3 : 0, y: R + 1 + (i % down) }));
    const room2 = two ? half : C;

    const said = places.map((p, i) => `${p.name}${p.label ? `, ${p.label}` : ""}${i === here ? ", here" : ""}`);
    const routeSaid = routes.map(([a, b]) => `${places[a].name} to ${places[b].name}`);
    const says = places.length
      ? `world, ${places.length} ${places.length === 1 ? "place" : "places"}: ${said.join("; ")}${routes.length ? `; ${routes.length === 1 ? "a route" : "routes"} ${routeSaid.join(", ")}` : ""}.`
      : "world: a map of the world.";

    return {
      cols: C,
      rows: R + (lines.length ? 1 + down : 0),
      intro,
      ...(moving ? { cycle: TRIP } : {}),
      says,
      draw(s, t, at) {
        // the build's time: past the intro, everything is built, whatever rounding the times took
        const b = t >= intro ? Infinity : t;
        const step = Math.floor(t * 20);
        // the land, resolving out of static from the west
        for (let y = 0; y < R; y++)
          for (let x = 0; x < C; x++) {
            const r = resolve[y][x];
            if (b >= r) {
              if (land[y][x] !== " ") s.set(at.x + x, at.y + y, land[y][x], QUIET);
            } else if (b >= r - FRONT && hash(x, y, step, 7) < 0.55) s.set(at.x + x, at.y + y, QUADS[1 + Math.floor(hash(x, y, step, 11) * 15)], SOFT);
          }
        // the routes, dotted over the sea from their first place to their second
        for (const p of paths) {
          const k = progress(b, p.from, p.from + each);
          for (const d of p.dots) if (d.k <= k && k > 0) s.set(at.x + d.x, at.y + d.y, "·", SOFT);
        }
        // the cycle: where the trips are, and the beacon
        const phase = at.still || t < intro ? -1 : (((t - intro) % TRIP) + TRIP) % TRIP;
        const f = phase < 0 || phase > TRIP - 1e-6 ? -1 : phase / TRIP;
        if (f >= 0 && f < FLY)
          for (const p of paths) {
            // the dot flies the great circle, a • behind it, both under the pins they pass
            const i = Math.round((f / FLY) * STEPS);
            const [x, y] = p.cells[i];
            const prev = p.cells.slice(0, i).reverse().find(([px, py]) => px !== x || py !== y);
            if (prev && !pinned(prev[0], prev[1])) s.set(at.x + prev[0], at.y + prev[1], "•", ACCENT);
            if (!pinned(x, y)) s.set(at.x + x, at.y + y, "●", ACCENT);
          }
        // the pins, each dropping with a ring closing on it
        pins.forEach((p, i) => {
          if (b >= p.lands) {
            // the here pin beacons: it draws in to • as a ring goes out from it, once a cycle
            let mark = p.mark;
            if (i === here && f >= 0) {
              const ring = f < 0.04 ? 0 : f < 0.12 ? 1 : f < 0.2 ? 2 : f < 0.28 ? 3 : 0;
              if (f >= 0.04 && f < 0.2) mark = "•";
              if (ring) {
                for (const [dx, ch] of [[-ring, "("], [ring, ")"]] as const) {
                  const x = p.x + dx;
                  if (x >= 0 && x < C && !pinned(x, p.y)) s.set(at.x + x, at.y + p.y, ch, ring === 3 ? SOFT : ACCENT);
                }
              }
            }
            s.set(at.x + p.x, at.y + p.y, mark, p.tone);
          } else if (b >= p.lands - per) {
            const ring = b < p.lands - per / 2 ? 2 : 1;
            for (const [dx, ch] of [[-ring, "("], [ring, ")"]] as const) {
              const x = p.x + dx;
              if (x >= 0 && x < C && !pinned(x, p.y)) s.set(at.x + x, at.y + p.y, ch, ACCENT);
            }
          }
        });
        // the key, each line typing as its pin drops
        lines.forEach((l, i) => {
          const from = pins[i].lands - per;
          if (b < from) return;
          const full = `${l.mark} ${l.name}${l.label ? `  ${l.label}` : ""}`;
          const fits = full.length > room2 ? `${full.slice(0, Math.max(0, room2 - 3))}...` : full;
          const typed = b >= pins[i].lands ? fits.length : Math.max(1, Math.ceil(fits.length * progress(b, from, pins[i].lands)));
          const { x, y } = keyAt[i];
          const tones = [l.tone, INK, ...Array.from({ length: l.name.length }, () => SOFT)];
          for (let c = 0; c < typed; c++) s.set(at.x + x + c, at.y + y, fits[c], c < tones.length ? tones[c] : INK);
        });
      },
    };
  });
}
