/*
 * form-controls: a settings form drawn the way a terminal app draws one. A
 * focus marker tabs down through a text input, a select, radio buttons, a
 * checkbox, a switch and a slider, changes each, saves, then changes them back.
 */
import type { Frame, Meta } from "../types.ts";

export interface FormControlsOptions {
  [key: string]: unknown;
  title: string;
}

export const meta = {
  name: "form controls",
  category: "ui",
  note: "a terminal style form being filled in, field by field",
  cols: 54,
  rows: 16,
  fps: 15,
  options: { title: "preferences" },
} satisfies Meta<FormControlsOptions>;

const EMAILS = ["you@example.com", "team@example.com"];
const UNITS = ["metric", "imperial"];
const THEMES = ["light", "dark", "system"];
const VOLUME = [40, 75];
const LABEL = 4, FIELD = 14, WIDE = 32; // columns: labels, controls, input width inside its brackets
const RIGHT = FIELD + WIDE + 4; // one past the right edge every control lines up on
const TRACK = 30; // slider cells

interface State {
  focus: number;
  email: string;
  typed: number;
  unit: number;
  open: boolean;
  hi: number;
  theme: number;
  mentions: boolean;
  knob: number;
  volume: number;
  pressed: boolean;
  saved: boolean;
}

// The tour of the form as timed changes to its state. Two passes, the
// second undoing the first, so the loop closes on the starting state.
function script() {
  const ev: [number, (s: State) => void][] = [];
  let T = 0, start = 0;
  const at = (dt: number, fn: (s: State) => void) => ev.push([(T += dt), fn]);
  for (const b of [1, 0]) {
    const a = 1 - b;
    at(0.35, (s) => (s.focus = 0));
    at(0.3, (s) => ((s.email = ""), (s.typed = T)));
    for (let i = 1; i <= EMAILS[b].length; i++) {
      const text = EMAILS[b].slice(0, i), when = T + 0.07;
      at(0.07, (s) => ((s.email = text), (s.typed = when)));
    }
    if (b) start = T + 0.2;
    at(0.9, (s) => (s.focus = 1));
    at(0.3, (s) => ((s.open = true), (s.hi = a)));
    at(0.4, (s) => (s.hi = b));
    at(0.35, (s) => ((s.unit = b), (s.open = false)));
    at(0.45, (s) => (s.focus = 2));
    at(0.35, (s) => (s.theme = b ? 1 : 0));
    at(0.45, (s) => (s.focus = 3));
    at(0.35, (s) => (s.mentions = !!b));
    at(0.45, (s) => (s.focus = 4));
    for (let k = 1; k <= 4; k++) at(k === 1 ? 0.35 : 0.07, (s) => (s.knob = b ? k : 4 - k));
    at(0.45, (s) => (s.focus = 5));
    for (let k = 1; k <= 7; k++) {
      const v = VOLUME[a] + ((VOLUME[b] - VOLUME[a]) * k) / 7;
      at(k === 1 ? 0.35 : 0.07, (s) => (s.volume = v));
    }
    at(0.45, (s) => (s.focus = 6));
    at(0.4, (s) => (s.pressed = true));
    at(0.18, (s) => ((s.pressed = false), (s.saved = true)));
    at(1.3, (s) => (s.saved = false));
  }
  return { ev, total: T + 0.4, start };
}

export default function formControls({ title = "preferences" }: Partial<FormControlsOptions> = {}): Frame {
  const { cols, rows } = meta;
  const { ev, total, start } = script();
  const grid = Array.from({ length: rows }, () => new Array<string>(cols));
  const text = (r: number, c: number, s: string) => {
    for (let i = 0; i < s.length && c + i < cols - 1; i++) grid[r][c + i] = s[i];
  };

  return (t) => {
    const p = (t + start) % total;
    const s: State = { focus: 6, email: EMAILS[0], typed: -9, unit: 0, open: false, hi: 0, theme: 0, mentions: false, knob: 0, volume: VOLUME[0], pressed: false, saved: false };
    for (const [when, fn] of ev) {
      if (when > p) break;
      fn(s);
    }

    for (const row of grid) row.fill(" ");
    const name = ` ${title} `;
    for (let c = 1; c < cols - 1; c++) grid[0][c] = grid[rows - 1][c] = "─";
    for (let r = 1; r < rows - 1; r++) grid[r][0] = grid[r][cols - 1] = "│";
    grid[0][0] = "╭";
    grid[0][cols - 1] = "╮";
    grid[rows - 1][0] = "╰";
    grid[rows - 1][cols - 1] = "╯";
    text(0, 2, name);
    const keys = " tab next · space change · enter save ";
    text(rows - 1, cols - 2 - keys.length, keys);

    const fields = ["email", "units", "theme", "notify", "sync", "volume"];
    fields.forEach((f, i) => {
      text(2 + 2 * i, LABEL, f);
      if (s.focus === i) text(2 + 2 * i, LABEL - 2, ">");
    });

    // The caret holds while keys are coming, then blinks.
    const since = p - s.typed;
    const caret = s.focus === 0 && (since < 0.4 || Math.floor((since - 0.4) / 0.5) % 2 === 1) ? "█" : " ";
    text(2, FIELD, "[ " + (s.email + caret).padEnd(WIDE) + " ]");

    text(4, FIELD, "[ " + UNITS[s.unit].padEnd(WIDE - 1) + (s.open ? "^" : "v") + " ]");

    text(6, FIELD, THEMES.map((th, i) => (s.theme === i ? "(*) " : "( ) ") + th).join("   "));
    text(8, FIELD, "[x] replies   " + (s.mentions ? "[x]" : "[ ]") + " mentions");

    // A switch: the knob slides along a shaded track, filling it behind.
    let sw = "▕";
    for (let i = 0; i < 6; i++) sw += i < s.knob ? "▒" : i < s.knob + 2 ? "█" : "░";
    text(10, FIELD, sw + "▏ " + (s.knob === 4 ? "on" : "off"));

    const k = Math.round((s.volume / 100) * (TRACK - 1));
    let track = "";
    for (let i = 0; i < TRACK; i++) track += i < k ? "━" : i === k ? "█" : "─";
    text(12, FIELD, track + String(Math.round(s.volume)).padStart(5) + "%");

    // Buttons at the right, the last one pressed with a fill.
    const save = s.pressed ? "[▒▒save▒▒]" : "[  save  ]";
    const bc = RIGHT - 10;
    text(14, bc - 13, "[ cancel ]");
    text(14, bc, save);
    if (s.focus === 6) text(14, bc - 1, ">");
    if (s.saved) text(14, LABEL, "saved");

    // The select's list drops over the rows beneath it.
    if (s.open) {
      const w = RIGHT - FIELD;
      text(5, FIELD, "┌" + "─".repeat(w - 2) + "┐");
      UNITS.forEach((u, i) => text(6 + i, FIELD, "│" + ((s.hi === i ? " > " : "   ") + u).padEnd(w - 2) + "│"));
      text(8, FIELD, "└" + "─".repeat(w - 2) + "┘");
    }
    return grid.map((row) => row.join("")).join("\n");
  };
}
