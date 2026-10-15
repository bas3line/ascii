/*
 * comet: particles mixed with other drawing in one piece(). A comet goes
 * round a ringed planet every 8 seconds, shedding a tail of particles from an
 * emitter that moves with it, over the stars preset's twinkling sky.
 * drawParticles() draws the systems into the grid and s.write() the planet
 * over them; particlesPalette() gives the piece the colours both need.
 */
import { TAU, piece } from "../../src/kit/core.ts";
import { type System, drawParticles, particlesPalette, presets } from "../../src/kit/particles.ts";

const head = (t: number) => [32 + 27 * Math.cos((TAU * t) / 8), 12 + 9 * Math.sin((TAU * t) / 8)] as const;
const tail: System = {
  emitter: { point: head }, rate: 80, life: [0.6, 1.6], speed: [0, 1.5], glyphs: "@**++:::...",
  colors: { light: ["#0f172a", "#0369a1", "#7dd3fc"], dark: ["#ffffff", "#7dd3fc", "#1d4ed8"] },
};
const sky = [...presets.stars({ cols: 64, rows: 24, period: 8 }, { shooting: 0 }), tail];

export default piece({ name: "comet", cols: 64, rows: 24, loop: 8, palette: particlesPalette(sky, { light: ["#b45309"], dark: ["#f59e0b"] }) }, (t, s) => {
  drawParticles(s, sky, t, { period: 8 });
  s.write(26, 10, "  .----.\n=(      )=\n  '----'");
});
