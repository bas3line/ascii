/*
 * hello among the stars: a banner centred on the library's starfield, its
 * stars painted a quiet grey so the words stand out, and a small gold ship
 * flying along the bottom with move, out past the right edge and back in
 * from the left. A crossing takes the whole number of the banner's 3.2
 * second glints nearest 8 seconds, three of them, 9.6 seconds, so the two
 * come round together and that is the whole's loop: svg() plays exactly one.
 * The stars fly on through the banner's blank cells; named() names it.
 */
import { banner } from "../../src/banner.ts";
import { layer, named } from "../../src/kit/compose.ts";
import { starfield } from "../../src/pieces/index.ts";

const hello = banner("hello", { color: { light: ["#0891b2", "#9333ea"], dark: ["#67e8f9", "#c084fc"] } });
const ship = " __\n|__>=-";

const scene = layer(
  { src: starfield, color: { light: "#57606a", dark: "#8b949e" } },
  { src: hello, anchor: "center" },
  { src: ship, color: { light: "#bf8700", dark: "#fbbf24" }, anchor: "bottom-left", margin: 1, move: "right" },
);

export default named(scene, "hello among the stars");
