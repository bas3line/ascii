/*
 * banner over a scene: a banner() hung in the sky of the library's ocean
 * sunset with over(), twelve rows below the top. The scene is a square grid;
 * the banner, made for character cells, has its rows doubled to keep its
 * shape, and its colours join the scene's in one palette. Its spaces let the
 * sky show through.
 */
import { banner } from "../../src/banner.ts";
import { over } from "../../src/kit/compose.ts";
import { oceanSunset } from "../../src/pieces/index.ts";

const title = banner("ascii.rest", { color: ["#fde68a", "#fb7185"], shadowColor: "#3b1d4a" });

export default over(title, oceanSunset, { anchor: "top", margin: 12 });
