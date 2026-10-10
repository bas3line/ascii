/*
 * card: a card with a heading, a line, wrapped words and a quiet footer,
 * floating gently: a widget given to a motion.
 */
import { floating } from "../../src/kit/recipes/motion.ts";
import { card } from "../../src/kit/recipes/widgets.ts";

export default floating(card({ title: "ascii.rest", text: "Animated ascii art for the web: a piece in one line, a world in three.", footer: "npm i ascii.rest" }));
