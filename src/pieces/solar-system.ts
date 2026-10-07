/*
 * solar-system: planets seen from above on dotted circular orbits. Each
 * period goes as the orbit's radius to the power 1.5, Kepler's third law.
 */
import type { Frame, Meta } from "../types.ts";

export interface SolarSystemOptions {
  [key: string]: unknown;
  /** How fast the planets go round: 1 is the innermost orbit in three seconds. */
  speed: number;
}

export const meta = {
  name: "solar system",
  category: "space",
  note: "four planets on dotted orbits, periods by kepler's third law",
  cols: 61,
  rows: 29,
  fps: 20,
  options: { speed: 1 },
} satisfies Meta<SolarSystemOptions>;

const TAU = Math.PI * 2;

interface Planet {
  a: number;
  glyph: string;
  at: number;
  moon?: boolean;
}

// Orbit radius in columns, glyph, starting angle. Orbits open out with
// distance, as they do; the second planet has a moon.
const PLANETS: Planet[] = [
  { a: 9.6, glyph: "o", at: 0.5 },
  { a: 14.5, glyph: "O", at: 2.3, moon: true },
  { a: 21, glyph: "(@)", at: 4.1 },
  { a: 28, glyph: "-(O)-", at: 5.9 },
];
const T1 = 3; // seconds for the innermost orbit at speed 1
const TRAIL = 3.2; // trail cells behind the innermost planet; slower ones leave less

export default function solarSystem({ speed = 1 }: Partial<SolarSystemOptions> = {}): Frame {
  const { cols, rows } = meta;
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
  const grid = new Array<string>(cols * rows);
  // Rounds away from the sun, so each orbit comes out symmetric.
  const sym = (v: number, o: number) => o + Math.sign(v - o) * Math.round(Math.abs(v - o));
  const cell = (x: number, y: number) => {
    const c = sym(x, cx), r = sym(y, cy);
    return c >= 0 && c < cols && r >= 0 && r < rows ? c + r * cols : -1;
  };
  const at = (p: Planet, th: number): [number, number] => [cx + p.a * Math.cos(th), cy - (p.a / 2) * Math.sin(th)];

  // A dot every two columns of arc, rows counting double, so each orbit is
  // an even dotted curve.
  const rings = new Set<number>();
  for (const p of PLANETS) {
    const n = Math.round((TAU * p.a) / 2);
    for (let k = 0; k < n; k++) rings.add(cell(...at(p, (k / n) * TAU)));
  }
  // The sun, shaded brighter toward its middle.
  const sun: [number, string][] = [];
  for (let r = -2; r <= 2; r++)
    for (let c = -5; c <= 5; c++) {
      const d = Math.hypot(c, r * 2) / 4.4;
      if (d <= 1) sun.push([cell(cx + c, cy + r), d < 0.35 ? "@" : d < 0.6 ? "%" : d < 0.82 ? "*" : "+"]);
    }

  return (t) => {
    grid.fill(" ");
    for (const k of rings) if (k >= 0) grid[k] = ".";
    for (const [k, ch] of sun) grid[k] = ch;
    for (const p of PLANETS) {
      const th = p.at + (TAU * t * speed) / (T1 * (p.a / PLANETS[0].a) ** 1.5);
      const [x, y] = at(p, th);
      const x0 = Math.round(x - (p.glyph.length - 1) / 2), r0 = Math.round(y);
      const mine = (k: number) => k >= 0 && Math.floor(k / cols) === r0 && k % cols >= x0 && k % cols < x0 + p.glyph.length;
      // The trail walks back along the orbit, one cell at a time: a stroke
      // the way the planet is heading, then a fading dot. Orbital speed goes
      // as one over the root of the radius, so outer trails are shorter.
      const len = Math.round(TRAIL * Math.sqrt(PLANETS[0].a / p.a));
      let last = cell(x, y), drawn = 0;
      for (let u = th; drawn < len && u > th - 1; u -= 0.01) {
        const k = cell(...at(p, u));
        if (k === last || mine(k)) continue;
        last = k;
        if (k < 0) break;
        const s = Math.abs(Math.cos(u)) / Math.max(1e-6, Math.abs(Math.sin(u))); // slope, rows counted double
        const g = s < 0.6 ? "-" : s > 2.4 ? "|" : Math.sin(u) * Math.cos(u) > 0 ? "\\" : "/";
        grid[k] = drawn < len - 1 ? g : "·";
        drawn++;
      }
      // The planet, with the orbit dots either side cleared so it stands out.
      for (let i = -1; i <= p.glyph.length; i++) {
        const k = cell(x0 + i, r0);
        if (k < 0) continue;
        if (p.glyph[i]) grid[k] = p.glyph[i];
        else if (grid[k] === ".") grid[k] = " ";
      }
      if (p.moon) {
        const m = (TAU * t * speed) / 1.1;
        const k = cell(x + 2.4 * Math.cos(m), y - 1.2 * Math.sin(m));
        if (k >= 0) grid[k] = "°";
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(grid.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
