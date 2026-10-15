/*
 * cpu-meters: the top of an htop screen. Eight cores split into user and
 * kernel time, memory and swap bars, load and uptime, and the busiest processes.
 */
import type { Frame, Meta } from "../types.ts";

export interface CpuMetersOptions {
  [key: string]: unknown;
  commands: string[];
}

export const meta = {
  name: "cpu meters",
  category: "data",
  note: "htop-style core, memory and swap meters over a process list",
  cols: 66,
  rows: 16,
  fps: 10,
  options: { commands: ["build", "indexer", "server", "backup", "sync", "editor", "shell"] },
} satisfies Meta<CpuMetersOptions>;

const RATE = 2; // refreshes per second, like htop's delay
const WARM = 80; // refreshes run before frame 0
const NCPU = 8;
const MEM = 15.5, SWAP = 2; // gigabytes
const COL = 31; // one meter column, label and brackets included

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// A meter: label, then stacked [fraction, glyph] parts, value text at the right inside.
function meter(label: string, parts: [number, string][], text: string): string {
  const inner = COL - 5;
  const cells: string[] = new Array(inner).fill(" ");
  let at = 0, acc = 0;
  for (const [f, g] of parts) {
    acc += f;
    for (const end = Math.min(inner, Math.round(acc * inner)); at < end; at++) cells[at] = g;
  }
  for (let i = 0; i < text.length; i++) cells[inner - text.length + i] = text[i];
  return label.padStart(3) + "[" + cells.join("") + "]";
}

const size = (gb: number) => (gb < 0.98 ? Math.round(gb * 1024) + "M" : gb.toFixed(gb < 10 ? 2 : 1) + "G");

function cpuTime(s: number): string {
  const m = Math.floor(s / 60), sec = s - m * 60;
  if (m < 60) return m + ":" + sec.toFixed(2).padStart(5, "0");
  return Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0") + ":" + String(Math.floor(sec)).padStart(2, "0");
}

interface Core {
  u: number;
  k: number;
  idle: number;
  base: number;
  part: number[];
}

interface Job {
  who: number;
  left: number;
  load: number;
  on: boolean[];
}

interface Mem {
  used: number;
  buf: number;
  cache: number;
  swap: number;
}

interface Proc {
  cmd: string;
  pid: number;
  user: string;
  virt: number;
  mem: number;
  time: number;
  w: number;
  cpu: number;
}

