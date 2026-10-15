/*
 * scene: black prism
 * The Vercel triangle as a glass prism in a black void: a white beam fans
 * into a full spectrum above a glossy floor holding its reflection.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const blackPrism: SceneSpec = {
  name: "black prism",
  note: "the vercel triangle as a glass prism, splitting white light to a rainbow",
  ground: "#000000",
  fps: 15,
  palette: [
    "#161616", "#242424", "#363636", "#4a4a4a", "#636363", "#7e7e7e", "#9c9c9c", "#bcbcbc",
    "#dcdcdc", "#ffffff",
    "#ff2a3c", "#9a1c28", "#ff7417", "#a04a10", "#ffdf2e", "#a08c1c",
    "#38f56a", "#1f9a42", "#24dcff", "#16879e", "#3a64ff", "#233f9e",
    "#9a4cff", "#5f2f9e", "#fff4c8", "#d4f6ff", "#ffd2d6",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "void",
      type: "sky",
      name: "Black Void",
      enabled: true,
      params: {
        horizon: 55,
        sunPos: [100, 30],
        sunRadius: 0,
        glare: 0,
        haze: 0.1,
        stars: false,
        gradientTop: "#000000",
        gradientHorizon: "#161616",
        sunColor: "#ffffff",
      },
    },
    {
      id: "glass-prism",
      type: "heightfield",
      name: "Glass Prism Silhouette",
      enabled: true,
      params: {
        horizon: 55,
        style: "peaks",
        peakHeight: 45,
        frequency: 0.015,
        roughness: 0.3,
        color: "#242424",
        highlight: "#bcbcbc",
      },
    },
    {
      id: "glossy-floor",
      type: "water",
      name: "Glossy Floor Reflection",
      enabled: true,
      params: {
        horizon: 55,
        waveSpeed: 0.4,
        waveChop: 0.04,
        sunColumn: 100,
        glitter: 1.0,
        deepColor: "#000000",
        reflectColor: "#dcdcdc",
        crestColor: "#ffdf2e",
      },
    },
    {
      id: "sparkling-dust",
      type: "particles",
      name: "Sparkling Dust",
      enabled: true,
      params: {
        type: "fireflies",
        density: 90,
        fallSpeed: 0.4,
        wind: 0.1,
        color: "#ffffff",
      },
    },
  ],
};