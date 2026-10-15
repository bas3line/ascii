/*
 * scene: tokyo rain
 * A narrow Tokyo side street at night in the rain: neon signs glow on both
 * sides and the wet road carries every light down in rippling streaks.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const tokyoRain: SceneSpec = {
  name: "tokyo rain",
  note: "a tokyo side street in the rain, neon signs shining on the wet road",
  ground: "#07060d",
  fps: 15,
  palette: [
    "#100f22", "#17162f", "#201e3d", "#2b284e", "#383463", "#4a447a", "#4c4890", "#6a64c4",
    "#1d1520", "#2c1f2e", "#3e2b3e", "#553a52",
    "#6a3a74", "#8e4c8a", "#b4649c", "#d885ae",
    "#6e1248", "#a3196c", "#d8278c", "#ff47a8", "#ff85c6", "#ffc4e3",
    "#0c4656", "#106f80", "#16a0b2", "#28d2e2", "#7cecf4", "#ccfbfd",
    "#5e340a", "#93540f", "#cc7b16", "#f7a32a", "#ffc65e", "#ffe2a0", "#fff4d8",
    "#55100e", "#8a1a14", "#c22a1a", "#ee4626", "#ff7a4c",
    "#8ea2c4", "#bccbe6", "#e4ecfb", "#ffffff",
    "#2e62e0", "#79a2ff", "#20844c", "#43d884", "#e6c21e", "#fff07a",
    "#6a7896", "#9ba7c2", "#c9d0e2",
    "#262a36", "#3a3f4e", "#565c6c",
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
      name: "Night Sky Strip",
      enabled: true,
      params: {
        horizon: 40,
        sunPos: [120, 8],
        sunRadius: 0,
        glare: 0,
        haze: 0.15,
        stars: true,
        gradientTop: "#100f22",
        gradientHorizon: "#201e3d",
        sunColor: "#ffffff",
      },
    },
    {
      id: "left-buildings",
      type: "heightfield",
      name: "Left Street Wall",
      enabled: true,
      params: {
        horizon: 40,
        style: "city",
        peakHeight: 30,
        frequency: 0.03,
        roughness: 0.5,
        color: "#17162f",
        highlight: "#383463",
      },
    },
    {
      id: "right-buildings",
      type: "heightfield",
      name: "Right Street Wall",
      enabled: true,
      params: {
        horizon: 40,
        style: "city",
        peakHeight: 26,
        frequency: 0.045,
        roughness: 0.6,
        color: "#1d1520",
        highlight: "#553a52",
      },
    },
    {
      id: "wet-street",
      type: "water",
      name: "Wet Neon Road",
      enabled: true,
      params: {
        horizon: 40,
        waveSpeed: 0.7,
        waveChop: 0.05,
        sunColumn: 100,
        glitter: 0.7,
        deepColor: "#0c4656",
        reflectColor: "#6a64c4",
        crestColor: "#ccfbfd",
      },
    },
    {
      id: "rain",
      type: "particles",
      name: "Downpour",
      enabled: true,
      params: {
        type: "rain",
        density: 320,
        fallSpeed: 2.2,
        wind: 0.35,
        color: "#8ea2c4",
      },
    },
  ],
};