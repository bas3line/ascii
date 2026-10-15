/*
 * scene: ocean sunset
 * Golden hour at sea. Sun on the horizon beyond a pine headland, heaped cloud
 * overheard lit from below, glitter path on rolling swell.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const oceanSunset: SceneSpec = {
  name: "ocean sunset",
  note: "the sun sets past a pine headland, lit cloud, glitter on rolling sea",
  ground: "#0b0817",
  fps: 15,
  palette: [
    "#140f2c", "#1e1640", "#2b1c52", "#3d2266", "#552a74",
    "#6e2c78", "#90327c", "#b23c7c", "#d24f7a", "#ea6a78",
    "#c2306a", "#ff5d8f", "#ff8a9a", "#7a2456", "#f05d5e",
    "#f2804f", "#f99a43", "#ffb44a", "#ffcd62", "#ffe39a", "#fff5d8",
    "#a8323c", "#d2453c", "#e8603e",
    "#2f1a3e", "#47234f", "#63305c", "#874266", "#ac5b70",
    "#ff9e86", "#ffc4a2", "#ffdcc0",
    "#0e1230", "#171a46", "#232059", "#33286a", "#4a2f78",
    "#1c2a5c", "#2e4078",
    "#7d3f8f", "#a24f98", "#c8649e", "#de8bb5",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "dusk-sky",
      type: "sky",
      name: "Dusk Atmosphere",
      enabled: true,
      params: {
        horizon: 56,
        sunPos: [134, 51.5],
        sunRadius: 8.5,
        glare: 1.0,
        haze: 0.25,
        stars: true,
        gradientTop: "#140f2c",
        gradientHorizon: "#ea6a78",
        sunColor: "#fff5d8",
      },
    },
    {
      id: "cloud-deck",
      type: "clouds",
      name: "Heaped Cloud Deck",
      enabled: true,
      params: {
        horizon: 56,
        coverage: 0.5,
        drift: 1.0,
        altitude: 1.0,
        density: 1.0,
        softness: 0.6,
        lit: 0.45,
        baseColor: "#1e1640",
        litColor: "#ffcd62",
      },
    },
    {
      id: "pine-headland",
      type: "heightfield",
      name: "Pine Headland",
      enabled: true,
      params: {
        horizon: 56,
        style: "pines",
        peakHeight: 20,
        frequency: 0.05,
        roughness: 0.6,
        color: "#1e1640",
        highlight: "#b23c7c",
      },
    },
    {
      id: "rolling-swell",
      type: "water",
      name: "Rolling Swells",
      enabled: true,
      params: {
        horizon: 56,
        waveSpeed: 1.0,
        waveChop: 0.08,
        sunColumn: 134,
        glitter: 1.6,
        deepColor: "#0e1230",
        reflectColor: "#ea6a78",
        crestColor: "#ffcd62",
      },
    },
  ],
};