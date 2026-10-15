/*
 * scene: jungle falls
 * A tiered waterfall in a rainforest gorge, spray, a rainbow and macaws.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const jungleFalls: SceneSpec = {
  name: "jungle falls",
  note: "a tiered waterfall in a rainforest gorge, spray, a rainbow and macaws",
  ground: "#07130d",
  fps: 15,
  palette: [
    "#0d2616", "#173d1f", "#225a26", "#2f7a2c", "#45983a", "#6bb544", "#9ccf55", "#c9e27a",
    "#2a3436", "#465256", "#6c7676", "#9aa29c",
    "#f7fcfc", "#d6eef0", "#a8dcdf", "#6cc5c6", "#35aeb0", "#1d8b92", "#11636c",
    "#c9e6ef", "#93c9e2", "#fff1c2", "#f2cf6b",
    "#e5483b", "#f08c34", "#3d84d6", "#8b6bd0", "#a92d25",
    "#5b8f7a", "#8fb8a0", "#5e4a36",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "canopy-sky",
      type: "sky",
      name: "Canopy Sky",
      enabled: true,
      params: {
        horizon: 38,
        sunPos: [32, 22],
        sunRadius: 7,
        glare: 1.1,
        haze: 0.2,
        stars: false,
        gradientTop: "#465256",
        gradientHorizon: "#a8dcdf",
        sunColor: "#fff1c2",
      },
    },
    {
      id: "spray-wisp",
      type: "clouds",
      name: "Spray Wisp",
      enabled: true,
      params: {
        horizon: 38,
        coverage: 0.15,
        drift: 0.3,
        altitude: 0.9,
        density: 0.8,
        softness: 0.6,
        lit: 0.35,
        baseColor: "#9aa29c",
        litColor: "#fff1c2",
      },
    },
    {
      id: "jungle-walls",
      type: "heightfield",
      name: "Jungle Walls",
      enabled: true,
      params: {
        horizon: 44,
        style: "pines",
        peakHeight: 12,
        frequency: 0.08,
        roughness: 0.5,
        color: "#173d1f",
        highlight: "#45983a",
      },
    },
    {
      id: "falls-pool",
      type: "water",
      name: "Falls Pool",
      enabled: true,
      params: {
        horizon: 46,
        waveSpeed: 0.7,
        waveChop: 0.12,
        sunColumn: 32,
        glitter: 1.4,
        deepColor: "#11636c",
        reflectColor: "#35aeb0",
        crestColor: "#f7fcfc",
      },
    },
    {
      id: "falls-spray",
      type: "particles",
      name: "Falls Spray",
      enabled: true,
      params: {
        type: "rain",
        density: 50,
        fallSpeed: 1.2,
        wind: 0.1,
        color: "#d6eef0",
      },
    },
  ],
};