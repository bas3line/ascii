/*
 * dashboard: four of the library's charts in a grid, two a row (a grid is as
 * square as its parts allow), each in a rounded box with its name on the top
 * edge. Each chart keeps its own player and its own options, and its clip's
 * color paints it in one colour for each theme; the boxes line up because a
 * grid's cells do.
 */
import { grid } from "../../src/kit/compose.ts";
import { barChart, gauge, heartbeat, sparkline } from "../../src/pieces/index.ts";

export default grid(
  [
    { src: barChart, color: { light: "#0969da", dark: "#58a6ff" } },
    { src: gauge, color: { light: "#1a7f37", dark: "#3fb950" } },
    { src: sparkline, color: { light: "#9a6700", dark: "#d29922" } },
    { src: heartbeat, color: { light: "#cf222e", dark: "#f85149" } },
  ],
  { border: { title: true, color: { light: "#8c959f", dark: "#6e7681" } } },
);
