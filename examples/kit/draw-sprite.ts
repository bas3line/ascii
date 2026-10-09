/*
 * walker: a little pixel-art figure walking over the grass under a sun, on
 * the half-block canvas: two square pixels a cell, drawn as ▀ ▄ and █ in
 * colour. The figure is a sprite() drawn as text, a character a pixel, with
 * its two frames side by side: frame: t * 4 swaps its legs four times a
 * second, and wrap: true walks it off the right edge and back on at the left,
 * with no sums. Across and round again takes 4 seconds, its loop.
 */
import { piece } from "../../src/kit/index.ts";
import { pixels } from "../../src/kit/draw.ts";

const walker = `
  ..hhhh....hhhh..
  .hhhhhh..hhhhhh.
  .ssssss..ssssss.
  .s.ss.s..s.ss.s.
  ..ssss....ssss..
  ...ss......ss...
  .bbbbbb..bbbbbb.
  bbbbbbbbbbbbbbbb
  s.bbbb.ss.bbbb.s
  ..bbbb....bbbb..
  ..p..p.....pp...
  .p....p....pp...`;
const colors = { h: "#7d4e24", s: "#e0a370", b: "#2f81f7", p: "#6e7781" };

export default piece({ name: "walker", cols: 48, rows: 12, loop: 4, palette: ["#2da44e", "#d29922", ...Object.values(colors)] }, (t, s) => {
  const p = pixels(s);
  p.circle(40, 6, 3, { fill: true, color: 1 }); // the sun
  p.rect(0, 22, 48, 2, { fill: true, color: 0 }); // the grass
  p.sprite(walker, colors, t * 12, 10, { frames: 2, frame: t * 4, wrap: true });
  p.draw();
});
