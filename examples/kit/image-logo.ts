/*
 * image-logo: a logo from a URL, as ascii, in its own colours and glinting
 * every 5 seconds: one call. Each cell is the character whose shape best
 * matches the logo's edge through it, as the library's logos are drawn. In a
 * browser the URL can be any image the page may load, an SVG included:
 *
 *   const python = await fromImage("https://example.com/python.svg", { glint: true });
 *
 * In Node, where examples run, fromImage() reads a PNG from a file: URL or a
 * path. The PNG beside this file is devicon's python-original.svg (MIT); the
 * logo is a trademark of the Python Software Foundation.
 */
import { fromImage } from "../../src/kit/image.ts";

const python = await fromImage(new URL("./assets/python.png", import.meta.url), { name: "python", glint: true });

export const meta = python.meta;
export default python.default;
