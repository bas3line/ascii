/*
 * scene: lava wall
 * The lobby wall of lava lamps Cloudflare films for entropy: shelves of warm
 * lamps fill the dark room under the glowing orange cloud sign.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const lavaWall: SceneSpec = {
  name: "lava wall",
  note: "a wall of lava lamps under the glowing orange cloud, watched by a camera",
  ground: "#08070a",
  fps: 15,
  palette: [
    "#16121a", "#221c22", "#33282a", "#4a3a32", "#6e5442", "#9a7658",
    "#404041", "#707074", "#a9a9ae", "#e8e4de",
    "#5c1616", "#9e211d", "#dc362b", "#ff6a52",
    "#7c3510", "#c4570f", "#f38020", "#faae40", "#ffd27c", "#fff1c8",
    "#e6c02a",
    "#0f3a3c", "#18786f", "#43d6c0",
    "#2f1842", "#6b2f92", "#b45ddc", "#e2508c",
    "#1d3768", "#3f80d2",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "dark-room",
      type: "sky",
      name: "Dark Room",
      enabled: true,
      params: {
        horizon: 50,
        sunPos: [100, 6],
        sunRadius: 0,
        glare: 0,
        haze: 0.12,
        stars: false,
        gradientTop: "#08070a",
        gradientHorizon: "#221c22",
        sunColor: "#ffffff",
      },
    },
    {
      id: "orange-cloud",
      type: "clouds",
      name: "Glowing Orange Cloud Sign",
      enabled: true,
      params: {
        horizon: 50,
        coverage: 0.55,
        drift: 0.4,
        altitude: 1.0,
        density: 1.2,
        softness: 0.5,
        lit: 1.0,
        baseColor: "#33282a",
        litColor: "#f38020",
      },
    },
    {
      id: "lamp-shelves",
      type: "heightfield",
      name: "Shelves of Lava Lamps",
      enabled: true,
      params: {
        horizon: 50,
        style: "city",
        peakHeight: 34,
        frequency: 0.035,
        roughness: 0.5,
        color: "#221c22",
        highlight: "#c4570f",
      },
    },
    {
      id: "rising-embers",
      type: "particles",
      name: "Rising Warm Embers",
      enabled: true,
      params: {
        type: "embers",
        density: 200,
        fallSpeed: 0.8,
        wind: 0.15,
        color: "#faae40",
      },
    },
    {
      id: "amber-glow",
      type: "particles",
      name: "Purple Wax Glow",
      enabled: true,
      params: {
        type: "embers",
        density: 110,
        fallSpeed: 0.6,
        wind: 0.1,
        color: "#e2508c",
      },
    },
  ],
};