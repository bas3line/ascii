/*
 * railroad: the md command's usage line as a railroad. The track draws from
 * the left; then a dot runs it, a path a run, until every branch is run.
 */
import { railroad } from "../../src/markdown/index.ts";

export default railroad(`ascii.rest md <file> [--ascii | --svg <dir>]`, { title: "usage" });
