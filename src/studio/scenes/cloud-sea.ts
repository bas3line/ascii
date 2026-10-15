/*
 * scene: cloud sea
 * Charcoal dusk above a drifting sea of orange cloud, the sun half sunk in it.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const cloudSea: SceneSpec = {
  name: "cloud sea",
  note: "the sun sinks into a drifting sea of orange cloud at dusk",
  ground: "#0e0e0f",
  fps: 15,
  palette: [
    "#0e0e0f", "#161617", "#1f1f20", "#2a2a2b", "#353536", "#404041", "#545456", "#6c6c6e", "#8a8a8c",
    "#a39a94", "#2c211c", "#43302a", "#5e3c2a", "#7c4826", "#9c521f",
    "#c2601c", "#dc6f1e", "#f38020", "#f6922e", "#faae40", "#fbbd5c", "#fccb7c", "#fdda9e", "#feeac4", "#fff6e6",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "coal-dusk-sky",
      type: "sky",
      name: "Charcoal Dusk",
      enabled: true,
      params: {
        horizon: 40,
        sunPos: [150, 35.5],
        sunRadius: 9,
        glare: 1.15,
        haze: 0.25,
        stars: false,
        gradientTop: "#161617",
        gradientHorizon: "#f38020",
        sunColor: "#fff6e6",
      },
    },
    {
      id: "cloud-billows",
      type: "clouds",
      name: "Tangerine Billows",
      enabled: true,
      params: {
        horizon: 40,
        coverage: 0.6,
        drift: 0.8,
        altitude: 1.3,
        density: 1.5,
        softness: 0.5,
        lit: 0.7,
        baseColor: "#2c211c",
        litColor: "#faae40",
      },
    },
    {
      id: "cloud-sea-plane",
      type: "water",
      name: "Drifting Cloud Sea",
      enabled: true,
      params: {
        horizon: 40,
        waveSpeed: 0.6,
        waveChop: 0.05,
        sunColumn: 150,
        glitter: 1.3,
        deepColor: "#0e0e0f",
        reflectColor: "#f6922e",
        crestColor: "#fff6e6",
      },
    },
  ],
};