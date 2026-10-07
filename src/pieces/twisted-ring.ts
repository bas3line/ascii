/*
 * twisted-ring: a ring of square section that twists three quarters of a turn
 * in one lap, so its four faces join into one. The faces are flat shaded and
 * the corners between them inked as lines. Turned about its own axis.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "twisted ring",
  category: "shapes",
  note: "a square ring twisted three quarters, so it has one face",
  cols: 46,
  rows: 21,
  fps: 30,
} satisfies Meta;

const FACE = ".:+*#@"; // a face's mark by its light, least to most
const ASPECT = 0.5; // cell width over cell height
const R = 0.75, AP = 0.22; // ring radius, and the section's apothem
const TWIST = 3; // quarter turns of the section in one lap; any odd number gives one face
const TILT = 0.92, EYE = 6, SCALE = 9.2; // TILT from edge on; SCALE: rows per unit at the ring's centre
const LIFT = 0.5; // rows the ring sits above centre, since its near side looks bigger
const SPIN = 0.32, P0 = 0.4; // radians a second, and the angle at t = 0
const LAPS = 720, ACROSS = 14; // samples round the ring and across each face

const unit = (v: number[]) => v.map((c) => c / Math.hypot(...v));
const LIGHT = unit([-0.5, 0.75, 0.6]);
const HALF = unit([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);

export default function twistedRing(): Frame {
  const { cols, rows } = meta;
  const W = cols * 2, H = rows * 2; // two samples a cell each way
  const depth = new Float32Array(W * H);
  const tone = new Uint8Array(W * H);
  const ink = new Array<string>(cols * rows); // a corner's line through a cell, if one shows
  const near = new Float32Array(cols * rows);
  const ct = Math.cos(TILT), st = Math.sin(TILT);
  const lines = new Array<string>(rows);
  const P = [0, 0, 0, 0, 0, 0], Q = [0, 0, 0];

  return (t, { paper = false } = {}) => {
    const p = P0 + SPIN * t, cs = Math.cos(p), ss = Math.sin(p);
    // A point on the ring, at angle a round it and (qr, qy) in its section,
    // spun about the axis and tipped toward the eye: its place on the sample
    // grid, its nearness, and where it is in the world.
    const place = (ca: number, sa: number, qr: number, qy: number) => {
      const x = (R + qr) * ca, z = (R + qr) * sa;
      const wx = cs * x + ss * z, z1 = -ss * x + cs * z;
      const wy = ct * qy - st * z1, wz = st * qy + ct * z1;
      const ooz = 1 / (EYE - wz), k = SCALE * EYE * ooz;
      P[0] = 2 * (cols / 2 + (k * wx) / ASPECT);
      P[1] = 2 * (rows / 2 - LIFT - k * wy);
      (P[2] = ooz), (P[3] = wx), (P[4] = wy), (P[5] = wz);
    };
    // The world normal of the face whose normal makes angle n in the section
    // at angle a round the ring, and whether it turns toward the eye from P.
    const normal = (ca: number, sa: number, n: number) => {
      const ox = Math.cos(n) * ca, oz = Math.cos(n) * sa, z1 = -ss * ox + cs * oz;
      (Q[0] = cs * ox + ss * oz), (Q[1] = ct * Math.sin(n) - st * z1), (Q[2] = st * Math.sin(n) + ct * z1);
    };
    const toward = () => -Q[0] * P[3] - Q[1] * P[4] + Q[2] * (EYE - P[5]) > 0;

    depth.fill(0);
    for (let i = 0; i < LAPS; i++) {
      const a = (i / LAPS) * 2 * Math.PI - Math.PI, ca = Math.cos(a), sa = Math.sin(a);
      for (let f = 0; f < 4; f++) {
        // Face f's normal, in the plane of the section, turns as it goes round.
        const n = (TWIST * a) / 4 + ((2 * f + 1) * Math.PI) / 4, cn = Math.cos(n), sn = Math.sin(n);
        normal(ca, sa, n);
        // One mark across the face's width, in four flat steps of light, and
        // the top one only where the face turns the light straight back.
        const d = Math.max(0, Q[0] * LIGHT[0] + Q[1] * LIGHT[1] + Q[2] * LIGHT[2]);
        const h = Q[0] * HALF[0] + Q[1] * HALF[1] + Q[2] * HALF[2];
        const k = h > 0.998 ? 5 : d < 0.2 ? 0 : d < 0.45 ? 1 : d < 0.7 ? 2 : d < 0.9 ? 3 : 4;
        for (let j = 0; j <= ACROSS; j++) {
          const s = (2 * j) / ACROSS - 1;
          place(ca, sa, AP * (cn - s * sn), AP * (sn + s * cn));
          if (!toward()) continue;
          const c = Math.floor(P[0]), r = Math.floor(P[1]);
          if (c < 0 || c >= W || r < 0 || r >= H) continue;
          const o = r * W + c;
          if (P[2] > depth[o]) (depth[o] = P[2]), (tone[o] = k);
        }
      }
    }

    // The four corners, each a line round the ring, inked where both faces
    // that meet there turn to the eye and nothing nearer covers it, with the
    // stroke that follows its way across the cell.
    ink.fill("");
    near.fill(0);
    const D = AP * Math.SQRT2, N = LAPS * 2;
    for (let f = 0; f < 4; f++) {
      let px = 0, py = 0;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * 2 * Math.PI - Math.PI, m = (TWIST * a) / 4 + (f * Math.PI) / 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        place(ca, sa, D * Math.cos(m), D * Math.sin(m));
        const dx = P[0] - px, dy = P[1] - py;
        (px = P[0]), (py = P[1]);
        if (!i) continue;
        normal(ca, sa, m - Math.PI / 4);
        if (!toward()) continue;
        normal(ca, sa, m + Math.PI / 4);
        if (!toward()) continue;
        const c = Math.floor(px), r = Math.floor(py), o = r * W + c;
        if (c < 0 || c >= W || r < 0 || r >= H || !depth[o] || P[2] < depth[o] - 0.0025) continue;
        const cell = (r >> 1) * cols + (c >> 1);
        if (P[2] <= near[cell]) continue;
        near[cell] = P[2];
        const ang = Math.atan2(Math.abs(dy), Math.abs(dx) * ASPECT);
        ink[cell] = ang < 0.42 ? "-" : ang > 1.2 ? "|" : dx * dy < 0 ? "/" : "\\";
      }
    }

    // Each cell takes the nearest of its samples, or a corner's line.
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        if (ink[r * cols + c]) {
          line += ink[r * cols + c];
          continue;
        }
        const o = 2 * r * W + 2 * c;
        let hits = 0, best = -1;
        for (const q of [o, o + 1, o + W, o + W + 1]) {
          if (!depth[q]) continue;
          hits++;
          if (best < 0 || depth[q] > depth[best]) best = q;
        }
        line += hits < 2 ? " " : FACE[paper ? FACE.length - 1 - tone[best] : tone[best]];
      }
      lines[r] = line;
    }
    return lines.join("\n");
  };
}
