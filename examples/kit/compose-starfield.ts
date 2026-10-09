/*
 * hello among the stars: a banner centred on the library's starfield, and a
 * small ship flying along the bottom with move, out past the right edge and
 * back in from the left. A crossing takes the whole number of the banner's
 * 3.2 second glints nearest 8 seconds, three of them, 9.6 seconds, so the
 * two come round together and that is the whole's loop: svg() plays exactly
 * one. The stars fly on through the banner's blank cells; named() names it.
 */
import { banner } from "../../src/banner.ts";
import { layer, named } from "../../src/kit/compose.ts";
import { starfield } from "../../src/pieces/index.ts";

const hello = banner("hello", { color: ["#67e8f9", "#c084fc"] });
const ship = " __\n|__>=-";

const scene = layer(starfield, { src: hello, anchor: "center" }, { src: ship, anchor: "bottom-left", margin: 1, move: "right" });

export default named(scene, "hello among the stars");
