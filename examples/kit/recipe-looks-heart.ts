/*
 * a heart of plasma: candy plasma masked by the materials' heart shape, made
 * large. Any shape from ascii.rest/kit's materials is a mask: ball(), star(),
 * cup(), house(), or one of your own from area.fit(). The ramp has no space,
 * so the whole heart is drawn.
 */
import { heart } from "../../src/kit/materials.ts";
import { plasma } from "../../src/kit/recipes/looks.ts";

export default plasma({ palette: "candy", ramp: ".:-=+*#%@" }).mask(heart({ size: "large" }));
