/*
 * scene: edge orbit
 * The night side of the Earth from low orbit, a curved limb under a rim of
 * air burning Cloudflare orange where the sun breaks over the horizon.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const edgeOrbit: SceneSpec = {
  name: "edge orbit",
  note: "the night earth from orbit, cloudflare requests arcing city to city",
  ground: "#04060c",
  fps: 15,
  palette: [
    "#080c18", "#0d1529", "#152142", "#1e2f5c", "#2b4479", "#40609c", "#7d9cd2", "#b8cdee",
    "#181d27", "#252b37", "#404041", "#5c6578",
    "#2e1608", "#4f2410", "#7a3812", "#a94f16", "#d0661a",
    "#f38020", "#faae40",
    "#3d2a0e", "#6b4a16", "#a57524", "#d49434",
    "#ffd68a", "#ffe8c0", "#fff6e8", "#ffffff",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "orbital-night",
      type: "sky",
      name: "Orbital Night Sky",
      enabled: true,
      params: {
        horizon: 78,
        sunPos: [168, 24],
        sunRadius: 7,
        glare: 1.4,
        haze: 0.1,
        stars: true,
        gradientTop: "#080c18",
        gradientHorizon: "#152142",
        sunColor: "#faae40",
      },
    },
    {
      id: "earth-limb",
      type: "heightfield",
      name: "Curved Earth Limb",
      enabled: true,
      params: {
        horizon: 78,
        style: "hills",
        peakHeight: 22,
        frequency: 0.05,
        roughness: 0.4,
        color: "#0d1529",
        highlight: "#f38020",
      },
    },
    {
      id: "night-ocean",
      type: "water",
      name: "Night Ocean Glitter",
      enabled: true,
      params: {
        horizon: 78,
        waveSpeed: 0.5,
        waveChop: 0.05,
        sunColumn: 168,
        glitter: 1.2,
        deepColor: "#0d1529",
        reflectColor: "#40609c",
        crestColor: "#faae40",
      },
    },
    {
      id: "city-lights",
      type: "particles",
      name: "Twinkling City Lights",
      enabled: true,
      params: {
        type: "fireflies",
        density: 120,
        fallSpeed: 0.3,
        wind: 0,
        color: "#ffd68a",
      },
    },
  ],
};