/*
 * chain-card: three effects on a block of text. The commands type in, a
 * rounded outline grows round them as they do, and a drop shadow falls
 * behind it all: chain() hands each effect the piece the last one made. It
 * holds for 2 seconds, then types again.
 */
import { chain, outline, shadow, typeIn } from "../../src/kit/fx.ts";

const commands = "$ npx ascii.rest donut\n$ npx ascii.rest banner hello\n$ npx ascii.rest add donut";

export default chain(
  commands,
  (p) => typeIn(p, { name: "terminal", hold: 2 }),
  (p) => outline(p, { style: "rounded" }),
  shadow,
);
