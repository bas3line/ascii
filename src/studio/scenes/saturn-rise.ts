/*
 * scene: saturn rise
 * Saturn and its rings hanging over the cracked ice and geysers of a moon.
 * Part of ascii.rest, MIT licensed.
 */
import type { SceneSpec } from "../types.ts";

export const saturnRise: SceneSpec = {
  name: "saturn rise",
  note: "saturn and its rings hanging over the cracked ice and geysers of a moon",
  ground: "#04050a",
  fps: 15,
  palette: [
    "#0b0d14", "#161922", "#252935", "#3a3f4c",
    "#3b2a1a", "#5c4027", "#7f5a35", "#a37645", "#c4925a", "#dcae74", "#ecc893", "#f6e0b8",
    "#6b6a6c", "#8a8070", "#b3a892", "#d8cfba", "#7f8a96",
    "#0e1a2e", "#15284a", "#1f3a66", "#2c5085", "#3f6aa3", "#5e8bbf", "#89afd6", "#b6d0ea", "#ddebf8",
    "#2a7fb0", "#56b3dc",
    "#ffffff", "#fff0c8",
  ],
  halftone: {
    ramp: " ·•●",
    dither: "bayer4",
    contrast: 1.0,
  },
  layers: [
    {
      id: "ringed-saturn",
      type: "sky",
      name: "Saturn",
      enabled: true,
      params: {
        horizon: 70,
        sunPos: [84, 33],
        sunRadius: 22,
        glare: 0.35,
        haze: 0.15,
        stars: true,
        gradientTop: "#0b0d14",
        gradientHorizon: "#252935",
        sunColor: "#ecc893",
      },
    },
    {
      id: "cracked-ice-ridges",
      type: "heightfield",
      name: "Cracked Ice Ridges",
      enabled: true,
      params: {
        horizon: 70,
        style: "peaks",
        peakHeight: 10,
        frequency: 0.07,
        roughness: 0.6,
        color: "#161922",
        highlight: "#b3a892",
      },
    },
    {
      id: "ice-plain",
      type: "water",
      name: "Ice Plain",
      enabled: true,
      params: {
        horizon: 70,
        waveSpeed: 0.35,
        waveChop: 0.05,
        sunColumn: 173,
        glitter: 1.1,
        deepColor: "#0e1a2e",
        reflectColor: "#3f6aa3",
        crestColor: "#ddebf8",
      },
    },
    {
      id: "ice-geysers",
      type: "particles",
      name: "Ice Geysers",
      enabled: true,
      params: {
        type: "embers",
        density: 110,
        fallSpeed: 0.8,
        wind: 0.2,
        color: "#b6d0ea",
      },
    },
  ],
};