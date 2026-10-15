/*
 * scene: earthrise
 * The Earth coming up over a cratered lunar horizon in long low sunlight.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const earthrise: SceneSpec = {
  name: "earthrise",
  note: "the earth rising over a cratered lunar horizon in long low sunlight",
  ground: "#030408",
  fps: 15,
  palette: [
    "#18181b", "#232326", "#303033", "#414143", "#555556", "#6b6a69", "#83817d", "#9c9993",
    "#b6b2aa", "#cfcac1", "#e6e1d8", "#f7f4ee",
    "#0c1120", "#131a2e", "#1b2540", "#262f4a",
    "#dfe9ff",
    "#0a2259", "#0f2f72", "#15408c", "#1d53a6", "#2a69bf", "#4386d3",
    "#6eaeea", "#a8d3f6",
    "#e8f0fa", "#c2d0e3", "#8b9fbc",
    "#2f4a26", "#3b5a2c", "#5b7238", "#7a9150", "#77783f", "#8f8550", "#a8955e", "#6b5634",
    "#b9774a", "#8a4838",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "lunar-sky",
      type: "sky",
      name: "Lunar Sky",
      enabled: true,
      params: {
        horizon: 40,
        sunPos: [141, 32],
        sunRadius: 17,
        glare: 0.2,
        haze: 0.1,
        stars: true,
        gradientTop: "#0c1120",
        gradientHorizon: "#232326",
        sunColor: "#6eaeea",
      },
    },
    {
      id: "cratered-horizon",
      type: "heightfield",
      name: "Cratered Horizon",
      enabled: true,
      params: {
        horizon: 40,
        style: "hills",
        peakHeight: 14,
        frequency: 0.05,
        roughness: 0.5,
        color: "#18181b",
        highlight: "#9c9993",
      },
    },
    {
      id: "lunar-plain",
      type: "water",
      name: "Lunar Plain",
      enabled: true,
      params: {
        horizon: 40,
        waveSpeed: 0.35,
        waveChop: 0.04,
        sunColumn: 141,
        glitter: 0.6,
        deepColor: "#0c1120",
        reflectColor: "#414143",
        crestColor: "#dfe9ff",
      },
    },
  ],
};