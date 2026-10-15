/*
 * scene: kite festival
 * Makar Sankranti over Jaipur at golden hour: crowds of paper kites sway in
 * the sky above the pink city's flat roofs and the ridge where the fort sits.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const kiteFestival: SceneSpec = {
  name: "kite festival",
  note: "sankranti kites crowding a golden sky over the pink roofs of jaipur",
  ground: "#1a0f17",
  fps: 15,
  palette: [
    "#6a5af0", "#8a78d0", "#c08cc8", "#f0a0c0", "#ffab7a", "#ffc25e", "#ffdc8c", "#fff6dc",
    "#9c7ae0", "#7a62c4", "#b89ae8",
    "#ff5f58", "#ff8478", "#ffaa9c", "#ffd6c4",
    "#ff2f7d", "#ff8fc4", "#ffd400", "#22c55e", "#a3e635", "#e8102a", "#1f6fff", "#5ec8ff",
    "#8b3dff", "#ffffff", "#ff7a00",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "golden-sky",
      type: "sky",
      name: "Golden Hour Sky",
      enabled: true,
      params: {
        horizon: 62,
        sunPos: [56, 50],
        sunRadius: 6.5,
        glare: 0.9,
        haze: 0.3,
        stars: false,
        gradientTop: "#8a78d0",
        gradientHorizon: "#ffdc8c",
        sunColor: "#fff6dc",
      },
    },
    {
      id: "high-haze",
      type: "clouds",
      name: "High Golden Haze",
      enabled: true,
      params: {
        horizon: 62,
        coverage: 0.15,
        drift: 0.5,
        altitude: 1.3,
        density: 0.6,
        softness: 0.8,
        lit: 0.2,
        baseColor: "#b89ae8",
        litColor: "#ffc25e",
      },
    },
    {
      id: "nahargarh-fort",
      type: "heightfield",
      name: "Nahargarh Ridge",
      enabled: true,
      params: {
        horizon: 62,
        style: "hills",
        peakHeight: 18,
        frequency: 0.04,
        roughness: 0.45,
        color: "#7a62c4",
        highlight: "#f0a0c0",
      },
    },
    {
      id: "pink-roofs",
      type: "heightfield",
      name: "Pink City Roofs",
      enabled: true,
      params: {
        horizon: 74,
        style: "city",
        peakHeight: 20,
        frequency: 0.03,
        roughness: 0.5,
        color: "#ff8478",
        highlight: "#ffd6c4",
      },
    },
    {
      id: "paper-kites",
      type: "particles",
      name: "Pink Paper Kites",
      enabled: true,
      params: {
        type: "fireflies",
        density: 240,
        fallSpeed: 0.5,
        wind: 0.4,
        color: "#ff8fc4",
      },
    },
    {
      id: "bright-kites",
      type: "particles",
      name: "Golden Paper Kites",
      enabled: true,
      params: {
        type: "fireflies",
        density: 120,
        fallSpeed: 0.5,
        wind: 0.4,
        color: "#ffd400",
      },
    },
  ],
};