/*
 * scene: night coast
 * A lighthouse turns its beam on a pine headland under moonlit clouds, the
 * dark sea carrying the moon's road and the lamp's reflection.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const nightCoast: SceneSpec = {
  name: "night coast",
  note: "a lighthouse turning its beam under moonlit clouds over a dark sea",
  ground: "#080b12",
  fps: 15,
  palette: [
    "#15203d", "#1b2a50", "#223463", "#2b4077", "#364e8b", "#445f9f", "#5874b2", "#7089c0",
    "#8a9cc4", "#a3b1cf", "#bec9dc", "#d8dfea", "#eef1f6", "#f7f8fc",
    "#ffe9ae", "#ffd27c", "#f3a64a", "#c46c2d",
    "#121c1b", "#182724", "#203530", "#2c473d", "#3c5c4c",
    "#232a36", "#363e4c", "#555d6c", "#2a3550", "#3a4868",
    "#9c4136", "#ff5d4d",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "moonlit-sky",
      type: "sky",
      name: "Moonlit Night Sky",
      enabled: true,
      params: {
        horizon: 60,
        sunPos: [150, 19],
        sunRadius: 4.5,
        glare: 0.6,
        haze: 0.15,
        stars: true,
        gradientTop: "#15203d",
        gradientHorizon: "#bec9dc",
        sunColor: "#f7f8fc",
      },
    },
    {
      id: "moonlit-clouds",
      type: "clouds",
      name: "Moonlit Cloud Deck",
      enabled: true,
      params: {
        horizon: 60,
        coverage: 0.5,
        drift: 0.6,
        altitude: 1.0,
        density: 1.0,
        softness: 0.6,
        lit: 0.5,
        baseColor: "#2a3550",
        litColor: "#d8dfea",
      },
    },
    {
      id: "distant-headland",
      type: "heightfield",
      name: "Distant Headland",
      enabled: true,
      params: {
        horizon: 60,
        style: "hills",
        peakHeight: 10,
        frequency: 0.06,
        roughness: 0.5,
        color: "#232a36",
        highlight: "#363e4c",
      },
    },
    {
      id: "pine-headland",
      type: "heightfield",
      name: "Pine Headland",
      enabled: true,
      params: {
        horizon: 60,
        style: "pines",
        peakHeight: 18,
        frequency: 0.05,
        roughness: 0.7,
        color: "#121c1b",
        highlight: "#3c5c4c",
      },
    },
    {
      id: "dark-sea",
      type: "water",
      name: "Moonlit Dark Sea",
      enabled: true,
      params: {
        horizon: 60,
        waveSpeed: 1.0,
        waveChop: 0.08,
        sunColumn: 150,
        glitter: 2.0,
        deepColor: "#121c1b",
        reflectColor: "#bec9dc",
        crestColor: "#f7f8fc",
      },
    },
  ],
};