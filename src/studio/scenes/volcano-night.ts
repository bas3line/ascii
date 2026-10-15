/*
 * scene: volcano night
 * A volcano erupting at night with lava rivers, an ash plume full of lightning.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const volcanoNight: SceneSpec = {
  name: "volcano night",
  note: "a volcano erupting at night, lava rivers, an ash plume full of lightning",
  ground: "#070405",
  fps: 15,
  palette: [
    "#5a1a10", "#7a2410", "#982e0e", "#b8380b", "#d4480b", "#ea5e10", "#f77a18", "#ff9628",
    "#ffb244", "#ffcc63", "#ffe28c", "#fff3c0", "#fffcec",
    "#4a3a37", "#63504b", "#7d6863", "#98827b", "#b39d94", "#cdb9af",
    "#8a4a3a", "#a85a40", "#c87048",
    "#3c4258", "#5d6280", "#8a90b4", "#b4b9dc", "#dfe2f7", "#b9a8ff", "#f4f0ff",
    "#1a1012", "#2c1a18",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "eruption-sky",
      type: "sky",
      name: "Eruption Sky",
      enabled: true,
      params: {
        horizon: 48,
        sunPos: [104, 46],
        sunRadius: 5,
        glare: 2.2,
        haze: 0.4,
        stars: true,
        gradientTop: "#1a1012",
        gradientHorizon: "#ea5e10",
        sunColor: "#ffe28c",
      },
    },
    {
      id: "ash-plume",
      type: "clouds",
      name: "Ash Plume",
      enabled: true,
      params: {
        horizon: 48,
        coverage: 0.35,
        drift: 0.4,
        altitude: 1.4,
        density: 1.4,
        softness: 0.5,
        lit: 0.55,
        baseColor: "#3c4258",
        litColor: "#ff9628",
      },
    },
    {
      id: "stratovolcano",
      type: "heightfield",
      name: "Stratovolcano",
      enabled: true,
      params: {
        horizon: 48,
        style: "peaks",
        peakHeight: 26,
        frequency: 0.04,
        roughness: 0.6,
        color: "#2c1a18",
        highlight: "#f77a18",
      },
    },
    {
      id: "lava-lake",
      type: "water",
      name: "Lava Lake",
      enabled: true,
      params: {
        horizon: 50,
        waveSpeed: 0.6,
        waveChop: 0.08,
        sunColumn: 104,
        glitter: 1.1,
        deepColor: "#4a3a37",
        reflectColor: "#ff9628",
        crestColor: "#ffe28c",
      },
    },
    {
      id: "eruption-embers",
      type: "particles",
      name: "Eruption Embers",
      enabled: true,
      params: {
        type: "embers",
        density: 160,
        fallSpeed: 0.9,
        wind: 0.15,
        color: "#ffb244",
      },
    },
  ],
};