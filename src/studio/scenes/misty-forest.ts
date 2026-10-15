/*
 * scene: misty forest
 * Pine ridges fade into morning fog while sunbeams slant through the trees.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const mistyForest: SceneSpec = {
  name: "misty forest",
  note: "pine ridges fading into morning fog, sunbeams slanting through",
  ground: "#090f0e",
  fps: 15,
  palette: [
    // sunlight and the warm fog around it
    "#fffbea", "#fff0c8", "#fbe2a6", "#f2c97e", "#e0a95e", "#b9834a",
    // cool fog, pale to sea-green
    "#e4ebe6", "#cbe0dc", "#a8d2d0", "#86c0c2", "#68a7ac", "#4f8c93", "#3b7078",
    // pines, from the haze to the dark in front of us
    "#557570", "#456761", "#365952", "#2a4a44", "#1f3c37", "#172f2b", "#11231f",
    // moss and bark where the light touches the floor
    "#a4a35a", "#8a8f4c", "#6d7440", "#4d5530", "#7a5a3a", "#5b4532",
    // the clear sky above the fog, deepening overhead
    "#a9c3cc", "#8eadb8", "#6f93a2", "#53798a", "#3d6172", "#2b4a5a",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "fog-sky",
      type: "sky",
      name: "Fog Sky",
      enabled: true,
      params: {
        horizon: 60,
        sunPos: [96, 54],
        sunRadius: 6,
        glare: 1.2,
        haze: 0.5,
        stars: false,
        gradientTop: "#3d6172",
        gradientHorizon: "#fffbea",
        sunColor: "#fffbea",
      },
    },
    {
      id: "warm-fog",
      type: "clouds",
      name: "Warm Fog",
      enabled: true,
      params: {
        horizon: 60,
        coverage: 0.35,
        drift: 0.5,
        altitude: 0.7,
        density: 0.9,
        softness: 0.7,
        lit: 0.6,
        baseColor: "#e4ebe6",
        litColor: "#fffbea",
      },
    },
    {
      id: "far-ridge",
      type: "heightfield",
      name: "Far Ridge",
      enabled: true,
      params: {
        horizon: 58,
        style: "pines",
        peakHeight: 14,
        frequency: 0.07,
        roughness: 0.4,
        color: "#4f8c93",
        highlight: "#a8d2d0",
      },
    },
    {
      id: "near-ridge",
      type: "heightfield",
      name: "Near Ridge",
      enabled: true,
      params: {
        horizon: 66,
        style: "pines",
        peakHeight: 20,
        frequency: 0.055,
        roughness: 0.55,
        color: "#172f2b",
        highlight: "#456761",
      },
    },
    {
      id: "light-motes",
      type: "particles",
      name: "Light Motes",
      enabled: true,
      params: {
        type: "fireflies",
        density: 70,
        fallSpeed: 0.7,
        wind: 0.1,
        color: "#fff0c8",
      },
    },
  ],
};