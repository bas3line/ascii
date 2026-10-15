/*
 * scene: night highway
 * A desert highway at dusk, rushing toward the mountains and last light.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const nightHighway: SceneSpec = {
  name: "night highway",
  note: "a desert highway at dusk, rushing toward the mountains and last light",
  ground: "#07080f",
  fps: 15,
  palette: [
    "#0d1226", "#141b38", "#1c264c", "#263463", "#34457a", "#4a5d96", "#6b7fb3", "#9aa8d0", "#cdd5ea", "#f4f6fc",
    "#2a1d45", "#43285e", "#643474", "#8a4683",
    "#b85a78", "#e0766a", "#f59a5c", "#ffc477", "#ffe6b0",
    "#16161e", "#24232d", "#383744", "#55535f",
    "#7a1622", "#d42a32", "#ff6a5c",
    "#d9b44a", "#3fd6c8", "#fff4d8", "#3a2a2a",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "twilight-sky",
      type: "sky",
      name: "Twilight Sky",
      enabled: true,
      params: {
        horizon: 50,
        sunPos: [158, 14],
        sunRadius: 4.5,
        glare: 0.25,
        haze: 0.2,
        stars: true,
        gradientTop: "#0d1226",
        gradientHorizon: "#f59a5c",
        sunColor: "#f4f6fc",
      },
    },
    {
      id: "distant-mountains",
      type: "heightfield",
      name: "Distant Mountains",
      enabled: true,
      params: {
        horizon: 50,
        style: "peaks",
        peakHeight: 20,
        frequency: 0.04,
        roughness: 0.5,
        color: "#16161e",
        highlight: "#b85a78",
      },
    },
    {
      id: "desert-road",
      type: "water",
      name: "Desert Road",
      enabled: true,
      params: {
        horizon: 50,
        waveSpeed: 2.0,
        waveChop: 0.05,
        sunColumn: 100,
        glitter: 1.6,
        deepColor: "#16161e",
        reflectColor: "#4a5d96",
        crestColor: "#ffe6b0",
      },
    },
    {
      id: "passing-lights",
      type: "particles",
      name: "Passing Lights",
      enabled: true,
      params: {
        type: "embers",
        density: 60,
        fallSpeed: 2.0,
        wind: -1.2,
        color: "#fff4d8",
      },
    },
  ],
};