/*
 * scene: salt flat
 * The Vercel triangle over a mirror of salt, the sun rising behind its tip.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const saltFlat: SceneSpec = {
  name: "salt flat",
  note: "the vercel triangle over a mirror of salt, the sun rising behind its tip",
  ground: "#000000",
  fps: 15,
  palette: [
    "#0d0d0e", "#161617", "#1f1f21", "#2a2a2c", "#363638", "#444446", "#555557",
    "#69696b", "#808082", "#9a9a9c", "#b8b8ba", "#d8d8da", "#ffffff",
    "#50e3c2", "#0070f3", "#7928ca", "#ff0080", "#ff4d4d", "#f9cb28",
    "#b0f2e3", "#8cbcf9", "#bb94e4", "#ff8cc0", "#ffa6a6", "#fce59a",
    "#24665a", "#00326d", "#36125b", "#73003a", "#732323", "#705b12",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "black-sky",
      type: "sky",
      name: "Black Sky",
      enabled: true,
      params: {
        horizon: 57,
        sunPos: [100, 20],
        sunRadius: 5,
        glare: 1.6,
        haze: 0.3,
        stars: false,
        gradientTop: "#0d0d0e",
        gradientHorizon: "#444446",
        sunColor: "#ffffff",
      },
    },
    {
      id: "triangle-silhouette",
      type: "heightfield",
      name: "Dark Foreground",
      enabled: true,
      params: {
        horizon: 57,
        style: "peaks",
        peakHeight: 22,
        frequency: 0.05,
        roughness: 0.5,
        color: "#0d0d0e",
        highlight: "#bb94e4",
      },
    },
    {
      id: "salt-mirror",
      type: "water",
      name: "Salt Mirror",
      enabled: true,
      params: {
        horizon: 57,
        waveSpeed: 0.25,
        waveChop: 0.03,
        sunColumn: 100,
        glitter: 2.4,
        deepColor: "#161617",
        reflectColor: "#bb94e4",
        crestColor: "#fce59a",
      },
    },
  ],
};