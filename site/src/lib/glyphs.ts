/*
 * The shapes /make/ picks characters by, worked out at build time the way the
 * logo generators did: each candidate character drawn in IBM Plex Mono on a
 * cell of CW by CH pixels, its baseline 0.79 of the way down, and its ink
 * measured in GX by GY blocks of the cell, then scaled so the inkiest block of
 * any of them is 1. The page gets the numbers; the drawing runs in the browser
 * (lib/logo.ts).
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import opentype from "opentype.js";
import sharp from "sharp";
import { CH, CW, EDGE, FILL, GX, GY, type Glyph } from "./logo";

interface Font {
  charToGlyph(ch: string): { getPath(x: number, y: number, size: number): { toPathData(decimals: number): string } };
}

export async function glyphShapes(): Promise<Glyph[]> {
  const file = readFileSync(createRequire(import.meta.url).resolve("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff"));
  const font = opentype.parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)) as Font;
  const chars = [...new Set([...EDGE, FILL])];
  const base = 0.79 * CH; // between where a <pre> at line-height 1.2 and the canvas put it
  const size = (1000 * CW) / 600; // a glyph is 600 units wide in a 1000-unit em
  const paths = chars.map((ch, i) => `<path d="${font.charToGlyph(ch).getPath(i * CW, base, size).toPathData(2)}" fill="#fff"/>`).join("");
  const strip = `<svg xmlns="http://www.w3.org/2000/svg" width="${chars.length * CW}" height="${CH}"><rect width="100%" height="100%" fill="#000"/>${paths}</svg>`;
  const { data, info } = await sharp(Buffer.from(strip)).greyscale().raw().toBuffer({ resolveWithObject: true });
  const glyphs = chars.map((ch, i) => {
    const v: number[] = [];
    for (let by = 0; by < GY; by++)
      for (let bx = 0; bx < GX; bx++) {
        let sum = 0, n = 0;
        for (let y = (by * CH) / GY; y < ((by + 1) * CH) / GY; y++)
          for (let x = (bx * CW) / GX; x < ((bx + 1) * CW) / GX; x++) {
            sum += data[(y * info.width + i * CW + x) * info.channels] / 255;
            n++;
          }
        v.push(sum / n);
      }
    return { ch, v };
  });
  const top = Math.max(...glyphs.flatMap((g) => g.v));
  return glyphs.map((g) => ({ ch: g.ch, v: g.v.map((x) => +(x / top).toFixed(5)) }));
}
