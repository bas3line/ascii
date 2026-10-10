/*
 * logic: a release rule as gates. Its inputs step through their truth table,
 * one flipping at a time, and each change runs along the wires, gate by gate.
 */
import { logic } from "../../src/markdown/index.ts";

export default logic(`ready is built and (tested or not skipped)`, { title: "release" });
