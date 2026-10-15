/*
 * scene: aurora fjord
 * Curtains of aurora ripple over a still fjord between snowy mountains, a red
 * cabin lit on the far shore, the water holding a broken shimmer of them.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const auroraFjord: SceneSpec = {
  name: "aurora fjord",
  note: "aurora curtains rippling over a still fjord, a cabin lit on the shore",
  ground: "#05080f",
  fps: 15,
  palette: [
    "#0b1322", "#101b30", "#16243f", "#1e3050", "#2a3f63",
    "#0e3a33", "#11573f", "#167a4c", "#22a05c", "#3ccb73", "#7cf0a0", "#c8ffdc",
    "#0f5f5c", "#16877f", "#2cb5a6", "#7fe6d6",
    "#2a1f52", "#432b78", "#6a3c9f", "#9558c6", "#c48ae4", "#363a72", "#4f5596", "#1b4f63",
    "#1a2236", "#283350", "#3b4a6e", "#566a92", "#7d91b8", "#a9bad9", "#d6e0f2", "#9fc9cf",
    "#0f1a1c", "#173128", "#24493a",
    "#4a1517", "#7c2420", "#b23a2a", "#d65aa8",
    "#ffd27c", "#ffb04a", "#fff2c4",
    "#eef3ff",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "aurora-sky",
      type: "sky",
      name: "Aurora Night Sky",
      enabled: true,
      params: {
        horizon: 62,
        sunPos: [0, 0],
        sunRadius: 0,
        glare: 0,
        haze: 0.2,
        stars: true,
        gradientTop: "#0b1322",
        gradientHorizon: "#2cb5a6",
        sunColor: "#eef3ff",
      },
    },
    {
      id: "aurora-curtains",
      type: "clouds",
      name: "Aurora Curtain Wash",
      enabled: true,
      params: {
        horizon: 62,
        coverage: 0.35,
        drift: 0.4,
        altitude: 1.1,
        density: 1.1,
        softness: 0.5,
        lit: 0.6,
        baseColor: "#2a3f63",
        litColor: "#7cf0a0",
      },
    },
    {
      id: "snowy-peaks",
      type: "heightfield",
      name: "Snowy Peaks",
      enabled: true,
      params: {
        horizon: 62,
        style: "peaks",
        peakHeight: 26,
        frequency: 0.04,
        roughness: 0.5,
        color: "#1a2236",
        highlight: "#a9bad9",
      },
    },
    {
      id: "pine-shore",
      type: "heightfield",
      name: "Pine Shore",
      enabled: true,
      params: {
        horizon: 62,
        style: "pines",
        peakHeight: 16,
        frequency: 0.05,
        roughness: 0.7,
        color: "#0f1a1c",
        highlight: "#173128",
      },
    },
    {
      id: "fjord-water",
      type: "water",
      name: "Still Fjord Waters",
      enabled: true,
      params: {
        horizon: 62,
        waveSpeed: 0.25,
        waveChop: 0.04,
        sunColumn: 100,
        glitter: 1.1,
        deepColor: "#0e3a33",
        reflectColor: "#2cb5a6",
        crestColor: "#7cf0a0",
      },
    },
  ],
};