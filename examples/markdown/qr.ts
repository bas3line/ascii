/*
 * qr: a QR code for https://ascii.rest, in half blocks, the link under it. Its
 * finders grow, the rest resolves out of noise and a scan line passes down it;
 * then it holds, a code a phone reads.
 */
import { qr } from "../../src/markdown/index.ts";

export default qr(`https://ascii.rest`);
