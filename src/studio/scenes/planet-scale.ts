/*
 * scene: planet scale
 * A dark planet cut into the PlanetScale mark, backlit, a moon circling.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const planetScale: SceneSpec = {
  name: "planet scale",
  note: "a dark planet cut into the planetscale mark, backlit, a moon circling",
  ground: "#050505",
  fps: 15,
  palette: [
    "#101010", "#181818", "#202020", "#282828", "#303030", "#3a3a3a", "#444444", "#4e4e4e",
    "#585858", "#636363", "#6e6e6e", "#797979", "#858585", "#919191", "#9d9d9d", "#a9a9a9",
    "#b5b5b5", "#c1c1c1", "#cccccc", "#d7d7d7", "#e1e1e1", "#eaeaea", "#f3f3f3", "#ffffff",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "cosmic-backlight",
      type: "sky",
      name: "Cosmic Backlight",
      enabled: true,
      params: {
        horizon: 78,
        sunPos: [100, 40],
        sunRadius: 8,
        glare: 1.6,
        haze: 0.1,
        stars: true,
        gradientTop: "#101010",
        gradientHorizon: "#202020",
        sunColor: "#f3f3f3",
      },
    },
    {
      id: "dark-planet",
      type: "heightfield",
      name: "Dark Planet",
      enabled: true,
      params: {
        horizon: 78,
        style: "peaks",
        peakHeight: 60,
        frequency: 0.012,
        roughness: 0.45,
        color: "#202020",
        highlight: "#585858",
      },
    },
    {
      id: "cosmic-floor",
      type: "water",
      name: "Rim-light Floor",
      enabled: true,
      params: {
        horizon: 78,
        waveSpeed: 0.4,
        waveChop: 0.04,
        sunColumn: 100,
        glitter: 1.4,
        deepColor: "#0d0d0d",
        reflectColor: "#636363",
        crestColor: "#d7d7d7",
      },
    },
    {
      id: "data-lights",
      type: "particles",
      name: "Data Lights",
      enabled: true,
      params: {
        type: "fireflies",
        density: 70,
        fallSpeed: 0.6,
        wind: 0.3,
        color: "#c1c1c1",
      },
    },
  ],
};