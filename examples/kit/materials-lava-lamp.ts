/*
 * lava lamp: blobs of lava rising, rounding off and sinking in a glass
 * globe, between a metal cap and base that catch a sheen now and then.
 * lamp() is a shape with parts, so each part takes its own material.
 */
import { glass, inside, lamp, lava, metal, picture, shape } from "../../src/kit/materials.ts";

const l = lamp({ size: "full" });

export default picture([
  shape(l.globe, glass()),
  shape(inside(l.globe), lava()),
  shape(l.cap, metal()),
  shape(l.base, metal()),
], { name: "lava lamp", cols: 30, rows: 24 });
