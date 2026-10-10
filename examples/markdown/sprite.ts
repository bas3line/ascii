/*
 * sprite: a little invader with accent eyes, two frames of its legs. It prints
 * a row at a time, then walks in place, four frames a second, while it is in
 * view.
 */
import { sprite } from "../../src/markdown/index.ts";

export default sprite(`
...####...
.########.
##aa##aa##
##aa##aa##
##########
##########
##..##..##

...####...
.########.
##aa##aa##
##aa##aa##
##########
##########
.##..##..#
`);
