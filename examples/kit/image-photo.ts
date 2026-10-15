/*
 * image-photo: the full Moon, shaded: each cell a character as dense as the
 * picture is bright there, in its own greys. Its black sky is a plain
 * background, so it is taken out and the Moon stands alone; its tones change
 * all through it, so the kit knows it for a photo and shades it without being
 * asked. On a light page the shades turn round, dense where it is dark, as ink
 * on paper is.
 *
 * The picture is NASA Goddard's "Full Moon" (GSFC_20171208_Archive_e000868),
 * made from Lunar Reconnaissance Orbiter imagery, public domain.
 */
import { fromImage } from "../../src/kit/image.ts";

export default await fromImage(new URL("./assets/moon.png", import.meta.url), { name: "moon", width: 64 });
