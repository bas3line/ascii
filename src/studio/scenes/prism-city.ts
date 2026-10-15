/*
 * scene: prism city
 * A blue hour skyline seen across a river: a black glass spire rises over the
 * dark blocks, a low cloud lit orange from below, and the river smears it all.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const prismCity: SceneSpec = {
  name: "prism city",
  note: "a black spire and an orange cloud over a blue hour city and its river",
  ground: "#06080f",
  fps: 15,
  palette: [
    "#111a33", "#16213f", "#1c2a50", "#233463", "#2b4077", "#364e8b", "#445f9f", "#5874b2", "#7089c0", "#8a9cc4",
    "#a3b1cf", "#c8d2e4", "#eef1f6", "#ffffff",
    "#ffe9ae", "#ffd27c",
    "#4a2a2a", "#6e3a24", "#9a4a1c", "#c85f17", "#f38020", "#f8a040", "#fbc06e", "#ffdca6",
    "#3a3352", "#544766",
    "#0e1220", "#1a2030", "#283044",
    "#9c2a26", "#ff4b3e",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "blue-hour-sky",
      type: "sky",
      name: "Blue Hour Sky",
      enabled: true,
      params: {
        horizon: 64,
        sunPos: [100, 6],
        sunRadius: 0,
        glare: 0,
        haze: 0.15,
        stars: false,
        gradientTop: "#111a33",
        gradientHorizon: "#7089c0",
        sunColor: "#ffffff",
      },
    },
    {
      id: "low-cloud",
      type: "clouds",
      name: "Low Orange Cloud",
      enabled: true,
      params: {
        horizon: 64,
        coverage: 0.4,
        drift: 0.6,
        altitude: 1.0,
        density: 1.1,
        softness: 0.55,
        lit: 0.8,
        baseColor: "#3a3352",
        litColor: "#f38020",
      },
    },
    {
      id: "spire-tower",
      type: "heightfield",
      name: "Black Glass Spire",
      enabled: true,
      params: {
        horizon: 64,
        style: "city",
        peakHeight: 46,
        frequency: 0.02,
        roughness: 0.35,
        color: "#0e1220",
        highlight: "#544766",
      },
    },
    {
      id: "far-blocks",
      type: "heightfield",
      name: "Blue Hour Skyline",
      enabled: true,
      params: {
        horizon: 64,
        style: "city",
        peakHeight: 20,
        frequency: 0.05,
        roughness: 0.5,
        color: "#1a2030",
        highlight: "#445f9f",
      },
    },
    {
      id: "river",
      type: "water",
      name: "Smearing River",
      enabled: true,
      params: {
        horizon: 64,
        waveSpeed: 0.8,
        waveChop: 0.07,
        sunColumn: 100,
        glitter: 1.0,
        deepColor: "#0e1220",
        reflectColor: "#5874b2",
        crestColor: "#f8a040",
      },
    },
  ],
};