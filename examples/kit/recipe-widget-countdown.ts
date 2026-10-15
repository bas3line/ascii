/*
 * countdown: five, four, three, two, one in big letters, a second each, then
 * "liftoff", and round again.
 */
import { countdown } from "../../src/kit/index.ts";

export default countdown({ from: 5, then: "liftoff", color: "sunset" });
