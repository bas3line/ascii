/*
 * scene: marine drive
 * Mumbai's queen's necklace seen from Malabar Hill at night: a string of
 * sodium lamps sweeping round the bay, cars trailing light beneath them and
 * the bay carrying their long wavering reflections.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const marineDrive: SceneSpec = {
  name: "marine drive",
  note: "mumbai's queen's necklace at night, lamps curving round the bay",
  ground: "#07080f",
  fps: 15,
  palette: [
    "#18213f", "#202c55", "#2a396d", "#374a88", "#4a60a2", "#6880bc",
    "#2c2140", "#3f2d58", "#56396b", "#6e4a7a", "#8a5f88",
    "#5a2e3c", "#7b404c", "#9e5858",
    "#55300f", "#7d4515", "#a95c1b", "#d27a24", "#ee9631", "#ffb246", "#ffcd6a", "#ffe39c", "#fff2cf",
    "#ffffff", "#dce6ff", "#a9bde8",
    "#6a181b", "#b22a28", "#ff4b3e",
    "#132c38", "#1c3f4f", "#2a5868",
    "#29283a", "#3c3a4c", "#565266", "#79738a",
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
      name: "Night Sky & Moon",
      enabled: true,
      params: {
        horizon: 40,
        sunPos: [189, 13],
        sunRadius: 4.5,
        glare: 0.5,
        haze: 0.1,
        stars: true,
        gradientTop: "#18213f",
        gradientHorizon: "#374a88",
        sunColor: "#ffffff",
      },
    },
    {
      id: "city-skyline",
      type: "heightfield",
      name: "Towers & City Skyline",
      enabled: true,
      params: {
        horizon: 40,
        style: "city",
        peakHeight: 16,
        frequency: 0.05,
        roughness: 0.5,
        color: "#2c2140",
        highlight: "#4a60a2",
      },
    },
    {
      id: "bay-waters",
      type: "water",
      name: "Bay Waters",
      enabled: true,
      params: {
        horizon: 40,
        waveSpeed: 0.7,
        waveChop: 0.06,
        sunColumn: 189,
        glitter: 2.2,
        deepColor: "#132c38",
        reflectColor: "#2a396d",
        crestColor: "#ffcd6a",
      },
    },
    {
      id: "car-lights",
      type: "particles",
      name: "Trailing Car Lights",
      enabled: true,
      params: {
        type: "fireflies",
        density: 90,
        fallSpeed: 0.7,
        wind: 0.8,
        color: "#ffb246",
      },
    },
  ],
};