export default function cpuMeters({ commands = meta.options.commands }: Partial<CpuMetersOptions> = {}): Frame {
  const { cols } = meta;
  const blank = " ".repeat(cols);
  let made: number, rand: () => number, cores: Core[], jobs: Job[], mem: Mem, load: number[], tasks: number, procs: Proc[];

  const reset = () => {
    made = 0;
    rand = mulberry32(1);
    // Each core's load is a background part plus one part per job, each easing to its target.
    cores = Array.from({ length: NCPU }, () => ({ u: 0.1, k: 0.02, idle: 0.03 + rand() * 0.14, base: 0.1, part: [0, 0] }));
    // Two kinds of work that come and go, run by the first two commands.
    jobs = [0, 1].map((who) => ({ who, left: 0, load: 0, on: [] }));
    mem = { used: 4.6, buf: 0.31, cache: 5.2, swap: 0.13 };
    load = [1.62, 1.24, 0.91];
    tasks = 141;
    procs = commands.map((cmd, i) => ({
      cmd: String(cmd).slice(0, 13),
      pid: 1000 + Math.floor(rand() * 48000),
      user: i % 3 === 2 ? "root" : "app",
      virt: 0.4 + rand() * 3.2,
      mem: 0.4 + rand() * 4,
      time: 20 + rand() * 3000,
      w: rand(),
      cpu: 0,
    }));
  };

  // One refresh of the whole machine.
  const step = () => {
    // Now and then a job lands on some of the cores, works a while, and lets go.
    for (const j of jobs) {
      if (j.left > 0) j.left--;
      else if (rand() < [0.1, 0.06][j.who]) {
        j.left = 5 + Math.floor(rand() * 16);
        j.load = 0.35 + rand() * 0.55;
        j.on = cores.map(() => rand() < 0.3 + j.load * 0.5);
      }
    }
    let busy = 0;
    const share = jobs.map(() => 0);
    for (const [i, c] of cores.entries()) {
      if (rand() < 0.06) c.idle = 0.02 + rand() * 0.2;
      c.base += (c.idle - c.base) * 0.6;
      jobs.forEach((j, n) => (c.part[n] += ((j.left && j.on[i] ? j.load : 0) - c.part[n]) * 0.6));
      const want = c.base + c.part[0] + c.part[1];
      c.u = clamp(want + (rand() - 0.5) * 0.12, 0.004, 0.95);
      c.k = clamp(c.u * (0.1 + rand() * 0.22) + rand() * 0.015, 0, 0.97 + rand() * 0.03 - c.u);
      busy += c.u + c.k;
      jobs.forEach((_, n) => (share[n] += ((c.u + c.k) * c.part[n]) / want));
    }
    const working = jobs.some((j) => j.left);
    mem.used = clamp(mem.used + (4.4 + (working ? 2.6 : 0) - mem.used) * 0.12 + (rand() - 0.5) * 0.05, 3, 9);
    mem.buf = clamp(mem.buf + (rand() - 0.5) * 0.01, 0.25, 0.4);
    mem.cache = clamp(mem.cache + (rand() - 0.45) * 0.03, 4, MEM - 0.4 - mem.used - mem.buf);
    mem.swap = clamp(mem.swap + (rand() - 0.5) * 0.004, 0.11, 0.16);
    load = load.map((l, i) => l + (busy - l) * (1 - Math.exp(-1 / RATE / [60, 300, 900][i])));
    tasks = clamp(tasks + Math.round((rand() - 0.5) * 2.2), 136, 149);

    // A job's process takes what the job does; the rest share the idle work.
    const jobCpu = share.reduce((a, b) => a + b, 0) * 100;
    let sw = 0;
    procs.forEach((p) => (p.w = clamp(p.w + (rand() - 0.5) * 0.3, 0.02, 1), (sw += p.w * p.w)));
    procs.forEach((p, i) => {
      const n = jobs.findIndex((j) => j.who === i);
      const mine = n >= 0 && jobs[n].left > 0;
      p.cpu = ((busy * 100 - jobCpu) * 0.75 * p.w * p.w) / sw + (n >= 0 ? share[n] * 100 : 0);
      p.mem = clamp(p.mem + (rand() - 0.5) * 0.06 + (mine ? 0.05 : -0.004), 0.2, 14);
      p.time += p.cpu / 100 / RATE;
    });
  };

  const fill = (need: number) => {
    if (need < made) reset();
    for (; made < need; made++) step();
  };
  reset();

  const row = (pid: string, user: string, virt: string, res: string, s: string, cpu: string, mem: string, time: string, cmd: string) =>
    (" " + pid.padStart(5) + " " + user.padEnd(8) + " " + virt.padStart(5) + " " + res.padStart(5) + " " + s +
      " " + cpu.padStart(5) + " " + mem.padStart(4) + " " + time.padStart(9) + "  " + cmd).padEnd(cols);
  const header = row("PID", "USER", "VIRT", "RES", "S", "CPU%", "MEM%", "TIME+", "Command");

  return (t) => {
    fill(WARM + Math.floor(t * RATE));
    const core = (i: number) => {
      const c = cores[i];
      return meter(String(i), [[c.u, "|"], [c.k, "#"]], ((c.u + c.k) * 100).toFixed(1) + "%");
    };
    const left: string[] = [], right: string[] = [];
    for (let i = 0; i < NCPU / 2; i++) left.push(core(i)), right.push(core(i + NCPU / 2));
    left.push(
      meter("Mem", [[mem.used / MEM, "|"], [mem.buf / MEM, "#"], [mem.cache / MEM, "*"]], size(mem.used) + "/" + MEM + "G"),
      meter("Swp", [[mem.swap / SWAP, "|"]], size(mem.swap) + "/" + SWAP.toFixed(2) + "G"),
      ""
    );
    const running = Math.max(1, cores.filter((c) => c.u + c.k > 0.45).length);
    const up = 4 * 86400 + 3 * 3600 + 12 * 60 + 45 + Math.floor(t);
    const hms = [Math.floor(up / 3600) % 24, Math.floor(up / 60) % 60, up % 60].map((n) => String(n).padStart(2, "0"));
    right.push(
      "Tasks: " + tasks + ", " + (tasks * 3 - 5) + " thr; " + running + " running",
      "Load average: " + load.map((l) => l.toFixed(2)).join(" "),
      "Uptime: " + Math.floor(up / 86400) + " days, " + hms.join(":")
    );

    const lines = [blank];
    const fit = (s: string) => s.slice(0, COL).padEnd(COL);
    for (let r = 0; r < left.length; r++) lines.push(" " + fit(left[r]) + "  " + fit(right[r]) + " ");
    lines.push(blank, header);
    const top = [...procs].sort((a, b) => b.cpu - a.cpu).slice(0, 5);
    for (const p of top)
      lines.push(row(String(p.pid), p.user, size(p.virt), size((p.mem / 100) * MEM), p.cpu > 30 ? "R" : "S",
        p.cpu.toFixed(1), p.mem.toFixed(1), cpuTime(p.time), p.cmd));
    while (lines.length < meta.rows) lines.push(blank);
    return lines.join("\n");
  };
}
