/*
 * custom-reflection: an effect of your own, made with effect(). A banner
 * over its reflection: its letters upside down in a light shade, each row
 * rippling. The kit plays the banner, sizes the piece, keeps its colours on
 * both themes and works out the loop; the drawing is the whole effect.
 */
import { banner } from "../../src/banner.ts";
import { effect } from "../../src/kit/fx.ts";

const word = banner("ascii.rest", { effect: "still", color: ["#f97316", "#f778ba"] });
// The letters are blocks; their shadow, box drawing, is left out of the reflection.
const letter = (ch: string) => ch >= "▀" && ch <= "▟";

export default effect(word, { name: "reflection", period: 2, pad: { bottom: word.meta.rows } }, (t, s, src) => {
  s.paste(src, 0, 0);
  for (let y = 0; y < src.rows; y++) {
    const dx = Math.round(Math.sin(Math.PI * (t + y / 3)));
    for (let x = 0; x < src.cols; x++) if (letter(src.get(x, y))) s.set(x + dx, 2 * src.rows - 1 - y, "░", src.colorAt(x, y));
  }
});
