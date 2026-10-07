/*
 * A GPU rack at work, for the author page. It is not one of the library's
 * pieces, but it keeps their contract: meta plus a frame for any time.
 *
 * A switch on top flickers with traffic. Four nodes below each hold eight
 * GPUs, drawn as two-row meters that rise and fall with a training step, fans
 * that spin faster under load, and status lights. A power strip at the bottom
 * follows the whole rack's draw.
 */
import type { Frame, Meta } from "ascii.rest";

export const meta: Meta = {
  name: "gpu rack",
  category: "objects",
  note: "a rack of gpu nodes training, meters rising with every step",
  cols: 42,
  rows: 17,
  fps: 12,
};

const NODES = 4;
const GPUS = 8;
const LEVELS = " ▁▂▃▄▅▆▇█";
const BLADE = "-\\|/";
const STEP = 2.4; // seconds a training step takes, one rise and fall of the meters

// An integer hash in [0, 1): the same inputs always give the same flicker.
function hash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

// Load of one GPU at t: the whole rack breathes with the step, each node a
// little behind the one above, each GPU with its own jitter.
function load(node: number, gpu: number, t: number): number {
  const phase = (t / STEP + node * 0.18) * Math.PI * 2;
  const jitter = hash(node * GPUS + gpu, Math.floor(t * 6)) * 0.12;
  return Math.min(1, Math.max(0.05, 0.62 + 0.3 * Math.sin(phase) + jitter - 0.06));
}

const level = (x: number) => LEVELS[Math.max(0, Math.min(8, Math.round(x)))]!;

export default function gpuRack(): Frame {
  const { cols } = meta;
  const inner = cols - 2;
  const row = (s: string) => `│${s.padEnd(inner).slice(0, inner)}│`;
  const rule = (l: string, r: string) => `${l}${"─".repeat(inner)}${r}`;

  return (t) => {
    const lines: string[] = [rule("┌", "┐")];

    // The switch: two banks of twelve ports, lit while they carry traffic.
    const tick = Math.floor(t * 10);
    const bank = (b: number) =>
      Array.from({ length: 12 }, (_, i) => (hash(b * 12 + i, tick) > 0.45 ? "•" : "·")).join("");
    lines.push(row(` ${bank(0)}  ${hash(99, Math.floor(t * 2)) > 0.5 ? "●" : "○"}  ${bank(1)}  sw`));
    lines.push(rule("├", "┤"));

    let draw = 0;
    for (let n = 0; n < NODES; n++) {
      const loads = Array.from({ length: GPUS }, (_, g) => load(n, g, t));
      const mean = loads.reduce((a, b) => a + b, 0) / GPUS;
      draw += mean;
      // Fans turn a blade every frame or two, quicker when the node works harder.
      const spin = (k: number) => BLADE[Math.floor(t * (6 + mean * 14) + n * 2 + k) % 4];
      const fans = `(${spin(0)}) (${spin(1)})`;
      const meters = (top: boolean) => loads.map((u) => level(top ? u * 16 - 8 : u * 16)).join(" ");
      const busy = hash(n, Math.floor(t * 8)) > 0.3 ? "•" : " ";
      lines.push(row(` ${fans}  ${meters(true)}  ● ${busy}  gpu-0${n + 1}`));
      lines.push(row(` ${fans}  ${meters(false)}`));
      if (n < NODES - 1) lines.push(row(""));
    }

    // The power strip: a bar as long as the rack's draw over a dotted track, and a steady light.
    lines.push(rule("├", "┤"));
    const width = 24;
    const fill = (draw / NODES) * width;
    const bar = "█".repeat(Math.floor(fill)) + (fill % 1 > 0.5 ? "▌" : "");
    lines.push(row(` ${bar}${"·".repeat(width - [...bar].length)}  ●  pdu`));
    lines.push(rule("└", "┘"));
    return lines.join("\n");
  };
}
