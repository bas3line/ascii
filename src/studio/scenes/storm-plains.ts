/*
 * scene: storm plains
 * An anvil thunderhead at dusk flickering over a wheat field.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const stormPlains: SceneSpec = {
  name: "storm plains",
  note: "an anvil thunderhead at dusk flickering over a wheat field",
  ground: "#0b0912",
  fps: 15,
  palette: [
    "#0f0c20", "#141029", "#1c1638", "#261c4a", "#32235a", "#40306c", "#53407e", "#6a5590", "#8670a6",
    "#7a6288", "#9a7890", "#b98e94",
    "#e6a890", "#f2bca8", "#f7d6a8", "#fbe8c6",
    "#f8b070", "#e88a4c", "#c8643a", "#9a4630", "#6a3226",
    "#f0c868", "#d8a447", "#b7843a", "#8c6230", "#5e4226", "#3a2a1c", "#261c14",
    "#181a2c", "#2a3048", "#3a4260", "#4f5878", "#6a7392", "#8890ae", "#a2aabd", "#5d5878", "#7c7598",
    "#a6a2c8", "#d6d2fa", "#f4f2ff",
    "#ffe08a", "#ffb84a",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "dusk-afterglow",
      type: "sky",
      name: "Dusk Afterglow",
      enabled: true,
      params: {
        horizon: 64,
        sunPos: [30, 60],
        sunRadius: 6,
        glare: 1.0,
        haze: 0.35,
        stars: false,
        gradientTop: "#0f0c20",
        gradientHorizon: "#e6a890",
        sunColor: "#fbe8c6",
      },
    },
    {
      id: "anvil-thunderhead",
      type: "clouds",
      name: "Anvil Thunderhead",
      enabled: true,
      params: {
        horizon: 64,
        coverage: 0.65,
        drift: 0.6,
        altitude: 1.5,
        density: 1.7,
        softness: 0.55,
        lit: 0.8,
        baseColor: "#7a6288",
        litColor: "#f7d6a8",
      },
    },
    {
      id: "wheat-field",
      type: "water",
      name: "Wheat Field",
      enabled: true,
      params: {
        horizon: 64,
        waveSpeed: 0.7,
        waveChop: 0.06,
        sunColumn: 30,
        glitter: 0.7,
        deepColor: "#3a2a1c",
        reflectColor: "#b7843a",
        crestColor: "#f0c868",
      },
    },
    {
      id: "rain-curtains",
      type: "particles",
      name: "Rain Curtains",
      enabled: true,
      params: {
        type: "rain",
        density: 160,
        fallSpeed: 1.5,
        wind: 0.6,
        color: "#8890ae",
      },
    },
  ],
};