/*
 * boot-log: a machine starting up. The firmware tests its memory and probes its
 * devices, the kernel prints timestamped lines, services start, and a login waits.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "boot log",
  category: "ui",
  note: "a self test counts memory, then the boot log scrolls by",
  cols: 64,
  rows: 16,
  fps: 15,
} satisfies Meta;

const W = 62; // text width inside a one-column margin
const MEMORY = 16384; // MB
const MEM_AT = 0.4; // when the memory test starts
const TEST = 2; // seconds it takes
const SPIN = "|/-\\";
const EIGHTHS = "░▏▎▍▌▋▊▉";

// Kernel lines: seconds since the previous line on the kernel's clock, then the text.
const KERNEL: [number, string][] = [
  [0, "kernel 6.8.0 starting on 8 cpus"],
  [0, "command line: root=/dev/sda2 ro quiet"],
  [0.004, "memory: 16384 MB available, 412 MB reserved"],
  [0.077, "smp: brought up 1 node, 8 cpus"],
  [0.082, "pci: probing bus 0000:00"],
  [0.047, "pci 0000:00:17.0: sata controller, 6 ports"],
  [0.087, "usb 1-1: new high speed device, number 2"],
  [0.022, "usb 1-4: new full speed device, number 3"],
  [0.084, "sd 0:0:0:0: [sda] 1000215216 sectors (512 GB)"],
  [0.002, " sda: sda1 sda2"],
  [0.107, "eth0: link up, 1000 Mb/s, full duplex"],
  [0.129, "ext4: mounted sda2 read-only"],
  [0.062, "init: running /sbin/init"],
];
// Service lines: seconds after the previous line, then the text. A third value
// makes it a start job that spins that long before it lands. The last is the login.
const SERVICES: [number, string, number?][] = [
  [0.35, "[  OK  ] mounted root file system"],
  [0.12, "[  OK  ] started file system check on sda1"],
  [0.08, "[  OK  ] reached target local file systems"],
  [0.2, "[  OK  ] started journal service"],
  [0.1, "[  OK  ] started device manager"],
  [0.06, "[  OK  ] created runtime directories"],
  [0.15, "[  OK  ] started load kernel modules"],
  [0.25, "[ WARN ] clock not synced, using hardware time"],
  [0.2, "[  OK  ] started system logger"],
  [0.08, "[  OK  ] reached target sockets"],
  [0.1, "[  OK  ] reached target basic system"],
  [0.15, "[  OK  ] finished waiting for network", 2.6],
  [0.1, "[  OK  ] reached target network"],
  [0.25, "[  OK  ] synced clock to network time"],
  [0.1, "[  OK  ] started secure shell server"],
  [0.08, "[  OK  ] started job scheduler"],
  [0.1, "[  OK  ] started print spooler"],
  [0.3, "[  OK  ] reached target multi-user system"],
  [0.5, ""],
  [0.1, "node-1 login: "],
];
const WAIT = 3.5; // seconds at the login prompt before the next boot

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function bootLog(): Frame {
  const { cols, rows } = meta;
  const rand = mulberry32(11);

  // A self test row: a label, its detail, and a status at the right edge.
  const row = (label: string, detail: string, status = "") => {
    const left = label.padEnd(11) + detail;
    return left + status.padStart(W - left.length);
  };
  // A device probe spins until it resolves at `done`.
  const probe = (label: string, detail: string, status: string, done: number) => (now: number) =>
    now >= done ? row(label, detail, status) : row(label, "detecting " + SPIN[Math.floor((now + done) * 10) % 4]);
  const tested = (now: number) => Math.min(1, Math.max(0, (now - MEM_AT) / TEST));

  // Each entry: when it appears, and how it reads at a given moment.
  const entries: { at: number; text: (now: number) => string }[] = [];
  let at = 0;
  const put = (text: string | ((now: number) => string)) => entries.push({ at, text: typeof text === "string" ? () => text : text });

  at = 0.12; put(row("system firmware 2.31.0", "", "self test"));
  at += 0.04; put("─".repeat(W));
  at += 0.04; put(row("cpu", "4 cores, 8 threads at 2.40 GHz", "ok"));
  at += 0.04; put(row("cache", "l1 256 KB   l2 2 MB   l3 8 MB", "ok"));
  at += 0.04;
  put((now) => {
    const f = tested(now);
    const mb = Math.floor(f * MEMORY);
    return row("memory", String(mb).padStart(5) + " MB of " + MEMORY + " MB", f < 1 ? "testing" : "ok");
  });
  // The test's progress, the address it has reached, and a percentage.
  put((now) => {
    const f = tested(now);
    const fill = f * 32;
    const full = Math.floor(fill);
    const bar = ("█".repeat(full) + (full < 32 ? EIGHTHS[Math.floor((fill - full) * 8)] : "")).padEnd(32, "░");
    const top = MEMORY * 1048576;
    const addr = f < 1 ? Math.floor((f * top) / 4096) * 4096 : top - 1;
    const hex = "0x" + addr.toString(16).toUpperCase().padStart(9, "0");
    return " ".repeat(11) + bar + "  " + hex + (Math.floor(f * 100) + "%").padStart(W - 56);
  });
  at += 0.04; put(row("display", "1920 x 1080 at 60 Hz", "ok"));
  at += 0.04; put(probe("storage", "sata 0: disk 0, 512 GB", "ok", 1.3));
  at += 0.04; put(probe("usb", "2 controllers, 2 devices", "ok", 1.9));
  at += 0.04; put(probe("network", "1 port, 1000 Mb/s", "link up", 2.2));
  at += 0.04; put(probe("sensors", "cpu 41°C   board 33°C   fan 2400 rpm", "ok", 0.95));
  at += 0.04; put(row("boot order", "disk 0, usb, network"));
  at += 0.04; put("─".repeat(W));
  at += 0.04; put("F2 setup    F12 boot menu    esc skip memory test");
  at = MEM_AT + TEST + 0.2; put("");
  at += 0.05; put("booting from disk 0");
  at += 0.2; put("loading kernel 6.8.0 ...");

  // The kernel's burst plays at two thirds speed so it reads as a fast scroll.
  at += 0.3;
  let stamp = 0;
  for (const [gap, text] of KERNEL) {
    stamp += gap;
    at += gap * 1.5;
    const s = stamp ? stamp + rand() * 0.0009 : 0;
    put("[" + s.toFixed(6).padStart(12) + "] " + text);
  }

  for (const [gap, text, spin] of SERVICES) {
    at += gap;
    if (spin) {
      const from = at;
      put((now) => {
        const age = now - from;
        if (age >= spin) return text;
        // Three stars sweep back and forth inside the brackets. The job shows
        // itself once it has run for 5s, so its clock starts there.
        const k = Math.floor(age * 8) % 6;
        const p = k < 4 ? k : 6 - k;
        const stars = (" ".repeat(p) + "***").padEnd(6);
        return "[" + stars + "] a start job is running for network (" + Math.floor(age + 5) + "s / 1min 30s)";
      });
      at += spin;
    } else put(text);
  }
  const login = at;
  const period = login + WAIT;
  // Frame 0 is the finished boot at the login prompt, a moment before it restarts.
  const start = period - 0.25;

  return (t) => {
    const now = (t + start) % period;
    const lines: string[] = [];
    for (const e of entries) if (e.at <= now) lines.push(e.text(now));
    // The cursor blinks after the login prompt, or at the top of the blank screen.
    if (now >= login) lines[lines.length - 1] += (now - login) % 1 < 0.6 ? "_" : "";
    else if (!lines.length) lines.push("_");
    const top = Math.max(0, lines.length - rows);
    const out: string[] = [];
    for (let r = 0; r < rows; r++) out.push((" " + (lines[top + r] ?? "")).padEnd(cols).slice(0, cols));
    return out.join("\n");
  };
}
