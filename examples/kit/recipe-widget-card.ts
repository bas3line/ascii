/*
 * card: a card with a heading, a line, wrapped words and a quiet footer,
 * floating gently: a widget given to a motion.
 */
import { card, floating } from "../../src/kit/index.ts";

export default floating(card({ title: "ascii.rest", text: "Animated ascii art for the web: a piece in one line, a world in three.", footer: "npm i ascii.rest" }));
