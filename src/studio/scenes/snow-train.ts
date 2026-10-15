/*
 * scene: snow train
 * A lit train crosses a snowy stone viaduct at night as snow falls.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const snowTrain: SceneSpec = {
  name: "snow train",
  note: "a lit train crossing a snowy stone viaduct at night as snow falls",
  ground: "#070b16",
  fps: 15,
  palette: [
    "#0c1428", "#121d38", "#19284a", "#22345e", "#2d4374", "#3b548a", "#4d68a0", "#6480b4",
    "#7f99c6", "#9db3d6", "#bccde4", "#d9e4f1", "#f1f5fb",
    "#ffe7b0", "#ffc56e", "#f29a3c", "#b8642a", "#6e3a22",
    "#3e1420", "#6a1e26", "#9a2c2e", "#ff4a3d",
    "#0b1a1e", "#11262a", "#1a3436", "#26474a",
    "#1e2230", "#2c3242", "#3e4658", "#586276", "#7c8698",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "winter-night",
      type: "sky",
      name: "Winter Night",
      enabled: true,
      params: {
        horizon: 56,
        sunPos: [168, 28],
        sunRadius: 7,
        glare: 0.5,
        haze: 0.15,
        stars: true,
        gradientTop: "#0c1428",
        gradientHorizon: "#1a3436",
        sunColor: "#ffe7b0",
      },
    },
    {
      id: "moon-cloud",
      type: "clouds",
      name: "Thin Cloud",
      enabled: true,
      params: {
        horizon: 56,
        coverage: 0.2,
        drift: 0.6,
        altitude: 1.0,
        density: 0.8,
        softness: 0.6,
        lit: 0.25,
        baseColor: "#1e2230",
        litColor: "#ffc56e",
      },
    },
    {
      id: "snow-pines",
      type: "heightfield",
      name: "Snow Pines",
      enabled: true,
      params: {
        horizon: 58,
        style: "pines",
        peakHeight: 16,
        frequency: 0.06,
        roughness: 0.45,
        color: "#0b1a1e",
        highlight: "#7f99c6",
      },
    },
    {
      id: "frozen-river",
      type: "water",
      name: "Frozen River",
      enabled: true,
      params: {
        horizon: 60,
        waveSpeed: 0.25,
        waveChop: 0.04,
        sunColumn: 168,
        glitter: 0.5,
        deepColor: "#0b1a1e",
        reflectColor: "#ffc56e",
        crestColor: "#ffe7b0",
      },
    },
    {
      id: "snow-fall",
      type: "particles",
      name: "Snowfall",
      enabled: true,
      params: {
        type: "snow",
        density: 220,
        fallSpeed: 1.0,
        wind: 0.25,
        color: "#f1f5fb",
      },
    },
  ],
};