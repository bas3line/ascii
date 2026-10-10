/*
 * dashboard: widgets are pieces, so they compose. Two gauges side by side, a
 * live one and a still one, over a sparkline of a live reading and a spinner.
 */
import { column, row } from "../../src/kit/compose.ts";
import { gauge, sparkline, spinner } from "../../src/kit/recipes/widgets.ts";

const meters = row([gauge({ label: "cpu" }), gauge({ label: "disk", value: 72 })]);
export default column([meters, sparkline({ label: "net" }), spinner("dots", { label: "watching" })]);
