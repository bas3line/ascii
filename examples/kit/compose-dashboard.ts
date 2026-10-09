/*
 * dashboard: four of the library's charts in a grid, two a row, each in a
 * rounded box with its name on the top edge. Each chart keeps its own player
 * and its own options; the boxes line up because a grid's cells do.
 */
import { grid } from "../../src/kit/compose.ts";
import { barChart, gauge, heartbeat, sparkline } from "../../src/pieces/index.ts";

export default grid([barChart, gauge, sparkline, heartbeat], {
  columns: 2,
  border: { title: true, color: { light: "#8c959f", dark: "#6e7681" } },
});
