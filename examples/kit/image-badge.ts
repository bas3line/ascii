/*
 * image-badge: an image is one part of a piece of your own. drawImage() puts
 * the python logo, glinting, beside a REPL that types a line and answers it,
 * all in one piece() that loops every 5 seconds. imagePalette() gives the
 * piece the logo's own colours after the two of the text, so the text is
 * colour 0 and 1 and the logo keeps its blue and yellow on both pages. At 30
 * columns both of the snakes' eyes come out as holes; try a few widths for a
 * small logo, since each cell is a large part of it.
 */
import { piece } from "../../src/kit/core.ts";
import { drawImage, fromImage, imagePalette } from "../../src/kit/image.ts";

const python = await fromImage(new URL("./assets/python.png", import.meta.url), { width: 30 });
const palette = imagePalette(python, { light: ["#1f2328", "#6e7781"], dark: ["#f0f6fc", "#8b949e"] });
const line = "print('hello, ascii')";

export default piece({ name: "python repl", cols: 58, rows: 15, loop: 5, palette }, (t, s) => {
  const k = Math.floor((t % 5) * 14);
  drawImage(s, python, 0, 0, { t, glint: true });
  s.write(32, 5, "Python 3.14");
  s.write(32, 7, ">>>", 1);
  s.write(36, 7, line.slice(0, k) + (k < line.length && t % 0.5 < 0.3 ? "_" : ""));
  if (k > line.length + 4) s.write(32, 8, "hello, ascii\n>>>", 1);
});
