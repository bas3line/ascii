/*
 * confetti: a burst over "v1.0 is out" and "1,000 stars". The pieces are
 * thrown from the message's middle, streak as they fly, and flutter down onto
 * cells the words seed; then it holds.
 */
import { confetti } from "../../src/markdown/index.ts";

export default confetti(`"v1.0 is out" "1,000 stars"`);
