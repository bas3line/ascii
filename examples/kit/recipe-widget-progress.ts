/*
 * progress: a progress bar filling smoothly in eighths of a cell, turning
 * green when it is full, then filling again.
 */
import { progressBar } from "../../src/kit/index.ts";

export default progressBar({ label: "downloading" });
