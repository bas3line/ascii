/*
 * bars: a bar chart from names and values, each bar its own colour, growing
 * in one after another with a little overshoot, then holding.
 */
import { barChart } from "../../src/kit/recipes/widgets.ts";

export default barChart({ mon: 3, tue: 5, wed: 4, thu: 8, fri: 6, sat: 2 });
