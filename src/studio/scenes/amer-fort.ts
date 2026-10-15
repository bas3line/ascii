/*
 * scene: amer fort
 * Amer fort floodlit gold on its hill, mirrored in maota lake at night.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const amerFort: SceneSpec = {
  name: "amer fort",
  note: "amer fort floodlit gold on its hill, mirrored in maota lake at night",
  ground: "#060915",
  fps: 15,
  palette: [
    "#0a1230", "#101a40", "#16234f", "#1e2e62", "#283c78", "#364d8e", "#4a5f9f", "#6a7fb8",
    "#c9d4ee", "#eef1f8", "#fff6dc",
    "#3a220f", "#5a3415", "#7d4a1c", "#a06426", "#c27f32", "#dc9c44", "#ecb85c", "#f6d07e",
    "#ffe4a6", "#fff1cc",
    "#0b0f1c", "#121829", "#1a2236", "#2a2228",
    "#4a3a2c", "#4c6e34", "#6f9448", "#8fbf5a", "#b4dc7c", "#a08a62",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "night-sky",
      type: "sky",
      name: "Night Sky",
      enabled: true,
      params: {
        horizon: 52,
        sunPos: [100, 30],
        sunRadius: 0,
        glare: 0.4,
        haze: 0.2,
        stars: true,
        gradientTop: "#0a1230",
        gradientHorizon: "#c27f32",
        sunColor: "#ffe4a6",
      },
    },
    {
      id: "cloud-drift",
      type: "clouds",
      name: "Cloud Drift",
      enabled: true,
      params: {
        horizon: 52,
        coverage: 0.25,
        drift: 0.3,
        altitude: 1.0,
        density: 0.9,
        softness: 0.6,
        lit: 0.3,
        baseColor: "#121829",
        litColor: "#dc9c44",
      },
    },
    {
      id: "ramparts",
      type: "heightfield",
      name: "Ramparts",
      enabled: true,
      params: {
        horizon: 52,
        style: "city",
        peakHeight: 22,
        frequency: 0.04,
        roughness: 0.35,
        color: "#16234f",
        highlight: "#f6d07e",
      },
    },
    {
      id: "maota-lake",
      type: "water",
      name: "Maota Lake",
      enabled: true,
      params: {
        horizon: 54,
        waveSpeed: 0.8,
        waveChop: 0.1,
        sunColumn: 100,
        glitter: 1.0,
        deepColor: "#0a1230",
        reflectColor: "#dc9c44",
        crestColor: "#ffe4a6",
      },
    },
    {
      id: "garden-fireflies",
      type: "particles",
      name: "Garden Fireflies",
      enabled: true,
      params: {
        type: "fireflies",
        density: 50,
        fallSpeed: 0.5,
        wind: 0.1,
        color: "#fff6dc",
      },
    },
  ],
};