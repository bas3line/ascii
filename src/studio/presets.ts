/*
 * studio presets: built-in scene presets demonstrating engine flexibility across diverse aesthetics.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "./types.ts";

export const oceanSunsetPreset: SceneSpec = {
  name: "ocean sunset",
  note: "golden hour sea, sun on the horizon beyond a headland, swell chop and glitter",
  ground: "#0b0817",
  fps: 15,
  palette: [
    "#140f2c", "#1e1640", "#2b1c52", "#3d2266", "#552a74",
    "#6e2c78", "#90327c", "#b23c7c", "#d24f7a", "#ea6a78",
    "#c2306a", "#ff5d8f", "#ff8a9a", "#7a2456", "#f05d5e",
    "#f2804f", "#f99a43", "#ffb44a", "#ffcd62", "#ffe39a", "#fff5d8",
    "#a8323c", "#d2453c", "#e8603e",
    "#2f1a3e", "#47234f", "#63305c", "#874266", "#ac5b70",
    "#ff9e86", "#ffc4a2", "#ffdcc0",
    "#0e1230", "#171a46", "#232059", "#33286a", "#4a2f78",
    "#1c2a5c", "#2e4078",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "sky-1",
      type: "sky",
      name: "Dusk Atmosphere",
      enabled: true,
      params: {
        horizon: 56,
        sunPos: [134, 51.5],
        sunRadius: 8.5,
        glare: 1.0,
        haze: 0.25,
        stars: false,
        gradientTop: "#140f2c",
        gradientHorizon: "#ea6a78",
        sunColor: "#fff5d8",
      },
    },
    {
      id: "ridge-1",
      type: "heightfield",
      name: "Pine Headland",
      enabled: true,
      params: {
        horizon: 56,
        peakHeight: 22,
        frequency: 0.035,
        roughness: 0.6,
        color: "#1e1640",
        highlight: "#b23c7c",
      },
    },
    {
      id: "water-1",
      type: "water",
      name: "Rolling Swells",
      enabled: true,
      params: {
        horizon: 56,
        waveSpeed: 1.0,
        waveChop: 0.08,
        sunColumn: 134,
        glitter: 1.6,
        deepColor: "#0e1230",
        reflectColor: "#ea6a78",
        crestColor: "#ffcd62",
      },
    },
  ],
};

export const snowMountainPreset: SceneSpec = {
  name: "snow mountain",
  note: "cold alpine winter night, stone peaks under a starlit sky and falling snow",
  ground: "#070b16",
  fps: 15,
  palette: [
    "#0c1428", "#121d38", "#19284a", "#22345e", "#2d4374", "#3b548a", "#4d68a0", "#6480b4",
    "#7f99c6", "#9db3d6", "#bccde4", "#d9e4f1", "#f1f5fb",
    "#ffe7b0", "#ffc56e", "#f29a3c",
    "#1e2230", "#2c3242", "#3e4658", "#586276", "#7c8698",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.05,
  },
  layers: [
    {
      id: "sky-snow",
      type: "sky",
      name: "Night Celestial Sky",
      enabled: true,
      params: {
        horizon: 58,
        sunPos: [152, 18],
        sunRadius: 6.0,
        glare: 0.7,
        haze: 0.15,
        stars: true,
        gradientTop: "#0c1428",
        gradientHorizon: "#2d4374",
        sunColor: "#f1f5fb",
      },
    },
    {
      id: "peaks-snow",
      type: "heightfield",
      name: "Alpine Peaks",
      enabled: true,
      params: {
        horizon: 58,
        peakHeight: 38,
        frequency: 0.025,
        roughness: 0.8,
        color: "#19284a",
        highlight: "#bccde4",
      },
    },
    {
      id: "snowfall-layer",
      type: "particles",
      name: "Parallax Snow",
      enabled: true,
      params: {
        type: "snow",
        density: 160,
        fallSpeed: 1.1,
        wind: 0.4,
        color: "#f1f5fb",
      },
    },
  ],
};

export const cyberPrismPreset: SceneSpec = {
  name: "cyber prism",
  note: "synthwave neon skyline over a mirrored grid and rising embers",
  ground: "#090414",
  fps: 15,
  palette: [
    "#090414", "#15082b", "#270d4d", "#401374", "#611ba0", "#8927cb",
    "#b83bf4", "#db5eff", "#ff82ff", "#ffa6ff",
    "#0d2a45", "#134873", "#1a71a6", "#23a2de", "#45d0ff", "#8ae5ff",
    "#ffffff",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.1,
  },
  layers: [
    {
      id: "cyber-sky",
      type: "sky",
      name: "Neon Atmosphere",
      enabled: true,
      params: {
        horizon: 52,
        sunPos: [100, 48],
        sunRadius: 16.0,
        glare: 1.8,
        haze: 0.35,
        stars: true,
        gradientTop: "#15082b",
        gradientHorizon: "#b83bf4",
        sunColor: "#ff82ff",
      },
    },
    {
      id: "cyber-skyline",
      type: "heightfield",
      name: "Angular Horizon",
      enabled: true,
      params: {
        horizon: 52,
        peakHeight: 28,
        frequency: 0.06,
        roughness: 0.4,
        color: "#15082b",
        highlight: "#23a2de",
      },
    },
    {
      id: "cyber-grid",
      type: "water",
      name: "Fluorescent Water Plane",
      enabled: true,
      params: {
        horizon: 52,
        waveSpeed: 1.4,
        waveChop: 0.09,
        sunColumn: 100,
        glitter: 2.2,
        deepColor: "#090414",
        reflectColor: "#611ba0",
        crestColor: "#45d0ff",
      },
    },
    {
      id: "cyber-embers",
      type: "particles",
      name: "Rising Sparks",
      enabled: true,
      params: {
        type: "embers",
        density: 80,
        fallSpeed: 1.2,
        wind: -0.2,
        color: "#ff82ff",
      },
    },
  ],
};

export const ALL_PRESETS: SceneSpec[] = [
  oceanSunsetPreset,
  snowMountainPreset,
  cyberPrismPreset,
];
