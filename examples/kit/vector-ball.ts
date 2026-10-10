/*
 * bouncing ball: any motion the nine words don't have is a function of t that
 * gives a part's pose, moved in rows and columns, turned and grown. The ball
 * leaps 8 rows and squashes where it lands, grown about its bottom (`origin`),
 * so it stays on the floor; its shadow shrinks as it rises. `period` makes it
 * loop, so svg() plays it seamlessly.
 */
import { fromSvg } from "../../src/kit/vector.ts";

const scene = `<svg viewBox="0 0 40 30">
  <ellipse id="shadow" cx="20" cy="29.2" rx="9" ry="1" fill="#94a3b8"/>
  <circle id="ball" cx="20" cy="20" r="8" fill="#ef4444"/>
</svg>`;

// 0 on the floor to 1 at the top, a bounce every 1.2 s.
const up = (t: number) => Math.abs(Math.sin((Math.PI * t) / 1.2));
const squash = (t: number) => 0.3 * Math.max(0, 1 - 5 * up(t));

export default fromSvg(scene, {
  name: "bouncing ball",
  "#ball": { motion: (t) => ({ y: -8 * up(t), scale: [1 + squash(t), 1 - squash(t)] }), origin: "bottom", period: 1.2 },
  "#shadow": { motion: (t) => ({ scale: 1 - 0.6 * up(t) }), period: 1.2 },
  still: 0.6,
});
