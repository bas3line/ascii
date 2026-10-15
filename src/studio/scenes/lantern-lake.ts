/*
 * scene: lantern lake
 * Sky lanterns rising over a still mountain lake at night, a festival on the
 * far shore letting them go by the hundred while the water holds their glow.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const lanternLake: SceneSpec = {
  name: "lantern lake",
  note: "sky lanterns rising over a still mountain lake, one let go from a boat",
  ground: "#04060d",
  fps: 15,
  palette: [
    "#141b30", "#1c2a52", "#22346a", "#2a4080", "#324c96", "#3c58a8",
    "#33306e", "#433c88", "#54449a",
    "#62407e", "#7a4a88", "#934e86",
    "#a4546e", "#bc5e66", "#d06a62",
    "#dc7650", "#e88444", "#f09238",
    "#d4581a", "#ea6c1e", "#f78226", "#ff9530", "#ffa83c", "#ffbb4e", "#ffcc66", "#ffdc86", "#ffe8a8",
    "#fff3cf", "#fffbec",
    "#b8341a", "#d84420",
    "#2f3748", "#4f586c", "#5e5a7e", "#7a6a8c",
    "#5a3220", "#7c4628",
    "#4a5578", "#5d6a92", "#7381ab",
    "#c4cdec", "#e4e9fb", "#ffffff",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "starlit-sky",
      type: "sky",
      name: "Starlit Night Sky",
      enabled: true,
      params: {
        horizon: 64,
        sunPos: [0, 0],
        sunRadius: 0,
        glare: 0,
        haze: 0.1,
        stars: true,
        gradientTop: "#141b30",
        gradientHorizon: "#5d6a92",
        sunColor: "#ffffff",
      },
    },
    {
      id: "festival-haze",
      type: "clouds",
      name: "Festival Haze",
      enabled: true,
      params: {
        horizon: 64,
        coverage: 0.35,
        drift: 0.3,
        altitude: 1.0,
        density: 0.9,
        softness: 0.6,
        lit: 0.45,
        baseColor: "#4f586c",
        litColor: "#ffcc66",
      },
    },
    {
      id: "slate-range",
      type: "heightfield",
      name: "Slate Mountain Range",
      enabled: true,
      params: {
        horizon: 64,
        style: "peaks",
        peakHeight: 22,
        frequency: 0.04,
        roughness: 0.5,
        color: "#5d6a92",
        highlight: "#7381ab",
      },
    },
    {
      id: "dark-shore",
      type: "heightfield",
      name: "Dark Tree Shore",
      enabled: true,
      params: {
        horizon: 64,
        style: "pines",
        peakHeight: 12,
        frequency: 0.05,
        roughness: 0.7,
        color: "#2f3748",
        highlight: "#4f586c",
      },
    },
    {
      id: "still-lake",
      type: "water",
      name: "Still Mountain Lake",
      enabled: true,
      params: {
        horizon: 64,
        waveSpeed: 0.3,
        waveChop: 0.04,
        sunColumn: 100,
        glitter: 1.1,
        deepColor: "#141b30",
        reflectColor: "#a4546e",
        crestColor: "#ffbb4e",
      },
    },
    {
      id: "rising-lanterns",
      type: "particles",
      name: "Rising Sky Lanterns",
      enabled: true,
      params: {
        type: "embers",
        density: 150,
        fallSpeed: 0.5,
        wind: 0.3,
        color: "#ffa83c",
      },
    },
  ],
};