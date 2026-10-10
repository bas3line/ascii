/*
 * banner: sparks coming off a banner(). The same piece is the picture behind
 * (back, in its own fade of colours) and where the sparks are born (emitter:
 * { text }), so they rise off its letters, cooling from white-hot to red.
 * Three lines: a banner, a picture and one system.
 */
import { banner } from "../../src/banner.ts";
import { particles } from "../../src/kit/particles.ts";

const word = banner("ascii", { effect: "still", color: ["#f59e0b", "#ef4444"] });
export default particles({ name: "banner", note: "sparks rising off a banner", back: word }, {
  emitter: { text: word }, rate: 24, direction: "up", spread: 60, speed: [3, 8], life: [1, 2.2], gravity: -2, sway: 0.6,
  glyphs: "*+'.", colors: { light: ["#7c2d12", "#c2410c", "#ea580c", "#f59e0b"], dark: ["#fffbeb", "#fde047", "#f97316", "#b91c1c"] },
});
