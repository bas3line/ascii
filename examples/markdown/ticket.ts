/*
 * ticket: a boarding pass from v0.4 to v0.5, in slim banner letters, with a
 * stub and a barcode. It prints out a row at a time, the > flies across and
 * the bars draw in.
 */
import { ticket } from "../../src/markdown/index.ts";

export default ticket(`
  v0.4 v0.5 "markdown figures"
  gate=npm seat=1A time=18:00
`);
