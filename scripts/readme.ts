// node scripts/readme.ts: writes the turning donut at the top of the README,
// .github/donut-dark.svg and .github/donut-light.svg.
//
// It is the donut piece's math on a loop that closes: in LOOP seconds the
// torus turns twice on one axis and once on the other, so the last frame runs
// into the first. Each frame is a block of text, shown for one frame's time by
// a CSS animation, so GitHub plays it as a plain image.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const COLS = 34;
const ROWS = 17;
const LOOP = 10; // seconds
const FPS = 12;
const RAMP = ".,-~:;=!*#$@";
const SIZE = 14; // font size in px; a cell is 0.6em wide and 1.2em tall
const OUT = fileURLToPath(new URL("../.github/", import.meta.url));

function frame(t: number): string[] {
  const R1 = 1, R2 = 2, K2 = 6, ASPECT = 0.5;
  const K1 = (COLS - 2) / 2 / ((R1 + R2) / Math.sqrt(K2 * K2 - (R1 + R2) ** 2));
  const m = Math.hypot(-0.4, 1, -1);
  const [lx, ly, lz] = [-0.4 / m, 1 / m, -1 / m];
  const out: string[] = new Array<string>(COLS * ROWS).fill(" ");
  const depth = new Float32Array(COLS * ROWS);
  const A = 1 + (t / LOOP) * 4 * Math.PI;
  const B = 1 + (t / LOOP) * 2 * Math.PI;
  const cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
  for (let th = 0; th < 6.283; th += 0.07) {
    const ct = Math.cos(th), st = Math.sin(th);
    for (let ph = 0; ph < 6.283; ph += 0.02) {
      const cp = Math.cos(ph), sp = Math.sin(ph);
      const h = R2 + R1 * ct;
      const x = h * (cB * cp + sA * sB * sp) - R1 * st * cA * sB;
      const y = h * (sB * cp - sA * cB * sp) + R1 * st * cA * cB;
      const ooz = 1 / (K2 + cA * h * sp + R1 * st * sA);
      const col = Math.floor(COLS / 2 + K1 * ooz * x);
      const row = Math.floor(ROWS / 2 - K1 * ASPECT * ooz * y);
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) continue;
      const k = col + row * COLS;
      if (ooz <= depth[k]!) continue;
      depth[k] = ooz;
      const nx = ct * (cB * cp + sA * sB * sp) - st * cA * sB;
      const ny = ct * (sB * cp - sA * cB * sp) + st * cA * cB;
      const nz = cA * ct * sp + st * sA;
      out[k] = RAMP[Math.round(Math.max(0, nx * lx + ny * ly + nz * lz) * (RAMP.length - 1))]!;
    }
  }
  return Array.from({ length: ROWS }, (_, r) => out.slice(r * COLS, (r + 1) * COLS).join(""));
}

function svg(ink: string): string {
  const n = LOOP * FPS;
  const step = 1 / FPS;
  const w = Math.ceil(COLS * SIZE * 0.62);
  const h = Math.ceil(ROWS * SIZE * 1.2);
  const frames = Array.from({ length: n }, (_, i) => {
    const rows = frame(i * step)
      .map((line, r) => `<tspan x="0" y="${((r + 1) * SIZE * 1.2 - SIZE * 0.3).toFixed(1)}">${line}</tspan>`)
      .join("");
    return `<text style="animation-delay:${(i * step).toFixed(4)}s">${rows}</text>`;
  });
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="a lit donut turning, drawn in ascii">`,
    `<style>`,
    `text{font:${SIZE}px ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;fill:${ink};white-space:pre;visibility:hidden;animation:f ${LOOP}s infinite}`,
    `@keyframes f{0%{visibility:visible}${(100 / n).toFixed(4)}%,100%{visibility:hidden}}`,
    `@media (prefers-reduced-motion:reduce){text{animation:none}text:first-of-type{visibility:visible}}`,
    `</style>`,
    ...frames,
    `</svg>`,
    ``,
  ].join("\n");
}

writeFileSync(`${OUT}donut-dark.svg`, svg("#c9d1d9"));
writeFileSync(`${OUT}donut-light.svg`, svg("#24292f"));
console.log(`${LOOP * FPS} frames of ${COLS}x${ROWS} -> .github/donut-dark.svg, .github/donut-light.svg`);
