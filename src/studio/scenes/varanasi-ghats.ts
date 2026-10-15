/*
 * scene: varanasi ghats
 * Dusk on the Ganga: stepped ghats run along the bank toward the afterglow,
 * temple spires black against an indigo to amber sky while diyas drift on the
 * dark water.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const varanasiGhats: SceneSpec = {
  name: "varanasi ghats",
  note: "dusk aarti on the ganga, lamps on the steps and diyas on the water",
  ground: "#0b0812",
  fps: 15,
  palette: [
    "#141230", "#1d1a42", "#272257", "#332b6a", "#45357a", "#5a4388", "#7259a8",
    "#6d3a73", "#8a4677", "#a8527a", "#c4607a", "#d97a92", "#b866a0", "#9a68c8", "#c868b0", "#e8707a",
    "#d9705f", "#e88552", "#f29f4a", "#f8b85a", "#fcd07a", "#ffe3a6", "#fff2d2",
    "#1a1220", "#24182a", "#301f33", "#3f2838", "#523340", "#3a2c4c", "#4d3a64",
    "#5e3524", "#7d4527", "#a0582a", "#c06e2e", "#d98a46",
    "#ffffff", "#fff6d8", "#ffd860", "#ff9f2a", "#f06a1e", "#c8401a", "#8a2a16",
    "#0f1a2c", "#162540", "#20325a",
    "#d6d4ee",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "dusk-sky",
      type: "sky",
      name: "Indigo to Amber Dusk",
      enabled: true,
      params: {
        horizon: 60,
        sunPos: [156, 58],
        sunRadius: 6,
        glare: 1.3,
        haze: 0.2,
        stars: true,
        gradientTop: "#141230",
        gradientHorizon: "#e8707a",
        sunColor: "#fff2d2",
      },
    },
    {
      id: "dusk-clouds",
      type: "clouds",
      name: "Dusk Cloud Bands",
      enabled: true,
      params: {
        horizon: 60,
        coverage: 0.35,
        drift: 0.5,
        altitude: 1.0,
        density: 0.9,
        softness: 0.6,
        lit: 0.55,
        baseColor: "#332b6a",
        litColor: "#f8b85a",
      },
    },
    {
      id: "far-bank",
      type: "heightfield",
      name: "Far Bank",
      enabled: true,
      params: {
        horizon: 60,
        style: "hills",
        peakHeight: 12,
        frequency: 0.06,
        roughness: 0.5,
        color: "#24182a",
        highlight: "#4d3a64",
      },
    },
    {
      id: "ghat-skyline",
      type: "heightfield",
      name: "Ghat & Temple Skyline",
      enabled: true,
      params: {
        horizon: 60,
        style: "city",
        peakHeight: 24,
        frequency: 0.05,
        roughness: 0.5,
        color: "#1a1220",
        highlight: "#523340",
      },
    },
    {
      id: "ganga-water",
      type: "water",
      name: "Ganga Water",
      enabled: true,
      params: {
        horizon: 60,
        waveSpeed: 0.6,
        waveChop: 0.06,
        sunColumn: 156,
        glitter: 1.5,
        deepColor: "#0f1a2c",
        reflectColor: "#c4607a",
        crestColor: "#ffd860",
      },
    },
    {
      id: "drifting-diyas",
      type: "particles",
      name: "Drifting Diyas",
      enabled: true,
      params: {
        type: "fireflies",
        density: 110,
        fallSpeed: 0.4,
        wind: 0.7,
        color: "#ff9f2a",
      },
    },
  ],
};