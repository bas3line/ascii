/*
 * scene: taj dawn
 * The Taj Mahal at sunrise, mirrored in its pool through morning haze.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const tajDawn: SceneSpec = {
  name: "taj dawn",
  note: "the taj mahal at sunrise, mirrored in its pool through morning haze",
  ground: "#0d0a13",
  fps: 15,
  palette: [
    "#2e2a55", "#3d3870", "#514a8a", "#6a62a3", "#8a83bd",
    "#5a3a5e", "#7a4d72", "#9a6284", "#b97a92", "#d495a2",
    "#b8705a", "#d98d66", "#efab78", "#f8c98e", "#ffe2ae", "#fff3d8", "#fffcf2",
    "#8e7f9e", "#ad9cb4", "#cbb6c4", "#e3cdd2", "#f3e0dc",
    "#2a4a3e", "#36584a", "#4a6c58", "#66845f", "#8a9a68",
    "#8a4a3e", "#b0624a", "#3a2f4a", "#4e3d5a", "#f6d6c0", "#e9bfae",
    "#5e6a40", "#7d8a52", "#a3a064", "#c2b274",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "dawn-haze",
      type: "sky",
      name: "Dawn Haze",
      enabled: true,
      params: {
        horizon: 50,
        sunPos: [38, 48],
        sunRadius: 7,
        glare: 1.0,
        haze: 0.3,
        stars: false,
        gradientTop: "#3d3870",
        gradientHorizon: "#f8c98e",
        sunColor: "#fffcf2",
      },
    },
    {
      id: "morning-cloud",
      type: "clouds",
      name: "Morning Cloud",
      enabled: true,
      params: {
        horizon: 50,
        coverage: 0.25,
        drift: 0.5,
        altitude: 0.9,
        density: 0.9,
        softness: 0.6,
        lit: 0.5,
        baseColor: "#8a83bd",
        litColor: "#ffe2ae",
      },
    },
    {
      id: "marble-silhouette",
      type: "heightfield",
      name: "Marble Silhouette",
      enabled: true,
      params: {
        horizon: 50,
        style: "city",
        peakHeight: 20,
        frequency: 0.04,
        roughness: 0.35,
        color: "#e3cdd2",
        highlight: "#fff3d8",
      },
    },
    {
      id: "reflecting-canal",
      type: "water",
      name: "Reflecting Canal",
      enabled: true,
      params: {
        horizon: 52,
        waveSpeed: 0.4,
        waveChop: 0.05,
        sunColumn: 38,
        glitter: 0.9,
        deepColor: "#514a8a",
        reflectColor: "#f8c98e",
        crestColor: "#fff3d8",
      },
    },
    {
      id: "morning-birds",
      type: "particles",
      name: "Morning Birds",
      enabled: true,
      params: {
        type: "fireflies",
        density: 40,
        fallSpeed: 0.6,
        wind: 0.2,
        color: "#fffcf2",
      },
    },
  ],
};