/*
 * scene: command city
 * A city at night seen from high above, its boulevards traced in sodium
 * streetlight against the dark blocks, ringed by a black canal.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const commandCity: SceneSpec = {
  name: "command city",
  note: "a night city whose boulevards trace the command key in streetlight",
  ground: "#060607",
  fps: 15,
  palette: [
    "#101012", "#17171a", "#1f1f23", "#29292e", "#34343a", "#414148", "#505058", "#62626a",
    "#76767e", "#8c8c93", "#a4a4aa", "#bdbdc2", "#d6d6da", "#ececef", "#ffffff",
    "#3a2a1c", "#5a3c20", "#7e5224", "#a86a2a", "#cf8433", "#ee9e45", "#ffb860", "#ffcf88", "#ffe4b4", "#fff3dc",
    "#c9d3e6", "#8d99b0",
    "#ff7a3a", "#c0522a",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "night-sky",
      type: "sky",
      name: "Deep Night Sky",
      enabled: true,
      params: {
        horizon: 58,
        sunPos: [100, 6],
        sunRadius: 0,
        glare: 0,
        haze: 0.1,
        stars: true,
        gradientTop: "#060607",
        gradientHorizon: "#101012",
        sunColor: "#ffffff",
      },
    },
    {
      id: "dark-blocks",
      type: "heightfield",
      name: "Dark City Blocks",
      enabled: true,
      params: {
        horizon: 58,
        style: "city",
        peakHeight: 44,
        frequency: 0.025,
        roughness: 0.55,
        color: "#17171a",
        highlight: "#3a2a1c",
      },
    },
    {
      id: "ring-canal",
      type: "water",
      name: "Black Canal",
      enabled: true,
      params: {
        horizon: 58,
        waveSpeed: 0.4,
        waveChop: 0.04,
        sunColumn: 100,
        glitter: 0.8,
        deepColor: "#060607",
        reflectColor: "#ffb860",
        crestColor: "#fff3dc",
      },
    },
    {
      id: "traffic-trails",
      type: "particles",
      name: "Sodium Traffic Streaks",
      enabled: true,
      params: {
        type: "fireflies",
        density: 140,
        fallSpeed: 0.6,
        wind: 0.2,
        color: "#ffb860",
      },
    },
  ],
};