/*
 * contributions: cells of noise in GitHub's greens, posterized to the graph's
 * few flat steps and drawn in blocks.
 */
import { turbulence } from "../../src/kit/index.ts";

export default turbulence({ kind: "cells", palette: "github", ramp: "blocks" }).posterize(4);
