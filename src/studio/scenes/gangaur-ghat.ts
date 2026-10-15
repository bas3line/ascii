/*
 * scene: gangaur ghat
 * Udaipur at night, seen from across Lake Pichola: the lit gateway of Gangaur
 * Ghat at the water's edge, the white havelis of the old city climbing the
 * hill behind it and diyas drifting on the dark water.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const gangaurGhat: SceneSpec = {
  name: "gangaur ghat",
  note: "udaipur at night, a lit gateway on lake pichola and diyas on the water",
  ground: "#070a18",
  fps: 15,
  palette: [
    "#0a1230", "#0f1a40", "#152352", "#1c2e66", "#253a7a", "#30498e", "#3e5aa2",
    "#0c0f1e", "#161a30", "#232842",
    "#4a5a86", "#6474a0", "#8291b8", "#a3afcf", "#c6cee3", "#e6ebf5",
    "#fff6dc", "#ffe6a8", "#ffd277", "#ffb84a", "#f29a34", "#d8782a", "#a85a26", "#7a4224",
    "#e8c48c", "#c89a62", "#9a7048", "#6a4c38", "#3e2c2a",
    "#dfe6ff",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "moonlit-sky",
      type: "sky",
      name: "Moonlit Night Sky",
      enabled: true,
      params: {
        horizon: 58,
        sunPos: [170, 13],
        sunRadius: 4.5,
        glare: 0.6,
        haze: 0.1,
        stars: true,
        gradientTop: "#0a1230",
        gradientHorizon: "#30498e",
        sunColor: "#e6ebf5",
      },
    },
    {
      id: "moonlit-wash",
      type: "clouds",
      name: "Moonlit Haze",
      enabled: true,
      params: {
        horizon: 58,
        coverage: 0.3,
        drift: 0.3,
        altitude: 1.0,
        density: 0.8,
        softness: 0.7,
        lit: 0.3,
        baseColor: "#0c0f1e",
        litColor: "#c6cee3",
      },
    },
    {
      id: "distant-hill",
      type: "heightfield",
      name: "Distant Hill",
      enabled: true,
      params: {
        horizon: 58,
        style: "hills",
        peakHeight: 10,
        frequency: 0.05,
        roughness: 0.5,
        color: "#161a30",
        highlight: "#4a5a86",
      },
    },
    {
      id: "old-city",
      type: "heightfield",
      name: "Old City Rise",
      enabled: true,
      params: {
        horizon: 58,
        style: "city",
        peakHeight: 22,
        frequency: 0.05,
        roughness: 0.5,
        color: "#232842",
        highlight: "#6474a0",
      },
    },
    {
      id: "pichola-water",
      type: "water",
      name: "Lake Pichola Water",
      enabled: true,
      params: {
        horizon: 58,
        waveSpeed: 0.4,
        waveChop: 0.05,
        sunColumn: 170,
        glitter: 1.2,
        deepColor: "#0a1230",
        reflectColor: "#4a5a86",
        crestColor: "#ffd277",
      },
    },
    {
      id: "drifting-diyas",
      type: "particles",
      name: "Drifting Diyas",
      enabled: true,
      params: {
        type: "fireflies",
        density: 90,
        fallSpeed: 0.3,
        wind: 0.5,
        color: "#ffb84a",
      },
    },
  ],
};