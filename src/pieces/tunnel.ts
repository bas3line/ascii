/*
 * tunnel: the demo-scene tunnel. Each cell casts a ray down a tiled tube that
 * bends away out of sight, so the far end swings about, while the tiles wind
 * round it in a slow spiral and fade into the dark.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "tunnel",
  category: "effects",
  note: "flying down a tiled tube that bends and twists",
  cols: 64,
  rows: 24,
  fps: 30,
} satisfies Meta;

const RAMP = " .,:;-=+*#%@";
const F = 18; // focal length, in columns
const AROUND = 10; // tiles round the tube
const ALONG = 0.55; // tiles per unit of depth
const DIM = 0.35; // the dark tiles' share of the light ones
const MORTAR = 0.1; // the mortar's share of a light tile
const GAP = 0.07; // the most of a tile the mortar takes on each side
const SPEED = 2.4; // units of depth a second
const TWIST = 0.06; // turns of the tile pattern per unit of depth
const FOG = 2.8; // depth over which light falls by e
const BEND = 3; // depth over which the tube turns toward its far heading
const KEY = 0.12; // how much a lamp to the upper left favours the far wall
const SHARP = 0.7; // share of a cell's footprint the pattern is averaged over

// A square wave, and pulses of half-width g at the whole numbers, each
// averaged over a span w, so tiles smaller than a cell fade to an even grey.
const wrap = (x: number) => x - Math.floor(x);
const wave = (x: number, w: number) => (2 * (Math.abs(wrap((x - w / 2) / 2) - 0.5) - Math.abs(wrap((x + w / 2) / 2) - 0.5))) / w;
const ridge = (x: number, g: number) => Math.floor(x + g) * 2 * g + Math.min(wrap(x + g), 2 * g);
const pulse = (x: number, w: number, g: number) => (ridge(x + w / 2, g) - ridge(x - w / 2, g)) / w;

export default function tunnel(): Frame {
  const { cols, rows } = meta;
  const out: string[] = new Array(cols * rows);
  const W = cols + 1, H = rows + 1; // one sample more right and below, for each cell's footprint
  const U = new Float64Array(W * H), V = new Float64Array(W * H), Z = new Float64Array(W * H), L = new Float64Array(W * H);
  const TAU = 2 * Math.PI;
  const turn = (d: number) => d - AROUND * Math.round(d / AROUND); // going round, the seam is no jump

  return (t, { paper = false } = {}) => {
    // Where the far end points, as a slope off the view axis, on a slow loop.
    const ax = 0.42 * Math.sin(t * 0.55), ay = 0.26 * Math.sin(t * 0.9 + 1);
    const spin = t * 0.06;
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const sx = (c + 0.5 - cols / 2) / F;
        const sy = -((r + 0.5 - rows / 2) * 2) / F;
        // A ray hits the wall (radius 1) at the depth z where its offset from
        // the bent axis is 1. Solve by iteration: the axis at depth z leans
        // toward (ax, ay) by a share that grows with z.
        let z = 1 / Math.max(1e-3, Math.hypot(sx, sy)), dx = sx, dy = sy;
        for (let k = 0; k < 4; k++) {
          const lean = 1 - Math.exp(-z / BEND);
          dx = sx - ax * lean;
          dy = sy - ay * lean;
          z = Math.min(60, 1 / Math.max(1e-3, Math.hypot(dx, dy)));
        }
        const k = c + r * W;
        U[k] = (Math.atan2(dy, dx) / TAU + spin + z * TWIST) * AROUND;
        V[k] = z * ALONG + t * SPEED * ALONG;
        Z[k] = z;
        // Light falls off down the tube, and the wall facing the lamp is brighter.
        L[k] = Math.exp(-z / FOG) * (1 - KEY + KEY * (dx - dy) * z * Math.SQRT1_2);
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const k = c + r * W, z = Z[k];
        // How far the pattern moves across this cell, in tiles.
        const wu = SHARP * Math.max(Math.abs(turn(U[k + 1] - U[k])), Math.abs(turn(U[k + W] - U[k])), 0.01);
        const wv = SHARP * Math.max(Math.abs(V[k + 1] - V[k]), Math.abs(V[k + W] - V[k]), 0.01);
        // Light tiles and dark ones, set in mortar lines kept about a cell
        // wide on screen however near or far they are.
        const light = 0.5 - 0.5 * wave(U[k], wu) * wave(V[k], wv);
        const gu = Math.min(GAP, (z * AROUND) / (4 * Math.PI * F)), gv = Math.min(GAP, (z * z * ALONG) / F);
        const mortar = 1 - (1 - pulse(U[k], wu, gu)) * (1 - pulse(V[k], wv, gv));
        const b = ((DIM + (1 - DIM) * light) * (1 - mortar) + MORTAR * mortar) * L[k] * 1.25;
        const i = Math.min(RAMP.length - 1, Math.round(Math.max(0, b) ** 0.8 * (RAMP.length - 1)));
        out[c + r * cols] = RAMP[paper ? RAMP.length - 1 - i : i];
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) lines.push(out.slice(r * cols, (r + 1) * cols).join(""));
    return lines.join("\n");
  };
}
