/*
 * edge orbit: the night side of the Earth from low orbit, and the Cloudflare
 * network running over it. The curved limb fills the lower part of the frame
 * under a rim of air that burns Cloudflare orange where the sun is breaking
 * over the horizon on the right. Europe, Africa, the Middle East and India lie
 * below, dotted with the warm lights of their cities, and a few bright
 * requests arc between the bigger ones: each launches in a spark, flies over
 * the surface in orange, and lands in tangerine with a ring spreading out on
 * the ground. The globe turns once every 24 minutes, which is also the loop.
 *
 * Each frame is shaded in colour cell by cell on a square grid, then drawn as
 * a halftone: every cell is a dot whose size is its brightness, ordered-
 * dithered so gradients read as texture, in the palette colour nearest its hue.
 * The requests keep the brand's own two colours exactly.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "edge orbit",
  category: "scenes",
  note: "the night earth from orbit, cloudflare requests arcing city to city",
  cols: 200,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#04060c",
  palette: [
    "#080c18", "#0d1529", "#152142", "#1e2f5c", "#2b4479", "#40609c", "#7d9cd2", "#b8cdee",
    "#181d27", "#252b37", "#404041", "#5c6578",
    "#2e1608", "#4f2410", "#7a3812", "#a94f16", "#d0661a",
    "#f38020", "#faae40",
    "#3d2a0e", "#6b4a16", "#a57524", "#d49434",
    "#ffd68a", "#ffe8c0", "#fff6e8", "#ffffff",
  ],
} satisfies Meta;

const W = 200, H = 100;
const CX = 100, CY = 244, R = 196; // the globe on screen, its centre far below the frame
const DAY = 1440; // seconds for one turn of the globe, and so the loop
const SLOTS = 14, PD = 6, NC = DAY / PD; // request slots, each relaunching every PD seconds
const LON_C = 36; // the longitude under the middle of the frame at t = 0
const LAT0 = -40, LAT1 = 85, TS = 4; // the maps cover these latitudes, TS texels a degree
const TW = 360 * TS, TH = (LAT1 - LAT0) * TS;
const DEG = Math.PI / 180;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1]; // how much each dot fills, against the largest
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

// The globe's frame in view space (x right, y up, z toward us): the north pole
// tipped 30 degrees away beyond the horizon, the equator's near point, and east.
const TILT = 30 * DEG;
const P = [0, Math.cos(TILT), -Math.sin(TILT)];
const G = [0, Math.sin(TILT), Math.cos(TILT)];

// The sun, just breaking over the limb near the right edge.
const SUN_A = 63 * DEG;
const SUN = [CX + R * Math.cos(SUN_A), CY - R * Math.sin(SUN_A)];

// The brand's colours, as light.
const ORANGE = [0xf3 / 255, 0x80 / 255, 0x20 / 255];
const TANGERINE = [0xfa / 255, 0xae / 255, 0x40 / 255];

// Coastlines as rough [lon, lat] rings, filled even-odd. Plausible, not survey.
const LAND: number[][] = [
  // Africa
  [-17, 21, -16, 28, -10, 30, -6, 35.8, 10, 37, 11, 33.5, 15, 32, 20, 30.5, 25, 31.6, 32, 31.3, 34.3, 31.3, 34.5, 29.5, 33.5, 27.8, 37, 22, 39, 15.5, 43, 12.5, 51, 11.8, 48, 5, 40, -3, 39, -10, 40, -16, 35, -24, 32, -29, 27, -34, 19, -35, 18, -30, 12, -17, 13, -6, 9, -1, 9, 4, 5, 4.5, -2, 4.8, -8, 4.5, -13, 8, -16, 12, -17, 15],
  // Eurasia, round the Mediterranean, Arabia, India and the Thai gulf
  [-5.6, 36, -2, 36.7, 0, 38.5, 0.5, 40.5, 3, 42, 3, 43.3, 6, 43, 9, 44.3, 10.5, 43, 12, 41.8, 14, 40.7, 15.7, 38, 17, 39, 18.5, 40.1, 17, 41, 16, 41.9, 14, 42.8, 12.3, 44.5, 13.5, 45.7, 15, 44.5, 17, 43, 19, 41.8, 19.5, 40, 21, 38.5, 22, 37, 23, 38, 24, 38, 23, 39.5, 23.5, 40.5, 26, 40.8, 26.5, 40, 27, 38, 27.5, 37, 29, 36.6, 32, 36.2, 36, 36.7, 35.9, 35, 35, 33, 34.3, 31.3, 35, 28.5, 39, 21.5, 42.5, 16, 43.4, 12.7, 45, 13, 52, 16, 57, 19, 59.5, 22.5, 56.5, 24, 56, 26.2, 54, 24, 51.5, 24.5, 51, 26, 50, 26.5, 48, 29.5, 50, 30, 52, 27.5, 56.5, 27, 57, 25.7, 61, 25.3, 67, 24.8, 69, 22.5, 73, 21, 73, 17, 76, 11, 77, 8, 80, 10, 80, 15.5, 87, 21, 89, 22, 92, 22, 94, 17, 98, 16, 98, 8, 101, 3, 103, 1.5, 104, 1.3, 103.5, 5, 102, 6, 100.3, 8, 99.3, 10.5, 100, 13.5, 102, 12.5, 104, 10.5, 105, 9, 109, 12, 106, 19, 108, 21.5, 110, 21, 115, 22.5, 120, 25, 122, 30, 120, 32, 122, 37, 118, 39, 122, 40, 126, 38, 126, 35, 129, 35, 129.5, 37, 129, 41, 135, 43, 140, 48, 141, 52, 135, 54, 143, 59, 156, 57, 156, 51, 163, 58, 170, 60, 180, 65, 180, 68, 160, 70, 140, 72, 130, 71, 110, 74, 100, 76, 80, 73, 70, 73, 60, 69, 55, 68.5, 44, 68, 40, 66, 33, 66, 35, 69, 30, 70, 25, 71, 15, 68, 10, 63, 5, 61, 5.5, 58.5, 7, 58, 10.5, 59, 11.5, 58, 12.8, 55.4, 14, 55.5, 16.5, 56.5, 18.5, 59.5, 17.5, 61, 18, 62.5, 21, 64.5, 22.5, 65.8, 25, 65.5, 21.5, 63, 22, 60.5, 23, 60, 30, 60.5, 28, 59.5, 24, 59.4, 23.5, 58.5, 24, 57.5, 21, 57, 21, 55.5, 19, 54.5, 14, 54, 12, 54.2, 10, 54.5, 10.5, 57.5, 8.5, 57, 8, 54, 4, 51.5, 2, 51, -1, 49.5, -4.5, 48.5, -1.5, 46, -2, 43.5, -9, 43, -9, 37],
  // Britain, Ireland, Iceland
  [-5.5, 50, -3, 50.5, 1.5, 51, 1.7, 52.8, 0, 53.5, -0.5, 54.5, -1.5, 55.5, -2, 57, -1.8, 57.6, -4, 58.6, -5, 58.6, -6, 57.5, -5.5, 56, -4.8, 55, -3, 54.3, -3, 53.3, -4.6, 53.2, -4.2, 52.2, -5.2, 51.7, -3, 51.4, -5.6, 50.1],
  [-6, 52, -6.2, 53.5, -5.5, 54.5, -7.5, 55.3, -10, 54, -10, 52, -8, 51.5],
  [-24, 65.5, -22, 66.4, -16, 66.5, -13.5, 65, -18, 63.4, -22.5, 63.8],
  // Mediterranean islands, Sri Lanka
  [12.5, 38, 15.6, 38.3, 15, 36.7],
  [8.4, 39, 9.7, 39.2, 9.6, 41, 9.4, 43, 8.6, 42.6, 8.2, 40.8],
  [23.5, 35.2, 26.3, 35.1, 25.5, 35.4, 23.6, 35.6],
  [32.3, 34.7, 34.5, 35.6, 33, 35.4],
  [79.8, 6, 81.8, 7, 81, 9.5, 80, 9.8, 79.7, 8],
  // Japan, Taiwan, Luzon, Borneo, Sumatra, Java
  [130.9, 34, 132, 35.4, 136, 35.7, 137, 37, 140, 40, 140, 41.5, 142, 39.5, 141, 37, 140.8, 35.7, 139.8, 35, 138.7, 34.6, 136.8, 34.2, 135, 33.5, 132, 33.8],
  [129.6, 33.2, 131.8, 32, 131, 31, 130, 31.5],
  [140, 41.5, 141.6, 45.4, 145.6, 43.4, 143, 42, 141, 41.8],
  [120.3, 22.5, 121, 25.2, 122, 25, 120.8, 22],
  [120, 14.5, 120.6, 18.5, 122.2, 18.5, 122, 16, 124, 13, 121, 13.5],
  [109, 1.5, 110, -3, 116, -4, 119, 1, 117.5, 7, 116, 6.5, 111, 2],
  [95.3, 5.6, 98, 4, 104, -1.5, 106, -6, 104.5, -5.8, 101, -2.5, 97, 2],
  [105.5, -6, 114.5, -7, 114.5, -8.5, 106, -7.4],
  // North America, Baffin, Greenland, Cuba, Hispaniola
  [-168, 66, -162, 70, -156, 71.3, -140, 69.7, -128, 70, -117, 69, -108, 68, -95, 68, -85, 69.5, -80, 66, -75, 64, -65, 60.5, -61, 56, -56, 52, -59.5, 47.6, -64, 48.5, -65, 46.5, -61, 45.6, -66, 43.5, -70, 43.7, -70.5, 41.8, -74, 40.5, -76, 38, -76, 35, -81, 31.5, -80, 27, -80.5, 25.2, -81.8, 26.5, -83, 29.5, -85, 29.6, -89, 30.3, -90, 29, -94, 29.6, -97.3, 27.5, -97.5, 22, -96, 19, -94.5, 18.2, -91, 18.8, -90.5, 21, -87, 21.5, -88, 16, -84, 15.8, -83.5, 11, -81.5, 8.8, -79.5, 9.5, -77.5, 8.5, -77, 7.5, -78, 7, -80, 7.3, -80.5, 8.2, -83.5, 8.3, -85.7, 10, -87.5, 13, -91.5, 14, -94.5, 16, -96.5, 15.7, -101, 17.2, -105.5, 20, -105.7, 22.7, -109, 26, -112.8, 31.5, -114.8, 31.8, -114.5, 30, -112, 26.8, -110, 23, -112, 25, -114, 28, -115.7, 30.3, -117, 32.5, -120.5, 34.5, -122.5, 37.5, -124, 40.5, -124.5, 43, -124, 46.5, -124.7, 48.4, -123, 49, -127.5, 50.5, -130, 54.5, -133, 57.5, -137, 59, -141, 60, -146, 61, -151, 59.5, -154, 57.5, -158, 56, -163, 54.8, -158, 57.5, -157, 58.6, -162, 58.6, -166, 60.3, -165, 62.5, -164, 64.5],
  [-80, 73, -68, 70, -62, 66.5, -65, 63, -72, 62.5, -78, 64.5, -85, 70],
  [-73, 78, -60, 82, -30, 83, -20, 80, -18, 76, -22, 70, -32, 68, -40, 65, -43, 60, -48, 61, -52, 65, -54, 69, -58, 75.5, -66, 76.5],
  [-85, 21.8, -80, 23, -74, 20.2, -77.5, 19.8, -80, 21.6, -84, 21.8],
  [-74.4, 18.5, -68.4, 18.6, -69.5, 19.8, -72.5, 19.8],
  // South America, Australia
  [-77.5, 8.5, -76, 9.5, -72, 12, -70, 12.2, -68, 10.5, -62, 10.7, -60, 8.5, -57, 6, -52, 5, -50, 1.8, -48, -1, -44, -2.5, -35, -5.5, -35, -9, -39, -15, -41, -22, -48, -26, -53, -34, -57, -36, -58, -38.5, -65, -41, -65, -46, -69, -51, -68.5, -54.5, -72, -53, -75, -48, -73, -38, -71.5, -30, -70.3, -18, -76, -14, -81, -6, -80, -3, -80.5, 0, -79, 1.5, -78, 7, -77, 7.5],
  [114, -22, 122, -17.5, 129, -15, 131, -12, 137, -12, 136, -15, 140, -17.5, 142, -10.8, 146, -19, 153, -25, 153, -31, 150, -37.5, 146, -39, 140, -38, 138, -35, 135, -35, 131, -31.5, 124, -34, 115, -34.5, 115, -30],
];
// Inland seas and bays, cut back out of the land.
const WATER: number[][] = [
  [28, 41.2, 28, 43, 29.5, 45, 31, 46.6, 33, 46, 33.5, 44.4, 35.5, 45, 37, 45.2, 38, 47, 39, 47, 37.5, 44.6, 39.5, 43.5, 41.6, 41.6, 39, 41, 35, 42, 32, 41.8, 29, 41.2],
  [47, 44.5, 49, 46.5, 51.5, 47, 53, 46.5, 51, 44.5, 52.5, 42, 54, 40.5, 53.5, 37, 51, 36.7, 49, 37.5, 49.5, 40, 48, 42],
  [-95, 59, -94, 61, -88, 64, -82, 64, -78, 62.5, -77, 60, -79, 55, -80, 51.5, -82.5, 52, -85, 55, -92, 57, -94, 58],
];

// Cities as [lon, lat, size]: the lights, and the ends of the requests.
const CITIES: number[][] = [
  [-0.1, 51.5, 1], [2.35, 48.86, 1], [-3.7, 40.4, 0.8], [2.17, 41.4, 0.6], [-9.1, 38.7, 0.5], [12.5, 41.9, 0.7], [9.2, 45.5, 0.8],
  [13.4, 52.5, 0.7], [10, 53.55, 0.5], [4.9, 52.37, 0.8], [4.35, 50.85, 0.5], [8.68, 50.1, 0.8], [11.6, 48.1, 0.5], [16.4, 48.2, 0.5],
  [21, 52.2, 0.5], [14.4, 50.1, 0.4], [19, 47.5, 0.4], [18, 59.3, 0.4], [10.7, 59.9, 0.3], [12.6, 55.7, 0.4], [25, 60.2, 0.3],
  [-6.3, 53.3, 0.4], [-2.2, 53.5, 0.5], [37.6, 55.75, 1], [30.3, 59.9, 0.6], [30.5, 50.45, 0.5], [29, 41, 1], [23.7, 38, 0.5],
  [26.1, 44.4, 0.4], [5.4, 43.3, 0.4], [4.8, 45.75, 0.3], [14.3, 40.85, 0.4], [23.3, 42.7, 0.3], [20.5, 44.8, 0.3], [27.5, 53.9, 0.3],
  [49.1, 55.8, 0.3], [60.6, 56.8, 0.3], [82.9, 55, 0.3], [44, 56.3, 0.3], [39.7, 47.2, 0.3],
  [31.2, 30.05, 1], [29.9, 31.2, 0.5], [32.6, 25.7, 0.2], [32.5, 15.5, 0.4], [3.4, 6.5, 0.9], [-0.2, 5.6, 0.4], [-4, 5.3, 0.4],
  [-17.4, 14.7, 0.3], [-7.6, 33.6, 0.5], [3, 36.75, 0.5], [10.2, 36.8, 0.4], [13.2, 32.9, 0.3], [38.7, 9, 0.4], [36.8, -1.3, 0.4],
  [15.3, -4.3, 0.5], [28, -26.2, 0.6], [7.5, 9.1, 0.4], [-1.5, 12.4, 0.2], [2.1, 13.5, 0.2], [45.3, 2, 0.2],
  [34.8, 32.1, 0.6], [35.9, 32, 0.3], [35.5, 33.9, 0.3], [44.4, 33.3, 0.5], [51.4, 35.7, 0.8], [46.7, 24.7, 0.6], [39.2, 21.5, 0.4],
  [55.3, 25.2, 0.7], [51.5, 25.3, 0.4], [48, 29.4, 0.4], [58.4, 23.6, 0.3], [59.6, 36.3, 0.3], [32.9, 39.9, 0.5], [27.1, 38.4, 0.3],
  [49.9, 40.4, 0.3], [44.5, 40.2, 0.3], [69.2, 41.3, 0.4], [76.9, 43.2, 0.3], [69.2, 34.5, 0.3],
  [67, 24.9, 0.8], [74.3, 31.5, 0.7], [77.2, 28.6, 1], [72.9, 19.1, 1], [88.4, 22.6, 0.8], [80.3, 13.1, 0.7], [77.6, 13, 0.7],
  [78.5, 17.4, 0.6], [90.4, 23.8, 0.8], [85.3, 27.7, 0.2], [72.6, 23, 0.5], [75.8, 26.9, 0.4], [80.9, 26.8, 0.5], [73.9, 18.5, 0.5],
  [79.9, 6.9, 0.3], [96.2, 16.8, 0.3],
  [116.4, 39.9, 1], [121.5, 31.2, 1], [113.3, 23.1, 0.9], [114.2, 22.3, 0.8], [104, 30.7, 0.6], [114.3, 30.6, 0.6], [108.9, 34.3, 0.5],
  [127, 37.55, 1], [139.7, 35.7, 1.1], [135.5, 34.7, 0.8], [121.5, 25, 0.6], [100.5, 13.75, 0.8], [105.8, 21, 0.5], [106.7, 10.8, 0.6],
  [103.8, 1.35, 0.8], [106.8, -6.2, 0.9], [121, 14.6, 0.8], [101.7, 3.1, 0.5],
  [-74, 40.7, 1.1], [-77, 38.9, 0.6], [-71, 42.36, 0.6], [-75.2, 39.95, 0.6], [-87.6, 41.9, 0.9], [-83, 42.3, 0.5], [-79.4, 43.65, 0.7],
  [-73.6, 45.5, 0.5], [-84.4, 33.75, 0.6], [-80.2, 25.8, 0.7], [-96.8, 32.8, 0.7], [-95.4, 29.8, 0.7], [-105, 39.7, 0.4], [-112, 33.45, 0.5],
  [-118.2, 34, 1], [-122.4, 37.8, 0.7], [-122.3, 47.6, 0.5], [-123.1, 49.3, 0.4], [-99.1, 19.4, 1], [-103.3, 20.7, 0.4], [-100.3, 25.7, 0.4],
  [-82.4, 23.1, 0.3], [-74.1, 4.7, 0.6], [-66.9, 10.5, 0.4], [-93.3, 45, 0.4], [-90.2, 38.6, 0.4], [-111.9, 40.8, 0.3], [-79.5, 9, 0.3],
  [-149.9, 61.2, 0.2], [-21.9, 64.1, 0.2], [-46.6, -23.5, 1], [-43.2, -22.9, 0.7], [-77, -12, 0.6],
];

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Value noise, wrapping every `period` lattice cells in x when period > 0.
function noise(x: number, y: number, period: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  let x0 = xi, x1 = xi + 1;
  if (period) {
    x0 = ((xi % period) + period) % period;
    x1 = (x0 + 1) % period;
  }
  const a = hash(x0, yi), b = hash(x1, yi), c = hash(x0, yi + 1), d = hash(x1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, octaves: number, period: number): number {
  let s = 0, n = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += amp * noise(x * f, y * f, period * f);
    n += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / n;
}

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const mix = (a: number, b: number, k: number) => a + (b - a) * k;
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

export default function edgeOrbit(): Frame {
  const PAL = meta.palette.map(hex);
  const N = W * H;
  const out: string[] = new Array(N);
  const I_ORANGE = meta.palette.indexOf("#f38020"), I_TANGERINE = meta.palette.indexOf("#faae40");
  // Nearest palette colour, cached on a 32-step cube.
  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r: number, g: number, b: number): number => {
    const k = (Math.min(31, (r * 31.99) | 0) << 10) | (Math.min(31, (g * 31.99) | 0) << 5) | Math.min(31, (b * 31.99) | 0);
    if (lut[k] !== 255) return lut[k];
    let best = 0, bd = 1e9;
    for (let i = 0; i < PAL.length; i++) {
      const dr = PAL[i][0] - r, dg = PAL[i][1] - g, db = PAL[i][2] - b;
      const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (d < bd) (bd = d), (best = i);
    }
    return (lut[k] = best);
  };

  // --- the maps, built once ------------------------------------------------
  // Equirectangular, wrapping in longitude. First the bare rings, filled a
  // scanline at a time.
  const mask = new Uint8Array(TW * TH);
  const fill = (ring: number[], v: number) => {
    const xs: number[] = [];
    for (let j = 0; j < TH; j++) {
      const lat = LAT1 - (j + 0.5) / TS;
      xs.length = 0;
      for (let a = 0, n = ring.length / 2; a < n; a++) {
        const b = (a + 1) % n;
        const y0 = ring[a * 2 + 1], y1 = ring[b * 2 + 1];
        if ((y0 > lat) !== (y1 > lat)) xs.push(ring[a * 2] + ((lat - y0) / (y1 - y0)) * (ring[b * 2] - ring[a * 2]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const i0 = Math.ceil((xs[k] + 180) * TS - 0.5), i1 = Math.floor((xs[k + 1] + 180) * TS - 0.5);
        for (let i = i0; i <= i1; i++) mask[j * TW + ((i % TW) + TW) % TW] = v;
      }
    }
  };
  for (const ring of LAND) fill(ring, 1);
  for (const ring of WATER) fill(ring, 0);

  // Then roughened: each texel reads the mask from a little way off, pushed
  // about by noise, so the straight runs of the rings become coastline. The
  // same noise gives the land a faint relief.
  const land = new Float32Array(TW * TH);
  const relief = new Float32Array(TW * TH);
  const at = (i: number, j: number) => mask[Math.max(0, Math.min(TH - 1, j)) * TW + ((i % TW) + TW) % TW];
  for (let j = 0; j < TH; j++) {
    for (let i = 0; i < TW; i++) {
      const a = fbm(i * 0.075, j * 0.075, 3, 108), b = fbm(i * 0.075 + 31, j * 0.075 + 17, 3, 108);
      const fi = i + (a - 0.5) * 9, fj = j + (b - 0.5) * 9;
      const i0 = Math.floor(fi), j0 = Math.floor(fj), u = fi - i0, v = fj - j0;
      const m = (at(i0, j0) * (1 - u) + at(i0 + 1, j0) * u) * (1 - v) + (at(i0, j0 + 1) * (1 - u) + at(i0 + 1, j0 + 1) * u) * v;
      land[j * TW + i] = m;
      relief[j * TW + i] = a;
    }
  }

  // The lights: a bright core at each city, a thin sprawl of suburbs round it,
  // and a few towns where the cities crowd together, all only on land. Kept
  // quiet, so the requests read over them.
  const sprawl = new Float32Array(TW * TH);
  const core = new Float32Array(TW * TH);
  for (const [lon, lat, s] of CITIES) {
    const reach = 8 * TS;
    const ci = (lon + 180) * TS - 0.5, cj = (LAT1 - lat) * TS - 0.5;
    const cl = Math.cos(lat * DEG);
    const sc = (0.22 + 0.25 * s) * TS, sb = (1.4 + 1.6 * s) * TS;
    for (let dj = -reach; dj <= reach; dj++) {
      const j = Math.round(cj) + dj;
      if (j < 0 || j >= TH) continue;
      for (let di = -reach; di <= reach; di++) {
        const i = Math.round(ci) + di;
        const dx = (i - ci) * cl, dy = j - cj;
        const d2 = dx * dx + dy * dy;
        const k = j * TW + ((i % TW) + TW) % TW;
        sprawl[k] += s * Math.exp(-d2 / (2 * sb * sb));
        core[k] += s * Math.exp(-d2 / (2 * sc * sc));
      }
    }
  }
  const lights = new Float32Array(TW * TH);
  for (let j = 0; j < TH; j++) {
    for (let i = 0; i < TW; i++) {
      const k = j * TW + i;
      const l = smooth(0.35, 0.8, land[k]);
      if (!l) continue;
      // towns on a half-degree grid, so they hold still as the globe turns
      const gi = i >> 1, gj = j >> 1;
      const town = hash(gi, gj + 9001) < Math.min(0.5, sprawl[k]) * 0.08 ? 0.15 + 0.35 * hash(gi + 7, gj) : 0;
      lights[k] = l * Math.min(1.3, core[k] * 1.2 + town);
    }
  }

  const sample = (A: Float32Array, fi: number, fj: number) => {
    let i0 = Math.floor(fi);
    const u = fi - i0;
    i0 = ((i0 % TW) + TW) % TW;
    const i1 = i0 + 1 === TW ? 0 : i0 + 1;
    const j0 = Math.max(0, Math.min(TH - 2, Math.floor(fj))), v = clamp(fj - j0);
    const a = A[j0 * TW + i0], b = A[j0 * TW + i1], c = A[j0 * TW + TW + i0], d = A[j0 * TW + TW + i1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };

  // --- the screen, built once ----------------------------------------------
  // For each cell on the globe, where it lands on the map before any turning,
  // and how far it sits inside the limb. For each cell off it, its height above.
  const onGlobe = new Uint8Array(N);
  const texI = new Float32Array(N), texJ = new Float32Array(N);
  const depth = new Float32Array(N); // cells in from the limb, or out from it
  const toSun = new Float32Array(N);
  const stars = new Float32Array(N);
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const sx = (x + 0.5 - CX) / R, sy = (CY - (r + 0.5)) / R;
      const d = Math.hypot(sx, sy);
      toSun[k] = Math.hypot(x + 0.5 - SUN[0], r + 0.5 - SUN[1]);
      if (d < 1) {
        onGlobe[k] = 1;
        const nz = Math.sqrt(1 - d * d);
        const lat = Math.asin(sy * P[1] + nz * P[2]);
        const lon = LON_C + Math.atan2(sx, sy * G[1] + nz * G[2]) / DEG;
        texI[k] = (lon + 180) * TS - 0.5;
        texJ[k] = (LAT1 - lat / DEG) * TS - 0.5;
        depth[k] = (1 - d) * R;
      } else {
        depth[k] = (d - 1) * R;
        if (hash(x, r * 3 + 11) > 0.986) stars[k] = 0.3 + 0.6 * hash(r, x + 5) ** 2;
      }
    }
  }

  // --- the requests --------------------------------------------------------
  // Only the bigger cities send and receive, so there are fewer ends, each
  // one clear.
  const HUBS = CITIES.map((c, i) => (c[2] >= 0.5 ? i : -1)).filter((i) => i >= 0);

  // Each one's targets: the hubs a medium hop away, far enough apart that the
  // arc between them reads, near enough that it stays on screen.
  const unit = CITIES.map(([lon, lat]) => [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG), Math.sin(lat * DEG)]);
  const near: number[][] = CITIES.map((_, a) => {
    const list: number[] = [];
    for (const b of HUBS) {
      const w = Math.acos(Math.min(1, unit[a][0] * unit[b][0] + unit[a][1] * unit[b][1] + unit[a][2] * unit[b][2]));
      if (w > 0.1 && w < 0.5) list.push(b);
    }
    return list;
  });

  // A city in view space with the globe turned by `spin`.
  const view = (c: number, spin: number, o: Float64Array) => {
    const [lon, lat] = CITIES[c];
    const rel = (lon - LON_C) * DEG + spin;
    const cl = Math.cos(lat * DEG), sl = Math.sin(lat * DEG), cr = Math.cos(rel) * cl;
    o[0] = cl * Math.sin(rel);
    o[1] = cr * G[1] + sl * P[1];
    o[2] = cr * G[2] + sl * P[2];
  };
  const tmp = new Float64Array(3);
  // in view, clear of the limb where the ground is too foreshortened, and of
  // the frame's edges
  const shown = (c: number, spin: number) => {
    view(c, spin, tmp);
    const x = CX + tmp[0] * R, y = CY - tmp[1] * R;
    return tmp[2] > 0.25 && x > 10 && x < W - 10 && y > 56 && y < H - 4;
  };

  // The requests are added up here as light, in the brand's two colours, then
  // laid over the shaded picture: orange in flight, tangerine on landing.
  const aO = new Float32Array(N), aT = new Float32Array(N);
  const splatS = (A: Float32Array, sx: number, sy: number, w: number) => {
    const fx = sx - 0.5, fy = sy - 0.5;
    const x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
    for (let q = 0; q < 4; q++) {
      const x = x0 + (q & 1), y = y0 + (q >> 1);
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      A[y * W + x] += w * ((q & 1) ? u : 1 - u) * ((q >> 1) ? v : 1 - v);
    }
  };
  // A point in view space, unless the Earth hides it.
  const splat = (A: Float32Array, px: number, py: number, pz: number, w: number) => {
    if (pz < 0 && px * px + py * py < 1) return;
    splatS(A, CX + px * R, CY - py * R, w);
  };
  // A soft round blob on screen, for the sparks and flashes at the ends.
  const blob = (A: Float32Array, sx: number, sy: number, rad: number, w: number) => {
    const n = Math.ceil(rad * 2.5);
    for (let dy = -n; dy <= n; dy++)
      for (let dx = -n; dx <= n; dx++) {
        const x = Math.round(sx) + dx, y = Math.round(sy) + dy;
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const ex = x + 0.5 - sx, ey = y + 0.5 - sy;
        A[y * W + x] += w * Math.exp(-(ex * ex + ey * ey) / (2 * rad * rad));
      }
  };
  const A = new Float64Array(3), B = new Float64Array(3);
  const ease = (p: number) => p * p * (3 - 2 * p);
  const LAND_T = 1.1;

  // One request: picked, timed and drawn from its slot and the time.
  const request = (slot: number, t: number) => {
    const u = t + hash(slot, 7) * PD;
    const cyc = Math.floor(u / PD), local = u - cyc * PD;
    const c = ((cyc % NC) + NC) % NC;
    const spin0 = ((t - local) / DAY) * Math.PI * 2;
    // the sender, weighted toward the big cities, and in view when it leaves
    let a = -1;
    for (let k = 0; k < 40 && a < 0; k++) {
      const cand = HUBS[Math.floor(hash(slot * 977 + c, k * 13 + 1) * HUBS.length)];
      if (hash(cand + k * 31, c * 7 + slot) < CITIES[cand][2] && shown(cand, spin0)) a = cand;
    }
    if (a < 0) return;
    // the receiver, a medium hop away and in view too
    let b = -1;
    const list = near[a];
    for (let k = 0; k < 16 && b < 0 && list.length; k++) {
      const cand = list[Math.floor(hash(slot * 131 + c, k + 50) * list.length)];
      if (shown(cand, spin0)) b = cand;
    }
    if (b < 0) return;

    const spin = (t / DAY) * Math.PI * 2;
    view(a, spin, A);
    view(b, spin, B);
    const om = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])), so = Math.sin(om);
    const dur = 0.9 + om * 3.2;
    const p = (local - hash(slot * 7 + c, 3) * 1.2) / dur;
    if (p < 0) return;
    // the great circle between them, lifted off the ground in a bow
    const lift = 0.015 + 0.17 * om;
    const pt = (s: number, o: Float64Array) => {
      const ka = Math.sin((1 - s) * om) / so, kb = Math.sin(s * om) / so;
      const h = 1 + lift * Math.sin(Math.PI * s);
      o[0] = (ka * A[0] + kb * B[0]) * h;
      o[1] = (ka * A[1] + kb * B[1]) * h;
      o[2] = (ka * A[2] + kb * B[2]) * h;
    };
    const steps = Math.ceil(om * R * 2.4) + 8;
    const cell = (om * R * 1.3) / steps; // light per cell, whatever the sampling
    const ax = CX + A[0] * R, ay = CY - A[1] * R, bx = CX + B[0] * R, by = CY - B[1] * R;
    if (p <= 1) {
      // in flight: eased, so it leaves and arrives gently, a faint trace
      // behind it, a hot tail, and a head
      const sh = ease(p);
      const TL = 0.35;
      for (let i = 0; i <= steps; i++) {
        const s = (i / steps) * sh;
        const tail = s > sh - TL ? ((s - (sh - TL)) / TL) ** 1.5 : 0;
        pt(s, tmp);
        splat(aO, tmp[0], tmp[1], tmp[2], (0.2 + 2.2 * tail) * cell * sh);
      }
      pt(sh, tmp);
      if (!(tmp[2] < 0 && tmp[0] * tmp[0] + tmp[1] * tmp[1] < 1)) blob(aO, CX + tmp[0] * R, CY - tmp[1] * R, 0.75, 2.4);
      // a spark at the sender as it leaves
      blob(aO, ax, ay, 0.9, 2.4 * Math.exp(-p * 6) + 0.3);
      return;
    }
    // landed: the receiver flashes, a ring spreads on the ground round it,
    // and the trace fades
    const e = ((p - 1) * dur) / LAND_T;
    if (e > 1) return;
    const fade = (1 - e) * (1 - e);
    for (let i = 0; i <= steps; i += 2) {
      pt(i / steps, tmp);
      splat(aO, tmp[0], tmp[1], tmp[2], 0.5 * cell * fade);
    }
    blob(aT, bx, by, 0.85, 2.6 * Math.exp(-e * 4) + 0.3 * fade);
    // the ring, laid flat on the ground round the city
    const ex = [B[2], 0, -B[0]];
    const el = Math.hypot(ex[0], ex[2]) || 1;
    ex[0] /= el, ex[2] /= el;
    const nx = B[1] * ex[2] - B[2] * ex[1], ny = B[2] * ex[0] - B[0] * ex[2], nz = B[0] * ex[1] - B[1] * ex[0];
    const rad = (2 + 9 * Math.sqrt(e)) / R;
    for (let i = 0; i < 48; i++) {
      const th = (i / 48) * Math.PI * 2, cs = Math.cos(th) * rad, sn = Math.sin(th) * rad;
      splat(aT, B[0] + cs * ex[0] + sn * nx, B[1] + cs * ex[1] + sn * ny, B[2] + cs * ex[2] + sn * nz, 0.5 * fade);
    }
  };

  return (t, { color } = {}) => {
    const spinT = (t / DAY) * 360 * TS; // the turn, in texels
    const flare = 1 + 0.08 * Math.sin((t / 12) * Math.PI * 2);
    aO.fill(0), aT.fill(0);
    for (let s = 0; s < SLOTS; s++) request(s, t);

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const e = depth[k], ds = toSun[k];
        const dawn = Math.exp(-ds / 30); // the sun's reach along the horizon
        const warm = Math.exp(-ds / 85); // how far round the limb the orange runs
        let cr = 0, cg = 0, cb = 0, floor = 0;

        if (onGlobe[k]) {
          const fi = texI[k] - spinT, fj = texJ[k];
          const l = sample(land, fi, fj);
          const rl = sample(relief, fi, fj);
          // dark sea, and land a shade above it so the continents read
          const tone = 0.75 + 0.6 * rl;
          cr = mix(0.005, 0.04 * tone, l);
          cg = mix(0.01, 0.045 * tone, l);
          cb = mix(0.03, 0.06 * tone, l);
          // city light, warm, paler in the cores
          const li = sample(lights, fi, fj);
          if (li > 0.01) {
            const g = Math.min(1.2, li * 1.25);
            cr += g * 0.95, cg += g * (0.6 + 0.25 * g), cb += g * (0.22 + 0.35 * g * g);
          }
          // the air thickens toward the limb: a haze, and a bright edge that
          // burns orange toward the sunrise
          const edge = Math.exp(-e / 1.2) * 0.6, haze = Math.exp(-e / 6) * 0.07;
          const dim = 1 - 0.45 * Math.exp(-e / 5);
          cr = cr * dim + edge * mix(0.12, ORANGE[0] * 1.1, warm) + haze * mix(0.15, 0.9, warm);
          cg = cg * dim + edge * mix(0.2, ORANGE[1] * 1.1, warm) + haze * mix(0.25, 0.45, warm);
          cb = cb * dim + edge * mix(0.45, ORANGE[2], warm) + haze * mix(0.6, 0.12, warm);
          // dawn light spilling over the ground nearest the sun
          const sl = Math.exp(-ds / 8) * 0.4 * Math.exp(-e / 4);
          cr += sl * 0.95, cg += sl * 0.55, cb += sl * 0.2;
          floor = 0.06;
        } else {
          // space: the rim of the air, orange where the sun lights it and a
          // thin cold blue far from it
          const rim = Math.exp(-e / 1.3) * 0.85 + Math.exp(-e / 5) * 0.2;
          const w = clamp(warm * 1.25);
          cr = 0.004 + rim * mix(0.07, ORANGE[0], w);
          cg = 0.007 + rim * mix(0.13, ORANGE[1], w);
          cb = 0.02 + rim * mix(0.34, ORANGE[2], w);
          const st = stars[k];
          if (st) {
            const tw = 0.7 + 0.3 * Math.sin((t / 24) * Math.PI * 2 * (1 + ((k * 7) & 3)) + k);
            const s = st * tw * smooth(4, 14, e) * (1 - dawn);
            cr = Math.max(cr, s * 0.85), cg = Math.max(cg, s * 0.9), cb = Math.max(cb, s);
          }
        }

        // The sun: a hot point on the limb, a glow, and a streak along the horizon.
        const dx = x + 0.5 - SUN[0], dy = r + 0.5 - SUN[1];
        const tan = -dx * Math.sin(SUN_A) - dy * Math.cos(SUN_A); // tangent to the limb
        const across = dx * Math.cos(SUN_A) - dy * Math.sin(SUN_A);
        const streak = Math.exp(-((across / 0.8) ** 2)) * Math.exp(-Math.abs(tan) / 26) * 0.8;
        const sun = (Math.exp(-ds / 1.2) * 2.6 + Math.exp(-ds / 4) * 0.55) * flare;
        cr += sun + streak, cg += sun * 0.85 + streak * 0.62, cb += sun * 0.62 + streak * 0.22;

        // The requests, over everything, dimming what they cross so their
        // colour holds against the city lights.
        const req = aO[k] + aT[k];
        let pin = -1;
        if (req > 0.02) {
          const cover = 1 - 0.75 * Math.min(1, req * 1.5);
          cr = cr * cover + aO[k] * ORANGE[0] + aT[k] * TANGERINE[0];
          cg = cg * cover + aO[k] * ORANGE[1] + aT[k] * TANGERINE[1];
          cb = cb * cover + aO[k] * ORANGE[2] + aT[k] * TANGERINE[2];
          if (req > 0.06) pin = aO[k] >= aT[k] ? I_ORANGE : I_TANGERINE;
        }

        // Dot size from brightness, dithered. Then the colour makes up what the
        // dot size could not: a small dot is drawn brighter and a large one
        // dimmer, so a gradient stays smooth across the dither's steps.
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.85) * 0.98);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          if (pin >= 0 && step) color[k] = pin;
          else {
            const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
            // the night side stays night: a dim cell is drawn in a dim colour
            const s = Math.min(0.3 + 0.7 * want, 0.22 + peak * 2.2) / peak;
            color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
          }
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
