/*
 * scene: deep reef
 * Light shafts fan from a bright surface blaze, kelp swings in the swell and a
 * school of fish wheels over a sand floor strung with caustics.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const deepReef: SceneSpec = {
  name: "deep reef",
  note: "light shafts, swaying kelp and a turning school of fish over a reef",
  ground: "#03101a",
  fps: 15,
  palette: [
    "#114a66", "#165c78", "#1d708a", "#27869b", "#3a9fae", "#58b9c0", "#80d2d2", "#b0e8e2", "#e2fbf5",
    "#5e6b62", "#87927f", "#aab39a", "#cfd2b4",
    "#38461a", "#5a6420", "#857f2a", "#b0a03c", "#d6c25a", "#efe08e",
    "#8e3355", "#c4506a", "#e0786e", "#f0a070",
    "#6a3a78", "#9a5aa8", "#c88ad0",
    "#6f8a98", "#9fb8c6", "#cfe3ea",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "surface-blaze",
      type: "sky",
      name: "Rippled Surface Light",
      enabled: true,
      params: {
        horizon: 15,
        sunPos: [136, 7],
        sunRadius: 6,
        glare: 1.2,
        haze: 0.1,
        stars: false,
        gradientTop: "#114a66",
        gradientHorizon: "#80d2d2",
        sunColor: "#e2fbf5",
      },
    },
    {
      id: "reef-water",
      type: "water",
      name: "Deep Reef Water",
      enabled: true,
      params: {
        horizon: 15,
        waveSpeed: 0.8,
        waveChop: 0.06,
        sunColumn: 136,
        glitter: 1.0,
        deepColor: "#114a66",
        reflectColor: "#80d2d2",
        crestColor: "#e2fbf5",
      },
    },
    {
      id: "sand-floor",
      type: "heightfield",
      name: "Caustic Sand Floor",
      enabled: true,
      params: {
        horizon: 80,
        style: "dunes",
        peakHeight: 16,
        frequency: 0.05,
        roughness: 0.5,
        color: "#87927f",
        highlight: "#efe08e",
      },
    },
    {
      id: "fish-school",
      type: "particles",
      name: "Turning Fish School",
      enabled: true,
      params: {
        type: "fireflies",
        density: 130,
        fallSpeed: 0.5,
        wind: 0.9,
        color: "#e0786e",
      },
    },
    {
      id: "rising-bubbles",
      type: "particles",
      name: "Rising Bubbles",
      enabled: true,
      params: {
        type: "embers",
        density: 70,
        fallSpeed: 0.8,
        wind: 0.1,
        color: "#e2fbf5",
      },
    },
  ],
};