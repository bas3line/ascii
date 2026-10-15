/*
 * scene: lake pichola
 * Sunset over Udaipur's lake: the City Palace glowing on the right shore,
 * the Aravalli hills purple behind, and lamps shimmering on the water.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const lakePichola: SceneSpec = {
  name: "lake pichola",
  note: "sunset on lake pichola, udaipur's palaces glowing over the water",
  ground: "#120a1a",
  fps: 15,
  palette: [
    "#1c1028", "#2a1840", "#3d2058", "#55286a", "#6e3178", "#8a3c7c", "#a8477a", "#c85a6e",
    "#e0704e", "#f08a40", "#f8a840", "#ffc65a", "#ffe08a", "#fff2c8", "#fffaf0",
    "#2b1c40", "#3c2852", "#4f3666", "#6a4a7e", "#9a7aa0",
    "#f6e6d0", "#e8cdb0", "#d4a888", "#b88a78", "#8e6a6a", "#6a4a58", "#c88a9a",
    "#ffd070", "#ff9a3c", "#b8323a", "#140c1c",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "sunset-sky",
      type: "sky",
      name: "Sunset Sky",
      enabled: true,
      params: {
        horizon: 62,
        sunPos: [58, 48],
        sunRadius: 8.5,
        glare: 1.1,
        haze: 0.2,
        stars: false,
        gradientTop: "#2a1840",
        gradientHorizon: "#ffc65a",
        sunColor: "#fff2c8",
      },
    },
    {
      id: "drifting-clouds",
      type: "clouds",
      name: "Drifting Sunset Clouds",
      enabled: true,
      params: {
        horizon: 62,
        coverage: 0.45,
        drift: 0.9,
        altitude: 1.1,
        density: 1.0,
        softness: 0.6,
        lit: 0.55,
        baseColor: "#4f3666",
        litColor: "#ff9a3c",
      },
    },
    {
      id: "aravalli-hills",
      type: "heightfield",
      name: "Aravalli Hills",
      enabled: true,
      params: {
        horizon: 62,
        style: "hills",
        peakHeight: 22,
        frequency: 0.04,
        roughness: 0.5,
        color: "#3d2058",
        highlight: "#9a7aa0",
      },
    },
    {
      id: "city-palace",
      type: "heightfield",
      name: "City Palace Skyline",
      enabled: true,
      params: {
        horizon: 62,
        style: "city",
        peakHeight: 30,
        frequency: 0.03,
        roughness: 0.4,
        color: "#2b1c40",
        highlight: "#f6e6d0",
      },
    },
    {
      id: "lake-waters",
      type: "water",
      name: "Lake Reflections",
      enabled: true,
      params: {
        horizon: 62,
        waveSpeed: 0.8,
        waveChop: 0.06,
        sunColumn: 58,
        glitter: 1.4,
        deepColor: "#140c1c",
        reflectColor: "#ffc65a",
        crestColor: "#fff2c8",
      },
    },
    {
      id: "palace-lamps",
      type: "particles",
      name: "Flickering Palace Lamps",
      enabled: true,
      params: {
        type: "fireflies",
        density: 40,
        fallSpeed: 0.4,
        wind: 0,
        color: "#ffd070",
      },
    },
  ],
};