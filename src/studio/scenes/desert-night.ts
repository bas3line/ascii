/*
 * scene: desert night
 * The milky way over a lone acacia on moonless dunes, meteors falling.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const desertNight: SceneSpec = {
  name: "desert night",
  note: "the milky way over a lone acacia on moonless dunes, meteors falling",
  ground: "#04060c",
  fps: 15,
  palette: [
    "#0a1024", "#101830", "#16213f", "#1e2b50", "#283864", "#34477a", "#45598f", "#5a6fa6", "#7488bd",
    "#93a5d2", "#b6c3e4", "#d8e0f2", "#f4f6fb",
    "#fff3dc", "#ffe2b4", "#f5c98e", "#e2a86e", "#c4864f", "#9c6440", "#74492f",
    "#2a2230", "#3d2f3a", "#56404a", "#735358", "#946a62", "#b6836c",
    "#4a3b48", "#6b5562", "#8a6f7a", "#a88590", "#c9a3a3", "#e2bfb4",
    "#2a2448", "#3d3466", "#57498a", "#7a68a8",
    "#ffd8a8", "#cfe0ff", "#a9c4ff",
    "#ff9a52", "#e07a3e",
    "#0d0f1a", "#151827",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "moonless-sky",
      type: "sky",
      name: "Milky Way Night",
      enabled: true,
      params: {
        horizon: 64,
        sunPos: [152, 38],
        sunRadius: 0,
        glare: 0,
        haze: 0.2,
        stars: true,
        gradientTop: "#0a1024",
        gradientHorizon: "#e2a86e",
        sunColor: "#f4f6fb",
      },
    },
    {
      id: "night-dunes",
      type: "heightfield",
      name: "Moonless Dunes",
      enabled: true,
      params: {
        horizon: 64,
        style: "dunes",
        peakHeight: 15,
        frequency: 0.03,
        roughness: 0.5,
        color: "#2a2230",
        highlight: "#b6836c",
      },
    },
    {
      id: "dune-plane",
      type: "water",
      name: "Sand Plane",
      enabled: true,
      params: {
        horizon: 64,
        waveSpeed: 0.25,
        waveChop: 0.05,
        sunColumn: 30,
        glitter: 0.6,
        deepColor: "#2a2230",
        reflectColor: "#b6836c",
        crestColor: "#e2a86e",
      },
    },
    {
      id: "falling-meteors",
      type: "particles",
      name: "Meteors",
      enabled: true,
      params: {
        type: "embers",
        density: 50,
        fallSpeed: 1.2,
        wind: 0.4,
        color: "#ff9a52",
      },
    },
  ],
};