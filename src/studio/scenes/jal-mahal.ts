/*
 * scene: jal mahal
 * The water palace in Jaipur at a misty sunrise: layered Aravalli hills fading
 * in haze, a pale gold sun through the mist and the glassy lake mirroring it.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const jalMahal: SceneSpec = {
  name: "jal mahal",
  note: "the jaipur water palace floating on a misty lake at sunrise",
  ground: "#16141f",
  fps: 15,
  palette: [
    "#3e4a6b", "#56628a", "#7180a6", "#8e9cc0", "#aab6d4", "#c6cfe3", "#e2e7f1",
    "#6b4a66", "#8a5f7c", "#a87891", "#c895a6", "#e2b4bd", "#f2d0d0",
    "#fff3d6", "#ffe3a6", "#f6c87a", "#e8a865", "#c98552",
    "#5a3e3a", "#7d5848", "#a47a5e", "#c99d78", "#e4c29c",
    "#2a2f45", "#3a3550", "#4d4660",
    "#4a3226", "#6e4a32",
    "#fbfaf7",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "misty-sky",
      type: "sky",
      name: "Misty Sunrise Sky",
      enabled: true,
      params: {
        horizon: 62,
        sunPos: [148, 30],
        sunRadius: 7,
        glare: 1.0,
        haze: 0.35,
        stars: false,
        gradientTop: "#3e4a6b",
        gradientHorizon: "#fff3d6",
        sunColor: "#fbfaf7",
      },
    },
    {
      id: "morning-mist",
      type: "clouds",
      name: "Morning Mist Wash",
      enabled: true,
      params: {
        horizon: 62,
        coverage: 0.35,
        drift: 0.5,
        altitude: 1.0,
        density: 0.8,
        softness: 0.7,
        lit: 0.45,
        baseColor: "#aab6d4",
        litColor: "#ffe3a6",
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
        peakHeight: 16,
        frequency: 0.04,
        roughness: 0.5,
        color: "#56628a",
        highlight: "#8e9cc0",
      },
    },
    {
      id: "glassy-lake",
      type: "water",
      name: "Glassy Man Sagar Lake",
      enabled: true,
      params: {
        horizon: 62,
        waveSpeed: 0.3,
        waveChop: 0.05,
        sunColumn: 148,
        glitter: 1.5,
        deepColor: "#3e4a6b",
        reflectColor: "#f2d0d0",
        crestColor: "#fff3d6",
      },
    },
    {
      id: "crossing-birds",
      type: "particles",
      name: "Crossing Birds",
      enabled: true,
      params: {
        type: "fireflies",
        density: 40,
        fallSpeed: 0.4,
        wind: 0.5,
        color: "#fbfaf7",
      },
    },
  ],
};