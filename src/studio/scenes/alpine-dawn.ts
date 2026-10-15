/*
 * scene: alpine dawn
 * Snow peaks catch the first pink light above a still, misty mountain lake.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const alpineDawn: SceneSpec = {
  name: "alpine dawn",
  note: "snow peaks catching first light above a still, misty mountain lake",
  ground: "#090c18",
  fps: 15,
  palette: [
    "#0e1430", "#151d40", "#1d2752", "#263365", "#314179", "#3e508c", "#4f62a0", "#6577b3", "#8090c4", "#9eaad3", "#bec6e2",
    "#4b3e6c", "#6a5482", "#8c6a92", "#b0829c", "#cf96a4",
    "#e8a9a8", "#f5bcaa", "#ffd0b0", "#ffe2c2", "#fff1e0", "#fdfaf6",
    "#ffc887", "#f7a965", "#f2a08f", "#e58a87", "#f8b59d", "#d97b7e",
    "#7a4c4a", "#a5654f", "#523a4a",
    "#1b2034", "#262c45", "#363c59",
    "#0a1418", "#0f1f24", "#162a2f", "#203a3c",
    "#a3a7c6", "#c6c3d8", "#e0d4dc",
    "#5a4f7e", "#7b6c9c", "#9a8cb6", "#b8a8c8", "#d8bccb",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "dawn-sky",
      type: "sky",
      name: "Dawn Atmosphere",
      enabled: true,
      params: {
        horizon: 52,
        sunPos: [138, 50],
        sunRadius: 7,
        glare: 0.9,
        haze: 0.2,
        stars: false,
        gradientTop: "#151d40",
        gradientHorizon: "#f5bcaa",
        sunColor: "#fff1e0",
      },
    },
    {
      id: "dawn-mist",
      type: "clouds",
      name: "Dawn Mist",
      enabled: true,
      params: {
        horizon: 52,
        coverage: 0.25,
        drift: 0.6,
        altitude: 0.9,
        density: 0.9,
        softness: 0.6,
        lit: 0.5,
        baseColor: "#263365",
        litColor: "#ffd0b0",
      },
    },
    {
      id: "snow-ridge",
      type: "heightfield",
      name: "Snow Ridge",
      enabled: true,
      params: {
        horizon: 52,
        style: "peaks",
        peakHeight: 24,
        frequency: 0.05,
        roughness: 0.55,
        color: "#263365",
        highlight: "#f5bcaa",
      },
    },
    {
      id: "mirror-lake",
      type: "water",
      name: "Mirror Lake",
      enabled: true,
      params: {
        horizon: 52,
        waveSpeed: 0.35,
        waveChop: 0.04,
        sunColumn: 138,
        glitter: 0.7,
        deepColor: "#0a1418",
        reflectColor: "#f5bcaa",
        crestColor: "#ffe2c2",
      },
    },
  ],
};