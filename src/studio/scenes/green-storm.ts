/*
 * scene: green storm
 * A thunderstorm at sea, lightning striking in the supabase bolt.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const greenStorm: SceneSpec = {
  name: "green storm",
  note: "a thunderstorm at sea, the lightning striking in the supabase bolt",
  ground: "#0e0e0e",
  fps: 15,
  palette: [
    "#1c1c1c", "#242424", "#2e2e2e", "#3a3a3a", "#4a4a4a", "#5e5e5e", "#777777", "#939393", "#b4b4b4", "#d6d6d6",
    "#1d2a24", "#243a30", "#2d4d3e", "#3a6450", "#4d8066", "#67a084",
    "#0f3324", "#14472f", "#1a5e3e", "#22784f", "#2c9663", "#36b578", "#3ecf8e", "#65dba5", "#8fe6be", "#bdf2d8",
    "#e6fbf1", "#ffffff",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "storm-sky",
      type: "sky",
      name: "Storm Sky",
      enabled: true,
      params: {
        horizon: 54,
        sunPos: [100, 50],
        sunRadius: 0,
        glare: 0.6,
        haze: 0.35,
        stars: false,
        gradientTop: "#1c1c1c",
        gradientHorizon: "#2d4d3e",
        sunColor: "#8fe6be",
      },
    },
    {
      id: "storm-deck",
      type: "clouds",
      name: "Storm Deck",
      enabled: true,
      params: {
        horizon: 54,
        coverage: 0.7,
        drift: 2.2,
        altitude: 1.1,
        density: 1.6,
        softness: 0.45,
        lit: 0.4,
        baseColor: "#1d2a24",
        litColor: "#3ecf8e",
      },
    },
    {
      id: "coast-hills",
      type: "heightfield",
      name: "Coast Hills",
      enabled: true,
      params: {
        horizon: 56,
        style: "hills",
        peakHeight: 14,
        frequency: 0.05,
        roughness: 0.5,
        color: "#0f3324",
        highlight: "#22784f",
      },
    },
    {
      id: "storm-sea",
      type: "water",
      name: "Storm Sea",
      enabled: true,
      params: {
        horizon: 56,
        waveSpeed: 1.6,
        waveChop: 0.16,
        sunColumn: 100,
        glitter: 1.2,
        deepColor: "#14472f",
        reflectColor: "#22784f",
        crestColor: "#8fe6be",
      },
    },
    {
      id: "slanting-rain",
      type: "particles",
      name: "Slanting Rain",
      enabled: true,
      params: {
        type: "rain",
        density: 300,
        fallSpeed: 2.2,
        wind: -0.8,
        color: "#8fe6be",
      },
    },
  ],
};